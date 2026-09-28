# Vidya Architecture

```
+-------------------------------------------------------------+
|                      React (Vite) UI                        |
|   (Mastery Map, Adaptive Question View, Trace Inspector)   |
+------------------------------+------------------------------+
                               | REST / JSON
+------------------------------v------------------------------+
|                     FastAPI Backend                         |
|                                                             |
|  +---------------------+      +--------------------------+  |
|  |   selector.py       |      |         bkt.py           |  |
|  | (Prereq Gating &    |      | (Posterior & Transition  |  |
|  | Difficulty Control) |      |  Mastery State Engine)   |  |
|  +----------+----------+      +------------+-------------+  |
|             |                              |                |
|  +----------v----------+      +------------v-------------+  |
|  |      tutor.py       |      |         trace.py         |  |
|  |  (Gemini Explainer  |      |   (Structured Audit Log  |  |
|  |   & Multi-Modal)    |      |    & Failure Telemetry)  |  |
|  +---------------------+      +--------------------------+  |
|                                                             |
|  Storage & Data:                                            |
|   - SQLite (sessions, attempts, mastery, traces)            |
|   - concept_graph.json (curriculum DAG)                     |
|   - question_bank.json (MCQ items with hints)               |
+-------------------------------------------------------------+
```
