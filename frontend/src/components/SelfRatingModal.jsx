import React, { useState } from 'react';
import { X, HandHeart } from '@phosphor-icons/react';

const LEVELS = [
  { value: 1, emoji: '🌱', label: "Brand new to this",        desc: "Haven't seen this before" },
  { value: 2, emoji: '🤔', label: "Heard of it, not clear",   desc: "I recognize the term but couldn't explain it" },
  { value: 3, emoji: '⚡', label: "Getting the hang of it",   desc: "I follow examples but need practice" },
  { value: 4, emoji: '🎯', label: "Pretty confident",         desc: "I understand it and can solve problems" },
  { value: 5, emoji: '🏆', label: "Could teach this",         desc: "I'd be comfortable explaining it to someone else" },
];

export default function SelfRatingModal({ isOpen, concept, onClose, onSubmitRating }) {
  const [rating, setRating] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !concept) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitRating(concept.id, rating);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(36, 49, 44, 0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div 
        className="w-full max-w-md rounded-xl p-6 sm:p-7 animate-fade-in-up shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="badge badge-emerald">
            <HandHeart size={13} weight="fill" />
            <span>Confidence Calibration</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <h2 
          className="text-xl font-medium mb-2 leading-snug"
          style={{ fontFamily: 'Newsreader, Georgia, serif', color: 'var(--text-primary)' }}
        >
          How confident do you feel with{' '}
          <span style={{ color: 'var(--accent)' }}>{concept.name}</span>?
        </h2>

        <p className="text-xs sm:text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          Vidya blends your rating (30% weight) with question history (70% weight) into the BKT engine to choose your next optimal challenge.
        </p>

        {/* Rating options */}
        <div className="space-y-2 mb-6">
          {LEVELS.map((lvl) => {
            const isSelected = rating === lvl.value;
            return (
              <button
                key={lvl.value}
                onClick={() => setRating(lvl.value)}
                className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all"
                style={{
                  background: isSelected ? 'var(--accent-dim)' : 'var(--bg-subtle)',
                  border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--border-dim)',
                  color: isSelected ? 'var(--accent-text)' : 'var(--text-primary)'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{lvl.emoji}</span>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {lvl.label}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {lvl.desc}
                    </div>
                  </div>
                </div>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
                  style={{
                    background: isSelected ? 'var(--accent)' : 'var(--bg-surface)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    border: isSelected ? 'none' : '1px solid var(--border-mid)'
                  }}
                >
                  {lvl.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action button */}
        <button
          id="self-rating-submit"
          disabled={submitting}
          onClick={handleSubmit}
          className="btn btn-primary w-full py-2.5 text-xs sm:text-sm font-bold"
        >
          {submitting ? 'Updating BKT Prior Beliefs...' : 'Calibrate & Save'}
        </button>
      </div>
    </div>
  );
}

