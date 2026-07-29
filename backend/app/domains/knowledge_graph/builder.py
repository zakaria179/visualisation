from typing import Dict, Any, List, Tuple
from app.domains.assets.service import AssetService

class MemoryGraphBuilder:
    """Constructs in-memory graph representation of nodes and edges from asset metadata and maintenance history."""
    
    @staticmethod
    def build(asset_service: AssetService) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        node_map: Dict[str, Dict[str, Any]] = {}
        seen_edge_pairs = set()

        def add_edge(src: str, tgt: str, label: str, edge_type: str = "process"):
            if not src or not tgt or src not in node_map or tgt not in node_map:
                return
            pair_key = (src, tgt)
            if pair_key not in seen_edge_pairs:
                seen_edge_pairs.add(pair_key)
                edges.append({
                    "source": src,
                    "target": tgt,
                    "label": label,
                    "type": edge_type
                })

        # 1. Equipment Nodes
        raw_eq_list = asset_service.get_all_equipment_master()
        eq_layout_coords = {
            "PB_001": {"x": 280, "y": 340},
            "SP_001": {"x": 600, "y": 340},
            "CY_001_A": {"x": 960, "y": 160},
            "CY_001_B": {"x": 960, "y": 340},
            "CY_001_C": {"x": 960, "y": 520},
            "BM_001": {"x": 1320, "y": 440},
        }

        for eq in raw_eq_list:
            eq_id = eq.get("equipment_id")
            coords = eq_layout_coords.get(eq_id, {"x": 500, "y": 300})
            node = {
                "id": eq_id,
                "name": eq.get("equipment_name", eq_id),
                "type": "Equipment",
                "category": eq.get("type", "Process Unit"),
                "manufacturer": eq.get("manufacturer"),
                "model": eq.get("model"),
                "criticality": eq.get("criticality", "MEDIUM"),
                "status": eq.get("condition_status", "GOOD"),
                "running_hours": eq.get("running_hours"),
                "MTBF_hours": eq.get("MTBF_hours"),
                "MTTR_hours": eq.get("MTTR_hours"),
                "x": coords["x"],
                "y": coords["y"],
            }
            nodes.append(node)
            node_map[eq_id] = node

            failure_mode = eq.get("last_failure_mode")
            if failure_mode and failure_mode != "None":
                fm_id = f"FM_{eq_id}"
                fm_node = {
                    "id": fm_id,
                    "name": failure_mode,
                    "type": "FailureMode",
                    "category": "Risk Factor",
                    "equipment_id": eq_id,
                    "x": coords["x"],
                    "y": coords["y"] + 140,
                }
                if fm_id not in node_map:
                    nodes.append(fm_node)
                    node_map[fm_id] = fm_node

        # Add equipment -> failure mode edges strictly once
        for eq_id in eq_layout_coords.keys():
            fm_id = f"FM_{eq_id}"
            if eq_id in node_map and fm_id in node_map:
                add_edge(eq_id, fm_id, "RISKS", "risk")

        # 2. Process Stream Nodes
        stream_defs = [
            {"id": "P_001", "name": "Feed Ore Slurry", "material": "Phosphate Ore Slurry", "x": 80, "y": 340},
            {"id": "P_101", "name": "Process Water Line", "material": "Process Water", "x": 80, "y": 200},
            {"id": "P_002", "name": "Sump Discharge", "material": "Diluted Slurry", "x": 440, "y": 340},
            {"id": "P_003", "name": "Pump Discharge", "material": "Pressurized Slurry", "x": 760, "y": 340},
            {"id": "P_004", "name": "Cyclone Underflow", "material": "Coarse Underflow", "x": 1140, "y": 440},
            {"id": "P_005", "name": "Mill Discharge", "material": "Ground Pulp", "x": 760, "y": 720},
            {"id": "P_006", "name": "Cyclone Overflow", "material": "Fine Product Slurry", "x": 1220, "y": 160},
        ]

        for st in stream_defs:
            s_node = {
                "id": st["id"],
                "name": f"Stream {st['id']} ({st['material']})",
                "type": "Stream",
                "category": "Pipeline Stream",
                "material": st["material"],
                "status": "ACTIVE",
                "x": st["x"],
                "y": st["y"],
            }
            if st["id"] not in node_map:
                nodes.append(s_node)
                node_map[st["id"]] = s_node

        # Stream Process Connections
        add_edge("P_001", "PB_001", "FEEDS_INTO", "process")
        add_edge("P_101", "PB_001", "WATER_INPUT", "process")
        add_edge("PB_001", "P_002", "DISCHARGES_TO", "process")
        add_edge("P_002", "SP_001", "FEEDS_INTO", "process")
        add_edge("SP_001", "P_003", "DISCHARGES_TO", "process")
        add_edge("P_003", "CY_001_A", "FEEDS_INTO", "process")
        add_edge("P_003", "CY_001_B", "FEEDS_INTO", "process")
        add_edge("P_003", "CY_001_C", "FEEDS_INTO", "process")
        add_edge("CY_001_A", "P_006", "OVERFLOW", "process")
        add_edge("CY_001_B", "P_006", "OVERFLOW", "process")
        add_edge("CY_001_C", "P_006", "OVERFLOW", "process")
        add_edge("CY_001_A", "P_004", "UNDERFLOW", "process")
        add_edge("CY_001_B", "P_004", "UNDERFLOW", "process")
        add_edge("CY_001_C", "P_004", "UNDERFLOW", "process")
        add_edge("P_004", "BM_001", "FEEDS_INTO", "process")
        add_edge("BM_001", "P_005", "DISCHARGES_TO", "process")
        add_edge("P_005", "PB_001", "RECIRCULATES", "process")

        # 3. SCADA Sensors (100% Aligned with assets.json and machine_health_timeseries.csv)
        sensor_list = [
            # Pump Box PB_001 Sensors
            {"id": "PB001_Level_pct", "name": "Pump Box Sump Level", "unit": "%", "target": "PB_001", "x": 280, "y": 200},
            {"id": "PB001_Sump_Temp_C", "name": "Pump Box Sump Temp", "unit": "°C", "target": "PB_001", "x": 280, "y": 480},

            # Slurry Pump SP_001 Sensors
            {"id": "SP001_Discharge_Pressure_kPa", "name": "Pump Discharge Pressure", "unit": "kPa", "target": "SP_001", "x": 600, "y": 480},
            {"id": "SP001_Motor_Power_kW", "name": "Pump Motor Power Draw", "unit": "kW", "target": "SP_001", "x": 600, "y": 180},
            {"id": "SP001_Vibration_mms", "name": "Pump Vibration RMS", "unit": "mm/s", "target": "SP_001", "x": 480, "y": 480},

            # Hydrocyclones A, B, C (Cluster Health Metrics)
            {"id": "CY001_Inlet_Pressure_A", "name": "Cyclone A Inlet Pressure", "unit": "kPa", "target": "CY_001_A", "x": 860, "y": 100},
            {"id": "CY001_Apex_Wear_A", "name": "Cyclone A Apex Wear Index", "unit": "%", "target": "CY_001_A", "x": 1060, "y": 100},

            {"id": "CY001_Inlet_Pressure_B", "name": "Cyclone B Inlet Pressure", "unit": "kPa", "target": "CY_001_B", "x": 840, "y": 280},
            {"id": "CY001_Apex_Wear_B", "name": "Cyclone B Apex Wear Index", "unit": "%", "target": "CY_001_B", "x": 1080, "y": 280},

            {"id": "CY001_Inlet_Pressure_C", "name": "Cyclone C Inlet Pressure", "unit": "kPa", "target": "CY_001_C", "x": 860, "y": 580},
            {"id": "CY001_Apex_Wear_C", "name": "Cyclone C Apex Wear Index", "unit": "%", "target": "CY_001_C", "x": 1060, "y": 580},

            # Ball Mill BM_001 Sensors
            {"id": "BM001_Power_Draw_kW", "name": "Mill Motor Power Draw", "unit": "kW", "target": "BM_001", "x": 1320, "y": 280},
            {"id": "BM001_Bearing_DE_Temp_C", "name": "Drive-End Bearing Temp", "unit": "°C", "target": "BM_001", "x": 1440, "y": 360},
            {"id": "BM001_Vibration_mms", "name": "Mill Shell Vibration", "unit": "mm/s", "target": "BM_001", "x": 1440, "y": 520},
            {"id": "BM001_Sound_Level_dB", "name": "Acoustic Mill Charge Sound", "unit": "dB", "target": "BM_001", "x": 1320, "y": 600},
        ]

        for s in sensor_list:
            s_node = {
                "id": s["id"],
                "name": s["name"],
                "type": "Sensor",
                "category": "SCADA Telemetry Tag",
                "unit": s["unit"],
                "status": "ONLINE",
                "x": s["x"],
                "y": s["y"],
            }
            if s["id"] not in node_map:
                nodes.append(s_node)
                node_map[s["id"]] = s_node

            add_edge(s["id"], s["target"], "MONITORS", "telemetry")

        # 4. Work Orders & Technicians
        history_logs = asset_service.get_maintenance_history()
        for idx, log in enumerate(history_logs):
            wo_id = log.get("log_id")
            eq_id = log.get("equipment_id")
            tech_name = log.get("technician")

            if wo_id and eq_id in node_map:
                eq_coords = node_map[eq_id]
                offset_y = (idx % 3) * 35 - 35
                wo_node = {
                    "id": wo_id,
                    "name": f"Work Order {wo_id}",
                    "type": "WorkOrder",
                    "category": log.get("maintenance_type", "Preventive"),
                    "date": log.get("maintenance_date"),
                    "parts_replaced": log.get("parts_replaced"),
                    "downtime_hours": log.get("downtime_hours"),
                    "cost_usd": log.get("cost_usd"),
                    "status": log.get("status", "Completed"),
                    "description": log.get("description"),
                    "x": eq_coords["x"] + 110,
                    "y": eq_coords["y"] + offset_y,
                }
                if wo_id not in node_map:
                    nodes.append(wo_node)
                    node_map[wo_id] = wo_node

                add_edge(wo_id, eq_id, "SERVICED", "work")

                fm_id = f"FM_{eq_id}"
                if fm_id in node_map:
                    add_edge(wo_id, fm_id, "RESOLVED", "work")

                if tech_name:
                    tech_id = f"TECH_{tech_name.split(' ')[0].upper()}"
                    if tech_id not in node_map:
                        tech_node = {
                            "id": tech_id,
                            "name": tech_name,
                            "type": "Technician",
                            "category": "Maintenance Specialist",
                            "status": "ACTIVE",
                            "x": eq_coords["x"] + 220,
                            "y": eq_coords["y"] + offset_y,
                        }
                        nodes.append(tech_node)
                        node_map[tech_id] = tech_node

                    add_edge(tech_id, wo_id, "EXECUTED", "work")

        return nodes, edges, node_map

