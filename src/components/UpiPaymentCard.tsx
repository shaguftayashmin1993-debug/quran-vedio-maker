import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUpiPlans, buildUpiPaymentUrl, generateUpiQrCode, UpiPlanOption } from '../utils/upiUtils';

interface UpiPaymentCardProps {
  onSuccess?: (credentials: { memberId: string; password: string; email: string; plan: string }) => void;
  defaultEmail?: string;
}

export function UpiPaymentCard({ onSuccess, defaultEmail = '' }: UpiPaymentCardProps) {
  const { upiConfig, submitUpiPayment, user } = useAuth();
  
  const plans = getUpiPlans(upiConfig);
  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | 'annual' | 'lifetime'>('annual');
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1];

  // User input
  const [email, setEmail] = useState(defaultEmail || user?.email || '');
  const [name, setName] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUtrHelp, setShowUtrHelp] = useState(false);

  // Success view
  const [issuedCreds, setIssuedCreds] = useState<{
    memberId: string;
    password: string;
    email: string;
    plan: string;
  } | null>(null);

  // Generate dynamic UPI URI and QR code whenever plan or UPI config changes
  useEffect(() => {
    const upiUri = buildUpiPaymentUrl(
      upiConfig.upiId,
      upiConfig.payeeName,
      selectedPlan.priceInr,
      `Quran Studio ${selectedPlan.name}`
    );

    let isMounted = true;
    generateUpiQrCode(upiUri).then((dataUrl) => {
      if (isMounted) setQrCodeDataUrl(dataUrl);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedPlanId, upiConfig, selectedPlan.priceInr]);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const currentUpiUri = buildUpiPaymentUrl(
    upiConfig.upiId,
    upiConfig.payeeName,
    selectedPlan.priceInr,
    `Quran Studio ${selectedPlan.name}`
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please provide your email address to receive your Member ID & Password.');
      return;
    }
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setError('Please enter the 12-digit UPI Reference / UTR Number from your payment app.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitUpiPayment({
        email: email.trim(),
        name: name.trim() || undefined,
        utrNumber: utrNumber.trim(),
        planId: selectedPlanId,
        planName: selectedPlan.name,
        amountInr: selectedPlan.priceInr,
      });

      if (res.success) {
        const creds = {
          memberId: res.memberId,
          password: res.password,
          email: email.trim(),
          plan: selectedPlan.name,
        };
        setIssuedCreds(creds);
        if (onSuccess) onSuccess(creds);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit UPI verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If credentials already issued, render celebration screen
  if (issuedCreds) {
    return (
      <div className="p-6 rounded-2xl bg-[#09101d] border-2 border-emerald-500/50 text-center space-y-4 animate-fade-in shadow-xl">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-black text-emerald-300">
            UPI Payment Registered &amp; Verified!
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Your Pro subscription for <span className="font-semibold text-amber-400">{issuedCreds.plan}</span> is active. Studio is unlocked!
          </p>
        </div>

        {/* Credentials Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Member ID</span>
            <span className="text-sm font-black font-mono tracking-widest text-amber-300">{issuedCreds.memberId}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Password</span>
            <span className="text-sm font-mono text-slate-200">{issuedCreds.password}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Email</span>
            <span className="text-xs text-slate-300 font-mono">{issuedCreds.email}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          Enter Quran Video Studio Now &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* STEP 1: SELECT PLAN */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <span>1. Select Subscription Plan</span>
          </label>
          <span className="text-[10px] text-emerald-400 font-medium">Instant Activation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {plans.map((p) => {
            const isSelected = p.id === selectedPlanId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/40 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {p.badge && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shadow-sm">
                    {p.badge}
                  </span>
                )}
                <div>
                  <div className="text-xs font-black text-slate-100">{p.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.subTitle}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-baseline gap-1.5">
                  <span className="text-base font-black text-amber-400 font-mono">₹{p.priceInr}</span>
                  {p.originalPriceInr && (
                    <span className="text-[10px] text-slate-400 line-through">₹{p.originalPriceInr}</span>
                  )}
                  <span className="text-[10px] text-slate-400">{p.period}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: SCAN & PAY (QR CODE & DEEP LINKS) */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0c1629] to-[#070d19] border border-amber-500/30 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                <span>2. Scan QR or Pay with UPI App</span>
                <span className="text-[10px] font-bold text-amber-400 font-mono">₹{selectedPlan.priceInr}</span>
              </div>
              <div className="text-[10px] text-slate-400">Google Pay • PhonePe • Paytm • BHIM • CRED</div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Verified UPI
            </span>
          </div>
        </div>

        {/* Center: Dynamic QR Code & UPI Copy */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
          {/* QR Code Container */}
          <div className="relative p-2.5 bg-white rounded-2xl shadow-xl shadow-amber-500/5 border border-slate-200 shrink-0">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="UPI Payment QR Code"
                className="w-36 h-36 md:w-40 md:h-40 rounded-lg object-contain"
              />
            ) : (
              <div className="w-36 h-36 md:w-40 md:h-40 flex items-center justify-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            )}
            <div className="text-center mt-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-900 bg-amber-400 px-2 py-0.5 rounded-full">
                Pay ₹{selectedPlan.priceInr}
              </span>
            </div>
          </div>

          {/* Quick Pay Buttons & UPI ID Box */}
          <div className="flex-1 space-y-2.5 w-full">
            {/* 1-Click Pay for Mobile Devices */}
            <div className="space-y-1.5">
              <a
                href={currentUpiUri}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open Google Pay / PhonePe / Paytm</span>
              </a>
              <p className="text-[10px] text-slate-400 text-center">
                (Click above if you are browsing on mobile phone)
              </p>
            </div>

            {/* UPI ID Copy Field */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">UPI ID / VPA</div>
                <div className="text-xs font-mono font-bold text-amber-300">{upiConfig.upiId}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyUpiId}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 justify-between px-1">
              <span>Payee: <strong className="text-slate-200">{upiConfig.payeeName}</strong></span>
              <span>Currency: <strong className="text-slate-200">INR (₹)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: SUBMIT UTR FOR INSTANT UNLOCK */}
      <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <span>3. Enter Payment Details to Unlock</span>
          </label>
          <button
            type="button"
            onClick={() => setShowUtrHelp(!showUtrHelp)}
            className="text-[10px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Where is UTR?</span>
          </button>
        </div>

        {showUtrHelp && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/90 space-y-1 animate-fade-in">
            <div className="font-bold text-amber-300">Where to find 12-digit UPI Reference / UTR Number:</div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
              <li><strong>Google Pay:</strong> Open payment receipt &rarr; scroll to <em>"UPI transaction ID"</em> (12 digits).</li>
              <li><strong>PhonePe:</strong> View transaction history &rarr; copy <em>"UTR"</em> number (12 digits).</li>
              <li><strong>Paytm:</strong> View payment passbook &rarr; copy <em>"UPI Ref No."</em>.</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Your Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@gmail.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Your Member ID will be linked to this email</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              12-Digit UPI Reference No. / UTR *
            </label>
            <input
              type="text"
              required
              maxLength={20}
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. 426819402814"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none font-mono tracking-wider"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">From your GPay / PhonePe / Paytm receipt</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !email.trim() || !utrNumber.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying UPI Transaction...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Payment &amp; Unlock Studio Now (₹{selectedPlan.priceInr})</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
