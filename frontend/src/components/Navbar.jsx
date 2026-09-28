import React from 'react';
import { 
  Brain, 
  TreeStructure, 
  ClockCounterClockwise, 
  Sparkle,
  ArrowsCounterClockwise,
  CheckCircle,
  Lightning
} from '@phosphor-icons/react';

export default function Navbar({ activeTab, setActiveTab, session, onResetSession, overallMastery }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center justify-between gap-4 md:gap-8 px-4 py-2.5 rounded-full bg-zinc-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 max-w-4xl w-full">
        {/* Brand */}
        <div className="flex items-center gap-2.5 pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Brain size={18} weight="duotone" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              Vidya <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">BKT</span>
            </span>
          </div>
        </div>

        {/* Center Tabs (only if session active) */}
        {session ? (
          <nav className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/5">
            <button
              onClick={() => setActiveTab('tutor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'tutor'
                  ? 'bg-white text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Lightning size={14} weight={activeTab === 'tutor' ? 'fill' : 'regular'} />
              <span>Tutor</span>
            </button>

            <button
              onClick={() => setActiveTab('mastery')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'mastery'
                  ? 'bg-white text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TreeStructure size={14} weight={activeTab === 'mastery' ? 'fill' : 'regular'} />
              <span>Mastery Map</span>
            </button>

            <button
              onClick={() => setActiveTab('trace')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'trace'
                  ? 'bg-white text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ClockCounterClockwise size={14} weight={activeTab === 'trace' ? 'fill' : 'regular'} />
              <span>Audit Trace</span>
            </button>
          </nav>
        ) : (
          <div className="text-xs text-zinc-400 hidden sm:block">
            Bayesian Knowledge Tracing Engine · 40 Concepts
          </div>
        )}

        {/* Right Action */}
        <div className="flex items-center gap-3 pr-1">
          {session ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Mastery</span>
                <span className="text-xs font-semibold text-emerald-400 font-mono">
                  {overallMastery}%
                </span>
              </div>
              <button
                onClick={onResetSession}
                title="Switch Topic / New Session"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all text-xs flex items-center gap-1"
              >
                <ArrowsCounterClockwise size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Engine Online
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
