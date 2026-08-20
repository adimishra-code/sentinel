"""
Gemini AI Client
Wrapper for Google Gemini API with structured outputs
"""

import os
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

try:
    import google.generativeai as genai
except ImportError:
    genai = None

class GeminiClient:
    """
    Gemini AI client for content moderation
    Supports structured JSON outputs via function calling
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

    def analyze_content(
        self,
        content: str,
        context: Optional[Dict[str, Any]] = None,
        policy: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Analyze content with context and policy
        Returns structured moderation assessment
        """

        # Build prompt
        prompt_parts = []

        # System instructions
        system_prompt = """You are a content moderation AI assistant. Your role is to analyze content for potential policy violations, considering context, tone, intent, and relationships.

IMPORTANT:
- Be context-aware: sarcasm, quotes, reclaimed language may not be violations
- Consider relationships: friends joking vs strangers harassing
- Distinguish severity: mild profanity vs direct threats
- Flag uncertainty: if unsure, mark requiresHumanReview=true
- Provide evidence: cite specific phrases or patterns

Output a structured JSON assessment."""

        prompt_parts.append(system_prompt)

        # Policy context
        if policy:
            prompt_parts.append(f"\n\nORGANIZATION POLICY:\n{json.dumps(policy, indent=2)}")

        # Conversation context
        if conversation_history:
            prompt_parts.append("\n\nCONVERSATION HISTORY:")
            for msg in conversation_history[-5:]:  # Last 5 messages
                prompt_parts.append(f"- {msg.get('author', 'Unknown')}: {msg.get('text', '')}")

        # Additional context
        if context:
            prompt_parts.append(f"\n\nCONTEXT:\n{json.dumps(context, indent=2)}")

        # Content to analyze
        prompt_parts.append(f"\n\nCONTENT TO ANALYZE:\n{content}")

        # Request structured output
        prompt_parts.append("""

Analyze the content and respond with a JSON object matching this schema:
{
  "categories": [{"category": "toxicity|hate_speech|harassment|...", "score": 0.0-1.0, "confidence": 0.0-1.0, "evidence": ["phrase1", "phrase2"]}],
  "overallSeverity": 0.0-1.0,
  "overallConfidence": 0.0-1.0,
  "contextualFindings": "Brief analysis considering context, tone, intent",
  "targetedAt": "user_id or null",
  "recommendedAction": "allow|allow_and_monitor|warn|remove|escalate",
  "requiresHumanReview": boolean,
  "uncertainty": "Explain any uncertainty",
  "relevantPolicyIds": ["policy_clause_id"]
}""")

        full_prompt = "\n".join(prompt_parts)

        try:
            # Generate response
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,  # Low temperature for consistency
                    max_output_tokens=1024,
                )
            )

            # Parse JSON from response
            response_text = response.text.strip()

            # Extract JSON if wrapped in markdown
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])

            result = json.loads(response_text)

            return {
                'success': True,
                'analysis': result,
                'model': self.model_name,
                'timestamp': datetime.utcnow().isoformat()
            }

        except json.JSONDecodeError as e:
            return {
                'success': False,
                'error': f'Failed to parse JSON response: {str(e)}',
                'raw_response': response.text if 'response' in locals() else None
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Gemini API error: {str(e)}'
            }

    def batch_analyze(self, contents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze multiple pieces of content
        Returns list of analysis results
        """
        results = []
        for item in contents:
            result = self.analyze_content(
                content=item.get('content', ''),
                context=item.get('context'),
                policy=item.get('policy')
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
