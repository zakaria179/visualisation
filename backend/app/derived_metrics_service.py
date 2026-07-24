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
            # Ball Mill: Input P80 (P_004) vs Output P80 (P_005) -> Delta P80 & Flow Difference
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
            # Hydrocyclone Cluster: Feed Flow (P_003), Underflow (P_004), Overflow (P_006)
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
            # Pump Box: Incoming (P_001, P_101, P_005), Outgoing (P_002)
            total_inflow = 0.0
            for pipe_metrics in incoming_streams.values():
                total_inflow += (
                    float(pipe_metrics.get("Feed Solid Flow", 0.0)) +
                    float(pipe_metrics.get("Process Water Solid Flow", 0.0)) +
                    float(pipe_metrics.get("Ball Mill Discharge Solid Flow", 0.0))
                )

            p002_metrics = outgoing_streams.get("P_002", {})
            outflow = float(p002_metrics.get("Pump Suction Flow", total_inflow))

            derived = {
                "num_incoming_streams": len(incoming_streams),
                "num_outgoing_streams": len(outgoing_streams),
                "total_inflow": round(total_inflow, 2),
                "outflow": round(outflow, 2),
            }

        elif tag == "SP_001":
            # Slurry Pump: Incoming (P_002), Outgoing (P_003)
            p003_metrics = outgoing_streams.get("P_003", {})
            discharge_flow = float(p003_metrics.get("Cyclone Feed Solid Flow", 0.0))

            derived = {
                "suction_flow": round(discharge_flow, 2),
                "discharge_flow": round(discharge_flow, 2),
                "flow_balance": 0.0,
            }

        return derived
