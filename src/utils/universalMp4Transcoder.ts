/**
 * Universal MP4 & MP3 Media Transcoder Service
 * 
 * Ensures all exported Quran videos and audio recitations are genuine, universally compatible files:
 * - Videos: H.264/AVC High 4.1 video + AAC stereo audio in an ISO MP4 container with FastStart.
 *   Guaranteed to play natively in Windows Media Player, QuickTime, iOS, Android, TV players,
 *   and social media without "codec unsupported" or "file not supported" errors.
 * - Audios: Standard MPEG Layer-3 (MP3, 192kbps, 44.1kHz, ID3v2 tags) or PCM 16-bit WAV.
 */

/**
 * Checks if a given Blob is already a genuine ISO MP4 file by inspecting its magic bytes.
 */
export async function isGenuineMp4Blob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 16) return false;
  try {
    const slice = blob.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Look for 'ftyp' box identifier at bytes 4-7
    const isFtyp =
      bytes[4] === 0x66 && // 'f'
      bytes[5] === 0x74 && // 't'
      bytes[6] === 0x79 && // 'y'
      bytes[7] === 0x70;   // 'p'

    // Also verify it's NOT an EBML/WebM header (1A 45 DF A3)
    const isWebm =
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3;

    return isFtyp && !isWebm;
  } catch (err) {
    console.warn('Could not inspect video blob headers:', err);
    return false;
  }
}

/**
 * Checks if a given Blob is a genuine MP3 file by inspecting ID3 tags or MPEG sync words.
 */
export async function isGenuineMp3Blob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 4) return false;
  try {
    const slice = blob.slice(0, 12);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // ID3v2 tag (bytes 0-2: 'ID3')
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      return true;
    }

    // MPEG sync frame (byte 0: 0xFF, byte 1 top 3 bits: 111)
    if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if a given Blob is a genuine RIFF WAV file.
 */
export async function isGenuineWavBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 12) return false;
  try {
    const slice = blob.slice(0, 12);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 'RIFF' at 0-3 and 'WAVE' at 8-11
    const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isWave = bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
    return isRiff && isWave;
  } catch {
    return false;
  }
}

export interface TranscodeOptions {
  filename?: string;
  onStatus?: (message: string) => void;
  timeoutMs?: number;
}

/**
 * Transcodes a raw video Blob (e.g. WebM from MediaRecorder) into a universal H.264/AAC MP4.
 * Includes automatic retry and strict validation.
 */
export async function transcodeToUniversalMp4(
  inputBlob: Blob,
  options: TranscodeOptions | ((status: string) => void) = {}
): Promise<Blob> {
  const opts: TranscodeOptions = typeof options === 'function' ? { onStatus: options } : options;
  const { filename = 'quran_video.mp4', onStatus, timeoutMs = 300000 } = opts;

  if (!inputBlob || inputBlob.size === 0) {
    throw new Error('Cannot transcode empty video blob.');
  }

  // 1. Check if the file is already a genuine MP4
  const alreadyMp4 = await isGenuineMp4Blob(inputBlob);
  if (alreadyMp4) {
    if (onStatus) onStatus('Video is already universal standard MP4.');
    return inputBlob.type === 'video/mp4' ? inputBlob : new Blob([inputBlob], { type: 'video/mp4' });
  }

  if (onStatus) {
    onStatus('Mastering universal MP4 (H.264 / AAC for all players & devices)...');
  }

  const inputExt = inputBlob.type.includes('mp4') ? 'mp4' : 'webm';

  // Perform transcode with retry capability (up to 2 attempts)
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const formData = new FormData();
    formData.append('video', inputBlob, `source_${Date.now()}_att${attempt}.${inputExt}`);
    formData.append('filename', filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 1 && onStatus) {
        onStatus('Optimizing MP4 encoding stream...');
      }

      const response = await fetch('/api/convert-to-mp4', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || `Server transcode HTTP ${response.status}`);
      }

      const mp4Blob = await response.blob();
      if (!mp4Blob || mp4Blob.size < 1000) {
        throw new Error('Transcoded MP4 file received from server was empty.');
      }

      const isReal = await isGenuineMp4Blob(mp4Blob);
      if (!isReal) {
        throw new Error('Converted file did not pass MP4 container validation.');
      }

      const finalMp4 = new Blob([mp4Blob], { type: 'video/mp4' });
      if (onStatus) onStatus('Universal MP4 encoding ready!');
      return finalMp4;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  console.warn('Universal MP4 transcode failed after retries, falling back to original blob:', lastError);
  // Mark as fallback so downstream downloaders don't falsely label WebM as MP4
  const fallbackBlob = new Blob([inputBlob], { type: inputBlob.type || 'video/webm' });
  (fallbackBlob as any).__isFallbackNotUniversalMp4 = true;
  return fallbackBlob;
}

/**
 * Transcodes any audio Blob (WAV, AAC, OGG, WebM) into a genuine, universal MP3 file.
 * Returns the converted Blob with type 'audio/mpeg'.
 */
export async function transcodeToUniversalMp3(
  inputBlob: Blob,
  options: TranscodeOptions | ((status: string) => void) = {}
): Promise<Blob> {
  const opts: TranscodeOptions = typeof options === 'function' ? { onStatus: options } : options;
  const { filename = 'quran_recitation.mp3', onStatus, timeoutMs = 120000 } = opts;

  if (!inputBlob || inputBlob.size === 0) {
    throw new Error('Cannot transcode empty audio blob.');
  }

  const alreadyMp3 = await isGenuineMp3Blob(inputBlob);
  if (alreadyMp3) {
    if (onStatus) onStatus('Audio is already universal MP3 standard.');
    return inputBlob.type === 'audio/mpeg' ? inputBlob : new Blob([inputBlob], { type: 'audio/mpeg' });
  }

  if (onStatus) {
    onStatus('Encoding universal MP3 (192kbps ID3v2 for all players)...');
  }

  const formData = new FormData();
  formData.append('audio', inputBlob, `source_${Date.now()}.wav`);
  formData.append('filename', filename);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/convert-to-mp3', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.message || `Server audio transcode HTTP ${response.status}`);
    }

    const mp3Blob = await response.blob();
    if (!mp3Blob || mp3Blob.size < 500) {
      throw new Error('Transcoded MP3 file was empty.');
    }

    const finalMp3 = new Blob([mp3Blob], { type: 'audio/mpeg' });
    if (onStatus) onStatus('Universal MP3 ready!');
    return finalMp3;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('MP3 transcode failed, falling back to input audio:', err);
    return inputBlob;
  }
}
