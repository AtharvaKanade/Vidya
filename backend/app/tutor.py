"""LLM Tutor module for Vidya.

Provides elaborate question-specific explanations, dynamic adaptive question generation,
multi-style re-explanations, and fail-safe fallbacks.
Core Principle: The BKT engine decides mastery; the LLM only explains and scaffolds.
"""

import hashlib
import json
import os
import uuid
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


def _get_models_to_try() -> List[str]:
    """Return prioritized list of Gemini models to use for generation."""
    env_model = os.getenv("GEMINI_MODEL")
    defaults = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-pro-preview", "gemini-2.5-flash-lite"]
    if env_model:
        return [env_model] + [m for m in defaults if m != env_model]
    return defaults


def generate_adaptive_question(
    concept_name: str,
    concept_id: str,
    difficulty: int,
    p_known: float,
    topic_name: Optional[str] = None,
    concept_desc: Optional[str] = None,
    recent_attempts: Optional[List[Dict[str, Any]]] = None,
    previous_questions: Optional[List[str]] = None,
    last_wrong_question: Optional[str] = None,
    last_user_answer: Optional[str] = None,
    last_correct_answer: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Generate a real-time, adaptive MCQ problem tailored to the student's mastery level.

    Adaptive Learning Dynamics:
    - If student answered INCORRECTLY: Generates a simpler, more basic foundational question
      (scaffolded) targeting the core intuition so the student learns the basics before advancing.
    - If student answered CORRECTLY: Increases question depth (Difficulty 2/3) building on prior success.
    - Never repeats the exact same question.
    """
    client = get_client()

    # Check if student made an error recently
    has_recent_error = False
    if recent_attempts and len(recent_attempts) > 0:
        if not recent_attempts[0].get("correct", True):
            has_recent_error = True

    if has_recent_error or last_wrong_question:
        wrong_info = f"Previous Question: \"{last_wrong_question}\"\n" if last_wrong_question else ""
        if last_user_answer:
            wrong_info += f"Student chose: \"{last_user_answer}\"\n"
        if last_correct_answer:
            wrong_info += f"Correct answer was: \"{last_correct_answer}\"\n"

        pedagogical_mode = (
            "STUDENT STRUGGLED / INCORRECT ANSWER (FOUNDATIONAL SCAFFOLDING MODE):\n"
            f"{wrong_info}"
            "CRITICAL INSTRUCTIONS:\n"
            "1. DO NOT repeat, rephrase, or ask the previous question.\n"
            "2. Generate a MUCH SIMPLER, BASIC (Level 1 / Foundational) question that isolates "
            f"the single most fundamental definition, intuition, or core rule of '{concept_name}'.\n"
            "3. The goal is to let the student easily grasp and test the basic concept so they gain "
            "confidence before moving to intermediate or advanced problems.\n"
            "4. Keep the question straightforward with 4 clear, unambiguous options."
        )
        effective_diff = 1
    elif p_known >= 0.70:
        pedagogical_mode = (
            "STUDENT EXCELLING (ADVANCED MODE):\n"
            f"The student has shown strong mastery ({round(p_known, 2)}). Generate a nuanced Level 3 question testing "
            f"architectural trade-offs, edge cases, or multi-step reasoning in '{concept_name}'."
        )
        effective_diff = 3
    elif p_known >= 0.40:
        pedagogical_mode = (
            "STUDENT PROGRESSING (INTERMEDIATE MODE):\n"
            f"The student understands the basics ({round(p_known, 2)}). Generate an applied Level 2 question testing "
            f"practical mathematical operations, dimensions, or standard usage of '{concept_name}'."
        )
        effective_diff = 2
    else:
        pedagogical_mode = (
            "STUDENT STARTING (FOUNDATIONAL INTUITION MODE):\n"
            f"Generate a clear, confidence-building Level 1 question testing the basic definition and core intuition of '{concept_name}'."
        )
        effective_diff = 1

    prev_context = ""
    if previous_questions and len(previous_questions) > 0:
        prev_context = (
            "CRITICAL CONSTRAINT: Do NOT repeat or duplicate any of these previously asked questions in this session:\n"
            + "\n".join(f"- {q}" for q in previous_questions[-10:])
        )

    prompt = f"""You are Vidya, an adaptive AI tutor creating an individualized practice question for learning AI/ML.

Curriculum Topic: {topic_name or 'Machine Learning Foundations'}
Target Concept: {concept_name}
Concept Summary: {concept_desc or ''}
Current Mastery Probability: {round(p_known, 2)}

### Pedagogical Goal:
{pedagogical_mode}

{prev_context}

### Question Requirements:
1. Provide a completely fresh, engaging problem statement.
2. Provide exactly 4 distinct options (A, B, C, D) with exactly ONE unambiguously correct answer.
3. Distractors must represent plausible student misconceptions without being tricky or ambiguous.
4. Keep the wording clear, concise, and direct.
5. Provide a 1-sentence 'explanation_hint' stating the key takeaway.

Respond strictly in JSON format with this exact schema:
{{
  "question": "Clear problem statement",
  "options": [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4"
  ],
  "answer_index": 0,
  "explanation_hint": "Key pedagogical takeaway"
}}
"""

    if client is not None:
        from google.genai import types

        for model_name in _get_models_to_try():
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.35,
                        max_output_tokens=600,
                    ),
                )
                raw_text = (response.text or "").strip()
                data = json.loads(raw_text)

                if "question" in data and "options" in data and len(data["options"]) == 4 and "answer_index" in data:
                    # Check that question is not an exact duplicate
                    q_text = data["question"].strip()
                    if previous_questions and any(q_text.lower() == prev.lower() for prev in previous_questions):
                        continue

                    return {
                        "id": f"gen_{concept_id}_{uuid.uuid4().hex[:8]}",
                        "concept": concept_id,
                        "difficulty": effective_diff,
                        "type": "mcq",
                        "question": q_text,
                        "options": data["options"],
                        "answer_index": int(data["answer_index"]),
                        "explanation_hint": data.get("explanation_hint", f"Core takeaway for {concept_name}"),
                        "generated": True,
                    }
            except Exception:
                continue

    # Dynamic Fallback Synthesis (when Gemini is offline or fails)
    # Generates diverse, distinct scaffolded questions so questions never repeat
    prev_set = set(previous_questions or [])
    fallback_templates = [
        {
            "question": f"At its most fundamental level, what is the primary role of '{concept_name}' in AI systems?",
            "options": [
                f"It provides structured representation and computation for {concept_name}.",
                f"It randomly drops parameters to decrease model size.",
                f"It removes non-linearity to enforce strictly constant outputs.",
                f"It is only used during offline data collection."
            ],
            "answer_index": 0,
            "explanation_hint": f"{concept_name} provides the foundational mechanism needed for modern AI models to process representations."
        },
        {
            "question": f"Which of the following best describes the core intuition behind '{concept_name}'?",
            "options": [
                f"{concept_desc or 'It is a fundamental operational building block in machine learning.'}",
                "It guarantees zero loss on any dataset without training.",
                "It bypasses tensor operations entirely.",
                "It is a deprecated technique not used in modern deep learning."
            ],
            "answer_index": 0,
            "explanation_hint": f"Reviewing the basic definition: {concept_desc or concept_name}."
        },
        {
            "question": f"When implementing '{concept_name}', what basic input-output relationship is expected?",
            "options": [
                "Inputs are systematically transformed according to mathematical rules to produce task-relevant features.",
                "Inputs must always be 1-dimensional binary values.",
                "Outputs are unconstrained random values.",
                "No transformation occurs; data is passed unmodified."
            ],
            "answer_index": 0,
            "explanation_hint": f"Operations in {concept_name} map inputs into useful feature spaces."
        },
        {
            "question": f"Why do machine learning practitioners rely on '{concept_name}' when designing models?",
            "options": [
                f"It provides mathematical rigor and predictable transformations for learning {concept_name}.",
                "It eliminates the need for gradient descent and loss functions.",
                "It prevents models from having more than a single parameter.",
                "It is only required for legacy CPU systems."
            ],
            "answer_index": 0,
            "explanation_hint": f"{concept_name} ensures predictable, mathematically stable representations."
        },
        {
            "question": f"Which statement is TRUE regarding the foundational properties of '{concept_name}'?",
            "options": [
                f"Understanding {concept_name} provides the basis for understanding more complex deep learning layers.",
                "It is strictly an empirical rule of thumb with no theoretical justification.",
                "It only applies to unsupervised clustering.",
                "It requires all matrices to be non-invertible."
            ],
            "answer_index": 0,
            "explanation_hint": f"{concept_name} forms the building block for modern deep learning architectures."
        }
    ]

    # Select template not previously used in this session
    chosen = None
    for tmpl in fallback_templates:
        if tmpl["question"] not in prev_set:
            chosen = tmpl
            break
    if not chosen:
        chosen = fallback_templates[len(prev_set) % len(fallback_templates)]

    return {
        "id": f"gen_scaffold_{concept_id}_{uuid.uuid4().hex[:6]}",
        "concept": concept_id,
        "difficulty": 1,
        "type": "mcq",
        "question": chosen["question"],
        "options": chosen["options"],
        "answer_index": chosen["answer_index"],
        "explanation_hint": chosen["explanation_hint"],
        "generated": True,
    }


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
        from google.genai import types

        for model_name in _get_models_to_try():
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=600,
                        temperature=0.35,
                    ),
                )
                text = (response.text or "").strip()
                if text:
                    _EXPLANATION_CACHE[cache_key] = text
                    return text, False, False
            except Exception:
                continue

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
