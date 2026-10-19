import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Play, Pause, Trash2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Volume2, Sparkles, FileAudio, Download } from 'lucide-react';
import { Surah, VideoConfig } from '../types';
import { getAyahTranslationText } from '../utils/translationUtils';

interface OwnVoiceRecorderCardProps {
  type: 'recitation' | 'translation';
  surah: Surah | null;
  config: VideoConfig;
  onChange: (updated: Partial<VideoConfig>) => void;
}

export const OwnVoiceRecorderCard: React.FC<OwnVoiceRecorderCardProps> = ({
  type,
  surah,
  config,
  onChange
}) => {
  const isRecitation = type === 'recitation';
  const startAyah = config.startAyah || 1;
  const endAyah = config.endAyah || 1;

  // Selected ayah to record for
  const [activeAyahNum, setActiveAyahNum] = useState<number>(startAyah);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync active ayah if range changed
  useEffect(() => {
    if (activeAyahNum < startAyah || activeAyahNum > endAyah) {
      setActiveAyahNum(startAyah);
    }
  }, [startAyah, endAyah]);

  // Clean up audio playback on unmount or change
  useEffect(() => {
    return () => {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Current custom audio URLs
  const customAudios = isRecitation ? (config.customRecitationAudios || {}) : (config.customTranslationAudios || {});
  const currentAyahAudio = customAudios[activeAyahNum] || (isRecitation ? config.customRecitationUrl : config.customTranslationUrl);

  // Verses in range
  const ayahsInRange = surah?.ayahs?.filter((a) => a.num >= startAyah && a.num <= endAyah) || [];
  const currentAyahData = ayahsInRange.find((a) => a.num === activeAyahNum) || ayahsInRange[0];

  // Count recorded verses
  const recordedCount = ayahsInRange.filter((a) => !!customAudios[a.num]).length;

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Audio level analyser
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const aCtx = new AudioCtxClass();
          audioContextRef.current = aCtx;
          const source = aCtx.createMediaStreamSource(stream);
          const analyser = aCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkLevel = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setMicVolume(Math.min(100, Math.round((avg / 120) * 100)));
            animFrameRef.current = requestAnimationFrame(checkLevel);
          };
          animFrameRef.current = requestAnimationFrame(checkLevel);
        }
      } catch (analyserErr) {
        console.warn('Audio analyser setup note:', analyserErr);
      }

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const blobUrl = URL.createObjectURL(audioBlob);

        // Save recorded audio for current ayah
        if (isRecitation) {
          const nextMap = { ...(config.customRecitationAudios || {}), [activeAyahNum]: blobUrl };
          onChange({
            customRecitationAudios: nextMap,
            customRecitationUrl: blobUrl,
            reciterFolder: 'custom-own-voice',
            reciterName: 'Your Own Voice Recitation'
          });
        } else {
          const nextMap = { ...(config.customTranslationAudios || {}), [activeAyahNum]: blobUrl };
          onChange({
            customTranslationAudios: nextMap,
            customTranslationUrl: blobUrl,
            translationReciterFolder: 'custom-own-voice-translation',
            translationReciterName: 'Your Own Voice Translation'
          });
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setMicError('Microphone permission denied. Please allow microphone access in your browser.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicVolume(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    if (isRecitation) {
      const nextMap = { ...(config.customRecitationAudios || {}), [activeAyahNum]: fileUrl };
      onChange({
        customRecitationAudios: nextMap,
        customRecitationUrl: fileUrl,
        reciterFolder: 'custom-own-voice',
        reciterName: 'Your Own Voice Recitation'
      });
    } else {
      const nextMap = { ...(config.customTranslationAudios || {}), [activeAyahNum]: fileUrl };
      onChange({
        customTranslationAudios: nextMap,
        customTranslationUrl: fileUrl,
        translationReciterFolder: 'custom-own-voice-translation',
        translationReciterName: 'Your Own Voice Translation'
      });
    }
  };

  const handleApplyToAllVerses = () => {
    if (!currentAyahAudio) return;
    if (isRecitation) {
      const nextMap: { [num: number]: string } = {};
      ayahsInRange.forEach((a) => {
        nextMap[a.num] = currentAyahAudio;
      });
      onChange({
        customRecitationAudios: nextMap,
        customRecitationUrl: currentAyahAudio
      });
    } else {
      const nextMap: { [num: number]: string } = {};
      ayahsInRange.forEach((a) => {
        nextMap[a.num] = currentAyahAudio;
      });
      onChange({
        customTranslationAudios: nextMap,
        customTranslationUrl: currentAyahAudio
      });
    }
  };

  const handleDeleteAudio = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current = null;
      setIsPlayingTest(false);
    }

    if (isRecitation) {
      const nextMap = { ...(config.customRecitationAudios || {}) };
      delete nextMap[activeAyahNum];
      onChange({
        customRecitationAudios: nextMap,
        customRecitationUrl: Object.values(nextMap)[0] || undefined
      });
    } else {
      const nextMap = { ...(config.customTranslationAudios || {}) };
      delete nextMap[activeAyahNum];
      onChange({
        customTranslationAudios: nextMap,
        customTranslationUrl: Object.values(nextMap)[0] || undefined
      });
    }
  };

  const toggleTestPlayback = () => {
    if (!currentAyahAudio) return;

    if (isPlayingTest && testAudioRef.current) {
      testAudioRef.current.pause();
      setIsPlayingTest(false);
      return;
    }

    const audio = new Audio(currentAyahAudio);
    testAudioRef.current = audio;
    audio.play().then(() => {
      setIsPlayingTest(true);
    }).catch((e) => {
      console.warn('Playback error:', e);
      setIsPlayingTest(false);
    });

    audio.onended = () => {
      setIsPlayingTest(false);
    };
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-b from-[#131b2d] to-[#0c1322] border border-amber-500/50 shadow-xl space-y-3.5 mt-2">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
              {isRecitation ? '🎙️ Record Your Own Recitation Voice' : '🎙️ Record Your Own Translation Voice'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {isRecitation
                ? 'Speak or recite directly into your microphone or upload your custom audio.'
                : 'Read and record your own translation voice in Urdu, Hindi, English, etc.'}
            </p>
          </div>
        </div>

        {/* Recorded Verses Counter */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-[11px] font-semibold text-slate-300 bg-[#080d18] px-2.5 py-1 rounded-lg border border-slate-800">
            {recordedCount}/{ayahsInRange.length} Verses Ready
          </span>
          {recordedCount > 0 && recordedCount < ayahsInRange.length && (
            <button
              type="button"
              onClick={handleApplyToAllVerses}
              className="text-[10px] text-amber-300 hover:text-amber-200 underline font-medium cursor-pointer"
              title="Apply this audio track to all verses in the range"
            >
              Apply to all
            </button>
          )}
        </div>
      </div>

      {micError && (
        <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{micError}</span>
        </div>
      )}

      {/* Verses Scroller Pill Bar (if multiple verses) */}
      {ayahsInRange.length > 1 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Select Verse to Record:</span>
            <span>Ayah {activeAyahNum} of {ayahsInRange[ayahsInRange.length - 1]?.num}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {ayahsInRange.map((a) => {
              const hasAudio = !!customAudios[a.num];
              const isActive = a.num === activeAyahNum;
              return (
                <button
                  key={a.num}
                  type="button"
                  onClick={() => setActiveAyahNum(a.num)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : hasAudio
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>Verse {a.num}</span>
                  {hasAudio && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Teleprompter / Text Prompt */}
      {currentAyahData && (
        <div className="p-3.5 rounded-xl bg-[#080d18] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-amber-400">
              📖 {isRecitation ? 'Recite This Verse' : 'Read This Translation'} (Ayah {currentAyahData.num}):
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activeAyahNum <= startAyah}
                onClick={() => setActiveAyahNum((prev) => Math.max(startAyah, prev - 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={activeAyahNum >= endAyah}
                onClick={() => setActiveAyahNum((prev) => Math.min(endAyah, prev + 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Arabic Text Display */}
          {isRecitation ? (
            <div className="text-right text-lg sm:text-xl font-arabic text-amber-200 leading-loose tracking-wide py-1 px-2 select-text">
              {currentAyahData.arabic}
            </div>
          ) : (
            /* Translation Text Display */
            <div className="text-left text-sm text-slate-200 leading-relaxed font-medium py-1 px-2 select-text bg-[#0e1626]/80 rounded-lg border border-slate-800/60">
              {getAyahTranslationText(currentAyahData, config.translationLang) || currentAyahData.english || 'No translation text available.'}
            </div>
          )}
        </div>
      )}

      {/* Recording Actions & Waveform Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        {/* Left: Record / Stop Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>{currentAyahAudio ? 'Re-record Ayah' : 'Record with Mic'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Recording ({formatSecs(recordingSeconds)})</span>
            </button>
          )}

          {/* File Upload Button */}
          <label className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[#18233a] hover:bg-[#213050] text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload File</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Right: Audio Playback Test, Download & Delete */}
        {currentAyahAudio && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={toggleTestPlayback}
              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Test listen to recorded audio"
            >
              {isPlayingTest ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlayingTest ? 'Pause' : 'Test Listen'}</span>
            </button>

            <a
              href={currentAyahAudio}
              download={`ayah-${activeAyahNum}-${type}-voice.webm`}
              className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer"
              title="Download recorded audio file"
            >
              <Download className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleDeleteAudio}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-all cursor-pointer"
              title="Delete audio for this verse"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Recording in progress indicator with live audio volume meter */}
      {isRecording && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-red-300">
                Recording Live: Speak clearly into microphone... ({formatSecs(recordingSeconds)})
              </span>
            </div>
            <span className="text-[11px] font-mono text-red-300 font-bold">{micVolume}% Vol</span>
          </div>

          {/* Dynamic Mic Level Visualizer Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-red-500/20">
            <div
              className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full transition-all duration-75 rounded-full"
              style={{ width: `${Math.max(5, micVolume)}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Confirmation Badge */}
      {currentAyahAudio && !isRecording && (
        <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ayah {activeAyahNum} {isRecitation ? 'Recitation' : 'Translation'} audio ready &amp; active in studio</span>
          </span>
          <span className="text-slate-400 font-mono text-[10px]">Saved</span>
        </div>
      )}
    </div>
  );
};
