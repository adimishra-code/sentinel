import pytest
from detection.engine import (
    run_detection,
    detect_profanity,
    detect_hate_speech,
    detect_threats,
    detect_sexual_harassment,
    detect_spam,
    detect_phishing,
    detect_self_harm,
    normalize_text,
)


class TestDetectionEngine:
    def test_normalize_text(self):
        assert normalize_text("  HELLO   WORLD  ") == "hello world"

    def test_clean_content_not_flagged(self):
        text = "Hello, this is a wonderful community. Thank you for your help!"
        result = run_detection(text)
        assert result.flagged is False
        assert len(result.categories) == 0
        assert result.overall_score == 0.0

    def test_detect_profanity(self):
        signal = detect_profanity("This is fucking bullshit")
        assert signal.detected is True
        assert signal.category == "toxicity"
        assert len(signal.evidence) >= 1

    def test_detect_hate_speech(self):
        signal = detect_hate_speech("You are a stupid faggot")
        assert signal.detected is True
        assert signal.category == "hate_speech"

    def test_detect_threats(self):
        signal = detect_threats("I will kill you if you come here")
        assert signal.detected is True
        assert signal.category == "threat_direct"

    def test_detect_sexual_harassment(self):
        signal = detect_sexual_harassment("Send nudes right now")
        assert signal.detected is True
        assert signal.category == "sexual_harassment"

    def test_detect_spam(self):
        signal = detect_spam("Buy now click here limited time offer free gift http://spam.com http://spam2.com", url_count=2)
        assert signal.detected is True
        assert signal.category == "spam"

    def test_detect_phishing(self):
        signal = detect_phishing("Verify your account now or your account will be suspended. Click here to confirm.")
        assert signal.detected is True
        assert signal.category == "phishing"

    def test_detect_self_harm(self):
        signal = detect_self_harm("I want to end my life, I want to kill myself")
        assert signal.detected is True
        assert signal.category == "self_harm"

    def test_multiple_categories(self):
        text = "I hate you, fuck you, I am going to kill you"
        result = run_detection(text)
        assert result.flagged is True
        assert "toxicity" in result.categories
        assert "threat_direct" in result.categories
