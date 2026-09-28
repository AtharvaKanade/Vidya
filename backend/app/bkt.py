"""Bayesian Knowledge Tracing (BKT) Core Engine.

This module implements pure-function BKT updates for tracking per-concept learner
mastery based on observed correctness sequences.

Reference formulas (MVP.md §4.1):
  if correct:  posterior = p*(1-slip) / (p*(1-slip) + (1-p)*guess)
  else:        posterior = p*slip     / (p*slip     + (1-p)*(1-guess))
  p_known_new = posterior + (1 - posterior) * p_learn

Mastery Categorization:
  - weak:     p_known < 0.40
  - shaky:    0.40 <= p_known < 0.85
  - mastered: p_known >= 0.85
"""

from dataclasses import dataclass
from typing import Literal


MasteryLevel = Literal["weak", "shaky", "mastered"]


@dataclass(frozen=True)
class BKTParams:
    """Standard 4-parameter BKT configuration."""

    p_init: float = 0.20
    p_learn: float = 0.15
    p_slip: float = 0.10
    p_guess: float = 0.25

    def __post_init__(self) -> None:
        """Validate parameter ranges."""
        for name in ("p_init", "p_learn", "p_slip", "p_guess"):
            val = getattr(self, name)
            if not (0.0 <= val <= 1.0):
                raise ValueError(f"BKT parameter {name}={val} must be in range [0.0, 1.0]")
        if self.p_slip + self.p_guess >= 1.0:
            raise ValueError(
                f"Sum of slip ({self.p_slip}) and guess ({self.p_guess}) must be < 1.0 "
                "for identifiability and valid learning dynamics."
            )


DEFAULT_PARAMS = BKTParams()


def update(
    p_known: float,
    correct: bool,
    params: BKTParams = DEFAULT_PARAMS,
) -> float:
    """Compute the posterior and transitioned p_known after one response observation.

    Args:
        p_known: Current probability of concept mastery, in [0.0, 1.0].
        correct: True if the learner's answer was correct, False otherwise.
        params: BKT parameters (p_init, p_learn, p_slip, p_guess).

    Returns:
        New p_known value in [0.0, 1.0].
    """
    # Defensive clamp on input probability
    p = max(0.0, min(1.0, float(p_known)))

    slip = params.p_slip
    guess = params.p_guess
    learn = params.p_learn

    if correct:
        numerator = p * (1.0 - slip)
        denominator = numerator + (1.0 - p) * guess
    else:
        numerator = p * slip
        denominator = numerator + (1.0 - p) * (1.0 - guess)

    # Avoid zero division edge cases
    if denominator <= 1e-12:
        posterior = p
    else:
        posterior = numerator / denominator

    # Transition with learning probability
    p_known_new = posterior + (1.0 - posterior) * learn

    # Numerical safety clamp
    return max(0.0, min(1.0, float(p_known_new)))


def mastery_level(p_known: float) -> MasteryLevel:
    """Classify probability of mastery into discrete pedagogical buckets.

    Args:
        p_known: Probability of mastery in [0.0, 1.0].

    Returns:
        'weak' if p < 0.40, 'shaky' if 0.40 <= p < 0.85, 'mastered' if p >= 0.85.
    """
    p = max(0.0, min(1.0, float(p_known)))
    if p >= 0.85:
        return "mastered"
    if p >= 0.40:
        return "shaky"
    return "weak"
