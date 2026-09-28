# GEMINI.md: Agent Guidelines for Vidya

This file tells every AI agent working in this repo (Antigravity, Gemini, or any other) how to behave. **Read this file and `MVP.md` in full before doing anything.** If a request conflicts with this file, stop and ask the human.

---

## 1. Project in one paragraph

Vidya is an AI tutor for learning AI/ML. A **Bayesian Knowledge Tracing (BKT)** engine tracks per-concept mastery from every answer; a selector picks the next concept and difficulty; an **LLM only explains and phrases** (it never decides mastery). Built for BFWAI/HACK 26, PS-03. **Hard deadline: 1 Oct 2026, 11:59 PM IST.** Scoring: working system 30%, output quality and tests 25%, reliability 20%, code quality and reproducibility 15%, usability 10%.

## 2. Non-negotiable principles

1. **BKT decides, the LLM explains.** Never move mastery logic into a prompt.
2. **Reproducible from the README.** If it will not run on a clean machine from the README, the project is not reviewed. Every change that adds a dependency or env var must update the README and `.env.example` in the same change.
3. **Real numbers only.** Never invent, round up, or hard-code eval results. Results must come from scripts in `eval/` that write to `eval/results/`. Failures are reported honestly; honest failure reporting scores better than hiding it.
4. **No real personal data.** Sessions use anonymous IDs. No names, emails, or phone numbers in the DB, logs, or fixtures.
5. **No secrets in git.** Keys live in `.env` (gitignored). Only `.env.example` is committed. If you see a key in a diff, stop and tell the human.
6. **Scope is fixed.** Only build what is in the "In scope" list in `MVP.md`. Do not add auth, payments, voice, extra topics, or gamification. Suggest, do not build.
7. **Small, regular commits.** Judges check commit history made during the build window (28 Sep to 1 Oct).

## 3. Tech stack (do not swap without human approval)

| Layer | Choice |
|-------|--------|
| Backend | Python 3.11+, FastAPI, Pydantic |
| Mastery | pyBKT or the custom BKT in `backend/app/bkt.py` |
| DB | SQLite (MVP) |
| LLM | Gemini API by default, behind a provider interface so it can be swapped |
| Frontend | React + Vite, plain CSS or Tailwind |
| Tests | pytest (backend), a smoke test script for the API |
| Deploy | Backend on Render/Railway/Fly, frontend on Vercel/Netlify |

## 4. Repo map and ownership

```
backend/app/     bkt.py, selector.py, tutor.py, trace.py, models.py, db.py, main.py
backend/data/    concept_graph.json, question_bank.json   (human-reviewed data)
backend/tests/   pytest tests
frontend/src/    App.jsx, components/, api.js
eval/            simulate_learners.py, run_eval.py, results/
docs/            architecture.md, ai_tools_disclosure.md, context_note.md, demo_script.md
```

- **Do not edit** `backend/data/question_bank.json` answers or `concept_graph.json` edges without flagging it for human review. Wrong questions corrupt the mastery model.
- **Do not edit** anything in `eval/results/` by hand.

## 5. Working process for every task

1. **Restate** the task in one or two lines and name which `MVP.md` section it serves. If it is not in scope, stop.
2. **Plan** briefly: files to touch, tests to add. For anything touching more than 3 files, write the plan in the task thread and wait for approval.
3. **Implement** in small steps. Keep functions short, typed, and documented.
4. **Test** before claiming done: run pytest and the relevant smoke test. Show the output.
5. **Update docs** if behavior, setup, or env vars changed (README, `.env.example`, `docs/`).
6. **Commit** with a clear message (see Section 8).
7. **Report** what changed, what was tested, and what is still unverified. Never say "done" if a test was skipped.

## 6. Coding standards

- Python: type hints everywhere, `ruff` clean, docstrings on public functions, no bare `except`.
- Pure functions for BKT and selector (no I/O inside), so they are easy to test.
- Every external call (LLM, DB) has a timeout, a retry (max 2), and a **fallback** so a demo never hard-crashes.
- Config through env vars only. No hard-coded URLs, keys, or paths.
- Frontend: functional components, no unused dependencies, show loading and error states for every API call.
- Log with the structured `trace.py` helper, not `print`.

## 7. Required tests (minimum)

- `bkt.py`: known inputs give known outputs; correct answers raise `p_known`, wrong answers lower it; values stay in [0, 1].
- `selector.py`: never returns a concept with unmet prerequisites; picks the lowest-mastery unlocked concept; difficulty matches the thresholds; triggers the self-rating rule on conflicting answers.
- API: start session, next, answer, mastery, trace all return valid shapes.
- `tutor.py`: with the LLM mocked, the fallback path returns usable text; re-explain uses a different style after 2 wrong attempts.
- Data validation: every question maps to an existing concept; every concept has at least 5 questions; every `answer_index` is valid; no cycles in prerequisites.

## 8. Git rules

- Branch per feature: `feat/<short-name>`, `fix/<short-name>`. Merge to `main` only with passing tests.
- Commit format: `type(scope): summary`, for example `feat(bkt): add mastery update with tests`.
- Never force-push `main`. Never rewrite history during the build window.
- Commit at least a few times per day; do not batch everything into one final commit.

## 9. LLM usage rules (inside the product)

- The tutor prompt receives: concept name, current `p_known`, last two wrong answers, and the required explanation style. Nothing else about the learner.
- Output limit: about 120 words. Ask for JSON where structure is needed and validate it.
- Style rotation on repeated failure: analogy, then worked example, then step-by-step.
- Any LLM-generated question must be marked `generated: true` in the trace and is never used for eval scoring.
- Cache explanations by `(concept, style, difficulty)` to cut latency and cost.

## 10. Guardrails: when to stop and ask the human

Stop and ask before you:
- add or remove a dependency, or change the stack;
- change the data model or API contract;
- edit question answers or concept prerequisites;
- delete files or rewrite large sections;
- run anything that costs money or sends data to a new external service;
- touch deployment settings, keys, or the public repo visibility;
- make any claim about results you did not measure.

If you are unsure, ask. A short question is cheaper than a broken demo.

## 11. AI tool disclosure (mandatory)

Every tool, model, and API used in building or running Vidya must be listed in `docs/ai_tools_disclosure.md` (for example Antigravity, Gemini, Claude, Cursor, pyBKT, hosting services). When an agent contributes substantial code or content, note it in the commit message or the disclosure file. Do not hide AI assistance.

## 12. Definition of done (per feature)

A feature is done only when: code merged, tests pass, README/docs updated, trace logging covers it, error and fallback paths exist, and it works on the deployed build, not just locally.

## 13. Final-day checklist (agents help verify, human submits)

- [ ] `README.md` setup works on a clean clone
- [ ] `.env.example` complete, no secrets committed
- [ ] `eval/run_eval.py` reproduces the numbers in the README
- [ ] `failure_cases.md` contains real failures
- [ ] Deployed link works in a private window
- [ ] Repo is public (or access shared); demo video link opens without login
- [ ] `docs/ai_tools_disclosure.md` complete
- [ ] Presentation is 10 slides or fewer
- [ ] Human has submitted on Unstop before the deadline
