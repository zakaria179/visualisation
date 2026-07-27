from datetime import datetime
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional, List
from app.simulation_manager import SimulationManager
from app.telemetry_service import TelemetryService

router = APIRouter()

# Service instances dependency injection targets
sim_manager: Optional[SimulationManager] = None
telemetry_service: Optional[TelemetryService] = None


def init_routes(manager: SimulationManager, service: TelemetryService):
    """Binds global simulation manager and telemetry service instances to API routes."""
    global sim_manager, telemetry_service
    sim_manager = manager
    telemetry_service = service


# ----------------------------------------------------
# SIMULATION CONTROLLER REST ENDPOINTS
# ----------------------------------------------------

@router.get("/simulation/status")
def get_simulation_status() -> Dict[str, Any]:
    """Exposes current simulation state, record progress, speed, time, and MQTT connection status."""
    if not sim_manager or not telemetry_service:
        raise HTTPException(500, "Backend services not initialized")

    status = sim_manager.get_status()
    mqtt_svc = telemetry_service.mqtt_service

    mqtt_info = {
        "connected": mqtt_svc.is_connected() if mqtt_svc else False,
        "broker_host": mqtt_svc.host if mqtt_svc else "localhost",
        "broker_port": mqtt_svc.port if mqtt_svc else 1883,
        "total_live_tags": len(mqtt_svc.get_all_live_tags()) if mqtt_svc else 0,
    }
    status["mqtt"] = mqtt_info
    return status


@router.post("/simulation/start")
def start_simulation() -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.start()


@router.post("/simulation/pause")
def pause_simulation() -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.pause()


@router.post("/simulation/resume")
def resume_simulation() -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.resume()


@router.post("/simulation/stop")
def stop_simulation() -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.stop()


@router.post("/simulation/restart")
def restart_simulation() -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.restart()


@router.post("/simulation/speed")
def set_simulation_speed(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")

    speed = payload.get("speed")
    if speed is None:
        raise HTTPException(400, "Missing 'speed' in request body")
    try:
        speed_val = float(speed)
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid speed value; must be numeric")

    return sim_manager.set_speed(speed_val)


# ----------------------------------------------------
# MQTT LIVE TELEMETRY ENDPOINTS
# ----------------------------------------------------

@router.get("/api/mqtt/status")
def get_mqtt_status() -> Dict[str, Any]:
    """Returns detailed MQTT subscriber status, broker target, and live tag counts."""
    if not telemetry_service or not telemetry_service.mqtt_service:
        return {"connected": False, "total_live_tags": 0}

    svc = telemetry_service.mqtt_service
    all_tags = svc.get_all_live_tags()

    process_count = 0
    health_count = 0
    for tag_id, payload in all_tags.items():
        if isinstance(payload, dict):
            domain = payload.get("domain", "")
            if domain == "process" or "." in tag_id or "process" in tag_id.lower():
                process_count += 1
            else:
                health_count += 1
        else:
            process_count += 1

    return {
        "connected": svc.is_connected(),
        "broker_host": svc.host,
        "broker_port": svc.port,
        "topic_prefix": svc.topic_prefix,
        "total_live_tags": len(all_tags),
        "process_tags": process_count,
        "health_tags": health_count,
    }


@router.get("/api/mqtt/tags")
def get_all_mqtt_tags() -> Dict[str, Any]:
    """Returns dictionary of all live tag values received over MQTT."""
    if not telemetry_service or not telemetry_service.mqtt_service:
        return {}
    return telemetry_service.mqtt_service.get_all_live_tags()


@router.get("/api/mqtt/tags/{tag_id}/history")
def get_mqtt_tag_history(tag_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Returns historical buffer for specific MQTT tag_id."""
    if not telemetry_service or not telemetry_service.mqtt_service:
        return []
    return telemetry_service.mqtt_service.get_tag_history(tag_id, limit)


# ----------------------------------------------------
# ASSET TELEMETRY REST ENDPOINTS
# ----------------------------------------------------

@router.get("/api/assets/{tag}")
def get_asset(tag: str) -> Dict[str, Any]:
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")

    data = telemetry_service.get_asset_telemetry(tag, sim_manager.current_record_idx)
    if not data:
        raise HTTPException(404, f"Unknown asset tag: {tag}")
    return data


@router.get("/api/assets/{tag}/history")
def get_history(tag: str, limit: int = 50) -> Any:
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")

    return telemetry_service.get_asset_history(tag, sim_manager.current_record_idx, limit)


# ----------------------------------------------------
# MAINTENANCE REST ENDPOINTS
# ----------------------------------------------------

def _compute_maintenance_fields(eq_item: Dict[str, Any], sim_now_str: str) -> Dict[str, Any]:
    """Helper computing days_since_last_maintenance and days_until_due relative to simulation timestamp."""
    item = dict(eq_item)
    try:
        sim_date_part = sim_now_str.split()[0] if " " in sim_now_str else sim_now_str.split("T")[0]
        sim_dt = datetime.strptime(sim_date_part, "%Y-%m-%d")
    except Exception:
        sim_dt = datetime(2026, 7, 1)

    last_maint_str = str(item.get("last_maintenance_date", ""))
    next_due_str = str(item.get("next_maintenance_due", ""))

    days_since = 0
    days_until = 0

    if last_maint_str:
        try:
            last_dt = datetime.strptime(last_maint_str.split()[0], "%Y-%m-%d")
            days_since = (sim_dt - last_dt).days
        except Exception:
            pass

    if next_due_str:
        try:
            next_dt = datetime.strptime(next_due_str.split()[0], "%Y-%m-%d")
            days_until = (next_dt - sim_dt).days
        except Exception:
            pass

    item["days_since_last_maintenance"] = days_since
    item["days_until_due"] = days_until
    item["is_overdue"] = days_until < 0
    return item


@router.get("/api/maintenance/equipment")
def get_all_maintenance_equipment() -> List[Dict[str, Any]]:
    """Returns all 7 equipment master records with computed maintenance urgency fields."""
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")

    sim_status = sim_manager.get_status()
    sim_now_str = str(sim_status.get("simulation_time", "2026-07-01 00:00:00"))

    raw_items = telemetry_service.asset_service.get_all_equipment_master()
    computed_items = [_compute_maintenance_fields(item, sim_now_str) for item in raw_items]

    # Sort ascending by days_until_due (most urgent / overdue first)
    computed_items.sort(key=lambda x: x.get("days_until_due", 999999))
    return computed_items


@router.get("/api/maintenance/equipment/{equipment_id}")
def get_maintenance_equipment_detail(equipment_id: str) -> Dict[str, Any]:
    """Returns single equipment master record + health tag trends for visual inspection."""
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")

    sim_status = sim_manager.get_status()
    sim_now_str = str(sim_status.get("simulation_time", "2026-07-01 00:00:00"))

    raw_item = telemetry_service.asset_service.get_equipment_master_item(equipment_id)
    if not raw_item:
        raise HTTPException(404, f"Equipment record not found for: {equipment_id}")

    computed_item = _compute_maintenance_fields(raw_item, sim_now_str)

    # Map equipment_id to asset tag for retrieving health trends
    base_tag = equipment_id
    if equipment_id.startswith("CY_001_"):
        base_tag = "CY_001"

    health_history = telemetry_service.get_asset_history(base_tag, sim_manager.current_record_idx, limit=100)

    return {
        "equipment": computed_item,
        "health_history": health_history,
        "simulation_time": sim_now_str,
    }
