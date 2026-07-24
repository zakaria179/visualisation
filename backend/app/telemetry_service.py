from typing import Dict, Any, List
from app.asset_service import AssetService
from app.data_provider import BaseDataProvider
from app.derived_metrics_service import DerivedMetricsService

class TelemetryService:
    """
    Assembles raw telemetry, incoming/outgoing stream telemetry for equipment,
    and computes derived engineering metrics.
    """

    def __init__(self, asset_service: AssetService, data_provider: BaseDataProvider):
        self.asset_service = asset_service
        self.data_provider = data_provider

    def _extract_pipe_metrics(self, pipe_tag: str, record: Dict[str, Any]) -> Dict[str, float]:
        """Extract CSV columns associated with a given pipe tag from the current record."""
        asset = self.asset_service.get_asset(pipe_tag)
        if not asset:
            return {}
        csv_cols = asset.get("csv_columns", [])
        metrics: Dict[str, float] = {}
        for col in csv_cols:
            if col in record:
                try:
                    metrics[col] = float(record[col])
                except (ValueError, TypeError):
                    metrics[col] = 0.0
        return metrics

    def get_asset_telemetry(self, tag: str, current_record_idx: int) -> Dict[str, Any]:
        """
        Builds the complete asset telemetry payload for the requested tag at current_record_idx.
        Includes metadata, live_metrics, incoming_streams, outgoing_streams, and derived_metrics.
        """
        meta = self.asset_service.get_asset(tag)
        if not meta:
            return {}

        record = self.data_provider.get_record_by_index(current_record_idx)
        record_no = int(record.get("RecordNo", current_record_idx + 1))

        # 1. Direct CSV live metrics for pipes or global metadata
        csv_cols = meta.get("csv_columns", [])
        live_metrics: Dict[str, float] = {}
        for col in csv_cols:
            if col in record:
                try:
                    live_metrics[col] = float(record[col])
                except (ValueError, TypeError):
                    live_metrics[col] = 0.0

        # 2. Resolve incoming stream telemetry for equipment
        incoming_streams: Dict[str, Dict[str, float]] = {}
        sources = meta.get("source")
        if isinstance(sources, str):
            sources = [sources]
        elif not sources:
            sources = []

        for src in sources:
            # Extract pipe tag if source references a pipe (e.g. "P_001", "P_101", "P_005")
            tag_name = src.split(" ")[0] if src.startswith("P_") else src
            if self.asset_service.get_asset(tag_name):
                pipe_metrics = self._extract_pipe_metrics(tag_name, record)
                if pipe_metrics:
                    incoming_streams[tag_name] = pipe_metrics

        # 3. Resolve outgoing stream telemetry for equipment
        outgoing_streams: Dict[str, Dict[str, float]] = {}
        destinations = meta.get("destination")
        if isinstance(destinations, str):
            destinations = [destinations]
        elif not destinations:
            destinations = []

        for dest in destinations:
            tag_name = dest.split(" ")[0] if dest.startswith("P_") else dest
            if self.asset_service.get_asset(tag_name):
                pipe_metrics = self._extract_pipe_metrics(tag_name, record)
                if pipe_metrics:
                    outgoing_streams[tag_name] = pipe_metrics

        # 4. Calculate derived engineering metrics
        derived_metrics = DerivedMetricsService.calculate_derived_metrics(
            tag=tag,
            incoming_streams=incoming_streams,
            outgoing_streams=outgoing_streams,
        )

        return {
            "tag": tag,
            **meta,
            "live_metrics": live_metrics,
            "record_no": record_no,
            "incoming_streams": incoming_streams,
            "outgoing_streams": outgoing_streams,
            "derived_metrics": derived_metrics,
        }

    def get_asset_history(self, tag: str, current_record_idx: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch historical records up to current_record_idx for an asset's CSV columns."""
        meta = self.asset_service.get_asset(tag)
        if not meta:
            return []
        cols = ["ElapsedHrs"] + meta.get("csv_columns", [])
        return self.data_provider.get_history_by_index(cols, current_record_idx, limit)
