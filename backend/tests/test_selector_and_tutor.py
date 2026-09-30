"""Unit and integration tests for selector, tutor, and approval line endpoints."""

import pytest
from fastapi.testclient import TestClient

from backend.app.bkt import DEFAULT_PARAMS
from backend.app.main import CONCEPTS_LIST, app
from backend.app.selector import check_uncertainty_rule, select_next_concept
from backend.app.tutor import STYLES, explain


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


def test_selector_respects_prerequisites():
    """Ensure locked concepts are not selected until prerequisites reach threshold (0.60)."""
    # Concept with prerequisite: 'nn_activation' requires 'nn_perceptron'
    mastery_map = {
        "nn_perceptron": 0.30,  # Below 0.60 threshold
        "nn_activation": 0.20,
    }
    concept, difficulty = select_next_concept(
        concepts=CONCEPTS_LIST,
        mastery_map=mastery_map,
        topic_filter="nn",
        params=DEFAULT_PARAMS,
    )
    # Must select nn_perceptron or an unblocked node, NOT nn_activation
    assert concept["id"] != "nn_activation"
    assert difficulty == 1


def test_selector_unlocks_when_prereqs_met():
    """Ensure concept is eligible once prereq reaches 0.60+."""
    mastery_map = {
        "nn_perceptron": 0.90,       # Mastered
        "nn_linear_algebra": 0.90,  # Mastered
        "nn_activation": 0.20,      # Unlocked now!
    }
    concept, difficulty = select_next_concept(
        concepts=CONCEPTS_LIST,
        mastery_map=mastery_map,
        topic_filter="nn",
        params=DEFAULT_PARAMS,
    )
    assert concept["id"] == "nn_activation"
    assert difficulty == 1


def test_uncertainty_rule_trigger():
    """Verify uncertainty rule triggers when learner is in ambiguous range with conflicting answers."""
    # Condition: 0.40 <= p <= 0.65 and conflicting recent attempts
    recent_attempts = [
        {"correct": True},
        {"correct": False},
        {"correct": True},
    ]
    assert check_uncertainty_rule(recent_attempts, p_known=0.52) is True

    # When clearly mastered (p >= 0.85), rule should NOT trigger
    assert check_uncertainty_rule(recent_attempts, p_known=0.90) is False

    # When clearly weak (p < 0.40), rule should NOT trigger
    assert check_uncertainty_rule(recent_attempts, p_known=0.25) is False


def test_tutor_fallback_and_styles():
    """Verify tutor returns a non-empty explanation across all styles without crashing."""
    for style in STYLES:
        text, from_cache, is_fallback = explain(
            concept_name="Activation functions",
            concept_id="nn_activation",
            p_known=0.45,
            style=style,
        )
        assert isinstance(text, str)
        assert len(text) > 20


def test_explain_endpoint(client):
    """Test POST /session/{id}/explain returns explanation and updates trace."""
    start_res = client.post("/session/start", json={"topic": "nn"})
    session_id = start_res.json()["session_id"]

    explain_res = client.post(
        f"/session/{session_id}/explain",
        json={"concept_id": "nn_perceptron", "style": "analogy"},
    )
    assert explain_res.status_code == 200
    data = explain_res.json()
    assert data["concept_id"] == "nn_perceptron"
    assert data["style"] == "analogy"
    assert len(data["explanation"]) > 10

    # Verify trace log
    trace_res = client.get(f"/session/{session_id}/trace")
    actions = [s["payload"]["action"] for s in trace_res.json()["steps"]]
    assert "explanation_generated" in actions


def test_self_rate_endpoint(client):
    """Test POST /session/{id}/self-rate blends rating into BKT mastery."""
    start_res = client.post("/session/start", json={"topic": "nn"})
    session_id = start_res.json()["session_id"]

    # Initial mastery is p_init = 0.20
    # Submit a high confidence self-rating: rating 5 -> norm = 1.0
    # Blended = 0.7 * 0.20 + 0.3 * 1.0 = 0.14 + 0.30 = 0.44
    rate_res = client.post(
        f"/session/{session_id}/self-rate",
        json={"concept_id": "nn_perceptron", "rating": 5},
    )
    assert rate_res.status_code == 200
    data = rate_res.json()
    assert data["p_known_before"] == pytest.approx(0.20, abs=0.01)
    assert data["p_known_after"] == pytest.approx(0.44, abs=0.01)
    assert data["flagged"] is True

    # Verify mastery endpoint reflects blended value
    mastery_res = client.get(f"/session/{session_id}/mastery")
    concept_m = next(c for c in mastery_res.json()["concepts"] if c["id"] == "nn_perceptron")
    assert concept_m["p_known"] == pytest.approx(0.44, abs=0.01)
