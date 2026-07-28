import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

from app.core.interfaces import BaseDataProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class CSVDataProvider(BaseDataProvider):
    """
    Concrete implementation of BaseDataProvider loading simulation datasets.
    Supports dual-stream architecture (process_flow_timeseries.csv + machine_health_timeseries.csv)
    and legacy single CSV fallback (Dynamic Results.CSV).
    """

    def __init__(self, data_dir_or_file: Optional[str | Path] = None):
        path = Path(data_dir_or_file) if data_dir_or_file else settings.DATA_DIR
        self.df: pd.DataFrame = pd.DataFrame()
        self.registry_df: Optional[pd.DataFrame] = None

        if path.is_dir():
            self._load_from_directory(path)
        elif path.is_file():
            self._load_single_file(path)
            reg_path = path.parent / "tag_mapping_registry.csv"
            if reg_path.exists():
                self.registry_df = pd.read_csv(reg_path)
        else:
            self._load_from_directory(settings.DATA_DIR)

        self.df = self.df.fillna(0.0)

    def _load_from_directory(self, data_dir: Path):
        """Loads process and health time series CSV files and merges them via timestamp as-of join."""
        process_path = data_dir / "process_flow_timeseries.csv"
        health_path = data_dir / "machine_health_timeseries.csv"
        registry_path = data_dir / "tag_mapping_registry.csv"

        if not process_path.exists():
            process_path = settings.PROCESS_CSV_PATH
        if not health_path.exists():
            health_path = settings.HEALTH_CSV_PATH
        if not registry_path.exists():
            registry_path = settings.REGISTRY_PATH

        if registry_path.exists():
            self.registry_df = pd.read_csv(registry_path)

        if process_path.exists() and health_path.exists():
            logger.info("Loading dual-stream simulation dataset (process + machine health)...")
            p_df = pd.read_csv(process_path)
            h_df = pd.read_csv(health_path)

            p_df["dt"] = pd.to_datetime(p_df["Timestamp"])
            h_df["dt"] = pd.to_datetime(h_df["Timestamp"])

            p_df = p_df.sort_values("dt")
            h_df = h_df.sort_values("dt")

            merged = pd.merge_asof(
                h_df,
                p_df.drop(columns=["RecordNo"], errors="ignore"),
                on="dt",
                suffixes=("", "_process"),
                direction="backward",
            )

            if "Timestamp_process" in merged.columns:
                merged.drop(columns=["Timestamp_process"], inplace=True)
            if "dt" in merged.columns:
                merged.drop(columns=["dt"], inplace=True)

            merged = merged.loc[:, ~merged.columns.duplicated()]
            self.df = merged
            logger.info(f"Loaded merged dataset with {len(self.df)} records and {len(self.df.columns)} columns.")
        elif process_path.exists():
            self.df = pd.read_csv(process_path)
        elif health_path.exists():
            self.df = pd.read_csv(health_path)
        else:
            legacy_file = data_dir / "Dynamic Results.CSV"
            if legacy_file.exists():
                self._load_single_file(legacy_file)

    def _load_single_file(self, file_path: Path):
        """Load single legacy CSV file."""
        if file_path.exists():
            self.df = pd.read_csv(file_path)

    def get_total_records(self) -> int:
        return len(self.df)

    def get_record_by_index(self, index: int) -> Dict[str, Any]:
        if len(self.df) == 0:
            return {}
        bounded_idx = max(0, min(index, len(self.df) - 1))
        return self.df.iloc[bounded_idx].to_dict()

    def get_history_by_index(self, columns: List[str], current_index: int, limit: int = 50) -> List[Dict[str, Any]]:
        seen = set()
        unique_requested_cols = [c for c in columns if not (c in seen or seen.add(c))]
        valid_cols = [c for c in unique_requested_cols if c in self.df.columns]
        if not valid_cols or len(self.df) == 0:
            return []

        end_idx = min(current_index + 1, len(self.df))
        start_idx = max(0, end_idx - limit)

        sub_df = self.df.iloc[start_idx:end_idx][valid_cols]
        return sub_df.to_dict(orient="records")

# Backward compatibility alias
CSVLoader = CSVDataProvider
