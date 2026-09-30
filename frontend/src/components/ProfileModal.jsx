import React from 'react';
import { User, Envelope, ShieldCheck, SignOut, X, Lightning, Trophy } from '@phosphor-icons/react';

export default function ProfileModal({ isOpen, onClose, userName, userEmail, session, overallMastery, onLogout }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden animate-scale-up"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-dim)' }}>
          <div className="flex items-center gap-2">
            <User size={20} className="text-emerald-400" />
            <h2 className="text-lg font-semibold">Learner Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-white/10"
            aria-label="Close profile modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Hero card */}
          <div
            className="p-5 rounded-2xl border flex items-center gap-4"
            style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-mid)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold font-mono shadow-md"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff' }}
            >
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 overflow-hidden">
              <h3 className="font-semibold text-base truncate">{userName || 'Learner'}</h3>
              <div className="flex items-center gap-1.5 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                <Envelope size={14} className="shrink-0" />
                <span className="truncate">{userEmail || 'No email associated'}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                <ShieldCheck size={12} />
                <span>Verified Account</span>
              </div>
            </div>
          </div>

          {/* Stats & Session Details */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-4 rounded-2xl border space-y-1"
              style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-dim)' }}
            >
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Trophy size={14} className="text-amber-400" />
                <span>Overall Mastery</span>
              </div>
              <div className="text-xl font-bold font-mono">{overallMastery || 0}%</div>
            </div>

            <div
              className="p-4 rounded-2xl border space-y-1"
              style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-dim)' }}
            >
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Lightning size={14} className="text-blue-400" />
                <span>Session Status</span>
              </div>
              <div className="text-xs font-semibold font-mono truncate" style={{ color: session ? '#34d399' : 'var(--text-secondary)' }}>
                {session ? `Active (${session.topic ? session.topic.toUpperCase() : 'All Topics'})` : 'Ready to Start'}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-3">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all shadow-md"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
              }}
            >
              <SignOut size={18} />
              <span>Log Out of Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
