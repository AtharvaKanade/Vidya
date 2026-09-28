# AI Tools Disclosure

In compliance with BFWAI/HACK 26 guidelines and GEMINI.md Section 11, this document lists all AI tools, models, and assistants utilized during the design, development, evaluation, and runtime of Vidya.

---

## 1. Development & Coding Assistants
- **Google DeepMind Antigravity IDE / Gemini Agent**: Used for system architecture planning, code drafting, unit test generation, and documentation.
- **Claude Sonnet 4.6**: Used during initial requirements synthesis and design review.

## 2. Product Runtime Models & APIs
- **Google Gemini API (`gemini-1.5-flash`)**: Used strictly in `backend/app/tutor.py` for generating concise pedagogical explanations and dynamic practice questions based on Bayesian Knowledge Tracing (BKT) signals. The LLM has no authority over mastery state or concept progression decisions.

## 3. Libraries & Dependencies
- **FastAPI / Pydantic**: Backend framework and schema validation.
- **React + Vite + Tailwind CSS**: Frontend presentation.
- **pytest**: Backend test suite.
