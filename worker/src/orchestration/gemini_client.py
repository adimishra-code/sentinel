"""
Gemini AI Client
Enterprise wrapper for Google Gemini API with structured outputs, retries, and calibration
"""

import os
import re
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime

try:
    import google.generativeai as genai
except ImportError:
    genai = None

class GeminiClient:
    """
    Gemini AI client for content moderation
    Supports structured JSON outputs, retries with exponential backoff, and safety fallbacks
    """

    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.model_name = os.getenv('MODEL_NAME', 'gemini-2.0-flash-exp')

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable required")

        if genai is None:
            raise ImportError("google-generativeai package not installed. Run: pip install google-generativeai")

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract and parse JSON safely from text, handling markdown fences or surrounding chatter"""
        text = text.strip()

        # Handle ```json ... ``` code blocks
        if "```" in text:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
            if match:
                text = match.group(1).strip()

        # Attempt direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Search for first outer curly brace pair { ... }
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))

        raise ValueError(f"Could not locate valid JSON structure in response: {text[:200]}")

    def _validate_and_calibrate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure standard keys exist and enforce human review on low confidence"""
        if not isinstance(data.get('categories'), list):
            data['categories'] = []

        overall_severity = float(data.get('overallSeverity', 0.0))
        overall_confidence = float(data.get('overallConfidence', 0.8))
        requires_review = bool(data.get('requiresHumanReview', False))
        recommended_action = str(data.get('recommendedAction', 'allow'))

        # Safety policy: low confidence predictions automatically route to human review
        if overall_confidence < 0.6 and overall_severity > 0.3:
            requires_review = True
            data['uncertainty'] = (data.get('uncertainty') or '') + ' [Auto-flagged: low AI confidence < 0.6]'

        # Safety policy: severe violations (>= 0.85) require human review or auto-quarantine
        if overall_severity >= 0.85:
            requires_review = True

        data['overallSeverity'] = min(max(overall_severity, 0.0), 1.0)
        data['overallConfidence'] = min(max(overall_confidence, 0.0), 1.0)
        data['requiresHumanReview'] = requires_review
        data['recommendedAction'] = recommended_action

        return data

    def analyze_content(
        self,
        content: str,
        context: Optional[Dict[str, Any]] = None,
        policy: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """
        Analyze content with context and policy, backed by exponential retry backoff
        """
        prompt_parts = []

        system_prompt = """You are Sentinel's enterprise content moderation intelligence engine.
Analyze content objectively for policy violations, taking into account context, subtext, sarcasm, and relationships.

CRITICAL RULES:
- Distinguish between hostile aggression and reclaimed/benign language or colloquial banter.
- Identify protected-class harassment, hate speech, severe threats, child exploitation, and self-harm immediately.
- If ambiguous or borderline, mark requiresHumanReview=true and set confidence accordingly.
- Always output valid JSON strictly conforming to the requested schema."""

        prompt_parts.append(system_prompt)

        if policy:
            prompt_parts.append(f"\n\nORGANIZATION POLICY SPECIFICATION:\n{json.dumps(policy, indent=2)}")

        if conversation_history:
            prompt_parts.append("\n\nRECENT CONVERSATION HISTORY:")
            for msg in conversation_history[-5:]:
                prompt_parts.append(f"- {msg.get('author', 'User')}: {msg.get('text', '')}")

        if context:
            prompt_parts.append(f"\n\nUSER & CONTEXT METADATA:\n{json.dumps(context, indent=2)}")

        prompt_parts.append(f"\n\nTARGET CONTENT TO AUDIT:\n\"\"\"{content}\"\"\"")

        prompt_parts.append("""
Provide a JSON response matching this schema:
{
  "categories": [
    {
      "category": "toxicity|hate_speech|threat_direct|sexual_harassment|spam|phishing|self_harm",
      "score": 0.0 to 1.0,
      "confidence": 0.0 to 1.0,
      "evidence": ["exact phrase 1", "exact phrase 2"]
    }
  ],
  "overallSeverity": 0.0 to 1.0,
  "overallConfidence": 0.0 to 1.0,
  "contextualFindings": "Concise rationale explaining tone, context, and intent",
  "targetedAt": "user_id or null",
  "recommendedAction": "allow|allow_and_monitor|warn|limit|remove|escalate|suspend",
  "requiresHumanReview": true or false,
  "uncertainty": "Explanation of any ambiguity"
}""")

        full_prompt = "\n".join(prompt_parts)

        last_error = None
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=1024,
                    )
                )

                parsed_json = self._extract_json(response.text)
                calibrated = self._validate_and_calibrate(parsed_json)

                return {
                    'success': True,
                    'analysis': calibrated,
                    'model': self.model_name,
                    'timestamp': datetime.utcnow().isoformat(),
                    'retries': attempt,
                }

            except Exception as e:
                last_error = e
                # Exponential backoff on rate limits or transient errors
                if attempt < max_retries - 1:
                    sleep_time = (2 ** attempt) * 0.5
                    time.sleep(sleep_time)

        return {
            'success': False,
            'error': f'Gemini analysis failed after {max_retries} attempts: {str(last_error)}',
            'fallback_to_heuristic': True,
        }

    def batch_analyze(self, contents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for item in contents:
            result = self.analyze_content(
                content=item.get('content', ''),
                context=item.get('context'),
                policy=item.get('policy'),
                conversation_history=item.get('conversation_history'),
            )
            results.append(result)
        return results


# Singleton instance
_client: Optional[GeminiClient] = None

def get_gemini_client() -> GeminiClient:
    """Get or create Gemini client singleton"""
    global _client
    if _client is None:
        _client = GeminiClient()
    return _client
