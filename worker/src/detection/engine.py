"""
Fast Detection Engine
Pattern-based and heuristic classifiers for quick content screening
"""

import re
import unicodedata
from typing import List, Dict, Any, Tuple
from shared.models import DetectionSignal, DetectionResult

# ===========================================================================
# Pattern Definitions
# ===========================================================================

PROFANITY_PATTERNS = [
    r'\bf+u+c+k+',
    r'\bs+h+i+t+',
    r'\bb+i+t+c+h+',
    r'\ba+s+s+h+o+l+e+',
    r'\bc+u+n+t+',
    r'\bp+i+s+s+',
]

HATE_SPEECH_PATTERNS = [
    r'\bn+i+g+g+e+r+',
    r'\bf+a+g+g+o+t+',
    r'\br+e+t+a+r+d+',
    r'\bk+i+k+e+',
    r'\bchink\b',
    r'\bspic\b',
    r'\bwetback\b',
]

THREAT_PATTERNS = [
    r'\b(kill|murder|shoot|stab|hurt|harm|attack|beat)\s+(you|him|her|them|u)\b',
    r'\bgoing\s+to\s+(kill|hurt|harm|attack)\b',
    r"\bi('ll|'m\s+going\s+to)\s+(kill|hurt|harm)\b",
    r'\b(i will|i am going to)\s+(kill|hurt|harm|destroy)\b',
    r'\bdie\b.*\b(bitch|fucker|asshole)\b',
    r'\byour\s+life\s+is\s+(over|done|finished)\b',
]

SEXUAL_HARASSMENT_PATTERNS = [
    r'\bsend\s+(nudes|nude\s+pics|naked\s+pics)\b',
    r'\bshow\s+(me\s+)?(your|ur)\s+(tits|boobs|pussy|dick|cock|ass)\b',
    r'\bwanna\s+(fuck|sex|bang|hook\s+up)\b',
    r'\bi\s+want\s+to\s+(fuck|bang|sleep\s+with)\s+you\b',
]

SPAM_PATTERNS = [
    r'\b(buy|click|visit|check\s+out)\s+.{0,20}(now|here|link|today)\b',
    r'\b(earn|make)\s+\$?\d+.{0,15}\b(per|a)\s+(day|hour|week|month)\b',
    r'\bfree\s+(money|gift|prize|iphone|laptop)\b',
    r'\blimited\s+time\s+offer\b',
    r'\bact\s+now\b',
]

PHISHING_PATTERNS = [
    r'\bverify\s+(your|ur)\s+account\b',
    r'\bclick\s+(here|link)\s+to\s+(verify|confirm|unlock|activate)\b',
    r'\baccount\s+(suspended|locked|restricted|compromised)\b',
    r'\bwin\s+.{0,20}(prize|lottery|sweepstakes|reward)\b',
    r'\byou\s+have\s+been\s+selected\b',
    r'\benter\s+your\s+(password|credentials|credit\s+card)\b',
]

SELF_HARM_PATTERNS = [
    r'\b(kill|hurt)\s+(myself|yourself)\b',
    r'\bsuicid(e|al)\b',
    r'\bself.?harm\b',
    r'\bcutting\s+myself\b',
    r'\bwant\s+to\s+die\b',
    r'\bno\s+reason\s+to\s+live\b',
]

# ===========================================================================
# Utility Functions
# ===========================================================================

def normalize_text(text: str) -> str:
    """Normalize unicode, lowercase, collapse whitespace"""
    text = unicodedata.normalize('NFKC', text)
    text = text.lower().strip()
    text = re.sub(r'\s+', ' ', text)
    # Remove zero-width characters and invisible separators
    text = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', text)
    return text


def count_urls(text: str) -> int:
    """Count URLs in text"""
    url_pattern = r'https?://\S+|www\.\S+'
    return len(re.findall(url_pattern, text, re.IGNORECASE))


def has_excessive_caps(text: str, threshold: float = 0.5) -> bool:
    """Check if text has unusually high ratio of uppercase letters"""
    letters = [c for c in text if c.isalpha()]
    if len(letters) < 10:
        return False
    caps_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    return caps_ratio > threshold


def has_repeated_chars(text: str, min_repeat: int = 4) -> bool:
    """Detect character repetition (lllooool, haaaate, etc.)"""
    pattern = rf'(.)\1{{{min_repeat},}}'
    return bool(re.search(pattern, text))


def match_patterns(text: str, patterns: List[str]) -> List[str]:
    """Run all patterns and return matched strings"""
    matches = []
    for pattern in patterns:
        found = re.findall(pattern, text, re.IGNORECASE)
        for f in found:
            if isinstance(f, tuple):
                matches.append(' '.join(f).strip())
            else:
                matches.append(f.strip())
    return [m for m in matches if m]


# ===========================================================================
# Category Detectors
# ===========================================================================

def detect_profanity(text: str) -> DetectionSignal:
    matches = match_patterns(text, PROFANITY_PATTERNS)
    detected = len(matches) > 0
    score = min(len(matches) * 0.3, 1.0)
    return DetectionSignal(
        category='toxicity',
        score=score,
        confidence=0.85 if detected else 0.9,
        evidence=matches[:5],
        detected=detected,
    )


def detect_hate_speech(text: str) -> DetectionSignal:
    matches = match_patterns(text, HATE_SPEECH_PATTERNS)
    detected = len(matches) > 0
    return DetectionSignal(
        category='hate_speech',
        score=0.95 if detected else 0.0,
        confidence=0.9 if detected else 0.95,
        evidence=matches,
        detected=detected,
    )


def detect_threats(text: str) -> DetectionSignal:
    matches = match_patterns(text, THREAT_PATTERNS)
    detected = len(matches) > 0
    return DetectionSignal(
        category='threat_direct',
        score=0.9 if detected else 0.0,
        confidence=0.85 if detected else 0.9,
        evidence=matches,
        detected=detected,
    )


def detect_sexual_harassment(text: str) -> DetectionSignal:
    matches = match_patterns(text, SEXUAL_HARASSMENT_PATTERNS)
    detected = len(matches) > 0
    return DetectionSignal(
        category='sexual_harassment',
        score=0.85 if detected else 0.0,
        confidence=0.8 if detected else 0.9,
        evidence=matches,
        detected=detected,
    )


def detect_spam(text: str, url_count: int = 0) -> DetectionSignal:
    matches = match_patterns(text, SPAM_PATTERNS)
    excessive_urls = url_count > 3
    detected = len(matches) > 0 or excessive_urls
    score = min((len(matches) * 0.3) + (0.4 if excessive_urls else 0), 1.0)
    evidence = matches.copy()
    if excessive_urls:
        evidence.append(f'{url_count} URLs detected')
    return DetectionSignal(
        category='spam',
        score=score,
        confidence=0.75 if detected else 0.85,
        evidence=evidence,
        detected=detected,
    )


def detect_phishing(text: str) -> DetectionSignal:
    matches = match_patterns(text, PHISHING_PATTERNS)
    detected = len(matches) > 0
    return DetectionSignal(
        category='phishing',
        score=0.9 if detected else 0.0,
        confidence=0.85 if detected else 0.9,
        evidence=matches,
        detected=detected,
    )


def detect_self_harm(text: str) -> DetectionSignal:
    matches = match_patterns(text, SELF_HARM_PATTERNS)
    detected = len(matches) > 0
    return DetectionSignal(
        category='self_harm',
        score=0.9 if detected else 0.0,
        confidence=0.8 if detected else 0.9,
        evidence=matches,
        detected=detected,
    )


# ===========================================================================
# Main Detection Runner
# ===========================================================================

def run_detection(text: str, metadata: Dict[str, Any] | None = None) -> DetectionResult:
    """
    Run all detectors on normalized text.
    Returns a structured DetectionResult.
    """
    if metadata is None:
        metadata = {}

    normalized = normalize_text(text)
    url_count = metadata.get('url_count', count_urls(text))

    signals = [
        detect_profanity(normalized),
        detect_hate_speech(normalized),
        detect_threats(normalized),
        detect_sexual_harassment(normalized),
        detect_spam(normalized, url_count=url_count),
        detect_phishing(normalized),
        detect_self_harm(normalized),
    ]

    detected_signals = [s for s in signals if s.detected]
    overall_score = max((s.score for s in detected_signals), default=0.0)
    categories = [s.category for s in detected_signals]

    return DetectionResult(
        signals=signals,
        overall_score=overall_score,
        flagged=overall_score > 0.3,
        categories=categories,
    )
