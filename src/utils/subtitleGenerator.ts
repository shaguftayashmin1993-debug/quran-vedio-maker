import { Ayah, Surah } from '../types';

function formatTimestampSrt(seconds: number): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

function formatTimestampVtt(seconds: number): string {
  return formatTimestampSrt(seconds).replace(',', '.');
}

export interface SubtitleCue {
  index: number;
  startTime: number;
  endTime: number;
  arabicText: string;
  translationText: string;
}

export function generateSrtSubtitles(cues: SubtitleCue[]): string {
  return cues
    .map((cue) => {
      const start = formatTimestampSrt(cue.startTime);
      const end = formatTimestampSrt(cue.endTime);
      return `${cue.index}\n${start} --> ${end}\n${cue.arabicText}\n${cue.translationText}\n`;
    })
    .join('\n');
}

export function generateVttSubtitles(cues: SubtitleCue[]): string {
  const header = 'WEBVTT - Quran Video Subtitles\n\n';
  const body = cues
    .map((cue) => {
      const start = formatTimestampVtt(cue.startTime);
      const end = formatTimestampVtt(cue.endTime);
      return `${cue.index}\n${start} --> ${end}\n${cue.arabicText}\n${cue.translationText}\n`;
    })
    .join('\n');
  return header + body;
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
