"""Validation tests for curriculum data graphs and content integrity."""

import json
from pathlib import Path
import pytest


CONCEPT_GRAPH_PATH = Path(__file__).resolve().parent.parent / "data" / "concept_graph.json"


@pytest.fixture
def graph_data() -> dict:
    """Load and parse the concept graph JSON file."""
    assert CONCEPT_GRAPH_PATH.exists(), f"Missing data file at {CONCEPT_GRAPH_PATH}"
    with open(CONCEPT_GRAPH_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_concept_graph_basic_structure(graph_data: dict) -> None:
    """Validate top-level schema and draft review marker."""
    assert "topics" in graph_data
    assert "concepts" in graph_data
    assert len(graph_data["topics"]) == 3
    assert len(graph_data["concepts"]) >= 35
    # Confirm review notice is present
    assert "_comment" in graph_data
    assert "NEEDS HUMAN REVIEW" in graph_data["_comment"]


def test_topics_integrity(graph_data: dict) -> None:
    """Validate all topics have distinct IDs and required fields."""
    topic_ids = set()
    for topic in graph_data["topics"]:
        assert "id" in topic and topic["id"].strip()
        assert "name" in topic and topic["name"].strip()
        assert "description" in topic and topic["description"].strip()
        assert topic["id"] not in topic_ids, f"Duplicate topic ID: {topic['id']}"
        topic_ids.add(topic["id"])

    assert topic_ids == {"nn", "tr", "rag"}


def test_concepts_integrity_and_prerequisites(graph_data: dict) -> None:
    """Validate concepts, fields, topic bindings, and prerequisite references."""
    topic_ids = {t["id"] for t in graph_data["topics"]}
    concept_map = {}

    for concept in graph_data["concepts"]:
        c_id = concept.get("id")
        assert c_id and isinstance(c_id, str), f"Invalid concept id: {concept}"
        assert c_id not in concept_map, f"Duplicate concept ID: {c_id}"
        assert concept.get("topic") in topic_ids, f"Concept {c_id} has invalid topic: {concept.get('topic')}"
        assert concept.get("name") and isinstance(concept["name"], str)
        assert concept.get("description") and isinstance(concept["description"], str)
        assert isinstance(concept.get("prereqs"), list)
        assert isinstance(concept.get("importance", 1.0), (int, float))
        assert concept.get("importance", 1.0) >= 0.5
        concept_map[c_id] = concept

    # Verify all prereq references exist in concept_map
    for c_id, concept in concept_map.items():
        for prereq_id in concept["prereqs"]:
            assert prereq_id in concept_map, (
                f"Concept '{c_id}' references unknown prerequisite '{prereq_id}'"
            )
            assert prereq_id != c_id, f"Concept '{c_id}' cannot have itself as prerequisite"


def test_prerequisite_graph_has_no_cycles(graph_data: dict) -> None:
    """Verify the concept graph is a valid DAG with no prerequisite cycles."""
    concepts = graph_data["concepts"]
    in_degree = {c["id"]: len(c["prereqs"]) for c in concepts}
    # adjacency: prereq -> list of concepts that depend on it
    adj = {c["id"]: [] for c in concepts}
    for c in concepts:
        for p in c["prereqs"]:
            adj[p].append(c["id"])

    # Kahn's algorithm (topological sort)
    queue = [c_id for c_id, deg in in_degree.items() if deg == 0]
    visited_count = 0

    while queue:
        curr = queue.pop(0)
        visited_count += 1
        for dependent in adj[curr]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    assert visited_count == len(concepts), (
        f"Cycle detected in concept graph! Only {visited_count}/{len(concepts)} concepts reachable."
    )


def test_every_topic_has_entry_point(graph_data: dict) -> None:
    """Verify each topic has at least one root concept with zero prerequisites."""
    for topic in graph_data["topics"]:
        topic_id = topic["id"]
        topic_roots = [
            c["id"]
            for c in graph_data["concepts"]
            if c["topic"] == topic_id and len(c["prereqs"]) == 0
        ]
        assert len(topic_roots) >= 1, f"Topic '{topic_id}' has no 0-prereq root entry concept!"


QUESTION_BANK_PATH = Path(__file__).resolve().parent.parent / "data" / "question_bank.json"


@pytest.fixture
def questions_data() -> list:
    """Load and parse the question bank JSON file."""
    assert QUESTION_BANK_PATH.exists(), f"Missing question bank file at {QUESTION_BANK_PATH}"
    with open(QUESTION_BANK_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_question_bank_integrity(graph_data: dict, questions_data: list) -> None:
    """Validate question bank completeness, mapping to concept graph, and valid answer indices."""
    concept_ids = {c["id"] for c in graph_data["concepts"]}
    assert len(questions_data) >= 100, f"Expected 100+ questions, found {len(questions_data)}"

    seen_q_ids = set()
    concept_q_counts = {c_id: 0 for c_id in concept_ids}

    for q in questions_data:
        q_id = q.get("id")
        assert q_id and isinstance(q_id, str), f"Invalid question id in {q}"
        assert q_id not in seen_q_ids, f"Duplicate question ID: {q_id}"
        seen_q_ids.add(q_id)

        c_id = q.get("concept")
        assert c_id in concept_ids, f"Question '{q_id}' references unknown concept '{c_id}'"
        concept_q_counts[c_id] += 1

        difficulty = q.get("difficulty")
        assert difficulty in [1, 2, 3], f"Question '{q_id}' has invalid difficulty {difficulty}"

        options = q.get("options")
        assert isinstance(options, list) and len(options) == 4, f"Question '{q_id}' must have exactly 4 options"
        for opt in options:
            assert isinstance(opt, str) and opt.strip(), f"Empty option in question '{q_id}'"

        ans_idx = q.get("answer_index")
        assert isinstance(ans_idx, int) and 0 <= ans_idx < 4, f"Invalid answer_index in question '{q_id}'"

        hint = q.get("explanation_hint")
        assert isinstance(hint, str) and len(hint.strip()) > 5, f"Missing or short explanation_hint in '{q_id}'"

    # Verify that every single concept in the concept graph has at least 3 calibrated questions
    for c_id, count in concept_q_counts.items():
        assert count >= 3, f"Concept '{c_id}' has only {count} questions in question bank (minimum 3 required)"

