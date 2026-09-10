import React, { useState, useEffect } from 'react';
import { FolderHeart, Play, Download, Trash2, Film, X, Share2, Music, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { SavedVideo } from '../types';
import { SocialUploadHub } from './SocialUploadHub';
import { triggerSafeDownload } from '../utils/downloadUtils';
import { getVideoBlobFromDB } from '../utils/videoStorage';

interface LibraryProps {
  savedVideos: SavedVideo[];
  onDeleteVideo: (id: string) => void;
  onOpenStudio: () => void;
}

export const LibraryTab: React.FC<LibraryProps> = ({ savedVideos, onDeleteVideo, onOpenStudio }) => {
  const [playingVideo, setPlayingVideo] = useState<SavedVideo | null>(null);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>('');
  const [isPreparingDownload, setIsPreparingDownload] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && playingVideo) {
        setPlayingVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playingVideo]);

  // When playing a video, ensure source is valid or restore from IndexedDB
  useEffect(() => {
    if (!playingVideo) {
      setActiveVideoSrc('');
      return;
    }

    let isMounted = true;
    const resolveSource = async () => {
      // Test if current URL is active
      if (playingVideo.blobUrl) {
        try {
          const testRes = await fetch(playingVideo.blobUrl, { method: 'HEAD' });
          if (testRes.ok && isMounted) {
            setActiveVideoSrc(playingVideo.blobUrl);
            return;
          }
        } catch {}
      }

      // If URL revoked or dead, restore from IndexedDB
      const stored = await getVideoBlobFromDB(playingVideo.id);
      if (stored?.videoBlob && isMounted) {
        const freshUrl = URL.createObjectURL(stored.videoBlob);
        setActiveVideoSrc(freshUrl);
      } else if (isMounted) {
        setActiveVideoSrc(playingVideo.blobUrl || '');
      }
    };

    resolveSource();

    return () => {
      isMounted = false;
    };
  }, [playingVideo]);

  const silenceAllBackgroundAudio = () => {
    try {
      document.querySelectorAll('audio, video').forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
        } catch (e) {}
      });
    } catch (e) {}
  };

  const downloadVideoUniversal = async (video: SavedVideo, resolution: 'sd' | 'hd') => {
    silenceAllBackgroundAudio();
    setIsPreparingDownload(`${video.id}-${resolution}`);
    const filename = `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}_${resolution.toUpperCase()}.mp4`;

    try {
      // 1. Check IndexedDB for direct original Blob
      const stored = await getVideoBlobFromDB(video.id);
      if (stored?.videoBlob) {
        await triggerSafeDownload(stored.videoBlob, filename);
        return;
      }

      // 2. Fallback to existing blob URL
      const targetUrl = resolution === 'sd' ? (video.sdBlobUrl || video.blobUrl) : (video.hdBlobUrl || video.blobUrl);
      if (targetUrl) {
        await triggerSafeDownload(targetUrl, filename);
      }
    } catch (err) {
      console.error('Library download error:', err);
    } finally {
      setIsPreparingDownload(null);
    }
  };

  const handleDownloadSd = (video: SavedVideo) => {
    downloadVideoUniversal(video, 'sd');
  };

  const handleDownloadHd = (video: SavedVideo) => {
    downloadVideoUniversal(video, 'hd');
  };

  const handleDownloadMp3 = async (video: SavedVideo) => {
    silenceAllBackgroundAudio();
    setIsPreparingDownload(`${video.id}-mp3`);
    const filename = `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}_Recitation.wav`;

    try {
      const stored = await getVideoBlobFromDB(video.id);
      if (stored?.audioBlob) {
        await triggerSafeDownload(stored.audioBlob, filename);
        return;
      }

      if (video.audioBlobUrl) {
        await triggerSafeDownload(video.audioBlobUrl, filename);
      } else if (stored?.videoBlob) {
        // Download master video as fallback
        await triggerSafeDownload(stored.videoBlob, `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`);
      } else if (video.blobUrl) {
        await triggerSafeDownload(video.blobUrl, `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`);
      }
    } catch (err) {
      console.error('Audio download error:', err);
    } finally {
      setIsPreparingDownload(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <FolderHeart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">My Saved Quran Videos</h2>
            <p className="text-xs text-slate-400">
              Your generated videos library ({savedVideos.length} Video{savedVideos.length !== 1 ? 's' : ''})
            </p>
          </div>
        </div>

        <button
          onClick={onOpenStudio}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Film className="w-4 h-4" />
          <span>Create New Video</span>
        </button>
      </div>

      {/* Video Grid or Empty State */}
      {savedVideos.length === 0 ? (
        <div className="bg-[#0e1626] rounded-2xl border border-slate-800/80 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 text-amber-400/60 flex items-center justify-center mx-auto">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Generated Videos Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select a Surah, choose your favorite Qari reciter &amp; theme in the Studio Creator, then click &quot;Generate &amp; Export Video&quot;.
            </p>
          </div>
          <button
            onClick={onOpenStudio}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            Open Studio Creator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedVideos.map((video) => (
            <div
              key={video.id}
              className="bg-[#0e1626] rounded-2xl border border-slate-800 hover:border-amber-500/40 p-4 shadow-xl transition-all space-y-3 group"
            >
              {/* Preview Thumbnail Card */}
              <div
                onClick={() => setPlayingVideo(video)}
                className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center cursor-pointer border border-slate-800 group-hover:border-amber-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-3">
                  <span className="self-end px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                    {video.aspectRatio}
                  </span>

                  <div className="w-10 h-10 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>

                  <span className="text-[10px] text-slate-300 font-mono">
                    Duration: {video.duration}s • {video.fileSize}
                  </span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div>
                <h3 className="text-sm font-bold text-slate-200 truncate">{video.title}</h3>
                <p className="text-xs text-slate-400">{video.createdAt}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                <button
                  onClick={() => setPlayingVideo(video)}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </button>

                <button
                  onClick={() => handleDownloadSd(video)}
                  disabled={isPreparingDownload === `${video.id}-sd`}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Download Universal SD MP4 (Compatible with Windows Media Player, QuickTime & all devices)"
                >
                  <Download className="w-3 h-3 text-amber-400" />
                  <span>{isPreparingDownload === `${video.id}-sd` ? 'Converting...' : '720p MP4'}</span>
                </button>

                <button
                  onClick={() => handleDownloadHd(video)}
                  disabled={isPreparingDownload === `${video.id}-hd`}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold border border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Download Universal HD MP4 (Compatible with Windows Media Player, QuickTime & all devices)"
                >
                  <Download className="w-3 h-3 text-amber-400" />
                  <span>{isPreparingDownload === `${video.id}-hd` ? 'Converting...' : '1080p MP4'}</span>
                </button>

                <button
                  onClick={() => handleDownloadMp3(video)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Download MP3 Recitation Audio"
                >
                  <Music className="w-3 h-3 text-amber-400" />
                  <span>MP3</span>
                </button>

                <button
                  onClick={() => onDeleteVideo(video.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer ml-auto"
                  title="Delete Video"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPlayingVideo(null);
          }}
        >
          <div
            className="bg-[#0e1626] border border-slate-800 rounded-2xl max-w-3xl w-full p-4 sm:p-5 space-y-4 relative shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setPlayingVideo(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Library</span>
                </button>
                <h3 className="text-sm font-bold text-slate-200 truncate">{playingVideo.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                title="Close (Esc)"
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto flex-1 p-1">
              <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center max-h-[380px]">
                {activeVideoSrc ? (
                  <video
                    key={activeVideoSrc}
                    src={activeVideoSrc}
                    controls
                    autoPlay
                    className="max-h-[360px] w-auto rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                    <span className="text-xs">Loading video playback stream...</span>
                  </div>
                )}
              </div>

              {/* Social Direct Upload & Sharing Hub */}
              <SocialUploadHub
                videoBlob={null}
                videoUrl={activeVideoSrc || playingVideo.blobUrl}
                title={playingVideo.title}
                surahName={playingVideo.surahName}
                reciterName="Qari Reciter"
                aspectRatio={playingVideo.aspectRatio}
              />
            </div>

            {/* Modal Footer Download Options */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-t border-slate-800 pt-3 flex-shrink-0">
              <button
                onClick={() => handleDownloadSd(playingVideo)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>SD (720p)</span>
              </button>

              <button
                onClick={() => handleDownloadHd(playingVideo)}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>HD (1080p)</span>
              </button>

              <button
                onClick={() => handleDownloadMp3(playingVideo)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span>MP3 Audio</span>
              </button>

              <button
                onClick={() => setPlayingVideo(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Player</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
