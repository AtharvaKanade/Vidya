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
      <div className="pointer-events-auto flex items-center justify-between gap-3 md:gap-8 px-4 py-2.5 rounded-full bg-zinc-950/85 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 max-w-4xl w-full">
        {/* Brand */}
        <div 
          onClick={onResetSession}
          className="flex items-center gap-2.5 pl-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Brain size={18} weight="duotone" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Vidya <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI Tutor</span>
            </span>
          </div>
        </div>

        {/* Center Tabs (when session active) */}
        {session ? (
          <nav className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/5">
            <button
              onClick={() => setActiveTab('tutor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'tutor'
                  ? 'bg-white text-zinc-950 font-semibold shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Lightning size={14} weight={activeTab === 'tutor' ? 'fill' : 'regular'} />
              <span>Learn & Practice</span>
            </button>

            <button
              onClick={() => setActiveTab('mastery')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'mastery'
                  ? 'bg-white text-zinc-950 font-semibold shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TreeStructure size={14} weight={activeTab === 'mastery' ? 'fill' : 'regular'} />
              <span>Knowledge Map</span>
            </button>

            <button
              onClick={() => setActiveTab('trace')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'trace'
                  ? 'bg-white text-zinc-950 font-semibold shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ClockCounterClockwise size={14} weight={activeTab === 'trace' ? 'fill' : 'regular'} />
              <span>Activity Log</span>
            </button>
          </nav>
        ) : (
          <div className="text-xs text-zinc-400 hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Personalized AI Learning</span>
          </div>
        )}

        {/* Right Action */}
        <div className="flex items-center gap-3 pr-1">
          {session ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Mastery</span>
                <span className="text-xs font-bold text-emerald-400">
                  {overallMastery}% Complete
                </span>
              </div>
              <button
                onClick={onResetSession}
                title="Change Topic or Start New Session"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all text-xs flex items-center gap-1 group"
              >
                <ArrowsCounterClockwise size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              Ready to Learn
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
