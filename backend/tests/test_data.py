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
