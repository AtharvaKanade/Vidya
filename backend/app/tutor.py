"""LLM Tutor module for Vidya.

Provides adaptive explanations, multi-style re-explanations, and fallbacks.
Core Principle: The BKT engine decides mastery; the LLM only explains.
"""

import hashlib
import os
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

load_dotenv()

# Style constants
STYLES = ["default", "analogy", "worked_example", "step_by_step"]

# Fallback explanations per style if LLM fails or API key is not configured
FALLBACKS = {
    "default": (
        "This is a fundamental concept in AI/ML. Review how inputs are transformed "
        "step-by-step through the model, and focus on why this operation is essential "
        "for learning patterns from data."
    ),
    "analogy": (
        "Think of this like a factory assembly line: raw materials (inputs) undergo "
        "specific standardized transformations (operations) at each station to produce "
        "a refined final product (prediction)."
    ),
    "worked_example": (
        "Step-by-step walkthrough: 1) Start with raw vector inputs [x1, x2]. "
        "2) Apply learned weight scaling and bias offset. 3) Pass through a non-linear gate "
        "to determine if the feature activates."
    ),
    "step_by_step": (
        "Breaking it down:\n"
        "1. Input stage: Receiving features or tokens.\n"
        "2. Transformation stage: Calculating weighted interactions.\n"
        "3. Activation stage: Mapping values to bounded output space."
    ),
}

# In-memory explanation cache: hash_key -> explanation text
_EXPLANATION_CACHE: Dict[str, str] = {}


def _get_cache_key(concept_id: str, p_known: float, style: str) -> str:
    """Generate deterministic cache key bucketed by mastery range."""
    # Bucket p_known into 3 buckets (0.0-0.4, 0.4-0.7, 0.7-1.0) for cache efficiency
    bucket = "low" if p_known < 0.4 else ("mid" if p_known < 0.7 else "high")
    raw = f"{concept_id}:{bucket}:{style}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def get_client() -> Optional[Any]:
    """Safely obtain google-genai Client instance if API key is present."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your-"):
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception:
        return None


def explain(
    concept_name: str,
    concept_id: str,
    p_known: float,
    wrong_answers: Optional[List[str]] = None,
    style: str = "default",
    concept_desc: Optional[str] = None,
) -> Tuple[str, bool, bool]:
    """Generate or retrieve a concise pedagogical explanation.

    Args:
        concept_name: Human readable name of the concept.
        concept_id: Unique concept ID.
        p_known: Current BKT mastery probability.
        wrong_answers: List of recent incorrect question IDs or notes.
        style: One of 'default', 'analogy', 'worked_example', 'step_by_step'.
        concept_desc: Optional description from curriculum DAG.

    Returns:
        Tuple of (explanation_text, from_cache, is_fallback).
    """
    if style not in STYLES:
        style = "default"

    cache_key = _get_cache_key(concept_id, p_known, style)
    if cache_key in _EXPLANATION_CACHE:
        return _EXPLANATION_CACHE[cache_key], True, False

    level_desc = (
        "beginner (needs clear intuition and minimal jargon)"
        if p_known < 0.4
        else ("intermediate (understands basics, needs precision)" if p_known < 0.7 else "advanced")
    )

    style_instructions = {
        "default": "Provide a clear, intuitive 2-3 sentence conceptual explanation.",
        "analogy": "Explain using a vivid, memorable real-world analogy to build intuition.",
        "worked_example": "Provide a clear worked miniature example with sample numbers or step outputs.",
        "step_by_step": "Explain strictly as 3 numbered logical steps.",
    }.get(style, "Provide a clear, intuitive 2-3 sentence conceptual explanation.")

    context_hint = f"Context summary: {concept_desc}" if concept_desc else ""
    wrong_context = (
        f"The student recently struggled with: {', '.join(wrong_answers[-2:])}."
        if wrong_answers
        else ""
    )

    prompt = f"""You are Vidya, an expert AI tutor teaching '{concept_name}' in machine learning.
Target audience: {level_desc}.
{context_hint}
{wrong_context}

Instruction: {style_instructions}
Constraints:
- Strictly under 100 words.
- Engaging, encouraging, and pedagogically precise.
- Do NOT output markdown headers, just the explanation text.
"""

    client = get_client()
    if client is not None:
        try:
            from google.genai import types

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=180,
                    temperature=0.3,
                ),
            )
            text = (response.text or "").strip()
            if text:
                _EXPLANATION_CACHE[cache_key] = text
                return text, False, False
        except Exception:
            # Fall through to fallback
            pass

    # High quality fallback text customized with concept name
    fallback_base = FALLBACKS.get(style, FALLBACKS["default"])
    if concept_desc:
        custom_fallback = f"{concept_name}: {concept_desc}. {fallback_base}"
    else:
        custom_fallback = f"{concept_name}: {fallback_base}"

    _EXPLANATION_CACHE[cache_key] = custom_fallback
    return custom_fallback, False, True
