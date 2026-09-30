"""Synthetic learner simulation engine for Vidya.

Evaluates Bayesian Knowledge Tracing (BKT) accuracy, adaptive curriculum sequencing,
and compares against a non-adaptive fixed-syllabus baseline (MVP.md §6.2 & Proof #2).
"""

import json
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Add project root to sys.path for standalone script execution
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.bkt import DEFAULT_PARAMS, update as bkt_update
from backend.app.selector import select_next_concept


@dataclass
class SyntheticLearner:
    """Represents a simulated learner with ground-truth latent mastery."""

    id: int
    archetype: str  # 'beginner', 'intermediate', 'advanced'
    true_mastery: Dict[str, float]  # Ground truth latent mastery [0.0, 1.0] per concept
    slip_rate: float = 0.08
    guess_rate: float = 0.20


def generate_synthetic_cohort(
    concepts: List[Dict[str, Any]],
    n_learners: int = 30,
    seed: int = 42,
) -> List[SyntheticLearner]:
    """Generate a diverse synthetic student cohort with known latent competencies."""
    rng = random.Random(seed)
    archetypes = ["beginner", "intermediate", "advanced"]
    cohort = []

    for i in range(n_learners):
        arch = archetypes[i % len(archetypes)]
        true_mastery: Dict[str, float] = {}

        for c in concepts:
            c_id = c["id"]
            if arch == "beginner":
                base = rng.uniform(0.05, 0.35)
            elif arch == "intermediate":
                base = rng.uniform(0.35, 0.70)
            else:  # advanced
                base = rng.uniform(0.65, 0.95)
            true_mastery[c_id] = round(base, 4)

        cohort.append(
            SyntheticLearner(
                id=i + 1,
                archetype=arch,
                true_mastery=true_mastery,
                slip_rate=round(rng.uniform(0.05, 0.12), 3),
                guess_rate=round(rng.uniform(0.15, 0.25), 3),
            )
        )
    return cohort


def simulate_answer(learner: SyntheticLearner, concept_id: str, difficulty: int, rng: random.Random) -> bool:
    """Simulate a probabilistic response given true latent mastery."""
    true_p = learner.true_mastery.get(concept_id, 0.20)

    # Difficulty adjustment on true probability
    difficulty_penalty = {1: 0.0, 2: 0.08, 3: 0.16}.get(difficulty, 0.0)
    effective_p = max(0.05, min(0.95, true_p - difficulty_penalty))

    if rng.random() < effective_p:
        # Student knows the concept, but might slip
        return rng.random() > learner.slip_rate
    else:
        # Student does not know, but might guess
        return rng.random() < learner.guess_rate


def run_adaptive_session(
    learner: SyntheticLearner,
    concepts: List[Dict[str, Any]],
    questions: List[Dict[str, Any]],
    topic: str = "nn",
    max_turns: int = 25,
    seed: int = 100,
) -> Dict[str, Any]:
    """Execute an adaptive learning trajectory using Vidya's BKT + selector loop."""
    rng = random.Random(seed + learner.id)
    mastery_map: Dict[str, float] = {
        c["id"]: DEFAULT_PARAMS.p_init for c in concepts if c.get("topic") == topic
    }

    history: List[Dict[str, Any]] = []
    consecutive_wrongs: Dict[str, int] = {c_id: 0 for c_id in mastery_map}
    re_explain_count = 0
    appropriate_difficulty_count = 0

    for turn in range(1, max_turns + 1):
        concept, difficulty = select_next_concept(
            concepts=concepts,
            mastery_map=mastery_map,
            topic_filter=topic,
            params=DEFAULT_PARAMS,
        )
        c_id = concept["id"]
        current_p = mastery_map[c_id]

        # Check difficulty appropriateness
        if (difficulty == 1 and current_p < 0.40) or \
           (difficulty == 2 and 0.40 <= current_p < 0.70) or \
           (difficulty == 3 and current_p >= 0.70):
            appropriate_difficulty_count += 1

        correct = simulate_answer(learner, c_id, difficulty, rng)

        # Update BKT
        new_p = bkt_update(current_p, correct=correct, params=DEFAULT_PARAMS)
        mastery_map[c_id] = new_p

        # Re-explain rule check
        if not correct:
            consecutive_wrongs[c_id] += 1
            if consecutive_wrongs[c_id] >= 2:
                re_explain_count += 1
        else:
            consecutive_wrongs[c_id] = 0

        history.append({
            "turn": turn,
            "concept_id": c_id,
            "difficulty": difficulty,
            "correct": correct,
            "p_before": current_p,
            "p_after": new_p,
        })

    # Calculate Mean Absolute Error (MAE) against latent ground truth
    errors = [
        abs(mastery_map[c_id] - learner.true_mastery[c_id])
        for c_id in mastery_map
    ]
    mae = sum(errors) / len(errors) if errors else 0.0

    mastered_count = sum(1 for p in mastery_map.values() if p >= 0.85)

    return {
        "learner_id": learner.id,
        "archetype": learner.archetype,
        "turns": max_turns,
        "final_mastery": mastery_map,
        "mae": round(mae, 4),
        "mastered_concepts": mastered_count,
        "re_explains": re_explain_count,
        "difficulty_accuracy": round(appropriate_difficulty_count / max_turns, 4),
        "history": history,
    }


def run_fixed_baseline_session(
    learner: SyntheticLearner,
    concepts: List[Dict[str, Any]],
    topic: str = "nn",
    max_turns: int = 25,
    seed: int = 100,
) -> Dict[str, Any]:
    """Execute a non-adaptive, fixed-order syllabus baseline."""
    rng = random.Random(seed + learner.id)
    topic_concepts = [c for c in concepts if c.get("topic") == topic]
    mastery_map: Dict[str, float] = {c["id"]: DEFAULT_PARAMS.p_init for c in topic_concepts}

    for turn in range(max_turns):
        # Fixed sequential round-robin
        concept = topic_concepts[turn % len(topic_concepts)]
        c_id = concept["id"]
        current_p = mastery_map[c_id]

        correct = simulate_answer(learner, c_id, difficulty=2, rng=rng)
        new_p = bkt_update(current_p, correct=correct, params=DEFAULT_PARAMS)
        mastery_map[c_id] = new_p

    errors = [
        abs(mastery_map[c_id] - learner.true_mastery[c_id])
        for c_id in mastery_map
    ]
    mae = sum(errors) / len(errors) if errors else 0.0
    mastered_count = sum(1 for p in mastery_map.values() if p >= 0.85)

    return {
        "learner_id": learner.id,
        "archetype": learner.archetype,
        "final_mastery": mastery_map,
        "mae": round(mae, 4),
        "mastered_concepts": mastered_count,
    }
