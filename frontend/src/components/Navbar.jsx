import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpenText,
  Lightning,
  TreeStructure,
  ClockCounterClockwise,
  ArrowsCounterClockwise,
  SignOut,
  User,
  CaretDown
} from '@phosphor-icons/react';

export default function Navbar({
  activeTab,
  setActiveTab,
  session,
  userName,
  userEmail,
  onLogout,
  onResetSession,
  onGoHome,
  overallMastery,
  onOpenProfile
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef(null);

  const tabs = [
    { id: 'tutor', label: 'Practice', icon: Lightning },
    { id: 'mastery', label: 'Progress', icon: TreeStructure },
    { id: 'trace', label: 'History', icon: ClockCounterClockwise },
  ];

  const isLoggedIn = Boolean(userName || userEmail || onLogout);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          {isLoggedIn ? (
            <>
              {activeTab === 'selector' ? (
                session && (
                  <button
                    onClick={() => setActiveTab('tutor')}
                    className="px-3 py-1.5 rounded text-xs font-semibold"
                    style={{ background: 'var(--accent)', color: '#ffffff' }}
                  >
                    Resume Practice &rarr;
                  </button>
                )
              ) : (
                session && (
                  <div className="header-mastery">
                    <span className="label-caps">Overall mastery</span>
                    <strong>{overallMastery}%</strong>
                  </div>
                )
              )}

              {session && (
                <button
                  type="button"
                  onClick={onResetSession}
                  title="Start a new session"
                  className="icon-button"
                  aria-label="Start a new session"
                >
                  <ArrowsCounterClockwise size={17} />
                </button>
              )}

              {/* Clean User Account Button & Dropdown Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md border transition-all cursor-pointer"
                  style={{
                    borderColor: dropdownOpen ? 'var(--accent)' : 'var(--border-mid)',
                    background: dropdownOpen ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                  }}
                  aria-label="User account menu"
                  aria-expanded={dropdownOpen}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0"
                    style={{
                      background: 'var(--green-dim)',
                      border: '1px solid var(--green-border)',
                      color: 'var(--green)',
                    }}
                  >
                    {(userName || 'D').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium max-w-[100px] truncate hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
                    {userName || 'Learner'}
                  </span>
                  <CaretDown
                    size={12}
                    className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-muted)' }}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 rounded-lg border shadow-xl overflow-hidden z-50 animate-fade-in"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-mid)',
                      color: 'var(--text-primary)',
                      boxShadow: '0 10px 25px -5px rgba(36, 49, 44, 0.12), 0 8px 10px -6px rgba(36, 49, 44, 0.08)'
                    }}
                  >
                    {/* User Info Header */}
                    <div className="p-3 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--border-dim)' }}>
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0"
                        style={{
                          background: 'var(--green-dim)',
                          border: '1px solid var(--green-border)',
                          color: 'var(--green)',
                        }}
                      >
                        {(userName || 'D').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate text-[var(--text-primary)]">{userName || 'Learner'}</div>
                        <div className="text-[11px] truncate font-mono" style={{ color: 'var(--text-muted)' }}>
                          {userEmail || 'demo@vidya.ai'}
                        </div>
                      </div>
                    </div>

                    {/* Menu Options: 1. Profile, 2. Logout */}
                    <div className="p-1.5 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <User size={15} style={{ color: 'var(--text-secondary)' }} />
                        <span>Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left cursor-pointer"
                        style={{ color: 'var(--red)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red-dim)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <SignOut size={15} />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="header-index">THREE STUDY PATHS</span>
          )}
        </div>
      </div>
    </header>
  );
}

