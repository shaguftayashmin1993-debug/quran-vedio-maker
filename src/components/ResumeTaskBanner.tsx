import React, { useState } from 'react';
import {
  RotateCcw,
  Bookmark,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Clock,
  Sparkles,
  Download,
  Film,
  FolderHeart,
  Eye,
  Check
} from 'lucide-react';
import { SavedTaskSession } from '../types';
import { triggerSafeDownload } from '../utils/downloadUtils';
import { getVideoBlobFromDB } from '../utils/videoStorage';

interface ResumeTaskBannerProps {
  taskSession: SavedTaskSession | null;
  onResumeTask: (session: SavedTaskSession) => void;
  onDiscardTask: () => void;
  onManualSaveTask: () => void;
  isTaskSavedJustNow?: boolean;
  onOpenLibrary?: () => void;
}

export const ResumeTaskBanner: React.FC<ResumeTaskBannerProps> = ({
  taskSession,
  onResumeTask,
  onDiscardTask,
  onManualSaveTask,
  isTaskSavedJustNow,
  onOpenLibrary
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!taskSession || isDismissed) {
    return (
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          <span>Want to save your current setup as a restore point?</span>
        </div>
        <button
          onClick={onManualSaveTask}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-medium transition-all cursor-pointer"
        >
          {isTaskSavedJustNow ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">Task Saved as Checkpoint!</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Progress Checkpoint</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const handleDownloadTaskVideo = async () => {
    setIsDownloading(true);
    try {
      const filename = `Surah_${taskSession.surahNumber}_${taskSession.englishName}_Ayah_${taskSession.startAyah}_${taskSession.endAyah}_Video.mp4`;

      // 1. Try to retrieve permanent video blob from IndexedDB
      if (taskSession.completedVideoId) {
        const stored = await getVideoBlobFromDB(taskSession.completedVideoId);
        if (stored?.videoBlob) {
          await triggerSafeDownload(stored.videoBlob, filename);
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 4000);
          return;
        }
      }

      // 2. If object URL is active
      if (taskSession.completedVideoUrl) {
        await triggerSafeDownload(taskSession.completedVideoUrl, filename);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
        return;
      }

      // 3. If in Library, navigate user to library
      if (onOpenLibrary) {
        onOpenLibrary();
      }
    } catch (err) {
      console.error('Task banner download error:', err);
      if (onOpenLibrary) onOpenLibrary();
    } finally {
      setIsDownloading(false);
    }
  };

  // 1. COMPLETED TASK STATE (User generated full Surah Baqarah or another surah)
  if (taskSession.status === 'completed' || taskSession.status === 'exported') {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-[#0b1b24] to-slate-900/90 border border-emerald-500/50 rounded-2xl p-4 md:p-5 shadow-xl shadow-emerald-950/20 backdrop-blur-md animate-in fade-in duration-300">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left Side: Success Info */}
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5 sm:mt-0 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-500 text-slate-950 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
                  <Check className="w-3 h-3" /> TASK COMPLETED • VIDEO READY
                </span>
                <span className="text-xs text-emerald-300/80 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTimeAgo(taskSession.updatedAt)}
                </span>
              </div>

              <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2 truncate">
                <span>Surah {taskSession.englishName} ({taskSession.surahName})</span>
                <span className="text-amber-400 text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  Ayah {taskSession.startAyah}–{taskSession.endAyah}
                </span>
              </h3>

              <p className="text-xs text-slate-300">
                Full video generation finished successfully and is ready to download or view in your library.
              </p>
            </div>
          </div>

          {/* Right Side: Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadTaskVideo}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Download your finished video immediately"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950 font-black" />
                  <span>Download Started!</span>
                </>
              ) : isDownloading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Preparing Download...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950 font-black" />
                  <span>Download Video</span>
                </>
              )}
            </button>

            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="View in My Videos Library"
              >
                <FolderHeart className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">My Videos</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
                onDiscardTask();
              }}
              className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl text-xs transition-all cursor-pointer"
              title="Clear Completed Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNFINISHED / DRAFT SESSION STATE
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900/80 border border-amber-500/40 rounded-2xl p-4 md:p-5 shadow-xl shadow-amber-950/20 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5 sm:mt-0">
            <RotateCcw className="w-5 h-5 animate-spin-slow" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> SAVED DRAFT RESTORE POINT
              </span>
              <span className="text-xs text-amber-200/70 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatTimeAgo(taskSession.updatedAt)}
              </span>
            </div>

            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              <span>Surah {taskSession.englishName} ({taskSession.surahName})</span>
              <span className="text-amber-400 text-xs font-normal">
                • Verses {taskSession.startAyah}–{taskSession.endAyah}
              </span>
            </h3>

            <p className="text-xs text-slate-300">
              Style: <span className="text-amber-200 font-medium capitalize">{(taskSession.config?.videoStyle || 'modern-dark').replace('-', ' ')}</span> • Reciter: <span className="text-slate-200 font-medium">{taskSession.config?.reciterName || 'Reciter'}</span> • Aspect Ratio: <span className="text-amber-300">{taskSession.config?.aspectRatio || '16:9'}</span>
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => {
              setIsDismissed(true);
              onDiscardTask();
            }}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-medium transition-all cursor-pointer"
            title="Discard Saved Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onManualSaveTask}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Update Checkpoint</span>
          </button>

          <button
            onClick={() => onResumeTask(taskSession)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>Resume Task</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
