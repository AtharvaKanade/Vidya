import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkle, CheckCircle, XCircle, ArrowRight, Brain, 
  Info, BookOpen, ArrowsClockwise, Lightning, Lightbulb,
  CaretDown, CaretUp
} from '@phosphor-icons/react';
import { getExplanation } from '../api';
import FormattedExplanation from './FormattedExplanation';

const STYLE_OPTIONS = [
  { id: 'default', label: 'Intuition', icon: BookOpen },
  { id: 'analogy', label: 'Analogy', icon: Lightbulb },
  { id: 'worked_example', label: 'Worked Example', icon: Lightning },
  { id: 'step_by_step', label: 'Step-by-Step', icon: Sparkle },
];

export default function TutorView({
  session,
  currentConcept,
  onAnswerSubmitted,
  onNextQuestion,
  loadingNext
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [recentAnswers, setRecentAnswers] = useState([]);

  // LLM Explanation State (Only opens when student explicitly clicks)
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeStyle, setActiveStyle] = useState('default');
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // Fetch explanation when student toggles it or switches style
  useEffect(() => {
    let isMounted = true;
    if (isSubmitted && showExplanation && session?.session_id && currentConcept?.concept_id) {
      setLoadingExplanation(true);
      const chosenText = selectedOption !== null && questionItem.options ? questionItem.options[selectedOption] : null;
      const correctText = questionItem.options && questionItem.answer_index !== undefined ? questionItem.options[questionItem.answer_index] : null;
      const isCor = selectedOption === questionItem.answer_index;

      getExplanation(session.session_id, {
        conceptId: currentConcept.concept_id,
        style: activeStyle,
        questionId: questionItem.id,
        questionText: questionItem.question,
        options: questionItem.options,
        userAnswer: chosenText,
        correctAnswer: correctText,
        isCorrect: isCor,
        explanationHint: questionItem.explanation_hint,
      })
        .then((res) => {
          if (isMounted) {
            setExplanation(res);
          }
        })
        .catch((err) => {
          console.error('Explanation fetch error:', err);
        })
        .finally(() => {
          if (isMounted) setLoadingExplanation(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [
    isSubmitted, 
    showExplanation, 
    session?.session_id, 
    currentConcept?.concept_id, 
    currentConcept?.question?.id, 
    activeStyle, 
    selectedOption
  ]);

  // Reset answer states on concept change
  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setLastResult(null);
    setShowExplanation(false);
    setExplanation(null);
    setActiveStyle('default');
    setStartTime(Date.now());
  }, [currentConcept?.concept_id, currentConcept?.question?.id]);

  // Loading state
  if (!currentConcept) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-36 text-center animate-fade-in">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin"
          style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)' }}
        >
          <Brain size={22} style={{ color: 'var(--green)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Selecting optimal challenge for your current skill level...
        </p>
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

      // If re-explain style was provided by backend, set style ready for when user clicks (NEVER auto-open)
      if (result?.explanation_style) {
        setActiveStyle(result.explanation_style);
      }

      // Celebrate mastery milestone
      if (result && result.p_known_after >= 0.85 && result.p_known_before < 0.85) {
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-24 animate-fade-in-up tutor-workspace">
      
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Column: Concept Info & Mastery Card ── */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <div 
            className="p-5 sm:p-6 rounded-lg"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-mid)',
            }}
          >
            {/* Top row: Difficulty & Concept type */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="label-caps" style={{ color: 'var(--text-muted)' }}>CONCEPT</span>
              <span className="badge badge-neutral text-xs">{difficultyLabel}</span>
            </div>

            {/* Concept Title */}
            <h2 className="heading-section text-xl sm:text-2xl font-medium mb-5" style={{ color: 'var(--text-primary)' }}>
              {currentConcept.concept_name}
            </h2>

            {/* Circular Mastery Meter */}
            <div className="flex items-center justify-center my-5">
              <div 
                className="relative w-32 h-32 flex items-center justify-center cursor-help"
                title="BKT Mastery: Bayesian estimate of concept mastery. >= 85% is Mastered."
              >
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background track */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="var(--bg-raised)"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  {/* Progress ring with green stroke */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="var(--green)"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
                  />
                </svg>
                {/* Center text content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {scorePercent}%
                  </span>
                  <span 
                    className="text-[9px] uppercase font-semibold tracking-wider flex items-center gap-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    BKT Mastery <Info size={10} style={{ color: 'var(--text-muted)' }} />
                  </span>
                </div>
              </div>
            </div>

            {/* Current Status Pill */}
            <div className="flex items-center justify-center mb-5">
              <span className={`badge ${stageBadgeClass} px-3 py-1 text-xs font-semibold`}>
                {stageLabel}
              </span>
            </div>

            {/* Recent Answer Attempts Strip */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-dim)' }}>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>Recent Answers:</span>
                <div className="flex items-center gap-1.5">
                  {recentAnswers.length === 0 ? (
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>First attempt</span>
                  ) : (
                    recentAnswers.map((isCor, idx) => (
                      <span
                        key={idx}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: isCor ? 'var(--green-dim)' : 'var(--red-dim)',
                          color: isCor ? 'var(--green)' : 'var(--red)',
                          border: `1px solid ${isCor ? 'var(--green-border)' : 'var(--red-border)'}`,
                        }}
                      >
                        {isCor ? '✓' : '✗'}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Column: Interactive Practice Question & AI Explanation ── */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main Question Card */}
          <div 
            className="p-6 sm:p-8 rounded-lg"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-mid)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-5 pb-3 border-b" style={{ borderColor: 'var(--border-dim)' }}>
              <Sparkle size={14} weight="fill" style={{ color: 'var(--accent)' }} />
              <span className="label-caps font-semibold" style={{ color: 'var(--accent)' }}>
                ADAPTIVE PRACTICE
              </span>
            </div>

            {/* Question Text */}
            <h3 
              className="text-base sm:text-lg font-medium leading-relaxed mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              {questionItem.question}
            </h3>

            {/* Options List */}
            <div className="space-y-3 mb-6">
              {questionItem.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = isSubmitted && idx === questionItem.answer_index;
                const isWrong = isSubmitted && isSelected && !isCorrect;

                let optionStyle = {
                  border: '1px solid var(--border-mid)',
                  borderLeft: '4px solid var(--border-mid)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  opacity: 1,
                  transition: 'all 150ms ease',
                };

                if (!isSubmitted) {
                  if (isSelected) {
                    optionStyle.borderLeft = '4px solid var(--accent)';
                    optionStyle.borderColor = 'var(--accent-border)';
                    optionStyle.background = 'var(--accent-dim)';
                  }
                } else {
                  if (isCorrect) {
                    // Mark correct answer GREEN
                    optionStyle.borderLeft = '4px solid var(--green)';
                    optionStyle.borderColor = 'var(--green-border)';
                    optionStyle.background = 'var(--green-dim)';
                    optionStyle.color = 'var(--text-primary)';
                  } else if (isWrong) {
                    // Mark incorrect selected answer RED
                    optionStyle.borderLeft = '4px solid var(--red)';
                    optionStyle.borderColor = 'var(--red-border)';
                    optionStyle.background = 'var(--red-dim)';
                    optionStyle.color = 'var(--text-primary)';
                  } else {
                    optionStyle.borderColor = 'var(--border-dim)';
                    optionStyle.borderLeft = '4px solid var(--border-dim)';
                    optionStyle.color = 'var(--text-muted)';
                    optionStyle.opacity = 0.5;
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isSubmitted || submitting}
                    onClick={() => handleOptionSelect(idx)}
                    id={`option-${idx}`}
                    className="w-full text-left p-3.5 sm:p-4 rounded text-xs sm:text-sm font-medium leading-relaxed cursor-pointer flex items-center justify-between gap-3"
                    style={optionStyle}
                  >
                    <span>{option}</span>
                    {isSubmitted && isCorrect && (
                      <CheckCircle size={18} weight="fill" style={{ color: 'var(--green)', flexShrink: 0 }} />
                    )}
                    {isSubmitted && isWrong && (
                      <XCircle size={18} weight="fill" style={{ color: 'var(--red)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons & Post-Answer Area */}
            {!isSubmitted ? (
              <button
                id="submit-answer"
                disabled={selectedOption === null || submitting}
                onClick={handleSubmitAnswer}
                className="btn btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Updating mastery model...' : 'Submit Answer'}</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Single Toggle AI Explanation Button (NEVER auto-opens) */}
                <button
                  type="button"
                  id="toggle-explanation-btn"
                  onClick={() => setShowExplanation(prev => !prev)}
                  className="w-full py-2.5 px-4 rounded-lg flex items-center justify-between text-xs font-semibold border transition-all cursor-pointer"
                  style={{
                    background: showExplanation ? 'var(--bg-raised)' : 'var(--bg-surface)',
                    borderColor: showExplanation ? 'var(--green-border)' : 'var(--border-mid)',
                    color: showExplanation ? 'var(--green)' : 'var(--text-secondary)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Brain size={16} weight="duotone" style={{ color: 'var(--green)' }} />
                    <span>{showExplanation ? 'Hide AI Concept Explanation' : 'Show AI Concept Explanation'}</span>
                  </div>
                  {showExplanation ? <CaretUp size={14} /> : <CaretDown size={14} />}
                </button>

                {/* ── Collapsible Vidya AI Explainer Card ── */}
                {showExplanation && (
                  <div 
                    className="p-5 rounded-lg transition-all animate-fade-in"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-mid)',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b" style={{ borderColor: 'var(--border-dim)' }}>
                      <div className="flex items-center gap-2">
                        <Sparkle size={14} weight="fill" style={{ color: 'var(--accent)' }} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                          Concept Breakdown
                        </span>
                        {explanation?.from_cache && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 font-mono">
                            cached
                          </span>
                        )}
                      </div>

                      {/* Multi-style switcher pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {STYLE_OPTIONS.map((st) => {
                          const Icon = st.icon;
                          const isSelected = activeStyle === st.id;
                          return (
                            <button
                              key={st.id}
                              onClick={() => setActiveStyle(st.id)}
                              className="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                              style={{
                                background: isSelected ? 'var(--green-dim)' : 'var(--bg-surface)',
                                color: isSelected ? 'var(--green)' : 'var(--text-muted)',
                                border: `1px solid ${isSelected ? 'var(--green-border)' : 'var(--border-dim)'}`,
                              }}
                            >
                              <Icon size={11} weight={isSelected ? 'bold' : 'regular'} />
                              <span>{st.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation Content */}
                    {loadingExplanation ? (
                      <div className="py-4 flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <ArrowsClockwise size={16} className="animate-spin text-emerald-400" />
                        <span>Generating {activeStyle.replace('_', ' ')} explanation with Gemini...</span>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <FormattedExplanation content={explanation?.explanation || 'Loading concept breakdown...'} />
                      </div>
                    )}
                  </div>
                )}

                {/* Continue to Next Question Button */}
                <button
                  id="continue-learning"
                  disabled={loadingNext}
                  onClick={async () => {
                    setSelectedOption(null);
                    setIsSubmitted(false);
                    setLastResult(null);
                    setShowExplanation(false);
                    if (onNextQuestion) await onNextQuestion();
                  }}
                  className="btn btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loadingNext ? 'Loading Next Practice Question...' : 'Continue to Next Question'}</span>
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
