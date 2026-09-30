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
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.app.bkt import DEFAULT_PARAMS, mastery_level, update as bkt_update
from backend.app.db import (
    authenticate_user,
    create_auth_token,
    create_otp_request,
    create_session,
    create_user,
    get_all_mastery,
    get_mastery,
    get_question,
    get_recent_attempts,
    get_session,
    get_session_answered_questions,
    get_traces,
    get_user_by_token,
    init_db,
    record_attempt,
    resend_otp_code,
    save_question,
    set_mastery,
    verify_and_create_user,
)
from backend.app.models import (
    AnswerRequest,
    AnswerResponse,
    AuthLoginRequest,
    AuthOTPConfirmRequest,
    AuthOTPRequest,
    AuthOTPResendRequest,
    AuthOTPResponse,
    AuthResponse,
    AuthSignupRequest,
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
    UserProfile,
)
from backend.app.selector import check_uncertainty_rule, select_next_concept
from backend.app.trace import log_event
from backend.app.tutor import STYLES, explain as tutor_explain, generate_adaptive_question

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
    # Ensure all bank questions are registered in database
    for q in QUESTIONS_LIST:
        save_question(q)
    yield


app = FastAPI(
    title="Vidya AI Tutor API",
    description="Bayesian Knowledge Tracing (BKT) powered adaptive AI tutor engine.",
    version="0.2.0",
    lifespan=lifespan,
)


def get_authenticated_user(authorization: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Resolve a user from the Authorization bearer token when present."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    return get_user_by_token(token)

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


def send_otp_email_notification(email: str, name: str, otp_code: str) -> bool:
    """Log OTP code to console and send email if SMTP server configured.
    Returns True if sent via SMTP, False if running in dev mode without SMTP.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    is_smtp_configured = bool(
        smtp_host and smtp_host.strip() and
        smtp_port and smtp_port.strip() and
        smtp_user and smtp_user.strip() and
        smtp_pass and smtp_pass.strip()
    )

    print("\n=======================================================")
    print(f"[EMAIL VERIFICATION] Target Email: {email}")
    print(f"Learner Name: {name}")
    print(f"OTP CODE: [ {otp_code} ]")
    print(f"SMTP Delivery Enabled: {is_smtp_configured}")
    print("=======================================================\n")

    if is_smtp_configured:
        try:
            import smtplib
            from email.mime.text import MIMEText
            msg = MIMEText(
                f"Hello {name},\n\n"
                f"Your Vidya AI Tutor account verification OTP code is: {otp_code}\n\n"
                f"This code will expire in 10 minutes.\n\n"
                f"If you did not request this code, please ignore this email.\n\n"
                f"Happy Learning!\nVidya AI Tutor Team"
            )
            msg["Subject"] = f"Vidya Signup Verification OTP: {otp_code}"
            msg["From"] = os.getenv("SMTP_FROM", smtp_user).strip()
            msg["To"] = email

            port = int(smtp_port.strip())
            with smtplib.SMTP(smtp_host.strip(), port, timeout=12) as server:
                server.starttls()
                server.login(smtp_user.strip(), smtp_pass.strip())
                server.send_message(msg)
            print(f"[EMAIL SERVICE SUCCESS] Real OTP email sent to {email}")
            return True
        except Exception as err:
            print(f"[EMAIL SERVICE ERROR] Failed sending SMTP email to {email}: {err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send email via SMTP ({err}). Please check your SMTP settings in .env.",
            ) from err

    return False


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "vidya-backend", "version": "0.2.0"}


@app.post(
    "/auth/signup/request",
    response_model=AuthOTPResponse,
    status_code=status.HTTP_200_OK,
    tags=["Auth"],
)
async def signup_request_otp(payload: AuthOTPRequest) -> AuthOTPResponse:
    """Request an OTP verification code sent to learner's email."""
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password must match.",
        )
    try:
        otp_info = create_otp_request(payload.email, payload.name, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    sent_via_smtp = send_otp_email_notification(otp_info["email"], otp_info["name"], otp_info["otp_code"])

    return AuthOTPResponse(
        message=f"Verification OTP code sent to {otp_info['email']}.",
        email=otp_info["email"],
        debug_otp=otp_info["otp_code"],
    )


@app.post(
    "/auth/signup/confirm",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
async def signup_confirm_otp(payload: AuthOTPConfirmRequest) -> AuthResponse:
    """Verify 6-digit OTP code and create learner account."""
    try:
        user = verify_and_create_user(payload.email, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = create_auth_token(user["id"])
    return AuthResponse(
        token=token,
        user=UserProfile(id=user["id"], name=user["name"], email=user["email"]),
    )


@app.post(
    "/auth/signup/resend",
    response_model=AuthOTPResponse,
    tags=["Auth"],
)
async def signup_resend_otp(payload: AuthOTPResendRequest) -> AuthOTPResponse:
    """Resend a fresh 6-digit OTP code to learner's email."""
    try:
        otp_info = resend_otp_code(payload.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    sent_via_smtp = send_otp_email_notification(otp_info["email"], otp_info["name"], otp_info["otp_code"])

    return AuthOTPResponse(
        message=f"A fresh verification OTP code has been sent to {otp_info['email']}.",
        email=otp_info["email"],
        debug_otp=otp_info["otp_code"],
    )


@app.post(
    "/auth/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
async def signup(payload: AuthSignupRequest) -> AuthResponse:
    """Direct account creation endpoint for backwards compatibility."""
    email = payload.email.strip().lower()
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password must match.",
        )
    try:
        user = create_user(email, payload.password, payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = create_auth_token(user["id"])
    return AuthResponse(
        token=token,
        user=UserProfile(id=user["id"], name=user["name"], email=user["email"]),
    )


@app.post(
    "/auth/login",
    response_model=AuthResponse,
    tags=["Auth"],
)
async def login(payload: AuthLoginRequest) -> AuthResponse:
    """Authenticate a learner by email and password."""
    user = authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_auth_token(user["id"])
    return AuthResponse(
        token=token,
        user=UserProfile(id=user["id"], name=user["name"], email=user["email"]),
    )


@app.get("/auth/me", response_model=UserProfile, tags=["Auth"])
async def get_current_user_profile(authorization: Optional[str] = Header(default=None)) -> UserProfile:
    """Return the currently authenticated user's profile."""
    user = get_authenticated_user(authorization)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return UserProfile(id=user["id"], name=user["name"], email=user["email"])


@app.post(
    "/auth/signup/request",
    response_model=AuthOTPResponse,
    status_code=status.HTTP_200_OK,
    tags=["Auth"],
)
async def signup_request_otp(payload: AuthOTPRequest) -> AuthOTPResponse:
    """Request an OTP verification code sent to learner's email."""
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password must match.",
        )
    try:
        otp_info = create_otp_request(payload.email, payload.name, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    sent_via_smtp = send_otp_email_notification(otp_info["email"], otp_info["name"], otp_info["otp_code"])

    return AuthOTPResponse(
        message=f"Verification OTP code sent to {otp_info['email']}.",
        email=otp_info["email"],
        debug_otp=otp_info["otp_code"],
    )


@app.post(
    "/auth/signup/confirm",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
async def signup_confirm_otp(payload: AuthOTPConfirmRequest) -> AuthResponse:
    """Verify 6-digit OTP code and create learner account."""
    try:
        user = verify_and_create_user(payload.email, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = create_auth_token(user["id"])
    return AuthResponse(
        token=token,
        user=UserProfile(id=user["id"], name=user["name"], email=user["email"]),
    )


@app.post(
    "/auth/signup/resend",
    response_model=AuthOTPResponse,
    tags=["Auth"],
)
async def signup_resend_otp(payload: AuthOTPResendRequest) -> AuthOTPResponse:
    """Resend a fresh 6-digit OTP code to learner's email."""
    try:
        otp_info = resend_otp_code(payload.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    sent_via_smtp = send_otp_email_notification(otp_info["email"], otp_info["name"], otp_info["otp_code"])

    return AuthOTPResponse(
        message=f"A fresh verification OTP code has been sent to {otp_info['email']}.",
        email=otp_info["email"],
        debug_otp=otp_info["otp_code"],
    )


@app.post(
    "/auth/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
async def signup(payload: AuthSignupRequest) -> AuthResponse:
    """Direct account creation endpoint for backwards compatibility."""
    email = payload.email.strip().lower()
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password must match.",
        )
    try:
        user = create_user(email, payload.password, payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = create_auth_token(user["id"])
    return AuthResponse(
        token=token,
        user=UserProfile(id=user["id"], name=user["name"], email=user["email"]),
    )


@app.post(
    "/auth/login",
    response_model=AuthResponse,
    tags=["Auth"],
)
async def login(payload: AuthLoginRequest) -> AuthResponse:
    """Authenticate a learner by email and password."""
    user = authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_auth_token(user["id"])
    return AuthResponse(
        token=token,
        user=UserProfile(id=user["id"], name=user["name"], email=user["email"]),
    )


@app.get("/auth/me", response_model=UserProfile, tags=["Auth"])
async def get_current_user_profile(authorization: Optional[str] = Header(default=None)) -> UserProfile:
    """Return the currently authenticated user's profile."""
    user = get_authenticated_user(authorization)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return UserProfile(id=user["id"], name=user["name"], email=user["email"])


@app.post(
    "/session/start",
    response_model=SessionStartResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Session"],
)
async def start_session(
    payload: Optional[SessionStartRequest] = None,
    authorization: Optional[str] = Header(default=None),
) -> SessionStartResponse:
    """Initialize a new learning session for an authenticated learner when available."""
    topic = payload.topic if payload else None
    if topic:
        valid_topics = {t["id"] for t in TOPICS_LIST}
        if topic not in valid_topics:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid topic '{topic}'. Must be one of: {sorted(valid_topics)}",
            )

    user = get_authenticated_user(authorization)
    session_id = str(uuid.uuid4())
    created_at = create_session(session_id, topic=topic, user_id=user["id"] if user else None)

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

    # Question Selection: Retrieve all answered questions in this session
    answered_items = get_session_answered_questions(session_id)
    answered_q_ids = {item["id"] for item in answered_items}
    recent_attempts_all = get_recent_attempts(session_id, limit=200)
    for a in recent_attempts_all:
        answered_q_ids.add(a["question_id"])

    prev_questions = [item["question"] for item in answered_items]
    for q in QUESTIONS_LIST:
        if q.get("id") in answered_q_ids and q.get("question") not in prev_questions:
            prev_questions.append(q["question"])

    # Determine last wrong question & user choice if previous attempt was incorrect
    last_wrong_question = None
    last_correct_answer = None

    if recent_concept_attempts and not recent_concept_attempts[0].get("correct", True):
        last_qid = recent_concept_attempts[0].get("question_id")
        matching_last_q = get_question(last_qid) or next((q for q in QUESTIONS_LIST if q.get("id") == last_qid), None)
        if matching_last_q:
            last_wrong_question = matching_last_q.get("question")
            opts = matching_last_q.get("options", [])
            ans_idx = matching_last_q.get("answer_index", 0)
            if 0 <= ans_idx < len(opts):
                last_correct_answer = opts[ans_idx]
    elif recent_attempts_all and not recent_attempts_all[0].get("correct", True):
        last_qid = recent_attempts_all[0].get("question_id")
        matching_last_q = get_question(last_qid) or next((q for q in QUESTIONS_LIST if q.get("id") == last_qid), None)
        if matching_last_q:
            last_wrong_question = matching_last_q.get("question")
            opts = matching_last_q.get("options", [])
            ans_idx = matching_last_q.get("answer_index", 0)
            if 0 <= ans_idx < len(opts):
                last_correct_answer = opts[ans_idx]

    topic_dict = next((t for t in TOPICS_LIST if t["id"] == selected_concept.get("topic")), None)
    topic_name = topic_dict["name"] if topic_dict else None

    # Adapt difficulty: if student had an error, force Level 1 (foundational scaffolding)
    target_difficulty = 1 if last_wrong_question is not None else difficulty

    generated_q = generate_adaptive_question(
        concept_name=selected_concept["name"],
        concept_id=c_id,
        difficulty=target_difficulty,
        p_known=current_p,
        topic_name=topic_name,
        concept_desc=selected_concept.get("description"),
        recent_attempts=recent_concept_attempts,
        previous_questions=prev_questions,
        last_wrong_question=last_wrong_question,
        last_correct_answer=last_correct_answer,
    )

    is_generated = False
    selected_q_dict = None

    if generated_q and generated_q.get("question") not in prev_questions:
        selected_q_dict = generated_q
        QUESTIONS_LIST.append(generated_q)
        save_question(generated_q)
        is_generated = True
    else:
        # Fallback to calibrated question bank: pick an un-asked question
        concept_questions = [q for q in QUESTIONS_LIST if q.get("concept") == c_id]
        unanswered_q = [
            q for q in concept_questions
            if q["id"] not in answered_q_ids and q.get("question") not in prev_questions
        ]
        targeted_q = [q for q in unanswered_q if q.get("difficulty") == target_difficulty]

        if targeted_q:
            selected_q_dict = targeted_q[0]
            save_question(selected_q_dict)
        elif unanswered_q:
            selected_q_dict = unanswered_q[0]
            save_question(selected_q_dict)
        else:
            # If all items answered, synthesize a guaranteed new scaffolded item
            selected_q_dict = generate_adaptive_question(
                concept_name=selected_concept["name"],
                concept_id=c_id,
                difficulty=1,
                p_known=current_p,
                topic_name=topic_name,
                concept_desc=selected_concept.get("description"),
                recent_attempts=recent_concept_attempts,
                previous_questions=prev_questions,
                last_wrong_question=last_wrong_question,
                last_correct_answer=last_correct_answer,
            )
            if selected_q_dict:
                QUESTIONS_LIST.append(selected_q_dict)
                save_question(selected_q_dict)
            is_generated = True

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
            "generated": is_generated,
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
