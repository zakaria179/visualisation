from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

from app.api.dependencies import get_rag_service
from app.domains.knowledge_graph.rag_service import GraphRAGService

router = APIRouter(prefix="/rag", tags=["Graph RAG Engine"])

class ChatMessageItem(BaseModel):
    sender: str
    text: str

class RAGQueryRequest(BaseModel):
    question: str
    chat_history: List[ChatMessageItem] = []

@router.post("/query")
def query_graph_rag(
    request: RAGQueryRequest,
    rag_service: GraphRAGService = Depends(get_rag_service)
) -> Dict[str, Any]:
    """
    Execute Graph Retrieval-Augmented Generation (Graph RAG) query.
    Extracts relevant Knowledge Graph sub-topology, live SCADA telemetry, and maintenance work orders
    to synthesize an AI diagnostic response via Google Gemini API (or local industrial fallback).
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    history_dicts = [{"sender": m.sender, "text": m.text} for m in request.chat_history]
    return rag_service.query(request.question.strip(), chat_history=history_dicts)

@router.get("/sample-questions")
def get_sample_questions(
    rag_service: GraphRAGService = Depends(get_rag_service)
) -> List[str]:
    """Get curated sample questions for the industrial digital twin AI assistant."""
    return rag_service.get_sample_questions()
