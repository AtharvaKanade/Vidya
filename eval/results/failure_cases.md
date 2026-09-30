# Vidya — Failure Modes & Telemetry Log
> **Proof #4 / Evaluation:** Real and systemic failure modes observed during testing and their automated architectural mitigations.

| # | Failure Mode | Root Cause | Impact | Automated Architectural Mitigation |
|---|---|---|---|---|
| 1 | **Lucky Guess Drift** | Student with low latent knowledge guesses correctly twice on 4-option MCQ ($P(G)=0.25$). | BKT posterior jumps artificially high before concept is truly known. | Uncertainty Rule (Human Approval Line): If answers conflict or latency is abnormally fast, self-rating modal verifies confidence. |
| 2 | **Misleading LLM Hallucination** | LLM generating live explanations introduces inaccurate mathematical definitions. | Distorts student conceptual model. | Response Caching & Curated Fallbacks: Explanations are cached per concept/style; fallback templates provide vetted definitions if LLM deviates. |
| 3 | **Prerequisite Deadlock** | Student stuck on a foundational concept below 0.60 threshold. | Downstream concepts remain locked, causing repetitive questioning. | Style Rotation: Consecutive errors trigger automatic rotation (Intuition → Analogy → Worked Example → Step-by-Step). |
| 4 | **API Rate Limit / Network Drop** | External Gemini LLM call times out or encounters quota limits. | UI latency freeze or crash. | Non-blocking Failover: `tutor.py` catches exceptions and instantly returns verified localized explanation templates without failing the request. |
| 5 | **Overconfident Slip Penalty** | Advanced student misclicks or typos on a known concept ($P(S)=0.10$). | Unnecessary demotion to lower difficulty. | BKT Bayesian smoothing: single slip reduces $P(K)$ moderately rather than resetting progress, recovering in 1 subsequent correct answer. |
