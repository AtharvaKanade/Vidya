import React, { useState, useMemo } from 'react';
import { 
  ClockCounterClockwise, 
  Code, 
  Lightbulb, 
  ArrowsClockwise, 
  TrendUp, 
  TrendDown, 
  CheckCircle, 
  XCircle, 
  HandHeart, 
  Brain, 
  Timer, 
  ChartLineUp, 
  CaretDown, 
  CaretUp,
  Sparkle,
  BookOpen,
  ArrowRight,
  Lightning
} from '@phosphor-icons/react';

const CONCEPT_NAMES = {
  nn_perceptron: 'Perceptron & Weights',
  nn_linear_algebra: 'Vectors & Matrices for ML',
  nn_activation: 'Activation Functions',
  nn_loss: 'Loss Functions',
  nn_gradient_descent: 'Gradient Descent',
  nn_backprop: 'Backpropagation & Gradients',
  nn_mlp: 'Multi-Layer Perceptrons',
  nn_regularization: 'Regularization & Dropout',
  tr_tokenization: 'Tokenization & Embeddings',
  tr_positional_encoding: 'Positional Encoding',
  tr_self_attention: 'Self-Attention Mechanism',
  tr_multi_head: 'Multi-Head Attention',
  tr_transformer_block: 'Transformer Block Architecture',
  tr_encoder_decoder: 'Encoder-Decoder vs Decoder-Only',
  tr_temperature: 'Temperature & Sampling',
  tr_kv_cache: 'KV Caching & Generation',
  rag_embeddings: 'Dense Vector Embeddings',
  rag_similarity: 'Cosine Similarity & Distance',
  rag_chunking: 'Document Chunking Strategies',
  rag_vector_db: 'Vector Databases & Indexing',
  rag_hybrid_search: 'Hybrid Retrieval & Reranking',
  rag_context_stuffing: 'Context Windows & Stuffing',
  rag_eval_ragas: 'RAG Evaluation & Faithfulness',
};

function formatConceptName(id) {
  if (!id) return 'General Practice';
  if (CONCEPT_NAMES[id]) return CONCEPT_NAMES[id];
  return id
    .replace(/^(nn|tr|rag)_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTopicName(topicOrId) {
  if (!topicOrId) return 'General AI';
  if (topicOrId === 'nn' || topicOrId.startsWith('nn_')) return 'Neural Networks';
  if (topicOrId === 'tr' || topicOrId.startsWith('tr_')) return 'Transformers';
  if (topicOrId === 'rag' || topicOrId.startsWith('rag_')) return 'Applied RAG';
  return topicOrId;
}

function getMasteryTier(p) {
  if (p >= 0.85) return { label: 'Mastered', color: 'var(--green)', bg: 'var(--green-dim)', border: 'var(--green-border)' };
  if (p >= 0.60) return { label: 'Proficient', color: 'var(--indigo)', bg: 'var(--indigo-dim)', border: '#c5d9dc' };
  if (p >= 0.35) return { label: 'Developing', color: 'var(--amber)', bg: 'var(--amber-dim)', border: 'var(--amber-border)' };
  return { label: 'Novice', color: 'var(--text-secondary)', bg: 'var(--bg-raised)', border: 'var(--border-mid)' };
}

export default function TraceViewer({ traceData, onRefresh }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'answers' | 'ratings' | 'system'
  const [showTechnicalDetails, setShowTechnicalDetails] = useState({});
  const [showRawJson, setShowRawJson] = useState({});

  if (!traceData || !traceData.steps) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-20 text-center text-sm animate-fade-in" style={{ color: 'var(--text-muted)' }}>
        <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center animate-spin" style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)' }}>
          <ClockCounterClockwise size={20} style={{ color: 'var(--green)' }} />
        </div>
        Loading learning history...
      </div>
    );
  }

  const steps = traceData.steps;

  // Compute session summary metrics
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

  const toggleTechnical = (stepNum) => {
    setShowTechnicalDetails(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const toggleRaw = (stepNum) => {
    setShowRawJson(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-24 animate-fade-in-up">

      {/* ── Page Header ── */}
      <div className="mb-8 p-7 sm:p-9 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-mid)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs sm:text-sm font-semibold tracking-wider uppercase text-[var(--green)]">
              <Sparkle size={16} weight="fill" />
              <span>Learning Activity & Progress History</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight font-serif text-[var(--text-primary)]">
              Session History & Decision Trace
            </h1>
            <p className="text-sm sm:text-base mt-2 leading-relaxed text-[var(--text-secondary)] max-w-2xl">
              Review your answered questions, skill progression, and adaptive explanations over time.
            </p>
          </div>

          <button
            onClick={onRefresh}
            id="refresh-trace"
            className="btn btn-ghost self-start sm:self-center px-4 py-2.5 text-xs sm:text-sm flex items-center gap-2 rounded-xl border border-[var(--border-mid)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <ArrowsClockwise size={16} />
            <span>Refresh History</span>
          </button>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-7 pt-7 border-t border-[var(--border-dim)]">
          
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-dim)]">
            <div className="label-caps mb-1.5 text-[var(--text-muted)] text-[11px] sm:text-xs">Questions Practiced</div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {metrics.answersCount}{' '}
              <span className="text-xs sm:text-sm font-normal text-[var(--text-secondary)]">attempts</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-dim)]">
            <div className="label-caps mb-1.5 text-[var(--text-muted)] text-[11px] sm:text-xs">Accuracy Rate</div>
            <div className="font-mono text-2xl sm:text-3xl font-bold" style={{ color: metrics.accuracy !== null && metrics.accuracy >= 70 ? 'var(--green)' : 'var(--text-primary)' }}>
              {metrics.accuracy !== null ? `${metrics.accuracy}%` : '—'}{' '}
              {metrics.answersCount > 0 && (
                <span className="text-xs sm:text-sm font-normal text-[var(--text-secondary)]">
                  ({metrics.correctCount}/{metrics.answersCount})
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-dim)]">
            <div className="label-caps mb-1.5 text-[var(--text-muted)] text-[11px] sm:text-xs">Average Response</div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {metrics.avgSpeed !== null ? `${metrics.avgSpeed}s` : '—'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-dim)]">
            <div className="label-caps mb-1.5 text-[var(--text-muted)] text-[11px] sm:text-xs">AI Explanations</div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-[var(--indigo)]">
              {metrics.explanationsCount}{' '}
              <span className="text-xs sm:text-sm font-normal text-[var(--text-secondary)]">reviewed</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Filters & Timeline Stream ── */}
      <div className="space-y-4">

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-mid)]">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All Activity', count: steps.length },
              { id: 'answers', label: 'Questions', count: metrics.answersCount },
              { id: 'ratings', label: 'Confidence Ratings', count: metrics.ratingsCount },
              { id: 'system', label: 'System Events', count: steps.length - metrics.answersCount - metrics.ratingsCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-[var(--accent)] text-white font-semibold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{tab.label}</span>
                <span 
                  className={`font-mono text-xs px-2 py-0.5 rounded ${
                    filterType === tab.id ? 'bg-white/25 text-white font-bold' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs sm:text-sm font-mono text-[var(--text-muted)] pr-2">
            Showing {filteredSteps.length} records
          </div>
        </div>

        {/* Activity Timeline List */}
        {filteredSteps.length === 0 ? (
          <div className="p-12 text-center text-sm sm:text-base rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-mid)] text-[var(--text-muted)]">
            No activity records matching this filter yet. Practice questions to record learning history.
          </div>
        ) : (
          <div className="space-y-4">
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

              const friendlyConcept = formatConceptName(payload.concept_name || payload.concept_id);
              const topicName = formatTopicName(payload.concept_id || payload.topic);

              // Visual styling & titles
              let headerIcon = <Brain size={20} className="text-[var(--text-secondary)]" />;
              let eventTitle = payload.action || 'Learning Step';
              let badgeColor = 'var(--bg-subtle)';
              let badgeText = 'Activity';

              if (isAnswer) {
                if (payload.correct) {
                  headerIcon = <CheckCircle size={22} weight="fill" className="text-[var(--green)]" />;
                  eventTitle = `Correct answer on ${friendlyConcept}`;
                  badgeColor = 'var(--green-dim)';
                  badgeText = 'Correct';
                } else {
                  headerIcon = <XCircle size={22} weight="fill" className="text-[var(--red)]" />;
                  eventTitle = `Needs review: ${friendlyConcept}`;
                  badgeColor = 'var(--red-dim)';
                  badgeText = 'Incorrect';
                }
              } else if (isRating) {
                headerIcon = <HandHeart size={22} weight="fill" className="text-[var(--indigo)]" />;
                eventTitle = `Self-rating recorded: ${friendlyConcept}`;
                badgeColor = 'var(--indigo-dim)';
                badgeText = `Confidence: ${payload.rating || 0}/5`;
              } else if (isStart) {
                headerIcon = <BookOpen size={22} className="text-[var(--accent)]" />;
                eventTitle = `Started study track in ${formatTopicName(payload.topic)}`;
                badgeColor = 'var(--accent-dim)';
                badgeText = 'Session Start';
              } else if (isNext) {
                headerIcon = <ChartLineUp size={22} className="text-[var(--indigo)]" />;
                eventTitle = `Selected next focus: ${friendlyConcept}`;
                badgeColor = 'var(--indigo-dim)';
                badgeText = 'Adaptive Path';
              }

              // P_known change calculation
              const pBefore = payload.p_known_before !== undefined ? payload.p_known_before : null;
              const pAfter = payload.p_known_after !== undefined ? payload.p_known_after : payload.p_known;
              const pDelta = pBefore !== null && pAfter !== null ? Math.round((pAfter - pBefore) * 100) : null;
              const afterPercent = pAfter !== null && pAfter !== undefined ? Math.round(pAfter * 100) : null;
              const masteryTier = afterPercent !== null ? getMasteryTier(afterPercent / 100) : null;

              return (
                <div
                  key={step}
                  className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-mid)] shadow-xs transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    
                    {/* Top row: step badge, human-friendly title, and timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Step number */}
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-dim)]">
                          #{step}
                        </span>

                        {/* Event icon & Human Title */}
                        <div className="flex items-center gap-2.5">
                          {headerIcon}
                          <span className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                            {eventTitle}
                          </span>
                        </div>

                        {/* Status Chip */}
                        {isAnswer && (
                          <span
                            className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                            style={{
                              background: payload.correct ? 'var(--green-dim)' : 'var(--red-dim)',
                              color: payload.correct ? 'var(--green)' : 'var(--red)',
                              border: `1px solid ${payload.correct ? 'var(--green-border)' : 'var(--red-border)'}`
                            }}
                          >
                            {badgeText}
                          </span>
                        )}

                        {/* Domain Tag */}
                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-0.5 rounded-md border border-[var(--border-dim)] hidden sm:inline-block">
                          {topicName}
                        </span>

                        {isReExplain && (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--amber-dim)] text-[var(--amber)] border border-[var(--amber-border)]">
                            <Lightbulb size={14} weight="fill" />
                            <span>AI Explanation</span>
                          </span>
                        )}
                      </div>

                      {/* Timestamp & Accordion Toggle */}
                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <span className="font-mono text-xs sm:text-sm text-[var(--text-muted)]">
                          {timeStr}
                        </span>
                        
                        <button
                          onClick={() => setExpandedStep(isExpanded ? null : step)}
                          className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-mid)] hover:bg-[var(--bg-raised)]"
                          aria-label={isExpanded ? 'Hide details' : 'View details'}
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                          {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                        </button>
                      </div>

                    </div>

                    {/* Visual Learning Progression Bar & Stats */}
                    {(isAnswer || isRating) && (
                      <div className="mt-4 pt-4 flex flex-wrap items-center justify-between gap-4 text-sm border-t border-[var(--border-dim)]">
                        
                        {/* Friendly Mastery Indicator */}
                        {pBefore !== null && pAfter !== null && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="label-caps text-xs text-[var(--text-muted)] font-semibold">Mastery:</span>
                            <span className="font-mono font-bold text-base text-[var(--text-secondary)]">
                              {Math.round(pBefore * 100)}%
                            </span>
                            <ArrowRight size={14} className="text-[var(--text-muted)]" />
                            <span className="font-mono font-bold text-base text-[var(--text-primary)]">
                              {Math.round(pAfter * 100)}%
                            </span>
                            
                            {pDelta !== null && (
                              <span 
                                className="font-mono text-xs sm:text-sm font-bold px-2 py-0.5 rounded flex items-center gap-0.5"
                                style={{
                                  background: pDelta >= 0 ? 'var(--green-dim)' : 'var(--red-dim)',
                                  color: pDelta >= 0 ? 'var(--green)' : 'var(--red)',
                                }}
                              >
                                {pDelta >= 0 ? <TrendUp size={14} /> : <TrendDown size={14} />}
                                {pDelta >= 0 ? `+${pDelta}%` : `${pDelta}%`}
                              </span>
                            )}

                            {/* Mastery Tier Pill */}
                            {masteryTier && (
                              <span
                                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                style={{
                                  background: masteryTier.bg,
                                  color: masteryTier.color,
                                  border: `1px solid ${masteryTier.border}`,
                                }}
                              >
                                {masteryTier.label}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Latency & Explanation Type */}
                        <div className="flex items-center gap-4 text-xs sm:text-sm text-[var(--text-secondary)]">
                          {payload.latency_ms > 0 && (
                            <div className="flex items-center gap-1.5 font-mono">
                              <Timer size={16} className="text-[var(--text-muted)]" />
                              <span>{(payload.latency_ms / 1000).toFixed(1)}s response</span>
                            </div>
                          )}

                          {payload.explanation_style && (
                            <div className="flex items-center gap-1.5">
                              <span className="label-caps text-xs text-[var(--text-muted)]">Style:</span>
                              <span className="capitalize font-semibold text-[var(--text-primary)]">
                                {payload.explanation_style.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {/* System / Session Start Summary */}
                    {isStart && (
                      <div className="mt-2.5 text-xs text-[var(--text-secondary)] flex items-center gap-2">
                        <Sparkle size={14} className="text-[var(--accent)]" />
                        <span>Curriculum initialized with {payload.concepts_initialized || 23} concepts across {formatTopicName(payload.topic)}.</span>
                      </div>
                    )}

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-[var(--border-mid)] animate-fade-in space-y-4">
                        
                        {/* Human Learning Summary Card */}
                        <div className="p-5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-dim)] space-y-3.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-[var(--text-primary)]">
                              Learning Step Overview
                            </span>
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                              Concept: {friendlyConcept}
                            </span>
                          </div>

                          <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
                            {isAnswer && payload.correct && (
                              `Great work! You answered correctly on "${friendlyConcept}" in ${(payload.latency_ms / 1000).toFixed(1)} seconds. Your estimated mastery increased from ${Math.round((pBefore || 0) * 100)}% to ${afterPercent}%.`
                            )}
                            {isAnswer && !payload.correct && (
                              `You missed this question on "${friendlyConcept}". Vidya recalibrated your mastery from ${Math.round((pBefore || 0) * 100)}% to ${afterPercent}% and flagged this concept for spaced review.`
                            )}
                            {isRating && (
                              `You provided a self-assessment rating of ${payload.rating || 0}/5 for "${friendlyConcept}". Vidya blended your self-assessment with past performance to refine your mastery estimate.`
                            )}
                            {isNext && (
                              `Based on your prerequisite readiness, Vidya selected "${friendlyConcept}" as your next recommended study target.`
                            )}
                            {isStart && (
                              `Your learning session has been initialized. Vidya will adapt question selection and explanations based on your responses.`
                            )}
                          </p>

                          {/* Visual Progress Bar */}
                          {afterPercent !== null && (
                            <div className="pt-1">
                              <div className="flex justify-between text-xs sm:text-sm font-mono mb-1.5 text-[var(--text-muted)]">
                                <span className="font-medium">Concept Mastery</span>
                                <span className="font-bold text-[var(--text-primary)]">{afterPercent}%</span>
                              </div>
                              <div className="h-2.5 w-full rounded-full bg-[var(--border-dim)] overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${afterPercent}%`,
                                    background: afterPercent >= 85 ? 'var(--green)' : afterPercent >= 60 ? 'var(--indigo)' : 'var(--accent)',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Collapsible Technical / Developer Telemetry */}
                        <div className="pt-2 border-t border-[var(--border-dim)]">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleTechnical(step)}
                              className="text-xs sm:text-sm font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] hover:underline flex items-center gap-2 cursor-pointer py-1"
                            >
                              <Code size={15} />
                              <span>{showTechnicalDetails[step] ? 'Hide technical BKT parameters' : 'Inspect developer BKT parameters & raw telemetry'}</span>
                            </button>
                          </div>

                          {showTechnicalDetails[step] && (
                            <div className="mt-3 space-y-3 animate-fade-in">
                              {/* Key-Value Telemetry Table */}
                              <div className="p-4 rounded-xl bg-white border border-[var(--border-mid)] text-xs sm:text-sm font-mono">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {Object.entries(payload).map(([k, v]) => {
                                    if (typeof v === 'object' && v !== null) return null;
                                    return (
                                      <div key={k} className="flex items-baseline justify-between gap-2 py-1 border-b border-[var(--border-dim)] last:border-0">
                                        <span className="text-[var(--text-muted)]">{k}:</span>
                                        <span className="font-semibold text-right text-[var(--text-primary)]">
                                          {String(v)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Raw JSON toggle */}
                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleRaw(step)}
                                  className="text-xs font-mono text-[var(--accent)] hover:underline cursor-pointer"
                                >
                                  {showRawJson[step] ? 'Hide raw JSON snippet' : 'View raw JSON payload'}
                                </button>
                              </div>

                              {showRawJson[step] && (
                                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono leading-relaxed overflow-x-auto">
                                  {JSON.stringify(payload, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>

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
