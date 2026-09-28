import React, { useState } from 'react';
import { 
  ClockCounterClockwise, 
  Code, 
  CheckCircle, 
  Warning, 
  Lightbulb, 
  ArrowsClockwise,
  TrendUp,
  TrendDown
} from '@phosphor-icons/react';

export default function TraceViewer({ traceData, onRefresh }) {
  const [expandedStep, setExpandedStep] = useState(null);

  if (!traceData || !traceData.steps) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-32 text-center text-zinc-500 font-mono text-xs">
        Loading session audit trace...
      </div>
    );
  }

  const steps = traceData.steps;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-28 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-[11px] uppercase tracking-[0.2em] font-mono mb-2">
            <ClockCounterClockwise size={14} className="text-indigo-400" />
            <span>Structured Audit Telemetry</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Session Audit Trace
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Deterministic step-by-step log of every learner action, BKT state transition, and pedagogical trigger.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-mono transition-all"
        >
          <ArrowsClockwise size={14} />
          <span>Refresh Trace</span>
        </button>
      </div>

      {/* Trace Timeline Table (Double-Bezel) */}
      <div className="double-bezel p-1.5 rounded-[1.75rem]">
        <div className="double-bezel-inner p-4 sm:p-6 rounded-[1.4rem]">
          <div className="space-y-3">
            {steps.map((stepItem) => {
              const { step, payload, ts } = stepItem;
              const isExpanded = expandedStep === step;
              const isAnswer = payload.action === 'answer_attempt';
              const isStart = payload.action === 'session_start';
              const isReExplain = payload.re_explain;

              return (
                <div
                  key={step}
                  className={`rounded-2xl border transition-all ${
                    isReExplain
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isAnswer && payload.correct
                      ? 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      : isAnswer && !payload.correct
                      ? 'bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/40'
                      : 'bg-white/[0.01] border-white/5'
                  }`}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Step Info */}
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs text-zinc-300 shrink-0">
                        #{step}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-white font-mono">
                            {payload.action || 'system_event'}
                          </strong>

                          {isAnswer && (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              payload.correct
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {payload.correct ? 'CORRECT' : 'WRONG'}
                            </span>
                          )}

                          {isReExplain && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Lightbulb size={12} /> RE-EXPLAIN TRIGGERED
                            </span>
                          )}
                        </div>

                        {isAnswer && (
                          <div className="text-xs text-zinc-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
                            <span>Concept: <code className="text-zinc-200">{payload.concept_id}</code></span>
                            <span className="flex items-center gap-1">
                              {payload.correct ? <TrendUp size={12} className="text-emerald-400" /> : <TrendDown size={12} className="text-rose-400" />}
                              Score: {Math.round((payload.p_known_before || 0) * 100)}% → {Math.round((payload.p_known_after || 0) * 100)}%
                            </span>
                            {payload.latency_ms > 0 && (
                              <span className="text-zinc-500">
                                ({(payload.latency_ms / 1000).toFixed(1)}s)
                              </span>
                            )}
                          </div>
                        )}

                        {isStart && (
                          <div className="text-xs text-zinc-400 mt-1 font-mono">
                            Topic: <code className="text-zinc-200">{payload.topic || 'all'}</code> · Initialized {payload.concepts_initialized} concepts
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Timestamp & Payload Toggle */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(ts).toLocaleTimeString()}
                      </span>

                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[11px] font-mono border border-white/5 transition-colors"
                      >
                        <Code size={12} />
                        <span>{isExpanded ? 'Hide Payload' : 'Inspect JSON'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && (
                    <div className="p-4 border-t border-white/10 bg-black/50 rounded-b-2xl">
                      <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto p-3 rounded-xl bg-zinc-950 border border-white/5 leading-relaxed">
                        {JSON.stringify(payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
