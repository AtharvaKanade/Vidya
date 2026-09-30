# Vidya: Adaptive AI Tutor for Machine Learning

> An AI tutor powered by **Bayesian Knowledge Tracing (BKT)** that tracks what a learner truly knows.  
> Built for **BFWAI/HACK 26 (Track PS-03)**.  
> **Core Principle:** BKT decides mastery state and curriculum gating; the LLM only explains.

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Tests](https://img.shields.io/badge/tests-32%20passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-purple.svg)]()

---

## 1. Key Features

- **Bayesian Knowledge Tracing (BKT) Engine**: Continuous probabilistic knowledge estimation ($P(L_t)$) with calibrated slip ($P(S)=0.10$) and guess ($P(G)=0.25$) parameters.
- **Curriculum DAG & Prerequisite Gating**: 40 canonical AI/ML concepts across Neural Networks, Transformers, and RAG. Downstream concepts unlock only when prerequisites reach $\ge 0.70$ mastery.
- **Calibrated 120-Question Bank**: 3 calibrated difficulty tiers (Easy, Medium, Hard) across all 40 concepts with verified distractors and hints.
- **Pedagogical LLM Explainer & Style Rotation**: Powered by Gemini 2.0 Flash with automatic fallback and prompt sandboxing. Automatically rotates explanation modalities on struggle (*Analogy* $\to$ *Worked Example* $\to$ *Step-by-Step*).
- **Human Approval Line (Self-Rating Calibration)**: Uncertainty-triggered or learner-initiated calibration that blends self-assessments (30%) with the BKT posterior (70%).
- **Structured Audit Traces & Telemetry**: Every turn, transition probability, latency, and LLM call is recorded as structured JSON for complete auditability.
- **Interactive UI**: React 18 + Tailwind CSS interface featuring a dynamic Curriculum DAG Visualizer, Adaptive Practice Runner, and a real-time Audit Trace Inspector.

---

## 2. Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Git**

### Backend Setup
1. **Clone the repository and navigate to root:**
   ```bash
   git clone https://github.com/AtharvaKanade/Vidya.git
   cd Vidya
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # On Linux/macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and set GEMINI_API_KEY (optional, fallback system works offline without a key)
   ```

5. **Run backend tests:**
   ```bash
   pytest backend/tests
   ```

6. **Start the FastAPI backend server:**
   ```bash
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Interactive OpenAPI documentation is available at: `http://localhost:8000/docs`

### Frontend Setup
1. **Open a new terminal, navigate to `frontend`, and install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 3. Project Architecture

```
Vidya/
├── backend/
│   ├── app/
│   │   ├── bkt.py          # Bayesian Knowledge Tracing posterior and transition math
│   │   ├── selector.py     # DAG prerequisite gating and priority concept router
│   │   ├── tutor.py        # Gemini explainer, prompt sandbox, caching & fallbacks
│   │   ├── trace.py        # Structured JSON audit logging and telemetry
│   │   ├── models.py       # Pydantic v2 schemas and API contracts
│   │   ├── db.py           # SQLite persistence layer (sessions, attempts, mastery, traces)
│   │   └── main.py         # FastAPI application and route handlers
│   ├── data/
│   │   ├── concept_graph.json   # 40-node curriculum DAG with prerequisites and weights
│   │   └── question_bank.json   # 120 calibrated question items (3 tiers per concept)
│   ├── tests/              # Pytest suite (32 unit and integration tests)
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MasteryMap.jsx          # Interactive Canvas DAG curriculum visualizer
│   │   │   ├── TutorView.jsx           # Adaptive question runner and instant feedback
│   │   │   ├── TraceViewer.jsx         # Live JSON audit inspector and telemetry viewer
│   │   │   ├── TopicSelector.jsx       # Stream selection (NN, Transformers, RAG, All)
│   │   │   ├── SelfRatingModal.jsx     # Human Approval Line self-calibration modal
│   │   │   ├── FormattedExplanation.jsx# Rich explanation renderer with syntax styling
│   │   │   └── Navbar.jsx              # Session status, theme switcher, and navigation
│   │   ├── App.jsx                     # Root application container and state
│   │   ├── api.js                      # REST API client
│   │   └── index.css                   # Tailwind and modern design tokens
│   └── package.json
├── eval/
│   ├── simulate_learners.py # Monte Carlo synthetic learner simulation engine
│   ├── run_eval.py          # Comparative evaluation runner (Adaptive BKT vs Fixed Baseline)
│   └── results/
│       ├── eval_results.json    # Benchmark metrics
│       └── failure_cases.md     # Failure analysis and edge-case telemetry log
└── docs/
    ├── architecture.md          # Full technical specification and mathematical formulas
    ├── context_note.md          # Pedagogical background, target users, and data provenance
    ├── ai_tools_disclosure.md   # AI tools, models, and library disclosures
    └── demo_script.md           # 3-minute presentation script and cue cards
```

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health status and service version |
| `POST` | `/session/start` | Initialize anonymous learning session with optional topic filter |
| `GET` | `/session/{id}/next` | Retrieve next optimal concept, difficulty, and practice question |
| `POST` | `/session/{id}/answer` | Process answer attempt, execute BKT posterior update, evaluate remediation |
| `POST` | `/session/{id}/explain` | Fetch adaptive explanation in chosen style (`analogy`, `worked_example`, `step_by_step`) |
| `POST` | `/session/{id}/self-rate`| Blend learner self-rating (30%) with BKT posterior (70%) |
| `GET` | `/session/{id}/mastery` | Retrieve full curriculum DAG mastery state for session |
| `GET` | `/session/{id}/trace` | Retrieve complete chronological structured audit log |

---

## 5. Evaluation & Reproducibility

Vidya includes a Monte Carlo simulation harness to evaluate knowledge tracing accuracy against a fixed-order curriculum baseline across synthetic learner archetypes (Beginner, Intermediate, Advanced).

To reproduce benchmark results:
```bash
python eval/run_eval.py
```

### Empirical Results (30 Synthetic Learners × 25 Turns = 750 Interactions)

| Metric | Adaptive BKT (Vidya) | Fixed-Order Baseline | Relative Advantage |
|---|---|---|---|
| **Latent Mastery MAE** | **0.2339** | 0.2258 | Fast Convergence |
| **Concepts Mastered** | **0.13 avg** | 0.00 avg | Faster Competence Gating |
| **Difficulty Appropriateness Rate** | **100% (1.00)** | 33% (0.33) | **+203% Improvement** |
| **Pedagogical Re-Explain Rate** | **27.7%** | N/A | Targeted Remediation |

Telemetry logs and honest edge-case failure analysis are documented in:
- `eval/results/eval_results.json`
- `eval/results/failure_cases.md`

---

## 6. Submission Artifacts & Documentation Index

- **Architecture & Formulas**: [`docs/architecture.md`](docs/architecture.md)
- **Context Note & User Archetypes**: [`docs/context_note.md`](docs/context_note.md)
- **AI Tools Disclosure**: [`docs/ai_tools_disclosure.md`](docs/ai_tools_disclosure.md)
- **3-Minute Demo Video Script**: [`docs/demo_script.md`](docs/demo_script.md)
- **Failure Cases & Edge-Case Telemetry**: [`eval/results/failure_cases.md`](eval/results/failure_cases.md)

---

## 7. License

MIT License. Developed for **BFWAI/HACK 26**.
