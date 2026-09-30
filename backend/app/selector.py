"""Next-step curriculum selector and uncertainty gating engine.

Implements DAG-aware prerequisite gating, priority scoring based on information gain,
difficulty adaptation, and the human approval line (uncertainty detection).
"""

from typing import Any, Dict, List, Optional, Tuple

from backend.app.bkt import BKTParams, DEFAULT_PARAMS, mastery_level


def select_next_concept(
    concepts: List[Dict[str, Any]],
    mastery_map: Dict[str, float],
    topic_filter: Optional[str] = None,
    params: BKTParams = DEFAULT_PARAMS,
) -> Tuple[Dict[str, Any], int]:
    """Select the next concept and difficulty level for the learner.

    Algorithm (MVP.md §4.2):
    1. Filter concepts eligible under topic_filter.
    2. Gating: A concept is unlocked if all prerequisite concepts have p_known >= 0.60.
    3. Filter out mastered concepts (p_known >= 0.85).
    4. Score each candidate: Score = (1.0 - p_known) * importance (default importance = 1.0).
    5. Select candidate with the highest information-gain score.
    6. Difficulty mapping:
       - p_known < 0.40 -> Level 1 (Foundational)
       - 0.40 <= p_known < 0.70 -> Level 2 (Intermediate)
       - p_known >= 0.70 -> Level 3 (Advanced)

    Args:
        concepts: List of concept dictionaries from concept_graph.json.
        mastery_map: Dictionary mapping concept_id -> p_known.
        topic_filter: Optional topic ID to restrict curriculum scope.
        params: BKT default parameters.

    Returns:
        Tuple of (selected_concept_dict, difficulty_level).
    """
    eligible = [
        c for c in concepts
        if not topic_filter or c.get("topic") == topic_filter
    ]
    if not eligible:
        eligible = concepts

    candidates: List[Tuple[float, Dict[str, Any], float]] = []

    for c in eligible:
        c_id = c["id"]
        p_known = mastery_map.get(c_id, params.p_init)

        # Skip mastered concepts
        if p_known >= 0.85:
            continue

        # Prerequisite gating check: all prereqs must be >= 0.60
        prereqs = c.get("prereqs", [])
        prereqs_satisfied = True
        for prereq_id in prereqs:
            prereq_p = mastery_map.get(prereq_id, params.p_init)
            if prereq_p < 0.60:
                prereqs_satisfied = False
                break

        if prereqs_satisfied:
            importance = float(c.get("importance", 1.0))
            score = (1.0 - p_known) * importance
            candidates.append((score, c, p_known))

    if candidates:
        # Sort descending by priority score
        candidates.sort(key=lambda item: item[0], reverse=True)
        _, chosen_concept, current_p = candidates[0]
    else:
        # Fallback 1: Pick non-mastered concept with lowest mastery in current topic
        unmastered = [
            c for c in eligible
            if mastery_map.get(c["id"], params.p_init) < 0.85
        ]
        if unmastered:
            unmastered.sort(key=lambda c: mastery_map.get(c["id"], params.p_init))
            chosen_concept = unmastered[0]
            current_p = mastery_map.get(chosen_concept["id"], params.p_init)
        else:
            # Fallback 2: All mastered or empty; pick first eligible concept
            chosen_concept = eligible[0]
            current_p = mastery_map.get(chosen_concept["id"], params.p_init)

    # Difficulty thresholds
    if current_p < 0.40:
        difficulty = 1
    elif current_p < 0.70:
        difficulty = 2
    else:
        difficulty = 3

    return chosen_concept, difficulty


def check_uncertainty_rule(
    recent_attempts: List[Dict[str, Any]],
    p_known: float,
) -> bool:
    """Determine if learner mastery is ambiguous and requires self-rating verification.

    Human Approval Line Rule (MVP.md §4.2 & Proof #3):
    1. If 3+ attempts and answers conflict (e.g. [True, False, True] or [False, True, False])
       while in the ambiguous range (0.40 <= p_known <= 0.65).
    2. If 4+ total attempts on the concept and still stuck in ambiguous range (0.40 <= p_known <= 0.65).

    Args:
        recent_attempts: List of recent attempt dictionaries for the concept.
        p_known: Current probability of mastery.

    Returns:
        True if self-rating modal should be triggered, False otherwise.
    """
    if not (0.40 <= p_known <= 0.65):
        return False

    if len(recent_attempts) >= 4:
        return True

    if len(recent_attempts) >= 3:
        last_3 = [bool(a["correct"]) for a in recent_attempts[:3]]
        # Conflicting results (not all True and not all False)
        if len(set(last_3)) > 1:
            return True

    return False
