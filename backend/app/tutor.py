"""LLM Tutor module for Vidya.

Provides elaborate question-specific explanations, multi-style re-explanations, and fallbacks.
Core Principle: The BKT engine decides mastery; the LLM only explains.
"""

import hashlib
import os
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

load_dotenv()

# Style constants
STYLES = ["default", "analogy", "worked_example", "step_by_step"]

# In-memory explanation cache: hash_key -> explanation text
_EXPLANATION_CACHE: Dict[str, str] = {}


def _get_cache_key(
    concept_id: str,
    question_id: Optional[str],
    question_text: Optional[str],
    style: str,
    user_answer: Optional[str],
) -> str:
    """Generate deterministic cache key based on the specific question and style."""
    q_key = question_id or (question_text[:50] if question_text else "general")
    ans_key = user_answer[:30] if user_answer else "none"
    raw = f"{concept_id}:{q_key}:{style}:{ans_key}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def get_client() -> Optional[Any]:
    """Safely obtain google-genai Client instance if API key is present."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your-") or api_key == "your_gemini_api_key_here":
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
    question_id: Optional[str] = None,
    question_text: Optional[str] = None,
    options: Optional[List[str]] = None,
    user_answer: Optional[str] = None,
    correct_answer: Optional[str] = None,
    is_correct: Optional[bool] = None,
    explanation_hint: Optional[str] = None,
    style: str = "default",
    concept_desc: Optional[str] = None,
) -> Tuple[str, bool, bool]:
    """Generate an elaborate, question-specific pedagogical explanation without repeating the question."""
    if style not in STYLES:
        style = "default"

    cache_key = _get_cache_key(concept_id, question_id, question_text, style, user_answer)
    if cache_key in _EXPLANATION_CACHE:
        return _EXPLANATION_CACHE[cache_key], True, False

    level_desc = (
        "beginner (needs clear intuition, concrete terms, and minimal jargon)"
        if p_known < 0.4
        else ("intermediate (understands fundamentals, needs rigorous clarity)" if p_known < 0.7 else "advanced")
    )

    style_instructions = {
        "default": (
            "Provide a thorough, comprehensive conceptual breakdown. Explain why the correct "
            "choice works mathematically or architecturally."
        ),
        "analogy": (
            "Explain the mechanism using a clear, memorable real-world analogy to make "
            "the behavior immediately intuitive."
        ),
        "worked_example": (
            "Provide a clear miniature worked walkthrough showing exact input values or tensor dimensions "
            "being transformed step by step to reach the correct answer."
        ),
        "step_by_step": (
            "Break down the answer into numbered logical steps (1., 2., 3.) with each step on its own line."
        ),
    }.get(style, "Provide a thorough conceptual breakdown.")

    # Format options for prompt
    options_str = ""
    if options:
        options_str = "\n".join(f"- {opt}" for opt in options)

    prompt = f"""You are Vidya, an expert AI tutor in machine learning and deep learning.
A student just answered a practice question about "{concept_name}".

### Context:
- Target Learner Level: {level_desc}
- Concept: {concept_name} ({concept_desc or ''})
- Question Asked: "{question_text or 'Why is ' + concept_name + ' important?'}"
{f"- Available Options:\n{options_str}" if options_str else ""}
{f"- Correct Answer: {correct_answer}" if correct_answer else ""}
{f"- Student's Chosen Option: {user_answer} ({'Correct' if is_correct else 'Incorrect'})" if user_answer else ""}
{f"- Key Insight / Hint: {explanation_hint}" if explanation_hint else ""}

### Instructions:
- {style_instructions}
- CRITICAL: Do NOT repeat the question text at the start. Begin directly with the core explanation.
- State clearly why **{correct_answer}** is the correct answer.
{f"- Clarify why choosing '{user_answer}' was a misconception and how to avoid it." if (user_answer and is_correct is False) else ""}
- Structure your response cleanly using bold titles, paragraphs, and numbered step lines where appropriate.
"""

    client = get_client()
    if client is not None:
        try:
            from google.genai import types

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=450,
                    temperature=0.35,
                ),
            )
            text = (response.text or "").strip()
            if text:
                _EXPLANATION_CACHE[cache_key] = text
                return text, False, False
        except Exception:
            # Fall through to question-tailored fallback
            pass

    # Question-specific structured fallback (NO repeating the question)
    fallback_parts = []

    # 1. Correct Answer & Mechanism
    if correct_answer:
        fallback_parts.append(f"**Why '{correct_answer}' is correct:**")
    
    if explanation_hint:
        fallback_parts.append(explanation_hint)
    elif concept_desc:
        fallback_parts.append(concept_desc)

    # 2. Style-specific elaboration on separate lines
    if style == "analogy":
        fallback_parts.append(
            f"**Real-World Analogy:**\n"
            f"Think of {concept_name} like an assembly line with strict dimensional slots: "
            "each incoming part must match the shape and capacity of the station, ensuring every batch flows without bottleneck."
        )
    elif style == "worked_example":
        fallback_parts.append(
            "**Worked Walkthrough:**\n"
            "1. Start with the incoming batch of inputs and their dimensions.\n"
            "2. Apply the matrix operation or transformation rule.\n"
            f"3. Verify that the output precisely satisfies the required target shape or condition: **{correct_answer or 'valid output'}**."
        )
    elif style == "step_by_step":
        fallback_parts.append(
            "**Step-by-Step Breakdown:**\n"
            "1. **Input State:** Examine the initial input features or dimensions.\n"
            f"2. **Transformation:** The operation applies {concept_name} to preserve consistency across the batch.\n"
            f"3. **Conclusion:** This yields **{correct_answer or explanation_hint}** as the required result."
        )
    else:
        fallback_parts.append(
            f"**Key Takeaway:**\n"
            f"In neural network architectures, {concept_name} is essential because it guarantees mathematical consistency and enables layers to propagate information accurately."
        )

    custom_fallback = "\n\n".join(fallback_parts)
    _EXPLANATION_CACHE[cache_key] = custom_fallback
    return custom_fallback, False, True
