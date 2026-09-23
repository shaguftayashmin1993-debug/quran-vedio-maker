import React, { useState, useRef, useEffect } from 'react';
import { X, Film, CheckCircle2, Download, FileText, Loader2, Play, Minimize2, Maximize2, Music, Home, FileVideo, Sparkles, Compass, ChevronRight, Square, Clock, ShieldCheck, ArrowLeft, LogOut } from 'lucide-react';
import { Surah, VideoConfig, SavedVideo, Ayah } from '../types';
import { drawAyahFrame, drawBismillahFrame, drawTitleFrame, preloadAllBackgroundImages, ensureBackgroundImageLoaded } from '../utils/canvasRenderer';
import { generateSrtSubtitles, generateVttSubtitles, downloadTextFile, SubtitleCue } from '../utils/subtitleGenerator';
import { fetchAudioBuffer, stripBismillahFromAyah1, audioBuffersToCombinedBlob, concatenateAudioBuffersWithOffsets, createSilentBuffer } from '../utils/audioUtils';
import { getAyahTranslationText, getSpokenTranslationTextAndLang } from '../utils/translationUtils';
import { SocialUploadHub } from './SocialUploadHub';
import { triggerSafeDownload } from '../utils/downloadUtils';
import { saveVideoBlobToDB } from '../utils/videoStorage';
import { transcodeToUniversalMp4 } from '../utils/universalMp4Transcoder';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  surah: Surah;
  config: VideoConfig;
  onSaveToLibrary: (video: SavedVideo) => void;
  onNavigateToHome?: () => void;
  onNavigateToLibrary?: () => void;
  onCreateNewVideo?: () => void;
  onOpenBatchExport?: () => void;
}

// Helper for concurrent pool mapping to avoid network connection exhaustion
async function mapConcurrent<T, R>(
  items: T[],
  concurrencyLimit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrencyLimit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const VideoExporterModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  surah,
  config,
  onSaveToLibrary,
  onNavigateToHome,
  onNavigateToLibrary,
  onCreateNewVideo,
  onOpenBatchExport
}) => {
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const renderIntervalRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);
  const isCancelledRef = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStepText, setCurrentStepText] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [estimatedTotalSec, setEstimatedTotalSec] = useState<number>(0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number>(0);
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [generatedVideoSize, setGeneratedVideoSize] = useState<string>('0 MB');
  const [generatedCues, setGeneratedCues] = useState<SubtitleCue[]>([]);

  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
  const [generatedSdUrl, setGeneratedSdUrl] = useState<string | null>(null);
  const [generatedHdUrl, setGeneratedHdUrl] = useState<string | null>(null);

  const [exportQuality, setExportQuality] = useState<'fast' | 'hd'>('fast');

  // Clean up on unmount or cancellation
  const cleanupExport = async () => {
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        await audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }

    // Ensure all background media elements are paused
    try {
      document.querySelectorAll('audio, video').forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
        } catch (e) {}
      });
    } catch (e) {}
  };

  // Pause all background sounds immediately when export modal is open
  useEffect(() => {
    if (isOpen) {
      try {
        document.querySelectorAll('audio, video').forEach((el) => {
          try {
            (el as HTMLMediaElement).pause();
          } catch (e) {}
        });
      } catch (e) {}
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (exportComplete || !isExporting) {
          if (exportComplete && onNavigateToHome) {
            onNavigateToHome();
          } else {
            onClose();
          }
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, exportComplete, isExporting, onClose, onNavigateToHome]);

  useEffect(() => {
    return () => {
      cleanupExport();
    };
  }, []);

  const handleCancelExport = async () => {
    isCancelledRef.current = true;
    await cleanupExport();
    setIsExporting(false);
    setProgressPercent(0);
    setCurrentStepText('Video generation cancelled by user.');
    setExportError('Export cancelled.');
  };

  if (!isOpen) return null;

  let ayahsInRange = surah.ayahs && surah.ayahs.length > 0
    ? surah.ayahs.filter((a) => a.num >= config.startAyah && a.num <= config.endAyah)
    : [];

  // Auto-clamp if verse bounds exceed Surah verse count (e.g. switching from a long Surah to Surah Ad-Duha)
  if (ayahsInRange.length === 0 && surah.ayahs && surah.ayahs.length > 0) {
    const totalAyahsCount = surah.numberOfAyahs || surah.ayahs.length;
    const clampedStart = Math.min(Math.max(1, config.startAyah), totalAyahsCount);
    let clampedEnd = Math.min(Math.max(clampedStart, config.endAyah), totalAyahsCount);
    if (clampedStart > clampedEnd) {
      clampedEnd = totalAyahsCount;
    }
    ayahsInRange = surah.ayahs.filter((a) => a.num >= clampedStart && a.num <= clampedEnd);
    if (ayahsInRange.length === 0) {
      ayahsInRange = surah.ayahs;
    }
  }

  const handleStartExport = async () => {
    isCancelledRef.current = false;
    setIsExporting(true);
    setProgressPercent(0);
    setElapsedSec(0);
    setEstimatedTotalSec(0);
    setExportComplete(false);
    setExportError(null);
    setCurrentStepText('Pre-loading background assets & initializing audio engine...');

    // Immediately stop and pause any audio/video elements playing anywhere in the app
    try {
      document.querySelectorAll('audio, video').forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
        } catch (e) {}
      });
    } catch (e) {}

    try {
      // 1. Acquire Screen Wake Lock if available so long render doesn't sleep
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (e) {
          console.log('Screen WakeLock request bypassed', e);
        }
      }

      // Pre-warm and ensure all background images are cached
      preloadAllBackgroundImages();

      const canvas = exportCanvasRef.current || document.createElement('canvas');
      const isPortrait = config.aspectRatio === '9:16';
      const isFast = exportQuality === 'fast';
      const isHd = exportQuality === 'hd';

      canvas.width = isFast
        ? (isPortrait ? 720 : 1280)
        : (isPortrait ? 1080 : 1920);

      canvas.height = isFast
        ? (isPortrait ? 1280 : 720)
        : (isPortrait ? 1920 : 1080);

      const ctx = (canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
      }) || canvas.getContext('2d')) as CanvasRenderingContext2D | null;

      if (!ctx) {
        throw new Error('Could not initialize 2D canvas context on this browser.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Ensure 4K Holy Scenery is completely loaded into memory before first frame capture
      await ensureBackgroundImageLoaded(config.bgImageCategory);

      // Pre-draw initial frame so captureStream gets valid content immediately
      const isSingleVerse = ayahsInRange.length === 1;
      if (isSingleVerse) {
        drawAyahFrame(ctx, canvas.width, canvas.height, surah, ayahsInRange[0], config, 1.0, Date.now(), 0, false);
      } else {
        drawTitleFrame(ctx, canvas.width, canvas.height, surah, config, 1.0, Date.now());
      }

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error('Web Audio API is not supported on this browser.');
      }
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const destNode = audioCtx.createMediaStreamDestination();

      const totalAyahs = ayahsInRange.length;
      if (totalAyahs === 0) {
        throw new Error('No verses selected in range.');
      }

      setCurrentStepText(`Fetching audio streams in parallel for ${totalAyahs} ${totalAyahs === 1 ? 'verse' : 'verses'}...`);
      setProgressPercent(8);

      // 1. Parallel fetch Bismillah buffer if needed (only on Surah start / Ayah 1, skipped if 1 verse)
      const isSurahStart = (config.startAyah || 1) === 1;
      const needsBismillah = !isSingleVerse && isSurahStart && surah.number !== 1 && surah.number !== 9;
      const bismillahPromise = needsBismillah
        ? fetchAudioBuffer(
            audioCtx,
            config.audioMode === 'translation-only' ? 'Alafasy_128kbps' : config.reciterFolder,
            1,
            1,
            config.gaplessAudio,
            'Bismillah ir-Rahman ir-Rahim',
            'ar'
          )
        : Promise.resolve(null);

      // 2. Fetch verse audio buffers with concurrency pool of 4 and inter-request pacing
      let completedDownloads = 0;
      const [bismillahBuffer, verseAudioResults] = await Promise.all([
        bismillahPromise,
        mapConcurrent<Ayah, { num: number; ayah: Ayah; aBuf: AudioBuffer | null; tBuf: AudioBuffer | null }>(
          ayahsInRange,
          4,
          async (ayah: Ayah, idx: number) => {
            if (isCancelledRef.current) throw new Error('Export cancelled by user');

            // Gentle network pacing to ensure stability over hundreds of verses
            if (idx > 0 && idx % 4 === 0) {
              await new Promise((r) => setTimeout(r, 40));
            }

            let aBuf: AudioBuffer | null = null;
            let tBuf: AudioBuffer | null = null;

            // Fetch with auto-retry
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                if (config.audioMode === 'recitation' || config.audioMode === 'both') {
                  aBuf = await fetchAudioBuffer(
                    audioCtx,
                    config.reciterFolder,
                    surah.number,
                    ayah.num,
                    config.gaplessAudio
                  );
                }

                if (config.audioMode === 'both' || config.audioMode === 'translation-only') {
                  const spoken = getSpokenTranslationTextAndLang(ayah, config.translationReciterFolder, config.translationLang);
                  const isScholarVoice = config.translationReciterFolder === 'tts-ur-scholar' || config.translationReciterFolder.includes('scholar') || config.voiceLock;
                  const speed = config.deliverySpeed || config.translationSpeechRate || 1.0;
                  const resonance120Hz = config.baritoneResonance !== undefined ? config.baritoneResonance : isScholarVoice;
                  const profile = config.voiceProfile || spoken.voiceProfile;

                  tBuf = await fetchAudioBuffer(
                    audioCtx,
                    config.translationReciterFolder,
                    surah.number,
                    ayah.num,
                    config.gaplessAudio,
                    spoken.text,
                    spoken.lang,
                    { speed, resonance120Hz, voiceProfile: profile }
                  );
                }
                break;
              } catch (e) {
                if (attempt === 2) console.warn(`Audio fetch attempt ${attempt + 1} failed for ayah ${ayah.num}`, e);
                await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
              }
            }

            completedDownloads++;
            const pct = Math.round((completedDownloads / totalAyahs) * 20) + 8;
            setProgressPercent(pct);
            setCurrentStepText(`Loading audio streams (${completedDownloads}/${totalAyahs} verses ready)...`);

            return { num: ayah.num, ayah, aBuf, tBuf };
          }
        )
      ]);

      if (isCancelledRef.current) return;

      setCurrentStepText('Building sample-accurate streaming timeline...');
      setProgressPercent(30);

      // 3. Build Timeline & Master Audio Buffer (Zero drift, 100% synchronized)
      const introSilenceSec = isFast ? 0.5 : 0.6;

      interface TimelineItem {
        type: 'title' | 'bismillah' | 'ayah';
        ayah?: Ayah;
        index?: number;
        startTime: number;
        endTime: number;
        duration: number;
        arabicDuration?: number;
      }

      const timeline: TimelineItem[] = [];
      const buffersToCombine: (AudioBuffer | null)[] = [];

      // Step A: Collect all buffers
      // 1. Title Card (omitted for 1 verse: no Surah name, starts directly on the ayah)
      const titleDuration = isSingleVerse ? 0 : introSilenceSec;
      let titleBufIdx = -1;
      if (!isSingleVerse) {
        titleBufIdx = buffersToCombine.length;
        const titleSilentBuffer = createSilentBuffer(audioCtx, titleDuration);
        buffersToCombine.push(titleSilentBuffer);
      }

      // 2. Bismillah (omitted for 1 verse)
      let bismillahBufIdx = -1;
      if (needsBismillah && bismillahBuffer) {
        bismillahBufIdx = buffersToCombine.length;
        buffersToCombine.push(bismillahBuffer);
      }

      // 3. Verses
      interface VerseBufferRef {
        ayah: Ayah;
        idx: number;
        arabicBufIdx: number;
        translationBufIdx: number;
      }
      const verseRefs: VerseBufferRef[] = [];

      verseAudioResults.forEach((res, idx) => {
        let aIdx = -1;
        let tIdx = -1;

        if (config.audioMode === 'both') {
          if (res.aBuf) {
            aIdx = buffersToCombine.length;
            buffersToCombine.push(res.aBuf);
          }
          if (res.tBuf) {
            tIdx = buffersToCombine.length;
            buffersToCombine.push(res.tBuf);
          }
        } else if (config.audioMode === 'translation-only') {
          if (res.tBuf) {
            tIdx = buffersToCombine.length;
            buffersToCombine.push(res.tBuf);
          } else if (res.aBuf) {
            aIdx = buffersToCombine.length;
            buffersToCombine.push(res.aBuf);
          }
        } else {
          // recitation only
          if (res.aBuf) {
            aIdx = buffersToCombine.length;
            buffersToCombine.push(res.aBuf);
          } else if (res.tBuf) {
            tIdx = buffersToCombine.length;
            buffersToCombine.push(res.tBuf);
          }
        }

        // If both failed, generate a graceful proportional silent placeholder
        if (aIdx === -1 && tIdx === -1) {
          const estimatedDur = Math.max(3.0, (res.ayah.arabic || '').split(' ').length * 0.85);
          const silentFallback = createSilentBuffer(audioCtx, estimatedDur);
          aIdx = buffersToCombine.length;
          buffersToCombine.push(silentFallback);
        }

        verseRefs.push({
          ayah: res.ayah,
          idx,
          arabicBufIdx: aIdx,
          translationBufIdx: tIdx
        });
      });

      // Step B: Calculate sample-accurate concatenation with zero drift
      const concatResult = concatenateAudioBuffersWithOffsets(audioCtx, buffersToCombine);
      const masterAudioBuffer = concatResult.masterBuffer;

      // Title Card (omitted for 1 verse)
      if (!isSingleVerse && titleBufIdx !== -1) {
        timeline.push({
          type: 'title',
          startTime: concatResult.startTimes[titleBufIdx] || 0,
          endTime: concatResult.endTimes[titleBufIdx] || titleDuration,
          duration: concatResult.durations[titleBufIdx] || titleDuration
        });
      }

      // Bismillah
      if (bismillahBufIdx !== -1) {
        timeline.push({
          type: 'bismillah',
          startTime: concatResult.startTimes[bismillahBufIdx],
          endTime: concatResult.endTimes[bismillahBufIdx],
          duration: concatResult.durations[bismillahBufIdx]
        });
      }

      // Verses
      const cues: SubtitleCue[] = [];

      verseRefs.forEach((vRef) => {
        let vStart = 0;
        let vEnd = 0;

        if (vRef.arabicBufIdx !== -1 && vRef.translationBufIdx !== -1) {
          vStart = concatResult.startTimes[vRef.arabicBufIdx];
          vEnd = concatResult.endTimes[vRef.translationBufIdx];
        } else if (vRef.arabicBufIdx !== -1) {
          vStart = concatResult.startTimes[vRef.arabicBufIdx];
          vEnd = concatResult.endTimes[vRef.arabicBufIdx];
        } else if (vRef.translationBufIdx !== -1) {
          vStart = concatResult.startTimes[vRef.translationBufIdx];
          vEnd = concatResult.endTimes[vRef.translationBufIdx];
        }

        const vDur = Math.max(0.1, vEnd - vStart);
        const arabicDuration = vRef.arabicBufIdx !== -1 ? (concatResult.durations[vRef.arabicBufIdx] || vDur) : vDur;

        timeline.push({
          type: 'ayah',
          ayah: vRef.ayah,
          index: vRef.idx,
          startTime: vStart,
          endTime: vEnd,
          duration: vDur,
          arabicDuration
        });

        cues.push({
          index: vRef.ayah.num,
          startTime: vStart,
          endTime: vEnd,
          arabicText: stripBismillahFromAyah1(vRef.ayah.arabic, surah.number, vRef.ayah.num),
          translationText: getAyahTranslationText(vRef.ayah, config.translationLang)
        });
      });

      const totalDuration = masterAudioBuffer.duration;
      setEstimatedTotalSec(Math.round(totalDuration));

      const combinedAudioBlob = audioBuffersToCombinedBlob([masterAudioBuffer], audioCtx.sampleRate || 44100);
      const audioBlobUrl = URL.createObjectURL(combinedAudioBlob);
      setGeneratedAudioBlob(combinedAudioBlob);
      setGeneratedAudioUrl(audioBlobUrl);
      setGeneratedCues(cues);

      // 4. Setup MediaRecorder
      const stream = (canvas as any).captureStream ? canvas.captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : null;
      if (!stream) {
        throw new Error('Canvas video capture stream is not supported in this browser environment.');
      }

      const combinedTracks = [
        ...stream.getVideoTracks(),
        ...destNode.stream.getAudioTracks()
      ];
      const mediaStream = new MediaStream(combinedTracks);

      let mediaRecorder: MediaRecorder;
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')
          ? 'video/mp4;codecs=avc1.42E01E,mp4a.40.2'
          : MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

        mediaRecorder = new MediaRecorder(mediaStream, {
          mimeType,
          videoBitsPerSecond: isFast ? 3500000 : isHd ? 8000000 : 18000000
        });
      } catch {
        mediaRecorder = new MediaRecorder(mediaStream);
      }
      mediaRecorderRef.current = mediaRecorder;

      const recordedChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.start(100);

      // Request Screen Wake Lock during export to prevent device sleeping
      let wakeLock: any = null;
      try {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {
        // Non-blocking if wakeLock is unsupported
      }

      // 5. Start single master AudioBufferSourceNode on the Web Audio timeline!
      // This is 100% glitch-proof, zero-drift, and completely eliminates node limits or browser GC drops over long surahs.
      const startAudioTime = audioCtx.currentTime + 0.05;
      const masterSource = audioCtx.createBufferSource();
      masterSource.buffer = masterAudioBuffer;
      masterSource.connect(destNode);
      masterSource.start(startAudioTime);
      activeSourcesRef.current = [masterSource];

      // Audio-thread periodic ticker to guarantee frame updates even if browser tabs are backgrounded
      let tickerNode: ScriptProcessorNode | null = null;
      try {
        tickerNode = audioCtx.createScriptProcessor(4096, 1, 1);
        tickerNode.connect(audioCtx.destination);
      } catch (e) {
        tickerNode = null;
      }

      setCurrentStepText('Rendering video stream in one go...');

      // 6. High-Performance Timeline Render Loop with O(1) Timeline Tracking & Multi-driver clock
      let activeTimelineIdx = 0;

      await new Promise<void>((resolve, reject) => {
        let isDone = false;
        let rafId: number | null = null;

        const renderFrame = () => {
          if (isDone) return;
          if (isCancelledRef.current) {
            isDone = true;
            if (rafId) cancelAnimationFrame(rafId);
            if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
            reject(new Error('Export cancelled'));
            return;
          }

          const elapsed = audioCtx.currentTime - startAudioTime;
          setElapsedSec(Math.max(0, Math.floor(elapsed)));

          const pct = Math.min(99, Math.round((Math.max(0, elapsed) / totalDuration) * 68) + 30);
          setProgressPercent(pct);

          // Fast O(1) monotonic timeline item tracking based on Web Audio elapsed time
          while (
            activeTimelineIdx < timeline.length - 1 &&
            elapsed >= timeline[activeTimelineIdx + 1].startTime
          ) {
            activeTimelineIdx++;
          }
          const activeItem = timeline[activeTimelineIdx] || timeline[0];

          if (activeItem.type === 'title') {
            const p = Math.min(1.0, Math.max(0.0, elapsed / 0.4));
            drawTitleFrame(ctx, canvas.width, canvas.height, surah, config, p, Date.now());
            setCurrentStepText(`Rendering title card: Surah ${surah.englishName}...`);
          } else if (activeItem.type === 'bismillah') {
            const itemElapsed = Math.max(0, elapsed - activeItem.startTime);
            const p = Math.min(1.0, itemElapsed / 0.4);
            drawBismillahFrame(ctx, canvas.width, canvas.height, config, p, Date.now());
            setCurrentStepText('Rendering Bismillah ir-Rahman ir-Rahim...');
          } else if (activeItem.type === 'ayah' && activeItem.ayah) {
            setCurrentVerseIndex(activeItem.ayah.num);
            const itemElapsed = Math.max(0, elapsed - activeItem.startTime);
            let audioProgress = 0.0;
            if (activeItem.arabicDuration && activeItem.arabicDuration > 0) {
              if (itemElapsed < activeItem.arabicDuration) {
                audioProgress = Math.min(1.0, Math.max(0.0, itemElapsed / activeItem.arabicDuration));
              } else {
                audioProgress = 1.0;
              }
            } else if (activeItem.duration > 0) {
              audioProgress = Math.min(1.0, Math.max(0.0, itemElapsed / activeItem.duration));
            }
            const p = Math.min(1.0, itemElapsed / 0.35);
            // In 1 verse: don't add surah name header, leave it clean
            drawAyahFrame(ctx, canvas.width, canvas.height, surah, activeItem.ayah, config, p, Date.now(), audioProgress, !isSingleVerse);
            setCurrentStepText(`Rendering Verse ${activeItem.ayah.num} of ${totalAyahs} (Surah ${surah.englishName})...`);
          }

          if (elapsed >= totalDuration) {
            isDone = true;
            if (rafId) cancelAnimationFrame(rafId);
            if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
            renderIntervalRef.current = null;
            resolve();
          }
        };

        const scheduleRaf = () => {
          if (!isDone) {
            renderFrame();
            rafId = requestAnimationFrame(scheduleRaf);
          }
        };
        rafId = requestAnimationFrame(scheduleRaf);

        renderIntervalRef.current = setInterval(renderFrame, 33);
        if (tickerNode) {
          tickerNode.onaudioprocess = renderFrame;
        }
      });

      if (tickerNode) {
        try {
          tickerNode.onaudioprocess = null;
          tickerNode.disconnect();
        } catch (e) {}
      }

      if (wakeLock) {
        try {
          await wakeLock.release();
        } catch (e) {}
      }

      // 7. Finalize Recording safely by waiting for all chunks
      setCurrentStepText('Finalizing complete video file & subtitle sync...');
      setProgressPercent(100);

      const recorderStoppedPromise = new Promise<void>((resolveStop) => {
        mediaRecorder.onstop = () => resolveStop();
      });

      try {
        mediaRecorder.stop();
      } catch (e) {
        console.warn('MediaRecorder stop warning:', e);
      }

      await Promise.race([
        recorderStoppedPromise,
        new Promise((r) => setTimeout(r, 1200))
      ]);

      const rawBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
      setCurrentStepText('Encoding universal MP4 (H.264/AAC for Windows Media Player, QuickTime, iOS & Android)...');
      setProgressPercent(99);

      let finalBlob = rawBlob;
      try {
        finalBlob = await transcodeToUniversalMp4(rawBlob, {
          filename: `Surah_${surah.number}_${surah.englishName}_${isFast ? '720p_SD' : '1080p_HD'}.mp4`,
          onStatus: (status) => setCurrentStepText(status)
        });
      } catch (transcodeErr) {
        console.warn('Universal MP4 transcode fallback to raw recorded blob:', transcodeErr);
      }

      const videoUrl = URL.createObjectURL(finalBlob);
      const sizeInMB = (finalBlob.size / (1024 * 1024)).toFixed(1) + ' MB';

      setGeneratedVideoBlob(finalBlob);
      setGeneratedVideoUrl(videoUrl);
      setGeneratedVideoSize(sizeInMB);
      setGeneratedCues(cues);

      if (isFast) {
        setGeneratedSdUrl(videoUrl);
      } else {
        setGeneratedHdUrl(videoUrl);
      }

      setIsExporting(false);
      setExportComplete(true);

      // Save to Library
      const newSavedVideo: SavedVideo = {
        id: `quran-vid-${Date.now()}`,
        title: `Surah ${surah.englishName} (${config.startAyah}-${config.endAyah})`,
        surahName: surah.englishName,
        surahNumber: surah.number,
        aspectRatio: config.aspectRatio,
        duration: Math.round(totalDuration),
        blobUrl: videoUrl,
        audioBlobUrl: audioBlobUrl,
        sdBlobUrl: isFast ? videoUrl : undefined,
        hdBlobUrl: isHd ? videoUrl : undefined,
        resolutionMode: isFast ? 'sd' : 'hd',
        fileSize: sizeInMB,
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      // Persist full binary blob in browser IndexedDB so it survives page reload
      if (finalBlob) {
        saveVideoBlobToDB(newSavedVideo.id, finalBlob, undefined, {
          fileSize: sizeInMB,
          duration: Math.round(totalDuration)
        });
      }

      onSaveToLibrary(newSavedVideo);
    } catch (err: any) {
      if (isCancelledRef.current) return;
      console.error('Video export error:', err);
      setIsExporting(false);
      setExportComplete(false);
      setExportError(err?.message || 'An unexpected error occurred during video generation.');
    } finally {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch (e) {}
        wakeLockRef.current = null;
      }
    }
  };

  const silenceAllBackgroundAudio = () => {
    try {
      document.querySelectorAll('audio, video').forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
        } catch (e) {}
      });
    } catch (e) {}
  };

  const handleDownloadSdVideo = async () => {
    silenceAllBackgroundAudio();
    const source = generatedVideoBlob || generatedSdUrl || generatedVideoUrl;
    if (!source) return;
    await triggerSafeDownload(source, `Surah_${surah.number}_${surah.englishName}_720p_SD.mp4`);
  };

  const handleDownloadHdVideo = async () => {
    silenceAllBackgroundAudio();
    const source = generatedVideoBlob || generatedHdUrl || generatedVideoUrl;
    if (!source) return;
    await triggerSafeDownload(source, `Surah_${surah.number}_${surah.englishName}_1080p_HD.mp4`);
  };

  const handleDownloadMp3Audio = async () => {
    silenceAllBackgroundAudio();
    const source = generatedAudioUrl;
    if (!source) return;
    await triggerSafeDownload(source, `Surah_${surah.number}_${surah.englishName}_Recitation.mp3`);
  };

  const handleDownloadSrt = () => {
    silenceAllBackgroundAudio();
    const srtContent = generateSrtSubtitles(generatedCues);
    downloadTextFile(`Surah_${surah.number}_${surah.englishName}_Subtitles.srt`, srtContent);
  };

  const handleDownloadVtt = () => {
    silenceAllBackgroundAudio();
    const vttContent = generateVttSubtitles(generatedCues);
    downloadTextFile(`Surah_${surah.number}_${surah.englishName}_Subtitles.vtt`, vttContent);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-[#0e1626]/95 border border-amber-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-lg max-w-sm w-full text-slate-100 space-y-3 animate-in slide-in-from-bottom-5">
        <div className="hidden">
          <canvas ref={exportCanvasRef} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
              {exportComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-100 truncate">
                {exportComplete ? 'Video Ready for Download!' : `Exporting Surah ${surah.englishName}...`}
              </h4>
              <p className="text-[10px] text-amber-300/90 truncate">
                {exportComplete ? `Size: ${generatedVideoSize}` : `${progressPercent}% • ${currentStepText}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setIsMinimized(false)}
              title="Expand / Maximize Export Window"
              className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close Export Window"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mini progress bar when actively exporting */}
        {isExporting && !exportComplete && (
          <div className="space-y-1">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>Background Rendering</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        )}

        {/* Download action when complete */}
        {exportComplete && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDownloadHdVideo}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4/WebM</span>
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
            >
              Open Studio
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && (exportComplete || !isExporting)) {
          if (exportComplete && onNavigateToHome) onNavigateToHome();
          else onClose();
        }
      }}
    >
      <div
        className="bg-[#0e1626] border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] text-slate-100 relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Clear Exit & Back Actions */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800/90 flex items-center justify-between gap-3 bg-[#0e1626]/95 backdrop-blur-md sticky top-0 z-20 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {exportComplete ? (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToHome) onNavigateToHome();
                  else onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
                title="Return to Studio Editor"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit to Studio</span>
              </button>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Film className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                {exportComplete ? 'Video Ready & Saved' : 'Export Quran Video Studio'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Surah {surah.englishName} • Verses {config.startAyah} to {config.endAyah} ({config.aspectRatio})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!exportComplete && isExporting && (
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Minimize & Continue in Background"
                className="text-slate-400 hover:text-amber-400 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Minimize</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (exportComplete && onNavigateToHome) onNavigateToHome();
                else onClose();
              }}
              title="Close and Exit (Esc)"
              className="text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <X className="w-4 h-4 text-slate-300" />
              <span className="text-xs">Exit</span>
            </button>
          </div>
        </div>

        {/* Canvas Render Element (Invisible) */}
        <div className="hidden">
          <canvas ref={exportCanvasRef} />
        </div>

        {/* Scrollable Modal Body Container */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* State 1: Before Export Starts */}
          {!isExporting && !exportComplete && (
            <div className="bg-[#141e33] p-4.5 rounded-xl border border-slate-800 space-y-4">
              {exportError && (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-300">
                    <span>⚠️ Notice</span>
                  </div>
                  <p className="text-red-200/90 text-[11px]">{exportError}</p>
                </div>
              )}

              <div className="text-xs text-slate-300 space-y-2.5">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Reciter:</span>
                  <span className="font-semibold text-amber-300">{config.reciterName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Format:</span>
                  <span className="font-semibold text-slate-200">{config.aspectRatio} ({config.aspectRatio === '9:16' ? 'Vertical Shorts' : '16:9 Landscape'})</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Theme:</span>
                  <span className="font-semibold text-slate-200">{config.videoStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verses in One Go:</span>
                  <span className="font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {ayahsInRange.length} {ayahsInRange.length === 1 ? 'Verse' : 'Verses'} (Ayah {config.startAyah}–{config.endAyah})
                  </span>
                </div>
                {ayahsInRange.length === 1 && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/20 text-xs flex items-center gap-2 text-slate-300">
                    <span className="text-amber-400 font-bold">⚡ Single Verse Mode:</span>
                    <span>Bismillah and Surah name are left out for a pure, direct verse clip.</span>
                  </div>
                )}
              </div>

              {/* Batch Export Option for Multiple Verses */}
              {onOpenBatchExport && ayahsInRange.length >= 3 && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Prefer Multiple Short Clips (Reels/Shorts)?</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Export each verse as an individual video or chapter segment in one click
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenBatchExport}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition-all shadow-sm cursor-pointer"
                  >
                    ⚡ Switch to Batch Exporter
                  </button>
                </div>
              )}

              {ayahsInRange.length > 20 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Long Video Turbo Engine Active</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Exporting {ayahsInRange.length} verses in one continuous master video. Stream-buffered timeline ensures 0 MB RAM overflow and keeps your screen awake during render.
                  </p>
                </div>
              )}

              {/* Rendering Speed & Quality Mode Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
                  <span>⚡ Rendering Speed & Resolution</span>
                </label>
                {/* Quality & Resolution Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Export Quality Mode</span>
                    <span className="text-[10px] text-amber-400 font-normal">HD Ready</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportQuality('fast')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        exportQuality === 'fast'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                        <span>⚡ 720p HD</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Fast render • Standard HD
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportQuality('hd')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        exportQuality === 'hd'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                        <span>🎬 1080p Full HD</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Crisp 1080p • High quality
                      </p>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleStartExport}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Generate Full Video in One Go</span>
                </button>
              </div>
            </div>
          )}

          {/* State 2: Progress Bar during rendering */}
          {isExporting && (
            <div className="bg-[#141e33] p-6 rounded-xl border border-slate-800 space-y-4 text-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <div>
                <div className="text-sm font-bold text-slate-200 mb-1">{currentStepText}</div>
                {currentVerseIndex > 0 && (
                  <div className="text-xs text-amber-300 font-semibold mb-1">
                    Rendering Ayah {currentVerseIndex} of {surah.numberOfAyahs}
                  </div>
                )}
                <div className="text-xs text-amber-400/80 flex items-center justify-center gap-2">
                  <span>{progressPercent}% Completed</span>
                  {estimatedTotalSec > 0 && (
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {formatDuration(elapsedSec)} / ~{formatDuration(estimatedTotalSec)}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Minimize to Background</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="py-2 px-3.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium text-xs border border-red-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* State 3: Export Complete */}
          {exportComplete && (
            <div className="bg-[#141e33] p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4 text-center">
              {/* Top Quick Return Banner */}
              <div className="bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-500/25 border border-amber-500/50 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-left shadow-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-amber-200 flex items-center gap-1.5">
                      <span>Back to Creator Studio</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/40">✓ Render Finished</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium">Return to the studio editor home screen to customize or create more videos</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToHome) onNavigateToHome();
                      else onClose();
                    }}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Home className="w-4 h-4 text-slate-950" />
                    <span>Back to Creator Studio</span>
                    <ChevronRight className="w-4 h-4 text-slate-950" />
                  </button>
                </div>
              </div>

              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">Video Generation Complete!</h3>
                <p className="text-xs text-slate-400">
                  File Size: {generatedVideoSize} • Saved into &quot;My Videos&quot; Library
                </p>
              </div>

              {/* Direct Social Media Upload & Sharing Hub */}
              <SocialUploadHub
                videoBlob={generatedVideoBlob}
                videoUrl={generatedVideoUrl || ''}
                title={`Surah ${surah.englishName} (${config.startAyah}:${config.endAyah})`}
                surahName={surah.englishName}
                reciterName={config.reciterName}
                aspectRatio={config.aspectRatio}
              />

              {/* Download Options Suite (SD, HD & MP3) */}
              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-emerald-300">
                        Universal Standard MP4 (H.264 + AAC)
                      </div>
                      <div className="text-[10px] text-emerald-400/80">
                        100% compatible with Windows Media Player, QuickTime, iOS, Android, TVs &amp; editors
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    MP4 / FastStart
                  </span>
                </div>

                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 text-left flex items-center justify-between">
                  <span>📥 Download Options (720p, 1080p &amp; MP3)</span>
                  <span className="text-[10px] text-slate-400 lowercase font-normal">Select format to save</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 1. SD Download */}
                  <button
                    type="button"
                    onClick={handleDownloadSdVideo}
                    className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-100 transition-all flex items-center justify-center gap-2 cursor-pointer group shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <div className="text-left">
                      <div className="font-bold text-xs text-amber-300 group-hover:text-amber-200">720p SD MP4</div>
                      <span className="text-[9px] text-slate-400">Universal Format</span>
                    </div>
                  </button>

                  {/* 2. HD Download */}
                  <button
                    type="button"
                    onClick={handleDownloadHdVideo}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-950 font-bold" />
                    <div className="text-left">
                      <div className="font-bold text-xs text-slate-950">1080p HD MP4</div>
                      <span className="text-[9px] text-slate-950/80 font-medium">Master Quality</span>
                    </div>
                  </button>

                  {/* 3. MP3 Audio Download */}
                  <button
                    type="button"
                    onClick={handleDownloadMp3Audio}
                    className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-100 transition-all flex items-center justify-center gap-2 cursor-pointer group shadow-sm"
                  >
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <div className="text-left">
                      <div className="font-bold text-xs text-amber-300 group-hover:text-amber-200">MP3 Recitation</div>
                      <span className="text-[9px] text-slate-400">Pure Audio</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Subtitles & Fast Downloads */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDownloadSrt}
                  className="py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download .SRT Subtitles</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadVtt}
                  className="py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download .VTT Subtitles</span>
                </button>
              </div>

              {/* Navigation Menu (Next Steps) */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/30 space-y-3 text-left shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-400" /> Choose Next Action / Exit
                  </span>
                  <span className="text-[10px] text-slate-400">Return or Browse</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 1. Return to Home Studio */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToHome) onNavigateToHome();
                      else onClose();
                    }}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-between shadow-md transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Home className="w-4 h-4 text-slate-950 flex-shrink-0" />
                      <span className="truncate font-extrabold">Back to Studio</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-950 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  {/* 2. Saved Videos Library */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToLibrary) onNavigateToLibrary();
                      else onClose();
                    }}
                    className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 hover:border-amber-500/50 flex items-center justify-between transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileVideo className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="truncate">My Videos</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  {/* 3. Create Another Video */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onCreateNewVideo) onCreateNewVideo();
                      else if (onNavigateToHome) onNavigateToHome();
                      else onClose();
                    }}
                    className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 hover:border-amber-400 flex items-center justify-between transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="truncate">Create New</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Bar when Export is Complete for Instant Exit */}
        {exportComplete && (
          <div className="p-3 sm:p-4 bg-[#0a101d] border-t border-slate-800/90 flex items-center justify-between gap-2.5 sticky bottom-0 z-20 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToHome) onNavigateToHome();
                else onClose();
              }}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-slate-950" />
              <span>Back to Studio</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToLibrary) onNavigateToLibrary();
                  else onClose();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
              >
                <FileVideo className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">My Videos</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
