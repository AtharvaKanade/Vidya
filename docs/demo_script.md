# Vidya: 3-Minute Demo Video Script & Walkthrough

This script provides a 3-minute demonstration plan for hackathon judges, showcasing Vidya's core strengths: Bayesian Knowledge Tracing, prerequisite gating, multi-style LLM explanations, human calibration, and transparent audit logging.

---

## Timing & Demonstration Flow

| Time | Screen / UI Focus | Presenter Voiceover / Action | Key Technical Concept |
|---|---|---|---|
| **0:00 - 0:25** | **Home / Topic Selection**<br>Showing Topic Cards (Neural Networks, Transformers, RAG, All Topics) | *"Welcome to Vidya — an adaptive AI tutor for AI/ML engineering. Most AI learners face the 'illusion of competence', recognizing terms without genuine mastery. Vidya solves this by decoupling mastery decisions from LLM explanations using Bayesian Knowledge Tracing."* | Problem statement & Core architectural separation |
| **0:25 - 0:55** | **Curriculum Mastery DAG Map**<br>Visualizing the 40-node DAG with real-time mastery color tags (Novice, Practicing, Proficient, Mastered) | *"Here is our live Curriculum Graph. Notice how downstream Transformer nodes like Multi-Head Attention and LayerNorm are locked until foundational prerequisites like Matrix Multiplication and Softmax reach a 0.70 mastery threshold."* | Prerequisite gating & DAG progression |
| **0:55 - 1:40** | **Adaptive Practice & BKT Update**<br>Answer question correctly $\to$ watch $P(L_t)$ rise. Then intentionally answer wrong $\to$ watch $P(L_t)$ drop and re-explanation trigger | *"Let's solve a question. Notice when we answer correctly, the BKT engine updates $P(L_t)$ upwards from 0.10 to 0.46, upgrading the state from Novice to Practicing. Now let's test a misconception: answering incorrectly drops $P(L_t)$, and after 2 errors, Vidya automatically triggers a pedagogical remediation cycle — first with an intuitive analogy, then a worked example."* | BKT posterior formula, Slip/Guess modeling, Style rotation |
| **1:40 - 2:10** | **Human Approval Line (Self-Rating Modal)**<br>Click 'Calibrate Mastery' or trigger uncertainty gate | *"When learner performance oscillates or posterior uncertainty is high, Vidya invokes a Human Approval Line. The learner rates their confidence on a 1-to-5 scale, which is mathematically blended with the BKT posterior (70% BKT + 30% human rating), avoiding blind AI overconfidence."* | Human-in-the-loop Bayesian blending |
| **2:10 - 2:40** | **Audit Trace Inspector & Telemetry**<br>Switch to Trace Inspector tab; click through steps and view raw JSON payloads | *"Every interaction is logged to a structured, reproducible audit trail. We can inspect every transition probability, latency, LLM prompt token, cache hit, and fallback activation in real time without any hidden telemetry."* | Reproducibility, structured audit logging, telemetry |
| **2:40 - 3:00** | **Evaluation & Conclusion**<br>Terminal running `python eval/run_eval.py` showing MAE and difficulty metrics | *"In synthetic benchmarks across 30 learners and 750 turns, Vidya achieves a 100% difficulty appropriateness rate with proven latent state convergence. Built with FastAPI, SQLite, and React, completely reproducible from the README. Thank you!"* | Empirical evaluation & Reproducibility |

---

## Demo Step-by-Step Checklist for Presenter

1. **Terminal 1**: Ensure backend is running (`uvicorn backend.app.main:app --reload --port 8000`).
2. **Terminal 2**: Ensure frontend is running (`npm run dev` on port 5173).
3. **Browser**: Open `http://localhost:5173` in a fresh window.
4. **Step 1**: Start a session with **Topic: Neural Networks** or **Transformers**.
5. **Step 2**: Show the **Mastery Map** tab; explain node status and locked prerequisites.
6. **Step 3**: Switch to **Practice**; answer 1 question correctly $\to$ observe $P(L_t)$ bar change.
7. **Step 4**: Answer a question incorrectly $\to$ observe dynamic explanation appear; click "Analogy", "Worked Example", or "Step-by-Step" buttons to show style rotation.
8. **Step 5**: Click **"Calibrate Mastery"** to show the Self-Rating modal $\to$ submit a rating and note the blended update.
9. **Step 6**: Switch to **Trace Inspector** tab $\to$ expand recent events to show complete transparency.
10. **Step 7**: Show terminal execution of `python eval/run_eval.py` reproducing empirical benchmark tables.
