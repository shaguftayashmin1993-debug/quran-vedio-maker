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
} from 'lucide-react';

export function AccessRestrictedScreen() {
  const { user, profile, logout, submitAccessRequest, redeemAccessCode } = useAuth();

  const [activeTab, setActiveTab] = useState<'request' | 'code'>('request');
  const [passcode, setPasscode] = useState('');
  const [reason, setReason] = useState('');
  const [plan, setPlan] = useState('Pro Creator Subscription');

  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeMessage, setCodeMessage] = useState<{ success: boolean; text: string } | null>(null);

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
        {/* Top Header Badge */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Quran Video Studio
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Restricted Access Studio</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            This deployment is private. Only authorized team members and active subscribers can create and render videos.
          </p>

          {/* Current Signed-In Identity */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-left">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-200 truncate">{user?.displayName || 'User'}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>
          </div>
        </div>

        {/* Access Pathways Tabs */}
        <div className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('request')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'request'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Access</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter Passcode</span>
            </button>
          </div>

          {/* Option 1: Request Access / Subscription Form */}
          {activeTab === 'request' && (
            <div className="space-y-4 animate-fade-in">
              {requestSubmitted ? (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h3 className="font-bold text-sm text-emerald-100">Access Request Sent!</h3>
                  <p className="text-xs text-emerald-300/90 leading-relaxed">
                    The administrator has been notified. As soon as your access or subscription is approved, your studio will unlock automatically.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendRequest} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Select Plan / Purpose
                    </label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 outline-none"
                    >
                      <option value="Pro Creator Subscription">Pro Creator Subscription</option>
                      <option value="Team / Channel License">Team / Channel License</option>
                      <option value="Lifetime Access Member">Lifetime Access Member</option>
                      <option value="Personal / Student Access">Personal / Student Access</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Message / Verification Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Subscription payment confirmed or YouTube channel creator..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Sending Request...' : 'Submit Access Request'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Option 2: Passcode Redemption */}
          {activeTab === 'code' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-slate-400 leading-relaxed">
                If the administrator provided you with a VIP invitation code or subscriber key, enter it below to unlock the studio immediately:
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

          {/* Admin Note Footer */}
          <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Managed by Studio Administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
}
