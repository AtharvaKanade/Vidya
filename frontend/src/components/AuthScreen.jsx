import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpenText, 
  EnvelopeSimple, 
  LockKey, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  User, 
  Eye, 
  EyeSlash, 
  Sparkle, 
  ShieldCheck, 
  WarningCircle
} from '@phosphor-icons/react';
import { requestSignupOTP, confirmSignupOTP, resendSignupOTP, loginWithEmail } from '../api';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'verify_otp'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = [
    useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null)
  ];

  // Handle resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle OTP digit input box change
  const handleDigitChange = (index, value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // If pasting full 6 digits
    if (cleaned.length >= 6) {
      const newDigits = cleaned.slice(0, 6).split('');
      setOtpDigits(newDigits);
      inputRefs[5].current?.focus();
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  // Handle backspace key on OTP input
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // Handle Submit for Login, Signup, or OTP Verification
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setInfoMessage('');

    try {
      if (mode === 'login') {
        const data = await loginWithEmail(email, password);
        localStorage.setItem('vidya_auth_token', data.token);
        localStorage.setItem('vidya_user_name', data.user.name || data.user.email || 'Learner');
        localStorage.setItem('vidya_user_email', data.user.email || '');
        onAuthenticated(data.token, data.user);
      } else if (mode === 'signup') {
        if (!name.trim()) {
          throw new Error('Full Name is required.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        await requestSignupOTP({ name, email, password, confirmPassword });
        setPendingEmail(email);
        setOtpDigits(['', '', '', '', '', '']);
        setInfoMessage(`We've sent a 6-digit OTP code to ${email}. Please check your inbox.`);
        setMode('verify_otp');
        setResendCooldown(30);
      } else if (mode === 'verify_otp') {
        const fullOtp = otpDigits.join('');
        if (fullOtp.length < 6) {
          throw new Error('Please enter the complete 6-digit OTP code.');
        }

        const data = await confirmSignupOTP({ email: pendingEmail, otp: fullOtp });
        localStorage.setItem('vidya_auth_token', data.token);
        localStorage.setItem('vidya_user_name', data.user.name || data.user.email || 'Learner');
        localStorage.setItem('vidya_user_email', data.user.email || '');
        onAuthenticated(data.token, data.user);
      }
    } catch (err) {
      const errMsg = typeof err === 'string'
        ? err
        : err?.message && typeof err.message === 'string'
        ? err.message
        : typeof err?.detail === 'string'
        ? err.detail
        : 'Authentication failed. Please check your credentials and try again.';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || !pendingEmail) return;
    setSubmitting(true);
    setError('');
    setInfoMessage('');

    try {
      await resendSignupOTP(pendingEmail);
      setInfoMessage(`A new 6-digit OTP code has been sent to ${pendingEmail}.`);
      setResendCooldown(30);
    } catch (err) {
      const errMsg = typeof err === 'string'
        ? err
        : err?.message && typeof err.message === 'string'
        ? err.message
        : 'Failed to resend OTP code.';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick demo credentials loader
  const handleDemoFill = () => {
    setEmail('demo@vidya.ai');
    setPassword('demo1234');
    setError('');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Clean Top Header */}
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand-button">
            <span className="brand-mark"><BookOpenText size={19} weight="regular" /></span>
            <span className="brand-name">Vidya</span>
            <span className="brand-caption">AI learning notebook</span>
          </div>

          <div className="header-note hidden sm:flex items-center">
            <span>Neural networks</span> · <span>Language models</span> · <span>Applied AI</span>
          </div>

          <div className="header-tools">
            <div className="badge badge-emerald text-xs">
              <Sparkle size={12} weight="fill" />
              <span>BKT Engine</span>
            </div>
          </div>
        </div>
      </header>

      {/* Centered, Focused Authentication Card with spacious proportions */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-14">
        <div className="w-full max-w-[560px] animate-fade-in-up">
          
          {/* Main Card */}
          <div className="surface-card rounded-2xl border border-[var(--border-mid)] bg-[var(--bg-surface)] shadow-xl overflow-hidden transition-all duration-300">
            
            {/* Sliding Segmented Tab Switcher */}
            {mode !== 'verify_otp' && (
              <div className="relative p-2 bg-[var(--bg-subtle)] border-b border-[var(--border-dim)] flex items-center">
                {/* Gliding background pill indicator */}
                <div 
                  className="absolute top-2 bottom-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-mid)] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    width: 'calc(50% - 8px)',
                    left: '8px',
                    transform: mode === 'login' ? 'translateX(0%)' : 'translateX(100%)',
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setInfoMessage('');
                  }}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-semibold text-center rounded-xl transition-colors duration-200 cursor-pointer ${
                    mode === 'login'
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setInfoMessage('');
                  }}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-semibold text-center rounded-xl transition-colors duration-200 cursor-pointer ${
                    mode === 'signup'
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Header inside Card with Smooth Keyed Crossfade */}
            <div key={`header-${mode}`} className="p-7 sm:p-8 pb-5 border-b border-[var(--border-dim)] auth-title-switch">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="label-caps font-mono text-[11px]">
                  {mode === 'login' ? 'Learner Portal' : mode === 'signup' ? 'New Registration' : 'Two-Factor Verification'}
                </span>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleDemoFill}
                    className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 px-2 py-1 rounded bg-[var(--accent-dim)] border border-[var(--accent-border)]"
                    title="Quick-fill demo student credentials"
                  >
                    <Sparkle size={13} weight="fill" />
                    <span>Demo fill</span>
                  </button>
                )}
              </div>
              
              <h1 className="heading-section text-2xl sm:text-3xl font-serif text-[var(--text-primary)]">
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'verify_otp' && 'Verify your email'}
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                {mode === 'login' && 'Sign in to access your AI study paths and BKT mastery state.'}
                {mode === 'signup' && 'Fill out your details to receive an email OTP verification code.'}
                {mode === 'verify_otp' && `Enter the 6-digit OTP sent to ${pendingEmail || 'your email'}.`}
              </p>
            </div>

            {/* Form Area */}
            <form onSubmit={handleSubmit} className="p-7 sm:p-8 space-y-5">
              
              {/* LOGIN / SIGNUP FIELDS */}
              {mode !== 'verify_otp' && (
                <>
                  {/* Full Name animated field (SignUp only) */}
                  {mode === 'signup' && (
                    <div className="auth-field-enter">
                      <label className="block text-xs uppercase tracking-wider mb-2 font-semibold text-[var(--text-muted)] font-mono">
                        Full Name
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-[var(--border-mid)] bg-[var(--bg-subtle)] px-4 py-3 transition-all duration-200 focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-surface)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)]">
                        <User size={18} className="text-[var(--text-muted)] shrink-0" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Johnson"
                          required={mode === 'signup'}
                          className="w-full bg-transparent text-sm sm:text-base outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2 font-semibold text-[var(--text-muted)] font-mono">
                      Email Address
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-mid)] bg-[var(--bg-subtle)] px-4 py-3 transition-all duration-200 focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-surface)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)]">
                      <EnvelopeSimple size={18} className="text-[var(--text-muted)] shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@example.com"
                        required
                        className="w-full bg-transparent text-sm sm:text-base outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] font-mono">
                        Password
                      </label>
                      {mode === 'signup' && (
                        <span className="text-xs text-[var(--text-muted)] font-mono animate-fade-in">Min 6 characters</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-mid)] bg-[var(--bg-subtle)] px-4 py-3 transition-all duration-200 focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-surface)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)]">
                      <LockKey size={18} className="text-[var(--text-muted)] shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                        required
                        className="w-full bg-transparent text-sm sm:text-base outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none cursor-pointer p-1 rounded transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password animated field (SignUp only) */}
                  {mode === 'signup' && (
                    <div className="auth-field-enter">
                      <label className="block text-xs uppercase tracking-wider mb-2 font-semibold text-[var(--text-muted)] font-mono">
                        Confirm Password
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-[var(--border-mid)] bg-[var(--bg-subtle)] px-4 py-3 transition-all duration-200 focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-surface)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)]">
                        <LockKey size={18} className="text-[var(--text-muted)] shrink-0" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          required={mode === 'signup'}
                          className="w-full bg-transparent text-sm sm:text-base outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* OTP VERIFICATION VIEW */}
              {mode === 'verify_otp' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-4 text-center font-semibold text-[var(--text-muted)] font-mono">
                      Enter 6-Digit OTP Code
                    </label>
                    
                    {/* 6 Digit Inputs */}
                    <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={inputRefs[idx]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border border-[var(--border-mid)] bg-[var(--bg-subtle)] outline-none transition-all duration-200 focus:border-[var(--green)] focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-[var(--green-dim)] text-[var(--text-primary)]"
                          style={{
                            borderColor: digit ? 'var(--green)' : 'var(--border-mid)',
                          }}
                        />
                      ))}
                    </div>
                  </div>



                  {/* Resend OTP & Change Email options */}
                  <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-[var(--border-dim)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline cursor-pointer transition-colors"
                    >
                      <ArrowLeft size={16} />
                      <span>Change Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendCooldown > 0 || submitting}
                      className="flex items-center gap-1.5 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:underline transition-colors"
                      style={{ color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--green)' }}
                    >
                      <Clock size={16} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback Message Alerts */}
              {infoMessage && (
                <div className="rounded-xl border border-[var(--green-border)] bg-[var(--green-dim)] p-3.5 text-xs sm:text-sm flex items-start gap-2.5 text-[var(--green)] animate-fade-in">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{infoMessage}</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-[var(--red-border)] bg-[var(--red-dim)] p-3.5 text-xs sm:text-sm flex items-start gap-2.5 text-[var(--red)] animate-fade-in">
                  <WarningCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Primary Submit Button with smooth transitions */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn btn-primary py-3.5 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
                style={{
                  background: 'var(--accent)',
                  color: '#ffffff',
                  opacity: submitting ? 0.75 : 1,
                }}
              >
                <span className="auth-title-switch" key={`btn-${mode}`}>
                  {submitting
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Sign In'
                    : mode === 'signup'
                    ? 'Send Verification OTP'
                    : 'Verify & Enter Notebook'}
                </span>
                <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Secondary Navigation */}
              <div className="pt-2 text-center">
                {mode === 'login' ? (
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    Need an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="text-[var(--accent)] font-semibold hover:underline cursor-pointer transition-colors"
                    >
                      Create one with Email OTP
                    </button>
                  </p>
                ) : mode === 'signup' ? (
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="text-[var(--accent)] font-semibold hover:underline cursor-pointer transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setInfoMessage('');
                    }}
                    className="text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline cursor-pointer transition-colors"
                  >
                    Cancel verification and return to sign in
                  </button>
                )}
              </div>

            </form>
          </div>

          {/* Privacy & Session Notice */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs sm:text-sm text-[var(--text-muted)] font-mono text-center">
            <ShieldCheck size={16} className="text-[var(--green)] shrink-0" />
            <span>Private session state · No personal tracking</span>
          </div>

        </div>
      </main>

      {/* Clean Footer */}
      <footer className="py-3.5 border-t border-[var(--border-dim)] text-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-serif italic">Vidya AI Notebook</span>
            <span>·</span>
            <span>BFWAI/HACK 26</span>
          </div>
          <div>Adaptive Bayesian Knowledge Tracing</div>
        </div>
      </footer>
    </div>
  );
}
