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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="glass rounded-3xl p-1 w-full max-w-md animate-fade-in-up border border-white/10 shadow-2xl">
        <div className="glass-card rounded-[1.35rem] p-6 sm:p-7">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="badge badge-emerald">
              <HandHeart size={13} weight="fill" />
              <span>Confidence Check-In</span>
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-400 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <h2 className="heading-section text-white text-lg font-bold mb-2">
            How confident do you feel with{' '}
            <span className="text-emerald-400">{concept.name}</span>?
          </h2>

          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-6">
            Vidya factors your confidence rating alongside question performance into the BKT engine to tailor next challenges.
          </p>

          {/* Rating options */}
          <div className="space-y-2 mb-6">
            {LEVELS.map((lvl) => {
              const isSelected = rating === lvl.value;
              return (
                <button
                  key={lvl.value}
                  onClick={() => setRating(lvl.value)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.06] text-gray-300 hover:bg-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base sm:text-lg">{lvl.emoji}</span>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">{lvl.label}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{lvl.desc}</div>
                    </div>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-emerald-400 text-black'
                        : 'bg-white/[0.06] border border-white/[0.1] text-gray-400'
                    }`}
                  >
                    {lvl.value}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action */}
          <button
            id="self-rating-submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold shadow-lg hover:shadow-emerald-500/25"
          >
            {submitting ? 'Updating BKT Prior Beliefs...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
