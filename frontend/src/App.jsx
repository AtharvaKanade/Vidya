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
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react';

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
      console.error("Failed refreshing session data", err);
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
      setError(`Failed to connect to backend: ${err.message}. Ensure backend server is running at http://localhost:8000`);
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

  const handleSelfRatingSubmit = async (conceptId, rating) => {
    // Blends self-rating into mastery on Day 2
    console.log(`Calibrated self-rating for ${conceptId}: ${rating}`);
    if (session) {
      await refreshSessionData(session.session_id);
    }
  };

  // Overall mastery calculation for navbar
  const overallMastery = masteryData?.concepts
    ? Math.round((masteryData.concepts.filter(c => c.p_known >= 0.85).length / masteryData.concepts.length) * 100)
    : 0;

  return (
    <div className="min-h-[100dvh] bg-[#070709] text-zinc-100 relative selection:bg-emerald-500/20 selection:text-white">
      {/* Ambient Lighting Atmosphere */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-orb-emerald pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] glow-orb-indigo pointer-events-none z-0" />

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
        {/* Error Notification Toast */}
        {error && (
          <div className="max-w-2xl mx-auto px-4 pt-24">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <WarningCircle size={18} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-mono transition-colors"
              >
                Dismiss
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

      {/* Human Calibration Approval Modal */}
      <SelfRatingModal
        isOpen={selfRatingModalOpen}
        concept={selfRatingConcept}
        onClose={() => setSelfRatingModalOpen(false)}
        onSubmitRating={handleSelfRatingSubmit}
      />
    </div>
  );
}
