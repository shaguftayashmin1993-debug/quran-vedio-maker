import { useState, useEffect, useCallback } from 'react';
import { Surah, VideoConfig, SavedVideo, SavedTaskSession } from './types';
import { SURAHS, SurahMeta } from './data/surahs';
import { RECITERS, TRANSLATION_RECITERS } from './data/reciters';
import { Header } from './components/Header';
import { SurahSelector } from './components/SurahSelector';
import { ReciterAndStyleConfig } from './components/ReciterAndStyleConfig';
import { LiveStudioPreview } from './components/LiveStudioPreview';
import { VideoExporterModal } from './components/VideoExporterModal';
import { FromAudioRecorder } from './components/FromAudioRecorder';
import { LibraryTab } from './components/LibraryTab';
import { ResumeTaskBanner } from './components/ResumeTaskBanner';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'audio' | 'library'>('studio');

  // Task Session (Draft Checkpoint / Unfinished Task) State
  const [taskSession, setTaskSession] = useState<SavedTaskSession | null>(() => {
    try {
      const stored = localStorage.getItem('quran_video_maker_task_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isTaskSavedJustNow, setIsTaskSavedJustNow] = useState<boolean>(false);

  // Selected Surah Meta
  const [selectedMeta, setSelectedMeta] = useState<SurahMeta>(SURAHS[17]); // Default: Surah Al-Kahf (18)
  const [surahData, setSurahData] = useState<Surah | null>(null);
  const [isLoadingSurah, setIsLoadingSurah] = useState<boolean>(false);

  // Video Config State
  const [config, setConfig] = useState<VideoConfig>({
    surahNumber: 18,
    startAyah: 1,
    endAyah: 10,
    reciterFolder: RECITERS[0].folder,
    reciterName: RECITERS[0].name,
    translationLang: 'en',
    translationReciterFolder: TRANSLATION_RECITERS[0].folder,
    translationReciterName: TRANSLATION_RECITERS[0].name,
    translationSpeechRate: 1.0,
    audioMode: 'recitation',
    aspectRatio: '16:9',
    videoStyle: 'modern-dark',
    bgImageCategory: 'starry-night',
    rotateBgPerAyah: true,
    animatedSceneryEffects: true,
    bgOverlayDarkness: 0.55,
    textAnimation: 'fade-scale',
    highlightRecitedWords: true,
    arabicScript: 'uthmani',
    draftQuality: false,
    gaplessAudio: true
  });

  // Auto-save current state as a background task checkpoint
  useEffect(() => {
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
    } catch (e) {
      console.warn('Could not auto-save draft session:', e);
    }
  }, [selectedMeta, config]);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Saved Videos Library
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() => {
    try {
      const stored = localStorage.getItem('quran_video_maker_saved');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
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

  const handleResumeTask = (session: SavedTaskSession) => {
    const foundSurah = SURAHS.find((s) => s.number === session.surahNumber);
    if (foundSurah) {
      setSelectedMeta(foundSurah);
    }
    if (session.config) {
      setConfig(session.config);
    }
    setActiveTab('studio');
  };

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

  // Fetch Surah details when selectedMeta changes
  const fetchSurahDetails = useCallback(async (meta: SurahMeta) => {
    setIsLoadingSurah(true);
    try {
      const res = await fetch(`/api/surah/${meta.number}`);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setSurahData(json.data);
      } else {
        throw new Error(json.message || 'API error');
      }
    } catch (err) {
      console.error(`Failed to fetch details for Surah ${meta.number}:`, err);
      // Fallback constructed data using meta parameter directly
      setSurahData({
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
      });
    } finally {
      setIsLoadingSurah(false);
    }
  }, []);

  useEffect(() => {
    fetchSurahDetails(selectedMeta);
  }, [selectedMeta, fetchSurahDetails]);

  const handleSelectSurah = (surah: SurahMeta) => {
    setSelectedMeta(surah);
    setConfig((prev) => ({
      ...prev,
      surahNumber: surah.number,
      startAyah: 1,
      endAyah: Math.min(10, surah.numberOfAyahs)
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
  };

  const handleDeleteVideo = (id: string) => {
    setSavedVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleRecitationAligned = (alignedSurah: SurahMeta, _audioUrl: string) => {
    handleSelectSurah(alignedSurah);
    setActiveTab('studio');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedVideos.length}
        hasIncompleteTask={!!taskSession}
        onResumeTaskClick={() => taskSession && handleResumeTask(taskSession)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* RESUME TASK / CHECKPOINT BANNER */}
        <ResumeTaskBanner
          taskSession={taskSession}
          onResumeTask={handleResumeTask}
          onDiscardTask={handleDiscardTask}
          onManualSaveTask={handleManualSaveTask}
          isTaskSavedJustNow={isTaskSavedJustNow}
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
                onOpenExportModal={() => setIsExportModalOpen(true)}
                isExportModalOpen={isExportModalOpen}
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

      {/* Export Modal */}
      {surahData && (
        <VideoExporterModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          surah={surahData}
          config={config}
          onSaveToLibrary={handleSaveToLibrary}
        />
      )}
    </div>
  );
}
