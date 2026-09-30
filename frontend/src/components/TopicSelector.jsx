import React from 'react';
import { Network, Cpu, Database, ArrowRight, Sparkle } from '@phosphor-icons/react';

const TOPICS = [
  {
    id: 'nn',
    name: 'Neural Networks & Deep Learning',
    level: 'Foundational',
    description: 'How computers learn from examples, from a single neuron to the shape of a loss surface.',
    icon: Network,
    topicsCovered: ['Perceptrons & Weights', 'Activation Functions', 'Backpropagation & Gradients', 'Overfitting & Regularization'],
  },
  {
    id: 'tr',
    name: 'Transformers & LLM Architecture',
    level: 'Intermediate',
    description: 'A look inside language models: attention, position, and how the next token gets chosen.',
    icon: Cpu,
    topicsCovered: ['Query-Key-Value Intuition', 'Multi-Head Attention', 'Encoder-Decoder Blocks', 'Next-Token Generation'],
  },
  {
    id: 'rag',
    name: 'RAG & Applied AI Systems',
    level: 'Applied AI',
    description: 'Connect language models to useful information with retrieval, embeddings, and better context.',
    icon: Database,
    topicsCovered: ['Dense Embeddings', 'Vector Similarity (Cosine)', 'Chunking & Context Windows', 'Hybrid Retrieval Pipelines'],
  },
];

export default function TopicSelector({ onSelectTopic, loading }) {
  return (
    <div className="topic-index">
      <section className="study-intro animate-fade-in-up">
        <div className="study-intro-copy">
          <div className="study-kicker"><Sparkle size={14} weight="fill" /> YOUR NEXT STUDY SESSION</div>
          <h1>AI makes more sense<br /><span>one idea at a time.</span></h1>
          <p>Choose a subject. We’ll find a good first question and take it from there.</p>
          <button
            onClick={() => onSelectTopic(null)}
            disabled={loading}
            className="study-all-link"
            id="start-all-topics"
          >
            Browse the full curriculum <ArrowRight size={15} weight="bold" />
          </button>
        </div>
        <div className="study-doodle" aria-hidden="true">
          <span className="doodle-node node-one"><Network size={20} /></span>
          <span className="doodle-node node-two"><Cpu size={20} /></span>
          <span className="doodle-node node-three"><Database size={20} /></span>
          <span className="doodle-line line-one" />
          <span className="doodle-line line-two" />
          <span className="doodle-note">start anywhere<br />keep the useful bits</span>
        </div>
      </section>

      <section className="path-list" aria-labelledby="path-list-title">
        <div className="path-list-heading">
          <div>
            <span className="path-eyebrow">THE STUDY LIST</span>
            <h2 id="path-list-title">What are you curious about?</h2>
          </div>
          <span className="path-count">{TOPICS.length} starting points</span>
        </div>

        <div className="path-rows">
          {TOPICS.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <article
                key={topic.id}
                id={`start-${topic.id}`}
                role="button"
                tabIndex={loading ? -1 : 0}
                aria-disabled={loading}
                aria-label={`Start ${topic.name}`}
                onClick={() => !loading && onSelectTopic(topic.id)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !loading) {
                    e.preventDefault();
                    onSelectTopic(topic.id);
                  }
                }}
                className={`path-row path-${topic.id}${loading ? ' is-loading' : ''}`}
              >
                <span className="path-number">0{index + 1}</span>
                <div className="path-icon"><Icon size={23} weight="regular" /></div>
                <div className="path-main">
                  <div className="path-meta"><span>{topic.level}</span><span aria-hidden="true">/</span><span>{topic.topicsCovered.length} ideas</span></div>
                  <h3>{topic.name}</h3>
                  <p>{topic.description}</p>
                </div>
                <div className="path-concepts" aria-label="Topics covered">
                  {topic.topicsCovered.map((concept) => <span key={concept}>{concept}</span>)}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}