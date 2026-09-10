/**
 * Safe and universal download utility for Quran Video Studio.
 * Handles Blob downloads, iframe sandbox environments, long-running object URLs,
 * and fallback user activation download prompts.
 */

import { isGenuineMp4Blob, transcodeToUniversalMp4 } from './universalMp4Transcoder';

export interface DownloadOptions {
  mimeType?: string;
  fallbackToNewTab?: boolean;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Triggers a robust browser download for a Blob or Object URL.
 * Automatically guarantees universal MP4 format (H.264 + AAC) if .mp4 is requested,
 * avoiding "file not supported" errors in Windows Media Player & QuickTime.
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
      // If it's a blob: URL, check if it's still alive or needs fetching
      if (url.startsWith('blob:')) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            actualBlob = await res.blob();
          }
        } catch {
          // If fetch fails, blob URL might still work for <a> tag
        }
      }
    }

    if (!url) {
      throw new Error('Download URL or Blob is not available.');
    }

    // If caller requested an .mp4 file, verify and enforce universal MP4 standard
    if (suggestedFilename.toLowerCase().endsWith('.mp4') && actualBlob) {
      const isRealMp4 = await isGenuineMp4Blob(actualBlob);
      if (!isRealMp4) {
        try {
          const transcoded = await transcodeToUniversalMp4(actualBlob, { filename: suggestedFilename });
          if (transcoded && transcoded.size > 1000) {
            if (isCreatedUrl) {
              try { URL.revokeObjectURL(url); } catch {}
            }
            actualBlob = transcoded;
            url = URL.createObjectURL(transcoded);
            isCreatedUrl = true;
          }
        } catch (transcodeErr) {
          console.warn('Auto-transcode before download failed:', transcodeErr);
        }
      }
    }

    // Determine correct filename extension based on actual blob type
    let finalFilename = suggestedFilename;
    if (actualBlob && actualBlob.type) {
      const type = actualBlob.type.toLowerCase();
      if (type.includes('webm') && !finalFilename.endsWith('.webm') && !finalFilename.endsWith('.mp4')) {
        finalFilename += '.webm';
      } else if (type.includes('mp4') && !finalFilename.endsWith('.mp4')) {
        finalFilename += '.mp4';
      } else if (type.includes('wav') && !finalFilename.endsWith('.wav')) {
        finalFilename += '.wav';
      } else if (type.includes('mp3') && !finalFilename.endsWith('.mp3')) {
        finalFilename += '.mp3';
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

      // Do NOT revoke immediately! For large video files (like 100MB+ Surah Al-Baqarah),
      // revoking the URL too quickly terminates the download before it finishes writing to disk!
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

    // Fallback: If programmatic click failed, try window.open if it's a valid URL
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
