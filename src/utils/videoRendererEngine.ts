import { Surah, VideoConfig, Ayah } from '../types';
import { drawAyahFrame, drawBismillahFrame, drawTitleFrame, preloadAllBackgroundImages } from './canvasRenderer';
import { generateSrtSubtitles, generateVttSubtitles, SubtitleCue } from './subtitleGenerator';
import { fetchAudioBuffer, stripBismillahFromAyah1, audioBuffersToCombinedBlob, concatenateAudioBuffersWithOffsets, createSilentBuffer } from './audioUtils';
import { getAyahTranslationText, getSpokenTranslationTextAndLang } from './translationUtils';
import { transcodeToUniversalMp4 } from './universalMp4Transcoder';

export interface RenderSegmentOptions {
  resolution?: 'fast' | 'hd';
  includeTitleCard?: boolean;
  includeBismillah?: boolean;
  includeSurahHeader?: boolean;
  convertToUniversalMp4?: boolean;
  onProgress?: (progress: {
    percent: number;
    stepText: string;
    elapsedSec: number;
    currentVerse: number;
  }) => void;
  isCancelledRef?: { current: boolean };
  externalCanvas?: HTMLCanvasElement | null;
}

export interface RenderSegmentResult {
  videoBlob: Blob;
  videoUrl: string;
  audioBlob: Blob;
  audioUrl: string;
  srtContent: string;
  vttContent: string;
  cues: SubtitleCue[];
  durationSec: number;
  fileSize: string;
}

interface TimelineItem {
  type: 'title' | 'bismillah' | 'ayah';
  ayah?: Ayah;
  index?: number;
  startTime: number;
  endTime: number;
  duration: number;
  arabicDuration?: number;
  translationDuration?: number;
}

// Concurrent helper for fast audio buffer fetching
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

/**
 * High-performance, zero-drift video segment rendering engine.
 * Renders a specified Ayah sub-range with exact Web Audio synchronization.
 */
export async function renderVideoSegment(
  surah: Surah,
  startAyah: number,
  endAyah: number,
  config: VideoConfig,
  options: RenderSegmentOptions = {}
): Promise<RenderSegmentResult> {
  const isCancelled = () => options.isCancelledRef?.current === true;

  if (isCancelled()) {
    throw new Error('Export cancelled by user.');
  }

  // Pre-load visual backgrounds
  preloadAllBackgroundImages();

  const totalSurahAyahs = surah.numberOfAyahs || surah.ayahs?.length || 1;
  const clampedStart = Math.max(1, Math.min(startAyah, totalSurahAyahs));
  const clampedEnd = Math.max(clampedStart, Math.min(endAyah, totalSurahAyahs));

  let ayahsToRender = surah.ayahs && surah.ayahs.length > 0
    ? surah.ayahs.filter((a) => a.num >= clampedStart && a.num <= clampedEnd)
    : [];

  if (ayahsToRender.length === 0) {
    ayahsToRender = Array.from({ length: clampedEnd - clampedStart + 1 }, (_, i) => ({
      num: clampedStart + i,
      arabic: `Verse ${clampedStart + i}`,
      english: `Translation of Verse ${clampedStart + i}`
    }));
  }

  const isPortrait = config.aspectRatio === '9:16';
  const isFast = options.resolution === 'fast';

  const canvas = options.externalCanvas || document.createElement('canvas');
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
    throw new Error('Could not initialize 2D canvas rendering context.');
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 44100
  });

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  // Ensure all custom fonts (Amiri, Noto Naskh, Devanagari) are fully loaded into browser cache
  if (typeof document !== 'undefined' && (document as any).fonts && (document as any).fonts.ready) {
    try {
      await (document as any).fonts.ready;
    } catch (e) {
      // Continue gracefully if browser doesn't support font loading API
    }
  }

  // Audio Destination for MediaRecorder
  const audioDestNode = audioCtx.createMediaStreamDestination();
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestNode.stream.getAudioTracks()
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : 'video/webm';

  const videoBitsPerSec = isFast ? 3500000 : 7500000;
  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: videoBitsPerSec,
    audioBitsPerSecond: 192000
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const notifyProgress = (pct: number, stepText: string, elapsed = 0, currentVerse = clampedStart) => {
    if (options.onProgress) {
      options.onProgress({
        percent: Math.min(100, Math.max(0, pct)),
        stepText,
        elapsedSec: Math.floor(elapsed),
        currentVerse
      });
    }
  };

  try {
    notifyProgress(5, `Fetching high-fidelity audio streams for Verses ${clampedStart}–${clampedEnd}...`);

    // 1. Determine Title Card & Bismillah logic
    // In a 1-verse video/clip: do NOT add Bismillah and do NOT add Surah name (no title card, no top surah header). Leave it out!
    const isSingleVerse = ayahsToRender.length === 1;
    const needsTitleCard = !isSingleVerse && options.includeTitleCard !== false;
    const showSurahHeader = !isSingleVerse && options.includeSurahHeader !== false;

    // Bismillah should strictly ONLY be rendered at the very start of the Surah (Ayah 1) for multi-verse videos,
    // and never on Surah 9 (At-Tawbah), nor Surah 1 (Al-Fatiha, where Ayah 1 is already Bismillah itself),
    // and NEVER on subsequent verses (Ayah 2, 3, 4, 10, etc.) in batch or segment exports,
    // and omitted completely for 1 verse.
    const isSurahStart = clampedStart === 1;
    const isSurahTawbah = surah.number === 9;
    const isSurahFatiha = surah.number === 1;
    const needsBismillah =
      !isSingleVerse &&
      isSurahStart &&
      !isSurahTawbah &&
      !isSurahFatiha &&
      options.includeBismillah !== false;

    let bismillahBuffer: AudioBuffer | null = null;
    if (needsBismillah) {
      try {
        bismillahBuffer = await fetchAudioBuffer(
          audioCtx,
          config.reciterFolder,
          1,
          1,
          true
        );
      } catch (e) {
        console.warn('Bismillah audio fetch fallback', e);
      }
    }

    if (isCancelled()) throw new Error('Export cancelled');

    // 2. Fetch Verse Audios concurrently
    let completedAudioCount = 0;
    const totalAyahs = ayahsToRender.length;

    const verseAudioResults = await mapConcurrent(
      ayahsToRender,
      3,
      async (ayah) => {
        if (isCancelled()) throw new Error('Export cancelled');

        let aBuf: AudioBuffer | null = null;
        let tBuf: AudioBuffer | null = null;

        // Recitation Audio
        if (config.audioMode === 'recitation' || config.audioMode === 'both') {
          try {
            aBuf = await fetchAudioBuffer(
              audioCtx,
              config.reciterFolder,
              surah.number,
              ayah.num,
              true,
              ayah.arabic,
              'ar'
            );
          } catch (err) {
            console.warn(`Failed Arabic audio for Ayah ${ayah.num}`, err);
          }
        }

        // Translation Audio
        if (config.audioMode === 'both' || config.audioMode === 'translation-only') {
          const spoken = getSpokenTranslationTextAndLang(ayah, config.translationReciterFolder, config.translationLang);
          const isScholarVoice = config.translationReciterFolder === 'tts-ur-scholar' || config.translationReciterFolder.includes('scholar') || config.voiceLock;
          const speed = config.deliverySpeed || config.translationSpeechRate || 1.0;
          const resonance120Hz = config.baritoneResonance !== undefined ? config.baritoneResonance : isScholarVoice;
          const profile = config.voiceProfile || spoken.voiceProfile;

          try {
            tBuf = await fetchAudioBuffer(
              audioCtx,
              config.translationReciterFolder,
              surah.number,
              ayah.num,
              true,
              spoken.text,
              spoken.lang,
              { speed, resonance120Hz, voiceProfile: profile }
            );
          } catch (err) {
            console.warn(`Failed Translation audio for Ayah ${ayah.num}`, err);
          }
        }

        completedAudioCount++;
        const audioFetchProgress = Math.round(5 + (completedAudioCount / totalAyahs) * 25);
        notifyProgress(audioFetchProgress, `Fetched audio for Ayah ${ayah.num} (${completedAudioCount}/${totalAyahs})...`);

        return { ayah, aBuf, tBuf };
      }
    );

    if (isCancelled()) throw new Error('Export cancelled');

    notifyProgress(32, 'Building sample-accurate audio track & alignment timestamps...');

    // 3. Assemble Timeline & Merge Audio Buffers
    const buffersToCombine: (AudioBuffer | null)[] = [];
    const timeline: TimelineItem[] = [];

    // Title Card
    const titleDuration = needsTitleCard ? 1.4 : 0.0;
    if (needsTitleCard) {
      const titleSilent = createSilentBuffer(audioCtx, titleDuration);
      buffersToCombine.push(titleSilent);
    }

    // Bismillah
    let bismillahBufIdx = -1;
    if (needsBismillah && bismillahBuffer) {
      bismillahBufIdx = buffersToCombine.length;
      buffersToCombine.push(bismillahBuffer);
    }

    // Verses
    interface VerseRef {
      ayah: Ayah;
      idx: number;
      arabicBufIdx: number;
      translationBufIdx: number;
    }
    const verseRefs: VerseRef[] = [];

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
        if (res.aBuf) {
          aIdx = buffersToCombine.length;
          buffersToCombine.push(res.aBuf);
        } else if (res.tBuf) {
          tIdx = buffersToCombine.length;
          buffersToCombine.push(res.tBuf);
        }
      }

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

    const concatResult = concatenateAudioBuffersWithOffsets(audioCtx, buffersToCombine);
    const masterAudioBuffer = concatResult.masterBuffer;

    if (needsTitleCard) {
      timeline.push({
        type: 'title',
        startTime: concatResult.startTimes[0] || 0,
        endTime: concatResult.endTimes[0] || titleDuration,
        duration: concatResult.durations[0] || titleDuration
      });
    }

    if (bismillahBufIdx !== -1) {
      timeline.push({
        type: 'bismillah',
        startTime: concatResult.startTimes[bismillahBufIdx],
        endTime: concatResult.endTimes[bismillahBufIdx],
        duration: concatResult.durations[bismillahBufIdx]
      });
    }

    const cues: SubtitleCue[] = [];
    verseRefs.forEach((vRef) => {
      let vStart = 0;
      let vEnd = 0;
      let aDur = 0;
      let tDur = 0;

      if (vRef.arabicBufIdx !== -1 && vRef.translationBufIdx !== -1) {
        vStart = concatResult.startTimes[vRef.arabicBufIdx];
        vEnd = concatResult.endTimes[vRef.translationBufIdx];
        aDur = concatResult.durations[vRef.arabicBufIdx] || 0;
        tDur = concatResult.durations[vRef.translationBufIdx] || 0;
      } else if (vRef.arabicBufIdx !== -1) {
        vStart = concatResult.startTimes[vRef.arabicBufIdx];
        vEnd = concatResult.endTimes[vRef.arabicBufIdx];
        aDur = concatResult.durations[vRef.arabicBufIdx] || 0;
      } else if (vRef.translationBufIdx !== -1) {
        vStart = concatResult.startTimes[vRef.translationBufIdx];
        vEnd = concatResult.endTimes[vRef.translationBufIdx];
        tDur = concatResult.durations[vRef.translationBufIdx] || 0;
      }

      const vDur = Math.max(0.1, vEnd - vStart);

      timeline.push({
        type: 'ayah',
        ayah: vRef.ayah,
        index: vRef.idx,
        startTime: vStart,
        endTime: vEnd,
        duration: vDur,
        arabicDuration: aDur,
        translationDuration: tDur
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
    const combinedAudioBlob = audioBuffersToCombinedBlob([masterAudioBuffer], audioCtx.sampleRate || 44100);
    const audioBlobUrl = URL.createObjectURL(combinedAudioBlob);

    // Initial frame draw
    if (needsTitleCard) {
      drawTitleFrame(ctx, canvas.width, canvas.height, surah, config, 1.0, Date.now());
    } else if (needsBismillah) {
      drawBismillahFrame(ctx, canvas.width, canvas.height, config, 1.0, Date.now());
    } else if (ayahsToRender[0]) {
      drawAyahFrame(ctx, canvas.width, canvas.height, surah, ayahsToRender[0], config, 1.0, Date.now(), 0, showSurahHeader);
    }

    mediaRecorder.start(100);

    const startAudioTime = audioCtx.currentTime + 0.05;
    const masterSource = audioCtx.createBufferSource();
    masterSource.buffer = masterAudioBuffer;
    masterSource.connect(audioDestNode);
    masterSource.start(startAudioTime);

    let activeTimelineIdx = 0;

    // Render loop
    await new Promise<void>((resolve, reject) => {
      let isDone = false;
      let rafId: number | null = null;
      let intervalId: any = null;

      const renderFrame = () => {
        if (isDone) return;
        if (isCancelled()) {
          isDone = true;
          if (rafId) cancelAnimationFrame(rafId);
          if (intervalId) clearInterval(intervalId);
          reject(new Error('Export cancelled'));
          return;
        }

        const elapsed = audioCtx.currentTime - startAudioTime;
        const pct = Math.min(99, Math.round((Math.max(0, elapsed) / totalDuration) * 65) + 33);

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
          notifyProgress(pct, `Rendering title: Surah ${surah.englishName}...`, elapsed, clampedStart);
        } else if (activeItem.type === 'bismillah') {
          const itemElapsed = Math.max(0, elapsed - activeItem.startTime);
          const p = Math.min(1.0, itemElapsed / 0.4);
          drawBismillahFrame(ctx, canvas.width, canvas.height, config, p, Date.now());
          notifyProgress(pct, 'Rendering Bismillah ir-Rahman ir-Rahim...', elapsed, clampedStart);
        } else if (activeItem.type === 'ayah' && activeItem.ayah) {
          const itemElapsed = Math.max(0, elapsed - activeItem.startTime);
          let audioProgress = 0.0;
          if (activeItem.arabicDuration && activeItem.arabicDuration > 0) {
            if (itemElapsed < activeItem.arabicDuration) {
              audioProgress = Math.min(1.0, Math.max(0.0, itemElapsed / activeItem.arabicDuration));
            } else {
              // Arabic recitation complete; keep all words highlighted while translation audio plays
              audioProgress = 1.0;
            }
          } else if (activeItem.duration > 0) {
            audioProgress = Math.min(1.0, Math.max(0.0, itemElapsed / activeItem.duration));
          }

          const p = Math.min(1.0, itemElapsed / 0.35);
          drawAyahFrame(ctx, canvas.width, canvas.height, surah, activeItem.ayah, config, p, Date.now(), audioProgress, showSurahHeader);
          notifyProgress(pct, `Rendering Verse ${activeItem.ayah.num} (Surah ${surah.englishName})...`, elapsed, activeItem.ayah.num);
        }

        if (elapsed >= totalDuration) {
          isDone = true;
          if (rafId) cancelAnimationFrame(rafId);
          if (intervalId) clearInterval(intervalId);
          // Wait 250ms grace period so that all pending audio packets are flushed through MediaRecorder
          setTimeout(() => {
            resolve();
          }, 250);
        }
      };

      const scheduleRaf = () => {
        if (!isDone) {
          renderFrame();
          rafId = requestAnimationFrame(scheduleRaf);
        }
      };
      rafId = requestAnimationFrame(scheduleRaf);
      intervalId = setInterval(renderFrame, 33);
    });

    notifyProgress(99, 'Finalizing video stream & subtitle tracks...');

    const recorderStoppedPromise = new Promise<void>((resolveStop) => {
      mediaRecorder.onstop = () => resolveStop();
    });

    try {
      mediaRecorder.stop();
    } catch (e) {
      console.warn('Recorder stop warning', e);
    }

    await Promise.race([
      recorderStoppedPromise,
      new Promise((r) => setTimeout(r, 1200))
    ]);

    const rawBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
    let finalBlob = rawBlob;

    if (options.convertToUniversalMp4 !== false) {
      notifyProgress(99, 'Encoding universal standard MP4 (H.264/AAC for Windows Media Player & QuickTime)...');
      try {
        finalBlob = await transcodeToUniversalMp4(rawBlob, {
          filename: `segment_${clampedStart}_to_${clampedEnd}.mp4`,
          onStatus: (st) => notifyProgress(99, st)
        });
      } catch (err) {
        console.warn('Universal MP4 segment transcode fallback:', err);
      }
    }

    const videoUrl = URL.createObjectURL(finalBlob);
    const sizeInMB = (finalBlob.size / (1024 * 1024)).toFixed(1) + ' MB';

    const srtContent = generateSrtSubtitles(cues);
    const vttContent = generateVttSubtitles(cues);

    notifyProgress(100, 'Render complete!', totalDuration, clampedEnd);

    return {
      videoBlob: finalBlob,
      videoUrl,
      audioBlob: combinedAudioBlob,
      audioUrl: audioBlobUrl,
      srtContent,
      vttContent,
      cues,
      durationSec: Math.round(totalDuration),
      fileSize: sizeInMB
    };
  } finally {
    try {
      if (audioCtx.state !== 'closed') {
        await audioCtx.close();
      }
    } catch (e) {}
  }
}
