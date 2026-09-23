"""
Detection module routes
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from detection.engine import run_detection

router = APIRouter()


class DetectRequest(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None


@router.post("/detect")
async def detect_content(request: DetectRequest):
    """
    Run fast pattern-based detection on text content.
    Returns structured detection signals.
    """
    result = run_detection(request.text, metadata=request.metadata)
    return {
        "success": True,
        "data": result.model_dump(),
    }
