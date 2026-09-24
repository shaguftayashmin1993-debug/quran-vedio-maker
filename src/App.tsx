import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Surah, VideoConfig, SavedVideo, SavedTaskSession } from './types';
import { SURAHS, SurahMeta } from './data/surahs';
import { RECITERS, TRANSLATION_RECITERS } from './data/reciters';
import { Header } from './components/Header';
import { SurahSelector } from './components/SurahSelector';
import { ReciterAndStyleConfig } from './components/ReciterAndStyleConfig';
import { LiveStudioPreview } from './components/LiveStudioPreview';
import { VideoExporterModal } from './components/VideoExporterModal';
import { BatchExporterModal } from './components/BatchExporterModal';
import { FromAudioRecorder } from './components/FromAudioRecorder';
import { LibraryTab } from './components/LibraryTab';
import { ResumeTaskBanner } from './components/ResumeTaskBanner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { AccessRestrictedScreen } from './components/AccessRestrictedScreen';
import { AdminAccessModal } from './components/AdminAccessModal';
import { syncSavedVideoToCloud, deleteSavedVideoFromCloud } from './utils/cloudSync';
import { getSurahDetails } from './utils/quranDataService';

function StudioApp() {
  const { user, loading, isAuthorized, isOwner } = useAuth();

  const [activeTab, setActiveTab] = useState<'studio' | 'audio' | 'library'>('studio');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Task Session (Draft Checkpoint / Unfinished Task) State
  const [taskSession, setTaskSession] = useState<SavedTaskSession | null>(() => {
    try {
      const stored = localStorage.getItem('quran_video_maker_task_session') || localStorage.getItem('quran_video_maker_active_draft');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isTaskSavedJustNow, setIsTaskSavedJustNow] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Surah Meta
  const [selectedMeta, setSelectedMeta] = useState<SurahMeta>(SURAHS[17]); // Default: Surah Al-Kahf (18)
  const [surahData, setSurahData] = useState<Surah | null>(null);
  const [isLoadingSurah, setIsLoadingSurah] = useState<boolean>(false);
  const [surahLoadError, setSurahLoadError] = useState<string | null>(null);

  // Video Config State
  const [config, setConfig] = useState<VideoConfig>({
    surahNumber: 18,
    startAyah: 1,
    endAyah: 110,
    reciterFolder: RECITERS[0].folder,
    reciterName: RECITERS[0].name,
    translationLang: 'en',
    translationReciterFolder: TRANSLATION_RECITERS[0].folder,
    translationReciterName: TRANSLATION_RECITERS[0].name,
    translationSpeechRate: 1.0,
    audioMode: 'recitation',
    aspectRatio: '16:9',
    videoStyle: 'modern-dark',
    bgImageCategory: 'makkah-kaaba-majestic',
    rotateBgPerAyah: false,
    animatedSceneryEffects: true,
    bgOverlayDarkness: 0.42,
    textAnimation: 'fade-scale',
    highlightRecitedWords: true,
    arabicScript: 'uthmani',
    textSize: 'normal',
    mushafAyatPerPage: 10,
    oneLinePerFrame: false,
    draftQuality: false,
    gaplessAudio: true
  });

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isBatchExportModalOpen, setIsBatchExportModalOpen] = useState<boolean>(false);

  // Saved Videos Library
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() => {
    try {
      const stored = localStorage.getItem('quran_video_maker_saved');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('quran_video_maker_saved', JSON.stringify(savedVideos));
    } catch (e) {
      console.warn('Could not save video library to localStorage:', e);
    }
  }, [savedVideos]);

  // Fetch Surah details when selectedMeta changes
  const fetchSurahDetails = useCallback(async (meta: SurahMeta) => {
    setIsLoadingSurah(true);
    setSurahLoadError(null);
    try {
      const data = await getSurahDetails(meta);
      setSurahData(data);
      setSurahLoadError(null);
      const maxAyahs = data.numberOfAyahs || data.ayahs?.length || 1;
      setConfig((prev) => {
        let s = prev.startAyah;
        let e = prev.endAyah;
        if (s > maxAyahs) s = 1;
        if (e > maxAyahs || e < s) e = maxAyahs;
        if (s === prev.startAyah && e === prev.endAyah) return prev;
        return { ...prev, startAyah: s, endAyah: e };
      });
    } catch (err: any) {
      console.error(`Failed to fetch details for Surah ${meta.number}:`, err);
      setSurahLoadError(`Unable to load text for Surah ${meta.number} (${meta.englishName}). Please check your connection.`);
      // If we don't have any data yet, create placeholder with notification
      setSurahData((current) => {
        if (current && current.number === meta.number && current.ayahs && current.ayahs.length > 0) {
          return current;
        }
        return {
          number: meta.number,
          name: meta.name,
          englishName: meta.englishName,
          englishNameTranslation: meta.englishNameTranslation,
          numberOfAyahs: meta.numberOfAyahs,
          revelationType: meta.revelationType,
          ayahs: Array.from({ length: meta.numberOfAyahs }, (_, i) => ({
            num: i + 1,
            arabic: meta.name,
            english: `Verse ${i + 1} of Surah ${meta.englishName}`
          }))
        };
      });
    } finally {
      setIsLoadingSurah(false);
    }
  }, []);

  useEffect(() => {
    fetchSurahDetails(selectedMeta);
  }, [selectedMeta, fetchSurahDetails]);

  // Auto-save current state as a background task checkpoint (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setTaskSession((prev) => {
        // If a task was marked completed for the current Surah and verse range, preserve it!
        if (
          prev &&
          prev.status === 'completed' &&
          prev.surahNumber === selectedMeta.number &&
          prev.startAyah === config.startAyah &&
          prev.endAyah === config.endAyah
        ) {
          return prev;
        }

        const activeSession: SavedTaskSession = {
          id: 'current-task',
          surahNumber: selectedMeta.number,
          surahName: selectedMeta.name,
          englishName: selectedMeta.englishName,
          startAyah: config.startAyah,
          endAyah: config.endAyah,
          config,
          updatedAt: new Date().toISOString(),
          status: 'draft'
        };

        try {
          localStorage.setItem('quran_video_maker_active_draft', JSON.stringify(activeSession));
          localStorage.setItem('quran_video_maker_task_session', JSON.stringify(activeSession));
        } catch (e) {
          console.warn('Could not auto-save draft session:', e);
        }

        return activeSession;
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedMeta, config]);

  const handleResumeTask = useCallback((session: SavedTaskSession) => {
    if (!session) return;
    const foundSurah = SURAHS.find((s) => s.number === session.surahNumber);
    if (foundSurah) {
      setSelectedMeta(foundSurah);
      fetchSurahDetails(foundSurah);
    }
    if (session.config) {
      setConfig({
        ...session.config,
        surahNumber: session.surahNumber || (foundSurah ? foundSurah.number : session.config.surahNumber)
      });
    }
    setActiveTab('studio');

    const updatedSession = {
      ...session,
      updatedAt: new Date().toISOString()
    };
    setTaskSession(updatedSession);

    try {
      localStorage.setItem('quran_video_maker_task_session', JSON.stringify(updatedSession));
      localStorage.setItem('quran_video_maker_active_draft', JSON.stringify(updatedSession));
    } catch (e) {
      console.warn('Could not update task session:', e);
    }

    setToastMessage(`Task Resumed: Surah ${session.englishName} (Verses ${session.startAyah}–${session.endAyah})`);
    setTimeout(() => setToastMessage(null), 4000);
  }, [fetchSurahDetails]);

  const handleDiscardTask = () => {
    setTaskSession(null);
    try {
      localStorage.removeItem('quran_video_maker_task_session');
      localStorage.removeItem('quran_video_maker_active_draft');
    } catch (e) {
      console.warn('Could not discard task session:', e);
    }
  };

  const handleManualSaveTask = () => {
    const session: SavedTaskSession = {
      id: `task-${Date.now()}`,
      surahNumber: selectedMeta.number,
      surahName: selectedMeta.name,
      englishName: selectedMeta.englishName,
      startAyah: config.startAyah,
      endAyah: config.endAyah,
      config,
      updatedAt: new Date().toISOString(),
      status: 'draft'
    };
    setTaskSession(session);
    setIsTaskSavedJustNow(true);
    try {
      localStorage.setItem('quran_video_maker_task_session', JSON.stringify(session));
    } catch (e) {
      console.warn('Could not save task checkpoint:', e);
    }
    setTimeout(() => setIsTaskSavedJustNow(false), 3000);
  };

  const handleSelectSurah = (surah: SurahMeta) => {
    setSelectedMeta(surah);
    setConfig((prev) => ({
      ...prev,
      surahNumber: surah.number,
      startAyah: 1,
      endAyah: surah.numberOfAyahs
    }));
  };

  const handleRangeChange = (start: number, end: number) => {
    setConfig((prev) => ({
      ...prev,
      startAyah: start,
      endAyah: end
    }));
  };

  const handleConfigChange = (updated: Partial<VideoConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleSaveToLibrary = (video: SavedVideo) => {
    setSavedVideos((prev) => [video, ...prev]);
    if (user) {
      syncSavedVideoToCloud(user.uid, video);
    }

    // Mark task session as completed so the user sees the completed state and direct download button
    const completedSession: SavedTaskSession = {
      id: `task-completed-${video.id}`,
      surahNumber: video.surahNumber,
      surahName: video.surahName,
      englishName: selectedMeta.englishName,
      startAyah: config.startAyah,
      endAyah: config.endAyah,
      config,
      updatedAt: new Date().toISOString(),
      status: 'completed',
      completedVideoId: video.id,
      completedVideoTitle: video.title,
      completedVideoUrl: video.blobUrl || video.hdBlobUrl || video.sdBlobUrl,
      completedFileSize: video.fileSize,
      completedDuration: video.duration
    };

    setTaskSession(completedSession);
    try {
      localStorage.setItem('quran_video_maker_task_session', JSON.stringify(completedSession));
      localStorage.setItem('quran_video_maker_active_draft', JSON.stringify(completedSession));
    } catch (e) {
      console.warn('Could not update completed task session:', e);
    }
  };

  const handleDeleteVideo = (id: string) => {
    setSavedVideos((prev) => prev.filter((v) => v.id !== id));
    if (user) {
      deleteSavedVideoFromCloud(user.uid, id);
    }
  };

  const handleRecitationAligned = (alignedSurah: SurahMeta, _audioUrl: string) => {
    handleSelectSurah(alignedSurah);
    setActiveTab('studio');
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-200">Verifying Security &amp; Subscription</h2>
            <p className="text-xs text-slate-400">Connecting to Quran Video Studio Cloud...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    return <AuthModal isOpen={true} />;
  }

  // 3. Authenticated but Unauthorized / Subscription Required State
  if (!isAuthorized) {
    return <AccessRestrictedScreen />;
  }

  // 4. Authorized Member / Subscriber / Admin Workspace
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedVideos.length}
        hasIncompleteTask={taskSession?.status === 'draft'}
        isTaskCompleted={taskSession?.status === 'completed'}
        onResumeTaskClick={() => taskSession && handleResumeTask(taskSession)}
        onOpenAdminAccess={() => setIsAdminModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* RESUME TASK / CHECKPOINT BANNER */}
        <ResumeTaskBanner
          taskSession={taskSession}
          onResumeTask={handleResumeTask}
          onDiscardTask={handleDiscardTask}
          onManualSaveTask={handleManualSaveTask}
          isTaskSavedJustNow={isTaskSavedJustNow}
          onOpenLibrary={() => setActiveTab('library')}
        />

        {/* TAB 1: STUDIO CREATOR */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Surah Selector & Configuration */}
            <div className="lg:col-span-6 space-y-6">
              <SurahSelector
                selectedSurah={selectedMeta}
                onSelectSurah={handleSelectSurah}
                startAyah={config.startAyah}
                endAyah={config.endAyah}
                onRangeChange={handleRangeChange}
                onOpenBatchExport={() => setIsBatchExportModalOpen(true)}
              />

              <ReciterAndStyleConfig
                config={config}
                onChange={handleConfigChange}
              />
            </div>

            {/* Right Column: Live Studio Preview Player */}
            <div className="lg:col-span-6 sticky top-24">
              <LiveStudioPreview
                surah={surahData}
                config={config}
                isLoadingSurah={isLoadingSurah}
                surahLoadError={surahLoadError}
                onRetryLoadSurah={() => fetchSurahDetails(selectedMeta)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                isExportModalOpen={isExportModalOpen}
                onOpenBatchExportModal={() => setIsBatchExportModalOpen(true)}
                onChangeConfig={handleConfigChange}
              />
            </div>
          </div>
        )}

        {/* TAB 2: FROM AUDIO / RECORD MICROPHONE */}
        {activeTab === 'audio' && (
          <FromAudioRecorder onRecitationAligned={handleRecitationAligned} />
        )}

        {/* TAB 3: SAVED VIDEOS LIBRARY */}
        {activeTab === 'library' && (
          <LibraryTab
            savedVideos={savedVideos}
            onDeleteVideo={handleDeleteVideo}
            onOpenStudio={() => setActiveTab('studio')}
          />
        )}
      </main>

      {/* Admin Access & Subscriber Modal (Strictly Owner Only) */}
      {isOwner && (
        <AdminAccessModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-2xl shadow-amber-500/40 flex items-center gap-3 border border-amber-300 animate-bounce">
          <Sparkles className="w-5 h-5 text-slate-950" />
          <span className="text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Single Video Export Modal */}
      {surahData && (
        <VideoExporterModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          surah={surahData}
          config={config}
          onSaveToLibrary={handleSaveToLibrary}
          onNavigateToHome={() => {
            setIsExportModalOpen(false);
            setActiveTab('studio');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToLibrary={() => {
            setIsExportModalOpen(false);
            setActiveTab('library');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onCreateNewVideo={() => {
            setIsExportModalOpen(false);
            setActiveTab('studio');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setToastMessage('Ready to select a new Surah or customize settings!');
            setTimeout(() => setToastMessage(null), 3500);
          }}
          onOpenBatchExport={() => {
            setIsExportModalOpen(false);
            setIsBatchExportModalOpen(true);
          }}
        />
      )}

      {/* Batch Video Exporter Modal */}
      {surahData && (
        <BatchExporterModal
          isOpen={isBatchExportModalOpen}
          onClose={() => setIsBatchExportModalOpen(false)}
          surah={surahData}
          config={config}
          onSaveToLibrary={handleSaveToLibrary}
          onOpenLibrary={() => {
            setIsBatchExportModalOpen(false);
            setActiveTab('library');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StudioApp />
    </AuthProvider>
  );
}
