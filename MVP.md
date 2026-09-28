# Vidya: MVP Build Guide

> An AI tutor that traces what a learner truly knows.
> Track: PS-03 Personalised AI Tutor for Learning AI | BFWAI/HACK 26
> Build window: 28 Sep to 1 Oct 2026, 11:59 PM IST (hard deadline, on Unstop)

---

## 0. What the MVP must prove (read this first)

The judges score: **Working system 30%, Output quality and tests 25%, Reliability 20%, Code quality and reproducibility 15%, Usability 10%** (final rubric), and the orientation deck says every submission must show **five fixed proofs**:

| # | Proof | How Vidya satisfies it |
|---|-------|------------------------|
| 1 | Baseline vs result | Pre-test vs post-test quiz score, plus YouTube-only control group |
| 2 | Own eval set | Question bank + simulated-learner tests + real-learner sessions, with numbers |
| 3 | Human approval line | Tutor asks the learner to self-rate when mastery signal is ambiguous |
| 4 | Trace, failures included | Every turn logged: response, BKT update, decision, reason. Failures flagged |
| 5 | One paragraph of context | Who it is for, where data came from, which objective parts it covers |

**Rule of thumb:** if a feature does not help one of these five proofs or the demo, cut it.

**README test:** if the project does not run from the README on a clean machine, it does not get reviewed. Treat the README as a feature.

---

## 1. MVP scope

### In scope (build these)
1. **3 topics, about 40 sub-concepts total**, as a hand-built concept graph (prerequisite edges).
   Suggested topics: (a) Neural networks basics, (b) Transformers and attention, (c) Prompting and RAG basics.
2. **Diagnostic**: 6 to 8 adaptive questions to seed initial mastery.
3. **BKT mastery engine** (pyBKT or your own 4-parameter implementation) per sub-concept.
4. **Next-step selector**: picks the weakest, unlocked sub-concept.
5. **LLM tutor**: generates explanation, then a practice question, at a level based on mastery.
6. **Re-explain rule**: after 2 wrong attempts on a concept, use a different explanation style (analogy, then worked example, then visual/step-by-step).
7. **Mastery map UI**: live view of all sub-concepts (locked, shaky, mastered).
8. **Self-rating fallback** (human approval line) when confidence is low.
9. **Session log and trace viewer** (JSON plus a simple page).
10. **Eval harness** (script that produces the numbers for the deck and README).

### Out of scope (do NOT build)
Auth and accounts (use a session ID), payments, voice, mobile app, multi-language, dashboards for teachers, more than 3 topics, fine-tuning any model, gamification.

---

## 2. Architecture (keep it boring)

```
React (Vite) frontend
   |  REST/JSON
FastAPI backend
   |-- concept_graph.json      (topics, sub-concepts, prerequisites)
   |-- question_bank.json      (questions with sub_concept, difficulty, answer, distractors)
   |-- bkt.py                  (mastery update, pyBKT or custom)
   |-- selector.py             (next sub-concept and difficulty decision)
   |-- tutor.py                (LLM prompts: explain, generate feedback, re-explain)
   |-- trace.py                (structured trace logging)
   |-- db (SQLite for MVP)     (sessions, attempts, mastery history)
   +-- eval/                   (eval scripts, simulated learners, results)
```

Decision: **use SQLite for the MVP**, not Postgres. It removes setup friction for the README test. Mention Postgres as the production path in the deck if asked.

### Suggested repo layout
```
vidya/
  README.md
  MVP.md
  GEMINI.md
  .env.example
  backend/
    app/ (main.py, bkt.py, selector.py, tutor.py, trace.py, models.py, db.py)
    data/ (concept_graph.json, question_bank.json)
    tests/
    requirements.txt
  frontend/
    src/ (App.jsx, components/, api.js)
    package.json
  eval/
    simulate_learners.py
    run_eval.py
    results/ (eval_results.json, failure_cases.md)
  docs/
    architecture.md
    ai_tools_disclosure.md
    context_note.md
    demo_script.md
```

---

## 3. Data model (minimum)

**concept_graph.json**
```json
{
  "topics": [{ "id": "nn", "name": "Neural networks basics" }],
  "concepts": [
    { "id": "nn_perceptron", "topic": "nn", "name": "Perceptron", "prereqs": [] },
    { "id": "nn_activation", "topic": "nn", "name": "Activation functions", "prereqs": ["nn_perceptron"] }
  ]
}
```

**question_bank.json**
```json
[{
  "id": "q_nn_act_01",
  "concept": "nn_activation",
  "difficulty": 1,
  "type": "mcq",
  "question": "Why do we need non-linear activation functions?",
  "options": ["...", "...", "...", "..."],
  "answer_index": 2,
  "explanation_hint": "Without them, stacked layers collapse into one linear map."
}]
```
Target: **at least 5 questions per sub-concept across 3 difficulty levels** (about 200 total). Generate a draft with an LLM, then **manually review every question** for correctness. Wrong questions ruin the mastery model.

**Tables (SQLite):** `sessions(id, created_at)`, `attempts(id, session_id, concept_id, question_id, correct, latency_ms, ts)`, `mastery(session_id, concept_id, p_known, updated_at)`, `traces(id, session_id, step, payload_json, ts)`.

---

## 4. Core algorithms

### 4.1 BKT update (per attempt)
Parameters per concept: `p_init` (0.2), `p_learn` (0.15), `p_slip` (0.1), `p_guess` (0.25).
```
if correct:  posterior = p*(1-slip) / (p*(1-slip) + (1-p)*guess)
else:        posterior = p*slip / (p*slip + (1-p)*(1-guess))
p_known_new = posterior + (1 - posterior) * p_learn
```
Mastered when `p_known >= 0.85`. Shaky when `0.4 <= p_known < 0.85`. Weak below 0.4.

### 4.2 Next-step selector
1. Candidates = concepts whose prereqs are all at `p_known >= 0.6` and which are not mastered.
2. Score = `(1 - p_known) * importance` (importance defaults to 1, higher for foundational nodes).
3. Pick highest score. Difficulty: `p_known < 0.4` gives level 1, `< 0.7` gives level 2, else level 3.
4. **Uncertainty rule (human approval line):** if the last 3 answers on a concept conflict (for example correct, wrong, correct) or `0.4 < p_known < 0.6` after 4+ attempts, ask the learner "How confident do you feel about X?" and blend the self-rating into `p_known` (weight 0.3). Log it as `flagged: true`.

### 4.3 Tutor loop (one turn)
1. Selector picks concept plus difficulty.
2. LLM generates a short explanation (skipped if the concept was just explained and the learner is progressing).
3. Serve a question from the bank (fallback: LLM-generated question, marked `generated: true`).
4. Learner answers, BKT updates, trace logged.
5. If wrong twice on the same concept, call LLM with a **different style** (analogy, then worked example, then step-by-step), and log `re_explained: true`.

### 4.4 LLM prompt rules
- Always pass: concept name, learner's current `p_known`, last 2 wrong answers, and the style to use.
- Ask for **short** output (under 120 words) and **JSON** when structure is needed.
- Never let the LLM decide mastery. **The BKT engine decides; the LLM only explains.** This is the core technical-depth story.

---

## 5. Step-by-step build plan

Time is tight (4 days). Each day has a hard exit criterion. Do not move on until it is met.

### Day 1: Mon 28 Sep. Foundation and data
- [ ] Create GitHub repo with the layout above. First commit today (judges check regular commits).
- [ ] Write `.env.example` and a minimal README with setup steps (expand it daily).
- [ ] Build `concept_graph.json` (about 40 concepts, with prereqs). Draw it on paper first.
- [ ] Generate a draft `question_bank.json` with an LLM, then hand-review. Aim for 120+ reviewed questions by end of day, 200 by Day 2.
- [ ] FastAPI skeleton: `/session/start`, `/session/{id}/next`, `/session/{id}/answer`, `/session/{id}/mastery`, `/session/{id}/trace`.
- [ ] Implement `bkt.py` with unit tests (known inputs give known outputs).
- **Exit criterion:** you can call the API from curl, answer 5 questions, and see `p_known` change correctly.

### Day 2: Tue 29 Sep. Tutor brain (mentor session today, bring blockers)
- [ ] `selector.py` with prerequisite gating and difficulty rule, plus tests.
- [ ] `tutor.py`: explanation generator and re-explain styles. Add a **response cache** and a **fallback text** if the API fails (reliability score).
- [ ] `trace.py`: every step writes a structured record (input, BKT before/after, decision, reason, latency, error if any).
- [ ] Implement the uncertainty rule and self-rating endpoint.
- [ ] Finish the question bank (200 reviewed).
- [ ] Attend the mentor session; bring specific blockers.
- **Exit criterion:** a full 20-question session runs via API with sensible topic progression and a complete trace.

### Day 3: Wed 30 Sep. Frontend and eval
- [ ] React app: start screen (pick topic), diagnostic, tutor screen (explanation, question, feedback), **mastery map** (colored grid or graph), self-rating popup.
- [ ] Trace viewer page (table of steps, failures highlighted in red).
- [ ] `eval/simulate_learners.py`: 30 synthetic learners with known hidden mastery (see Section 6).
- [ ] Recruit 8 to 15 real learners (classmates, WhatsApp group). Book their sessions for Day 3 evening and Day 4 morning.
- [ ] Deploy backend and frontend (Render, Railway, or Fly for backend; Vercel or Netlify for frontend). Deploy **today**, not on Day 4.
- **Exit criterion:** a stranger can open the deployed link and finish a session without help.

### Day 4: Thu 1 Oct. Evidence and submission (deadline 11:59 PM, target 6 PM)
- [ ] Run real-learner sessions (pre-test, Vidya session, post-test). Collect numbers.
- [ ] Run `eval/run_eval.py`, save `results/eval_results.json` and `failure_cases.md` (include real failures, honesty scores better than hiding them).
- [ ] Record the 3-minute demo video (script in Section 8).
- [ ] Finish README, `ai_tools_disclosure.md`, `context_note.md`.
- [ ] Build the final 10-slide presentation (problem, approach, solution, features, tech stack, architecture, results, demo, failures, next steps).
- [ ] **README test:** clone into a fresh folder or ask a friend to run it. Fix everything that breaks.
- [ ] Check every link in a private/incognito window. Make repo public.
- [ ] Submit on Unstop (repo, demo video, presentation). Screenshot the confirmation.
- **Exit criterion:** submission confirmed on Unstop before 8 PM. Use the remaining time as buffer, not as build time.

---

## 6. Evaluation plan (this creates your five proofs)

### 6.1 Real-learner study (baseline vs result)
1. **Pre-test:** 10 questions across the target sub-concepts (not from the tutor's own question pool; keep a held-out set of 20).
2. **Control condition** (about 5 learners): watch one standard YouTube explainer on the topic (about 10 min), then take the post-test. This is the baseline.
3. **Vidya condition** (about 10 learners): 15 to 20 min Vidya session, then the same post-test.
4. Report: mean pre score, mean post score, delta, per condition. Be honest with small-N caveats.

The deck template says baseline about 38% and target 65%+. **Treat those as targets, not results.** Replace with your real measured numbers. Fabricated numbers will be caught since judges rerun evals.

### 6.2 Simulated-learner eval (fast and repeatable)
- Create 30 synthetic learners with hidden true mastery per concept and slip/guess noise.
- Run each through Vidya's loop for 25 questions.
- Metrics: **mastery estimation error** (mean absolute error between `p_known` and true mastery), **questions-to-mastery**, **correct-difficulty rate**, **re-explain trigger rate**.
- Compare against a **fixed-syllabus baseline** (same questions, fixed order) to show adaptivity helps.

### 6.3 Failure log
Record at least 5 real failures, for example: wrong question in bank, LLM gave a misleading explanation, BKT overconfident after lucky guesses, API timeout. For each: what happened, why, what you changed or would change.

---

## 7. Required submission package checklist

- [ ] Working project (deployed link, or runs from README)
- [ ] GitHub repo (public, setup steps, regular commits, eval numbers in README)
- [ ] 3-minute demo video (YouTube unlisted or Drive with open link access)
- [ ] 10-slide presentation (max 10)
- [ ] Baseline vs result (measured)
- [ ] Eval set plus test examples with numbers
- [ ] Failure trace (including where it broke)
- [ ] Approval line plus context note (one paragraph)
- [ ] AI tool disclosure (every tool and API used, including Claude/Gemini/Antigravity/Cursor)
- [ ] Rules: no real personal data (use anonymous session IDs only); build during the challenge; numbers are real

---

## 8. Demo video script (3 minutes)

| Time | Show | Say |
|------|------|-----|
| 0:00 to 0:20 | Problem | "Self-taught AI learners can't tell if they actually understood." |
| 0:20 to 0:50 | Diagnostic and mastery map | "Vidya builds a live map of what you know." |
| 0:50 to 1:40 | Tutor loop: wrong answer, re-explain in new style, right answer, map turns green | "It changes how it explains, not just what." |
| 1:40 to 2:05 | Self-rating prompt | "When unsure, it asks instead of guessing." |
| 2:05 to 2:40 | Eval results and trace viewer with a red failure | "Here are our numbers, and where it broke." |
| 2:40 to 3:00 | Close | "BKT decides mastery, the LLM only explains. Reproducible from the README." |

Record in one take, screen plus voice, 1080p. Rehearse twice.

---

## 9. Risk register

| Risk | Mitigation |
|------|-----------|
| LLM API fails or is slow during demo | Cache explanations, keep fallback text, pre-warm before recording |
| Bad questions in the bank | Human review of every question; log reports of wrong questions |
| Can't recruit enough learners | Lean on the simulated eval plus a smaller real study; state N honestly |
| Deployment breaks on Day 4 | Deploy on Day 3; keep local-run instructions in README |
| Scope creep | Anything not in Section 1 "In scope" is a no |
| Running out of time | Day exit criteria are gates; cut the trace viewer polish before cutting eval |
| API key leak | `.env` in `.gitignore`, only `.env.example` committed |

---

## 10. Cut list (if you fall behind, drop in this order)
1. Trace viewer page (keep the raw JSON trace file)
2. Third topic (ship with 2)
3. Graph-style mastery map (use a simple colored grid)
4. Real-learner control group (keep Vidya group with pre/post plus simulated baseline)

**Never cut:** BKT engine, the eval numbers, failure log, README, demo video.
