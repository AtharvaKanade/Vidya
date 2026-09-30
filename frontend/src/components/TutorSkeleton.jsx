import React, { useState, useEffect } from 'react';
import { Sparkle, Brain, Cpu, Database, Network, ArrowsClockwise, Lightning } from '@phosphor-icons/react';

const LOADING_STEPS = [
  { text: 'Analyzing knowledge graph & dependencies...', icon: Network },
  { text: 'Computing BKT mastery probability (P(L))...', icon: Brain },
  { text: 'Generating adaptive question with Gemini AI...', icon: Sparkle },
  { text: 'Calibrating multiple-choice options & distractors...', icon: Lightning },
];

export default function TutorSkeleton({ topicName = null }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const activeStep = LOADING_STEPS[currentStepIdx];
  const StepIcon = activeStep.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-24 animate-fade-in tutor-workspace" aria-busy="true" aria-live="polite">
      
      {/* ── Top Dynamic AI Generation Status Bar ── */}
      <div 
        className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)',
          border: '1px solid var(--border-mid)',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center relative overflow-hidden"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
          >
            <StepIcon size={18} weight="duotone" className="animate-spin text-[var(--accent)]" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <Sparkle size={12} weight="fill" /> AI Tutor Thinking
              </span>
              {topicName && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
                  {topicName}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium transition-all duration-300" style={{ color: 'var(--text-primary)' }}>
              {activeStep.text}
            </p>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {LOADING_STEPS.map((_, idx) => (
            <span
              key={idx}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: idx === currentStepIdx ? '20px' : '6px',
                background: idx === currentStepIdx ? 'var(--accent)' : 'var(--border-mid)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── 2-Column Tutor Layout Skeleton ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Column: Concept Card Skeleton ── */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <div
            className="p-5 sm:p-6 rounded-lg space-y-5"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-mid)',
            }}
          >
            {/* Top row: Difficulty & Concept pill */}
            <div className="flex items-center justify-between gap-2">
              <div className="skeleton-shimmer skeleton-pill w-20" />
              <div className="skeleton-shimmer skeleton-pill w-24" />
            </div>

            {/* Concept Title Lines */}
            <div className="space-y-2">
              <div className="skeleton-shimmer skeleton-text w-5/6" style={{ height: '22px' }} />
              <div className="skeleton-shimmer skeleton-text w-1/2" style={{ height: '18px' }} />
            </div>

            {/* Circular Mastery Meter Placeholder */}
            <div className="flex items-center justify-center my-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="var(--bg-raised)"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="var(--green-border)"
                    strokeWidth="7"
                    strokeDasharray="251.32"
                    strokeDashoffset="160"
                    strokeLinecap="round"
                    fill="transparent"
                    className="skeleton-pulse"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-1">
                  <div className="skeleton-shimmer w-10 h-6 rounded" />
                  <div className="skeleton-shimmer w-16 h-3 rounded" />
                </div>
              </div>
            </div>

            {/* Status Pill Skeleton */}
            <div className="flex justify-center">
              <div className="skeleton-shimmer skeleton-pill w-36 h-6" />
            </div>

            {/* Recent Answers Skeleton */}
            <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-dim)' }}>
              <div className="skeleton-shimmer skeleton-text w-24" />
              <div className="flex items-center gap-1.5">
                <div className="skeleton-shimmer w-5 h-5 rounded" />
                <div className="skeleton-shimmer w-5 h-5 rounded" />
                <div className="skeleton-shimmer w-5 h-5 rounded" />
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Column: Practice Question Skeleton ── */}
        <div className="lg:col-span-8 space-y-4">
          <div
            className="p-6 sm:p-8 rounded-lg space-y-6"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-mid)',
            }}
          >
            {/* Header with Sparkle */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-dim)' }}>
              <div className="flex items-center gap-2">
                <Sparkle size={14} weight="fill" style={{ color: 'var(--accent)' }} />
                <span className="label-caps font-semibold" style={{ color: 'var(--accent)' }}>
                  ADAPTIVE PRACTICE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <ArrowsClockwise size={13} className="animate-spin" />
                <span>Formulating question...</span>
              </div>
            </div>

            {/* Question Text Skeleton Lines */}
            <div className="space-y-3">
              <div className="skeleton-shimmer skeleton-text w-full" style={{ height: '18px' }} />
              <div className="skeleton-shimmer skeleton-text w-11/12" style={{ height: '18px' }} />
              <div className="skeleton-shimmer skeleton-text w-3/4" style={{ height: '18px' }} />
            </div>

            {/* 4 Options Skeleton Blocks */}
            <div className="space-y-3">
              {[
                { width: '85%', delay: '0ms' },
                { width: '92%', delay: '80ms' },
                { width: '70%', delay: '160ms' },
                { width: '80%', delay: '240ms' },
              ].map((opt, idx) => (
                <div
                  key={idx}
                  className="w-full p-4 rounded text-sm flex items-center justify-between gap-3 border"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-mid)',
                    borderLeft: '4px solid var(--border-dim)',
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono text-[var(--text-muted)] border shrink-0"
                      style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-subtle)' }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <div 
                      className="skeleton-shimmer skeleton-text" 
                      style={{ width: opt.width, height: '14px', animationDelay: opt.delay }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Action Button Skeleton */}
            <div className="pt-2">
              <div 
                className="skeleton-shimmer w-full h-12 rounded-md flex items-center justify-center"
                style={{ opacity: 0.8 }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
