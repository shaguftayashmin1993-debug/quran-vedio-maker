import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  KeyRound,
  Inbox,
  Trash2,
  Check,
  X,
  Copy,
  CheckCheck,
  Search,
  Sparkles,
  Ban,
  RefreshCw,
  Plus,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Send,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { UserRole, AllowedUser, AccessRequest, SubscriberRecord } from '../types';

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminAccessModal({ isOpen, onClose }: AdminAccessModalProps) {
  const {
    user,
    isOwner,
    allowedUsersList,
    pendingRequests,
    accessCodes,
    allRegisteredUsers,
    subscribersList,
    addAllowedUser,
    updateAllowedUserStatus,
    removeAllowedUser,
    approveRequest,
    rejectRequest,
    createAccessCode,
    deleteAccessCode,
    adminIssueSubscriberCredentials,
    updateSubscriberStatus,
    removeSubscriber,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'subscribers' | 'members' | 'registered' | 'requests' | 'codes'>('subscribers');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscriber Form State
  const [subEmail, setSubEmail] = useState('');
  const [subName, setSubName] = useState('');
  const [subPlan, setSubPlan] = useState('Full Studio Pro Subscription');
  const [subPassword, setSubPassword] = useState('');
  const [isIssuingSubscriber, setIsIssuingSubscriber] = useState(false);
  const [issuedSubscriberResult, setIssuedSubscriberResult] = useState<{
    memberId: string;
    password: string;
    email: string;
    name: string;
    plan: string;
  } | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [memberId: string]: boolean }>({});
  const [copiedSubId, setCopiedSubId] = useState<string | null>(null);

  // Add User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('subscriber');
  const [newPlan, setNewPlan] = useState('Pro Creator Subscription');
  const [newNotes, setNewNotes] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Generate Code Form State
  const [customCode, setCustomCode] = useState('');
  const [codeRole, setCodeRole] = useState<UserRole>('subscriber');
  const [codePlan, setCodePlan] = useState('VIP Subscriber Pass');
  const [codeUses, setCodeUses] = useState(1);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Copy Feedback
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Issue Subscriber Credentials
  const handleIssueSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setIsIssuingSubscriber(true);
    try {
      const res = await adminIssueSubscriberCredentials(
        subEmail.trim(),
        subName.trim() || undefined,
        subPlan,
        subPassword.trim() || undefined
      );

      setIssuedSubscriberResult({
        memberId: res.memberId,
        password: res.password,
        email: res.record.email,
        name: res.record.displayName,
        plan: res.record.subscriptionPlan,
      });

      setSubEmail('');
      setSubName('');
      setSubPassword('');
    } catch (err) {
      console.error('Failed to issue subscriber credentials:', err);
    } finally {
      setIsIssuingSubscriber(false);
    }
  };

  // Export Subscribers Database as CSV
  const handleExportCSV = () => {
    if (subscribersList.length === 0) return;
    const headers = ['Member ID', 'Email', 'Password', 'Display Name', 'Subscription Plan', 'Status', 'Joined Date', 'Last Login'];
    const rows = subscribersList.map((s) => [
      `"${s.memberId}"`,
      `"${s.email}"`,
      `"${s.password || ''}"`,
      `"${s.displayName}"`,
      `"${s.subscriptionPlan}"`,
      `"${s.status}"`,
      `"${s.createdAt ? new Date(s.createdAt).toISOString() : ''}"`,
      `"${s.lastLoginAt ? new Date(s.lastLoginAt).toISOString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QuranStudio_Subscribers_Database_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSubId(id);
    setTimeout(() => setCopiedSubId(null), 2000);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsAddingUser(true);
    try {
      await addAllowedUser(newEmail.trim(), newRole, newPlan, newNotes);
      setNewEmail('');
      setNewNotes('');
    } catch (err) {
      console.error('Failed to add user:', err);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = customCode.trim()
      ? customCode.trim().toUpperCase()
      : `QURAN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    setIsGeneratingCode(true);
    try {
      await createAccessCode(finalCode, codeRole, codePlan, codeUses);
      setCustomCode('');
    } catch (err) {
      console.error('Failed to generate code:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(code);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const filteredSubscribers = subscribersList.filter((s) =>
    s.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.subscriptionPlan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allowedUsersList.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.plan && u.plan.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.notes && u.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredRegisteredUsers = allRegisteredUsers.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = pendingRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#0c1322] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header Ribbon */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-100">
                  Subscribers &amp; Access Control Database
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate Member IDs, issue passwords, check email verification, and manage database records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-800 bg-[#0c1322] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('subscribers')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'subscribers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Subscribers Database ({subscribersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'members'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Authorized Whitelist ({allowedUsersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('registered')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'registered'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Registered Directory ({allRegisteredUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 relative ${
              activeTab === 'requests'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Access Requests</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'requests' ? 'bg-slate-950 text-amber-300' : 'bg-red-500 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('codes')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'codes'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Invitation Keys ({accessCodes.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 0: SUBSCRIBERS DATABASE (PRIMARY USER REQUEST) */}
          {activeTab === 'subscribers' && (
            <div className="space-y-5">
              {/* Issued Credentials Notification Banner (if any freshly issued) */}
              {issuedSubscriberResult && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Subscriber Account Created &amp; Saved to Database!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIssuedSubscriberResult(null)}
                      className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Member ID</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-black text-amber-300 text-sm tracking-wider">
                          {issuedSubscriberResult.memberId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(issuedSubscriberResult.memberId, 'banner-id')}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                        >
                          {copiedSubId === 'banner-id' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Assigned Password</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-slate-100">
                          {issuedSubscriberResult.password}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(issuedSubscriberResult.password, 'banner-pass')}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                        >
                          {copiedSubId === 'banner-pass' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Email / Plan</span>
                      <div className="text-slate-200 font-semibold truncate mt-0.5">{issuedSubscriberResult.email}</div>
                      <div className="text-[11px] text-amber-400 truncate">{issuedSubscriberResult.plan}</div>
                    </div>
                  </div>

                  {/* Ready-to-Send Message Button */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Assalamu Alaikum! Your subscription to Quran Video Studio is activated.\n\nMember ID: ${issuedSubscriberResult.memberId}\nPassword: ${issuedSubscriberResult.password}\nRegistered Email: ${issuedSubscriberResult.email}\nPlan: ${issuedSubscriberResult.plan}\n\nYou can log in with either your Member ID or Email to start creating videos.`;
                        handleCopyText(msg, 'banner-msg');
                      }}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{copiedSubId === 'banner-msg' ? 'Message Copied!' : 'Copy Client Welcome Message'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Form: Issue ID & Password to New Subscriber */}
              <div className="p-4 rounded-2xl bg-[#0f182b] border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>Issue New Subscriber ID &amp; Password</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Stores directly to Firebase Firestore database</span>
                </div>

                <form onSubmit={handleIssueSubscriber} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                      User Email Address *
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
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                      Name / Channel Name
                    </label>
                    <input
                      type="text"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      placeholder="e.g. Brother Tariq"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                      Subscription Plan
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

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                      Password (Blank = Auto)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={subPassword}
                        onChange={(e) => setSubPassword(e.target.value)}
                        placeholder="Auto-generated"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isIssuingSubscriber || !subEmail.trim()}
                        className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Issue</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Subscribers Database Table Header & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Member ID, email, name..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={subscribersList.length === 0}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Export Database (CSV)</span>
                  </button>
                </div>
              </div>

              {/* Subscribers List Cards */}
              <div className="space-y-2.5">
                {filteredSubscribers.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400">
                    No subscribers found matching your criteria. Use the form above to issue an ID and Password.
                  </div>
                ) : (
                  filteredSubscribers.map((sub) => {
                    const isPassVisible = showPasswords[sub.memberId] || false;
                    return (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Member Details */}
                        <div className="flex items-start sm:items-center gap-3">
                          {/* Member ID Pill */}
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Member ID</span>
                            <div className="flex items-center gap-1 mt-0.5 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl">
                              <span className="font-mono text-xs font-black text-amber-300">
                                {sub.memberId}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(sub.memberId, `id-${sub.id}`)}
                                title="Copy ID"
                                className="text-amber-400/80 hover:text-amber-300 cursor-pointer"
                              >
                                {copiedSubId === `id-${sub.id}` ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-100">{sub.displayName || 'Subscriber'}</span>
                              <span className="text-xs text-slate-300 font-mono">({sub.email})</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                                {sub.subscriptionPlan}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  sub.status === 'active'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-red-500/15 text-red-300 border border-red-500/30'
                                }`}
                              >
                                {sub.status.toUpperCase()}
                              </span>
                            </div>

                            {/* Password display & Joined Date */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span className="font-mono font-bold text-slate-200">
                                  {isPassVisible ? sub.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowPasswords((prev) => ({
                                      ...prev,
                                      [sub.memberId]: !isPassVisible,
                                    }))
                                  }
                                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                                >
                                  {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(sub.password, `pass-${sub.id}`)}
                                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                                  title="Copy Password"
                                >
                                  {copiedSubId === `pass-${sub.id}` ? (
                                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>

                              <span>Joined: {new Date(sub.createdAt).toLocaleDateString()}</span>
                              {sub.lastLoginAt && (
                                <span>Last Active: {new Date(sub.lastLoginAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Row Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {/* Copy WhatsApp / Email invitation template */}
                          <button
                            type="button"
                            onClick={() => {
                              const msg = `Assalamu Alaikum! Your Quran Video Studio login credentials:\n\nMember ID: ${sub.memberId}\nPassword: ${sub.password}\nRegistered Email: ${sub.email}\nPlan: ${sub.subscriptionPlan}\n\nSign in anytime at the studio!`;
                              handleCopyText(msg, `msg-${sub.id}`);
                            }}
                            className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy Full Login Info"
                          >
                            <Send className="w-3 h-3 text-amber-400" />
                            <span>{copiedSubId === `msg-${sub.id}` ? 'Message Copied!' : 'Copy Info'}</span>
                          </button>

                          {/* Toggle Active / Suspended */}
                          <button
                            type="button"
                            onClick={() =>
                              updateSubscriberStatus(sub.id, sub.status === 'active' ? 'revoked' : 'active')
                            }
                            className={`py-1 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              sub.status === 'active'
                                ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border-slate-700'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {sub.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>

                          {/* Delete Subscriber Record */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove subscriber ${sub.email} (${sub.memberId}) from database?`)) {
                                removeSubscriber(sub.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors cursor-pointer"
                            title="Delete Subscriber Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 1: AUTHORIZED MEMBERS & WHITELIST */}
          {activeTab === 'members' && (
            <div className="space-y-5">
              {/* Add User Card */}
              <div className="p-4 rounded-2xl bg-[#0f182b] border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>Grant Instant Studio Access to New Person</span>
                </div>

                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 outline-none"
                    >
                      <option value="subscriber">Pro Subscriber</option>
                      <option value="member">Standard Member</option>
                      <option value="admin">Co-Administrator</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4 flex gap-2">
                    <input
                      type="text"
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                      placeholder="Plan name (e.g. Pro Monthly)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                    />

                    <button
                      type="submit"
                      disabled={isAddingUser || !newEmail.trim()}
                      className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingUser ? 'Adding...' : 'Grant'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Search & Users List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by email or plan..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 focus:border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-400 outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    Showing {filteredUsers.length} authorized users
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No matching authorized users found. Add an email above to grant access.
                    </div>
                  ) : (
                    filteredUsers.map((item) => {
                      const isSuperAdmin = item.email.toLowerCase() === 'shaguftayashmin1993@gmail.com';
                      return (
                        <div
                          key={item.email}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuperAdmin
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : item.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-300 border border-red-500/30'
                            }`}>
                              {item.email[0].toUpperCase()}
                            </div>

                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-100 truncate">
                                  {item.email}
                                </span>
                                {isSuperAdmin ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                                    Owner
                                  </span>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    item.role === 'admin'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      : item.role === 'subscriber'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}>
                                    {item.role === 'subscriber' ? 'Pro Subscriber' : item.role}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{item.plan || 'Standard Access'}</span>
                                {item.notes && <span className="text-slate-400">• {item.notes}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          {!isSuperAdmin && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  updateAllowedUserStatus(
                                    item.email,
                                    item.status === 'active' ? 'revoked' : 'active'
                                  )
                                }
                                title={item.status === 'active' ? 'Revoke Access' : 'Re-activate Access'}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                  item.status === 'active'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40'
                                    : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
                                }`}
                              >
                                {item.status === 'active' ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3" />
                                    <span>Revoked</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeAllowedUser(item.email)}
                                title="Remove User Permanently"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/30 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: REGISTERED USERS DIRECTORY */}
          {activeTab === 'registered' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>Real-Time Registered User Database</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live record of all user accounts created in Firebase Authentication and Firestore.
                  </p>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, or UID..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredRegisteredUsers.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-1">
                    <Users className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                    <p>No registered accounts found matching your query.</p>
                  </div>
                ) : (
                  filteredRegisteredUsers.map((regUser) => {
                    const isSuperAdmin = regUser.email.toLowerCase().trim() === 'shaguftayashmin1993@gmail.com';
                    const allowedEntry = allowedUsersList.find(
                      (a) => a.email.toLowerCase().trim() === regUser.email.toLowerCase().trim()
                    );
                    const isWhitelisted = isSuperAdmin || (allowedEntry && allowedEntry.status === 'active');
                    const isRevoked = allowedEntry && allowedEntry.status === 'revoked';

                    return (
                      <div
                        key={regUser.uid}
                        className="p-3.5 rounded-2xl border border-slate-800 bg-[#0e1628] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-300 text-xs shrink-0 mt-0.5">
                            {regUser.displayName?.[0]?.toUpperCase() || regUser.email[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-100">{regUser.displayName || 'Registered User'}</span>
                              <span className="text-xs text-slate-400 font-mono">({regUser.email})</span>

                              {isSuperAdmin ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                                  👑 Super Owner
                                </span>
                              ) : isWhitelisted ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Verified &amp; Authorized ({allowedEntry?.role || 'Subscriber'})</span>
                                </span>
                              ) : isRevoked ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 text-[9px] font-bold border border-red-500/30 flex items-center gap-1">
                                  <Ban className="w-2.5 h-2.5" />
                                  <span>Access Revoked</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[9px] font-bold border border-amber-500/20 flex items-center gap-1">
                                  <span>Registered • Pending Access Approval</span>
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-1 flex-wrap font-mono">
                              <span>Registered: {new Date(regUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              {regUser.lastLoginAt && (
                                <span>• Last Active: {new Date(regUser.lastLoginAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                              <span>• UID: {regUser.uid.substring(0, 10)}...</span>
                            </div>
                          </div>
                        </div>

                        {/* Fast Actions */}
                        {!isSuperAdmin && (
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {!isWhitelisted ? (
                              <button
                                type="button"
                                onClick={() => addAllowedUser(regUser.email, 'subscriber', 'Pro Creator Subscription', 'Approved from Directory')}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Authorize as Subscriber</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  updateAllowedUserStatus(
                                    regUser.email,
                                    allowedEntry?.status === 'active' ? 'revoked' : 'active'
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                  allowedEntry?.status === 'active'
                                    ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                }`}
                              >
                                {allowedEntry?.status === 'active' ? 'Revoke Access' : 'Restore Access'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACCESS REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Review users who requested access or purchased a subscription for this Quran Video Studio deployment:
              </p>

              <div className="space-y-2.5">
                {pendingRequests.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-2">
                    <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-400">No pending access requests at the moment.</p>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-800 bg-[#0e1628] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">{req.email}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            {req.plan || 'Requested Access'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            req.status === 'pending'
                              ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                              : req.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/15 text-red-300 border border-red-500/30'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>

                        {req.reason && (
                          <p className="text-[11px] text-slate-300 leading-relaxed italic">
                            "{req.reason}"
                          </p>
                        )}

                        <div className="text-[10px] text-slate-400">
                          Requested: {new Date(req.requestedAt).toLocaleString()}
                        </div>
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => approveRequest(req, 'subscriber', req.plan)}
                            className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Subscriber</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => rejectRequest(req.id)}
                            className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 text-xs transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INVITATION PASSCODES */}
          {activeTab === 'codes' && (
            <div className="space-y-5">
              {/* Code Generator Form */}
              <div className="p-4 rounded-2xl bg-[#0f182b] border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Generate VIP Passcode / License Key</span>
                </div>

                <form onSubmit={handleCreateCode} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      placeholder="Custom code (e.g. VIP-GOLD)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-mono text-amber-300 placeholder-slate-400 outline-none uppercase"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={codeRole}
                      onChange={(e) => setCodeRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 outline-none"
                    >
                      <option value="subscriber">Pro Subscriber</option>
                      <option value="member">Standard Member</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={codeUses}
                      onChange={(e) => setCodeUses(parseInt(e.target.value) || 1)}
                      title="Max uses"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-slate-100 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={isGeneratingCode}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingCode ? 'Creating...' : 'Generate Key'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Codes List */}
              <div className="space-y-2.5">
                {accessCodes.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400">
                    No passcodes generated yet. Create one above to share directly with subscribers.
                  </div>
                ) : (
                  accessCodes.map((code) => (
                    <div
                      key={code.id}
                      className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm font-black text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                          {code.code}
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="font-semibold">{code.role.toUpperCase()}</span>
                          <span className="text-slate-400 ml-2">
                            • {code.usesLeft} {code.usesLeft === 1 ? 'use left' : 'uses left'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(code.code)}
                          className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedCodeId === code.code ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteAccessCode(code.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
