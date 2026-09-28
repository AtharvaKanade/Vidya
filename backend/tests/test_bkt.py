"""Unit tests for Bayesian Knowledge Tracing (BKT) engine."""

import random
import pytest
from backend.app.bkt import (
    BKTParams,
    DEFAULT_PARAMS,
    mastery_level,
    update,
)


def test_known_inputs_correct_response() -> None:
    """Verify exact formula calculation for a correct response."""
    # p=0.2, slip=0.1, guess=0.25, learn=0.15
    # posterior = (0.2*0.9) / (0.2*0.9 + 0.8*0.25) = 0.18 / 0.38 = 9/19 (~0.473684)
    # p_new = 9/19 + (1 - 9/19)*0.15 = 9/19 + (10/19)*0.15 = 10.5/19 = 21/38 (~0.55263158)
    p_initial = 0.20
    expected = 21.0 / 38.0
    actual = update(p_initial, correct=True, params=DEFAULT_PARAMS)
    assert pytest.approx(actual, rel=1e-6) == expected


def test_known_inputs_incorrect_response() -> None:
    """Verify exact formula calculation for an incorrect response."""
    # p=0.5, slip=0.1, guess=0.25, learn=0.15
    # posterior = (0.5*0.1) / (0.5*0.1 + 0.5*0.75) = 0.05 / 0.425 = 2/17 (~0.117647)
    # p_new = 2/17 + (15/17)*0.15 = (2 + 2.25)/17 = 4.25/17 = 0.25
    p_initial = 0.50
    expected = 0.25
    actual = update(p_initial, correct=False, params=DEFAULT_PARAMS)
    assert pytest.approx(actual, rel=1e-6) == expected


def test_correct_answer_raises_p_known() -> None:
    """A correct answer must strictly increase p_known across valid interior range."""
    for p_int in range(1, 99):
        p = p_int / 100.0
        p_next = update(p, correct=True)
        assert p_next > p, f"Failed at p={p}: p_next={p_next} <= p"


def test_wrong_answer_lowers_p_known() -> None:
    """An incorrect answer must strictly lower p_known when p is above baseline floor."""
    for p_int in range(40, 99):
        p = p_int / 100.0
        p_next = update(p, correct=False)
        assert p_next < p, f"Failed at p={p}: p_next={p_next} >= p"


def test_values_stay_in_0_1_bounds() -> None:
    """Ensure p_known always strictly remains within [0.0, 1.0] across long random sequences."""
    random.seed(42)
    p = 0.20
    for _ in range(500):
        correct = random.choice([True, False])
        p = update(p, correct)
        assert 0.0 <= p <= 1.0, f"Out of bounds: p={p}"


def test_boundary_inputs() -> None:
    """Check robustness on edge input values 0.0, 1.0 and beyond."""
    assert 0.0 <= update(0.0, correct=False) <= 1.0
    assert 0.0 <= update(0.0, correct=True) <= 1.0
    assert 0.0 <= update(1.0, correct=False) <= 1.0
    assert 0.0 <= update(1.0, correct=True) <= 1.0
    # Values outside [0, 1] get clamped defensively
    assert 0.0 <= update(-0.5, correct=True) <= 1.0
    assert 0.0 <= update(1.5, correct=False) <= 1.0


def test_mastery_level_thresholds() -> None:
    """Verify mastery level categorization at exact thresholds."""
    assert mastery_level(0.00) == "weak"
    assert mastery_level(0.39) == "weak"
    assert mastery_level(0.39999) == "weak"
    assert mastery_level(0.40) == "shaky"
    assert mastery_level(0.60) == "shaky"
    assert mastery_level(0.84999) == "shaky"
    assert mastery_level(0.85) == "mastered"
    assert mastery_level(0.99) == "mastered"
    assert mastery_level(1.00) == "mastered"


def test_params_validation() -> None:
    """Ensure invalid BKT parameters are caught early."""
    with pytest.raises(ValueError):
        BKTParams(p_init=-0.1)
    with pytest.raises(ValueError):
        BKTParams(p_slip=0.6, p_guess=0.5)  # slip + guess >= 1.0
