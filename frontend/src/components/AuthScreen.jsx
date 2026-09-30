import React, { useState, useRef, useEffect } from 'react';
import { EnvelopeSimple, LockKey, RocketLaunch, Key, ArrowLeft, ArrowRight, CheckCircle, Clock, User } from '@phosphor-icons/react';
import { requestSignupOTP, confirmSignupOTP, resendSignupOTP, loginWithEmail } from '../api';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'verify_otp'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP state
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [debugOtp, setDebugOtp] = useState(null);
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
    // Only keep numeric character
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

        const data = await requestSignupOTP({ name, email, password, confirmPassword });
        setPendingEmail(email);
        setDebugOtp(data.debug_otp || null);
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
      setError(err.message || 'Authentication failed. Please try again.');
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
      const data = await resendSignupOTP(pendingEmail);
      if (data.debug_otp) {
        setDebugOtp(data.debug_otp);
      }
      setInfoMessage(`A new 6-digit OTP code has been sent to ${pendingEmail}.`);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick auto-fill for testing with debug OTP
  const handleAutoFillDebugOTP = () => {
    if (debugOtp && debugOtp.length === 6) {
      setOtpDigits(debugOtp.split(''));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="w-full max-w-md rounded-3xl border shadow-xl overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-mid)' }}>
        
        {/* Top Header Card */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-dim)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
              {mode === 'verify_otp' ? <Key size={22} /> : <RocketLaunch size={20} />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Vidya AI Notebook</div>
              <h1 className="text-xl font-semibold">
                {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create learner account' : 'Verify your email'}
              </h1>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login' && 'Sign in to access your AI study paths and BKT mastery state.'}
            {mode === 'signup' && 'Fill out your details to receive an email OTP code to verify your account.'}
            {mode === 'verify_otp' && `Enter the 6-digit OTP sent to ${pendingEmail || 'your email'}.`}
          </p>
        </div>

        {/* Form area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* LOGIN OR SIGNUP STEP 1 */}
          {mode !== 'verify_otp' && (
            <>
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                  <div className="flex items-center gap-2 rounded-xl border px-3" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-mid)' }}>
                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      required={mode === 'signup'}
                      className="w-full bg-transparent py-3 text-sm outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-[0.12em] mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Email Address</label>
                <div className="flex items-center gap-2 rounded-xl border px-3" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-mid)' }}>
                  <EnvelopeSimple size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.12em] mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Password</label>
                <div className="flex items-center gap-2 rounded-xl border px-3" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-mid)' }}>
                  <LockKey size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    required
                    className="w-full bg-transparent py-3 text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Confirm Password</label>
                  <div className="flex items-center gap-2 rounded-xl border px-3" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-mid)' }}>
                    <LockKey size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required={mode === 'signup'}
                      className="w-full bg-transparent py-3 text-sm outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* OTP VERIFICATION STEP */}
          {mode === 'verify_otp' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] mb-3 text-center font-medium" style={{ color: 'var(--text-muted)' }}>
                  Enter 6-Digit OTP Code
                </label>
                
                {/* 6 Digit Inputs */}
                <div className="flex items-center justify-between gap-2">
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
                      className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      style={{
                        background: 'var(--bg-raised)',
                        borderColor: digit ? 'var(--green)' : 'var(--border-mid)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Resend OTP & Change Email options */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setInfoMessage('');
                  }}
                  className="flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ArrowLeft size={14} />
                  <span>Change Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || submitting}
                  className="flex items-center gap-1 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                  style={{ color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--green)' }}
                >
                  <Clock size={14} />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Info notice */}
          {infoMessage && (
            <div className="rounded-xl border px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'var(--green-dim)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              <CheckCircle size={16} className="shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error notification */}
          {error && (
            <div className="rounded-xl border px-3 py-2 text-xs" style={{ background: 'var(--red-dim)', borderColor: 'var(--red-border)', color: '#fecaca' }}>
              {error}
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
            style={{ opacity: submitting ? 0.7 : 1 }}
          >
            <span>
              {submitting
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Send OTP Code'
                : 'Confirm & Create Account'}
            </span>
            <ArrowRight size={16} />
          </button>

          {/* Mode Switch Button */}
          {mode !== 'verify_otp' ? (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setInfoMessage('');
              }}
              className="w-full btn btn-ghost py-2.5 rounded-xl text-sm"
            >
              {mode === 'login' ? 'Need an account? Create one with Email OTP' : 'Already have an account? Sign in'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setInfoMessage('');
              }}
              className="w-full btn btn-ghost py-2 rounded-xl text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel and Return to Sign In
            </button>
          )}

        </form>
      </div>
    </div>
  );
}
