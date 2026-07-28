from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_telemetry_service, get_sim_manager
from app.domains.telemetry.service import TelemetryService
from app.domains.simulation.manager import SimulationManager
from app.core.exceptions import AssetNotFoundError

router = APIRouter(tags=["Asset Telemetry"])

@router.get("/{tag}")
def get_asset(
    tag: str,
    telemetry_service: TelemetryService = Depends(get_telemetry_service),
    sim_manager: SimulationManager = Depends(get_sim_manager),
) -> Dict[str, Any]:
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")

    data = telemetry_service.get_asset_telemetry(tag, sim_manager.current_record_idx)
    if not data:
        raise AssetNotFoundError(tag)
    return data

@router.get("/{tag}/history")
def get_asset_history(
    tag: str,
    limit: int = 50,
    telemetry_service: TelemetryService = Depends(get_telemetry_service),
    sim_manager: SimulationManager = Depends(get_sim_manager),
) -> List[Dict[str, Any]]:
    if not telemetry_service or not sim_manager:
        raise HTTPException(500, "Backend services not initialized")

    return telemetry_service.get_asset_history(tag, sim_manager.current_record_idx, limit)
