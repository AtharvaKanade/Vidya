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
  getTraces,
  submitSelfRating
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

  // Map tabs to URL hashes
  const tabToHash = {
    selector: '#home',
    tutor: '#practice',
    mastery: '#progress',
    trace: '#history',
  };

  const hashToTab = {
    '': 'selector',
    '#': 'selector',
    '#home': 'selector',
    '#practice': 'tutor',
    '#progress': 'mastery',
    '#history': 'trace',
  };

  const changeTab = (tab, pushHistory = true) => {
    setActiveTab(tab);
    const hash = tabToHash[tab] || '#home';
    if (pushHistory) {
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }
    } else {
      if (window.location.hash !== hash) {
        window.history.replaceState({ tab }, '', hash);
      }
    }
  };

  // Synchronize activeTab with URL hash changes (Back/Forward browser buttons)
  useEffect(() => {
    const syncFromUrl = () => {
      const hash = window.location.hash || '';
      const targetTab = hashToTab[hash] || 'selector';
      setActiveTab(targetTab);
    };

    window.addEventListener('hashchange', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);

    // Initial load from storage and URL hash
    const saved = localStorage.getItem('vidya_session');
    const initialHash = window.location.hash || '';
    const initialTab = hashToTab[initialHash];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
        const resolvedTab = initialTab || 'tutor';
        setActiveTab(resolvedTab);
        if (!initialHash) {
          window.history.replaceState({ tab: resolvedTab }, '', tabToHash[resolvedTab]);
        }
        refreshSessionData(parsed.session_id);
      } catch (e) {
        localStorage.removeItem('vidya_session');
        setActiveTab('selector');
      }
    } else {
      const resolvedTab = initialTab || 'selector';
      setActiveTab(resolvedTab);
      if (!initialHash) {
        window.history.replaceState({ tab: resolvedTab }, '', tabToHash[resolvedTab]);
      }
    }

    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
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

      // Auto-trigger self-rating if uncertainty rule flagged
      if (nextRes?.needs_self_rating) {
        setSelfRatingConcept({ id: nextRes.concept_id, name: nextRes.concept_name });
        setSelfRatingModalOpen(true);
      }
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
      changeTab('tutor', true);
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
    changeTab('selector', true);
  };

  const handleNextQuestion = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const nextRes = await getNextConcept(session.session_id);
      setCurrentConcept(nextRes);
      if (nextRes?.needs_self_rating) {
        setSelfRatingConcept({ id: nextRes.concept_id, name: nextRes.concept_name });
        setSelfRatingModalOpen(true);
      }
    } catch (err) {
      console.error('Failed fetching next concept', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfRatingSubmit = async (conceptId, rating) => {
    if (!session) return;
    try {
      await submitSelfRating(session.session_id, conceptId, rating);
      await refreshSessionData(session.session_id);
    } catch (err) {
      console.error('Failed submitting self-rating', err);
      setError('Could not update self-rating: ' + err.message);
    }
  };

  // Overall mastery calculation for navbar
  const overallMastery = masteryData?.concepts
    ? Math.round((masteryData.concepts.filter(c => c.p_known >= 0.85).length / masteryData.concepts.length) * 100)
    : 0;

  return (
    <div className="app-shell min-h-[100dvh]" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={changeTab}
        session={session}
        onResetSession={handleResetSession}
        onGoHome={() => changeTab('selector', true)}
        overallMastery={overallMastery}
      />

      {/* Main Content Area */}
      <main>
        {/* Error notification */}
        {error && (
          <div className="max-w-2xl mx-auto px-4 pt-24 animate-fade-in">
            <div
              className="p-4 rounded-2xl flex items-center justify-between gap-3 error-notice"
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
            session={session}
            currentConcept={currentConcept}
            onAnswerSubmitted={handleAnswerSubmit}
            onNextQuestion={handleNextQuestion}
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
