import React from 'react';
import { BookOpenText, Lightning, TreeStructure, ClockCounterClockwise, ArrowsCounterClockwise } from '@phosphor-icons/react';

export default function Navbar({ activeTab, setActiveTab, session, onResetSession, onGoHome, overallMastery }) {
  const tabs = [
    { id: 'tutor',   label: 'Practice', icon: Lightning },
    { id: 'mastery', label: 'Progress', icon: TreeStructure },
    { id: 'trace',   label: 'History', icon: ClockCounterClockwise },
  ];

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button onClick={onGoHome || onResetSession} className="brand-button" aria-label="Go to home">
          <span className="brand-mark"><BookOpenText size={19} weight="regular" /></span>
          <span className="brand-name">Vidya</span>
          <span className="brand-caption">AI learning notebook</span>
        </button>

        {session && activeTab !== 'selector' ? (
          <nav className="main-navigation" aria-label="Main navigation">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`nav-tab${activeTab === id ? ' is-active' : ''}`}
              >
                <Icon size={15} weight={activeTab === id ? 'fill' : 'regular'} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        ) : (
          <div className="header-note">Neural networks <span>·</span> Language models <span>·</span> Applied AI</div>
        )}

        <div className="header-tools">
          {session ? (
            <>
              {activeTab === 'selector' ? (
                <button
                  onClick={() => setActiveTab('tutor')}
                  className="px-3 py-1.5 rounded text-xs font-semibold"
                  style={{ background: 'var(--accent)', color: '#ffffff' }}
                >
                  Resume Practice &rarr;
                </button>
              ) : (
                <div className="header-mastery">
                  <span className="label-caps">Overall mastery</span>
                  <strong>{overallMastery}%</strong>
                </div>
              )}
              <button onClick={onResetSession} title="Start a new session" className="icon-button" aria-label="Start a new session">
                <ArrowsCounterClockwise size={17} />
              </button>
            </>
          ) : (
            <span className="header-index">THREE STUDY PATHS</span>
          )}
        </div>
      </div>
    </header>
  );
}

