import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  KeyRound,
  Send,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  CreditCard,
  User,
  Copy,
  CheckCheck,
  Download,
  QrCode,
  Zap,
} from 'lucide-react';
import { UpiPaymentCard } from './UpiPaymentCard';

export function AccessRestrictedScreen() {
  const { user, profile, logout, submitAccessRequest, redeemAccessCode, loginWithIdOrEmail, subscribeUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'upi' | 'memberId' | 'code' | 'subscribe' | 'request'>('upi');
  
  // Member ID Login Form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Subscribe Form State
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState(user?.email || '');
  const [subPlan, setSubPlan] = useState('Full Studio Pro Subscription');
  const [subPassword, setSubPassword] = useState('');
  const [registeredCredentials, setRegisteredCredentials] = useState<{
    memberId: string;
    password: string;
    email: string;
    plan: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Request & Passcode Form State
  const [passcode, setPasscode] = useState('');
  const [reason, setReason] = useState('');
  const [plan, setPlan] = useState('Pro Creator Subscription');

  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeMessage, setCodeMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleMemberIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) return;
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const res = await loginWithIdOrEmail(loginIdentifier.trim(), loginPassword.trim());
      if (!res.success) {
        setLoginError(res.message);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const res = await subscribeUser(
        subEmail.trim(),
        subName.trim() || undefined,
        subPlan,
        subPassword.trim() || undefined
      );

      if (res.success && res.credentials) {
        setRegisteredCredentials({
          memberId: res.credentials.memberId,
          password: res.credentials.password,
          email: res.credentials.email,
          plan: res.credentials.plan,
        });
      } else {
        setLoginError(res.message);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Failed to complete subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitAccessRequest(reason, plan);
      setRequestSubmitted(true);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setIsSubmitting(true);
    setCodeMessage(null);
    try {
      const res = await redeemAccessCode(passcode);
      setCodeMessage({
        success: res.success,
        text: res.message,
      });
      if (res.success) {
        setPasscode('');
      }
    } catch (err: any) {
      setCodeMessage({
        success: false,
        text: err?.message || 'Failed to redeem passcode.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/80 to-[#070b14]" />

      <div className="relative w-full max-w-lg bg-[#0d1527] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 backdrop-blur-xl">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold tracking-wide uppercase mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Subscriber Membership Required</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Quran Video Studio Access
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Subscribe to unlock full studio features, or enter your assigned Member ID and password below.
            </p>
          </div>

          {/* Current Signed In Identity */}
          <div className="w-full pt-3 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left truncate">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</div>
                <div className="font-semibold text-slate-200 truncate">{user?.email}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3 h-3" />
              <span>Switch</span>
            </button>
          </div>
        </div>

        {/* Access Pathways Tabs */}
        <div className="pt-5 space-y-4">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              className={`py-2 px-1 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'upi'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-950" />
              <span>UPI Pay</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('memberId')}
              className={`py-2 px-1 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'memberId'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Login ID</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`py-2 px-1 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'code'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Passcode</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subscribe')}
              className={`py-2 px-1 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'subscribe'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Direct Pass</span>
            </button>
          </div>

          {/* TAB 0: UPI PAYMENT OPTION */}
          {activeTab === 'upi' && (
            <div className="animate-fade-in">
              <UpiPaymentCard
                defaultEmail={user?.email || ''}
                onSuccess={(creds) => {
                  setRegisteredCredentials({
                    memberId: creds.memberId,
                    password: creds.password,
                    email: creds.email,
                    plan: creds.plan,
                  });
                }}
              />
            </div>
          )}

          {/* TAB 1: SUBSCRIBE & GET ID */}
          {activeTab === 'subscribe' && (
            <div className="space-y-3.5 animate-fade-in">
              {registeredCredentials ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Subscription Activated! Saved to Database.</span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Member ID:</span>
                      <div className="flex items-center gap-1 font-mono font-black text-amber-300">
                        <span>{registeredCredentials.memberId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(registeredCredentials.memberId, 'r-id')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedField === 'r-id' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Password:</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-slate-100">
                        <span>{registeredCredentials.password}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(registeredCredentials.password, 'r-pass')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedField === 'r-pass' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Your studio is unlocked. Refresh or click below to enter.
                  </p>

                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Enter Quran Video Studio
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={subEmail}
                      onChange={(e) => setSubEmail(e.target.value)}
                      placeholder="subscriber@example.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Subscription Package
                    </label>
                    <select
                      value={subPlan}
                      onChange={(e) => setSubPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="Full Studio Pro Subscription">Full Studio Pro Subscription</option>
                      <option value="Creator Pro License">Creator Pro License</option>
                      <option value="Studio Lifetime VIP">Studio Lifetime VIP</option>
                      <option value="Community Member Pass">Community Member Pass</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !subEmail.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isSubmitting ? 'Registering...' : 'Subscribe & Unlock Studio'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: LOGIN WITH MEMBER ID & PASSWORD */}
          {activeTab === 'memberId' && (
            <form onSubmit={handleMemberIdLogin} className="space-y-3 animate-fade-in">
              {loginError && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Member ID or Registered Email
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. QVS-38104 or user@example.com"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Subscriber Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your subscriber password"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !loginIdentifier.trim() || !loginPassword.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <User className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In with Member ID'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: PASSCODE REDEMPTION OR ACCESS REQUEST */}
          {activeTab === 'code' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your VIP invitation passcode below to unlock the studio immediately:
              </p>

              {codeMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    codeMessage.success
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                      : 'bg-red-500/15 border-red-500/30 text-red-200'
                  }`}
                >
                  {codeMessage.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{codeMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleRedeemPasscode} className="space-y-3">
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    placeholder="e.g. QURAN-VIP-2026"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-mono font-bold text-amber-300 placeholder-slate-400 outline-none uppercase tracking-wider"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !passcode.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verifying Code...' : 'Redeem & Unlock Studio'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Subscriber accounts &amp; memberships managed securely</span>
          </div>
        </div>
      </div>
    </div>
  );
}
