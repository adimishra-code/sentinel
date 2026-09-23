"""
Shared Pydantic models for API request/response types
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from enum import Enum


class ContentType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    URL = "url"
    MIXED = "mixed"


class ModerationAction(str, Enum):
    ALLOW = "allow"
    ALLOW_AND_MONITOR = "allow_and_monitor"
    WARN = "warn"
    REMOVE = "remove"
    ESCALATE = "escalate"


class DetectionSignal(BaseModel):
    category: str
    score: float  # 0-1
    confidence: float  # 0-1
    evidence: List[str] = []
    detected: bool


class DetectionResult(BaseModel):
    signals: List[DetectionSignal]
    overall_score: float
    flagged: bool
    categories: List[str]


class AIAnalysis(BaseModel):
    categories: List[Dict[str, Any]] = []
    overall_severity: float = 0.0
    overall_confidence: float = 0.0
    contextual_findings: Optional[str] = None
    targeted_at: Optional[str] = None
    recommended_action: ModerationAction = ModerationAction.ALLOW
    requires_human_review: bool = False
    uncertainty: Optional[str] = None
    relevant_policy_ids: List[str] = []


class ModerationResult(BaseModel):
    content_id: Optional[str] = None
    decision: ModerationAction
    risk_score: float
    severity: str  # critical, high, medium, low
    confidence: float
    categories: List[str]
    requires_human_review: bool
    reasoning: List[str]
    fast_detection: Optional[DetectionResult] = None
    ai_analysis: Optional[AIAnalysis] = None
