import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Lightning, 
  Sparkle, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Brain, 
  WarningCircle,
  Lightbulb,
  TrendUp,
  TrendDown,
  Info
} from '@phosphor-icons/react';

// Built-in starter question bank for immediate interactive demonstration
const SAMPLE_QUESTIONS = {
  nn_perceptron: {
    id: 'q_nn_percep_01',
    question: 'What is the mathematical output formulation of a standard single binary perceptron?',
    options: [
      'f(x) = softmax(W * x + b)',
      'f(x) = step(w · x + b) where step(z) = 1 if z >= 0 else 0',
      'f(x) = 1 / (1 + exp(-x))',
      'f(x) = max(0, x)'
    ],
    answer_index: 1,
    explanation_hint: 'The classic Rosenblatt perceptron computes a weighted sum with bias and applies a step threshold function.'
  },
  nn_activation: {
    id: 'q_nn_act_01',
    question: 'Why are non-linear activation functions essential in deep neural networks?',
    options: [
      'They prevent gradients from ever becoming zero during backpropagation.',
      'Without them, stacking multiple linear layers collapses into a single equivalent linear transformation.',
      'They reduce the total number of trainable parameters in each layer.',
      'They guarantee convergence to the global minimum of the loss function.'
    ],
    answer_index: 1,
    explanation_hint: 'Composition of linear maps is strictly linear: W2*(W1*x) = (W2*W1)*x. Non-linearities allow networks to approximate arbitrary functions.'
  },
  nn_linear_algebra: {
    id: 'q_nn_la_01',
    question: 'In a matrix multiplication between input matrix X (shape 32x128) and weight matrix W (shape 128x64), what is the resulting tensor dimension?',
    options: [
      '128 x 128',
      '32 x 64',
      '64 x 32',
      '32 x 128'
    ],
    answer_index: 1,
    explanation_hint: '(M x K) multiplied by (K x N) yields a matrix of shape (M x N).'
  },
  tr_tokenization: {
    id: 'q_tr_tok_01',
    question: 'What primary problem does subword tokenization (such as Byte-Pair Encoding) solve compared to whole-word tokenization?',
    options: [
      'It eliminates the need for positional encodings in self-attention.',
      'It manages Out-Of-Vocabulary (OOV) tokens by decomposing unknown words into frequent subword units.',
      'It converts text sequences directly into dense continuous vector embeddings without vocabulary lookup.',
      'It forces all vocabulary tokens to have identical character length.'
    ],
    answer_index: 1,
    explanation_hint: 'BPE builds a compact vocabulary where rare or novel words are split into known constituent subwords.'
  },
  rag_prompt_basics: {
    id: 'q_rag_prompt_01',
    question: 'In a structured prompt template for a retrieval-augmented assistant, what is the role of explicit ground truth delimiters (e.g., <context>...</context>)?',
    options: [
      'To increase temperature sampling randomness for higher factual diversity.',
      'To clearly isolate external factual context from user instructions, reducing prompt injection and hallucination.',
      'To automatically index the prompt into an in-memory HNSW vector database.',
      'To bypass tokenization length constraints.'
    ],
    answer_index: 1,
    explanation_hint: 'Delimiters bound untrusted retrieved text and clarify instructions from reference context.'
  }
};

export default function TutorView({
  currentConcept,
  onAnswerSubmitted,
  onNextQuestion,
  onRequestSelfRate,
  loadingNext
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setLastResult(null);
    setStartTime(Date.now());
  }, [currentConcept?.concept_id, currentConcept?.question?.id]);

  if (!currentConcept) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-32 text-center text-zinc-400">
        <Brain size={32} className="mx-auto text-emerald-400 animate-spin mb-4" />
        <p>Loading next optimal concept from selector...</p>
      </div>
    );
  }

  // Get active question item
  const questionItem = currentConcept.question || SAMPLE_QUESTIONS[currentConcept.concept_id] || {
    id: `q_${currentConcept.concept_id}_gen`,
    question: `Which fundamental principle governs the mechanics and application of '${currentConcept.concept_name}' in modern AI systems?`,
    options: [
      `It enables parametric transformation and contextual representations for ${currentConcept.concept_name}.`,
      `It acts as an unconstrained heuristic without mathematical bounds.`,
      `It replaces the loss function completely during optimization.`,
      `It is only applicable in 1-dimensional discrete spaces.`
    ],
    answer_index: 0,
    explanation_hint: `Reflect on the formal definition and role of ${currentConcept.concept_name}.`
  };

  const handleOptionSelect = (idx) => {
    if (isSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || submitting) return;

    setSubmitting(true);
    const latencyMs = Date.now() - startTime;
    const isCorrect = selectedOption === questionItem.answer_index;

    try {
      const result = await onAnswerSubmitted({
        conceptId: currentConcept.concept_id,
        questionId: questionItem.id,
        correct: isCorrect,
        latencyMs,
      });

      setLastResult(result);
      setIsSubmitted(true);

      // Trigger confetti if concept transitioned to mastered!
      if (result.p_known_after >= 0.85 && result.p_known_before < 0.85) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error("Answer submission failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const pPercent = Math.round(currentConcept.p_known * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
      {/* Concept Status Card (Double-Bezel) */}
      <div className="double-bezel p-1.5 rounded-[1.75rem] mb-6">
        <div className="double-bezel-inner p-6 rounded-[1.4rem]">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Concept
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Topic: <strong className="text-zinc-200 uppercase">{currentConcept.topic}</strong>
              </span>
            </div>

            {/* Difficulty Indicators */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] px-3 py-1 rounded-full border border-white/5 text-xs text-zinc-400">
              <span className="text-[10px] font-mono uppercase">Difficulty:</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((lvl) => (
                  <span
                    key={lvl}
                    className={`w-2 h-2 rounded-full transition-all ${
                      lvl <= currentConcept.difficulty ? 'bg-amber-400' : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            {currentConcept.concept_name}
          </h2>

          {/* Probabilistic Mastery Meter */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Brain size={14} className="text-emerald-400" />
                <span>BKT Posterior Mastery ($p_{'{known}'}$):</span>
              </span>
              <span className="font-semibold text-white">
                {currentConcept.p_known.toFixed(4)} ({currentConcept.mastery_level})
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-white/5 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  currentConcept.p_known >= 0.85
                    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                    : currentConcept.p_known >= 0.40
                    ? 'bg-amber-400'
                    : 'bg-zinc-600'
                }`}
                style={{ width: `${Math.max(8, pPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Re-explain Banner (triggers on 2 consecutive wrong attempts) */}
      {lastResult?.re_explain && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 mb-6 animate-pulse-subtle">
          <Lightbulb size={20} className="text-amber-400 shrink-0 mt-0.5" weight="duotone" />
          <div>
            <strong className="font-semibold block mb-0.5">Pedagogical Re-Explanation Triggered:</strong>
            Vidya detected struggle on this node. Switching modal explanation style to 
            <span className="font-mono underline ml-1 font-semibold">{lastResult.explanation_style || 'Analogy & Worked Example'}</span>.
          </div>
        </div>
      )}

      {/* Interactive Question Card */}
      <div className="double-bezel p-1.5 rounded-[1.75rem] mb-6">
        <div className="double-bezel-inner p-6 sm:p-8 rounded-[1.4rem]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle size={16} className="text-indigo-400" />
            <span className="text-[11px] uppercase tracking-wider font-mono text-indigo-300">
              Practice Question
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-medium text-zinc-100 leading-relaxed mb-6">
            {questionItem.question}
          </h3>

          {/* Multiple Choice Options */}
          <div className="space-y-3 mb-8">
            {questionItem.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = isSubmitted && idx === questionItem.answer_index;
              const isWrongSelected = isSubmitted && isSelected && !isCorrectAnswer;

              let cardStyle = 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04] text-zinc-300';
              if (isSelected && !isSubmitted) {
                cardStyle = 'bg-indigo-500/10 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10';
              }
              if (isCorrectAnswer) {
                cardStyle = 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200';
              }
              if (isWrongSelected) {
                cardStyle = 'bg-rose-500/15 border-rose-500/60 text-rose-200';
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted || submitting}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all text-xs sm:text-sm flex items-start gap-3.5 ${cardStyle}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs shrink-0 border ${
                    isSelected ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300' : 'border-white/10 bg-white/5 text-zinc-400'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-relaxed pt-0.5">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Action Bar */}
          {!isSubmitted ? (
            <button
              disabled={selectedOption === null || submitting}
              onClick={handleSubmitAnswer}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-semibold text-sm transition-all shadow-xl ${
                selectedOption !== null && !submitting
                  ? 'bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.98]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <span>{submitting ? 'Updating BKT Engine...' : 'Submit Answer'}</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          ) : (
            <div className="space-y-4">
              {/* Result Feedback Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
                lastResult?.correct
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                {lastResult?.correct ? (
                  <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" weight="duotone" />
                ) : (
                  <XCircle size={20} className="text-rose-400 shrink-0 mt-0.5" weight="duotone" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    <span>{lastResult?.correct ? 'Correct Answer!' : 'Incorrect.'}</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-black/40 border border-white/10 flex items-center gap-1">
                      {lastResult?.correct ? <TrendUp size={12} /> : <TrendDown size={12} />}
                      p_known: {lastResult?.p_known_before.toFixed(3)} → {lastResult?.p_known_after.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-zinc-300">{questionItem.explanation_hint}</p>
                </div>
              </div>

              {/* Next Button */}
              <div className="flex gap-3">
                <button
                  disabled={loadingNext}
                  onClick={async () => {
                    setSelectedOption(null);
                    setIsSubmitted(false);
                    setLastResult(null);
                    if (onNextQuestion) {
                      await onNextQuestion();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-sm transition-all active:scale-[0.98] shadow-xl"
                >
                  <span>{loadingNext ? 'Loading Next Question...' : 'Continue Learning'}</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
