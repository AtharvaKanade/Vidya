import React, { useState } from 'react';
import { MagnifyingGlass, BookOpen, CheckCircle, Sparkle, SlidersHorizontal } from '@phosphor-icons/react';

export default function MasteryMap({ masteryData, onConceptClick }) {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!masteryData || !masteryData.concepts) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-36 text-center text-gray-500 text-sm animate-fade-in">
        Loading knowledge state map from BKT engine...
      </div>
    );
  }

  const concepts = masteryData.concepts;
  const total = concepts.length;
  const mastered = concepts.filter(c => c.p_known >= 0.85).length;
  const inProgress = concepts.filter(c => c.p_known >= 0.40 && c.p_known < 0.85).length;
  const upNext = concepts.filter(c => c.p_known < 0.40).length;
  const overallPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const filtered = concepts.filter(c => {
    if (selectedTopic !== 'all' && c.topic !== selectedTopic) return false;
    if (selectedStatus === 'mastered' && c.p_known < 0.85) return false;
    if (selectedStatus === 'inProgress' && (c.p_known < 0.40 || c.p_known >= 0.85)) return false;
    if (selectedStatus === 'upNext' && c.p_known >= 0.40) return false;
    if (searchQuery.trim() && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const topicTabs = [
    { id: 'all', label: 'All Domains' },
    { id: 'nn',  label: 'Neural Networks' },
    { id: 'tr',  label: 'Transformers' },
    { id: 'rag', label: 'Prompting & RAG' },
  ];

  // SVG mini-ring parameters for stats pod
  const miniRadius = 18;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniOffset = miniCircumference - ((overallPct / 100) * miniCircumference);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 animate-fade-in-up" style={{ paddingTop: '6.5rem' }}>

      {/* ── Top Header & Stats Pod ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="badge badge-emerald inline-flex items-center gap-1.5 mb-3 shadow-sm">
            <BookOpen size={12} weight="fill" />
            <span>40 Core Curriculum Concepts</span>
          </div>
          <h1 className="heading-section text-2xl sm:text-3xl text-white font-extrabold tracking-tight">
            Curriculum Mastery Graph
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Real-time Bayesian belief state across all tracked topics and prerequisites.
          </p>
        </div>

        {/* Stats Pod with Mini Gauge */}
        <div className="glass rounded-2xl p-1 shrink-0 border border-white/10 shadow-xl">
          <div className="glass-card rounded-[0.85rem] flex items-center gap-5 p-4">
            {/* Mini SVG Gauge */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r={miniRadius}
                  className="text-white/[0.08]"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={miniRadius}
                  className="text-emerald-400 transition-all duration-700 ease-out"
                  strokeWidth="4"
                  strokeDasharray={miniCircumference}
                  strokeDashoffset={miniOffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white">
                {overallPct}%
              </span>
            </div>

            <div>
              <div className="label-caps mb-0.5 text-[10px]">TOTAL PROGRESS</div>
              <div className="font-mono text-sm sm:text-base font-bold text-white">
                {mastered} / {total} <span className="text-xs text-gray-500 font-normal">Concepts</span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/[0.08]" />

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {mastered} Mastered
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {inProgress} In Progress
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-600" />
                {upNext} Up Next
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        {/* Domain Tabs */}
        <div className="flex flex-wrap gap-1">
          {topicTabs.map(tab => {
            const active = selectedTopic === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTopic(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-emerald-400 text-black font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
            className="bg-[#121218] text-gray-300 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer focus:border-emerald-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="mastered">Mastered (≥85%)</option>
            <option value="inProgress">In Progress (40-84%)</option>
            <option value="upNext">Up Next (&lt;40%)</option>
          </select>

          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#121218] text-white pl-8 pr-3 py-1.5 text-xs border border-white/10 rounded-xl outline-none w-36 sm:w-44 focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Concept Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((concept) => {
          const pct = Math.round(concept.p_known * 100);
          const isMastered = concept.p_known >= 0.85;
          const isProgress = concept.p_known >= 0.40 && !isMastered;

          let cardBorder = 'border-white/[0.06] hover:border-white/[0.15]';
          let badgeEl = <span className="badge badge-neutral text-[10px]">Up Next</span>;

          if (isMastered) {
            cardBorder = 'border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20';
            badgeEl = <span className="badge badge-emerald text-[10px]">Mastered 🏆</span>;
          } else if (isProgress) {
            cardBorder = 'border-amber-500/30 hover:border-amber-500/60';
            badgeEl = <span className="badge badge-amber text-[10px]">In Progress ⚡</span>;
          }

          return (
            <div
              key={concept.id}
              onClick={() => onConceptClick && onConceptClick(concept)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onConceptClick && onConceptClick(concept)}
              className={`glass-card p-4 rounded-2xl border ${cardBorder} flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    {concept.topic}
                  </span>
                  {badgeEl}
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug mb-3">
                  {concept.name}
                </h4>
              </div>

              {/* Progress bar */}
              <div className="pt-3 border-t border-white/[0.05]">
                <div className="flex justify-between items-center mb-1 text-[11px] text-gray-400">
                  <span>Confidence</span>
                  <span className="font-mono font-semibold text-gray-200">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMastered ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                    }`}
                    style={{ width: `${Math.max(6, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">
          No concepts match your filter or search query.
        </div>
      )}
    </div>
  );
}
