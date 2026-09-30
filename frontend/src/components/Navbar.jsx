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
    { id: 'tutor',   label: 'Practice', icon: Lightning },
    { id: 'mastery', label: 'Progress', icon: TreeStructure },
    { id: 'trace',   label: 'History', icon: ClockCounterClockwise },
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

              {/* Clean Person Button & Dropdown Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:bg-white/5 cursor-pointer"
                  style={{
                    borderColor: dropdownOpen ? 'var(--green)' : 'var(--border-mid)',
                    background: 'var(--bg-raised)',
                    color: 'var(--text-primary)',
                  }}
                  aria-label="User account menu"
                  aria-expanded={dropdownOpen}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff' }}
                  >
                    {(userName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <User size={16} style={{ color: 'var(--text-muted)' }} />
                  <CaretDown
                    size={12}
                    className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-muted)' }}
                  />
                </button>

                {/* Dropdown Card */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 rounded-2xl border shadow-2xl overflow-hidden z-50 animate-scale-up"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-mid)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {/* User Header Info */}
                    <div className="p-3 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--border-dim)' }}>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0"
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff' }}
                      >
                        {(userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate">{userName || 'Learner'}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {userEmail || 'No email registered'}
                        </div>
                      </div>
                    </div>

                    {/* Menu Options: 1. Profile, 2. Logout */}
                    <div className="p-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-emerald-500/10 hover:text-emerald-400 text-left"
                      >
                        <User size={16} />
                        <span>Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-red-500/10 hover:text-red-400 text-left"
                        style={{ color: '#fca5a5' }}
                      >
                        <SignOut size={16} />
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

