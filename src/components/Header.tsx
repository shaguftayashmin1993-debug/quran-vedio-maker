import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  BookOpen,
  Mic,
  FolderHeart,
  RotateCcw,
  ShieldCheck,
  Users,
  LogOut,
  User,
  Crown,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: 'studio' | 'audio' | 'library';
  setActiveTab: (tab: 'studio' | 'audio' | 'library') => void;
  savedCount: number;
  hasIncompleteTask?: boolean;
  isTaskCompleted?: boolean;
  onResumeTaskClick?: () => void;
  onOpenAdminAccess?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  hasIncompleteTask,
  isTaskCompleted,
  onResumeTaskClick,
  onOpenAdminAccess,
}) => {
  const { user, isOwner, isAdmin, userRole, subscriptionPlan, logout, pendingRequests } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const pendingCount = pendingRequests.filter((r) => r.status === 'pending').length;

  return (
    <header className="sticky top-0 z-40 bg-[#0b1220]/95 backdrop-blur-md border-b border-amber-500/20 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-xl text-slate-100 tracking-tight">
                Quran Video Maker
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Studio HD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Create 1080p &amp; 9:16 vertical Quran recitation videos with synced typography
            </p>
          </div>
        </div>

        {/* Navigation Tabs, Admin Access & Profile */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isTaskCompleted && onResumeTaskClick && (
            <button
              onClick={onResumeTaskClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-emerald-600/30 hover:from-emerald-500/30 hover:to-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
              title="Full video completed and ready to download"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Video Ready (Download)</span>
            </button>
          )}

          {!isTaskCompleted && hasIncompleteTask && onResumeTaskClick && (
            <button
              onClick={onResumeTaskClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold shadow-md shadow-amber-500/10 transition-all animate-pulse"
              title="Resume incomplete or previous video task"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Last Task</span>
            </button>
          )}

          {/* Main Workspace Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Studio Creator</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>From Audio / Mic</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FolderHeart className="w-4 h-4" />
              <span>My Videos</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-amber-400 text-slate-950 rounded-full font-bold">
                  {savedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Admin Control Button - Exclusively for Studio Owner */}
          {isOwner && onOpenAdminAccess && (
            <button
              type="button"
              onClick={onOpenAdminAccess}
              className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-400/60 text-xs font-black transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span>Admin Dashboard &amp; UPI</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile & Subscription Badge */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xs font-bold">
                  {user.email ? user.email[0].toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[11px] font-bold text-slate-200 leading-tight truncate max-w-[110px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[9px] text-amber-400 flex items-center gap-0.5">
                    {isOwner ? 'Owner' : userRole === 'admin' ? 'Admin' : 'Subscriber'}
                  </div>
                </div>
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0e172a] border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 z-50 animate-fade-in space-y-2">
                  <div className="p-2 border-b border-slate-800">
                    <div className="text-xs font-bold text-slate-100 truncate">{user.email}</div>
                    <div className="text-[10px] text-amber-300 mt-0.5 flex items-center gap-1 font-semibold">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>{subscriptionPlan || 'Authorized Member'}</span>
                    </div>
                  </div>

                  {isOwner && onOpenAdminAccess && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenAdminAccess();
                      }}
                      className="w-full p-2 rounded-xl text-left text-xs font-bold text-amber-300 hover:bg-amber-500/15 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Dashboard &amp; UPI</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="w-full p-2 rounded-xl text-left text-xs text-red-400 hover:bg-red-500/15 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
