from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class GraphNode(BaseModel):
    id: str
    name: str
    type: str
    category: Optional[str] = "General"
    status: Optional[str] = "OK"
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0

class GraphEdge(BaseModel):
    source: str
    target: str
    label: str

class GraphTopologyResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    total_nodes: int
    total_edges: int
    engine: str
