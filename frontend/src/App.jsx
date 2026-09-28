import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TopicSelector from './components/TopicSelector';
import TutorView from './components/TutorView';
import MasteryMap from './components/MasteryMap';
import TraceViewer from './components/TraceViewer';
import SelfRatingModal from './components/SelfRatingModal';
import { 
  startSession, 
  getNextConcept, 
  submitAnswer, 
  getMastery, 
  getTraces 
} from './api';
import { WarningCircle, X } from '@phosphor-icons/react';

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('selector'); // 'selector' | 'tutor' | 'mastery' | 'trace'
  const [currentConcept, setCurrentConcept] = useState(null);
  const [masteryData, setMasteryData] = useState(null);
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selfRatingModalOpen, setSelfRatingModalOpen] = useState(false);
  const [selfRatingConcept, setSelfRatingConcept] = useState(null);

  // Restore stored session if present in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vidya_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
        setActiveTab('tutor');
        refreshSessionData(parsed.session_id);
      } catch (e) {
        localStorage.removeItem('vidya_session');
      }
    }
  }, []);

  const refreshSessionData = async (sessionId) => {
    try {
      const [nextRes, masteryRes, traceRes] = await Promise.all([
        getNextConcept(sessionId),
        getMastery(sessionId),
        getTraces(sessionId),
      ]);
      setCurrentConcept(nextRes);
      setMasteryData(masteryRes);
      setTraceData(traceRes);
    } catch (err) {
      console.error('Failed refreshing session data', err);
      setError(err.message);
    }
  };

  const handleStartSession = async (topicId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await startSession(topicId);
      setSession(res);
      localStorage.setItem('vidya_session', JSON.stringify(res));
      await refreshSessionData(res.session_id);
      setActiveTab('tutor');
    } catch (err) {
      setError(`Connection failed — make sure the backend is running at http://localhost:8000`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async ({ conceptId, questionId, correct, latencyMs }) => {
    if (!session) return;
    setError(null);

    const result = await submitAnswer(session.session_id, {
      conceptId,
      questionId,
      correct,
      latencyMs,
    });

    // Refresh mastery map and traces in background
    getMastery(session.session_id).then(setMasteryData).catch(console.error);
    getTraces(session.session_id).then(setTraceData).catch(console.error);

    return result;
  };

  const handleResetSession = () => {
    localStorage.removeItem('vidya_session');
    setSession(null);
    setCurrentConcept(null);
    setMasteryData(null);
    setTraceData(null);
    setActiveTab('selector');
  };

  const handleNextQuestion = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const nextRes = await getNextConcept(session.session_id);
      setCurrentConcept(nextRes);
    } catch (err) {
      console.error('Failed fetching next concept', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfRatingSubmit = async (conceptId, rating) => {
    console.log(`Self-rating for ${conceptId}: ${rating}`);
    if (session) {
      await refreshSessionData(session.session_id);
    }
  };

  // Overall mastery calculation for navbar
  const overallMastery = masteryData?.concepts
    ? Math.round((masteryData.concepts.filter(c => c.p_known >= 0.85).length / masteryData.concepts.length) * 100)
    : 0;

  return (
    <div className="grain-root min-h-[100dvh] relative" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Ambient glow — emerald top & indigo bottom-right */}
      <div
        className="glow-emerald fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0"
        style={{ width: '900px', height: '480px' }}
      />
      <div
        className="glow-indigo fixed -bottom-32 -right-32 pointer-events-none z-0"
        style={{ width: '600px', height: '600px' }}
      />

      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onResetSession={handleResetSession}
        overallMastery={overallMastery}
      />

      {/* Main Content Area */}
      <main className="relative z-10">
        {/* Error notification */}
        {error && (
          <div className="max-w-2xl mx-auto px-4 pt-24 animate-fade-in">
            <div
              className="p-4 rounded-2xl flex items-center justify-between gap-3"
              style={{
                background: 'var(--red-dim)',
                border: '1px solid var(--red-border)',
                color: '#fca5a5',
              }}
            >
              <div className="flex items-center gap-2.5 text-sm">
                <WarningCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(248,113,113,0.15)' }}
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* View Router */}
        {activeTab === 'selector' || !session ? (
          <TopicSelector onSelectTopic={handleStartSession} loading={loading} />
        ) : activeTab === 'tutor' ? (
          <TutorView
            currentConcept={currentConcept}
            onAnswerSubmitted={handleAnswerSubmit}
            onNextQuestion={handleNextQuestion}
            onRequestSelfRate={(c) => {
              setSelfRatingConcept(c);
              setSelfRatingModalOpen(true);
            }}
            loadingNext={loading}
          />
        ) : activeTab === 'mastery' ? (
          <MasteryMap
            masteryData={masteryData}
            onConceptClick={(c) => {
              setSelfRatingConcept(c);
              setSelfRatingModalOpen(true);
            }}
          />
        ) : activeTab === 'trace' ? (
          <TraceViewer
            traceData={traceData}
            onRefresh={() => session && getTraces(session.session_id).then(setTraceData)}
          />
        ) : null}
      </main>

      {/* Self-rating modal */}
      <SelfRatingModal
        isOpen={selfRatingModalOpen}
        concept={selfRatingConcept}
        onClose={() => setSelfRatingModalOpen(false)}
        onSubmitRating={handleSelfRatingSubmit}
      />
    </div>
  );
}
