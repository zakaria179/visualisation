from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_kg_service
from app.domains.knowledge_graph.service import KnowledgeGraphService

router = APIRouter(tags=["Knowledge Graph Engine"])

@router.get("/topology")
def get_graph_topology(kg_service: KnowledgeGraphService = Depends(get_kg_service)) -> Dict[str, Any]:
    if not kg_service:
        raise HTTPException(500, "Knowledge Graph service not initialized")
    return kg_service.get_topology()

@router.get("/node/{node_id}")
def get_graph_node_details(
    node_id: str,
    kg_service: KnowledgeGraphService = Depends(get_kg_service),
) -> Dict[str, Any]:
    if not kg_service:
        raise HTTPException(500, "Knowledge Graph service not initialized")
    return kg_service.get_node_details(node_id)
