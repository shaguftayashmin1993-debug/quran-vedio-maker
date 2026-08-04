import React, { useState } from 'react';
import { FolderHeart, Play, Download, Trash2, Film, X, Share2 } from 'lucide-react';
import { SavedVideo } from '../types';
import { SocialUploadHub } from './SocialUploadHub';

interface LibraryProps {
  savedVideos: SavedVideo[];
  onDeleteVideo: (id: string) => void;
  onOpenStudio: () => void;
}

export const LibraryTab: React.FC<LibraryProps> = ({ savedVideos, onDeleteVideo, onOpenStudio }) => {
  const [playingVideo, setPlayingVideo] = useState<SavedVideo | null>(null);

  const handleDownload = (video: SavedVideo) => {
    const a = document.createElement('a');
    a.href = video.blobUrl;
    a.download = `${video.title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  onClick={() => setPlayingVideo(video)}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </button>

                <button
                  onClick={() => handleDownload(video)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDeleteVideo(video.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete Video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-slate-800 rounded-2xl max-w-3xl w-full p-4 space-y-4 relative">
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-200 pr-8">{playingVideo.title}</h3>

            <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center max-h-[400px]">
              <video
                src={playingVideo.blobUrl}
                controls
                autoPlay
                className="max-h-[380px] w-auto rounded-lg"
              />
            </div>

            {/* Social Direct Upload & Sharing Hub */}
            <SocialUploadHub
              videoBlob={null}
              videoUrl={playingVideo.blobUrl}
              title={playingVideo.title}
              surahName={playingVideo.surahName}
              reciterName="Qari Reciter"
              aspectRatio={playingVideo.aspectRatio}
            />

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => handleDownload(playingVideo)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Video File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
