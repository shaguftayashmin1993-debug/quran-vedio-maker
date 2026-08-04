import { getAudioUrl } from '../data/reciters';

export function stripBismillahFromAyah1(text: string, surahNum?: number, ayahNum?: number): string {
  if (!text) return text;
  if (surahNum !== undefined && (surahNum === 1 || surahNum === 9)) return text;
  if (ayahNum !== undefined && ayahNum !== 1) return text;

  const parts = text.trim().split(/\s+/);
  if (parts.length >= 5) {
    const stripDiacritics = (str: string) => str.replace(/[\u064B-\u065F\u0670\u0671]/g, "").replace(/ٱ/g, "ا");
    const first4Norm = stripDiacritics(parts.slice(0, 4).join(" "));
    if (first4Norm.includes("بسم") && (first4Norm.includes("الله") || first4Norm.includes("لله")) && first4Norm.includes("رحم")) {
      return parts.slice(4).join(" ");
    }
  }
  return text;
}

/**
 * Trims silent PCM sample padding at the start and end of an AudioBuffer
 * to ensure 100% gapless continuous concatenation of verses with zero vacant space.
 */
export function trimAudioBufferSilence(
  audioCtx: AudioContext,
  buffer: AudioBuffer,
  threshold = 0.012
): AudioBuffer {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  // Find max peak amplitude across all channels
  let maxPeak = 0;
  for (let c = 0; c < numChannels; c++) {
    const channelData = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
  }

  // Dynamic threshold: trim anything below ~3.5% of max speech volume or min 0.01
  const effectiveThreshold = Math.max(0.008, Math.min(threshold, maxPeak * 0.035));

  let startSample = 0;
  let endSample = length - 1;

  // Find start of active recitation audio
  findStart: for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      if (Math.abs(buffer.getChannelData(c)[i]) > effectiveThreshold) {
        // Keep a tiny 15ms lead-in padding (approx 660 samples at 44.1kHz)
        startSample = Math.max(0, i - Math.round(sampleRate * 0.015));
        break findStart;
      }
    }
  }

  // Find end of active recitation audio
  findEnd: for (let i = length - 1; i >= startSample; i--) {
    for (let c = 0; c < numChannels; c++) {
      if (Math.abs(buffer.getChannelData(c)[i]) > effectiveThreshold) {
        // Keep a tiny 15ms trail-out padding
        endSample = Math.min(length - 1, i + Math.round(sampleRate * 0.015));
        break findEnd;
      }
    }
  }

  const trimmedLength = Math.max(100, endSample - startSample + 1);
  const trimmedBuffer = audioCtx.createBuffer(numChannels, trimmedLength, sampleRate);

  // Apply a 3ms micro fade-in and fade-out to prevent digital clicks
  const fadeSamples = Math.min(Math.round(sampleRate * 0.003), Math.floor(trimmedLength / 2));

  for (let c = 0; c < numChannels; c++) {
    const channelData = buffer.getChannelData(c);
    const trimmedData = trimmedBuffer.getChannelData(c);
    for (let i = 0; i < trimmedLength; i++) {
      let sample = channelData[startSample + i];

      // Fade-in window
      if (i < fadeSamples) {
        sample *= i / fadeSamples;
      }
      // Fade-out window
      else if (i >= trimmedLength - fadeSamples) {
        sample *= (trimmedLength - 1 - i) / fadeSamples;
      }

      trimmedData[i] = sample;
    }
  }

  return trimmedBuffer;
}

const audioBufferCache = new Map<string, AudioBuffer>();

/**
 * Fetches and decodes an audio file from EveryAyah/Proxy into a Web Audio AudioBuffer.
 * Includes automatic TTS speech fallback if human recitation MP3 is unavailable.
 */
export async function fetchAudioBuffer(
  audioCtx: AudioContext,
  folder: string,
  surahNum: number,
  ayahNum: number,
  trimSilence = true,
  fallbackText?: string,
  fallbackLang?: string
): Promise<AudioBuffer | null> {
  const cacheKey = `${folder}:${surahNum}:${ayahNum}:${trimSilence}:${fallbackText || ''}:${fallbackLang || ''}`;
  if (audioBufferCache.has(cacheKey)) {
    return audioBufferCache.get(cacheKey)!;
  }

  let resultBuffer: AudioBuffer | null = null;

  // If folder is AI Spoken Voice (tts-ur, tts-en, etc), directly generate synthetic speech from /api/tts
  if (folder.startsWith('tts')) {
    if (fallbackText) {
      try {
        const lang = fallbackLang || (folder.startsWith('tts-') ? folder.replace('tts-', '') : 'ur');
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fallbackText, lang })
        });
        if (ttsRes.ok) {
          const arrayBuffer = await ttsRes.arrayBuffer();
          const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          resultBuffer = trimSilence ? trimAudioBufferSilence(audioCtx, decodedBuffer) : decodedBuffer;
        }
      } catch (e) {
        console.error('AI TTS Spoken Voice generation failed:', e);
      }
    }
  } else {
    try {
      const url = getAudioUrl(folder, surahNum, ayahNum);
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        resultBuffer = trimSilence ? trimAudioBufferSilence(audioCtx, decodedBuffer) : decodedBuffer;
      }
    } catch (err) {
      console.warn(`Primary audio stream for ${folder} ${surahNum}:${ayahNum} failed, trying TTS fallback...`, err);
    }

    // Fallback: Fetch speech stream from server TTS API if text is available
    if (!resultBuffer && fallbackText) {
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fallbackText, lang: fallbackLang || 'ur' })
        });
        if (ttsRes.ok) {
          const arrayBuffer = await ttsRes.arrayBuffer();
          const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          resultBuffer = trimSilence ? trimAudioBufferSilence(audioCtx, decodedBuffer) : decodedBuffer;
        }
      } catch (e) {
        console.error('Fallback TTS generation failed:', e);
      }
    }
  }

  if (resultBuffer) {
    audioBufferCache.set(cacheKey, resultBuffer);
  }

  return resultBuffer;
}

/**
 * Plays an AudioBuffer seamlessly through an AudioContext and returns a Promise that resolves
 * exactly when the buffer finishes playing.
 */
export function playAudioBufferSegment(
  audioCtx: AudioContext,
  buffer: AudioBuffer,
  destNode?: MediaStreamAudioDestinationNode
): { promise: Promise<void>; stop: () => void } {
  const sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = buffer;

  sourceNode.connect(audioCtx.destination);
  if (destNode) {
    sourceNode.connect(destNode);
  }

  let stopped = false;

  const promise = new Promise<void>((resolve) => {
    sourceNode.onended = () => {
      resolve();
    };
    sourceNode.start(0);
  });

  const stop = () => {
    if (!stopped) {
      stopped = true;
      try {
        sourceNode.stop();
        sourceNode.disconnect();
      } catch (e) {
        // Ignored if already stopped
      }
    }
  };

  return { promise, stop };
}
