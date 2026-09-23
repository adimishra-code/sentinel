"""
Evaluation benchmark runner
Tests detection engine accuracy against labeled examples
"""

from typing import List, Dict, Any
from detection.engine import run_detection


# Small labeled test set for smoke-testing
BENCHMARK_CASES = [
    {
        "text": "I'm going to kill you, you piece of garbage",
        "expected_categories": ["threat_direct"],
        "expected_flagged": True,
    },
    {
        "text": "Check out this amazing deal! Click here to earn $500/day from home!",
        "expected_categories": ["spam"],
        "expected_flagged": True,
    },
    {
        "text": "The weather today is sunny and warm, great day for a walk!",
        "expected_categories": [],
        "expected_flagged": False,
    },
    {
        "text": "Verify your account immediately or it will be suspended. Click here.",
        "expected_categories": ["phishing"],
        "expected_flagged": True,
    },
]


def run_benchmark() -> Dict[str, Any]:
    """
    Run detection engine against labeled benchmark cases.
    Returns accuracy metrics.
    """
    results = []
    correct = 0
    total = len(BENCHMARK_CASES)

    for case in BENCHMARK_CASES:
        detection = run_detection(case["text"])
        
        expected_flagged = case["expected_flagged"]
        actual_flagged = detection.flagged
        flag_correct = expected_flagged == actual_flagged
        
        expected_cats = set(case["expected_categories"])
        actual_cats = set(detection.categories)
        cat_overlap = len(expected_cats & actual_cats)
        cat_correct = cat_overlap > 0 or (not expected_cats and not actual_cats)
        
        is_correct = flag_correct and cat_correct
        if is_correct:
            correct += 1

        results.append({
            "text_preview": case["text"][:50] + "..." if len(case["text"]) > 50 else case["text"],
            "expected_flagged": expected_flagged,
            "actual_flagged": actual_flagged,
            "expected_categories": list(expected_cats),
            "actual_categories": list(actual_cats),
            "correct": is_correct,
        })

    accuracy = correct / total if total > 0 else 0.0

    return {
        "total_cases": total,
        "correct": correct,
        "accuracy": round(accuracy, 4),
        "results": results,
    }
