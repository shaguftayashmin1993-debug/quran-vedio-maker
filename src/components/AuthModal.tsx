import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  LogIn,
  AlertCircle,
  Crown,
  KeyRound,
  CheckCircle2,
  Zap,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { SubscriberRecord } from '../types';
import { UpiPaymentCard } from './UpiPaymentCard';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  initialMode?: 'upi' | 'subscribe' | 'login' | 'passcode' | 'quick';
}

export function AuthModal({ isOpen, onClose, initialMode = 'upi' }: AuthModalProps) {
  const {
    quickEmailLogin,
    loginWithGoogle,
    loginWithIdOrEmail,
    subscribeUser,
    redeemAccessCodeDirect,
  } = useAuth();

  const [mode, setMode] = useState<'upi' | 'subscribe' | 'login' | 'passcode' | 'quick'>(initialMode);

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // Email or Member ID
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('Full Studio Pro Subscription');
  const [passcode, setPasscode] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showIssuedPass, setShowIssuedPass] = useState(false);

  // UI Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Issued Credentials State after user subscribes
  const [issuedCredentials, setIssuedCredentials] = useState<{
    memberId: string;
    password: string;
    email: string;
    displayName: string;
    plan: string;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadCredentials = (creds: {
    memberId: string;
    password: string;
    email: string;
    plan: string;
  }) => {
    const content = `=========================================
QURAN VIDEO STUDIO - MEMBER CREDENTIALS
=========================================
Member Login ID  : ${creds.memberId}
Password         : ${creds.password}
Registered Email : ${creds.email}
Subscription Plan: ${creds.plan}
Generated On     : ${new Date().toLocaleString()}
=========================================
Please keep these login credentials safe!
You can log in using either your Member ID or Email.
=========================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QuranStudio_Login_${creds.memberId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Subscribe and Generate ID + Password
  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await subscribeUser(
        email.trim(),
        name.trim() || undefined,
        plan,
        customPassword.trim() || undefined
      );

      setIssuedCredentials({
        memberId: result.memberId,
        password: result.password,
        email: result.record.email,
        displayName: result.record.displayName,
        plan: result.record.subscriptionPlan,
      });
      setSuccessMsg('Subscription activated! Your unique Member ID & Password are ready.');
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err?.message || 'Failed to complete subscription. Please verify your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Sign In with Member ID OR Email + Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Member ID (e.g. QVS-12345) or Email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithIdOrEmail(identifier.trim(), password);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Invalid Member ID/Email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Fast Passwordless Email Login
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

  // 5. VIP Passcode Redemption
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

  // 6. Google Sign In
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError('Google sign-in popup unavailable in current window. Use the Member ID or Fast Email option below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0c1424] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[94vh]">
        {/* Glow Top Ribbon */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

        {/* Modal Header */}
        <div className="p-5 pb-3 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-2 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">
            Quran Video Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Subscriber Registration, Member ID &amp; Cloud Database Access
          </p>
        </div>

        {/* Navigation Tabs (Only if not showing issued credentials card) */}
        {!issuedCredentials && (
          <div className="grid grid-cols-5 border-b border-slate-800 px-5 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => { setMode('upi'); setError(null); setSuccessMsg(null); }}
              className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
                mode === 'upi'
                  ? 'border-amber-400 text-amber-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>UPI Pay</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('subscribe'); setError(null); setSuccessMsg(null); }}
              className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
                mode === 'subscribe'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Direct</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
                mode === 'login'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login ID</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('passcode'); setError(null); setSuccessMsg(null); }}
              className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
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
              onClick={() => { setMode('quick'); setError(null); setSuccessMsg(null); }}
              className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
                mode === 'quick'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Fast Email</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && !issuedCredentials && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* VIEW A: CREDENTIALS ISSUED CARD (Displayed immediately after subscribing) */}
          {issuedCredentials ? (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-emerald-300">
                  Subscription Confirmed &amp; Stored!
                </h3>
                <p className="text-xs text-slate-300">
                  Your record is saved in the database. Use your generated ID and Password to sign in anytime.
                </p>
              </div>

              {/* Credentials Box */}
              <div className="p-4 rounded-2xl bg-[#090f1d] border-2 border-amber-500/40 space-y-3">
                {/* Member ID */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                    <span>Your Studio Member ID</span>
                    <span className="text-slate-400 font-normal">Use this to log in</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-amber-500/30">
                    <span className="text-base font-black font-mono tracking-widest text-amber-300">
                      {issuedCredentials.memberId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(issuedCredentials.memberId, 'memberId')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedField === 'memberId' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'memberId' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                    <span>Assigned Login Password</span>
                    <button
                      type="button"
                      onClick={() => setShowIssuedPass(!showIssuedPass)}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[10px] cursor-pointer"
                    >
                      {showIssuedPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showIssuedPass ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-amber-500/30">
                    <span className="text-sm font-mono font-bold text-slate-100">
                      {showIssuedPass ? issuedCredentials.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(issuedCredentials.password, 'password')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedField === 'password' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'password' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Registered Email & Plan */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Registered Email</span>
                    <span className="font-semibold text-slate-200 truncate block">{issuedCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Access Plan</span>
                    <span className="font-semibold text-amber-400 truncate block">{issuedCredentials.plan}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Member ID: ${issuedCredentials.memberId}\nPassword: ${issuedCredentials.password}\nEmail: ${issuedCredentials.email}`;
                      handleCopy(text, 'all');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === 'all' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedField === 'all' ? 'All Copied!' : 'Copy Both'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadCredentials(issuedCredentials)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Download (.txt)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>Enter Quran Studio Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 0: UPI PAYMENT CARD */}
              {mode === 'upi' && (
                <div className="animate-fade-in">
                  <UpiPaymentCard
                    defaultEmail={email}
                    onSuccess={(creds) => {
                      setIssuedCredentials({
                        memberId: creds.memberId,
                        password: creds.password,
                        email: creds.email,
                        displayName: creds.email.split('@')[0],
                        plan: creds.plan,
                      });
                    }}
                  />
                </div>
              )}

              {/* TAB 1: SUBSCRIBE & GET ID/PASSWORD */}
              {mode === 'subscribe' && (
                <form onSubmit={handleSubscribeSubmit} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Subscribe now: We check your email, create your account, generate your unique <strong>Member ID</strong> &amp; <strong>Password</strong>, and save your record to the database.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Email Address <span className="text-amber-400">*</span>
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
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Full Name / Channel Name (Optional)
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Brother Ahmad / Quran Recitations"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Subscription Package
                    </label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="Full Studio Pro Subscription">Full Studio Pro Subscription (Unlimited Videos &amp; Audio)</option>
                      <option value="Creator Pro License">Creator Pro License (Multi-Ayah &amp; Batch Rendering)</option>
                      <option value="Studio Lifetime VIP">Studio Lifetime VIP Access</option>
                      <option value="Community Member Pass">Community Member Pass</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Choose Password (Optional)
                      </label>
                      <span className="text-[10px] text-slate-400">Leave blank to auto-generate</span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="Auto-generated if left blank (e.g. Quran2026!#841)"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Verifying &amp; Registering in Database...</span>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Subscribe &amp; Get Login ID &amp; Password</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline"
                    >
                      Already have an ID or Password? Sign in here
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SIGN IN WITH ID OR EMAIL + PASSWORD */}
              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Member ID or Email Address
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Enter Member ID (e.g. QVS-78421) or Email"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Checking Credentials...</span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Studio</span>
                      </>
                    )}
                  </button>

                  <div className="relative flex items-center justify-center my-2">
                    <div className="border-t border-slate-800 w-full" />
                    <span className="bg-[#0c1424] px-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Or Google
                    </span>
                    <div className="border-t border-slate-800 w-full" />
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('subscribe')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline"
                    >
                      New user? Subscribe &amp; get your Member ID &amp; Password
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: VIP PASSCODE REDEEM */}
              {mode === 'passcode' && (
                <form onSubmit={handlePasscodeSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-300 mb-1 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>VIP Passcode / Studio Key</span>
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

              {/* TAB 4: FAST EMAIL SIGN IN */}
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
                    Zero hassle email sign-in for verified directory members.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
