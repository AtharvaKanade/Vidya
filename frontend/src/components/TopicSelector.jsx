import React from 'react';
import { 
  Network, 
  Cpu, 
  Database, 
  ArrowRight, 
  Sparkle, 
  CheckCircle, 
  Compass, 
  Brain, 
  Lightning,
  ShieldCheck,
  GraduationCap
} from '@phosphor-icons/react';

const TOPICS = [
  {
    id: 'nn',
    name: 'Neural Networks & Deep Learning',
    level: 'Foundational',
    description: 'Go from zero to intuitive understanding of how computers learn — neurons, backpropagation, and loss surfaces explained simply.',
    icon: Network,
    topicsCovered: ['Perceptrons & Weights', 'Activation Functions', 'Backpropagation & Gradients', 'Overfitting & Regularization'],
  },
  {
    id: 'tr',
    name: 'Transformers & LLM Architecture',
    level: 'Intermediate',
    description: 'Deconstruct the architecture powering modern AI — self-attention math, multi-head projection, positional encoding, and scaling.',
    icon: Cpu,
    topicsCovered: ['Query-Key-Value Intuition', 'Multi-Head Attention', 'Encoder-Decoder Blocks', 'Next-Token Generation'],
  },
  {
    id: 'rag',
    name: 'RAG & Applied AI Systems',
    level: 'Applied AI',
    description: 'Learn to build production AI applications — connect LLMs to external knowledge using dense vector search and semantic retrieval.',
    icon: Database,
    topicsCovered: ['Dense Embeddings', 'Vector Similarity (Cosine)', 'Chunking & Context Windows', 'Hybrid Retrieval Pipelines'],
  },
];

export default function TopicSelector({ onSelectTopic, loading }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24" style={{ paddingTop: '7rem' }}>
      {/* ── Focused Centered Hero Section ── */}
      <section className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
        <div className="badge badge-emerald inline-flex items-center gap-1.5 mb-5 shadow-sm">
          <Sparkle size={13} weight="fill" />
          <span>Bayesian Adaptive AI Tutor</span>
        </div>

        <h1 className="heading-display text-white mb-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
          Master AI Concepts.<br />
          <span style={{ 
            background: 'linear-gradient(135deg, #34d399 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            At Your Exact Pace.
          </span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
          Vidya continuously tracks your understanding using Bayesian probability — dynamically adjusting question difficulty and rephrasing explanations until every concept truly clicks.
        </p>

        {/* Value Prop Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300 bg-white/[0.03] border border-white/[0.07] rounded-full px-4 py-2 shadow-sm">
            <Lightning size={16} weight="fill" className="text-emerald-400 shrink-0" />
            <span>Real-time BKT Engine</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300 bg-white/[0.03] border border-white/[0.07] rounded-full px-4 py-2 shadow-sm">
            <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0" />
            <span>Zero Jargon Fallbacks</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300 bg-white/[0.03] border border-white/[0.07] rounded-full px-4 py-2 shadow-sm">
            <GraduationCap size={16} weight="fill" className="text-indigo-400 shrink-0" />
            <span>40 Curated Concepts</span>
          </div>
        </div>

        {/* Primary Call to Action */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onSelectTopic('nn')}
            disabled={loading}
            className="btn btn-primary px-6 py-3 text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all"
          >
            <span>Start with Neural Networks</span>
            <ArrowRight size={16} weight="bold" />
          </button>
          <button
            onClick={() => onSelectTopic(null)}
            disabled={loading}
            className="btn btn-ghost px-5 py-3 text-sm text-gray-300 hover:text-white"
          >
            <span>Explore All 40 Topics</span>
          </button>
        </div>
      </section>

      {/* ── Learning Tracks Header ── */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <h2 className="heading-section text-2xl sm:text-3xl text-white mb-2 font-bold">
          Choose Your Learning Track
        </h2>
        <p className="text-gray-400 text-sm">
          Select a focused domain or dive into our full mixed AI curriculum.
        </p>
      </div>

      {/* ── Track Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {TOPICS.map((topic, i) => {
          const Icon = topic.icon;
          return (
            <div
              key={topic.id}
              className={`glass rounded-3xl p-1.5 animate-fade-in-up stagger-${i + 1} flex flex-col group transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1.5`}
            >
              <div className="glass-card rounded-[1.35rem] p-6 flex flex-col justify-between h-full min-h-[380px]">
                <div>
                  {/* Icon & Badge Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 group-hover:scale-110 transition-transform">
                      <Icon size={22} weight="duotone" />
                    </div>
                    <span className="badge badge-neutral text-xs">{topic.level}</span>
                  </div>

                  <h3 className="heading-section text-lg font-bold text-white mb-2.5">
                    {topic.name}
                  </h3>

                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-6">
                    {topic.description}
                  </p>

                  {/* Syllabus / Key Concepts */}
                  <div className="mb-6">
                    <span className="label-caps block mb-2 text-[10px] text-gray-500 tracking-wider">
                      KEY CONCEPTS INCLUDED
                    </span>
                    <div className="space-y-1.5">
                      {topic.topicsCovered.map((t) => (
                        <div key={t} className="flex items-center gap-2 text-xs text-gray-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Pinned CTA */}
                <div className="pt-4 border-t border-white/[0.05] mt-auto">
                  <button
                    disabled={loading}
                    onClick={() => onSelectTopic(topic.id)}
                    id={`start-${topic.id}`}
                    className="btn btn-primary w-full justify-between py-2.5 px-4 rounded-full text-xs sm:text-sm"
                  >
                    <span>Start This Track</span>
                    <div className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center shrink-0">
                      <ArrowRight size={13} weight="bold" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Social Proof / Architecture Bar ── */}
      <div className="max-w-3xl mx-auto rounded-2xl bg-white/[0.02] border border-white/[0.06] px-6 py-4 flex flex-wrap items-center justify-around gap-4 text-xs text-gray-400 mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} weight="fill" className="text-emerald-400" />
          <span>Bayesian Knowledge Tracing (BKT)</span>
        </div>
        <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-600" />
        <div className="flex items-center gap-2">
          <Brain size={18} weight="fill" className="text-indigo-400" />
          <span>Zero-Hallucination Fallback Explanations</span>
        </div>
        <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-600" />
        <div className="flex items-center gap-2">
          <Sparkle size={18} weight="fill" className="text-emerald-400" />
          <span>Dynamic Question Difficulty</span>
        </div>
      </div>

      {/* ── Full Curriculum Option ── */}
      <div className="text-center">
        <button
          disabled={loading}
          onClick={() => onSelectTopic(null)}
          id="start-all-topics"
          className="btn btn-ghost px-5 py-2.5 rounded-full text-xs text-gray-400 hover:text-white inline-flex items-center gap-2"
        >
          <Compass size={16} className="text-emerald-400" />
          <span>Or explore all 40 topics across all domains</span>
          <ArrowRight size={13} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
}
