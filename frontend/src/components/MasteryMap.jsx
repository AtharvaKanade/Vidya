import React, { useState } from 'react';
import { 
  TreeStructure, 
  CheckCircle, 
  WarningCircle, 
  CircleDashed,
  MagnifyingGlass,
  Sparkle
} from '@phosphor-icons/react';

export default function MasteryMap({ masteryData, onConceptClick }) {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!masteryData || !masteryData.concepts) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-32 text-center text-zinc-500">
        Loading curriculum mastery state...
      </div>
    );
  }

  const concepts = masteryData.concepts;

  // Stats calculation
  const totalConcepts = concepts.length;
  const masteredCount = concepts.filter(c => c.p_known >= 0.85).length;
  const shakyCount = concepts.filter(c => c.p_known >= 0.40 && c.p_known < 0.85).length;
  const weakCount = concepts.filter(c => c.p_known < 0.40).length;
  const overallPercentage = totalConcepts > 0 ? Math.round((masteredCount / totalConcepts) * 100) : 0;

  // Filtering
  const filteredConcepts = concepts.filter(c => {
    if (selectedTopic !== 'all' && c.topic !== selectedTopic) return false;
    if (selectedStatus === 'mastered' && c.p_known < 0.85) return false;
    if (selectedStatus === 'shaky' && (c.p_known < 0.40 || c.p_known >= 0.85)) return false;
    if (selectedStatus === 'weak' && c.p_known >= 0.40) return false;
    if (searchQuery.trim() && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-20">
      {/* Header & Overall Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-[11px] uppercase tracking-[0.2em] font-mono mb-2">
            <TreeStructure size={14} className="text-emerald-400" />
            <span>Curriculum DAG · 40 Concepts</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Live Mastery Map
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time Bayesian knowledge state representation across all curriculum sub-concepts.
          </p>
        </div>

        {/* Progress Metrics Pod */}
        <div className="double-bezel p-1 rounded-2xl">
          <div className="double-bezel-inner px-5 py-3 rounded-[0.9rem] flex items-center gap-6">
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-500">Mastery Progress</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {masteredCount}/{totalConcepts} <span className="text-xs text-zinc-400 font-normal">({overallPercentage}%)</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> {masteredCount} Mastered
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> {shakyCount} Shaky
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-600" /> {weakCount} Weak
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-white/[0.02] border border-white/5">
        {/* Topic Tabs */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'nn', label: 'Neural Networks' },
            { id: 'tr', label: 'Transformers' },
            { id: 'rag', label: 'Prompting & RAG' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTopic(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedTopic === tab.id
                  ? 'bg-white text-zinc-950 font-semibold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by mastery status"
            className="bg-zinc-900 text-zinc-300 border border-white/10 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="mastered">Mastered (&gt;= 0.85)</option>
            <option value="shaky">Shaky (0.40 - 0.84)</option>
            <option value="weak">Weak (&lt; 0.40)</option>
          </select>

          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/80 text-zinc-200 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500/50 w-44"
            />
          </div>
        </div>
      </div>

      {/* Concepts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredConcepts.map((concept) => {
          const isMastered = concept.p_known >= 0.85;
          const isShaky = concept.p_known >= 0.40 && concept.p_known < 0.85;

          let badgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
          let borderGlow = 'border-white/5 hover:border-white/20';
          if (isMastered) {
            badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            borderGlow = 'border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.05)] hover:border-emerald-500/60';
          } else if (isShaky) {
            badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            borderGlow = 'border-amber-500/20 hover:border-amber-500/50';
          }

          return (
            <div
              key={concept.id}
              onClick={() => onConceptClick && onConceptClick(concept)}
              className={`p-4 rounded-2xl bg-zinc-950/70 border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between ${borderGlow}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.03] text-zinc-400 border border-white/5">
                    {concept.topic}
                  </span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {concept.level}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-zinc-200 mb-2 leading-snug">
                  {concept.name}
                </h4>
              </div>

              {/* Progress Bar & Probability */}
              <div className="pt-3 border-t border-white/[0.04] mt-2">
                <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mb-1">
                  <span>p_known:</span>
                  <span className="font-semibold text-zinc-200">{concept.p_known.toFixed(4)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMastered ? 'bg-emerald-400' : isShaky ? 'bg-amber-400' : 'bg-zinc-600'
                    }`}
                    style={{ width: `${Math.max(6, Math.round(concept.p_known * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConcepts.length === 0 && (
        <div className="text-center py-16 text-zinc-500 text-xs font-mono">
          No concepts match your filter criteria.
        </div>
      )}
    </div>
  );
}
