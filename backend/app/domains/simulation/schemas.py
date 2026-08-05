from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class SimulationStatusResponse(BaseModel):
    simulation_name: str = "SysCAD Dynamic Phosphates Grinding Circuit"
    csv_file: str = "process_flow_timeseries.csv & machine_health_timeseries.csv"
    state: str
    current_record: int
    total_records: int
    progress: float
    speed: float
    elapsed_hours: float
    simulation_time: str
    timestamp: str
    mqtt: Optional[Dict[str, Any]] = None

class SimulationSpeedPayload(BaseModel):
    speed: float = Field(..., gt=0, description="Speedup multiplier e.g. 1, 10, 60, 600")
