from typing import Dict, Any

class DerivedMetricsService:
    """
    Calculates dynamic derived engineering metrics and KPIs for process equipment
    based on live stream telemetry from incoming and outgoing pipes.
    """

    @staticmethod
    def calculate_derived_metrics(
        tag: str,
        incoming_streams: Dict[str, Dict[str, float]],
        outgoing_streams: Dict[str, Dict[str, float]]
    ) -> Dict[str, Any]:
        """
        Computes derived engineering metrics for equipment units based on physical conservation principles.
        """
        derived: Dict[str, Any] = {}

        if tag == "BM_001":
            p004_metrics = incoming_streams.get("P_004", {})
            p005_metrics = outgoing_streams.get("P_005", {})

            in_p80 = float(p004_metrics.get("Cyclone Underflow P80", 0.0))
            out_p80 = float(p005_metrics.get("Ball Mill Discharge P80", 0.0))
            in_flow = float(p004_metrics.get("Cyclone Underflow Solid Flow", 0.0))
            out_flow = float(p005_metrics.get("Ball Mill Discharge Solid Flow", 0.0))

            derived = {
                "delta_p80": round(max(0.0, in_p80 - out_p80), 2),
                "input_flow": round(in_flow, 2),
                "output_flow": round(out_flow, 2),
                "flow_difference": round(out_flow - in_flow, 2),
            }

        elif tag == "CY_001":
            p003_metrics = incoming_streams.get("P_003", {})
            p004_metrics = outgoing_streams.get("P_004", {})
            p006_metrics = outgoing_streams.get("P_006", {})

            feed_flow = float(p003_metrics.get("Cyclone Feed Solid Flow", 0.0))
            underflow_flow = float(p004_metrics.get("Cyclone Underflow Solid Flow", 0.0))
            overflow_flow = float(p006_metrics.get("Output Slurry Solid Flow", 0.0))

            underflow_pct = round((underflow_flow / feed_flow * 100.0), 2) if feed_flow > 0 else 0.0
            overflow_pct = round((overflow_flow / feed_flow * 100.0), 2) if feed_flow > 0 else 0.0

            derived = {
                "feed_flow": round(feed_flow, 2),
                "underflow_flow": round(underflow_flow, 2),
                "overflow_flow": round(overflow_flow, 2),
                "underflow_pct": underflow_pct,
                "overflow_pct": overflow_pct,
            }

        elif tag == "PB_001":
            p001_metrics = incoming_streams.get("P_001", {})
            p101_metrics = incoming_streams.get("P_101", {})
            p005_metrics = incoming_streams.get("P_005", {})

            feed_in = float(p001_metrics.get("Feed Solid Flow", 0.0))
            water_in = float(p101_metrics.get("Process Water Solid Flow", 0.0))
            recycle_in = float(p005_metrics.get("Ball Mill Discharge Solid Flow", 0.0))

            total_inflow = feed_in + water_in + recycle_in

            p002_metrics = outgoing_streams.get("P_002", {})
            outflow = float(p002_metrics.get("Cyclone Feed Solid Flow", float(p002_metrics.get("Feed Solid Flow", total_inflow))))

            derived = {
                "total_inflow": round(total_inflow, 2),
                "outflow": round(outflow, 2),
                "flow_balance": round(total_inflow - outflow, 2),
            }

        elif tag == "SP_001":
            p002_metrics = incoming_streams.get("P_002", {})
            p003_metrics = outgoing_streams.get("P_003", {})

            suction_flow = float(p002_metrics.get("Cyclone Feed Solid Flow", float(p002_metrics.get("Feed Solid Flow", 0.0))))
            discharge_flow = float(p003_metrics.get("Cyclone Feed Solid Flow", 0.0))

            if suction_flow == 0.0:
                suction_flow = discharge_flow

            derived = {
                "suction_flow": round(suction_flow, 2),
                "discharge_flow": round(discharge_flow, 2),
                "flow_balance": round(discharge_flow - suction_flow, 2),
            }

        return derived
