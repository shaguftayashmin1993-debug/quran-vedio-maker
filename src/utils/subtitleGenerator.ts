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

export function parseTimestamp(ts: string): number {
  const cleaned = ts.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(cleaned) || 0;
}

export function offsetSrtContent(
  srtContent: string,
  offsetSeconds: number,
  startingIndex: number
): { srt: string; nextIndex: number } {
  if (!srtContent || !srtContent.trim()) {
    return { srt: '', nextIndex: startingIndex };
  }

  const blocks = srtContent.trim().split(/\r?\n\s*\r?\n/);
  let currentIndex = startingIndex;
  const newBlocks: string[] = [];

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 2) continue;

    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;

    const timeMatch = timeLine.match(/(\d+:\d+:\d+[,\.]\d+)\s*-->\s*(\d+:\d+:\d+[,\.]\d+)/);
    if (!timeMatch) continue;

    const startSec = Math.max(0, parseTimestamp(timeMatch[1]) + offsetSeconds);
    const endSec = Math.max(startSec + 0.1, parseTimestamp(timeMatch[2]) + offsetSeconds);

    const textLines = lines.filter((l) => l !== lines[0] && l !== timeLine && !/^\d+$/.test(l.trim()));

    newBlocks.push(
      `${currentIndex}\n${formatTimestampSrt(startSec)} --> ${formatTimestampSrt(endSec)}\n${textLines.join('\n')}`
    );
    currentIndex++;
  }

  return { srt: newBlocks.join('\n\n'), nextIndex: currentIndex };
}

export function offsetVttContent(vttContent: string, offsetSeconds: number): string {
  if (!vttContent || !vttContent.trim()) return '';
  const cleanVtt = vttContent.replace(/^WEBVTT[^\n]*\n+/i, '').trim();
  const blocks = cleanVtt.split(/\r?\n\s*\r?\n/);
  const newBlocks: string[] = [];

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;

    const timeMatch = timeLine.match(/(\d+:\d+:\d+[,\.]\d+)\s*-->\s*(\d+:\d+:\d+[,\.]\d+)/);
    if (!timeMatch) continue;

    const startSec = Math.max(0, parseTimestamp(timeMatch[1]) + offsetSeconds);
    const endSec = Math.max(startSec + 0.1, parseTimestamp(timeMatch[2]) + offsetSeconds);

    const textLines = lines.filter((l) => l !== timeLine && !/^\d+$/.test(l.trim()));

    newBlocks.push(
      `${formatTimestampVtt(startSec)} --> ${formatTimestampVtt(endSec)}\n${textLines.join('\n')}`
    );
  }

  return newBlocks.join('\n\n');
}

