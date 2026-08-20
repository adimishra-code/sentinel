"""
Worker Orchestration Routes
Handles AI moderation requests from backend
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from orchestration.gemini_client import get_gemini_client

router = APIRouter()

class AnalyzeRequest(BaseModel):
    content: str
    context: Optional[Dict[str, Any]] = None
    policy: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class AnalyzeResponse(BaseModel):
    success: bool
    analysis: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(request: AnalyzeRequest):
    """
    Analyze content with Gemini AI
    Returns structured moderation assessment
    """
    try:
        client = get_gemini_client()
        result = client.analyze_content(
            content=request.content,
            context=request.context,
            policy=request.policy,
            conversation_history=request.conversation_history
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
