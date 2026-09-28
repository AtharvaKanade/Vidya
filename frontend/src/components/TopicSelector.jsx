import React from 'react';
import { 
  Network, 
  Cpu, 
  Database, 
  ArrowRight, 
  Sparkle, 
  CheckCircle, 
  Brain,
  ShieldCheck
} from '@phosphor-icons/react';

const TOPICS = [
  {
    id: 'nn',
    name: 'Neural Networks Basics',
    eyebrow: 'FOUNDATIONS · 14 CONCEPTS',
    description: 'Perceptrons, activation functions, loss gradients, backpropagation calculus, and deep architectures.',
    icon: Network,
    accent: 'emerald',
    badge: '14 Sub-Concepts',
    concepts: ['Perceptron', 'Activation Functions', 'Backpropagation', 'Optimizers (Adam)', 'Dropout'],
  },
  {
    id: 'tr',
    name: 'Transformers & Attention',
    eyebrow: 'CORE ARCHITECTURES · 13 CONCEPTS',
    description: 'Scaled dot-product self-attention, QKV projections, multi-head encoders, decoders, and MLM pre-training.',
    icon: Cpu,
    accent: 'indigo',
    badge: '13 Sub-Concepts',
    concepts: ['Scaled Dot-Product', 'QKV Projections', 'Multi-Head Attention', 'Encoder-Decoder', 'BERT vs GPT'],
  },
  {
    id: 'rag',
    name: 'Prompting & RAG Basics',
    eyebrow: 'APPLIED RETRIEVAL · 13 CONCEPTS',
    description: 'Dense vector embeddings, approximate nearest neighbor vector indexing, prompt context injection, and re-ranking.',
    icon: Database,
    accent: 'purple',
    badge: '13 Sub-Concepts',
    concepts: ['Dense Embeddings', 'Vector Databases (HNSW)', 'Context Injection', 'Chain-of-Thought', 'Re-Ranking'],
  },
];

export default function TopicSelector({ onSelectTopic, loading }) {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-28 pb-20">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-[11px] uppercase tracking-[0.2em] font-mono mb-2">
          <Brain size={14} className="text-emerald-400" />
          <span>Bayesian Knowledge Tracing (BKT) Tutor</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
          Learn AI/ML with a tutor that traces <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">what you truly know.</span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
          No superficial quiz scores. Vidya updates posterior mastery probabilities ($p_{'{known}'}$) from every response and only advances when prerequisites are proven.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-400" /> BKT Decides Mastery
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkle size={16} className="text-indigo-400" /> Adaptive Difficulty
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> 40 Curated Sub-Concepts
          </span>
        </div>
      </div>

      {/* Track Selection Cards (Double-Bezel Architecture) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <div
              key={topic.id}
              className="double-bezel p-1.5 rounded-[1.75rem] transition-all duration-300 hover:border-white/20 hover:-translate-y-1 group"
            >
              <div className="double-bezel-inner p-6 sm:p-7 rounded-[1.4rem] h-full flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:border-emerald-500/40 transition-all">
                      <Icon size={20} weight="duotone" />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/5">
                      {topic.badge}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">
                    {topic.eyebrow}
                  </span>

                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-emerald-300 transition-colors">
                    {topic.name}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    {topic.description}
                  </p>

                  {/* Concept Preview Chips */}
                  <div className="space-y-1.5 mb-6">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block">Sample nodes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.concepts.map((c, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 border border-white/5">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nested Island Button */}
                <button
                  disabled={loading}
                  onClick={() => onSelectTopic(topic.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-zinc-950 font-medium text-xs transition-all active:scale-[0.98] border border-white/10 hover:border-transparent group-hover:bg-emerald-400 group-hover:text-zinc-950"
                >
                  <span>Start Track</span>
                  <div className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-zinc-950/20 flex items-center justify-center transition-colors">
                    <ArrowRight size={12} weight="bold" />
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Curriculum Start Option */}
      <div className="text-center">
        <button
          disabled={loading}
          onClick={() => onSelectTopic(null)}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-all text-xs font-mono group"
        >
          <span>Or explore full 40-concept curriculum DAG without topic filter</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
