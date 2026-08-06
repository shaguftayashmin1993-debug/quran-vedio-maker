import React, { useState, useRef } from 'react';
import { X, Film, CheckCircle2, Download, FileText, Loader2, Play, Minimize2, Maximize2 } from 'lucide-react';
import { Surah, VideoConfig, SavedVideo } from '../types';
import { drawAyahFrame, drawBismillahFrame, drawTitleFrame, preloadAllBackgroundImages } from '../utils/canvasRenderer';
import { generateSrtSubtitles, generateVttSubtitles, downloadTextFile, SubtitleCue } from '../utils/subtitleGenerator';
import { fetchAudioBuffer, playAudioBufferSegment, stripBismillahFromAyah1 } from '../utils/audioUtils';
import { getAyahTranslationText } from '../utils/translationUtils';
import { SocialUploadHub } from './SocialUploadHub';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  surah: Surah;
  config: VideoConfig;
  onSaveToLibrary: (video: SavedVideo) => void;
}

export const VideoExporterModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  surah,
  config,
  onSaveToLibrary
}) => {
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStepText, setCurrentStepText] = useState<string>('');
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [generatedVideoSize, setGeneratedVideoSize] = useState<string>('0 MB');
  const [generatedCues, setGeneratedCues] = useState<SubtitleCue[]>([]);

  const [exportQuality, setExportQuality] = useState<'fast' | 'hd'>('fast');

  if (!isOpen) return null;

  const ayahsInRange = surah.ayahs
    ? surah.ayahs.filter((a) => a.num >= config.startAyah && a.num <= config.endAyah)
    : [];

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgressPercent(0);
    setExportComplete(false);
    setCurrentStepText('Pre-loading background assets & initializing audio engine...');

    // Pre-warm and ensure all background images are cached
    preloadAllBackgroundImages();

    const canvas = exportCanvasRef.current || document.createElement('canvas');
    const isPortrait = config.aspectRatio === '9:16';
    const isFast = exportQuality === 'fast';

    canvas.width = isFast ? (isPortrait ? 720 : 1280) : (isPortrait ? 1080 : 1920);
    canvas.height = isFast ? (isPortrait ? 1280 : 720) : (isPortrait ? 1920 : 1080);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    const destNode = audioCtx.createMediaStreamDestination();

    const totalAyahs = ayahsInRange.length;
    setCurrentStepText(`Fetching audio streams in parallel for ${totalAyahs} verses...`);
    setProgressPercent(10);

    // 1. Parallel fetch Bismillah buffer if needed
    const needsBismillah = surah.number !== 1 && surah.number !== 9;
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

    // 2. Parallel fetch ALL verse audio buffers at once (No slow sequential batching)
    let completedDownloads = 0;
    const verseAudioPromises = ayahsInRange.map(async (ayah) => {
      let aBuf: AudioBuffer | null = null;
      let tBuf: AudioBuffer | null = null;

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
        const translationText = getAyahTranslationText(ayah, config.translationLang);
        tBuf = await fetchAudioBuffer(
          audioCtx,
          config.translationReciterFolder,
          surah.number,
          ayah.num,
          config.gaplessAudio,
          translationText,
          config.translationLang
        );
      }

      completedDownloads++;
      const pct = Math.round((completedDownloads / totalAyahs) * 20) + 10;
      setProgressPercent(pct);
      setCurrentStepText(`Loading audio streams (${completedDownloads}/${totalAyahs} ready)...`);

      return { num: ayah.num, ayah, aBuf, tBuf };
    });

    const [bismillahBuffer, verseAudioResults] = await Promise.all([
      bismillahPromise,
      Promise.all(verseAudioPromises)
    ]);

    setCurrentStepText('Stitching audio track into gapless master timeline...');
    setProgressPercent(30);

    // 3. Build Master Audio Buffer and Timeline
    const sampleRate = audioCtx.sampleRate;
    const introSilenceSec = isFast ? 0.6 : 0.8;
    const interGapSec = 0.05; // Tight 50ms gap between verses for smooth transitions

    interface TimelineItem {
      type: 'title' | 'bismillah' | 'ayah';
      ayah?: typeof ayahsInRange[0];
      index?: number;
      startTime: number;
      endTime: number;
      duration: number;
    }

    const itemsToStitch: { type: 'bismillah' | 'ayah'; ayah?: typeof ayahsInRange[0]; index?: number; buffer: AudioBuffer | null; durationFallback: number }[] = [];

    if (needsBismillah) {
      itemsToStitch.push({
        type: 'bismillah',
        buffer: bismillahBuffer,
        durationFallback: 2.2
      });
    }

    verseAudioResults.forEach((res, idx) => {
      if (res.aBuf) {
        itemsToStitch.push({
          type: 'ayah',
          ayah: res.ayah,
          index: idx,
          buffer: res.aBuf,
          durationFallback: 2.5
        });
      }
      if (res.tBuf) {
        itemsToStitch.push({
          type: 'ayah',
          ayah: res.ayah,
          index: idx,
          buffer: res.tBuf,
          durationFallback: 2.5
        });
      }
      if (!res.aBuf && !res.tBuf) {
        itemsToStitch.push({
          type: 'ayah',
          ayah: res.ayah,
          index: idx,
          buffer: null,
          durationFallback: 2.5
        });
      }
    });

    // Compute total duration
    let totalDuration = introSilenceSec;
    itemsToStitch.forEach((item) => {
      const dur = item.buffer ? item.buffer.duration : item.durationFallback;
      totalDuration += dur + interGapSec;
    });

    const totalSamples = Math.ceil(totalDuration * sampleRate);
    const numChannels = 2;
    const masterBuffer = audioCtx.createBuffer(numChannels, totalSamples, sampleRate);

    const timeline: TimelineItem[] = [];
    timeline.push({
      type: 'title',
      startTime: 0,
      endTime: introSilenceSec,
      duration: introSilenceSec
    });

    let currentOffset = Math.round(introSilenceSec * sampleRate);

    itemsToStitch.forEach((item) => {
      const dur = item.buffer ? item.buffer.duration : item.durationFallback;
      const st = currentOffset / sampleRate;
      const et = st + dur;

      timeline.push({
        type: item.type,
        ayah: item.ayah,
        index: item.index,
        startTime: st,
        endTime: et,
        duration: dur
      });

      if (item.buffer) {
        const copyLen = Math.min(item.buffer.length, totalSamples - currentOffset);
        for (let c = 0; c < numChannels; c++) {
          const srcData = item.buffer.getChannelData(c % item.buffer.numberOfChannels);
          const destData = masterBuffer.getChannelData(c);
          destData.set(srcData.subarray(0, copyLen), currentOffset);
        }
      }

      currentOffset += Math.round((dur + interGapSec) * sampleRate);
    });

    // Generate subtitle cues from timeline entries
    const cues: SubtitleCue[] = [];
    const ayahsSeen = new Set<number>();
    timeline.forEach((item) => {
      if (item.type === 'ayah' && item.ayah && !ayahsSeen.has(item.ayah.num)) {
        ayahsSeen.add(item.ayah.num);
        cues.push({
          index: item.ayah.num,
          startTime: item.startTime,
          endTime: item.endTime,
          arabicText: stripBismillahFromAyah1(item.ayah.arabic, surah.number, item.ayah.num),
          translationText: getAyahTranslationText(item.ayah, config.translationLang)
        });
      }
    });

    // 4. Setup MediaRecorder
    const stream = canvas.captureStream(30);
    const combinedTracks = [
      ...stream.getVideoTracks(),
      ...destNode.stream.getAudioTracks()
    ];
    const mediaStream = new MediaStream(combinedTracks);

    let mediaRecorder: MediaRecorder;
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        videoBitsPerSecond: isFast ? 3000000 : 7000000
      });
    } catch (e) {
      mediaRecorder = new MediaRecorder(mediaStream);
    }

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.start(100);

    // 5. Connect and start Master Audio playback
    const masterSource = audioCtx.createBufferSource();
    masterSource.buffer = masterBuffer;
    masterSource.connect(audioCtx.destination);
    masterSource.connect(destNode);

    const startAudioTime = audioCtx.currentTime;
    masterSource.start(0);

    setCurrentStepText('Rendering & recording fast video stream...');

    // 6. High-Performance Render Loop driven by master audio clock
    await new Promise<void>((resolve) => {
      const renderInterval = setInterval(() => {
        const elapsed = audioCtx.currentTime - startAudioTime;
        const pct = Math.min(98, Math.round((elapsed / totalDuration) * 65) + 30);
        setProgressPercent(pct);

        // Find active timeline item
        let activeItem = timeline.find((t) => elapsed >= t.startTime && elapsed < t.endTime);
        if (!activeItem) {
          activeItem = elapsed < introSilenceSec ? timeline[0] : timeline[timeline.length - 1];
        }

        if (activeItem.type === 'title') {
          const p = Math.min(1.0, elapsed / 0.4);
          drawTitleFrame(ctx, canvas.width, canvas.height, surah, config, p, Date.now());
        } else if (activeItem.type === 'bismillah') {
          const p = Math.min(1.0, (elapsed - activeItem.startTime) / 0.4);
          drawBismillahFrame(ctx, canvas.width, canvas.height, config, p, Date.now());
        } else if (activeItem.type === 'ayah' && activeItem.ayah) {
          const itemElapsed = elapsed - activeItem.startTime;
          const audioProgress = Math.min(1.0, Math.max(0.0, itemElapsed / activeItem.duration));
          const p = Math.min(1.0, itemElapsed / 0.35);
          drawAyahFrame(ctx, canvas.width, canvas.height, surah, activeItem.ayah, config, p, Date.now(), audioProgress);
        }

        if (elapsed >= totalDuration) {
          clearInterval(renderInterval);
          resolve();
        }
      }, 33);
    });

    // 7. Finalize Recording
    setCurrentStepText('Finalizing video file & subtitles...');
    setProgressPercent(100);
    mediaRecorder.stop();

    await new Promise((r) => setTimeout(r, 400));

    const finalBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
    const videoUrl = URL.createObjectURL(finalBlob);
    const sizeInMB = (finalBlob.size / (1024 * 1024)).toFixed(1) + ' MB';

    setGeneratedVideoBlob(finalBlob);
    setGeneratedVideoUrl(videoUrl);
    setGeneratedVideoSize(sizeInMB);
    setGeneratedCues(cues);
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
      fileSize: sizeInMB,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    onSaveToLibrary(newSavedVideo);
  };

  const handleDownloadVideo = () => {
    if (!generatedVideoUrl) return;
    const a = document.createElement('a');
    a.href = generatedVideoUrl;
    a.download = `Surah_${surah.number}_${surah.englishName}_${config.aspectRatio === '9:16' ? 'Shorts' : 'HD'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSrt = () => {
    const srtContent = generateSrtSubtitles(generatedCues);
    downloadTextFile(`Surah_${surah.number}_${surah.englishName}_Subtitles.srt`, srtContent);
  };

  const handleDownloadVtt = () => {
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
              onClick={handleDownloadVideo}
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e1626] border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative text-slate-100">
        {/* Modal Controls (Minimize & Close) */}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize & Continue Working in Background"
            className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Minimize</span>
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-24">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Export Quran Video Studio
            </h2>
            <p className="text-xs text-slate-400">
              Surah {surah.englishName} • Verses {config.startAyah} to {config.endAyah} ({config.aspectRatio})
            </p>
          </div>
        </div>

        {/* Canvas Render Element */}
        <div className="hidden">
          <canvas ref={exportCanvasRef} />
        </div>

        {/* State 1: Before Export Starts */}
        {!isExporting && !exportComplete && (
          <div className="bg-[#141e33] p-4.5 rounded-xl border border-slate-800 space-y-4">
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
                <span className="text-slate-400">Verses to render:</span>
                <span className="font-semibold text-slate-200">{ayahsInRange.length} Verses</span>
              </div>
            </div>

            {/* Rendering Speed & Quality Mode Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
                <span>⚡ Rendering Speed & Resolution</span>
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
                    <span>⚡ Ultra-Fast Stitching</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    720p HD • Instant parallel fetch &amp; fast render
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
                    <span>🎬 Full HD 1080p</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    1080p Ultra Quality • Maximum fidelity
                  </p>
                </button>
              </div>
            </div>

            <button
              onClick={handleStartExport}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Fast Video Export</span>
            </button>
          </div>
        )}

        {/* State 2: Progress Bar during rendering */}
        {isExporting && (
          <div className="bg-[#141e33] p-6 rounded-xl border border-slate-800 space-y-4 text-center">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <div>
              <div className="text-sm font-bold text-slate-200 mb-1">{currentStepText}</div>
              <div className="text-xs text-amber-400/80">{progressPercent}% Completed</div>
            </div>

            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <button
              onClick={() => setIsMinimized(true)}
              className="mt-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium text-xs border border-amber-500/30 flex items-center justify-center gap-2 mx-auto transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Minimize &amp; Do Other Work in Background</span>
            </button>
          </div>
        )}

        {/* State 3: Export Complete */}
        {exportComplete && (
          <div className="bg-[#141e33] p-5 rounded-xl border border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Video Generation Complete!</h3>
              <p className="text-xs text-slate-400">
                File Size: {generatedVideoSize} • Added to &quot;My Videos&quot; Library
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

            {/* Video Download & Subtitle Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={handleDownloadVideo}
                className="col-span-1 sm:col-span-3 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Video File ({generatedVideoSize})</span>
              </button>

              <button
                onClick={handleDownloadSrt}
                className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>.SRT Subtitles</span>
              </button>

              <button
                onClick={handleDownloadVtt}
                className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>.VTT Subtitles</span>
              </button>

              <button
                onClick={onClose}
                className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
