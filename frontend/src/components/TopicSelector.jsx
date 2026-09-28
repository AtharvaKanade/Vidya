import React from 'react';
import { 
  Network, 
  Cpu, 
  Database, 
  ArrowRight, 
  Sparkle, 
  CheckCircle, 
  Brain,
  ShieldCheck,
  Compass,
  Rocket
} from '@phosphor-icons/react';

const TOPICS = [
  {
    id: 'nn',
    name: 'Neural Networks & Deep Learning',
    badge: '14 Core Topics',
    level: 'Beginner Friendly',
    description: 'Understand how computers learn from scratch: from basic artificial neurons to deep multi-layer neural nets and backpropagation.',
    icon: Network,
    accentColor: 'from-emerald-500/20 to-teal-500/10',
    topicsCovered: ['How Neurons Work', 'Activation Functions', 'Training & Backprop', 'Overfitting & Dropout'],
  },
  {
    id: 'tr',
    name: 'Transformers & Large Language Models',
    badge: '13 Core Topics',
    level: 'Intermediate',
    description: 'Learn the exact architecture behind ChatGPT and modern AI: self-attention, QKV projections, and how LLMs are pre-trained.',
    icon: Cpu,
    accentColor: 'from-indigo-500/20 to-blue-500/10',
    topicsCovered: ['Self-Attention Intuition', 'Multi-Head Attention', 'Encoders & Decoders', 'Pre-training & Fine-tuning'],
  },
  {
    id: 'rag',
    name: 'Prompt Engineering & Modern AI Apps (RAG)',
    badge: '13 Core Topics',
    level: 'Practical AI',
    description: 'Build real-world AI applications: connect LLMs to your private data using vector databases, semantic search, and prompt crafting.',
    icon: Database,
    accentColor: 'from-purple-500/20 to-pink-500/10',
    topicsCovered: ['Prompting Strategies', 'Semantic Embeddings', 'Vector Databases', 'Full RAG Pipeline'],
  },
];

export default function TopicSelector({ onSelectTopic, loading }) {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-28 pb-20">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-1">
          <Sparkle size={14} className="text-emerald-400" />
          <span>Smart Adaptive AI Learning</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
          Master AI and Machine Learning. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
            Step by step, at your own pace.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Vidya is an intelligent tutor that figures out what you know, explains tricky concepts in simple terms, and adapts questions to match your exact confidence level.
        </p>

        {/* Feature Highlights */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs sm:text-sm text-zinc-400">
          <span className="flex items-center gap-2 text-zinc-300">
            <CheckCircle size={16} weight="fill" className="text-emerald-400" /> Adapts to Your Speed
          </span>
          <span className="flex items-center gap-2 text-zinc-300">
            <CheckCircle size={16} weight="fill" className="text-emerald-400" /> Real-World Intuitive Explanations
          </span>
          <span className="flex items-center gap-2 text-zinc-300">
            <CheckCircle size={16} weight="fill" className="text-emerald-400" /> 40 Curated Sub-Topics
          </span>
        </div>
      </div>

      {/* Track Selection Cards (Double-Bezel Architecture) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <div
              key={topic.id}
              className="double-bezel p-1.5 rounded-[1.75rem] transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1 group flex flex-col"
            >
              <div className="double-bezel-inner p-6 sm:p-7 rounded-[1.4rem] h-full flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-105 group-hover:border-emerald-500/40 transition-all">
                      <Icon size={22} weight="duotone" />
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                      {topic.level}
                    </span>
                  </div>

                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    {topic.badge}
                  </span>

                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-emerald-300 transition-colors">
                    {topic.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
                    {topic.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-2 mb-6">
                    <span className="text-[11px] uppercase text-zinc-400 font-semibold block">You will learn:</span>
                    <div className="space-y-1">
                      {topic.topicsCovered.map((c, i) => (
                        <div key={i} className="text-xs text-zinc-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nested Island Button */}
                <button
                  disabled={loading}
                  onClick={() => onSelectTopic(topic.id)}
                  className="w-full flex items-center justify-between px-5 py-3 rounded-full bg-white text-zinc-950 hover:bg-emerald-300 font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] shadow-lg group-hover:bg-emerald-400"
                >
                  <span>Start Learning</span>
                  <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                    <ArrowRight size={14} weight="bold" />
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Track Option */}
      <div className="text-center">
        <button
          disabled={loading}
          onClick={() => onSelectTopic(null)}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/[0.03] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all text-xs sm:text-sm font-medium group"
        >
          <Compass size={16} className="text-emerald-400" />
          <span>Or explore the full curriculum with all 40 topics mixed</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
