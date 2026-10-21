"""
Worker Orchestration Routes
Handles AI moderation requests from backend
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os

from shared.config import get_settings

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


def _verify_worker_secret(x_worker_shared_secret: Optional[str] = Header(None)) -> None:
    """Verify the backend-to-worker shared secret."""
    settings = get_settings()
    expected = settings.worker_shared_secret
    if not x_worker_shared_secret or x_worker_shared_secret != expected:
        raise HTTPException(status_code=401, detail='Invalid or missing worker shared secret')


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(
    request: AnalyzeRequest,
    x_worker_shared_secret: Optional[str] = Header(None),
):
    """
    Analyze content with Gemini AI.
    Returns structured moderation assessment.
    Falls back gracefully if API key is not configured.
    Requires the WORKER_SHARED_SECRET header to prevent unauthorized calls.
    """
    _verify_worker_secret(x_worker_shared_secret)

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
