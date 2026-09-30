import React, { useState, useMemo } from 'react';
import { 
  ClockCounterClockwise, 
  Code, 
  Lightbulb, 
  ArrowsClockwise, 
  TrendUp, 
  TrendDown, 
  TerminalWindow,
  CheckCircle,
  XCircle,
  HandHeart,
  Brain,
  ListBullets,
  Timer,
  ChartLineUp,
  CaretDown,
  CaretUp
} from '@phosphor-icons/react';

export default function TraceViewer({ traceData, onRefresh }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'answers' | 'ratings' | 'system'
  const [showRawJson, setShowRawJson] = useState({});

  if (!traceData || !traceData.steps) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-20 text-center text-sm animate-fade-in" style={{ color: 'var(--text-muted)' }}>
        <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center animate-spin" style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)' }}>
          <ClockCounterClockwise size={20} style={{ color: 'var(--green)' }} />
        </div>
        Loading session audit history...
      </div>
    );
  }

  const steps = traceData.steps;

  // Compute session summary telemetry metrics
  const metrics = useMemo(() => {
    let answersCount = 0;
    let correctCount = 0;
    let totalLatency = 0;
    let explanationsCount = 0;
    let ratingsCount = 0;

    steps.forEach(({ payload }) => {
      if (payload.action === 'answer_attempt') {
        answersCount++;
        if (payload.correct) correctCount++;
        if (payload.latency_ms) totalLatency += payload.latency_ms;
      }
      if (payload.action === 'explanation_generated' || payload.re_explain) {
        explanationsCount++;
      }
      if (payload.action === 'self_rating_blended') {
        ratingsCount++;
      }
    });

    const accuracy = answersCount > 0 ? Math.round((correctCount / answersCount) * 100) : null;
    const avgSpeed = answersCount > 0 ? (totalLatency / answersCount / 1000).toFixed(1) : null;

    return {
      totalSteps: steps.length,
      answersCount,
      correctCount,
      accuracy,
      avgSpeed,
      explanationsCount,
      ratingsCount,
    };
  }, [steps]);

  // Filtered steps
  const filteredSteps = useMemo(() => {
    return steps.filter(({ payload }) => {
      if (filterType === 'answers') return payload.action === 'answer_attempt';
      if (filterType === 'ratings') return payload.action === 'self_rating_blended';
      if (filterType === 'system') return payload.action !== 'answer_attempt' && payload.action !== 'self_rating_blended';
      return true;
    });
  }, [steps, filterType]);

  const toggleRaw = (stepNum) => {
    setShowRawJson(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-24 animate-fade-in-up">

      {/* ── Page Header ── */}
      <div className="mb-8 p-6 sm:p-8 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'var(--green)' }}>
              <TerminalWindow size={14} weight="bold" />
              <span>Audit Trail · Bayesian Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Newsreader, Georgia, serif', color: 'var(--text-primary)' }}>
              Session History & Decision Trace
            </h1>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Complete deterministic log of Bayesian probability updates, question attempts, and adaptive explanations.
            </p>
          </div>

          <button
            onClick={onRefresh}
            id="refresh-trace"
            className="btn btn-ghost self-start sm:self-center px-3.5 py-2 text-xs flex items-center gap-2 rounded"
            style={{ border: '1px solid var(--border-mid)' }}
          >
            <ArrowsClockwise size={14} />
            <span>Refresh Log</span>
          </button>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6" style={{ borderTop: '1px solid var(--border-dim)' }}>
          
          <div className="p-3 rounded" style={{ background: 'var(--bg-subtle)' }}>
            <div className="label-caps mb-1" style={{ color: 'var(--text-muted)' }}>Total Events</div>
            <div className="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.totalSteps} <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>steps</span>
            </div>
          </div>

          <div className="p-3 rounded" style={{ background: 'var(--bg-subtle)' }}>
            <div className="label-caps mb-1" style={{ color: 'var(--text-muted)' }}>Question Accuracy</div>
            <div className="font-mono text-lg font-bold" style={{ color: metrics.accuracy !== null && metrics.accuracy >= 70 ? 'var(--green)' : 'var(--text-primary)' }}>
              {metrics.accuracy !== null ? `${metrics.accuracy}%` : '—'}{' '}
              {metrics.answersCount > 0 && (
                <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                  ({metrics.correctCount}/{metrics.answersCount})
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded" style={{ background: 'var(--bg-subtle)' }}>
            <div className="label-caps mb-1" style={{ color: 'var(--text-muted)' }}>Avg Speed</div>
            <div className="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.avgSpeed !== null ? `${metrics.avgSpeed}s` : '—'}
            </div>
          </div>

          <div className="p-3 rounded" style={{ background: 'var(--bg-subtle)' }}>
            <div className="label-caps mb-1" style={{ color: 'var(--text-muted)' }}>Explanations</div>
            <div className="font-mono text-lg font-bold" style={{ color: 'var(--indigo)' }}>
              {metrics.explanationsCount}{' '}
              <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>generated</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Filters & Timeline Stream ── */}
      <div className="space-y-4">

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}>
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'All Events', count: steps.length },
              { id: 'answers', label: 'Answers', count: metrics.answersCount },
              { id: 'ratings', label: 'Self-Ratings', count: metrics.ratingsCount },
              { id: 'system', label: 'System', count: steps.length - metrics.answersCount - metrics.ratingsCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                style={{
                  background: filterType === tab.id ? 'var(--accent)' : 'transparent',
                  color: filterType === tab.id ? '#ffffff' : 'var(--text-secondary)',
                  border: filterType === tab.id ? '1px solid var(--accent)' : '1px solid transparent',
                  fontWeight: filterType === tab.id ? '600' : '500'
                }}
              >
                <span>{tab.label}</span>
                <span 
                  className="font-mono text-[10px] px-1.5 py-0.2 rounded"
                  style={{
                    background: filterType === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                    color: filterType === tab.id ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            Showing {filteredSteps.length} items
          </div>
        </div>

        {/* Activity Timeline List */}
        {filteredSteps.length === 0 ? (
          <div className="p-12 text-center text-sm rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', color: 'var(--text-muted)' }}>
            No activity records matching this filter yet. Practice questions to generate Bayesian telemetry traces.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSteps.map((stepItem) => {
              const { step, payload, ts } = stepItem;
              const isExpanded = expandedStep === step;
              const isAnswer = payload.action === 'answer_attempt';
              const isStart = payload.action === 'session_start';
              const isRating = payload.action === 'self_rating_blended';
              const isNext = payload.action === 'next_concept_selected';
              const isReExplain = payload.re_explain || payload.action === 'explanation_generated';

              // Format date/time
              const timeStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              // Left indicator border color
              let leftBorder = 'var(--border-mid)';
              let headerIcon = <Brain size={18} style={{ color: 'var(--text-secondary)' }} />;
              let eventTitle = payload.action || 'System Event';

              if (isAnswer) {
                if (payload.correct) {
                  leftBorder = 'var(--green)';
                  headerIcon = <CheckCircle size={18} weight="fill" style={{ color: 'var(--green)' }} />;
                  eventTitle = `Answered correctly: ${payload.concept_id}`;
                } else {
                  leftBorder = 'var(--accent)';
                  headerIcon = <XCircle size={18} weight="fill" style={{ color: 'var(--accent)' }} />;
                  eventTitle = `Incorrect answer: ${payload.concept_id}`;
                }
              } else if (isRating) {
                leftBorder = 'var(--indigo)';
                headerIcon = <HandHeart size={18} weight="fill" style={{ color: 'var(--indigo)' }} />;
                eventTitle = `Confidence calibrated: ${payload.concept_id} (Rating ${payload.rating}/5)`;
              } else if (isStart) {
                leftBorder = 'var(--border-bright)';
                headerIcon = <TerminalWindow size={18} style={{ color: 'var(--text-primary)' }} />;
                eventTitle = `Session Initialized (Topic: ${payload.topic || 'All'})`;
              } else if (isNext) {
                leftBorder = 'var(--border-dim)';
                headerIcon = <ChartLineUp size={18} style={{ color: 'var(--text-secondary)' }} />;
                eventTitle = `Next concept selected: ${payload.concept_name || payload.concept_id}`;
              }

              // P_known change calculation
              const pBefore = payload.p_known_before !== undefined ? payload.p_known_before : null;
              const pAfter = payload.p_known_after !== undefined ? payload.p_known_after : payload.p_known;
              const pDelta = pBefore !== null && pAfter !== null ? Math.round((pAfter - pBefore) * 100) : null;

              return (
                <div
                  key={step}
                  className="rounded-lg transition-all"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-mid)',
                    borderLeft: `4px solid ${leftBorder}`
                  }}
                >
                  <div className="p-4 sm:p-5">
                    
                    {/* Top row: step badge, title, and time */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                      
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Step number */}
                        <span 
                          className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-dim)' }}
                        >
                          Step #{step}
                        </span>

                        {/* Event icon & Title */}
                        <div className="flex items-center gap-2">
                          {headerIcon}
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {eventTitle}
                          </span>
                        </div>

                        {/* Status Badges */}
                        {isAnswer && (
                          <span
                            className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              background: payload.correct ? 'var(--green-dim)' : 'var(--red-dim)',
                              color: payload.correct ? 'var(--green)' : 'var(--red)',
                              border: `1px solid ${payload.correct ? 'var(--green-border)' : 'var(--red-border)'}`
                            }}
                          >
                            {payload.correct ? 'CORRECT' : 'INCORRECT'}
                          </span>
                        )}

                        {isReExplain && (
                          <span 
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid var(--amber-border)' }}
                          >
                            <Lightbulb size={11} weight="fill" />
                            <span>EXPLANATION TRIGGERED</span>
                          </span>
                        )}
                      </div>

                      {/* Timestamp & Expand button */}
                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {timeStr}
                        </span>
                        
                        <button
                          onClick={() => setExpandedStep(isExpanded ? null : step)}
                          className="px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors"
                          style={{
                            background: isExpanded ? 'var(--bg-raised)' : 'var(--bg-subtle)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-mid)'
                          }}
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <Code size={12} />
                          <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                          {isExpanded ? <CaretUp size={11} /> : <CaretDown size={11} />}
                        </button>
                      </div>

                    </div>

                    {/* BKT Transition & Metric Details (if applicable) */}
                    {(isAnswer || isRating) && (
                      <div className="mt-3 pt-3 flex flex-wrap items-center gap-4 sm:gap-6 text-xs" style={{ borderTop: '1px solid var(--border-dim)' }}>
                        
                        {/* Probability transition */}
                        {pBefore !== null && pAfter !== null && (
                          <div className="flex items-center gap-2">
                            <span className="label-caps" style={{ color: 'var(--text-muted)' }}>BKT Mastery:</span>
                            <span className="font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                              {Math.round(pBefore * 100)}%
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                            <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                              {Math.round(pAfter * 100)}%
                            </span>
                            
                            {pDelta !== null && (
                              <span 
                                className="font-mono text-[11px] font-bold flex items-center gap-0.5"
                                style={{ color: pDelta >= 0 ? 'var(--green)' : 'var(--accent)' }}
                              >
                                {pDelta >= 0 ? <TrendUp size={12} /> : <TrendDown size={12} />}
                                {pDelta >= 0 ? `+${pDelta}%` : `${pDelta}%`}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Latency */}
                        {payload.latency_ms > 0 && (
                          <div className="flex items-center gap-1.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Timer size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{(payload.latency_ms / 1000).toFixed(1)}s latency</span>
                          </div>
                        )}

                        {/* Explanation Style */}
                        {payload.explanation_style && (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="label-caps" style={{ color: 'var(--text-muted)' }}>Style:</span>
                            <span className="font-mono font-medium px-1.5 py-0.2 rounded" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
                              {payload.explanation_style}
                            </span>
                          </div>
                        )}

                      </div>
                    )}

                    {/* System / Session Start Details */}
                    {isStart && (
                      <div className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        Initialized with <strong>{payload.concepts_initialized}</strong> concepts across <strong>{payload.topic || 'all'}</strong> topics.
                      </div>
                    )}

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 animate-fade-in" style={{ borderTop: '1px solid var(--border-mid)' }}>
                        
                        {/* Key-Value Summary Table */}
                        <div className="mb-3 p-3 rounded text-xs font-mono" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(payload).map(([k, v]) => {
                              if (typeof v === 'object' && v !== null) return null;
                              return (
                                <div key={k} className="flex items-baseline justify-between gap-2">
                                  <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                                  <span className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                                    {String(v)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Raw JSON toggle button */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleRaw(step)}
                            className="text-[11px] font-mono underline cursor-pointer"
                            style={{ color: 'var(--accent)' }}
                          >
                            {showRawJson[step] ? 'Hide raw JSON' : 'View raw JSON telemetry'}
                          </button>
                        </div>

                        {/* Raw JSON viewer */}
                        {showRawJson[step] && (
                          <pre 
                            className="mt-2.5 p-3 rounded text-[11px] font-mono leading-relaxed overflow-x-auto"
                            style={{ 
                              background: '#ffffff', 
                              border: '1px solid var(--border-mid)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {JSON.stringify(payload, null, 2)}
                          </pre>
                        )}

                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}

