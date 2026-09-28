import React, { useState } from 'react';
import { 
  ClockCounterClockwise, Code, Lightbulb, ArrowsClockwise, TrendUp, TrendDown, TerminalWindow
} from '@phosphor-icons/react';

export default function TraceViewer({ traceData, onRefresh }) {
  const [expandedStep, setExpandedStep] = useState(null);

  if (!traceData || !traceData.steps) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-36 text-center text-gray-500 text-sm animate-fade-in">
        Loading session audit trace...
      </div>
    );
  }

  const steps = traceData.steps;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 animate-fade-in-up" style={{ paddingTop: '6.5rem' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <div className="badge badge-emerald inline-flex items-center gap-1.5 mb-3 shadow-sm">
            <TerminalWindow size={12} weight="fill" />
            <span>Telemetry & Audit Trail</span>
          </div>
          <h1 className="heading-section text-2xl sm:text-3xl text-white font-extrabold tracking-tight">
            Session Decision Trace
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Deterministic step-by-step logs of BKT probability updates and adaptive tutor decisions.
          </p>
        </div>

        <button
          onClick={onRefresh}
          id="refresh-trace"
          className="btn btn-ghost px-4 py-2 text-xs flex items-center gap-2 rounded-full"
        >
          <ArrowsClockwise size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Timeline Container ── */}
      <div className="glass rounded-3xl p-1 border border-white/10 shadow-2xl">
        <div className="glass-card rounded-[1.35rem] p-4 sm:p-6">
          {steps.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm animate-fade-in">
              No session activity recorded yet. Start practicing to inspect adaptive traces.
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((stepItem) => {
                const { step, payload, ts } = stepItem;
                const isExpanded = expandedStep === step;
                const isAnswer = payload.action === 'answer_attempt';
                const isStart = payload.action === 'session_start';
                const isReExplain = payload.re_explain;

                let cardBg = 'bg-white/[0.015]';
                let cardBorder = 'border-white/[0.06]';
                
                if (isReExplain) {
                  cardBg = 'bg-emerald-950/20';
                  cardBorder = 'border-emerald-500/30';
                } else if (isAnswer && !payload.correct) {
                  cardBg = 'bg-red-950/15';
                  cardBorder = 'border-red-500/25';
                }

                return (
                  <div
                    key={step}
                    className={`rounded-2xl border ${cardBorder} ${cardBg} transition-all duration-150 overflow-hidden`}
                  >
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left Block */}
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono text-xs font-bold text-gray-400 shrink-0">
                          {step}
                        </span>

                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <strong className="font-mono text-xs sm:text-sm font-semibold text-white">
                              {payload.action || 'system_event'}
                            </strong>

                            {isAnswer && (
                              <span className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                payload.correct
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}>
                                {payload.correct ? 'CORRECT' : 'INCORRECT'}
                              </span>
                            )}

                            {isReExplain && (
                              <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Lightbulb size={11} /> RE-EXPLAIN
                              </span>
                            )}
                          </div>

                          {isAnswer && (
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 font-mono text-xs text-gray-400">
                              <span>
                                Concept: <code className="text-gray-200">{payload.concept_id}</code>
                              </span>
                              <span className="flex items-center gap-1">
                                {payload.correct ? (
                                  <TrendUp size={13} className="text-emerald-400" />
                                ) : (
                                  <TrendDown size={13} className="text-red-400" />
                                )}
                                <span className="text-gray-300">
                                  {Math.round((payload.p_known_before || 0) * 100)}% → {Math.round((payload.p_known_after || 0) * 100)}%
                                </span>
                              </span>
                              {payload.latency_ms > 0 && (
                                <span className="text-gray-500">
                                  {(payload.latency_ms / 1000).toFixed(1)}s response
                                </span>
                              )}
                            </div>
                          )}

                          {isStart && (
                            <div className="mt-1 font-mono text-xs text-gray-400">
                              Track: <code className="text-gray-200">{payload.topic || 'all'}</code> · {payload.concepts_initialized} concepts initialized
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Block */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-mono text-[11px] text-gray-500">
                          {new Date(ts).toLocaleTimeString()}
                        </span>

                        <button
                          onClick={() => setExpandedStep(isExpanded ? null : step)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 hover:text-white text-xs font-mono transition-colors"
                        >
                          <Code size={12} />
                          <span>{isExpanded ? 'Hide' : 'Payload'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable JSON Inspector */}
                    {isExpanded && (
                      <div className="p-4 bg-black/60 border-t border-white/[0.06] animate-fade-in">
                        <pre className="font-mono text-xs text-emerald-300 bg-black/50 p-3.5 rounded-xl border border-white/[0.06] overflow-x-auto leading-relaxed">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
