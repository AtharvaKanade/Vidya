# Vidya: AI Tutor for Learning AI/ML

> An AI tutor powered by Bayesian Knowledge Tracing (BKT) that traces what a learner truly knows.
> Built for BFWAI/HACK 26 (Track PS-03).
> **Core Principle:** BKT decides mastery, the LLM only explains.

---

## 1. Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Git

### Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```
4. Run backend tests:
   ```bash
   pytest backend/tests
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   API Docs available at: `http://localhost:8000/docs`

### Frontend Setup
1. Navigate to frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 2. Project Architecture
```
backend/
  app/           # bkt.py, selector.py, tutor.py, trace.py, models.py, db.py, main.py
  data/          # concept_graph.json, question_bank.json
  tests/         # unit and integration tests
frontend/
  src/           # React + Vite + Tailwind CSS application
eval/            # simulate_learners.py, run_eval.py, results/
docs/            # architecture, ai tools disclosure, context note, demo script
```

---

## 3. Evaluation & Reproducibility
To run synthetic learner simulations and evaluate mastery tracking:
```bash
python eval/run_eval.py
```
Outputs are written to `eval/results/eval_results.json`.

---

## 4. License & Disclosure
See `docs/ai_tools_disclosure.md` for disclosure of all AI tools and models utilized during development.
