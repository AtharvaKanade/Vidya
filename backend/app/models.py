"""Pydantic data models and schemas for API requests and responses."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SessionStartRequest(BaseModel):
    """Payload to initialize a learning session."""

    topic: Optional[str] = Field(
        default=None,
        description="Optional target topic ID (e.g. 'nn', 'tr', 'rag'). If omitted, all topics are available.",
    )


class SessionStartResponse(BaseModel):
    """Response returned upon session creation."""

    session_id: str
    created_at: str
    topic: Optional[str] = None


class QuestionPayload(BaseModel):
    """Question item presented to the learner."""

    id: str
    concept: str
    difficulty: int
    type: str = "mcq"
    question: str
    options: List[str]
    answer_index: Optional[int] = None
    explanation_hint: Optional[str] = None


class NextConceptResponse(BaseModel):
    """Concept and question item selected for the next turn."""

    session_id: str
    concept_id: str
    concept_name: str
    topic: str
    difficulty: int
    p_known: float
    mastery_level: str
    question: Optional[QuestionPayload] = None


class AnswerRequest(BaseModel):
    """Learner's submitted answer for a concept question."""

    concept_id: str
    question_id: str
    correct: bool
    latency_ms: int = Field(default=0, ge=0)


class AnswerResponse(BaseModel):
    """Evaluation result and updated BKT mastery state."""

    session_id: str
    concept_id: str
    correct: bool
    p_known_before: float
    p_known_after: float
    mastery_level: str
    re_explain: bool = False
    explanation_style: Optional[str] = None


class MasteryConceptItem(BaseModel):
    """Mastery status for a single curriculum concept."""

    id: str
    name: str
    topic: str
    p_known: float
    level: str
    attempts_count: int = 0


class MasteryResponse(BaseModel):
    """Full mastery map snapshot for a session."""

    session_id: str
    topic: Optional[str] = None
    concepts: List[MasteryConceptItem]


class TraceStepItem(BaseModel):
    """Audit record of a single turn."""

    step: int
    payload: Dict[str, Any]
    ts: str


class TraceResponse(BaseModel):
    """Sequence of audit traces for a session."""

    session_id: str
    steps: List[TraceStepItem]
