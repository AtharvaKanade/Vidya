# Vidya Architecture & Technical Specification

Vidya is an adaptive AI tutoring platform designed for AI/ML concepts (covering Neural Networks, Transformers, and Retrieval-Augmented Generation). It integrates a mathematically grounded **Bayesian Knowledge Tracing (BKT)** engine with an LLM explainer that operates strictly within pedagogical boundaries: **BKT decides mastery; the LLM only explains.**

---

## 1. High-Level Architecture

```
+-----------------------------------------------------------------------------------+
|                                 React (Vite) UI                                   |
|   +-------------------+  +------------------------+  +------------------------+   |
|   |  Mastery DAG Map  |  |  Adaptive Practice UI  |  |  Trace Audit Inspector |   |
|   +---------+---------+  +-----------+------------+  +-----------+------------+   |
+-------------|------------------------|---------------------------|----------------+
              |                        | REST / JSON               |
+-------------v------------------------v---------------------------v----------------+
|                             FastAPI Backend Service                               |
|                                                                                   |
|  +---------------------------+             +-----------------------------------+  |
|  |     selector.py           |             |              bkt.py               |  |
|  | - Prerequisite DAG Gating |             | - Bayesian Posterior Update       |  |
|  | - Priority Scoring        |             | - Knowledge State Transitions     |  |
|  | - Target Difficulty Match |             | - Mastery Level Thresholding      |  |
|  | - Human Calibration Check |             +-----------------+-----------------+  |
|  +-------------+-------------+                               |                    |
|                |                                             |                    |
|  +-------------v-------------+             +-----------------v-----------------+  |
|  |         tutor.py          |             |             trace.py              |  |
|  | - Gemini 2.0 Flash API    |             | - Structured JSON Event Logging   |  |
|  | - Prompt Sandbox          |             | - Telemetry & Failure Capture     |  |
|  | - Style Rotation Fallback |             | - Audit Trail Persistence         |  |
|  | - In-Memory Cache         |             +-----------------+-----------------+  |
|  +-------------+-------------+                               |                    |
|                |                                             |                    |
|  +-------------v---------------------------------------------v-----------------+  |
|  |                             SQLite Database Layer                           |  |
|  |           (sessions, attempts, mastery_states, audit_traces)                |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  Static Curriculum Datasets:                                                      |
|   - backend/data/concept_graph.json (40 Concepts across NN, Transformers, RAG)    |
|   - backend/data/question_bank.json (120 Calibrated Question Items with Hints)    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1. Bayesian Knowledge Tracing Engine (`backend/app/bkt.py`)
Tracks latent knowledge state $P(L_t) \in [0, 1]$ representing the probability that the learner has mastered concept $k$ after attempt $t$.

#### Mathematical Formulation:
1. **Observation Update (Posterior Calculation):**
   - If response is **Correct** ($obs = 1$):
     $$P(L_{t-1} \mid \text{correct}) = \frac{P(L_{t-1}) \cdot (1 - P(S))}{P(L_{t-1}) \cdot (1 - P(S)) + (1 - P(L_{t-1})) \cdot P(G)}$$
   - If response is **Incorrect** ($obs = 0$):
     $$P(L_{t-1} \mid \text{incorrect}) = \frac{P(L_{t-1}) \cdot P(S)}{P(L_{t-1}) \cdot P(S) + (1 - P(L_{t-1})) \cdot (1 - P(G))}$$

2. **Transition Update (Learning between turns):**
   $$P(L_t) = P(L_{t-1} \mid obs) + \big(1 - P(L_{t-1} \mid obs)\big) \cdot P(T)$$

#### Calibrated Parameter Values:
- $P(L_0) = 0.10$ (Initial prior knowledge)
- $P(T) = 0.15$ (Transition / learning rate probability)
- $P(S) = 0.10$ (Slip rate: knows concept, but made careless mistake)
- $P(G) = 0.25$ (Guess rate: doesn't know concept, but guessed 4-option MCQ correctly)

#### Mastery Level Thresholds:
- **Novice:** $P(L_t) < 0.40$ (Target difficulty: `easy`)
- **Practicing:** $0.40 \le P(L_t) < 0.75$ (Target difficulty: `medium`)
- **Proficient:** $0.75 \le P(L_t) < 0.90$ (Target difficulty: `hard`)
- **Mastered:** $P(L_t) \ge 0.90$ (Concept considered fully mastered)

---

### 2.2. Prerequisite-Gated Adaptive Selector (`backend/app/selector.py`)
Selects the next optimal concept and difficulty using curriculum DAG traversal and priority scoring:

1. **Prerequisite Gating:** A concept $C$ is unlocked if and only if all predecessor concepts $P \in \text{prerequisites}(C)$ satisfy:
   $$P(L_t)_{P} \ge 0.70$$
2. **Priority Scoring:** Unlocked, unmastered concepts are ranked by priority:
   $$\text{Score}(C) = \text{importance}(C) \cdot \big(1.0 - P(L_t)_C\big)$$
   The concept with the highest score is selected.
3. **Difficulty Matching:** Question difficulty dynamically maps to current mastery tier (`easy`, `medium`, or `hard`).
4. **Human Approval Calibration Rule:** If learner shows erratic performance (e.g., alternating correct/incorrect answers with high response time variance or $0.40 \le P(L_t) \le 0.70$ over $\ge 3$ attempts), `needs_self_rating` is flagged.

---

### 2.3. LLM Remediation & Explanation Engine (`backend/app/tutor.py`)
The LLM generates context-aware pedagogical explanations without touching the mastery state.

- **Model:** Google Gemini API (`gemini-2.0-flash`), encapsulated behind a modular interface with timeouts, retries, and offline deterministic fallbacks.
- **Strict Prompt Sandboxing:** The model prompt contains only concept metadata, current $P(L_t)$, the specific question, selected option, and target style.
- **Style Rotation on Struggle:**
  - 1st failure: Direct clarification with hint.
  - 2nd failure: Intuitive **Analogy**.
  - 3rd failure: **Worked Example** with step-by-step breakdown.
  - 4th+ failure: Deep **Step-by-Step** foundational walkthrough.
- **Multi-Level Caching:** Explanations are cached by `(concept_id, question_id, style, is_correct)` to minimize latency and API consumption.

---

### 2.4. Human Approval Line / Self-Rating Blending (`/session/{id}/self-rate`)
When triggered by the uncertainty gate or initiated by the learner:
- Learner submits a subjective rating $R \in [1, 5]$.
- Normalized rating: $R_{\text{norm}} = \frac{R - 1}{4} \in [0.0, 1.0]$.
- Blended posterior calculation:
  $$P(L_t)_{\text{blended}} = 0.70 \cdot P(L_t) + 0.30 \cdot R_{\text{norm}}$$
- Audit trace logs the blending event and reason.

---

### 2.5. Structured Trace & Audit Engine (`backend/app/trace.py`)
All learner actions, selector choices, BKT parameter transitions, LLM calls, and calibration events are logged as structured JSON objects:

```json
{
  "step": 4,
  "ts": "2026-09-30T14:15:22.120Z",
  "action": "answer_attempt",
  "payload": {
    "concept_id": "backprop",
    "question_id": "backprop_02",
    "correct": false,
    "p_known_before": 0.352,
    "p_known_after": 0.221,
    "mastery_level": "novice",
    "re_explain": true,
    "explanation_style": "analogy"
  },
  "flagged": true
}
```

---

## 3. Database Schema (`SQLite`)

- `sessions`: `(session_id TEXT PRIMARY KEY, topic TEXT, created_at TEXT)`
- `mastery`: `(session_id TEXT, concept_id TEXT, p_known REAL, updated_at TEXT, PRIMARY KEY (session_id, concept_id))`
- `attempts`: `(attempt_id TEXT PRIMARY KEY, session_id TEXT, concept_id TEXT, question_id TEXT, correct INTEGER, latency_ms INTEGER, ts TEXT)`
- `traces`: `(id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, step INTEGER, payload TEXT, ts TEXT)`

---

## 4. REST API Contract

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | `GET` | Service status and version check |
| `/session/start` | `POST` | Initialize anonymous learning session (optional topic filter) |
| `/session/{id}/next` | `GET` | Next unlocked concept, difficulty, practice item, and uncertainty flag |
| `/session/{id}/answer` | `POST` | Process learner answer, update BKT posterior, determine remediation |
| `/session/{id}/explain` | `POST` | Request adaptive explanation in specific style (`analogy`, `worked_example`, etc.) |
| `/session/{id}/self-rate` | `POST` | Submit human self-rating and blend into BKT posterior |
| `/session/{id}/mastery` | `GET` | Full curriculum DAG mastery states and levels |
| `/session/{id}/trace` | `GET` | Complete chronological structured audit log for session |
