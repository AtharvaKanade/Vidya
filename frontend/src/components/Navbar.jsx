import React from 'react';
import { Brain, Lightning, TreeStructure, ClockCounterClockwise, ArrowsCounterClockwise } from '@phosphor-icons/react';

export default function Navbar({ activeTab, setActiveTab, session, onResetSession, overallMastery }) {
  const tabs = [
    { id: 'tutor',   label: 'Practice',     icon: Lightning },
    { id: 'mastery', label: 'My Progress',  icon: TreeStructure },
    { id: 'trace',   label: 'History',      icon: ClockCounterClockwise },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center justify-between gap-4 px-3.5 py-2 rounded-full max-w-4xl w-full"
        style={{
          background: 'rgba(14, 14, 18, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 1px 0 rgba(255, 255, 255, 0.06) inset',
        }}
      >
        {/* Brand */}
        <button
          onClick={onResetSession}
          className="flex items-center gap-2.5 pl-1 group"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Go to home"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
            style={{
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: 'var(--accent)',
            }}
          >
            <Brain size={18} weight="duotone" />
          </div>
          <span style={{ fontSize: '0.925rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Vidya
          </span>
          <span
            className="hidden sm:inline"
            style={{
              fontSize: '0.625rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: 'rgba(52, 211, 153, 0.1)',
              color: 'var(--accent-text)',
              border: '1px solid rgba(52, 211, 153, 0.25)',
            }}
          >
            AI Tutor
          </span>
        </button>

        {/* Center tabs — only visible when a session is active */}
        {session ? (
          <nav
            className="flex items-center gap-1 rounded-full p-1"
            style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
            aria-label="Main navigation"
          >
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="flex items-center gap-1.5 rounded-full transition-all"
                  style={{
                    padding: '0.375rem 0.875rem',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                    background: active ? 'linear-gradient(135deg, #34d399, #10b981)' : 'transparent',
                    color: active ? '#052e16' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 8px rgba(52, 211, 153, 0.35)' : 'none',
                  }}
                >
                  <Icon size={13} weight={active ? 'fill' : 'regular'} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden sm:flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
              style={{ background: 'var(--accent)', display: 'inline-block' }}
            />
            Adapts in real time
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3 pr-1">
          {session ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="label-caps">Overall</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-text)' }}>
                  {overallMastery}% mastered
                </span>
              </div>
              <button
                onClick={onResetSession}
                title="Start a new session"
                className="group"
                style={{
                  padding: '0.45rem',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
                aria-label="Start new session"
              >
                <ArrowsCounterClockwise size={14} />
              </button>
            </div>
          ) : (
            <div
              className="badge badge-emerald"
              style={{ fontSize: '0.6875rem' }}
            >
              Ready to learn
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
