import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkle, CheckCircle, XCircle, ArrowRight, Brain, 
  Lightbulb, CaretDown, CaretUp, Check, X,
  ChartLineUp, Info, ArrowUpRight
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
  const [showScoreGuide, setShowScoreGuide] = useState(false);
  const [recentAnswers, setRecentAnswers] = useState([]);

  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setLastResult(null);
    setStartTime(Date.now());
  }, [currentConcept?.concept_id, currentConcept?.question?.id]);

  // Loading state
  if (!currentConcept) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-36 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 animate-spin">
          <Brain size={24} className="text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-gray-400">Selecting optimal challenge for your current skill level...</p>
      </div>
    );
  }

  const questionItem = currentConcept.question || {
    id: `q_${currentConcept.concept_id}_gen`,
    question: `What is the fundamental mechanism behind '${currentConcept.concept_name}' in modern AI systems?`,
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

      // Record in local recent attempt history (max 3)
      setRecentAnswers(prev => [isCorrect, ...prev].slice(0, 3));

      // Celebrate mastery milestone
      if (result.p_known_after >= 0.85 && result.p_known_before < 0.85) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Answer submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const scorePercent = Math.round(currentConcept.p_known * 100);

  // Mastery Stage label & badges
  let stageLabel = 'Getting Started';
  let stageBadgeClass = 'badge-neutral';
  if (currentConcept.p_known >= 0.85) {
    stageLabel = 'Mastered 🏆';
    stageBadgeClass = 'badge-emerald';
  } else if (currentConcept.p_known >= 0.40) {
    stageLabel = 'Building Confidence ⚡';
    stageBadgeClass = 'badge-amber';
  }

  // Difficulty label
  const difficultyLabel = { 1: 'Foundational', 2: 'Intermediate', 3: 'Advanced' }[currentConcept.difficulty] || 'Standard';

  // SVG Progress Ring calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.32px
  const strokeDashoffset = circumference - (currentConcept.p_known * circumference);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 animate-fade-in-up" style={{ paddingTop: '6rem' }}>
      
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Column: Sticky Concept Progress & Knowledge Dashboard ── */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <div className="glass rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl">
            
            {/* Top metadata row */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                Track: {currentConcept.topic}
              </span>
              <span className="badge badge-neutral text-xs">
                {difficultyLabel}
              </span>
            </div>

            {/* Concept Title */}
            <h2 className="heading-section text-xl sm:text-2xl font-bold text-white mb-6">
              {currentConcept.concept_name}
            </h2>

            {/* Circular Mastery Meter */}
            <div className="flex items-center justify-center my-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background track */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="text-white/[0.06]"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Progress ring with emerald gradient stroke */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="text-emerald-400 transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                {/* Center text content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-extrabold text-white tracking-tight">
                    {scorePercent}%
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Mastery
                  </span>
                </div>
              </div>
            </div>

            {/* Current Status Pill */}
            <div className="flex items-center justify-center mb-6">
              <span className={`badge ${stageBadgeClass} px-3 py-1 text-xs font-semibold shadow-sm`}>
                {stageLabel}
              </span>
            </div>

            {/* Recent Answer Attempts Strip */}
            <div className="pt-4 border-t border-white/[0.06] mb-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Recent Answers:</span>
                <div className="flex items-center gap-1.5">
                  {recentAnswers.length === 0 ? (
                    <span className="text-gray-500 text-[11px]">First attempt</span>
                  ) : (
                    recentAnswers.map((isCor, idx) => (
                      <span
                        key={idx}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCor 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {isCor ? '✓' : '✗'}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* How score works collapsible */}
            <div className="pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowScoreGuide(!showScoreGuide)}
                className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-200 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Info size={14} className="text-emerald-400" />
                  How BKT Mastery Works
                </span>
                {showScoreGuide ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </button>

              {showScoreGuide && (
                <div className="mt-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-gray-400 space-y-2 leading-relaxed animate-fade-in">
                  <p>• Every answer updates your mastery probability using Bayesian Knowledge Tracing.</p>
                  <p>• Reaching <strong className="text-emerald-400">85% mastery</strong> marks this concept as mastered and unlocks advanced topics.</p>
                  <p>• Multiple incorrect answers automatically trigger step-by-step alternate explanations.</p>
                </div>
              )}
            </div>

            {/* Self-rate trigger link */}
            {onRequestSelfRate && (
              <div className="pt-3 border-t border-white/[0.06] mt-3">
                <button
                  onClick={() => onRequestSelfRate(currentConcept)}
                  className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-emerald-400 transition-colors py-1 group"
                >
                  <span>Calibrate confidence manually</span>
                  <ArrowUpRight size={13} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Right Column: Interactive Question & Response Interface ── */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Re-explain Notification Banner */}
          {lastResult?.re_explain && (
            <div className="glass rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 flex items-start gap-3 animate-fade-in shadow-md">
              <Lightbulb size={20} weight="duotone" className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-white mb-0.5">Let's try a fresh perspective</strong>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  Vidya has switched to an intuitive real-world analogy to help bridge the concept gap.
                </p>
              </div>
            </div>
          )}

          {/* Main Question Card */}
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
            
            {/* Question Card Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Sparkle size={16} weight="fill" className="text-emerald-400" />
                <span className="label-caps text-emerald-400">Adaptive Challenge</span>
              </div>
              <span className="text-xs font-mono text-gray-400">
                Question ID: {questionItem.id.replace('q_', '')}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-white text-base sm:text-lg font-semibold leading-relaxed mb-8">
              {questionItem.question}
            </h3>

            {/* Options List */}
            <div className="space-y-3 mb-8">
              {questionItem.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = isSubmitted && idx === questionItem.answer_index;
                const isWrong = isSubmitted && isSelected && !isCorrect;

                let optionClasses = "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 ";
                
                if (!isSubmitted) {
                  if (isSelected) {
                    optionClasses += "bg-emerald-500/10 border-l-4 border-l-emerald-400 border-emerald-500/40 text-white shadow-md";
                  } else {
                    optionClasses += "bg-white/[0.02] border-white/[0.06] text-gray-300 hover:bg-white/[0.05] hover:border-white/[0.12]";
                  }
                } else {
                  if (isCorrect) {
                    optionClasses += "bg-emerald-500/15 border-l-4 border-l-emerald-400 border-emerald-500/50 text-emerald-100 shadow-md";
                  } else if (isWrong) {
                    optionClasses += "bg-red-500/15 border-l-4 border-l-red-400 border-red-500/50 text-red-100";
                  } else {
                    optionClasses += "bg-white/[0.01] border-white/[0.04] text-gray-500 opacity-60";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isSubmitted || submitting}
                    onClick={() => handleOptionSelect(idx)}
                    id={`option-${idx}`}
                    className={optionClasses}
                  >
                    {/* Option Alphabet Badge */}
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors ${
                      isSelected && !isSubmitted
                        ? 'bg-emerald-400 text-black'
                        : isCorrect
                        ? 'bg-emerald-400 text-black'
                        : isWrong
                        ? 'bg-red-400 text-black'
                        : 'bg-white/[0.06] text-gray-400 border border-white/[0.08]'
                    }`}>
                      {isCorrect ? <Check size={14} weight="bold" /> : isWrong ? <X size={14} weight="bold" /> : String.fromCharCode(65 + idx)}
                    </span>

                    <span className="text-xs sm:text-sm leading-relaxed pt-0.5 font-medium">
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons & Feedback Container */}
            {!isSubmitted ? (
              <button
                id="submit-answer"
                disabled={selectedOption === null || submitting}
                onClick={handleSubmitAnswer}
                className="btn btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Verifying with BKT Engine...' : 'Check My Answer'}</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Result Feedback Pod */}
                <div className={`rounded-2xl p-5 border ${
                  lastResult?.correct 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                    : 'bg-red-950/40 border-red-500/30 text-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {lastResult?.correct ? (
                      <CheckCircle size={22} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={22} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-white text-sm">
                          {lastResult?.correct ? 'Correct! Strong understanding shown.' : 'Incorrect — Let us reinforce this concept:'}
                        </span>
                        <span className="font-mono text-xs bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-gray-300">
                          {Math.round(lastResult?.p_known_before * 100)}% → {Math.round(lastResult?.p_known_after * 100)}%
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                        {questionItem.explanation_hint}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  id="continue-learning"
                  disabled={loadingNext}
                  onClick={async () => {
                    setSelectedOption(null);
                    setIsSubmitted(false);
                    setLastResult(null);
                    if (onNextQuestion) await onNextQuestion();
                  }}
                  className="btn btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25"
                >
                  <span>{loadingNext ? 'Loading Next Adaptive Challenge...' : 'Continue Learning'}</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
