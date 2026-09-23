import pytest
from detection.engine import run_detection
from policy.evaluator import evaluate_policy, risk_score_to_severity
from shared.models import ModerationAction


class TestPolicyEvaluator:
    def test_severity_bands(self):
        assert risk_score_to_severity(0.95) == "critical"
        assert risk_score_to_severity(0.70) == "high"
        assert risk_score_to_severity(0.50) == "medium"
        assert risk_score_to_severity(0.20) == "low"

    def test_clean_content_allows(self):
        detection = run_detection("This is a clean and helpful comment.")
        decision = evaluate_policy(detection)
        assert decision["decision"] == "allow"
        assert decision["requires_human_review"] is False
        assert decision["severity"] == "low"

    def test_threat_direct_escalates_and_requires_review(self):
        detection = run_detection("I am going to murder you tomorrow")
        decision = evaluate_policy(detection)
        assert decision["decision"] in ["escalate", "remove"]
        assert "threat_direct" in decision["categories"]
