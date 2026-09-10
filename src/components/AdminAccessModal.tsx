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
} from 'lucide-react';
import { UserRole, AllowedUser, AccessRequest } from '../types';

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
    addAllowedUser,
    updateAllowedUserStatus,
    removeAllowedUser,
    approveRequest,
    rejectRequest,
    createAccessCode,
    deleteAccessCode,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'members' | 'registered' | 'requests' | 'codes'>('members');
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0c1322] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header Ribbon */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-100">
                  Access &amp; Subscriber Control
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage allowed users, approve subscriber requests &amp; create access passcodes.
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
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-800 bg-[#0c1322]">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'members'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Authorized Members ({allowedUsersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('registered')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
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
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
          {/* TAB 1: MEMBERS & SUBSCRIBERS */}
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
