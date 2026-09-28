import React, { useState } from 'react';
import { 
  TreeStructure, 
  CheckCircle, 
  WarningCircle, 
  CircleDashed,
  MagnifyingGlass,
  Sparkle,
  BookOpen
} from '@phosphor-icons/react';

export default function MasteryMap({ masteryData, onConceptClick }) {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!masteryData || !masteryData.concepts) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-32 text-center text-zinc-400">
        Loading your knowledge map...
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-2">
            <BookOpen size={14} className="text-emerald-400" />
            <span>Curriculum Progress · 40 Core Topics</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Your Knowledge Map
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            See everything you've learned and what unlocks as you advance.
          </p>
        </div>

        {/* Progress Metrics Pod */}
        <div className="double-bezel p-1 rounded-2xl">
          <div className="double-bezel-inner px-5 py-3.5 rounded-[0.9rem] flex items-center gap-6">
            <div>
              <div className="text-[11px] uppercase text-zinc-400 font-semibold">Total Progress</div>
              <div className="text-xl font-bold text-emerald-400">
                {overallPercentage}% <span className="text-xs text-zinc-400 font-normal">({masteredCount}/{totalConcepts} Topics)</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> {masteredCount} Mastered
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> {shakyCount} In Progress
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" /> {weakCount} Up Next
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
        {/* Topic Tabs */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'nn', label: 'Neural Networks' },
            { id: 'tr', label: 'Transformers & LLMs' },
            { id: 'rag', label: 'Prompting & RAG' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTopic(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedTopic === tab.id
                  ? 'bg-white text-zinc-950 font-bold shadow'
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
            aria-label="Filter topics by status"
            className="bg-zinc-900 text-zinc-300 border border-white/10 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="mastered">Mastered (85%+)</option>
            <option value="shaky">In Progress (40% - 84%)</option>
            <option value="weak">Up Next (&lt; 40%)</option>
          </select>

          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/90 text-zinc-100 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500/50 w-44"
            />
          </div>
        </div>
      </div>

      {/* Concepts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredConcepts.map((concept) => {
          const percent = Math.round(concept.p_known * 100);
          const isMastered = concept.p_known >= 0.85;
          const isShaky = concept.p_known >= 0.40 && concept.p_known < 0.85;

          let statusBadge = { label: 'Up Next', style: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
          let borderGlow = 'border-white/5 hover:border-white/20';
          if (isMastered) {
            statusBadge = { label: 'Mastered 🏆', style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-semibold' };
            borderGlow = 'border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.06)] hover:border-emerald-500/60';
          } else if (isShaky) {
            statusBadge = { label: 'In Progress ⚡', style: 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-medium' };
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
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/5">
                    {concept.topic}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge.style}`}>
                    {statusBadge.label}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-zinc-100 mb-2 leading-snug">
                  {concept.name}
                </h4>
              </div>

              {/* Progress Bar & Percentage */}
              <div className="pt-3 border-t border-white/[0.04] mt-2">
                <div className="flex justify-between items-center text-xs text-zinc-400 mb-1.5">
                  <span>Confidence:</span>
                  <span className="font-bold text-zinc-200">{percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMastered ? 'bg-emerald-400' : isShaky ? 'bg-amber-400' : 'bg-indigo-400'
                    }`}
                    style={{ width: `${Math.max(6, percent)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConcepts.length === 0 && (
        <div className="text-center py-16 text-zinc-400 text-sm">
          No topics match your search.
        </div>
      )}
    </div>
  );
}
