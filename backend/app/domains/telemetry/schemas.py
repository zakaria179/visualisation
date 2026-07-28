from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class LiveTagValue(BaseModel):
    tag_id: str
    value: Any
    unit: Optional[str] = None
    timestamp: Optional[str] = None
    quality: Optional[str] = "SIM"
    domain: Optional[str] = None

class MQTTStatusResponse(BaseModel):
    connected: bool
    broker_host: str
    broker_port: int
    topic_prefix: Optional[str] = "plant/grinding/#"
    total_live_tags: int
    process_tags: Optional[int] = 0
    health_tags: Optional[int] = 0

class AssetTelemetryResponse(BaseModel):
    tag: str
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    live_metrics: Dict[str, float] = {}
    record_no: int = 0
    incoming_streams: Dict[str, Dict[str, float]] = {}
    outgoing_streams: Dict[str, Dict[str, float]] = {}
    derived_metrics: Dict[str, Any] = {}
    mqtt: Dict[str, Any] = {}
