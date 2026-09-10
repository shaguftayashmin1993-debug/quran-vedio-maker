import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Download, RefreshCw, AlertCircle, Layers } from 'lucide-react';
import { Surah, Ayah, VideoConfig, TranslationLang, TextSize } from '../types';
import { getAudioUrl } from '../data/reciters';
import { drawAyahFrame, drawTitleFrame, drawBismillahFrame, subscribeBackgroundImageLoad } from '../utils/canvasRenderer';
import { getAyahTranslationText, getSpokenTranslationTextAndLang } from '../utils/translationUtils';

interface LiveStudioPreviewProps {
  surah: Surah | null;
  config: VideoConfig;
  isLoadingSurah: boolean;
  surahLoadError?: string | null;
  onRetryLoadSurah?: () => void;
  onOpenExportModal: () => void;
  isExportModalOpen?: boolean;
  onOpenBatchExportModal?: () => void;
  onChangeConfig?: (updates: Partial<VideoConfig>) => void;
}

export const LiveStudioPreview: React.FC<LiveStudioPreviewProps> = ({
  surah,
  config,
  isLoadingSurah,
  surahLoadError,
  onRetryLoadSurah,
  onOpenExportModal,
  isExportModalOpen,
  onOpenBatchExportModal,
  onChangeConfig
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentVerseIdx, setCurrentVerseIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBismillahPhase, setIsBismillahPhase] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [renderTrigger, setRenderTrigger] = useState<number>(0);

  // Re-draw when background image finishes loading in background
  useEffect(() => {
    return subscribeBackgroundImageLoad(() => {
      setRenderTrigger((prev) => prev + 1);
    });
  }, []);

  // Filter ayahs based on start & end ayah range with robust auto-clamping
  const ayahsInRange = React.useMemo(() => {
    if (!surah || !surah.ayahs || surah.ayahs.length === 0) return [];
    
    let filtered = surah.ayahs.filter(
      (a) => a.num >= config.startAyah && a.num <= config.endAyah
    );

    // If startAyah/endAyah was out of range (e.g. switching from a long Surah to Surah Ad-Duha), auto-clamp to valid range
    if (filtered.length === 0) {
      const maxAyahs = surah.numberOfAyahs || surah.ayahs.length;
      const safeStart = Math.min(Math.max(1, config.startAyah), maxAyahs);
      const safeEnd = Math.min(Math.max(safeStart, config.endAyah), maxAyahs);
      
      filtered = surah.ayahs.filter(a => a.num >= safeStart && a.num <= safeEnd);
      if (filtered.length === 0) {
        filtered = surah.ayahs;
      }
    }

    return filtered;
  }, [surah, config.startAyah, config.endAyah]);

  const activeAyah: Ayah | null = ayahsInRange[currentVerseIdx] || ayahsInRange[0] || null;

  // Render canvas with smooth text animation & image background updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !surah || ayahsInRange.length === 0) return;

    const isPortrait = config.aspectRatio === '9:16';
    // Use crisp 720p HD resolution for live preview (lightning fast, zero lag)
    canvas.width = isPortrait ? 720 : 1280;
    canvas.height = isPortrait ? 1280 : 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime: number | null = null;
    const animDuration = 400; // 400ms smooth verse entrance animation

    const render = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = config.textAnimation === 'none' ? 1.0 : Math.min(1.0, elapsed / animDuration);

      if (isBismillahPhase) {
        drawBismillahFrame(ctx, canvas.width, canvas.height, config, progress, now);
      } else if (activeAyah) {
        let audioProgress = -1;
        if (isPlaying && audioRef.current && audioRef.current.duration > 0 && !audioRef.current.paused) {
          audioProgress = Math.min(1.0, Math.max(0.0, audioRef.current.currentTime / audioRef.current.duration));
        }
        const isSingleVerse = ayahsInRange.length === 1;
        drawAyahFrame(ctx, canvas.width, canvas.height, surah, activeAyah, config, progress, now, audioProgress, !isSingleVerse);
      } else {
        drawTitleFrame(ctx, canvas.width, canvas.height, surah, config, progress, now);
      }

      // Loop only when animating entrance transition or actively playing audio
      if (progress < 1.0 || isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [surah, activeAyah, config, ayahsInRange, isBismillahPhase, isPlaying, renderTrigger]);

  // Stop background audio and canvas loop whenever export modal is opened
  useEffect(() => {
    if (isExportModalOpen) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isExportModalOpen]);

  // Reset Bismillah state if surah or range changes
  useEffect(() => {
    setIsBismillahPhase(false);
    setCurrentVerseIdx(0);
    setIsPlaying(false);
  }, [surah?.number, config.startAyah, config.endAyah]);

  // Audio Playback Handler
  useEffect(() => {
    if (!isPlaying || !surah) return;

    let isSubscribed = true;

    // Phase 1: Recite Bismillah first if Bismillah screen is active
    if (isBismillahPhase) {
      const qariFolder = config.audioMode === 'translation-only' ? 'Alafasy_128kbps' : config.reciterFolder;
      const bismillahUrl = getAudioUrl(qariFolder, 1, 1);
      const audio = new Audio(bismillahUrl);
      audioRef.current = audio;
      audio.muted = isMuted;

      audio.play().catch((err) => {
        console.warn('Bismillah playback interrupted:', err);
        if (isSubscribed) {
          setIsBismillahPhase(false);
        }
      });

      audio.onended = () => {
        if (isSubscribed) {
          setIsBismillahPhase(false);
        }
      };

      return () => {
        isSubscribed = false;
        audio.pause();
        audio.src = '';
      };
    }

    if (!activeAyah) return;

    let currentPhase: 'arabic' | 'translation' = config.audioMode === 'translation-only' ? 'translation' : 'arabic';

    const playPhaseAudio = (phase: 'arabic' | 'translation') => {
      if (!isSubscribed) return;

      const folder = phase === 'arabic' ? config.reciterFolder : config.translationReciterFolder;

      if (folder.startsWith('tts')) {
        const spoken = getSpokenTranslationTextAndLang(activeAyah, folder, config.translationLang);
        const targetSpeed = config.deliverySpeed || config.translationSpeechRate || 1.0;
        const profile = config.voiceProfile || spoken.voiceProfile;
        const translationText = spoken.text;

        if (translationText) {
          fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: translationText,
              lang: spoken.lang,
              voiceProfile: profile
            })
          }).then((res) => {
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res.blob();
          }).then((blob) => {
            if (!isSubscribed) return;
            const ttsUrl = URL.createObjectURL(blob);
            const audio = new Audio(ttsUrl);
            audio.playbackRate = targetSpeed;
            audioRef.current = audio;
            audio.muted = isMuted;
            audio.play().catch(() => {});
            audio.onended = () => {
              URL.revokeObjectURL(ttsUrl);
              if (!isSubscribed) return;
              if (config.audioMode === 'both' && phase === 'arabic') {
                playPhaseAudio('translation');
              } else {
                if (currentVerseIdx < ayahsInRange.length - 1) {
                  setCurrentVerseIdx((prev) => prev + 1);
                } else {
                  setIsPlaying(false);
                  setCurrentVerseIdx(0);
                }
              }
            };
          }).catch((err) => {
            console.error('AI TTS Voice error:', err);
            if (!isSubscribed) return;
            setAudioError('Could not play AI spoken translation stream.');
            setIsPlaying(false);
          });
          return;
        }
      }

      const audioUrl = getAudioUrl(folder, surah.number, activeAyah.num);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.muted = isMuted;

      // Preload next verse audio for gapless transition
      if (currentVerseIdx < ayahsInRange.length - 1) {
        const nextAyah = ayahsInRange[currentVerseIdx + 1];
        const nextFolder = config.audioMode === 'translation-only' ? config.translationReciterFolder : config.reciterFolder;
        const nextAudioUrl = getAudioUrl(nextFolder, surah.number, nextAyah.num);
        const preloadAudio = new Audio();
        preloadAudio.src = nextAudioUrl;
        preloadAudio.load();
      }

      audio.onerror = async () => {
        if (!isSubscribed) return;
        if (phase === 'translation') {
          const spoken = getSpokenTranslationTextAndLang(activeAyah, folder, config.translationLang);
          const translationText = spoken.text;
          const profile = config.voiceProfile || spoken.voiceProfile;
          if (translationText) {
            try {
              const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: translationText,
                  lang: spoken.lang,
                  voiceProfile: profile
                })
              });
              if (res.ok) {
                const blob = await res.blob();
                const ttsUrl = URL.createObjectURL(blob);
                const ttsAudio = new Audio(ttsUrl);
                audioRef.current = ttsAudio;
                ttsAudio.muted = isMuted;
                ttsAudio.play().catch(() => {});
                ttsAudio.onended = () => {
                  URL.revokeObjectURL(ttsUrl);
                  if (!isSubscribed) return;
                  if (currentVerseIdx < ayahsInRange.length - 1) {
                    setCurrentVerseIdx((prev) => prev + 1);
                  } else {
                    setIsPlaying(false);
                    setCurrentVerseIdx(0);
                  }
                };
                return;
              }
            } catch (err) {
              console.error('Translation TTS fallback failed:', err);
            }
          }
        }
        setAudioError(`Could not play ${phase} audio stream.`);
        setIsPlaying(false);
      };

      audio.play().catch((err) => {
        console.warn('Playback interrupted:', err);
        if (isSubscribed && phase !== 'translation') {
          setAudioError(`Could not play ${phase} audio stream. Check network connection.`);
          setIsPlaying(false);
        }
      });

      audio.onended = () => {
        if (!isSubscribed) return;

        // Check if we need to play translation next in 'both' mode
        if (config.audioMode === 'both' && phase === 'arabic') {
          playPhaseAudio('translation');
        } else {
          // Move to next verse
          if (currentVerseIdx < ayahsInRange.length - 1) {
            setCurrentVerseIdx((prev) => prev + 1);
          } else {
            setIsPlaying(false);
            setCurrentVerseIdx(0);
          }
        }
      };
    };

    playPhaseAudio(currentPhase);

    return () => {
      isSubscribed = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [
    isPlaying,
    isBismillahPhase,
    currentVerseIdx,
    activeAyah,
    surah,
    config.reciterFolder,
    config.translationReciterFolder,
    config.audioMode,
    isMuted,
    ayahsInRange
  ]);

  const togglePlay = () => {
    setAudioError(null);
    if (!isPlaying) {
      // Check if starting from beginning of Surah (Ayah 1) and surah has Bismillah (skip if 1 verse)
      const isSingleVerse = ayahsInRange.length === 1;
      if (!isSingleVerse && currentVerseIdx === 0 && (config.startAyah || 1) === 1 && surah && surah.number !== 1 && surah.number !== 9) {
        setIsBismillahPhase(true);
      } else {
        setIsBismillahPhase(false);
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setIsBismillahPhase(false);
    }
  };

  const handleNext = () => {
    setIsBismillahPhase(false);
    if (currentVerseIdx < ayahsInRange.length - 1) {
      setCurrentVerseIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setIsBismillahPhase(false);
    if (currentVerseIdx > 0) {
      setCurrentVerseIdx((prev) => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (canvasRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        canvasRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="bg-[#0e1626] rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
            Live Studio Canvas Preview
          </h2>
          <p className="text-xs text-slate-400">
            {surah ? `Surah ${surah.englishName} (${surah.name})` : 'Loading Surah...'} • {config.aspectRatio} • {config.videoStyle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenBatchExportModal && (
            <button
              onClick={onOpenBatchExportModal}
              disabled={!surah || isLoadingSurah}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              title="Render multiple verses as individual clips or segmented files"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Batch Export</span>
            </button>
          )}

          <button
            onClick={onOpenExportModal}
            disabled={!surah || isLoadingSurah}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate Video</span>
          </button>
        </div>
      </div>

      {/* Quick Text Size & Typography Bar */}
      {onChangeConfig && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#121c30]/90 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Text Size:</span>
            <div className="flex items-center gap-1 bg-[#090e18] p-0.5 rounded-lg border border-slate-800">
              {[
                { id: 'normal', label: '1X' },
                { id: 'large', label: '1.5X' },
                { id: 'extra-large', label: '2X' },
                { id: 'huge', label: '3X' }
              ].map((s) => {
                const active = (config.textSize || 'large') === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChangeConfig({ textSize: s.id as TextSize })}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      active
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {config.videoStyle === 'quran-page' && (
            <div className="flex items-center gap-1.5 text-amber-300/90 font-semibold text-[11px] bg-[#090e18] px-2.5 py-1 rounded-lg border border-slate-800">
              <span>📖 {config.mushafAyatPerPage || 10} Ayat Per Page</span>
            </div>
          )}
        </div>
      )}

      {/* Canvas Viewport */}
      <div className="relative bg-[#070b13] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-2 min-h-[360px] md:min-h-[440px]">
        {isLoadingSurah ? (
          <div className="flex flex-col items-center gap-3 text-amber-400 py-12">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-sm font-semibold text-slate-300">Fetching Surah Arabic &amp; Translation Data...</span>
          </div>
        ) : surahLoadError ? (
          <div className="flex flex-col items-center gap-3 text-rose-400 py-12 px-4 text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <div className="text-sm font-semibold text-slate-200">{surahLoadError}</div>
            {onRetryLoadSurah && (
              <button
                type="button"
                onClick={onRetryLoadSurah}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading Surah
              </button>
            )}
          </div>
        ) : (
          <div className="relative max-w-full max-h-[500px] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className={`rounded-lg shadow-2xl object-contain max-h-[480px] ${
                config.aspectRatio === '9:16' ? 'aspect-[9/16] w-auto' : 'aspect-[16/9] w-full'
              }`}
            />
          </div>
        )}

        {/* Audio Error Alert */}
        {audioError && (
          <div className="absolute top-4 left-4 right-4 bg-rose-500/90 text-white p-3 rounded-lg text-xs flex items-center gap-2 shadow-lg z-20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{audioError}</span>
          </div>
        )}
      </div>

      {/* Playback Controls & Timeline Scrubber */}
      {surah && ayahsInRange.length > 0 && (
        <div className="bg-[#121c30] rounded-xl p-3.5 border border-slate-800 space-y-3">
          {/* Timeline Ayah Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {ayahsInRange.map((a, idx) => (
              <button
                key={a.num}
                onClick={() => setCurrentVerseIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  idx === currentVerseIdx
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Verse {a.num}
              </button>
            ))}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentVerseIdx === 0}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                title="Previous Verse"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20"
                title={isPlaying ? 'Pause Recitation' : 'Play Recitation'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <button
                onClick={handleNext}
                disabled={currentVerseIdx === ayahsInRange.length - 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                title="Next Verse"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <span className="text-xs text-slate-300 font-medium ml-2">
                Verse {activeAyah?.num || config.startAyah} of {surah.numberOfAyahs}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Fullscreen Studio"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
