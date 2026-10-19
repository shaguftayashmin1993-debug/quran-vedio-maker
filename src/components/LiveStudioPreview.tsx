import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Download, RefreshCw, AlertCircle, Layers, Gauge, RotateCcw, Upload, Image as ImageIcon, Mic, Film } from 'lucide-react';
import { Surah, Ayah, VideoConfig, TranslationLang, TextSize } from '../types';
import { getAudioUrl } from '../data/reciters';
import { drawAyahFrame, drawTitleFrame, drawBismillahFrame, subscribeBackgroundImageLoad, ensureBackgroundImageLoaded, setCustomBackgroundImageUrl, setCustomBackgroundVideoUrl, getOrCreateVideoElement } from '../utils/canvasRenderer';
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
  onOpenGuide?: () => void;
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
  onChangeConfig,
  onOpenGuide
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentVerseIdx, setCurrentVerseIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBismillahPhase, setIsBismillahPhase] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [renderTrigger, setRenderTrigger] = useState<number>(0);
  const [showSpeedPopover, setShowSpeedPopover] = useState<boolean>(false);
  const activePhaseRef = useRef<'arabic' | 'translation'>('arabic');

  // Handle speed update with instant real-time audio playbackRate change
  const handleUpdateSpeed = (newSpeed: number) => {
    if (audioRef.current) {
      try {
        audioRef.current.playbackRate = newSpeed;
      } catch (e) {}
    }
    if (onChangeConfig) {
      onChangeConfig({
        recitationSpeed: newSpeed,
        deliverySpeed: newSpeed,
        translationSpeechRate: newSpeed
      });
    }
  };

  // Re-sync playbackRate in real time if config speed changes externally
  useEffect(() => {
    if (audioRef.current) {
      const spd = activePhaseRef.current === 'arabic'
        ? (config.recitationSpeed || (config.audioMode === 'recitation' ? (config.deliverySpeed || 1.0) : 1.0))
        : (config.deliverySpeed || config.translationSpeechRate || 1.0);
      try {
        audioRef.current.playbackRate = spd;
      } catch (e) {}
    }
  }, [config.recitationSpeed, config.deliverySpeed, config.translationSpeechRate]);

  // Re-draw when background image finishes loading in background
  useEffect(() => {
    const unsub = subscribeBackgroundImageLoad(() => {
      setRenderTrigger((prev) => prev + 1);
    });
    ensureBackgroundImageLoaded(config.bgImageCategory, config.customBgImageUrl).then(() => {
      setRenderTrigger((prev) => prev + 1);
    });
    return unsub;
  }, [config.bgImageCategory, config.customBgImageUrl]);

  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleQuickBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files) as File[];
    const imgFiles = fileList.filter((f) => f.type.startsWith('image/'));
    if (imgFiles.length === 0) return;

    const readPromises = imgFiles.map((file, idx) => {
      return new Promise<{ id: string; url: string; name: string } | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (!dataUrl) return resolve(null);
          resolve({
            id: `custom-bg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            url: dataUrl,
            name: file.name
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(readPromises);
    const validItems = results.filter((item): item is { id: string; url: string; name: string } => item !== null);
    if (validItems.length === 0) return;

    for (const item of validItems) {
      ensureBackgroundImageLoaded('custom-upload', item.url);
    }
    const primary = validItems[0];
    setCustomBackgroundImageUrl(primary.url);

    const existingList = config.customBgImages || [];
    const existingFiltered = existingList.filter((img) => !validItems.some((v) => v.url === img.url));
    const updatedImages = [...validItems, ...existingFiltered].slice(0, 30);

    if (onChangeConfig) {
      onChangeConfig({
        bgImageCategory: 'custom-upload',
        bgType: 'image',
        customBgImageUrl: primary.url,
        customBgImageName: primary.name,
        customBgImages: updatedImages
      });
    }
    if (e.target) e.target.value = '';
  };

  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleQuickVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files) as File[];
    const vidFiles = fileList.filter(
      (f) => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|mov|m4v|ogg)$/i)
    );
    if (vidFiles.length === 0) return;

    const newVidItems: { id: string; url: string; name: string; duration: number; width?: number; height?: number }[] = [];

    for (let i = 0; i < vidFiles.length; i++) {
      const file = vidFiles[i];
      const videoUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = videoUrl;

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        tempVideo.onloadedmetadata = finish;
        tempVideo.onerror = finish;
        setTimeout(finish, 3500);
      });

      getOrCreateVideoElement(videoUrl);

      newVidItems.push({
        id: `custom-vid-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        url: videoUrl,
        name: file.name,
        duration: Math.round(tempVideo.duration || 0),
        width: tempVideo.videoWidth || 1920,
        height: tempVideo.videoHeight || 1080
      });
    }

    if (newVidItems.length === 0) return;

    const primary = newVidItems[0];
    setCustomBackgroundVideoUrl(primary.url);

    const existingList = config.customBgVideos || [];
    const existingFiltered = existingList.filter((v) => !newVidItems.some((n) => n.name === v.name));
    const updatedVideos = [...newVidItems, ...existingFiltered].slice(0, 20);

    if (onChangeConfig) {
      onChangeConfig({
        bgImageCategory: 'custom-video',
        bgType: 'video',
        customBgVideoUrl: primary.url,
        customBgVideoName: primary.name,
        customBgVideoDuration: primary.duration,
        customBgVideos: updatedVideos,
        bgVideoLoop: true,
        bgVideoMuted: true
      });
    }
    if (e.target) e.target.value = '';
  };

  // Sync custom background video url with canvas renderer
  useEffect(() => {
    if (config.customBgVideoUrl) {
      setCustomBackgroundVideoUrl(config.customBgVideoUrl);
    }
  }, [config.customBgVideoUrl]);

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

      const isVideoBg = config.bgImageCategory === 'custom-video' || config.bgType === 'video' || !!config.customBgVideoUrl;
      // Loop when animating entrance transition, actively playing audio, or rendering animated video background
      if (progress < 1.0 || isPlaying || isVideoBg) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [surah, activeAyah, config, ayahsInRange, isBismillahPhase, isPlaying, renderTrigger, config.customBgVideoUrl, config.bgImageCategory]);

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
      activePhaseRef.current = phase;

      const folder = phase === 'arabic' ? config.reciterFolder : config.translationReciterFolder;
      const targetSpeed = phase === 'arabic'
        ? (config.recitationSpeed || (config.audioMode === 'recitation' ? (config.deliverySpeed || 1.0) : 1.0))
        : (config.deliverySpeed || config.translationSpeechRate || 1.0);

      if (folder.startsWith('tts')) {
        const spoken = getSpokenTranslationTextAndLang(activeAyah, folder, config.translationLang);
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

      // Determine audio URL: prioritize custom own voice audio if selected
      let audioUrl = '';
      if (phase === 'arabic') {
        const customUrl = config.customRecitationAudios?.[activeAyah.num] || config.customRecitationUrl;
        if (config.reciterFolder === 'custom-own-voice') {
          if (customUrl) {
            audioUrl = customUrl;
          } else {
            setAudioError(`Ayah ${activeAyah.num} Own Voice has not been recorded yet. Click "Own Voice" in studio to record.`);
            setIsPlaying(false);
            return;
          }
        } else {
          audioUrl = getAudioUrl(folder, surah.number, activeAyah.num);
        }
      } else {
        const customTransUrl = config.customTranslationAudios?.[activeAyah.num] || config.customTranslationUrl;
        if (config.translationReciterFolder === 'custom-own-voice-translation') {
          if (customTransUrl) {
            audioUrl = customTransUrl;
          } else {
            setAudioError(`Ayah ${activeAyah.num} Own Voice Translation has not been recorded yet. Click "Own Voice" in studio to record.`);
            setIsPlaying(false);
            return;
          }
        } else {
          audioUrl = getAudioUrl(folder, surah.number, activeAyah.num);
        }
      }

      const audio = new Audio(audioUrl);
      audio.playbackRate = targetSpeed;
      audioRef.current = audio;
      audio.muted = isMuted;

      // Preload next verse audio for gapless transition
      if (currentVerseIdx < ayahsInRange.length - 1) {
        const nextAyah = ayahsInRange[currentVerseIdx + 1];
        const nextFolder = config.audioMode === 'translation-only' ? config.translationReciterFolder : config.reciterFolder;
        let nextAudioUrl = '';
        if (config.audioMode === 'translation-only') {
          nextAudioUrl = (config.translationReciterFolder === 'custom-own-voice-translation' && config.customTranslationAudios?.[nextAyah.num])
            ? config.customTranslationAudios[nextAyah.num]
            : getAudioUrl(nextFolder, surah.number, nextAyah.num);
        } else {
          nextAudioUrl = (config.reciterFolder === 'custom-own-voice' && config.customRecitationAudios?.[nextAyah.num])
            ? config.customRecitationAudios[nextAyah.num]
            : getAudioUrl(nextFolder, surah.number, nextAyah.num);
        }
        if (nextAudioUrl) {
          const preloadAudio = new Audio();
          preloadAudio.src = nextAudioUrl;
          preloadAudio.load();
        }
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
                ttsAudio.playbackRate = targetSpeed;
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
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Watch interactive guide video and tutorial walkthrough"
            >
              <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Guide Video</span>
            </button>
          )}

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
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-[#121c30]/90 rounded-xl border border-slate-800 text-xs">
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

          {/* Quick Speed Controls */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" /> Speed:
            </span>
            <div className="flex items-center gap-1 bg-[#090e18] p-0.5 rounded-lg border border-slate-800">
              {[
                { val: 0.75, label: '0.75x' },
                { val: 0.85, label: '0.85x' },
                { val: 1.0, label: '1.0x' },
                { val: 1.15, label: '1.15x' },
                { val: 1.25, label: '1.25x' },
                { val: 1.5, label: '1.5x' },
                { val: 2.0, label: '2.0x' }
              ].map((s) => {
                const cur = config.recitationSpeed || config.deliverySpeed || 1.0;
                const active = Math.abs(cur - s.val) < 0.03;
                return (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => handleUpdateSpeed(s.val)}
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

          {/* Quick Custom Background Image Upload */}
          <div className="flex items-center gap-2">
            <input
              ref={bgFileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleQuickBgUpload}
            />
            {config.bgImageCategory === 'custom-upload' && config.customBgImageUrl ? (
              <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[130px]">
                  {config.customBgImages && config.customBgImages.length > 1
                    ? `📸 ${config.customBgImages.length} Photos`
                    : (config.customBgImageName || 'Custom Photo')}
                </span>
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  className="hover:text-white underline ml-1 text-[10px] cursor-pointer"
                  title="Upload more background images"
                >
                  + Add / Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bgFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090e18] hover:bg-[#16233d] text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-[11px] font-semibold transition-all cursor-pointer"
                title="Upload and set your own background photo(s) (JPG, PNG, WEBP)"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Photos</span>
              </button>
            )}
          </div>

          {/* Quick Custom Video Upload */}
          <div className="flex items-center gap-2">
            <input
              ref={videoFileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
              className="hidden"
              onChange={handleQuickVideoUpload}
            />
            {config.bgImageCategory === 'custom-video' && config.customBgVideoUrl ? (
              <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[130px]">
                  {config.customBgVideos && config.customBgVideos.length > 1
                    ? `🎬 ${config.customBgVideos.length} Videos`
                    : (config.customBgVideoName || 'Custom Video')}
                </span>
                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  className="hover:text-white underline ml-1 text-[10px] cursor-pointer"
                  title="Upload more background videos"
                >
                  + Add / Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090e18] hover:bg-[#16233d] text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-[11px] font-semibold transition-all cursor-pointer"
                title="Upload your own background video(s) (MP4, WebM, MOV)"
              >
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Videos</span>
              </button>
            )}
          </div>

          {/* Own Voice Active Status */}
          {(config.reciterFolder === 'custom-own-voice' || config.translationReciterFolder === 'custom-own-voice-translation') && (
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Own Voice Active</span>
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
              {/* Playback & Voice Speed Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSpeedPopover(!showSpeedPopover)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    showSpeedPopover
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30 hover:border-amber-400'
                  }`}
                  title="Audio Playback & Recitation Speed Options"
                >
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>{(config.recitationSpeed || config.deliverySpeed || 1.0).toFixed(2).replace(/\.00$/, '')}x</span>
                </button>

                {showSpeedPopover && (
                  <div className="absolute bottom-11 right-0 w-72 bg-[#0c1424] border border-amber-500/50 rounded-xl p-3.5 shadow-2xl z-30 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-400" /> Playback &amp; Voice Speed
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateSpeed(1.0)}
                        className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                        title="Reset to 1.0x Normal Speed"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset 1.0x
                      </button>
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { val: 0.5, label: '0.5x Slow' },
                        { val: 0.75, label: '0.75x Tartil' },
                        { val: 0.85, label: '0.85x Calm' },
                        { val: 1.0, label: '1.0x Normal' },
                        { val: 1.15, label: '1.15x Brisk' },
                        { val: 1.25, label: '1.25x Fast' },
                        { val: 1.5, label: '1.5x Rapid' },
                        { val: 1.75, label: '1.75x Quick' },
                        { val: 2.0, label: '2.0x Double' }
                      ].map((s) => {
                        const cur = config.recitationSpeed || config.deliverySpeed || 1.0;
                        const active = Math.abs(cur - s.val) < 0.03;
                        return (
                          <button
                            key={s.val}
                            type="button"
                            onClick={() => {
                              handleUpdateSpeed(s.val);
                              setShowSpeedPopover(false);
                            }}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all text-center ${
                              active
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Fine Slider */}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Fine Slider:</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {(config.recitationSpeed || config.deliverySpeed || 1.0).toFixed(2)}x
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">0.5x</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={config.recitationSpeed || config.deliverySpeed || 1.0}
                          onChange={(e) => handleUpdateSpeed(parseFloat(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">2.5x</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
