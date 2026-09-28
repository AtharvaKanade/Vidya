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
  Info,
  SlidersHorizontal,
  CaretDown,
  CaretUp
} from '@phosphor-icons/react';

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
  const [showMathDetails, setShowMathDetails] = useState(false);

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
        <p className="text-sm">Finding the best next question for you...</p>
      </div>
    );
  }

  const questionItem = currentConcept.question || {
    id: `q_${currentConcept.concept_id}_gen`,
    question: `What is the core idea behind '${currentConcept.concept_name}' in modern AI systems?`,
    options: [
      `It enables parametric transformation and structured learning for ${currentConcept.concept_name}.`,
      `It is an unconstrained heuristic without mathematical bounds.`,
      `It completely bypasses optimization during training.`,
      `It is only applicable in 1-dimensional discrete spaces.`
    ],
    answer_index: 0,
    explanation_hint: `Think about how ${currentConcept.concept_name} helps neural models represent or process data.`
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

      // Trigger celebration if mastered!
      if (result.p_known_after >= 0.85 && result.p_known_before < 0.85) {
        confetti({
          particleCount: 90,
          spread: 80,
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

  // Friendly Stage Label
  let stageLabel = 'Learning the Basics';
  let stageBadgeColor = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  if (currentConcept.p_known >= 0.85) {
    stageLabel = 'Mastered! 🏆';
    stageBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  } else if (currentConcept.p_known >= 0.40) {
    stageLabel = 'Gaining Confidence ⚡';
    stageBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }

  // Difficulty label
  const difficultyNames = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
      {/* Concept Status Card (Double-Bezel) */}
      <div className="double-bezel p-1.5 rounded-[1.75rem] mb-6">
        <div className="double-bezel-inner p-6 rounded-[1.4rem]">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${stageBadgeColor}`}>
                {stageLabel}
              </span>
              <span className="text-xs text-zinc-400 capitalize">
                Track: <strong className="text-zinc-200 uppercase">{currentConcept.topic}</strong>
              </span>
            </div>

            {/* Difficulty Badge */}
            <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1 rounded-full border border-white/5 text-xs text-zinc-300">
              <span className="text-zinc-400">Level:</span>
              <span className="font-semibold text-white">
                {difficultyNames[currentConcept.difficulty] || 'Standard'}
              </span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
            {currentConcept.concept_name}
          </h2>

          {/* Friendly Mastery Progress Bar */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium">
                Your Mastery Level:
              </span>
              <span className="font-bold text-white text-sm">
                {pPercent}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-zinc-900 border border-white/5 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  currentConcept.p_known >= 0.85
                    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                    : currentConcept.p_known >= 0.40
                    ? 'bg-amber-400'
                    : 'bg-indigo-400'
                }`}
                style={{ width: `${Math.max(8, pPercent)}%` }}
              />
            </div>
          </div>

          {/* Friendly Score Guide Toggle */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <button
              onClick={() => setShowMathDetails(!showMathDetails)}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors text-xs font-medium"
            >
              <span>{showMathDetails ? 'Hide Guide' : 'How does your score work?'}</span>
              {showMathDetails ? <CaretUp size={12} /> : <CaretDown size={12} />}
            </button>

            {showMathDetails && (
              <span className="text-xs text-emerald-400 font-medium">
                Goal: Reach 85% to Master
              </span>
            )}
          </div>

          {showMathDetails && (
            <div className="mt-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 space-y-1.5">
              <p>• <strong>Correct answers</strong> boost your understanding score.</p>
              <p>• <strong>Tricky questions</strong> help Vidya know where to give you helpful hints and analogies.</p>
              <p>• Once you reach <strong>85%</strong>, this topic is mastered and unlocks the next lesson!</p>
            </div>
          )}
        </div>
      </div>

      {/* Helpful Hint / Re-explanation Banner */}
      {lastResult?.re_explain && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-3 mb-6 animate-pulse-subtle">
          <Lightbulb size={22} className="text-amber-400 shrink-0 mt-0.5" weight="duotone" />
          <div>
            <strong className="font-semibold block mb-0.5">Let's look at this another way:</strong>
            Vidya noticed this concept was tricky. For the next step, we'll break it down using a simple real-world analogy.
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="double-bezel p-1.5 rounded-[1.75rem] mb-6">
        <div className="double-bezel-inner p-6 sm:p-8 rounded-[1.4rem]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle size={16} className="text-emerald-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
              Quick Practice
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed mb-6">
            {questionItem.question}
          </h3>

          {/* Multiple Choice Options */}
          <div className="space-y-3 mb-8">
            {questionItem.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = isSubmitted && idx === questionItem.answer_index;
              const isWrongSelected = isSubmitted && isSelected && !isCorrectAnswer;

              let cardStyle = 'bg-white/[0.02] border-white/10 hover:border-white/25 hover:bg-white/[0.04] text-zinc-200';
              if (isSelected && !isSubmitted) {
                cardStyle = 'bg-indigo-500/15 border-indigo-400 text-white shadow-lg shadow-indigo-500/10';
              }
              if (isCorrectAnswer) {
                cardStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-medium';
              }
              if (isWrongSelected) {
                cardStyle = 'bg-rose-500/20 border-rose-400 text-rose-100';
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted || submitting}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all text-xs sm:text-sm flex items-start gap-3.5 ${cardStyle}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                    isSelected 
                      ? 'border-indigo-400 bg-indigo-500/30 text-white' 
                      : 'border-white/15 bg-white/5 text-zinc-400'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-relaxed pt-0.5">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Action Button Area */}
          {!isSubmitted ? (
            <button
              disabled={selectedOption === null || submitting}
              onClick={handleSubmitAnswer}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-bold text-sm transition-all shadow-xl ${
                selectedOption !== null && !submitting
                  ? 'bg-white text-zinc-950 hover:bg-emerald-300 active:scale-[0.98]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <span>{submitting ? 'Checking Your Answer...' : 'Submit Answer'}</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          ) : (
            <div className="space-y-4">
              {/* Result Feedback Banner */}
              <div className={`p-5 rounded-2xl border flex items-start gap-3.5 text-xs sm:text-sm leading-relaxed ${
                lastResult?.correct
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                {lastResult?.correct ? (
                  <CheckCircle size={22} className="text-emerald-400 shrink-0 mt-0.5" weight="fill" />
                ) : (
                  <XCircle size={22} className="text-rose-400 shrink-0 mt-0.5" weight="fill" />
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-sm flex flex-wrap items-center justify-between gap-2">
                    <span>{lastResult?.correct ? 'Great job! That is correct.' : 'Not quite right — here is why:'}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-black/40 border border-white/10 font-normal">
                      Mastery: {Math.round(lastResult?.p_known_before * 100)}% → {Math.round(lastResult?.p_known_after * 100)}%
                    </span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{questionItem.explanation_hint}</p>
                </div>
              </div>

              {/* Continue Learning Button */}
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
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-full bg-white hover:bg-emerald-300 text-zinc-950 font-bold text-sm transition-all active:scale-[0.98] shadow-2xl"
              >
                <span>{loadingNext ? 'Loading Next Topic...' : 'Continue to Next Question'}</span>
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
