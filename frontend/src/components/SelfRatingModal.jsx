import React, { useState } from 'react';
import { ShieldCheck, Sparkle, X } from '@phosphor-icons/react';

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

  const LEVELS = [
    { value: 1, label: 'Very Low', desc: 'Still completely unfamiliar' },
    { value: 2, label: 'Low', desc: 'Recognize terms, but unsure of math' },
    { value: 3, label: 'Moderate', desc: 'Can apply with guidance' },
    { value: 4, label: 'High', desc: 'Solid conceptual understanding' },
    { value: 5, label: 'Expert', desc: 'Can implement from first principles' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="double-bezel p-1.5 rounded-[2rem] max-w-lg w-full">
        <div className="double-bezel-inner p-6 sm:p-8 rounded-[1.6rem]">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] uppercase font-mono tracking-wider">
              <ShieldCheck size={14} />
              <span>Human Calibration Line</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight mb-2">
            Calibrate Your Confidence on <span className="text-emerald-400">{concept.name}</span>
          </h3>

          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            Vidya detected ambiguous response signals on this concept. Help calibrate your posterior knowledge state by self-rating your genuine comfort level.
          </p>

          {/* Rating Options */}
          <div className="space-y-2 mb-8">
            {LEVELS.map((lvl) => {
              const isSelected = rating === lvl.value;
              return (
                <button
                  key={lvl.value}
                  onClick={() => setRating(lvl.value)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-zinc-300'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-zinc-100">{lvl.label}</div>
                    <div className="text-[11px] text-zinc-400">{lvl.desc}</div>
                  </div>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs border ${
                    isSelected
                      ? 'bg-emerald-400 text-zinc-950 border-emerald-300'
                      : 'border-white/10 text-zinc-500'
                  }`}>
                    {lvl.value}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-3 px-6 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all active:scale-[0.98] shadow-xl"
          >
            {submitting ? 'Calibrating Mastery State...' : 'Confirm Self-Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
