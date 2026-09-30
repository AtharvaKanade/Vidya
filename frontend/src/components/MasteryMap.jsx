import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Sparkle, 
  MagnifyingGlass, 
  SlidersHorizontal,
  Info,
  ArrowRight,
  ChartLineUp,
  Rows,
  SquaresFour,
  PencilSimple
} from '@phosphor-icons/react';

export default function MasteryMap({ masteryData, onConceptClick }) {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  if (!masteryData || !masteryData.concepts) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-20 text-center text-sm animate-fade-in" style={{ color: 'var(--text-muted)' }}>
        <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center animate-spin" style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)' }}>
          <ChartLineUp size={20} style={{ color: 'var(--green)' }} />
        </div>
        Loading Bayesian Knowledge Tracing state...
      </div>
    );
  }

  const concepts = masteryData.concepts;
  const total = concepts.length;
  const mastered = concepts.filter(c => c.p_known >= 0.85).length;
  const inProgress = concepts.filter(c => c.p_known >= 0.40 && c.p_known < 0.85).length;
  const upNext = concepts.filter(c => c.p_known < 0.40).length;
  const overallPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  // Domain breakdown
  const topicCounts = useMemo(() => {
    const counts = { all: total, nn: 0, tr: 0, rag: 0 };
    concepts.forEach(c => {
      if (counts[c.topic] !== undefined) counts[c.topic]++;
    });
    return counts;
  }, [concepts, total]);

  const filtered = concepts.filter(c => {
    if (selectedTopic !== 'all' && c.topic !== selectedTopic) return false;
    if (selectedStatus === 'mastered' && c.p_known < 0.85) return false;
    if (selectedStatus === 'inProgress' && (c.p_known < 0.40 || c.p_known >= 0.85)) return false;
    if (selectedStatus === 'upNext' && c.p_known >= 0.40) return false;
    if (searchQuery.trim() && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const topicTabs = [
    { id: 'all', label: 'All Topics', count: topicCounts.all },
    { id: 'nn',  label: 'Neural Networks', count: topicCounts.nn },
    { id: 'tr',  label: 'Transformers', count: topicCounts.tr },
    { id: 'rag', label: 'Prompting & RAG', count: topicCounts.rag },
  ];

  // SVG ring parameters
  const miniRadius = 22;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniOffset = miniCircumference - ((overallPct / 100) * miniCircumference);

  const getTopicLabel = (topic) => {
    switch (topic) {
      case 'nn': return 'Neural Networks';
      case 'tr': return 'Transformers';
      case 'rag': return 'Prompting & RAG';
      default: return topic.toUpperCase();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-24 animate-fade-in-up">

      {/* ── Page Header & Stats Banner ── */}
      <div className="mb-8 p-6 sm:p-8 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'var(--green)' }}>
              <BookOpen size={14} weight="bold" />
              <span>Curriculum State · Bayesian Knowledge Tracing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Newsreader, Georgia, serif', color: 'var(--text-primary)' }}>
              Curriculum Mastery Graph
            </h1>
            <p className="text-sm mt-1.5 max-w-xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Tracking your real-time mastery probability <em>P(L<sub>t</sub>)</em> across {total} AI curriculum concepts. Click any card to calibrate confidence via the Human Approval Line.
            </p>
          </div>

          {/* Stats Pod */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-4 rounded-lg self-start lg:self-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
            
            {/* SVG Ring */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 54 54">
                <circle
                  cx="27"
                  cy="27"
                  r={miniRadius}
                  stroke="var(--border-mid)"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="27"
                  cy="27"
                  r={miniRadius}
                  stroke="var(--green)"
                  strokeWidth="5"
                  strokeDasharray={miniCircumference}
                  strokeDashoffset={miniOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {overallPct}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="label-caps" style={{ color: 'var(--text-muted)' }}>Syllabus Mastery</div>
              <div className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {mastered} <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>of {total} Mastered</span>
              </div>
            </div>

            <div className="w-px h-10 hidden sm:block" style={{ background: 'var(--border-mid)' }} />

            {/* Status Breakdown Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
                <span>{mastered} Mastered (&ge;85%)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid var(--amber-border)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--amber)' }} />
                <span>{inProgress} In Progress</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border-mid)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-muted)' }} />
                <span>{upNext} Up Next (&lt;40%)</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── Filter & Search Control Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 p-3 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}>
        
        {/* Domain Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {topicTabs.map(tab => {
            const active = selectedTopic === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTopic(tab.id)}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                style={{
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  border: active ? '1px solid var(--accent)' : '1px solid transparent',
                  fontWeight: active ? '600' : '500'
                }}
              >
                <span>{tab.label}</span>
                <span 
                  className="font-mono text-[10px] px-1.5 py-0.2 rounded"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                    color: active ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Status, and View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            aria-label="Filter by mastery status"
            className="px-3 py-1.5 text-xs rounded outline-none font-medium cursor-pointer"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-mid)'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="mastered">Mastered (&ge;85%)</option>
            <option value="inProgress">In Progress (40–84%)</option>
            <option value="upNext">Up Next (&lt;40%)</option>
          </select>

          {/* Search input */}
          <div className="relative flex-1 sm:flex-initial">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-44 pl-8 pr-3 py-1.5 text-xs rounded outline-none"
              style={{
                background: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-mid)'
              }}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded p-0.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-mid)' }}>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className="p-1 rounded transition-colors"
              style={{
                background: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <SquaresFour size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="List view"
              className="p-1 rounded transition-colors"
              style={{
                background: viewMode === 'table' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'table' ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Rows size={16} />
            </button>
          </div>

        </div>

      </div>

      {/* ── Concepts Display ── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((concept) => {
            const pct = Math.round(concept.p_known * 100);
            const isMastered = concept.p_known >= 0.85;
            const isProgress = concept.p_known >= 0.40 && !isMastered;

            let badgeBg = 'var(--bg-subtle)';
            let badgeColor = 'var(--text-muted)';
            let badgeBorder = 'var(--border-mid)';
            let badgeLabel = 'Up Next';
            let barColor = 'var(--text-muted)';

            if (isMastered) {
              badgeBg = 'var(--green-dim)';
              badgeColor = 'var(--green)';
              badgeBorder = 'var(--green-border)';
              badgeLabel = 'Mastered 🏆';
              barColor = 'var(--green)';
            } else if (isProgress) {
              badgeBg = 'var(--amber-dim)';
              badgeColor = 'var(--amber)';
              badgeBorder = 'var(--amber-border)';
              badgeLabel = 'Developing ⚡';
              barColor = 'var(--amber)';
            }

            return (
              <div
                key={concept.id}
                onClick={() => onConceptClick && onConceptClick(concept)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onConceptClick && onConceptClick(concept)}
                className="p-4 rounded-lg flex flex-col justify-between cursor-pointer transition-all hover:shadow-md group"
                style={{
                  background: 'var(--bg-surface)',
                  border: isMastered ? '1px solid var(--green-border)' : '1px solid var(--border-mid)',
                }}
              >
                <div>
                  {/* Card Header: Topic & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span 
                      className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-dim)' }}
                    >
                      {concept.topic}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}
                    >
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Concept Name */}
                  <h3 
                    className="text-sm font-semibold leading-snug mb-1 transition-colors group-hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {concept.name}
                  </h3>
                </div>

                {/* Progress bar & calibration action */}
                <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      P(L<sub>t</sub>) = {concept.p_known.toFixed(2)}
                    </span>
                    <span className="font-mono font-bold" style={{ color: isMastered ? 'var(--green)' : 'var(--text-primary)' }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar line */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(6, pct)}%`,
                        background: barColor,
                      }}
                    />
                  </div>

                  {/* Interactive calibration hint */}
                  <div className="flex items-center justify-between mt-2.5 pt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
                      <PencilSimple size={11} />
                      <span>Calibrate rating</span>
                    </span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table / List View */
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-mid)' }}>
                  <th className="py-3 px-4 font-semibold label-caps">Topic</th>
                  <th className="py-3 px-4 font-semibold label-caps">Concept Name</th>
                  <th className="py-3 px-4 font-semibold label-caps">Status</th>
                  <th className="py-3 px-4 font-semibold label-caps">Mastery Probability P(L)</th>
                  <th className="py-3 px-4 font-semibold label-caps text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
                {filtered.map((concept) => {
                  const pct = Math.round(concept.p_known * 100);
                  const isMastered = concept.p_known >= 0.85;
                  const isProgress = concept.p_known >= 0.40 && !isMastered;

                  return (
                    <tr 
                      key={concept.id}
                      onClick={() => onConceptClick && onConceptClick(concept)}
                      className="hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                        <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-dim)' }}>
                          {concept.topic.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {concept.name}
                      </td>
                      <td className="py-3 px-4">
                        {isMastered ? (
                          <span className="badge badge-emerald text-[10px]">Mastered</span>
                        ) : isProgress ? (
                          <span className="badge badge-amber text-[10px]">In Progress</span>
                        ) : (
                          <span className="badge badge-neutral text-[10px]">Up Next</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${Math.max(6, pct)}%`, 
                                background: isMastered ? 'var(--green)' : isProgress ? 'var(--amber)' : 'var(--text-muted)' 
                              }} 
                            />
                          </div>
                          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {pct}% ({concept.p_known.toFixed(2)})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onConceptClick && onConceptClick(concept);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded transition-colors"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--accent)', border: '1px solid var(--border-mid)' }}
                        >
                          Calibrate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-sm rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', color: 'var(--text-muted)' }}>
          No concepts match your filter or search query.
        </div>
      )}

      {/* ── BKT Mechanics Reference Note ── */}
      <div className="mt-8 p-5 rounded-lg flex items-start gap-3.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}>
        <Info size={20} style={{ color: 'var(--indigo)', flexShrink: 0, marginTop: '2px' }} />
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>How Vidya evaluates mastery:</strong> Vidya uses a 4-parameter standard Bayesian Knowledge Tracing engine:
          Prior mastery <em>P(L<sub>0</sub>) = 0.20</em>, Transition probability <em>P(T) = 0.15</em>, Slip <em>P(S) = 0.10</em>, and Guess <em>P(G) = 0.20</em>.
          When you answer questions or calibrate via self-ratings, posterior probabilities update mathematically without LLM hallucinations. Concepts with <em>P(L<sub>t</sub>) &ge; 0.85</em> are considered mastered.
        </div>
      </div>

    </div>
  );
}

