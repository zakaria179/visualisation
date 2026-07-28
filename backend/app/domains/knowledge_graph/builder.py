from typing import Dict, Any, List, Tuple
from app.domains.assets.service import AssetService

class MemoryGraphBuilder:
    """Constructs in-memory graph representation of nodes and edges from asset metadata and maintenance history."""
    
    @staticmethod
    def build(asset_service: AssetService) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        node_map: Dict[str, Dict[str, Any]] = {}

        # 1. Equipment Nodes
        raw_eq_list = asset_service.get_all_equipment_master()
        eq_layout_coords = {
            "PB_001": {"x": 220, "y": 320},
            "SP_001": {"x": 420, "y": 320},
            "BM_001": {"x": 980, "y": 320},
            "CY_001_A": {"x": 720, "y": 160},
            "CY_001_B": {"x": 720, "y": 320},
            "CY_001_C": {"x": 720, "y": 480},
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
                    "x": coords["x"] - 60,
                    "y": coords["y"] + 70,
                }
                if fm_id not in node_map:
                    nodes.append(fm_node)
                    node_map[fm_id] = fm_node
                    edges.append({
                        "source": eq_id,
                        "target": fm_id,
                        "label": "RISKS_FAILURE"
                    })

        # 2. Process Stream Nodes
        all_assets = asset_service.get_all_assets()
        stream_coords = {
            "P_001": {"x": 80, "y": 320},
            "P_002": {"x": 320, "y": 320},
            "P_003": {"x": 560, "y": 320},
            "P_004": {"x": 860, "y": 480},
            "P_005": {"x": 1120, "y": 320},
            "P_006": {"x": 860, "y": 160},
        }

        for tag, data in all_assets.items():
            asset_type = str(data.get("asset_type", ""))
            if asset_type.startswith("Pipe") or tag.startswith("P_"):
                coords = stream_coords.get(tag, {"x": 600, "y": 300})
                node = {
                    "id": tag,
                    "name": f"Stream {tag} ({data.get('material', 'Slurry')})",
                    "type": "Stream",
                    "category": "Pipeline Stream",
                    "material": data.get("material", "Phosphate Slurry"),
                    "source": data.get("source"),
                    "destination": data.get("destination"),
                    "status": "ACTIVE",
                    "x": coords["x"],
                    "y": coords["y"],
                }
                if tag not in node_map:
                    nodes.append(node)
                    node_map[tag] = node

                src = data.get("source")
                dst = data.get("destination")
                if src and not isinstance(src, list):
                    src_clean = src.split(" ")[0].strip()
                    if src_clean in node_map:
                        edges.append({
                            "source": src_clean,
                            "target": tag,
                            "label": "DISCHARGES_TO"
                        })

                if dst:
                    dst_list = dst if isinstance(dst, list) else [dst]
                    for d in dst_list:
                        dst_clean = d.split(" ")[0].strip()
                        if dst_clean in node_map:
                            edges.append({
                                "source": tag,
                                "target": dst_clean,
                                "label": "FEEDS_INTO"
                            })

        # 3. SCADA Sensors
        sensor_list = [
            {"id": "FIT_101", "name": "Slurry Feed Flow Meter", "type": "Sensor", "unit": "m3/h", "target": "SP_001", "risk_target": "FM_SP_001", "x": 420, "y": 190},
            {"id": "PIT_101", "name": "Pump Discharge Pressure Transducer", "type": "Sensor", "unit": "bar", "target": "SP_001", "risk_target": "FM_SP_001", "x": 420, "y": 450},
            {"id": "WIT_201", "name": "Mill Solids Feed Scale", "type": "Sensor", "unit": "t/h", "target": "BM_001", "risk_target": "FM_BM_001", "x": 980, "y": 190},
            {"id": "AIT_201", "name": "Acoustic Mill Charge Sensor", "type": "Sensor", "unit": "dB", "target": "BM_001", "risk_target": "FM_BM_001", "x": 980, "y": 450},
            {"id": "PIT_301", "name": "Cyclone Manifold Pressure Gauge", "type": "Sensor", "unit": "kPa", "target": "CY_001_B", "risk_target": "FM_CY_001_B", "x": 560, "y": 190},
            {"id": "DIT_301", "name": "Underflow Slurry Density Sensor", "type": "Sensor", "unit": "g/L", "target": "CY_001_C", "risk_target": "FM_CY_001_C", "x": 860, "y": 560},
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

            edges.append({
                "source": s["id"],
                "target": s["target"],
                "label": "MONITORS_TELEMETRY"
            })
            if s.get("risk_target") and s["risk_target"] in node_map:
                edges.append({
                    "source": s["id"],
                    "target": s["risk_target"],
                    "label": "MONITORS_RISK"
                })

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

                edges.append({
                    "source": wo_id,
                    "target": eq_id,
                    "label": "SERVICED_EQUIPMENT"
                })

                fm_id = f"FM_{eq_id}"
                if fm_id in node_map:
                    edges.append({
                        "source": wo_id,
                        "target": fm_id,
                        "label": "RESOLVED_FAILURE"
                    })

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

                    edges.append({
                        "source": tech_id,
                        "target": wo_id,
                        "label": "EXECUTED_WORK_ORDER"
                    })

        return nodes, edges, node_map
