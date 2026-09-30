import React from 'react';
import { User, Envelope, ShieldCheck, SignOut, X, Lightning, Trophy } from '@phosphor-icons/react';

export default function ProfileModal({ isOpen, onClose, userName, userEmail, session, overallMastery, onLogout }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(36, 49, 44, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 sm:p-7 animate-fade-in-up shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="badge badge-emerald">
            <User size={13} weight="fill" />
            <span>Learner Profile</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <h2
          className="text-xl font-medium mb-1 leading-snug"
          style={{ fontFamily: 'Newsreader, Georgia, serif', color: 'var(--text-primary)' }}
        >
          {userName || 'Learner Account'}
        </h2>

        <p className="text-xs sm:text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
          Vidya Bayesian Knowledge Tracing &amp; Session Profile
        </p>

        {/* Content */}
        <div className="space-y-4">
          {/* User Hero card */}
          <div
            className="p-4 rounded-lg border flex items-center gap-3.5"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-dim)' }}
          >
            <div
              className="w-12 h-12 rounded flex items-center justify-center text-lg font-bold font-mono shrink-0 shadow-sm"
              style={{
                background: 'var(--green-dim)',
                border: '1px solid var(--green-border)',
                color: 'var(--green)',
              }}
            >
              {(userName || 'D').charAt(0).toUpperCase()}
            </div>
            <div className="space-y-0.5 overflow-hidden flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {userName || 'Demo Learner'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                <Envelope size={13} className="shrink-0" />
                <span className="truncate">{userEmail || 'demo@vidya.ai'}</span>
              </div>
              <div className="pt-1">
                <span className="badge badge-neutral text-[10px] py-0.5 px-2">
                  <ShieldCheck size={12} weight="bold" />
                  <span>BKT Calibrated</span>
                </span>
              </div>
            </div>
          </div>

          {/* Stats & Session Details */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-3 rounded-lg border space-y-1"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-dim)' }}
            >
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Trophy size={13} style={{ color: 'var(--amber)' }} />
                <span className="label-caps" style={{ fontSize: '10px' }}>Mastery</span>
              </div>
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--green)' }}>
                {overallMastery || 0}%
              </div>
            </div>

            <div
              className="p-3 rounded-lg border space-y-1"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-dim)' }}
            >
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Lightning size={13} style={{ color: 'var(--indigo)' }} />
                <span className="label-caps" style={{ fontSize: '10px' }}>Scope</span>
              </div>
              <div className="text-xs font-semibold font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                {session ? (session.topic ? session.topic.toUpperCase() : 'ALL TOPICS') : 'READY'}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="btn w-full py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: 'var(--red-dim)',
                border: '1px solid var(--red-border)',
                color: 'var(--red)',
              }}
            >
              <SignOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
