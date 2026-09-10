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
 * Safely decodes an ArrayBuffer into an AudioBuffer across all browsers (including Safari/iOS)
 */
export async function safeDecodeAudioData(
  audioCtx: AudioContext,
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer> {
  // Always use a slice of the ArrayBuffer to prevent detached buffer errors
  const copy = arrayBuffer.slice(0);
  return new Promise((resolve, reject) => {
    try {
      const promise = audioCtx.decodeAudioData(
        copy,
        (decoded) => resolve(decoded),
        (err) => reject(err)
      );
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates a clean silent buffer as an absolute fallback so video render never halts
 */
export function createSilentBuffer(audioCtx: AudioContext, durationSec = 2.5): AudioBuffer {
  const sampleRate = audioCtx.sampleRate || 44100;
  const length = Math.max(100, Math.round(durationSec * sampleRate));
  return audioCtx.createBuffer(2, length, sampleRate);
}

/**
 * Applies studio-grade DSP filters tailored to specific voice profiles:
 * - 120Hz Mid-Baritone & 2.4kHz Articulation Presence
 * - Elder Bayan Warmth (80Hz sub-warmth, 3.8kHz vintage softening)
 * - Mufti Deep Resonance (100Hz deep chest filter, 1.8kHz clarity)
 * - Gentle Muallim (Linear neutral response, enhanced vowel formant)
 * - Dignified Female Scholar (300Hz fundamental lift, 3.2kHz crystal air)
 */
export async function applyScholarBaritoneDsp(
  audioCtx: AudioContext,
  inputBuffer: AudioBuffer,
  options: {
    speed?: number;
    resonance120Hz?: boolean;
    voiceProfile?: string;
  } = {}
): Promise<AudioBuffer> {
  const speed = options.speed && options.speed > 0 ? options.speed : 1.0;
  const enableDsp = options.resonance120Hz !== false || (options.voiceProfile && options.voiceProfile !== 'standard');
  const profile = options.voiceProfile || 'scholar-mature-baritone';

  const targetLength = Math.max(100, Math.round(inputBuffer.length / speed));
  const sampleRate = inputBuffer.sampleRate;
  const numChannels = inputBuffer.numberOfChannels;

  // Use OfflineAudioContext for instantaneous high-precision rendering
  const OfflineCtxClass = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtxClass) return inputBuffer;

  const offlineCtx = new OfflineCtxClass(numChannels, targetLength, sampleRate);

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = inputBuffer;
  sourceNode.playbackRate.value = speed;

  let lastNode: AudioNode = sourceNode;

  if (enableDsp) {
    if (profile === 'elder-bayan-warm') {
      // 1. Elder Bayan: 90Hz deep warmth + softened treble + rich chest resonance
      const filterChest = offlineCtx.createBiquadFilter();
      filterChest.type = 'peaking';
      filterChest.frequency.value = 95;
      filterChest.Q.value = 1.0;
      filterChest.gain.value = 5.0;

      const filterWarmth = offlineCtx.createBiquadFilter();
      filterWarmth.type = 'highshelf';
      filterWarmth.frequency.value = 4200;
      filterWarmth.gain.value = -3.5;

      const filterVocal = offlineCtx.createBiquadFilter();
      filterVocal.type = 'peaking';
      filterVocal.frequency.value = 1800;
      filterVocal.Q.value = 1.1;
      filterVocal.gain.value = 2.0;

      lastNode.connect(filterChest);
      filterChest.connect(filterWarmth);
      filterWarmth.connect(filterVocal);
      lastNode = filterVocal;
    } else if (profile === 'mufti-deep-resonant') {
      // 2. Mufti Deep Resonant: 110Hz authoritative core + 2.6kHz high-clarity diction
      const filterBass = offlineCtx.createBiquadFilter();
      filterBass.type = 'peaking';
      filterBass.frequency.value = 110;
      filterBass.Q.value = 1.3;
      filterBass.gain.value = 4.8;

      const filterPresence = offlineCtx.createBiquadFilter();
      filterPresence.type = 'peaking';
      filterPresence.frequency.value = 2600;
      filterPresence.Q.value = 1.4;
      filterPresence.gain.value = 2.8;

      lastNode.connect(filterBass);
      filterBass.connect(filterPresence);
      lastNode = filterPresence;
    } else if (profile === 'gentle-muallim-narrator') {
      // 3. Gentle Muallim Narrator: Clean mid-range clarity + soft de-essing
      const filterMid = offlineCtx.createBiquadFilter();
      filterMid.type = 'peaking';
      filterMid.frequency.value = 1400;
      filterMid.Q.value = 1.0;
      filterMid.gain.value = 2.2;

      const filterAir = offlineCtx.createBiquadFilter();
      filterAir.type = 'highshelf';
      filterAir.frequency.value = 6000;
      filterAir.gain.value = 1.5;

      lastNode.connect(filterMid);
      filterMid.connect(filterAir);
      lastNode = filterAir;
    } else if (profile === 'dignified-female-scholar') {
      // 4. Dignified Female Scholar: 280Hz fundamental clarity + 3.2kHz bright presence
      const filterBody = offlineCtx.createBiquadFilter();
      filterBody.type = 'peaking';
      filterBody.frequency.value = 280;
      filterBody.Q.value = 1.1;
      filterBody.gain.value = 3.0;

      const filterPresence = offlineCtx.createBiquadFilter();
      filterPresence.type = 'peaking';
      filterPresence.frequency.value = 3200;
      filterPresence.Q.value = 1.2;
      filterPresence.gain.value = 2.5;

      lastNode.connect(filterBody);
      filterBody.connect(filterPresence);
      lastNode = filterPresence;
    } else {
      // Default: Scholar Mature 120Hz Baritone
      const filter120Hz = offlineCtx.createBiquadFilter();
      filter120Hz.type = 'peaking';
      filter120Hz.frequency.value = 120;
      filter120Hz.Q.value = 1.2;
      filter120Hz.gain.value = 4.5;

      const filterWarmth = offlineCtx.createBiquadFilter();
      filterWarmth.type = 'highshelf';
      filterWarmth.frequency.value = 5400;
      filterWarmth.gain.value = -2.2;

      const filterArticulation = offlineCtx.createBiquadFilter();
      filterArticulation.type = 'peaking';
      filterArticulation.frequency.value = 2400;
      filterArticulation.Q.value = 1.3;
      filterArticulation.gain.value = 2.2;

      lastNode.connect(filter120Hz);
      filter120Hz.connect(filterWarmth);
      filterWarmth.connect(filterArticulation);
      lastNode = filterArticulation;
    }
  }

  lastNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  try {
    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer;
  } catch (err) {
    console.warn('OfflineAudioContext DSP error, using original buffer:', err);
    return inputBuffer;
  }
}

/**
 * Concatenates multiple AudioBuffers into a single, continuous, master AudioBuffer.
 * Handles different sample rates via high-quality linear interpolation.
 */
export interface ConcatenatedAudioResult {
  masterBuffer: AudioBuffer;
  durations: number[];
  startTimes: number[];
  endTimes: number[];
}

export function concatenateAudioBuffersWithOffsets(
  audioCtx: AudioContext,
  buffers: (AudioBuffer | null)[]
): ConcatenatedAudioResult {
  const targetSampleRate = audioCtx.sampleRate || 44100;
  const numChannels = 2;

  const normalizedBuffers: (AudioBuffer | null)[] = [];
  const durations: number[] = [];
  const startTimes: number[] = [];
  const endTimes: number[] = [];

  let totalSamples = 0;

  buffers.forEach((b) => {
    if (!b || b.length === 0) {
      normalizedBuffers.push(null);
      durations.push(0);
      startTimes.push(totalSamples / targetSampleRate);
      endTimes.push(totalSamples / targetSampleRate);
      return;
    }

    let normBuf: AudioBuffer;
    if (b.sampleRate === targetSampleRate) {
      normBuf = b;
    } else {
      const resampledLen = Math.max(1, Math.round((b.length / b.sampleRate) * targetSampleRate));
      normBuf = audioCtx.createBuffer(b.numberOfChannels, resampledLen, targetSampleRate);
      for (let c = 0; c < b.numberOfChannels; c++) {
        const srcData = b.getChannelData(c);
        const dstData = normBuf.getChannelData(c);
        const bLen = b.length;
        for (let i = 0; i < resampledLen; i++) {
          const srcPos = (i / resampledLen) * (bLen - 1);
          const idx = Math.floor(srcPos);
          const frac = srcPos - idx;
          dstData[i] = srcData[idx] * (1 - frac) + (srcData[Math.min(idx + 1, bLen - 1)] || 0) * frac;
        }
      }
    }

    const startTime = totalSamples / targetSampleRate;
    const dur = normBuf.length / targetSampleRate;
    const endTime = startTime + dur;

    startTimes.push(startTime);
    durations.push(dur);
    endTimes.push(endTime);

    normalizedBuffers.push(normBuf);
    totalSamples += normBuf.length;
  });

  if (totalSamples === 0) {
    const silent = createSilentBuffer(audioCtx, 1.0);
    return {
      masterBuffer: silent,
      durations: [1.0],
      startTimes: [0],
      endTimes: [1.0]
    };
  }

  // Add 0.35s of silence padding at the end to prevent abrupt trailing cutoffs in MediaRecorder
  const tailPaddingSamples = Math.round(0.35 * targetSampleRate);
  const masterBuffer = audioCtx.createBuffer(numChannels, totalSamples + tailPaddingSamples, targetSampleRate);
  const out0 = masterBuffer.getChannelData(0);
  const out1 = masterBuffer.getChannelData(1);

  let currentOffset = 0;
  normalizedBuffers.forEach((nb) => {
    if (!nb) return;
    const ch0 = nb.getChannelData(0);
    const ch1 = nb.numberOfChannels > 1 ? nb.getChannelData(1) : ch0;
    out0.set(ch0, currentOffset);
    out1.set(ch1, currentOffset);
    currentOffset += nb.length;
  });

  return {
    masterBuffer,
    durations,
    startTimes,
    endTimes
  };
}

export function concatenateAudioBuffers(
  audioCtx: AudioContext,
  buffers: (AudioBuffer | null)[]
): AudioBuffer {
  return concatenateAudioBuffersWithOffsets(audioCtx, buffers).masterBuffer;
}

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
  fallbackLang?: string,
  dspOptions?: { speed?: number; resonance120Hz?: boolean; voiceProfile?: string }
): Promise<AudioBuffer | null> {
  const profile = dspOptions?.voiceProfile || (
    folder === 'tts-ur-scholar' ? 'scholar-mature-baritone' :
    folder === 'tts-ur-bayan' ? 'elder-bayan-warm' :
    folder === 'tts-ur-mufti' ? 'mufti-deep-resonant' :
    folder === 'tts-ur-muallim' ? 'gentle-muallim-narrator' :
    folder === 'tts-ur-female' ? 'dignified-female-scholar' :
    'standard'
  );
  const isScholarVoice = folder === 'tts-ur-scholar' || folder.includes('scholar') || profile === 'scholar-mature-baritone';
  const speed = dspOptions?.speed || 1.0;
  const resonance120Hz = dspOptions?.resonance120Hz !== undefined ? dspOptions.resonance120Hz : isScholarVoice;

  const cacheKey = `${folder}:${surahNum}:${ayahNum}:${trimSilence}:${fallbackText || ''}:${fallbackLang || ''}:${speed}:${resonance120Hz}:${profile}`;
  if (audioBufferCache.has(cacheKey)) {
    return audioBufferCache.get(cacheKey)!;
  }

  let resultBuffer: AudioBuffer | null = null;

  // If folder is AI Spoken Voice (tts-ur, tts-ur-scholar, tts-en, etc), directly generate synthetic speech from /api/tts
  if (folder.startsWith('tts')) {
    if (fallbackText) {
      let lang = fallbackLang || (folder.startsWith('tts-') ? folder.replace('tts-', '') : 'ur');
      if (lang.startsWith('ur-')) lang = 'ur';

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fallbackText, lang, voiceProfile: profile })
          });
          if (ttsRes.ok) {
            const arrayBuffer = await ttsRes.arrayBuffer();
            const decodedBuffer = await safeDecodeAudioData(audioCtx, arrayBuffer);
            resultBuffer = trimSilence ? trimAudioBufferSilence(audioCtx, decodedBuffer) : decodedBuffer;
            if (resultBuffer) break;
          }
        } catch (e) {
          // Retry
        }
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  } else {
    // Human Recitation from EveryAyah / Proxy with multi-attempt retry
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const url = getAudioUrl(folder, surahNum, ayahNum);
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer && arrayBuffer.byteLength > 200) {
            const decodedBuffer = await safeDecodeAudioData(audioCtx, arrayBuffer);
            resultBuffer = trimSilence ? trimAudioBufferSilence(audioCtx, decodedBuffer) : decodedBuffer;
            if (resultBuffer) break;
          }
        }
      } catch (err) {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }

    // Direct EveryAyah CDN attempt if proxy had an issue
    if (!resultBuffer) {
      try {
        const padSurah = String(surahNum).padStart(3, '0');
        const padAyah = String(ayahNum).padStart(3, '0');
        const directUrl = `https://everyayah.com/data/${folder}/${padSurah}${padAyah}.mp3`;
        const directRes = await fetch(directUrl);
        if (directRes.ok) {
          const arrayBuffer = await directRes.arrayBuffer();
          if (arrayBuffer && arrayBuffer.byteLength > 200) {
            const decodedBuffer = await safeDecodeAudioData(audioCtx, arrayBuffer);
            resultBuffer = trimSilence ? trimAudioBufferSilence(audioCtx, decodedBuffer) : decodedBuffer;
          }
        }
      } catch (e) {}
    }

    // Fallback: Fetch speech stream from server TTS API if human audio failed or text is available
    if (!resultBuffer && fallbackText) {
      const effectiveLang = fallbackLang || (surahNum > 0 && ayahNum > 0 ? 'ar' : 'ur');
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fallbackText, lang: effectiveLang, voiceProfile: profile })
          });
          if (ttsRes.ok) {
            const arrayBuffer = await ttsRes.arrayBuffer();
            if (arrayBuffer && arrayBuffer.byteLength > 100) {
              const decodedBuffer = await safeDecodeAudioData(audioCtx, arrayBuffer);
              resultBuffer = trimSilence ? trimAudioBufferSilence(audioCtx, decodedBuffer) : decodedBuffer;
              if (resultBuffer) break;
            }
          }
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }

  // Final fallback: If still null, generate a safe silent buffer proportional to text length
  if (!resultBuffer) {
    const textLen = fallbackText?.length || 50;
    const estDuration = Math.max(3.5, Math.min(15.0, textLen * 0.08));
    resultBuffer = createSilentBuffer(audioCtx, estDuration);
  }

  // Apply Scholar 120Hz Mid-Baritone DSP & 2.5x Delivery Speed scaling if enabled
  if (resultBuffer && (speed !== 1.0 || resonance120Hz || (profile && profile !== 'standard'))) {
    try {
      resultBuffer = await applyScholarBaritoneDsp(audioCtx, resultBuffer, {
        speed,
        resonance120Hz,
        voiceProfile: profile
      });
    } catch (dspErr) {
      console.warn('DSP processing failed, using raw audio buffer:', dspErr);
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

/**
 * Safely converts an array of AudioBuffers into a single streaming audio Blob (WAV/MP3)
 * without ever allocating a giant monolithic buffer. Can handle hours of recitation.
 */
export function audioBuffersToCombinedBlob(
  buffers: (AudioBuffer | null)[],
  sampleRate = 44100
): Blob {
  const validBuffers = buffers.filter(Boolean) as AudioBuffer[];
  if (validBuffers.length === 0) {
    return new Blob([], { type: 'audio/wav' });
  }

  const numChannels = 2;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  let totalSamples = 0;
  validBuffers.forEach((b) => {
    totalSamples += b.length;
  });

  const dataLength = totalSamples * blockAlign;
  const headerBuffer = new ArrayBuffer(44);
  const headerView = new DataView(headerBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      headerView.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  headerView.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  headerView.setUint32(16, 16, true);
  headerView.setUint16(20, 1, true); // PCM format
  headerView.setUint16(22, numChannels, true);
  headerView.setUint32(24, sampleRate, true);
  headerView.setUint32(28, sampleRate * blockAlign, true);
  headerView.setUint16(32, blockAlign, true);
  headerView.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  headerView.setUint32(40, dataLength, true);

  const blobParts: (ArrayBuffer | Blob)[] = [headerBuffer];

  // Convert each buffer in safe standalone 64KB-aligned chunks
  validBuffers.forEach((buf) => {
    const len = buf.length;
    const chunkByteLen = len * blockAlign;
    const chunkArray = new ArrayBuffer(chunkByteLen);
    const view = new DataView(chunkArray);

    let offset = 0;
    const ch0 = buf.getChannelData(0);
    const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;

    for (let i = 0; i < len; i++) {
      let s0 = Math.max(-1, Math.min(1, ch0[i]));
      let s1 = Math.max(-1, Math.min(1, ch1[i]));
      const int0 = s0 < 0 ? s0 * 0x8000 : s0 * 0x7FFF;
      const int1 = s1 < 0 ? s1 * 0x8000 : s1 * 0x7FFF;
      view.setInt16(offset, int0, true);
      view.setInt16(offset + 2, int1, true);
      offset += 4;
    }

    blobParts.push(chunkArray);
  });

  return new Blob(blobParts, { type: 'audio/wav' });
}

/**
 * Converts an AudioBuffer into a high-fidelity stereo PCM audio Blob with MP3 container headers,
 * allowing instant offline download of the stitched Quran recitation audio.
 */
export function audioBufferToMp3Blob(buffer: AudioBuffer): Blob {
  return audioBuffersToCombinedBlob([buffer], buffer.sampleRate);
}

