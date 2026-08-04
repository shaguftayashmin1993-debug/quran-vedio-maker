import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { Surah, Ayah, VideoConfig, TranslationLang } from '../types';
import { getAudioUrl } from '../data/reciters';
import { drawAyahFrame, drawTitleFrame, drawBismillahFrame } from '../utils/canvasRenderer';
import { getAyahTranslationText } from '../utils/translationUtils';

interface LiveStudioPreviewProps {
  surah: Surah | null;
  config: VideoConfig;
  isLoadingSurah: boolean;
  onOpenExportModal: () => void;
  isExportModalOpen?: boolean;
}

export const LiveStudioPreview: React.FC<LiveStudioPreviewProps> = ({
  surah,
  config,
  isLoadingSurah,
  onOpenExportModal,
  isExportModalOpen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentVerseIdx, setCurrentVerseIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBismillahPhase, setIsBismillahPhase] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Filter ayahs based on start & end ayah range
  const ayahsInRange = React.useMemo(() => {
    if (!surah || !surah.ayahs) return [];
    return surah.ayahs.filter(
      (a) => a.num >= config.startAyah && a.num <= config.endAyah
    );
  }, [surah, config.startAyah, config.endAyah]);

  const activeAyah: Ayah | null = ayahsInRange[currentVerseIdx] || ayahsInRange[0] || null;

  // Render canvas with smooth text animation & image background updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !surah || ayahsInRange.length === 0) return;

    const isPortrait = config.aspectRatio === '9:16';
    canvas.width = isPortrait ? 1080 : 1920;
    canvas.height = isPortrait ? 1920 : 1080;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime: number | null = null;
    const animDuration = 450; // 450ms smooth verse entrance animation

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
        drawAyahFrame(ctx, canvas.width, canvas.height, surah, activeAyah, config, progress, now, audioProgress);
      } else {
        drawTitleFrame(ctx, canvas.width, canvas.height, surah, config, progress, now);
      }

      // Keep animation loop running if entering, playing, glowing, or image background is loading
      if (progress < 1.0 || isPlaying || config.textAnimation === 'glow-pulse' || (config.bgImageCategory && config.bgImageCategory !== 'none')) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [surah, activeAyah, config, ayahsInRange, isBismillahPhase, isPlaying]);

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
        const lang = config.translationLang || (folder.startsWith('tts-') ? folder.replace('tts-', '') : 'ur') as TranslationLang;
        const translationText = getAyahTranslationText(activeAyah, lang);
        if (translationText) {
          fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: translationText, lang })
          }).then((res) => {
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res.blob();
          }).then((blob) => {
            if (!isSubscribed) return;
            const ttsUrl = URL.createObjectURL(blob);
            const audio = new Audio(ttsUrl);
            audio.playbackRate = config.translationSpeechRate || 1.0;
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
          const translationText = getAyahTranslationText(activeAyah, config.translationLang);
          if (translationText) {
            try {
              const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: translationText, lang: config.translationLang || 'en' })
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
      // Check if starting from beginning and surah has Bismillah
      if (currentVerseIdx === 0 && surah && surah.number !== 1 && surah.number !== 9) {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
            Live Studio Canvas Preview
          </h2>
          <p className="text-xs text-slate-400">
            {surah ? `Surah ${surah.englishName} (${surah.name})` : 'Loading Surah...'} • {config.aspectRatio} • {config.videoStyle}
          </p>
        </div>

        <button
          onClick={onOpenExportModal}
          disabled={!surah || isLoadingSurah}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Generate &amp; Export Video</span>
        </button>
      </div>

      {/* Canvas Viewport */}
      <div className="relative bg-[#070b13] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-2 min-h-[360px] md:min-h-[440px]">
        {isLoadingSurah ? (
          <div className="flex flex-col items-center gap-3 text-amber-400 py-12">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-sm font-semibold text-slate-300">Fetching Surah Arabic &amp; Translation Data...</span>
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
