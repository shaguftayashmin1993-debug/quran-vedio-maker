/**
 * Safe and universal download utility for Quran Video Studio.
 * Handles Blob downloads, iframe sandbox environments, long-running object URLs,
 * and fallback user activation download prompts.
 */

import { 
  isGenuineMp4Blob, 
  isGenuineMp3Blob, 
  isGenuineWavBlob, 
  transcodeToUniversalMp4, 
  transcodeToUniversalMp3 
} from './universalMp4Transcoder';

export interface DownloadOptions {
  mimeType?: string;
  fallbackToNewTab?: boolean;
  onStatus?: (status: string) => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Triggers a robust browser download for a Blob or Object URL.
 * Automatically guarantees universal MP4 format (H.264 + AAC) if .mp4 is requested,
 * and universal MP3 format (192kbps ID3v2) if .mp3 is requested,
 * completely avoiding "file not supported" or "unsupported codec" errors.
 */
export async function triggerSafeDownload(
  source: Blob | string,
  suggestedFilename: string,
  options: DownloadOptions = {}
): Promise<boolean> {
  try {
    let url: string = '';
    let isCreatedUrl = false;
    let actualBlob: Blob | null = null;

    if (source instanceof Blob) {
      actualBlob = source;
      url = URL.createObjectURL(source);
      isCreatedUrl = true;
    } else if (typeof source === 'string') {
      url = source;
      // If it's a blob: URL, fetch the blob to inspect and ensure genuine format
      if (url.startsWith('blob:')) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            actualBlob = await res.blob();
          }
        } catch {
          // If fetch fails, blob URL might still be used directly
        }
      }
    }

    if (!url) {
      throw new Error('Download URL or Blob is not available.');
    }

    const lowerName = suggestedFilename.toLowerCase();

    // 1. VIDEO: If caller requested an .mp4 file, verify and enforce universal MP4 standard
    if (lowerName.endsWith('.mp4') && actualBlob) {
      const isRealMp4 = await isGenuineMp4Blob(actualBlob);
      if (!isRealMp4) {
        if (options.onStatus) options.onStatus('Mastering universal MP4 for native media players...');
        try {
          const transcoded = await transcodeToUniversalMp4(actualBlob, { 
            filename: suggestedFilename,
            onStatus: options.onStatus 
          });
          if (transcoded && transcoded.size > 1000) {
            const isConfirmedMp4 = await isGenuineMp4Blob(transcoded);
            if (isConfirmedMp4) {
              if (isCreatedUrl) {
                try { URL.revokeObjectURL(url); } catch {}
              }
              actualBlob = transcoded;
              url = URL.createObjectURL(transcoded);
              isCreatedUrl = true;
            }
          }
        } catch (transcodeErr) {
          console.warn('Auto-transcode before download failed:', transcodeErr);
        }
      }
    }

    // 2. AUDIO: If caller requested an .mp3 file, verify and enforce genuine MP3 standard
    if (lowerName.endsWith('.mp3') && actualBlob) {
      const isRealMp3 = await isGenuineMp3Blob(actualBlob);
      if (!isRealMp3) {
        if (options.onStatus) options.onStatus('Converting audio to universal MP3...');
        try {
          const mp3Converted = await transcodeToUniversalMp3(actualBlob, {
            filename: suggestedFilename,
            onStatus: options.onStatus
          });
          if (mp3Converted && mp3Converted.size > 500) {
            const isConfirmedMp3 = await isGenuineMp3Blob(mp3Converted);
            if (isConfirmedMp3) {
              if (isCreatedUrl) {
                try { URL.revokeObjectURL(url); } catch {}
              }
              actualBlob = mp3Converted;
              url = URL.createObjectURL(mp3Converted);
              isCreatedUrl = true;
            }
          }
        } catch (audioErr) {
          console.warn('Audio transcode to MP3 failed:', audioErr);
        }
      }
    }

    // 3. Determine strictly accurate extension to prevent container mismatches
    let finalFilename = suggestedFilename;
    if (actualBlob) {
      const isMp4 = await isGenuineMp4Blob(actualBlob);
      const isMp3 = await isGenuineMp3Blob(actualBlob);
      const isWav = await isGenuineWavBlob(actualBlob);
      const rawType = (actualBlob.type || '').toLowerCase();

      if (isMp4) {
        if (!finalFilename.toLowerCase().endsWith('.mp4')) {
          finalFilename = finalFilename.replace(/\.[^/.]+$/, '') + '.mp4';
        }
      } else if (isMp3) {
        if (!finalFilename.toLowerCase().endsWith('.mp3')) {
          finalFilename = finalFilename.replace(/\.[^/.]+$/, '') + '.mp3';
        }
      } else if (isWav) {
        if (!finalFilename.toLowerCase().endsWith('.wav')) {
          finalFilename = finalFilename.replace(/\.[^/.]+$/, '') + '.wav';
        }
      } else if (rawType.includes('webm')) {
        // Under no circumstances name a raw WebM file as .mp4, as players will report "unsupported file"
        if (finalFilename.toLowerCase().endsWith('.mp4')) {
          finalFilename = finalFilename.replace(/\.mp4$/i, '.webm');
        } else if (!finalFilename.toLowerCase().endsWith('.webm')) {
          finalFilename += '.webm';
        }
      }
    }

    // Create anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    a.style.top = '-9999px';
    a.style.opacity = '0';

    document.body.appendChild(a);

    // Dispatch simulated mouse click event
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    a.dispatchEvent(clickEvent);

    // Keep the element attached briefly so the browser's download manager registers the request
    setTimeout(() => {
      try {
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      // Buffer revokeObjectURL so large downloads don't get truncated
      if (isCreatedUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            // Ignore revocation errors
          }
        }, 180000); // 3 minutes buffer
      }
    }, 2000);

    if (options.onSuccess) options.onSuccess();
    return true;
  } catch (err: any) {
    console.error('Safe download execution failed:', err);
    if (options.onError) options.onError(err);

    if (typeof source === 'string' && source.startsWith('http')) {
      try {
        window.open(source, '_blank');
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Downloads a raw text string as a UTF-8 file (for subtitles like .srt or .vtt).
 */
export function downloadText(filename: string, content: string): boolean {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    return !!triggerSafeDownload(blob, filename);
  } catch (e) {
    console.error('Text download failed:', e);
    return false;
  }
}
