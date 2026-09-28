"""Smoke test script to verify full 5-turn session workflow against FastAPI backend."""

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import init_db


def run_smoke_test():
    print("=" * 65)
    print("  VIDYA SMOKE TEST: 5-Turn Adaptive Session & BKT Verification")
    print("=" * 65)

    init_db()

    with TestClient(app) as client:
        # 1. Start Session
        print("\n[1] Initializing learning session on topic 'nn'...")
        res = client.post("/session/start", json={"topic": "nn"})
        assert res.status_code == 201, f"Failed to start session: {res.text}"
        session_data = res.json()
        session_id = session_data["session_id"]
        print(f"    -> Session created: ID={session_id}")

        # 2. Simulate 5 answer turns
        answers = [True, True, False, True, True]

        for turn, correct in enumerate(answers, 1):
            # Fetch next concept
            next_res = client.get(f"/session/{session_id}/next")
            assert next_res.status_code == 200, f"Next failed: {next_res.text}"
            next_data = next_res.json()

            print(f"\n[Turn {turn}] Selected Concept: '{next_data['concept_name']}' (ID: {next_data['concept_id']})")
            print(f"         Current p_known: {next_data['p_known']:.4f} | Mastery: {next_data['mastery_level']} | Difficulty: {next_data['difficulty']}")

            # Submit answer
            ans_res = client.post(
                f"/session/{session_id}/answer",
                json={
                    "concept_id": next_data["concept_id"],
                    "question_id": f"q_smoke_{turn}",
                    "correct": correct,
                    "latency_ms": 1800 + turn * 200,
                },
            )
            assert ans_res.status_code == 200, f"Answer failed: {ans_res.text}"
            ans_data = ans_res.json()
            print(f"         Submitted: {'CORRECT' if correct else 'WRONG'}")
            print(f"         BKT Update: {ans_data['p_known_before']:.4f} -> {ans_data['p_known_after']:.4f} ({ans_data['mastery_level']})")
            if ans_data["re_explain"]:
                print(f"         [!] Re-explain triggered! Style: {ans_data['explanation_style']}")

        # 3. Check Mastery Summary
        print("\n[3] Fetching full curriculum mastery map...")
        mastery_res = client.get(f"/session/{session_id}/mastery")
        assert mastery_res.status_code == 200
        mastery_data = mastery_res.json()
        print(f"    Total concepts tracked: {len(mastery_data['concepts'])}")
        for c in mastery_data["concepts"][:5]:
            print(f"    - {c['name']:<35} p_known: {c['p_known']:.4f} [{c['level']}]")

        # 4. Check Trace Trail
        print("\n[4] Inspecting structured audit trace...")
        trace_res = client.get(f"/session/{session_id}/trace")
        assert trace_res.status_code == 200
        trace_data = trace_res.json()
        print(f"    Total recorded trace steps: {len(trace_data['steps'])}")
        for step in trace_data["steps"]:
            action = step["payload"].get("action")
            print(f"    Step {step['step']}: action={action}, ts={step['ts']}")

    print("\n" + "=" * 65)
    print("  SUCCESS: Day 1 Exit Criterion Fully Verified!")
    print("=" * 65)


if __name__ == "__main__":
    run_smoke_test()
