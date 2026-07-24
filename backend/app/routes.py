from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
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
# SIMULATION CONTROLLER REST ENDPOINTS (PART 2 - PART 4)
# ----------------------------------------------------

@router.get("/simulation/status")
def get_simulation_status() -> Dict[str, Any]:
    """Exposes current simulation state, record progress, speed, and time."""
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.get_status()

@router.post("/simulation/start")
def start_simulation() -> Dict[str, Any]:
    """Starts simulation from record 0."""
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.start()

@router.post("/simulation/pause")
def pause_simulation() -> Dict[str, Any]:
    """Freezes simulation at current record."""
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.pause()

@router.post("/simulation/resume")
def resume_simulation() -> Dict[str, Any]:
    """Continues simulation from current record."""
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.resume()

@router.post("/simulation/stop")
def stop_simulation() -> Dict[str, Any]:
    """Stops simulation and resets record pointer to 0."""
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.stop()

@router.post("/simulation/restart")
def restart_simulation() -> Dict[str, Any]:
    """Resets record pointer to 0 and starts simulation immediately."""
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.restart()

@router.post("/simulation/speed")
def set_simulation_speed(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Configures simulation playback speed multiplier (e.g. 1, 2, 5, 10, 100)."""
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
# ASSET TELEMETRY REST ENDPOINTS (PART 5 - PART 7)
# Preserves 100% compatibility with existing React frontend
# ----------------------------------------------------

@router.get("/api/assets/{tag}")
def get_asset(tag: str) -> Dict[str, Any]:
    """
    Returns asset metadata, live metrics, incoming/outgoing stream telemetry,
    and derived engineering KPIs for the requested asset tag at current simulation record.
    """
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")
    
    data = telemetry_service.get_asset_telemetry(tag, sim_manager.current_record_idx)
    if not data:
        raise HTTPException(404, f"Unknown asset tag: {tag}")
    return data

@router.get("/api/assets/{tag}/history")
def get_history(tag: str, limit: int = 50) -> Any:
    """Returns historical records up to current simulation record index."""
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")
    
    return telemetry_service.get_asset_history(tag, sim_manager.current_record_idx, limit)
