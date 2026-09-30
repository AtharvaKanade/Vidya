# AI Tools Disclosure

In compliance with BFWAI/HACK 26 guidelines and GEMINI.md Section 11, this document provides a full and transparent disclosure of all AI tools, foundational models, agentic assistants, and development libraries used across the design, development, evaluation, and runtime of Vidya.

---

## 1. Development & Coding Assistants
- **Google DeepMind Antigravity IDE (Gemini Models)**:
  - Role: Architecture design, modular backend implementation (FastAPI, SQLite, BKT state transitions), React component creation, unit and integration test generation, and evaluation harness scripts.
  - Usage Window: September 28, 2026 – October 1, 2026.
- **Claude (Sonnet 3.5 / 3.7)**:
  - Role: Initial problem framing, pedagogical scenario modeling, and code review.

## 2. Product Runtime Models & APIs
- **Google Gemini API (`gemini-2.0-flash`)**:
  - Role: Real-time generation of contextual pedagogical explanations, analogies, worked examples, and step-by-step walkthroughs in `backend/app/tutor.py`.
  - **Strict Architectural Boundary**: The LLM acts exclusively as a communicator and explainer. It has **zero authority** over concept mastery scoring, curriculum progression, or difficulty adjustments. All state transitions are deterministically computed by the Bayesian Knowledge Tracing (BKT) engine in `backend/app/bkt.py`.
  - **Safety & Availability Guardrails**: 2-second external call timeout, max 2 retries with exponential backoff, in-memory caching to eliminate redundant tokens, and deterministic static fallback explanations to ensure 100% demo uptime even if API quotas or network connections drop.

## 3. Core Software Libraries & Tooling
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Uvicorn, SQLite3, pytest.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (icons), Canvas API (DAG graph rendering).
- **Evaluation Harness**: Synthetic learner simulation engine (`eval/simulate_learners.py`, `eval/run_eval.py`) for reproducible Monte Carlo BKT evaluation.

## 4. Dataset Provenance
- **Curriculum DAG (`backend/data/concept_graph.json`)**: 40 canonical machine learning concepts curated across Deep Learning Foundations, Transformers & Attention, and Modern Retrieval-Augmented Generation (RAG).
- **Calibrated Question Bank (`backend/data/question_bank.json`)**: 120 human-verified multiple-choice questions (3 difficulty tiers per concept) with pedagogical hints and verified single-answer indices.
