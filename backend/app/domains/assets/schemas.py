from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class EquipmentMasterItem(BaseModel):
    equipment_id: str
    equipment_name: Optional[str] = None
    type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    criticality: Optional[str] = "MEDIUM"
    condition_status: Optional[str] = "GOOD"
    maintenance_interval_days: Optional[int] = None
    running_hours: Optional[float] = None
    MTBF_hours: Optional[float] = None
    MTTR_hours: Optional[float] = None
    last_maintenance_date: Optional[str] = None
    next_maintenance_due: Optional[str] = None
    days_since_last_maintenance: Optional[int] = 0
    days_until_due: Optional[int] = 0
    is_overdue: Optional[bool] = False

class MaintenanceLogItem(BaseModel):
    log_id: str
    equipment_id: str
    maintenance_type: Optional[str] = None
    maintenance_date: Optional[str] = None
    technician: Optional[str] = None
    parts_replaced: Optional[str] = None
    downtime_hours: Optional[float] = 0.0
    cost_usd: Optional[float] = 0.0
    status: Optional[str] = "Completed"
    description: Optional[str] = None
