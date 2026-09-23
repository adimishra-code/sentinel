"""
Worker Orchestration Routes
Handles AI moderation requests from backend
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os

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
    Analyze content with Gemini AI.
    Returns structured moderation assessment.
    Falls back gracefully if API key is not configured.
    """
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("MODEL_API_KEY")

    if not gemini_key:
        # Graceful fallback — no AI key configured
        return AnalyzeResponse(
            success=False,
            error="AI analysis unavailable: GEMINI_API_KEY not configured. Relying on fast detection only.",
        )

    try:
        from orchestration.gemini_client import get_gemini_client
        client = get_gemini_client()
        result = client.analyze_content(
            content=request.content,
            context=request.context,
            policy=request.policy,
            conversation_history=request.conversation_history,
        )
        return result
    except ValueError as e:
        # Missing API key (shouldn't happen due to check above, but safety net)
        return AnalyzeResponse(success=False, error=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
