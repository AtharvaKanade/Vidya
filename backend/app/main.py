"""FastAPI Application for Vidya: AI Tutor for Learning AI/ML.

Core Rule: BKT engine decides mastery state; LLM only explains.
"""

import json
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.app.bkt import DEFAULT_PARAMS, mastery_level, update as bkt_update
from backend.app.db import (
    create_session,
    get_all_mastery,
    get_mastery,
    get_recent_attempts,
    get_session,
    get_traces,
    init_db,
    record_attempt,
    set_mastery,
)
from backend.app.models import (
    AnswerRequest,
    AnswerResponse,
    ExplainRequest,
    ExplainResponse,
    MasteryConceptItem,
    MasteryResponse,
    NextConceptResponse,
    QuestionPayload,
    SelfRateRequest,
    SelfRateResponse,
    SessionStartRequest,
    SessionStartResponse,
    TraceResponse,
    TraceStepItem,
)
from backend.app.selector import check_uncertainty_rule, select_next_concept
from backend.app.trace import log_event
from backend.app.tutor import STYLES, explain as tutor_explain

# Load environment configuration
load_dotenv()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CONCEPT_GRAPH_FILE = DATA_DIR / "concept_graph.json"
QUESTION_BANK_FILE = DATA_DIR / "question_bank.json"


def load_concept_graph() -> Dict[str, Any]:
    """Load and parse curriculum concept graph."""
    if not CONCEPT_GRAPH_FILE.exists():
        return {"topics": [], "concepts": []}
    with open(CONCEPT_GRAPH_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_question_bank() -> List[Dict[str, Any]]:
    """Load and parse question bank."""
    if not QUESTION_BANK_FILE.exists():
        return []
    with open(QUESTION_BANK_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


CONCEPTS_DATA = load_concept_graph()
CONCEPTS_LIST: List[Dict[str, Any]] = CONCEPTS_DATA.get("concepts", [])
CONCEPTS_BY_ID: Dict[str, Dict[str, Any]] = {c["id"]: c for c in CONCEPTS_LIST}
TOPICS_LIST: List[Dict[str, Any]] = CONCEPTS_DATA.get("topics", [])
QUESTIONS_LIST: List[Dict[str, Any]] = load_question_bank()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    init_db()
    yield


app = FastAPI(
    title="Vidya AI Tutor API",
    description="Bayesian Knowledge Tracing (BKT) powered adaptive AI tutor engine.",
    version="0.2.0",
    lifespan=lifespan,
)

# Configure CORS
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "vidya-backend", "version": "0.2.0"}


@app.post(
    "/session/start",
    response_model=SessionStartResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Session"],
)
async def start_session(payload: Optional[SessionStartRequest] = None) -> SessionStartResponse:
    """Initialize a new anonymous learning session."""
    topic = payload.topic if payload else None
    if topic:
        valid_topics = {t["id"] for t in TOPICS_LIST}
        if topic not in valid_topics:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid topic '{topic}'. Must be one of: {sorted(valid_topics)}",
            )

    session_id = str(uuid.uuid4())
    created_at = create_session(session_id, topic=topic)

    # Initialize entry concepts in mastery table with p_init
    active_concepts = (
        [c for c in CONCEPTS_LIST if c.get("topic") == topic] if topic else CONCEPTS_LIST
    )
    for c in active_concepts:
        set_mastery(session_id, c["id"], DEFAULT_PARAMS.p_init)

    # Log initial trace
    log_event(
        session_id=session_id,
        action="session_start",
        payload={
            "topic": topic,
            "concepts_initialized": len(active_concepts),
            "p_init": DEFAULT_PARAMS.p_init,
        },
    )

    return SessionStartResponse(session_id=session_id, created_at=created_at, topic=topic)


@app.get(
    "/session/{session_id}/next",
    response_model=NextConceptResponse,
    tags=["Tutor"],
)
async def get_next_concept(session_id: str) -> NextConceptResponse:
    """Select the next optimal concept, difficulty level, and practice item."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    topic_filter = session.get("topic")
    mastery_map = get_all_mastery(session_id)

    # Use priority scoring selector module
    selected_concept, difficulty = select_next_concept(
        concepts=CONCEPTS_LIST,
        mastery_map=mastery_map,
        topic_filter=topic_filter,
        params=DEFAULT_PARAMS,
    )

    c_id = selected_concept["id"]
    current_p = mastery_map.get(c_id, DEFAULT_PARAMS.p_init)
    level = mastery_level(current_p)

    # Check uncertainty rule for Human Approval Line (Proof #3)
    recent_concept_attempts = get_recent_attempts(session_id, concept_id=c_id, limit=6)
    needs_self_rating = check_uncertainty_rule(recent_concept_attempts, current_p)

    # Question Selection: Filter question bank for this concept
    recent_attempts_all = get_recent_attempts(session_id, limit=200)
    answered_q_ids = {a["question_id"] for a in recent_attempts_all}

    concept_questions = [q for q in QUESTIONS_LIST if q.get("concept") == c_id]
    unanswered_q = [q for q in concept_questions if q["id"] not in answered_q_ids]

    # Try matching targeted difficulty first
    targeted_q = [q for q in unanswered_q if q.get("difficulty") == difficulty]
    selected_q_dict = None
    if targeted_q:
        selected_q_dict = targeted_q[0]
    elif unanswered_q:
        selected_q_dict = unanswered_q[0]
    elif concept_questions:
        selected_q_dict = concept_questions[0]

    question_payload = None
    if selected_q_dict:
        question_payload = QuestionPayload(
            id=selected_q_dict["id"],
            concept=selected_q_dict["concept"],
            difficulty=selected_q_dict.get("difficulty", difficulty),
            type=selected_q_dict.get("type", "mcq"),
            question=selected_q_dict["question"],
            options=selected_q_dict["options"],
            answer_index=selected_q_dict.get("answer_index", 0),
            explanation_hint=selected_q_dict.get("explanation_hint"),
        )

    log_event(
        session_id=session_id,
        action="next_concept_selected",
        payload={
            "concept_id": c_id,
            "concept_name": selected_concept["name"],
            "difficulty": difficulty,
            "p_known": round(current_p, 4),
            "needs_self_rating": needs_self_rating,
            "question_id": question_payload.id if question_payload else None,
        },
        flagged=needs_self_rating,
    )

    return NextConceptResponse(
        session_id=session_id,
        concept_id=c_id,
        concept_name=selected_concept["name"],
        topic=selected_concept["topic"],
        difficulty=difficulty,
        p_known=round(current_p, 4),
        mastery_level=level,
        needs_self_rating=needs_self_rating,
        importance=float(selected_concept.get("importance", 1.0)),
        question=question_payload,
    )


@app.post(
    "/session/{session_id}/answer",
    response_model=AnswerResponse,
    tags=["Tutor"],
)
async def submit_answer(session_id: str, answer: AnswerRequest) -> AnswerResponse:
    """Submit an answer, update BKT mastery state, and record audit trace."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    concept_id = answer.concept_id
    if concept_id not in CONCEPTS_BY_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown concept '{concept_id}'.",
        )

    # Get previous mastery or default
    p_before = get_mastery(session_id, concept_id)
    if p_before is None:
        p_before = DEFAULT_PARAMS.p_init

    # PURE BKT UPDATE (BKT decides mastery, LLM never touches this)
    p_after = bkt_update(p_before, correct=answer.correct, params=DEFAULT_PARAMS)
    level_after = mastery_level(p_after)

    # Update database
    set_mastery(session_id, concept_id, p_after)
    attempt_id = str(uuid.uuid4())
    record_attempt(
        attempt_id=attempt_id,
        session_id=session_id,
        concept_id=concept_id,
        question_id=answer.question_id,
        correct=answer.correct,
        latency_ms=answer.latency_ms,
    )

    # Check re-explain rule (after consecutive wrong attempts, rotate styles)
    recent = get_recent_attempts(session_id, concept_id=concept_id, limit=6)
    re_explain = False
    explanation_style = None

    if len(recent) >= 2 and all(not a["correct"] for a in recent[:2]):
        re_explain = True
        wrong_count = sum(1 for a in recent if not a["correct"])
        # Rotate explanation styles: analogy -> worked_example -> step_by_step
        style_cycle = ["analogy", "worked_example", "step_by_step"]
        style_idx = (wrong_count - 2) % len(style_cycle)
        explanation_style = style_cycle[style_idx]

    # Structured turn audit trace
    log_event(
        session_id=session_id,
        action="answer_attempt",
        payload={
            "concept_id": concept_id,
            "question_id": answer.question_id,
            "correct": answer.correct,
            "latency_ms": answer.latency_ms,
            "p_known_before": round(p_before, 4),
            "p_known_after": round(p_after, 4),
            "mastery_level": level_after,
            "re_explain": re_explain,
            "explanation_style": explanation_style,
        },
        flagged=(not answer.correct and re_explain),
    )

    return AnswerResponse(
        session_id=session_id,
        concept_id=concept_id,
        correct=answer.correct,
        p_known_before=round(p_before, 4),
        p_known_after=round(p_after, 4),
        mastery_level=level_after,
        re_explain=re_explain,
        explanation_style=explanation_style,
    )


@app.post(
    "/session/{session_id}/explain",
    response_model=ExplainResponse,
    tags=["Tutor"],
)
async def generate_explanation(session_id: str, req: ExplainRequest) -> ExplainResponse:
    """Generate or retrieve an adaptive LLM explanation for a concept."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    concept_dict = CONCEPTS_BY_ID.get(req.concept_id)
    if not concept_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown concept '{req.concept_id}'.",
        )

    p_known = get_mastery(session_id, req.concept_id)
    if p_known is None:
        p_known = DEFAULT_PARAMS.p_init

    # Resolve question details if question_id is provided
    question_text = req.question_text
    options = req.options
    correct_answer = req.correct_answer
    explanation_hint = req.explanation_hint
    user_answer = req.user_answer
    is_correct = req.is_correct

    if req.question_id:
        matching_q = next((q for q in QUESTIONS_LIST if q.get("id") == req.question_id), None)
        if matching_q:
            question_text = question_text or matching_q.get("question")
            options = options or matching_q.get("options")
            explanation_hint = explanation_hint or matching_q.get("explanation_hint")
            if not correct_answer and "answer_index" in matching_q and matching_q.get("options"):
                idx = matching_q["answer_index"]
                if 0 <= idx < len(matching_q["options"]):
                    correct_answer = matching_q["options"][idx]

    style = req.style if req.style in STYLES else "default"
    explanation_text, from_cache, is_fallback = tutor_explain(
        concept_name=concept_dict["name"],
        concept_id=req.concept_id,
        p_known=p_known,
        question_id=req.question_id,
        question_text=question_text,
        options=options,
        user_answer=user_answer,
        correct_answer=correct_answer,
        is_correct=is_correct,
        explanation_hint=explanation_hint,
        style=style,
        concept_desc=concept_dict.get("description"),
    )

    log_event(
        session_id=session_id,
        action="explanation_generated",
        payload={
            "concept_id": req.concept_id,
            "question_id": req.question_id,
            "style": style,
            "from_cache": from_cache,
            "is_fallback": is_fallback,
            "p_known": round(p_known, 4),
        },
    )

    return ExplainResponse(
        session_id=session_id,
        concept_id=req.concept_id,
        concept_name=concept_dict["name"],
        question_id=req.question_id,
        style=style,
        explanation=explanation_text,
        from_cache=from_cache,
        is_fallback=is_fallback,
    )


@app.post(
    "/session/{session_id}/self-rate",
    response_model=SelfRateResponse,
    tags=["Tutor"],
)
async def submit_self_rating(session_id: str, req: SelfRateRequest) -> SelfRateResponse:
    """Submit learner self-rating and blend into Bayesian knowledge model (Human Approval Line)."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    if req.concept_id not in CONCEPTS_BY_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown concept '{req.concept_id}'.",
        )

    p_before = get_mastery(session_id, req.concept_id)
    if p_before is None:
        p_before = DEFAULT_PARAMS.p_init

    # Normalise rating (1..5) to [0.0..1.0]
    rating_norm = (req.rating - 1.0) / 4.0
    # Blend: 70% BKT posterior + 30% human self-rating (MVP §4.2)
    p_after = round(0.70 * p_before + 0.30 * rating_norm, 4)
    # Clamp safely
    p_after = max(0.0, min(1.0, p_after))
    level_after = mastery_level(p_after)

    set_mastery(session_id, req.concept_id, p_after)

    log_event(
        session_id=session_id,
        action="self_rating_blended",
        payload={
            "concept_id": req.concept_id,
            "rating": req.rating,
            "rating_norm": rating_norm,
            "p_known_before": round(p_before, 4),
            "p_known_after": round(p_after, 4),
            "mastery_level": level_after,
        },
        flagged=True,
    )

    return SelfRateResponse(
        session_id=session_id,
        concept_id=req.concept_id,
        rating=req.rating,
        p_known_before=round(p_before, 4),
        p_known_after=round(p_after, 4),
        mastery_level=level_after,
        flagged=True,
    )


@app.get(
    "/session/{session_id}/mastery",
    response_model=MasteryResponse,
    tags=["Mastery"],
)
async def get_session_mastery(session_id: str) -> MasteryResponse:
    """Retrieve full curriculum mastery state for the session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    topic_filter = session.get("topic")
    mastery_map = get_all_mastery(session_id)

    concepts_to_report = (
        [c for c in CONCEPTS_LIST if c.get("topic") == topic_filter]
        if topic_filter
        else CONCEPTS_LIST
    )

    items: List[MasteryConceptItem] = []
    for c in concepts_to_report:
        c_id = c["id"]
        p_val = mastery_map.get(c_id, DEFAULT_PARAMS.p_init)
        items.append(
            MasteryConceptItem(
                id=c_id,
                name=c["name"],
                topic=c["topic"],
                p_known=round(p_val, 4),
                level=mastery_level(p_val),
            )
        )

    return MasteryResponse(
        session_id=session_id,
        topic=topic_filter,
        concepts=items,
    )


@app.get(
    "/session/{session_id}/trace",
    response_model=TraceResponse,
    tags=["Audit"],
)
async def get_session_traces(session_id: str) -> TraceResponse:
    """Retrieve structured audit traces for a session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    trace_records = get_traces(session_id)
    steps = [
        TraceStepItem(step=r["step"], payload=r["payload"], ts=r["ts"])
        for r in trace_records
    ]
    return TraceResponse(session_id=session_id, steps=steps)
