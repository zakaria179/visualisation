from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body

from app.api.dependencies import get_sim_manager, get_telemetry_service
from app.domains.simulation.manager import SimulationManager
from app.domains.telemetry.service import TelemetryService
from app.domains.simulation.schemas import SimulationStatusResponse, SimulationSpeedPayload

router = APIRouter(tags=["Simulation Controller"])

@router.get("/status", response_model=SimulationStatusResponse)
def get_simulation_status(
    sim_manager: SimulationManager = Depends(get_sim_manager),
    telemetry_service: TelemetryService = Depends(get_telemetry_service),
) -> Dict[str, Any]:
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

@router.post("/start")
def start_simulation(sim_manager: SimulationManager = Depends(get_sim_manager)) -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.start()

@router.post("/pause")
def pause_simulation(sim_manager: SimulationManager = Depends(get_sim_manager)) -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.pause()

@router.post("/resume")
def resume_simulation(sim_manager: SimulationManager = Depends(get_sim_manager)) -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.resume()

@router.post("/stop")
def stop_simulation(sim_manager: SimulationManager = Depends(get_sim_manager)) -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.stop()

@router.post("/restart")
def restart_simulation(sim_manager: SimulationManager = Depends(get_sim_manager)) -> Dict[str, Any]:
    if not sim_manager:
        raise HTTPException(500, "SimulationManager not initialized")
    return sim_manager.restart()

@router.post("/speed")
def set_simulation_speed(
    payload: Dict[str, Any] = Body(...),
    sim_manager: SimulationManager = Depends(get_sim_manager),
) -> Dict[str, Any]:
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
