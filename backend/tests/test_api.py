"""Integration tests for FastAPI endpoints and BKT session workflow."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import init_db


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Use an isolated temporary SQLite database for each test."""
    test_db = tmp_path / "test_vidya.db"
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setattr("backend.app.db.DB_PATH", test_db)
    init_db(test_db)


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client: TestClient) -> None:
    """Verify health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "vidya-backend"


def test_signup_and_login_with_email(client: TestClient) -> None:
    """Verify a user can create an account and log in with email and password."""
    signup_res = client.post(
        "/auth/signup",
        json={
            "name": "Student User",
            "email": "student@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
        },
    )
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert signup_data["user"]["email"] == "student@example.com"
    assert "token" in signup_data
    assert signup_data["token"]

    login_res = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "StrongPass123!"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["user"]["email"] == "student@example.com"
    assert login_data["token"]


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    """Verify duplicate registration is blocked."""
    payload = {
        "name": "Duplicate User",
        "email": "dup@example.com",
        "password": "StrongPass123!",
        "confirm_password": "StrongPass123!",
    }
    first = client.post("/auth/signup", json=payload)
    assert first.status_code == 201

    second = client.post("/auth/signup", json=payload)
    assert second.status_code == 400
    assert "already" in second.json()["detail"].lower()


def test_email_signup_requires_otp_verification(client: TestClient) -> None:
    """Verify the OTP-based signup flow confirms the account before creating it."""
    request_res = client.post(
        "/auth/signup/request",
        json={
            "name": "OTP User",
            "email": "otp.user@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
        },
    )
    assert request_res.status_code == 200
    request_data = request_res.json()
    assert request_data["message"]
    assert request_data["debug_otp"]

    confirm_res = client.post(
        "/auth/signup/confirm",
        json={
            "email": "otp.user@example.com",
            "otp": request_data["debug_otp"],
        },
    )
    assert confirm_res.status_code == 201
    confirm_data = confirm_res.json()
    assert confirm_data["user"]["email"] == "otp.user@example.com"
    assert confirm_data["user"]["name"] == "OTP User"
    assert confirm_data["token"]

    # Once confirmed, the same email should no longer be eligible to sign up without a fresh OTP flow.
    retry_res = client.post(
        "/auth/signup/confirm",
        json={
            "email": "otp.user@example.com",
            "otp": "000000",
        },
    )
    assert retry_res.status_code == 400


def test_start_session_all_topics(client: TestClient) -> None:
    """Verify session creation without specific topic."""
    response = client.post("/session/start", json={})
    assert response.status_code == 201
    data = response.json()
    assert "session_id" in data
    assert "created_at" in data
    assert data["topic"] is None


def test_start_session_specific_topic(client: TestClient) -> None:
    """Verify session creation with specific topic."""
    response = client.post("/session/start", json={"topic": "nn"})
    assert response.status_code == 201
    data = response.json()
    assert data["topic"] == "nn"


def test_start_session_invalid_topic(client: TestClient) -> None:
    """Verify 400 error on invalid topic ID."""
    response = client.post("/session/start", json={"topic": "nonexistent_topic"})
    assert response.status_code == 400


def test_get_next_concept(client: TestClient) -> None:
    """Verify retrieval of next concept for active session."""
    # Start session
    start_res = client.post("/session/start", json={"topic": "nn"})
    session_id = start_res.json()["session_id"]

    # Get next concept
    next_res = client.get(f"/session/{session_id}/next")
    assert next_res.status_code == 200
    data = next_res.json()
    assert data["session_id"] == session_id
    assert "concept_id" in data
    assert "concept_name" in data
    assert data["topic"] == "nn"
    assert data["difficulty"] in [1, 2, 3]
    assert 0.0 <= data["p_known"] <= 1.0
    assert data["mastery_level"] in ["weak", "shaky", "mastered"]


def test_answer_submission_and_bkt_update(client: TestClient) -> None:
    """Verify that correct answers raise p_known and wrong answers lower p_known."""
    start_res = client.post("/session/start", json={"topic": "nn"})
    session_id = start_res.json()["session_id"]

    next_res = client.get(f"/session/{session_id}/next")
    concept_id = next_res.json()["concept_id"]
    initial_p = next_res.json()["p_known"]

    # 1. Submit CORRECT answer
    ans_res1 = client.post(
        f"/session/{session_id}/answer",
        json={
            "concept_id": concept_id,
            "question_id": "q_test_01",
            "correct": True,
            "latency_ms": 2500,
        },
    )
    assert ans_res1.status_code == 200
    data1 = ans_res1.json()
    assert data1["correct"] is True
    assert data1["p_known_before"] == initial_p
    assert data1["p_known_after"] > initial_p

    # 2. Submit WRONG answer on same concept
    p_before_wrong = data1["p_known_after"]
    ans_res2 = client.post(
        f"/session/{session_id}/answer",
        json={
            "concept_id": concept_id,
            "question_id": "q_test_02",
            "correct": False,
            "latency_ms": 4100,
        },
    )
    assert ans_res2.status_code == 200
    data2 = ans_res2.json()
    assert data2["correct"] is False
    assert data2["p_known_after"] < p_before_wrong


def test_re_explain_flag_on_repeated_failures(client: TestClient) -> None:
    """Verify re-explain flag triggers after 2 consecutive wrong answers."""
    start_res = client.post("/session/start", json={"topic": "nn"})
    session_id = start_res.json()["session_id"]
    concept_id = "nn_perceptron"

    # First wrong answer
    ans1 = client.post(
        f"/session/{session_id}/answer",
        json={"concept_id": concept_id, "question_id": "q1", "correct": False},
    )
    assert ans1.json()["re_explain"] is False

    # Second wrong answer -> triggers re-explain
    ans2 = client.post(
        f"/session/{session_id}/answer",
        json={"concept_id": concept_id, "question_id": "q2", "correct": False},
    )
    assert ans2.json()["re_explain"] is True
    assert ans2.json()["explanation_style"] is not None


def test_mastery_endpoint(client: TestClient) -> None:
    """Verify /mastery returns curriculum list with updated mastery levels."""
    start_res = client.post("/session/start", json={"topic": "nn"})
    session_id = start_res.json()["session_id"]

    # Submit 3 correct answers on nn_perceptron
    for i in range(3):
        client.post(
            f"/session/{session_id}/answer",
            json={"concept_id": "nn_perceptron", "question_id": f"q_{i}", "correct": True},
        )

    mastery_res = client.get(f"/session/{session_id}/mastery")
    assert mastery_res.status_code == 200
    data = mastery_res.json()
    assert data["session_id"] == session_id
    assert data["topic"] == "nn"
    assert len(data["concepts"]) == 14  # 14 concepts in NN topic

    # Check that nn_perceptron p_known has risen significantly
    perceptron_entry = next(c for c in data["concepts"] if c["id"] == "nn_perceptron")
    assert perceptron_entry["p_known"] > 0.60


def test_trace_endpoint(client: TestClient) -> None:
    """Verify /trace returns ordered audit trail."""
    start_res = client.post("/session/start", json={"topic": "tr"})
    session_id = start_res.json()["session_id"]

    client.post(
        f"/session/{session_id}/answer",
        json={"concept_id": "tr_tokenization", "question_id": "q_tr_1", "correct": True},
    )

    trace_res = client.get(f"/session/{session_id}/trace")
    assert trace_res.status_code == 200
    data = trace_res.json()
    assert data["session_id"] == session_id
    assert len(data["steps"]) >= 2  # step 1: session_start, step 2: answer_attempt
    assert data["steps"][0]["payload"]["action"] == "session_start"
    assert data["steps"][1]["payload"]["action"] == "answer_attempt"


def test_nonexistent_session_404(client: TestClient) -> None:
    """Verify 404 on missing session ID."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    assert client.get(f"/session/{fake_id}/next").status_code == 404
    assert client.get(f"/session/{fake_id}/mastery").status_code == 404
    assert client.get(f"/session/{fake_id}/trace").status_code == 404
    assert client.post(
        f"/session/{fake_id}/answer",
        json={"concept_id": "nn_perceptron", "question_id": "q1", "correct": True},
    ).status_code == 404
