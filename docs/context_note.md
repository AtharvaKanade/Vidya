# Context Note: Vidya AI Tutor

**Track:** PS-03 (BFWAI/HACK 26)  
**System Name:** Vidya — Adaptive Bayesian AI Tutor for Machine Learning  
**Core Hypothesis:** Separating probabilistic knowledge estimation (BKT) from conversational generation (LLM) delivers mathematically grounded, hallucination-free adaptive tutoring that prevents the illusion of competence.

---

## 1. Who It Is For
Vidya is designed for **self-taught AI and ML engineers, researchers, and university students** navigating the dense conceptual landscape of modern AI: from foundational feedforward networks and backpropagation to Transformer self-attention mechanisms and Retrieval-Augmented Generation (RAG) architectures.

### The Problem: The "Illusion of Competence"
Self-directed learners frequently suffer from passive familiarity: they recognize buzzwords ("cross-entropy", "Q/K/V projections", "vector embeddings") from reading papers or watching videos, but cannot apply the principles or debug failures under rigorous testing. Standard LLM tutors exacerbate this by grading leniently, hallucinating mastery scores, or overwhelming users with generic text walls that do not address specific prerequisite gaps.

---

## 2. Where the Data Came From
The curriculum and question banks were curated and calibrated specifically for the AI/ML domain:
1. **Curriculum Concept Graph (`backend/data/concept_graph.json`):**
   - 40 concept nodes structured across 3 distinct topic streams:
     - **Topic 1: Neural Network Foundations** (`nn`): Linear regression, perceptron, activation functions, loss surfaces, backpropagation, optimizers, regularization, vanishing gradients.
     - **Topic 2: Transformers & Attention** (`transformers`): Self-attention, multi-head projections, positional encodings, layer norm, residual connections, causal masking, encoder-decoder paradigms.
     - **Topic 3: Retrieval-Augmented Generation** (`rag`): Chunking strategies, vector embeddings, cosine similarity search, re-ranking, context synthesis, hallucination mitigation.
   - Every node specifies human-curated prerequisite relationships, difficulty levels, and domain importance weights ($1.0 - 1.5$).
2. **Calibrated Question Bank (`backend/data/question_bank.json`):**
   - 120 multiple-choice items (3 calibrated items per concept across easy, medium, and hard tiers).
   - Each item includes verified distractors, single exact ground-truth indices, and targeted diagnostic hints.

---

## 3. Objective Mastery vs. Subjective Explanation
Vidya strictly separates the computational responsibilities of tutoring:

- **Objective Mastery (Probabilistic Engine):**
  - Managed exclusively by Bayesian Knowledge Tracing (`backend/app/bkt.py`).
  - Updates posterior mastery probability $P(L_t)$ on each attempt based on empirical correct/incorrect signals, accounting for slip ($P(S)=0.10$) and guess ($P(G)=0.25$) probabilities.
  - Controls curriculum unlock gating: learners cannot advance to downstream Transformer concepts until foundational linear algebra and attention prerequisites are proven ($P(L) \ge 0.70$).

- **Subjective Explanation (Generative Model):**
  - Powered by Gemini 2.0 Flash (`backend/app/tutor.py`).
  - Generates multi-modal explanations (intuitive analogies, worked numerical examples, step-by-step logic) adapted to the learner's current failure history.
  - Never mutates mastery state, never promotes or demotes a learner, and operates with deterministic offline fallback guarantees.

- **Human Approval Line (Self-Calibration):**
  - When probabilistic confidence is split or learner responses show high variance across consecutive turns, Vidya engages the learner in active self-calibration, blending a 1–5 self-assessment (30% weight) with the BKT posterior (70% weight).
