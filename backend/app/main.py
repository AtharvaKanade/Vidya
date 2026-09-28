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
    append_trace,
    create_session,
    get_all_mastery,
    get_mastery,
    get_next_trace_step,
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
    MasteryConceptItem,
    MasteryResponse,
    NextConceptResponse,
    QuestionPayload,
    SessionStartRequest,
    SessionStartResponse,
    TraceResponse,
    TraceStepItem,
)

# Load environment configuration
load_dotenv()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CONCEPT_GRAPH_FILE = DATA_DIR / "concept_graph.json"


def load_concept_graph() -> Dict[str, Any]:
    """Load and parse curriculum concept graph."""
    if not CONCEPT_GRAPH_FILE.exists():
        return {"topics": [], "concepts": []}
    with open(CONCEPT_GRAPH_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


CONCEPTS_DATA = load_concept_graph()
CONCEPTS_LIST: List[Dict[str, Any]] = CONCEPTS_DATA.get("concepts", [])
CONCEPTS_BY_ID: Dict[str, Dict[str, Any]] = {c["id"]: c for c in CONCEPTS_LIST}
TOPICS_LIST: List[Dict[str, Any]] = CONCEPTS_DATA.get("topics", [])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    init_db()
    yield


app = FastAPI(
    title="Vidya AI Tutor API",
    description="Bayesian Knowledge Tracing (BKT) powered adaptive AI tutor engine.",
    version="0.1.0",
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
    return {"status": "healthy", "service": "vidya-backend"}


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
    append_trace(
        trace_id=str(uuid.uuid4()),
        session_id=session_id,
        step=1,
        payload={
            "action": "session_start",
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
    """Select the next concept and difficulty level for the learner."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )

    topic_filter = session.get("topic")
    mastery_map = get_all_mastery(session_id)

    # Filter concepts by session topic if set
    eligible_concepts = (
        [c for c in CONCEPTS_LIST if c.get("topic") == topic_filter]
        if topic_filter
        else CONCEPTS_LIST
    )

    # Day 1 Selector: Pick the first unlocked non-mastered concept, or weakest concept
    selected_concept = None
    for concept in eligible_concepts:
        c_id = concept["id"]
        p_known = mastery_map.get(c_id, DEFAULT_PARAMS.p_init)
        if p_known < 0.85:
            # Check prerequisites: all prereqs must be >= 0.60
            prereqs_met = True
            for prereq_id in concept.get("prereqs", []):
                prereq_p = mastery_map.get(prereq_id, DEFAULT_PARAMS.p_init)
                if prereq_p < 0.60:
                    prereqs_met = False
                    break
            if prereqs_met:
                selected_concept = concept
                break

    # Fallback if all unlocked are mastered or none found
    if not selected_concept:
        selected_concept = eligible_concepts[0]

    c_id = selected_concept["id"]
    current_p = mastery_map.get(c_id, DEFAULT_PARAMS.p_init)

    # Difficulty thresholds (MVP §4.2)
    if current_p < 0.40:
        difficulty = 1
    elif current_p < 0.70:
        difficulty = 2
    else:
        difficulty = 3

    level = mastery_level(current_p)

    return NextConceptResponse(
        session_id=session_id,
        concept_id=c_id,
        concept_name=selected_concept["name"],
        topic=selected_concept["topic"],
        difficulty=difficulty,
        p_known=round(current_p, 4),
        mastery_level=level,
        question=None,  # Populated from question bank on Day 2
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

    # Check re-explain rule (2 wrong answers on same concept)
    recent = get_recent_attempts(session_id, concept_id=concept_id, limit=2)
    re_explain = False
    explanation_style = None
    if len(recent) >= 2 and all(not a["correct"] for a in recent):
        re_explain = True
        explanation_style = "analogy"  # Day 2 rotates: analogy -> worked_example -> step_by_step

    # Structured turn audit trace
    step_num = get_next_trace_step(session_id)
    append_trace(
        trace_id=str(uuid.uuid4()),
        session_id=session_id,
        step=step_num,
        payload={
            "action": "answer_attempt",
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
