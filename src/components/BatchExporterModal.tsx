import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Layers,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Archive,
  Film,
  Clock,
  Check,
  AlertCircle,
  FileVideo,
  ChevronRight,
  Sliders,
  Share2,
  Eye,
  SkipForward
} from 'lucide-react';
import JSZip from 'jszip';
import { Surah, VideoConfig, SavedVideo, BatchClipItem, BatchExportSettings } from '../types';
import { renderVideoSegment } from '../utils/videoRendererEngine';
import { downloadTextFile, offsetSrtContent, offsetVttContent } from '../utils/subtitleGenerator';
import { triggerSafeDownload } from '../utils/downloadUtils';
import { saveVideoBlobToDB } from '../utils/videoStorage';
import { isGenuineMp4Blob, transcodeToUniversalMp4 } from '../utils/universalMp4Transcoder';

interface BatchExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  surah: Surah;
  config: VideoConfig;
  onSaveToLibrary: (video: SavedVideo) => void;
  onOpenLibrary?: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const BatchExporterModal: React.FC<BatchExporterModalProps> = ({
  isOpen,
  onClose,
  surah,
  config,
  onSaveToLibrary,
  onOpenLibrary
}) => {
  const totalAyahsInSurah = surah.numberOfAyahs || surah.ayahs?.length || 1;

  // Batch Configuration State
  const [settings, setSettings] = useState<BatchExportSettings>({
    mode: 'individual-clips',
    chunkSize: 10,
    resolution: 'fast',
    includeTitleCard: 'first-clip-only', // Sirf first batch me surah ka naam mention hoga baki sare me nahi
    includeBismillah: 'surah-start-only',
    autoSaveToLibrary: true,
    autoMergeAllVerses: true, // Default to true: merges all generated verses into 1 master video
    autoDownloadMerged: true, // Automatically triggers browser download of merged MP4 when ready
    namingPattern: 'surah-ayah-range'
  });

  const [batchStartAyah, setBatchStartAyah] = useState<number>(config.startAyah || 1);
  const [batchEndAyah, setBatchEndAyah] = useState<number>(config.endAyah || totalAyahsInSurah);

  // Execution State
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentClipIndex, setCurrentClipIndex] = useState<number>(0);
  const [currentStepText, setCurrentStepText] = useState<string>('');
  const [batchElapsedSec, setBatchElapsedSec] = useState<number>(0);
  const [isBatchFinished, setIsBatchFinished] = useState<boolean>(false);
  const [isCreatingZip, setIsCreatingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);

  // Merged Master Video State
  const [mergedVideo, setMergedVideo] = useState<{
    videoBlob: Blob;
    videoUrl: string;
    audioBlob?: Blob;
    audioUrl?: string;
    srtContent: string;
    vttContent: string;
    durationSec: number;
    fileSize: string;
  } | null>(null);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeProgressPercent, setMergeProgressPercent] = useState<number>(0);
  const [mergeStepText, setMergeStepText] = useState<string>('');

  // Preview Player State for Completed Clips
  const [previewClip, setPreviewClip] = useState<BatchClipItem | null>(null);

  // Cancellation and Pause Refs
  const isCancelledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const skipCurrentClipRef = useRef<boolean>(false);
  const batchTimerRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);
  const mergeAbortRef = useRef<AbortController | null>(null);

  // Sync batch start/end when surah or modal opens
  useEffect(() => {
    if (isOpen) {
      setBatchStartAyah(config.startAyah || 1);
      setBatchEndAyah(config.endAyah || totalAyahsInSurah);
      setMergedVideo(null);
      setIsMerging(false);
      setMergeProgressPercent(0);
      setMergeStepText('');
    }
  }, [isOpen, config.startAyah, config.endAyah, totalAyahsInSurah]);

  // Generate Partitioned Clip Plan based on chosen range & chunk size
  const clipPlan = useMemo<BatchClipItem[]>(() => {
    const start = Math.max(1, Math.min(batchStartAyah, totalAyahsInSurah));
    const end = Math.max(start, Math.min(batchEndAyah, totalAyahsInSurah));
    const size = Math.max(1, settings.chunkSize);

    const items: BatchClipItem[] = [];
    let clipNum = 1;

    for (let cur = start; cur <= end; cur += size) {
      const curEnd = Math.min(cur + size - 1, end);
      const ayahCount = curEnd - cur + 1;

      let title = `Surah ${surah.englishName} (Ayah ${cur === curEnd ? cur : `${cur}–${curEnd}`})`;
      if (settings.mode === 'consolidated-segment') {
        title = `Surah ${surah.englishName} - Segment Part ${clipNum} (Ayah ${cur}–${curEnd})`;
      } else if (settings.mode === 'full-merged-master') {
        title = `Surah ${surah.englishName} - Part ${clipNum} (Ayah ${cur}–${curEnd}) → Merged Master`;
      }

      let fileName = `Surah_${surah.number}_${surah.englishName}_Ayah_${cur}_${curEnd}`;
      if (settings.namingPattern === 'part-number') {
        fileName = `Surah_${surah.number}_${surah.englishName}_Part_${clipNum}`;
      } else if (settings.namingPattern === 'social-reel') {
        fileName = `Surah_${surah.englishName}_Reel_${cur}_${curEnd}`;
      }

      items.push({
        id: `clip-${surah.number}-${cur}-${curEnd}-${clipNum}`,
        clipNumber: clipNum,
        startAyah: cur,
        endAyah: curEnd,
        ayahCount,
        title,
        fileName,
        status: 'idle',
        progressPercent: 0
      });

      clipNum++;
    }

    return items;
  }, [batchStartAyah, batchEndAyah, totalAyahsInSurah, settings.chunkSize, settings.mode, settings.namingPattern, surah]);

  // Dynamic Clips Queue (stateful during execution)
  const [clipsQueue, setClipsQueue] = useState<BatchClipItem[]>([]);

  useEffect(() => {
    if (!isBatchRunning && !isBatchFinished) {
      setClipsQueue(clipPlan);
    }
  }, [clipPlan, isBatchRunning, isBatchFinished]);

  // Batch Timer
  useEffect(() => {
    if (isBatchRunning && !isPaused) {
      batchTimerRef.current = setInterval(() => {
        setBatchElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    }
    return () => {
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
    };
  }, [isBatchRunning, isPaused]);

  // Screen WakeLock helper
  const acquireWakeLock = async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.warn('WakeLock not acquired:', e);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
    }
  };

  // Start Batch Render
  const handleStartBatch = async () => {
    if (clipsQueue.length === 0) return;

    isCancelledRef.current = false;
    isPausedRef.current = false;
    skipCurrentClipRef.current = false;
    setIsBatchRunning(true);
    setIsPaused(false);
    setIsBatchFinished(false);
    setBatchElapsedSec(0);
    setCurrentClipIndex(0);
    setMergedVideo(null);
    setIsMerging(false);
    setMergeProgressPercent(0);
    setMergeStepText('');
    await acquireWakeLock();

    // Clone initial queue state
    const queue = clipsQueue.map((c) => ({
      ...c,
      status: 'idle' as const,
      progressPercent: 0,
      errorMessage: undefined
    }));
    setClipsQueue([...queue]);

    for (let i = 0; i < queue.length; i++) {
      if (isCancelledRef.current) break;

      // Handle pause loop
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }
      if (isCancelledRef.current) break;

      setCurrentClipIndex(i);
      const clip = queue[i];

      // Update active clip status
      queue[i].status = 'rendering';
      queue[i].progressPercent = 0;
      setClipsQueue([...queue]);
      setCurrentStepText(`Processing Clip ${i + 1} of ${queue.length}: Ayah ${clip.startAyah}–${clip.endAyah}...`);

      const isFirstClip = i === 0;
      const isSingleVerse = clip.ayahCount === 1;

      // In 1 verse: don't add Bismillah and Surah name, leave it out
      const includeTitle =
        !isSingleVerse &&
        (settings.includeTitleCard === 'every-clip' ||
        (settings.includeTitleCard === 'first-clip-only' && isFirstClip));

      // Surah name is only mentioned when not a single verse clip
      const includeSurahHeader =
        !isSingleVerse &&
        (settings.includeTitleCard === 'every-clip' ||
        (settings.includeTitleCard === 'first-clip-only' && isFirstClip));

      // Bismillah should strictly ONLY be on multi-verse opening (Ayah 1), omitted for 1 verse
      const isSurahOpening = clip.startAyah === 1 && surah.number !== 1 && surah.number !== 9;
      const includeBismillah = !isSingleVerse && isSurahOpening && settings.includeBismillah === 'surah-start-only';

      try {
        const renderResult = await renderVideoSegment(
          surah,
          clip.startAyah,
          clip.endAyah,
          config,
          {
            resolution: settings.resolution,
            includeTitleCard: includeTitle,
            includeBismillah: includeBismillah,
            includeSurahHeader: includeSurahHeader,
            isCancelledRef: isCancelledRef,
            onProgress: (p) => {
              if (skipCurrentClipRef.current) return;
              queue[i].progressPercent = p.percent;
              setClipsQueue([...queue]);
              setCurrentStepText(`Clip ${i + 1}/${queue.length}: ${p.stepText}`);
            }
          }
        );

        if (isCancelledRef.current) break;

        // Clip succeeded
        queue[i].status = 'completed';
        queue[i].progressPercent = 100;
        queue[i].videoBlob = renderResult.videoBlob;
        queue[i].videoUrl = renderResult.videoUrl;
        queue[i].audioBlob = renderResult.audioBlob;
        queue[i].audioUrl = renderResult.audioUrl;
        queue[i].srtContent = renderResult.srtContent;
        queue[i].vttContent = renderResult.vttContent;
        queue[i].durationSec = renderResult.durationSec;
        queue[i].fileSize = renderResult.fileSize;
        setClipsQueue([...queue]);

        // Auto Save to Library
        if (settings.autoSaveToLibrary) {
          const savedItem: SavedVideo = {
            id: `batch-${surah.number}-${clip.startAyah}-${clip.endAyah}-${Date.now()}`,
            title: clip.title,
            surahName: surah.englishName,
            surahNumber: surah.number,
            aspectRatio: config.aspectRatio,
            duration: renderResult.durationSec,
            blobUrl: renderResult.videoUrl,
            audioBlobUrl: renderResult.audioUrl,
            fileSize: renderResult.fileSize,
            resolutionMode: settings.resolution === 'fast' ? 'sd' : 'hd',
            createdAt: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
          onSaveToLibrary(savedItem);
        }
      } catch (err: any) {
        if (isCancelledRef.current) break;
        console.error(`Clip ${i + 1} render failed:`, err);
        queue[i].status = 'error';
        queue[i].errorMessage = err?.message || 'Render failed';
        setClipsQueue([...queue]);
      }

      // Reset skip flag
      skipCurrentClipRef.current = false;

      // Small inter-clip cooling pause for garbage collection and audio thread release
      await new Promise((r) => setTimeout(r, 200));
    }

    await releaseWakeLock();
    setIsBatchRunning(false);
    setIsBatchFinished(true);
    setCurrentStepText('All batch clips processed!');

    // Automatically merge all verses into 1 master video if enabled
    const completedClips = queue.filter((c) => c.status === 'completed' && c.videoBlob);
    if (!isCancelledRef.current && settings.autoMergeAllVerses && completedClips.length > 0) {
      await executeMergeAllVerses(completedClips, settings.autoDownloadMerged);
    }
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (isPaused) {
      isPausedRef.current = false;
      setIsPaused(false);
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
    }
  };

  // Skip Active Clip
  const handleSkipClip = () => {
    skipCurrentClipRef.current = true;
    isCancelledRef.current = false;
  };

  // Cancel Batch
  const handleCancelBatch = async () => {
    isCancelledRef.current = true;
    if (mergeAbortRef.current) {
      try {
        mergeAbortRef.current.abort();
      } catch (e) {}
      mergeAbortRef.current = null;
    }
    await releaseWakeLock();
    setIsBatchRunning(false);
    setIsMerging(false);
    setCurrentStepText('Batch export cancelled.');
  };

  // Helper to trigger browser download safely
  const triggerBrowserDownload = (source: Blob | string, filename: string) => {
    triggerSafeDownload(source, filename);
  };

  // Merge All Verses into 1 Single Continuous Master Video
  const executeMergeAllVerses = async (targetClipsList?: BatchClipItem[], autoDownload: boolean = false) => {
    // Collect all clips that actually finished rendering with a valid videoBlob
    const completedClips = targetClipsList && targetClipsList.length > 0
      ? targetClipsList.filter((c) => c.status === 'completed' && c.videoBlob)
      : clipsQueue.filter((c) => c.status === 'completed' && c.videoBlob);

    if (completedClips.length === 0) {
      setMergeStepText('No completed video clips available to merge. Please generate batch clips first.');
      return;
    }

    const minAyah = completedClips[0].startAyah;
    const maxAyah = completedClips[completedClips.length - 1].endAyah;
    const masterFileName = `Surah_${surah.number}_${surah.englishName}_Ayah_${minAyah}_to_${maxAyah}_Full_Merged.mp4`;

    // If only 1 clip exists in batch, ensure it is encoded in universal standard MP4 format
    if (completedClips.length === 1) {
      setIsMerging(true);
      setMergeProgressPercent(30);
      setMergeStepText('Encoding single clip to universal standard MP4 (H.264 + AAC)...');
      
      const single = completedClips[0];
      let finalMp4Blob = single.videoBlob!;
      try {
        if (finalMp4Blob) {
          finalMp4Blob = await transcodeToUniversalMp4(finalMp4Blob, {
            filename: masterFileName,
            onStatus: (st) => setMergeStepText(st)
          });
        }
      } catch (err) {
        console.warn('Single clip transcode fallback:', err);
      }

      const videoUrl = URL.createObjectURL(finalMp4Blob);
      const sizeInMB = (finalMp4Blob.size / (1024 * 1024)).toFixed(1) + ' MB';

      const singleData = {
        videoBlob: finalMp4Blob,
        videoUrl,
        audioBlob: single.audioBlob,
        audioUrl: single.audioUrl,
        srtContent: single.srtContent || '',
        vttContent: single.vttContent || '',
        durationSec: single.durationSec || 0,
        fileSize: sizeInMB
      };
      setMergedVideo(singleData);
      setMergeProgressPercent(100);
      setMergeStepText('Universal Master MP4 video is ready for download!');
      setIsMerging(false);
      if (autoDownload || settings.autoDownloadMerged) {
        triggerBrowserDownload(singleData.videoBlob, masterFileName);
      }
      return;
    }

    isCancelledRef.current = false;
    setIsMerging(true);
    setMergeProgressPercent(10);
    setMergeStepText(`Preparing ${completedClips.length} clips for master video merge...`);
    await acquireWakeLock();

    try {
      setMergeProgressPercent(25);
      setMergeStepText(`Packaging ${completedClips.length} clips for high-speed FFmpeg engine...`);

      const formData = new FormData();
      completedClips.forEach((clip, idx) => {
        // Pass index in filename so server reliably concatenates in sequential order
        const ext = clip.videoBlob?.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('videos', clip.videoBlob!, `clip_${idx}.${ext}`);
      });

      const abortController = new AbortController();
      mergeAbortRef.current = abortController;

      setMergeProgressPercent(45);
      setMergeStepText(`Encoding ${completedClips.length} clips into universal standard MP4 video...`);

      let mergedBlob: Blob | null = null;
      let mergedVideoUrl: string = '';
      let cumulativeSec = 0;
      let totalMergedSrt = '';
      let totalMergedVtt = '';
      let sizeInMB = '';

      try {
        const response = await fetch('/api/merge-videos', {
          method: 'POST',
          body: formData,
          signal: abortController.signal
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => null);
          throw new Error(errJson?.message || `Server merge returned status ${response.status}`);
        }

        mergedBlob = await response.blob();
        mergedVideoUrl = URL.createObjectURL(mergedBlob);
        sizeInMB = `${(mergedBlob.size / (1024 * 1024)).toFixed(1)} MB`;

        // Calculate combined subtitle tracks and duration
        let nextCueIndex = 1;
        let mergedSrtBlocks: string[] = [];
        let mergedVttBlocks: string[] = [];
        for (const clip of completedClips) {
          const clipDur = clip.durationSec || 0;
          if (clip.srtContent) {
            const srtResult = offsetSrtContent(clip.srtContent, cumulativeSec, nextCueIndex);
            if (srtResult.srt) mergedSrtBlocks.push(srtResult.srt);
            nextCueIndex = srtResult.nextIndex;
          }
          if (clip.vttContent) {
            const vttResult = offsetVttContent(clip.vttContent, cumulativeSec);
            if (vttResult) mergedVttBlocks.push(vttResult);
          }
          cumulativeSec += clipDur;
        }
        totalMergedSrt = mergedSrtBlocks.join('\n\n');
        totalMergedVtt = mergedVttBlocks.length > 0 ? `WEBVTT - Quran Video Subtitles\n\n${mergedVttBlocks.join('\n\n')}` : '';

      } catch (serverErr: any) {
        if (abortController.signal.aborted || isCancelledRef.current) throw serverErr;
        console.warn('Server FFmpeg merge failed, executing client-side master video fallback:', serverErr);
        setMergeStepText('Server busy; rendering continuous master MP4 in browser engine...');

        // Fallback: render entire range directly using renderVideoSegment
        const clientRes = await renderVideoSegment(
          surah,
          minAyah,
          maxAyah,
          config,
          {
            resolution: settings.resolution,
            includeTitleCard: minAyah !== maxAyah && settings.includeTitleCard !== 'none',
            includeBismillah: minAyah !== maxAyah && settings.includeBismillah === 'surah-start-only' && minAyah === 1 && surah.number !== 1 && surah.number !== 9,
            includeSurahHeader: minAyah !== maxAyah,
            isCancelledRef: isCancelledRef,
            onProgress: (p) => {
              setMergeProgressPercent(p.percent);
              setMergeStepText(`Rendering Master Merged MP4: Verse ${p.currentVerse} (${p.percent}%)...`);
            }
          }
        );

        mergedBlob = clientRes.videoBlob;
        mergedVideoUrl = clientRes.videoUrl;
        cumulativeSec = clientRes.durationSec;
        totalMergedSrt = clientRes.srtContent;
        totalMergedVtt = clientRes.vttContent;
        sizeInMB = clientRes.fileSize;
      }

      if (!mergedBlob) {
        throw new Error('Failed to create merged master video.');
      }

      const mergedData = {
        videoBlob: mergedBlob,
        videoUrl: mergedVideoUrl,
        srtContent: totalMergedSrt,
        vttContent: totalMergedVtt,
        durationSec: Math.round(cumulativeSec),
        fileSize: sizeInMB
      };

      setMergedVideo(mergedData);

      // Auto-save merged video to library
      if (settings.autoSaveToLibrary) {
        const savedMaster: SavedVideo = {
          id: `batch-master-${surah.number}-${minAyah}-${maxAyah}-${Date.now()}`,
          title: `Surah ${surah.englishName} (Full Merged: Ayah ${minAyah}–${maxAyah})`,
          surahName: surah.englishName,
          surahNumber: surah.number,
          aspectRatio: config.aspectRatio,
          duration: Math.round(cumulativeSec),
          blobUrl: mergedVideoUrl,
          fileSize: sizeInMB,
          resolutionMode: settings.resolution === 'fast' ? 'sd' : 'hd',
          createdAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
        if (mergedBlob) {
          saveVideoBlobToDB(savedMaster.id, mergedBlob, undefined, {
            fileSize: sizeInMB,
            duration: Math.round(cumulativeSec)
          });
        }
        onSaveToLibrary(savedMaster);
      }

      setMergeProgressPercent(100);
      setMergeStepText('All batch clips successfully merged into 1 continuous master MP4!');

      if (autoDownload || settings.autoDownloadMerged) {
        triggerBrowserDownload(mergedVideoUrl, masterFileName);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || isCancelledRef.current) {
        setMergeStepText('Merge process cancelled.');
      } else {
        console.error('Error merging video clips:', err);
        setMergeStepText(err?.message || 'Failed to merge MP4 clips');
      }
    } finally {
      mergeAbortRef.current = null;
      setIsMerging(false);
      await releaseWakeLock();
    }
  };

  const handleDownloadMergedVideo = async () => {
    // If merged video is already ready, download immediately!
    if (mergedVideo?.videoBlob || mergedVideo?.videoUrl) {
      triggerBrowserDownload(
        mergedVideo.videoBlob || mergedVideo.videoUrl,
        `Surah_${surah.number}_${surah.englishName}_Ayah_${batchStartAyah}_to_${batchEndAyah}_Full_Merged.mp4`
      );
      return;
    }

    // If not merged yet, but completed clips exist, trigger merge and auto-download!
    const completedClips = clipsQueue.filter((c) => c.status === 'completed' && c.videoBlob);
    if (completedClips.length > 0) {
      await executeMergeAllVerses(completedClips, true);
    }
  };

  const handleDownloadMergedSrt = () => {
    if (!mergedVideo?.srtContent) return;
    downloadTextFile(
      `Surah_${surah.number}_${surah.englishName}_Ayah_${batchStartAyah}_to_${batchEndAyah}_Full_Merged.srt`,
      mergedVideo.srtContent
    );
  };

  // Retry a single failed clip
  const handleRetryClip = async (index: number) => {
    const queue = [...clipsQueue];
    const clip = queue[index];
    if (!clip) return;

    queue[index].status = 'rendering';
    queue[index].progressPercent = 0;
    queue[index].errorMessage = undefined;
    setClipsQueue([...queue]);

    const isFirstClip = index === 0;
    const isSingleVerse = clip.ayahCount === 1;

    // In 1 verse: don't add Bismillah and Surah name, leave it out
    const includeTitle =
      !isSingleVerse &&
      (settings.includeTitleCard === 'every-clip' ||
      (settings.includeTitleCard === 'first-clip-only' && isFirstClip));

    const includeSurahHeader =
      !isSingleVerse &&
      (settings.includeTitleCard === 'every-clip' ||
      (settings.includeTitleCard === 'first-clip-only' && isFirstClip));

    // Bismillah should strictly ONLY be on multi-verse opening (Ayah 1), omitted for 1 verse
    const isSurahOpening = clip.startAyah === 1 && surah.number !== 1 && surah.number !== 9;
    const includeBismillah = !isSingleVerse && isSurahOpening && settings.includeBismillah === 'surah-start-only';

    try {
      const renderResult = await renderVideoSegment(
        surah,
        clip.startAyah,
        clip.endAyah,
        config,
        {
          resolution: settings.resolution,
          includeTitleCard: includeTitle,
          includeBismillah: includeBismillah,
          includeSurahHeader: includeSurahHeader,
          onProgress: (p) => {
            queue[index].progressPercent = p.percent;
            setClipsQueue([...queue]);
          }
        }
      );

      queue[index].status = 'completed';
      queue[index].progressPercent = 100;
      queue[index].videoBlob = renderResult.videoBlob;
      queue[index].videoUrl = renderResult.videoUrl;
      queue[index].audioBlob = renderResult.audioBlob;
      queue[index].audioUrl = renderResult.audioUrl;
      queue[index].srtContent = renderResult.srtContent;
      queue[index].vttContent = renderResult.vttContent;
      queue[index].durationSec = renderResult.durationSec;
      queue[index].fileSize = renderResult.fileSize;
      setClipsQueue([...queue]);
    } catch (e: any) {
      queue[index].status = 'error';
      queue[index].errorMessage = e?.message || 'Retry failed';
      setClipsQueue([...queue]);
    }
  };

  // Download Individual Clip
  const handleDownloadSingleClip = async (clip: BatchClipItem) => {
    const source = clip.videoBlob || clip.videoUrl;
    if (!source) return;
    await triggerSafeDownload(source, `${clip.fileName}.mp4`);
  };

  // Download Individual Clip SRT
  const handleDownloadSingleSrt = (clip: BatchClipItem) => {
    if (!clip.srtContent) return;
    downloadTextFile(`${clip.fileName}.srt`, clip.srtContent);
  };

  // Download All Completed Clips as ZIP Archive
  const handleDownloadAllAsZip = async () => {
    const completedClips = clipsQueue.filter((c) => c.status === 'completed' && c.videoBlob);
    if (completedClips.length === 0) return;

    setIsCreatingZip(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const folderName = `Surah_${surah.number}_${surah.englishName}_Batch_Export`;
      const zipFolder = zip.folder(folderName) || zip;

      // Add README index
      let readmeText = `=== QURAN VIDEO MAKER - BATCH EXPORT SUMMARY ===\n\n`;
      readmeText += `Surah: #${surah.number} ${surah.englishName} (${surah.name})\n`;
      readmeText += `Translation: "${surah.englishNameTranslation}"\n`;
      readmeText += `Exported Ayah Range: Verses ${batchStartAyah} to ${batchEndAyah}\n`;
      readmeText += `Total Generated Clips: ${completedClips.length}\n`;
      readmeText += `Reciter: ${config.reciterName}\n`;
      readmeText += `Language: ${config.translationLang.toUpperCase()}\n`;
      readmeText += `Date Generated: ${new Date().toLocaleString()}\n\n`;
      readmeText += `CLIPS MANIFEST:\n`;

      completedClips.forEach((c) => {
        const ext = c.videoBlob?.type.includes('mp4') ? 'mp4' : 'webm';
        readmeText += `- Clip #${c.clipNumber}: Ayah ${c.startAyah}–${c.endAyah} | Duration: ${formatDuration(c.durationSec || 0)} | File: ${c.fileName}.${ext}\n`;
      });

      if (mergedVideo) {
        readmeText += `\nMASTER COMBINED/MERGED FULL-LENGTH VIDEO:\n`;
        readmeText += `- File: 00_SURAH_${surah.number}_FULL_MERGED_AYAH_${batchStartAyah}_TO_${batchEndAyah}.mp4\n`;
        readmeText += `- Duration: ${formatDuration(mergedVideo.durationSec)} | Size: ${mergedVideo.fileSize}\n`;
        readmeText += `- Continuous full recitation with single opening Bismillah & synchronized subtitles\n`;
      }

      zipFolder.file('MANIFEST.txt', readmeText);

      // Add Merged Master Video if ready
      if (mergedVideo?.videoBlob) {
        zipFolder.file(
          `00_SURAH_${surah.number}_FULL_MERGED_AYAH_${batchStartAyah}_TO_${batchEndAyah}.mp4`,
          mergedVideo.videoBlob
        );
        if (mergedVideo.srtContent) {
          zipFolder.file(`00_SURAH_${surah.number}_FULL_MERGED.srt`, mergedVideo.srtContent);
        }
        if (mergedVideo.vttContent) {
          zipFolder.file(`00_SURAH_${surah.number}_FULL_MERGED.vtt`, mergedVideo.vttContent);
        }
      }

      // Add Video and Subtitle files into ZIP
      for (let i = 0; i < completedClips.length; i++) {
        const clip = completedClips[i];
        if (clip.videoBlob) {
          let clipBlob = clip.videoBlob;
          const isMp4 = await isGenuineMp4Blob(clipBlob);
          if (!isMp4) {
            try {
              clipBlob = await transcodeToUniversalMp4(clipBlob, { filename: `${clip.fileName}.mp4` });
            } catch (err) {
              console.warn('Clip ZIP transcode fallback:', err);
            }
          }
          zipFolder.file(`${clip.fileName}.mp4`, clipBlob);
        }
        if (clip.srtContent) {
          zipFolder.file(`${clip.fileName}.srt`, clip.srtContent);
        }
        if (clip.vttContent) {
          zipFolder.file(`${clip.fileName}.vtt`, clip.vttContent);
        }
        setZipProgress(Math.round(((i + 1) / completedClips.length) * 80));
      }

      setZipProgress(85);
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (meta) => {
          setZipProgress(85 + Math.round(meta.percent * 0.15));
        }
      );

      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('Failed to generate ZIP archive. You can still download individual clips below.');
    } finally {
      setIsCreatingZip(false);
      setZipProgress(0);
    }
  };

  // Download All Video Files sequentially
  const handleDownloadAllSequentially = async () => {
    const completedClips = clipsQueue.filter((c) => c.status === 'completed' && c.videoUrl);
    for (let i = 0; i < completedClips.length; i++) {
      handleDownloadSingleClip(completedClips[i]);
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  if (!isOpen) return null;

  const completedCount = clipsQueue.filter((c) => c.status === 'completed').length;
  const overallProgress = clipsQueue.length > 0
    ? Math.round(
        (clipsQueue.reduce((acc, c) => {
          if (c.status === 'completed') return acc + 100;
          if (c.status === 'rendering') return acc + (c.progressPercent || 0);
          return acc;
        }, 0) /
          (clipsQueue.length * 100)) *
          100
      )
    : 0;

  const totalCalculatedDurationSec = clipsQueue
    .filter((c) => c.status === 'completed')
    .reduce((acc, c) => acc + (c.durationSec || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#0b1220] border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0e1626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Batch Exporter &amp; Long Surah Segmenter
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  Surah #{surah.number} {surah.englishName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Render consecutive verses as individual viral clips (Reels/Shorts) or partitioned chapter segments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isBatchRunning}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STATE 1: CONFIGURATION & CLIP PLANNER (when not running and not finished) */}
          {!isBatchRunning && !isBatchFinished && (
            <div className="space-y-6">
              {/* 1. Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      mode: 'full-merged-master',
                      autoMergeAllVerses: true,
                      autoDownloadMerged: true
                    }))
                  }
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.mode === 'full-merged-master'
                      ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/15'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" /> Continuous Master Video
                    </span>
                    {settings.mode === 'full-merged-master' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Renders &amp; merges all selected verses into 1 continuous master MP4 video with unified subtitles &amp; opening Bismillah.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, mode: 'individual-clips' }))}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.mode === 'individual-clips'
                      ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-400" /> Individual Clips Mode
                    </span>
                    {settings.mode === 'individual-clips' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Renders each verse or small chunk as a standalone video clip. Ideal for TikTok, Reels, Shorts &amp; daily reminders.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, mode: 'consolidated-segment' }))}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.mode === 'consolidated-segment'
                      ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" /> Chapter Segments
                    </span>
                    {settings.mode === 'consolidated-segment' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Partitions large Surahs (e.g. 100+ verses) into consecutive part files (e.g. Part 1, Part 2) to eliminate memory lag.
                  </p>
                </button>
              </div>

              {/* 2. Ayah Range Selection */}
              <div className="bg-[#121c30] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" /> Batch Ayah Range
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchStartAyah(1);
                      setBatchEndAyah(totalAyahsInSurah);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold transition-all cursor-pointer"
                  >
                    Select Entire Surah (1 to {totalAyahsInSurah})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      From Ayah:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalAyahsInSurah}
                      value={batchStartAyah}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(totalAyahsInSurah, parseInt(e.target.value, 10) || 1));
                        setBatchStartAyah(val);
                        if (val > batchEndAyah) setBatchEndAyah(val);
                      }}
                      className="w-full bg-[#17233d] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      To Ayah:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalAyahsInSurah}
                      value={batchEndAyah}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(totalAyahsInSurah, parseInt(e.target.value, 10) || totalAyahsInSurah));
                        setBatchEndAyah(val);
                        if (val < batchStartAyah) setBatchStartAyah(val);
                      }}
                      className="w-full bg-[#17233d] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Chunk Size Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Clip / Segment Partition Size
                  </label>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    {clipPlan.length} Total Clips Planned ({batchEndAyah - batchStartAyah + 1} Verses)
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: '1 Ayah', val: 1, desc: 'Reels / Shorts' },
                    { label: '2 Ayahs', val: 2, desc: 'Short Duo' },
                    { label: '3 Ayahs', val: 3, desc: 'Quick Byte' },
                    { label: '5 Ayahs', val: 5, desc: 'Mini Series' },
                    { label: '10 Ayahs', val: 10, desc: 'Standard Block' },
                    { label: '20 Ayahs', val: 20, desc: 'Long Chapter' }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, chunkSize: preset.val }))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        settings.chunkSize === preset.val
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                          : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="text-xs">{preset.label}</div>
                      <div className={`text-[10px] mt-0.5 ${settings.chunkSize === preset.val ? 'text-slate-900/80' : 'text-slate-500'}`}>
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Formatting & Title Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Title Card & Surah Name Option */}
                <div className="bg-[#121c30] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Surah Name & Title:
                    </label>
                    <span className="text-[10px] text-amber-400 font-semibold">1st Batch Only</span>
                  </div>
                  <select
                    value={settings.includeTitleCard}
                    onChange={(e) => setSettings((prev) => ({ ...prev, includeTitleCard: e.target.value as any }))}
                    className="w-full bg-[#17233d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="first-clip-only">First Batch Only (Sirf Pehle Batch me)</option>
                    <option value="every-clip">Every Batch (Har Clip me Surah ka naam)</option>
                    <option value="none">No Surah Name (Kisi me nahi)</option>
                  </select>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Surah ka naam aur Title Card sirf pehle batch me mention hoga, baki sare batches me nahi.
                  </p>
                </div>

                {/* Bismillah Option */}
                <div className="bg-[#121c30] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Bismillah Intro:
                    </label>
                    <span className="text-[10px] text-amber-400 font-semibold">Ayah 1 Only</span>
                  </div>
                  <select
                    value={settings.includeBismillah}
                    onChange={(e) => setSettings((prev) => ({ ...prev, includeBismillah: e.target.value as any }))}
                    className="w-full bg-[#17233d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="surah-start-only">Surah Start Only (Sirf Ayat 1 se pahle)</option>
                    <option value="none">Omit Bismillah (Kahi nahi)</option>
                  </select>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Bismillah sirf Surah ke aaghaz (Ayat 1) par aayega, har clip ya aage ke kisi verse me repeat nahi hoga.
                  </p>
                </div>

                {/* Resolution */}
                <div className="bg-[#121c30] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Resolution Quality:
                  </label>
                  <select
                    value={settings.resolution}
                    onChange={(e) => setSettings((prev) => ({ ...prev, resolution: e.target.value as any }))}
                    className="w-full bg-[#17233d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="fast">SD 720p (Ultra Fast Batching)</option>
                    <option value="hd">HD 1080p (Crystal Clear Master)</option>
                  </select>
                </div>
              </div>

              {/* 5. Auto Save & Auto-Merge Options Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-start justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={settings.autoMergeAllVerses}
                      onChange={(e) => setSettings((prev) => ({ ...prev, autoMergeAllVerses: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Auto-Merge All Verses</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5 leading-snug">
                        Combine all generated clips into 1 seamless continuous video
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-start justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={settings.autoDownloadMerged}
                      onChange={(e) => setSettings((prev) => ({ ...prev, autoDownloadMerged: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Auto-Download Merged MP4</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5 leading-snug">
                        Save master video to your device automatically on finish
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-start justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={settings.autoSaveToLibrary}
                      onChange={(e) => setSettings((prev) => ({ ...prev, autoSaveToLibrary: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="font-bold text-slate-200">
                        Auto-Save to Saved Library
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5 leading-snug">
                        Store individual clips &amp; merged video automatically
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 6. Visual Clip Plan Table Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Planned Clips Queue ({clipPlan.length} files to render)
                </h4>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800/80 bg-[#0e1626] divide-y divide-slate-800/60 text-xs">
                  {clipPlan.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-center">
                          {c.clipNumber}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-200">{c.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.fileName}.mp4</div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                          {c.ayahCount} {c.ayahCount === 1 ? 'Verse' : 'Verses'}
                        </span>
                        {c.ayahCount > 1 && c.startAyah === 1 && surah.number !== 1 && surah.number !== 9 && settings.includeBismillah === 'surah-start-only' ? (
                          <span className="text-[9px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">
                            ✨ Surah Start (Bismillah)
                          </span>
                        ) : c.ayahCount === 1 ? (
                          <span className="text-[9px] text-emerald-400/90 font-medium">
                            Single Verse (Direct Verse)
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">
                            Verses Only (No Bismillah)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: ACTIVE BATCH PROGRESS DASHBOARD (during execution or completed) */}
          {(isBatchRunning || isBatchFinished) && (
            <div className="space-y-6">
              {/* Overall Progress Header Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121d33] to-[#16223b] border border-amber-500/30 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        {isBatchFinished ? (
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" /> Batch Export Finished
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-amber-300">
                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            Rendering Clip {currentClipIndex + 1} of {clipsQueue.length}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        {completedCount} / {clipsQueue.length} Clips
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {currentStepText}
                    </p>
                  </div>

                  {/* Batch Controls */}
                  {isBatchRunning && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSkipClip}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                        title="Skip this clip and move to the next"
                      >
                        <SkipForward className="w-3.5 h-3.5" /> Skip
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelBatch}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Master Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Overall Batch Progress: {overallProgress}%</span>
                    <span className="font-mono text-amber-400">
                      Elapsed: {formatDuration(batchElapsedSec)}
                      {totalCalculatedDurationSec > 0 && ` • Combined Video: ${formatDuration(totalCalculatedDurationSec)}`}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* LIVE MERGE PROGRESS CARD */}
              {isMerging && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-slate-900 border border-amber-500/40 space-y-3 shadow-lg shadow-amber-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                          <span>Combining All Verses into Master Video...</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                            Ayah {batchStartAyah}–{batchEndAyah}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {mergeStepText || 'Rendering unified master timeline with non-repeating Bismillah...'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold text-amber-400 font-mono">
                        {mergeProgressPercent}%
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelBatch}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-semibold border border-red-500/30 transition-all cursor-pointer"
                      >
                        Cancel Merge
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200 rounded-full"
                      style={{ width: `${mergeProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* MASTER MERGED VIDEO RESULT CARD */}
              {mergedVideo && !isMerging && (
                <div className="p-4.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[#0e1c2e] to-amber-500/10 border border-emerald-500/40 space-y-3 shadow-xl shadow-emerald-950/20 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xl shrink-0">
                        🎬
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold tracking-wide uppercase">
                            Master Merged Video Ready
                          </span>
                          <span className="text-[11px] text-slate-300 font-mono bg-slate-800/80 px-2 py-0.5 rounded-md">
                            {formatDuration(mergedVideo.durationSec)} • {mergedVideo.fileSize}
                          </span>
                          <span className="text-[10px] text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                            Ayah {batchStartAyah}–{batchEndAyah} (Unified)
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 mt-1">
                          Surah #{surah.number} {surah.englishName} — Complete Full Video
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Sare verses ko ek single video me merge kar diya gaya hai (Opening Bismillah only, no repetition)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewClip({
                            id: 'merged-master',
                            clipNumber: 0,
                            startAyah: batchStartAyah,
                            endAyah: batchEndAyah,
                            ayahCount: batchEndAyah - batchStartAyah + 1,
                            title: `Surah ${surah.englishName} (Full Merged: Ayah ${batchStartAyah}–${batchEndAyah})`,
                            fileName: `Surah_${surah.number}_${surah.englishName}_Ayah_${batchStartAyah}_to_${batchEndAyah}_Full_Merged`,
                            status: 'completed',
                            videoBlob: mergedVideo.videoBlob,
                            videoUrl: mergedVideo.videoUrl,
                            durationSec: mergedVideo.durationSec,
                            fileSize: mergedVideo.fileSize,
                            srtContent: mergedVideo.srtContent,
                            vttContent: mergedVideo.vttContent
                          })
                        }
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Eye className="w-4 h-4 text-amber-400" /> Watch Video
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadMergedVideo}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Download Merged MP4
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadMergedSrt}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                        title="Download synchronized subtitle file for entire merged video"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" /> Subtitles (.srt)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ZIP and Batch Download Action Bar (when clips exist or batch finished) */}
              {(completedCount > 0 || isBatchFinished) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>{completedCount} Videos Ready</span>
                        {mergedVideo && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-extrabold border border-emerald-500/40">
                            Merged Master Ready
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {mergedVideo
                          ? 'Master merged full-length video + all individual clips are available'
                          : 'Download merged master video or package everything'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {/* PRIMARY PROMINENT BUTTON: Download Merged Video */}
                    <button
                      type="button"
                      onClick={handleDownloadMergedVideo}
                      disabled={isMerging}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      title="Download the full continuous merged video (MP4)"
                    >
                      {isMerging ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Merging Full Video ({mergeProgressPercent}%)...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-slate-950" />
                          <span>
                            {mergedVideo
                              ? `Download Merged Video (${mergedVideo.fileSize || 'MP4'})`
                              : '🎬 Download Merged Video (MP4)'}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Merged Subtitles Button */}
                    {mergedVideo?.srtContent && (
                      <button
                        type="button"
                        onClick={handleDownloadMergedSrt}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Download synchronized subtitles (.SRT) for merged full video"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Merged SRT</span>
                      </button>
                    )}

                    {/* Manual Re-Merge Trigger Button if needed */}
                    {!isMerging && (
                      <button
                        type="button"
                        onClick={() => executeMergeAllVerses(undefined, true)}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Re-merge all verses into one seamless master video"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>{mergedVideo ? 'Re-Merge' : 'Merge All'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadAllAsZip}
                      disabled={isCreatingZip}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Download master video + individual clips in a ZIP archive"
                    >
                      {isCreatingZip ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Packaging ZIP ({zipProgress}%)...
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" /> All in ZIP
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadAllSequentially}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="Download each individual clip directly to your browser download directory"
                    >
                      <FileVideo className="w-3.5 h-3.5 text-amber-400" /> Save All MP4s
                    </button>
                  </div>
                </div>
              )}

              {/* Clip Queue Live Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Batch Queue Items:</span>
                  <span className="text-slate-500 text-[11px]">
                    Click &apos;Preview&apos; or &apos;Watch&apos; to view completed videos
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-800 bg-[#0e1626] divide-y divide-slate-800/80">
                  {/* MASTER MERGED VIDEO ROW (Always visible at the top) */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-[#0e1f2e] to-amber-950/20 border-b border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm font-extrabold flex items-center justify-center shrink-0">
                        🎬
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                          <span>Master Merged Full Video (Ayah {batchStartAyah}–{batchEndAyah})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-extrabold border border-emerald-500/40 uppercase tracking-wider">
                            Full Length
                          </span>
                          {mergedVideo?.durationSec && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                              {formatDuration(mergedVideo.durationSec)}
                            </span>
                          )}
                          {mergedVideo?.fileSize && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {mergedVideo.fileSize}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {mergedVideo
                            ? 'Complete continuous video with synchronized voice & single opening Bismillah'
                            : isMerging
                            ? `Merging verses into master MP4 (${mergeProgressPercent}%)...`
                            : 'Continuous full video combining all verses'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {mergedVideo ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewClip({
                                id: 'merged-master',
                                clipNumber: 0,
                                startAyah: batchStartAyah,
                                endAyah: batchEndAyah,
                                ayahCount: batchEndAyah - batchStartAyah + 1,
                                title: `Surah ${surah.englishName} (Full Merged: Ayah ${batchStartAyah}–${batchEndAyah})`,
                                fileName: `Surah_${surah.number}_${surah.englishName}_Ayah_${batchStartAyah}_to_${batchEndAyah}_Full_Merged`,
                                status: 'completed',
                                videoBlob: mergedVideo.videoBlob,
                                videoUrl: mergedVideo.videoUrl,
                                durationSec: mergedVideo.durationSec,
                                fileSize: mergedVideo.fileSize,
                                srtContent: mergedVideo.srtContent,
                                vttContent: mergedVideo.vttContent
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                            title="Watch Full Master Video"
                          >
                            <Eye className="w-3.5 h-3.5" /> Watch
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadMergedVideo}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-emerald-500/30"
                            title="Download Master Merged MP4 Video"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-950" /> Download Full MP4
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadMergedSrt}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                            title="Download Full Subtitles (.SRT)"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" /> SRT
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isMerging || completedCount === 0}
                          onClick={() => executeMergeAllVerses(undefined, true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {isMerging ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{isMerging ? 'Merging...' : 'Merge & Download MP4'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {clipsQueue.map((clip, idx) => (
                    <div
                      key={clip.id}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        clip.status === 'rendering'
                          ? 'bg-amber-500/10 border-l-4 border-amber-400'
                          : clip.status === 'completed'
                          ? 'hover:bg-slate-800/40'
                          : 'opacity-70'
                      }`}
                    >
                      {/* Left: Info */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                            clip.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : clip.status === 'rendering'
                              ? 'bg-amber-500 text-slate-950 animate-pulse'
                              : clip.status === 'error'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {clip.status === 'completed' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            clip.clipNumber
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <span>{clip.title}</span>
                            {clip.fileSize && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {clip.fileSize}
                              </span>
                            )}
                            {clip.durationSec && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono">
                                {formatDuration(clip.durationSec)}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {clip.status === 'rendering' && (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Rendering frames ({clip.progressPercent}%)...
                              </span>
                            )}
                            {clip.status === 'completed' && (
                              <span className="text-emerald-400">Ready for download &amp; sharing</span>
                            )}
                            {clip.status === 'idle' && (
                              <span className="text-slate-500">Queued in batch...</span>
                            )}
                            {clip.status === 'error' && (
                              <span className="text-red-400">{clip.errorMessage || 'Error occurred'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {clip.status === 'completed' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewClip(clip)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                              title="Preview this video clip"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadSingleClip(clip)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
                              title="Download MP4 Video"
                            >
                              <Download className="w-3.5 h-3.5" /> MP4
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadSingleSrt(clip)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                              title="Download Subtitles (.SRT)"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" /> SRT
                            </button>
                          </>
                        )}

                        {clip.status === 'error' && (
                          <button
                            type="button"
                            onClick={() => handleRetryClip(idx)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/40 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW VIDEO MODAL SUB-POPUP */}
          {previewClip && previewClip.videoUrl && (
            <div className="p-4 rounded-2xl bg-[#090e18] border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Preview: {previewClip.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewClip(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  ✕ Close Preview
                </button>
              </div>

              <div className="flex justify-center bg-black/80 rounded-xl overflow-hidden max-h-72 p-2">
                <video
                  src={previewClip.videoUrl}
                  controls
                  autoPlay
                  className="max-h-64 rounded-lg object-contain"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400 font-mono">
                  {previewClip.fileName}.mp4 • {previewClip.fileSize}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleClip(previewClip)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Video File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0e1626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBatchFinished && onOpenLibrary && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLibrary();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <span>📚 View in Saved Library</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isBatchRunning && !isBatchFinished && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleStartBatch}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Start Batch Render ({clipPlan.length} Clips)</span>
                </button>
              </>
            )}

            {isBatchFinished && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadMergedVideo}
                  disabled={isMerging}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  title="Download the full continuous master MP4 video"
                >
                  {isMerging ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Download className="w-4 h-4 text-slate-950" />
                  )}
                  <span>
                    {mergedVideo
                      ? 'Download Merged Video (Full MP4)'
                      : isMerging
                      ? `Merging Full Video (${mergeProgressPercent}%)...`
                      : 'Merge & Download Full Video (MP4)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
