import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User as UserIcon, Sparkles, LogIn, AlertCircle, Crown, KeyRound, CheckCircle2, Zap } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const {
    loginAsOwner,
    quickEmailLogin,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    redeemAccessCodeDirect,
  } = useAuth();

  const [mode, setMode] = useState<'quick' | 'passcode' | 'password'>('quick');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // 1-Click Master Owner Login
  const handleOwnerQuickLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAsOwner();
      if (onClose) onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to authenticate owner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fast Passwordless / Auto-Register Email Login
  const handleQuickEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await quickEmailLogin(email.trim(), name.trim() || undefined);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Quick login error:', err);
      setError(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct VIP Passcode Redemption
  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter your VIP invitation code.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address to link with the license.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await redeemAccessCodeDirect(passcode.trim(), email.trim(), name.trim() || undefined);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to redeem passcode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup')) {
        setError('Popup was blocked by iframe/browser. Please use the Fast Email or Owner button below.');
      } else {
        // Fallback to quick email login if user attempted Google
        setError(err?.message || 'Google sign-in blocked by iframe. Use the 1-Click fast login below.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Login / Register
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      try {
        await loginWithEmail(email, password);
      } catch (loginErr: any) {
        if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
          // Auto create account if doesn't exist
          await registerWithEmail(email, password, name);
        } else {
          throw loginErr;
        }
      }
      if (onClose) onClose();
    } catch (err: any) {
      console.warn('Standard auth error, falling back to quick email login:', err);
      await quickEmailLogin(email, name);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0d1527] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Glow Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        {/* Modal Header */}
        <div className="p-6 pb-3 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
            Quran Video Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant Studio Access &amp; Member Authentication
          </p>
        </div>

        {/* 1-Click Master Owner Button */}
        <div className="px-6 pb-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleOwnerQuickLogin}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] disabled:opacity-50 group border border-amber-300/40"
          >
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-7 h-7 rounded-lg bg-slate-950/15 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-slate-950 fill-slate-950/40" />
              </div>
              <div>
                <div className="font-extrabold text-[12px] leading-tight">1-Click Master Owner Sign-In</div>
                <div className="text-[10px] text-slate-900/80 font-mono font-semibold">{SUPER_ADMIN_EMAIL}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-slate-950/20 px-2 py-1 rounded-lg">Instant Enter &rarr;</span>
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-slate-800 px-6 gap-1">
          <button
            type="button"
            onClick={() => { setMode('quick'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'quick'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fast Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('passcode'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'passcode'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>VIP Code</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'password'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password / Google</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* TAB 1: FAST EASY EMAIL SIGN IN (No password needed) */}
          {mode === 'quick' && (
            <form onSubmit={handleQuickEmailSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email (e.g. you@domain.com)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Brother Ahmad"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>Instant Sign In &amp; Continue</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 text-center pt-1">
                Zero hassle sign-in. If your email is authorized, your studio license loads immediately.
              </p>
            </form>
          )}

          {/* TAB 2: VIP PASSCODE REDEEM */}
          {mode === 'passcode' && (
            <form onSubmit={handlePasscodeSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-amber-300 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>VIP Invitation Passcode / License Key</span>
                </label>
                <input
                  type="text"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="e.g. QURAN-VIP-2026"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border-2 border-amber-500/50 focus:border-amber-400 rounded-xl text-sm font-mono font-bold tracking-wider text-amber-300 placeholder-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Your Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email to link license"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Activating License...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Redeem Code &amp; Unlock Studio</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: PASSWORD & GOOGLE */}
          {mode === 'password' && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleGoogleSignIn}
                className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#0d1527] px-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Or Password
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-2.5">
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Password</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
