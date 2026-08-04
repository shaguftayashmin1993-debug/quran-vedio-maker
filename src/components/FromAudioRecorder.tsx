import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Sparkles, CheckCircle2, Film } from 'lucide-react';
import { SurahMeta, SURAHS } from '../data/surahs';

interface AudioRecorderProps {
  onRecitationAligned: (surah: SurahMeta, audioBlobUrl: string) => void;
}

export const FromAudioRecorder: React.FC<AudioRecorderProps> = ({ onRecitationAligned }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [surahHint, setSurahHint] = useState<string>('Al-Kahf');
  const [alignmentSuccess, setAlignmentSuccess] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setRecordedAudioUrl(url);
    }
  };

  const handleAlignAndGenerate = () => {
    if (!recordedAudioUrl) return;

    // Search for surah from hint
    const cleanHint = surahHint.trim().toLowerCase();
    const found = SURAHS.find(
      (s) =>
        s.englishName.toLowerCase().includes(cleanHint) ||
        s.number.toString() === cleanHint ||
        s.aliases.some((a) => a.includes(cleanHint))
    ) || SURAHS[17]; // default to Al-Kahf

    setAlignmentSuccess(true);
    onRecitationAligned(found, recordedAudioUrl);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#0e1626] rounded-2xl border border-slate-800/80 p-6 shadow-xl space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            From Audio / Microphone Agent
          </h2>
          <p className="text-xs text-slate-400">
            Record your own recitation or upload an MP3 audio file. We align verse timing &amp; render your custom video.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Box 1: Microphone Recording */}
        <div className="bg-[#141e33] p-5 rounded-xl border border-slate-800 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center mx-auto">
            <Mic className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-200">Record Microphone</h3>
            <p className="text-xs text-slate-400">Recite clearly into your device microphone</p>
          </div>

          {isRecording && (
            <div className="text-xl font-mono font-bold text-amber-400 animate-pulse">
              ● {formatTime(recordingTime)}
            </div>
          )}

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop &amp; Save Recording</span>
            </button>
          )}
        </div>

        {/* Box 2: File Upload */}
        <div className="bg-[#141e33] p-5 rounded-xl border border-slate-800 space-y-4 text-center flex flex-col justify-between">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-200">Upload Recitation File</h3>
            <p className="text-xs text-slate-400">MP3, WAV, M4A or MP4 video file</p>
          </div>

          <label className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Select File...</span>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Surah Alignment & Player */}
      {recordedAudioUrl && (
        <div className="bg-[#121c30] p-5 rounded-xl border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Audio Track Ready
            </span>
            <audio src={recordedAudioUrl} controls className="h-8 max-w-[240px]" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-slate-300">
              Surah Name / Hint (for automatic verse timestamp alignment):
            </label>
            <input
              type="text"
              value={surahHint}
              onChange={(e) => setSurahHint(e.target.value)}
              placeholder="e.g. Al-Kahf, Yasin, Al-Mulk"
              className="w-full bg-[#16243d] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none"
            />
          </div>

          <button
            onClick={handleAlignAndGenerate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Film className="w-4 h-4" />
            <span>Align Verse Timestamps &amp; Open Studio</span>
          </button>

          {alignmentSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Aligned to Surah! Switching to Studio Creator with your audio track...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
