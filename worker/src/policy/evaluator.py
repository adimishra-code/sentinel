"""
Policy Evaluation Engine
Deterministic policy application based on detection signals and organization policy config
"""

from typing import Dict, Any, List, Optional, Tuple
from shared.models import DetectionResult, AIAnalysis, ModerationAction


# Default severity thresholds if no org policy is configured
DEFAULT_THRESHOLDS = {
    'hate_speech':       {'action': ModerationAction.REMOVE,            'threshold': 0.7, 'requires_review': True},
    'threat_direct':     {'action': ModerationAction.ESCALATE,          'threshold': 0.6, 'requires_review': True},
    'self_harm':         {'action': ModerationAction.ESCALATE,          'threshold': 0.5, 'requires_review': True},
    'sexual_harassment': {'action': ModerationAction.REMOVE,            'threshold': 0.7, 'requires_review': False},
    'toxicity':          {'action': ModerationAction.WARN,              'threshold': 0.5, 'requires_review': False},
    'spam':              {'action': ModerationAction.REMOVE,            'threshold': 0.6, 'requires_review': False},
    'phishing':          {'action': ModerationAction.REMOVE,            'threshold': 0.7, 'requires_review': True},
}

# Risk score to severity label mapping
SEVERITY_BANDS = [
    (0.85, 'critical'),
    (0.65, 'high'),
    (0.40, 'medium'),
    (0.0,  'low'),
]


def risk_score_to_severity(score: float) -> str:
    for threshold, label in SEVERITY_BANDS:
        if score >= threshold:
            return label
    return 'low'


def evaluate_policy(
    detection: DetectionResult,
    ai_analysis: Optional[AIAnalysis] = None,
    org_policy: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Deterministic policy evaluation.
    Takes detection result and optional AI analysis, returns a final moderation decision.
    
    Rules:
    1. Severe categories (hate speech, threats, self-harm) always get escalated/reviewed
    2. AI analysis can increase severity but never decrease it below detection floor
    3. If requires_human_review, always route to human even if action is auto
    4. Risk score is max of detection signals weighted by confidence
    """

    # Build risk score from detection
    detected_signals = [s for s in detection.signals if s.detected]
    
    base_risk = detection.overall_score
    categories = detection.categories.copy()
    requires_review = False
    reasoning: List[str] = []
    
    # Check each detected category against policy
    recommended_actions: List[str] = []
    
    for signal in detected_signals:
        category = signal.category
        
        # Get policy for this category (org policy overrides defaults)
        if org_policy and 'categories' in org_policy:
            cat_policy = next(
                (c for c in org_policy['categories'] if c.get('id') == category),
                DEFAULT_THRESHOLDS.get(category)
            )
        else:
            cat_policy = DEFAULT_THRESHOLDS.get(category)
        
        if cat_policy:
            threshold = cat_policy.get('threshold', 0.5) if isinstance(cat_policy, dict) else cat_policy.get('severityThreshold', 0.5)
            action_name = cat_policy.get('action', ModerationAction.WARN)
            needs_review = cat_policy.get('requires_review', False) if isinstance(cat_policy, dict) else cat_policy.get('requiresHumanReview', False)
            
            if signal.score >= threshold:
                if isinstance(action_name, ModerationAction):
                    recommended_actions.append(action_name.value)
                else:
                    recommended_actions.append(str(action_name))
                if needs_review:
                    requires_review = True
                reasoning.append(
                    f"{category} detected (score: {signal.score:.2f}) — evidence: {', '.join(signal.evidence[:2])}"
                )

    # Merge AI analysis if available
    if ai_analysis and ai_analysis.overall_confidence > 0.6:
        ai_severity = ai_analysis.overall_severity
        if ai_severity > base_risk:
            base_risk = max(base_risk, ai_severity * 0.9)  # AI can inform but not fully override
            reasoning.append(f"AI analysis: {ai_analysis.contextual_findings or 'high severity detected'}")
        
        if ai_analysis.requires_human_review:
            requires_review = True
        
        if ai_analysis.recommended_action and ai_analysis.recommended_action != ModerationAction.ALLOW:
            recommended_actions.append(ai_analysis.recommended_action.value)

    # Determine final action (most severe wins)
    action_priority = {
        'escalate': 5,
        'remove': 4,
        'warn': 3,
        'allow_and_monitor': 2,
        'allow': 1,
    }
    
    if recommended_actions:
        final_action = max(recommended_actions, key=lambda a: action_priority.get(a, 0))
    else:
        # No category matched threshold — low risk
        if base_risk > 0.15:
            final_action = 'allow_and_monitor'
        else:
            final_action = 'allow'
    
    # Severe content always requires review
    if final_action in ('escalate', 'remove') and base_risk > 0.8:
        requires_review = True
    
    # Uncertain content always gets reviewed
    if ai_analysis and ai_analysis.uncertainty and base_risk > 0.4:
        requires_review = True
        if ai_analysis.uncertainty not in reasoning:
            reasoning.append(f"Uncertainty: {ai_analysis.uncertainty}")

    severity = risk_score_to_severity(base_risk)

    return {
        'decision': final_action,
        'risk_score': round(min(base_risk, 1.0), 4),
        'severity': severity,
        'confidence': round(
            max((s.confidence for s in detected_signals), default=0.9), 4
        ),
        'categories': categories,
        'requires_human_review': requires_review,
        'reasoning': reasoning,
    }
