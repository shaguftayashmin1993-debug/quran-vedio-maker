import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, Play, Pause, Trash2, Check, RefreshCw, Volume2, VolumeX, Sliders, AlertCircle, Info, Plus } from 'lucide-react';
import { VideoConfig } from '../types';
import { setCustomBackgroundVideoUrl, getOrCreateVideoElement } from '../utils/canvasRenderer';

interface CustomVideoUploaderProps {
  config: VideoConfig;
  onChange: (updated: Partial<VideoConfig>) => void;
}

export const CustomVideoUploader: React.FC<CustomVideoUploaderProps> = ({
  config,
  onChange
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(true);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [previewDimensions, setPreviewDimensions] = useState<{ w: number; h: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const isCustomVideoActive = config.bgImageCategory === 'custom-video' && !!config.customBgVideoUrl;
  const customVideos = config.customBgVideos || [];

  // When active video changes, update video element
  useEffect(() => {
    if (config.customBgVideoUrl) {
      setCustomBackgroundVideoUrl(config.customBgVideoUrl);
    }
  }, [config.customBgVideoUrl]);

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleProcessFiles = async (files: File[]) => {
    setErrorMessage(null);

    // Filter valid video files
    const videoFiles = files.filter(
      (f) => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|mov|m4v|ogg)$/i)
    );

    if (videoFiles.length === 0) {
      setErrorMessage('Please upload valid video files (MP4, WebM, MOV, M4V).');
      return;
    }

    // Check if any file exceeds 200MB
    const largeFiles = videoFiles.filter((f) => f.size > 200 * 1024 * 1024);
    if (largeFiles.length > 0) {
      setErrorMessage(
        `Note: ${largeFiles.length} video(s) are larger than 200MB. For optimal export performance, 1080p clips under 100MB are recommended.`
      );
    }

    setIsProcessing(true);
    setProcessingStatus(`Processing ${videoFiles.length} video clip${videoFiles.length > 1 ? 's' : ''}...`);

    try {
      const processedItems: {
        id: string;
        url: string;
        name: string;
        duration: number;
        width?: number;
        height?: number;
      }[] = [];

      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        setProcessingStatus(`Analyzing clip ${i + 1} of ${videoFiles.length}: "${file.name}"...`);

        const videoUrl = URL.createObjectURL(file);

        // Preload video metadata
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = videoUrl;

        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          tempVideo.onloadedmetadata = done;
          tempVideo.onerror = done;
          // 3.5s safety timeout per file
          setTimeout(done, 3500);
        });

        const duration = Math.round(tempVideo.duration || 0);
        const width = tempVideo.videoWidth || 1920;
        const height = tempVideo.videoHeight || 1080;

        // Register in cache
        getOrCreateVideoElement(videoUrl);

        processedItems.push({
          id: `custom-vid-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          url: videoUrl,
          name: file.name,
          duration,
          width,
          height
        });
      }

      if (processedItems.length === 0) {
        setIsProcessing(false);
        setErrorMessage('Unable to process the selected videos. Please ensure they are valid H.264/WebM video files.');
        return;
      }

      const primaryVideo = processedItems[0];
      setCustomBackgroundVideoUrl(primaryVideo.url);
      setPreviewDuration(primaryVideo.duration);
      if (primaryVideo.width && primaryVideo.height) {
        setPreviewDimensions({ w: primaryVideo.width, h: primaryVideo.height });
      }

      // Merge avoiding duplicate names
      const existingFiltered = customVideos.filter(
        (existing) => !processedItems.some((newVid) => newVid.name === existing.name)
      );
      const updatedVideos = [...processedItems, ...existingFiltered].slice(0, 20);

      onChange({
        bgImageCategory: 'custom-video',
        bgType: 'video',
        customBgVideoUrl: primaryVideo.url,
        customBgVideoName: primaryVideo.name,
        customBgVideoDuration: primaryVideo.duration,
        customBgVideos: updatedVideos,
        bgVideoLoop: true,
        bgVideoMuted: true
      });
    } catch (err) {
      console.error('Error processing uploaded videos:', err);
      setErrorMessage('An unexpected error occurred while loading video files.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFiles(Array.from(files));
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFiles(Array.from(files));
    }
  };

  const handleSelectSavedVideo = (item: { id: string; url: string; name: string; duration?: number }) => {
    setCustomBackgroundVideoUrl(item.url);
    onChange({
      bgImageCategory: 'custom-video',
      bgType: 'video',
      customBgVideoUrl: item.url,
      customBgVideoName: item.name,
      customBgVideoDuration: item.duration
    });
  };

  const handleDeleteSavedVideo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = customVideos.filter((v) => v.id !== id);
    const wasCurrent = customVideos.find((v) => v.id === id)?.url === config.customBgVideoUrl;

    if (wasCurrent) {
      if (filtered.length > 0) {
        setCustomBackgroundVideoUrl(filtered[0].url);
        onChange({
          customBgVideos: filtered,
          customBgVideoUrl: filtered[0].url,
          customBgVideoName: filtered[0].name,
          customBgVideoDuration: filtered[0].duration
        });
      } else {
        setCustomBackgroundVideoUrl(null);
        onChange({
          customBgVideos: [],
          customBgVideoUrl: undefined,
          customBgVideoName: undefined,
          customBgVideoDuration: undefined,
          bgType: 'image',
          bgImageCategory: 'makkah-kaaba-majestic'
        });
      }
    } else {
      onChange({
        customBgVideos: filtered
      });
    }
  };

  const handleClearAllVideos = () => {
    setCustomBackgroundVideoUrl(null);
    onChange({
      customBgVideos: [],
      customBgVideoUrl: undefined,
      customBgVideoName: undefined,
      customBgVideoDuration: undefined,
      bgType: 'image',
      bgImageCategory: 'makkah-kaaba-majestic'
    });
  };

  const handleResetToDefault = () => {
    setCustomBackgroundVideoUrl(null);
    onChange({
      bgType: 'image',
      bgImageCategory: 'makkah-kaaba-majestic',
      customBgVideoUrl: undefined,
      customBgVideoName: undefined,
      customBgVideoDuration: undefined
    });
  };

  const togglePreviewPlay = () => {
    if (videoPreviewRef.current) {
      if (videoPreviewRef.current.paused) {
        videoPreviewRef.current.play();
        setIsPlayingPreview(true);
      } else {
        videoPreviewRef.current.pause();
        setIsPlayingPreview(false);
      }
    }
  };

  return (
    <div className="bg-[#101728] rounded-xl border border-amber-500/40 p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
              <span>Upload Custom Background Videos</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold">Single or Multi-Video</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Select one or multiple drone videos, timelapses, or scenic clips (MP4, WebM, MOV). Rotate clips per verse or play in a seamless loop.
            </p>
          </div>
        </div>

        {isCustomVideoActive && (
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-[11px] text-slate-400 hover:text-rose-300 underline font-medium self-start sm:self-center cursor-pointer"
          >
            Reset to Default Scenery
          </button>
        )}
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[10px] text-rose-300 hover:text-white underline font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Dropzone (Supports Multiple Videos) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : isCustomVideoActive
            ? 'border-amber-500/60 bg-[#141f36]/70 hover:border-amber-400 hover:bg-[#16233d]'
            : 'border-slate-700 bg-[#0d1424] hover:border-amber-500/50 hover:bg-[#121c32]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 text-amber-400 py-3">
            <RefreshCw className="w-7 h-7 animate-spin" />
            <span className="text-xs font-semibold">{processingStatus || 'Processing video clips & preparing playback...'}</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <Film className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200">
                Click to browse or drag &amp; drop multiple video clips here
              </div>
              <p className="text-[11px] text-slate-400">
                Select one or several videos • MP4, WebM, MOV (H.264, VP9) • 1080p / 4K
              </p>
            </div>
          </>
        )}
      </div>

      {/* Currently Active Video Background Player & Settings */}
      {isCustomVideoActive && config.customBgVideoUrl && (
        <div className="p-4 rounded-xl bg-[#090e1a] border border-amber-500/50 space-y-3.5 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Mini Video Preview Thumbnail with play overlay */}
              <div
                className="w-24 h-16 rounded-lg overflow-hidden border border-amber-500/40 relative flex-shrink-0 bg-black group cursor-pointer"
                onClick={togglePreviewPlay}
                title="Click to play / pause video preview"
              >
                <video
                  ref={videoPreviewRef}
                  src={config.customBgVideoUrl}
                  autoPlay
                  loop
                  muted={config.bgVideoMuted !== false}
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-all">
                  {isPlayingPreview ? (
                    <Pause className="w-4 h-4 text-white drop-shadow" />
                  ) : (
                    <Play className="w-4 h-4 text-white drop-shadow fill-current" />
                  )}
                </div>
                <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 px-1 py-0.2 rounded text-[8px] font-extrabold">
                  VIDEO
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-200 truncate flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">{config.customBgVideoName || 'Custom Background Video'}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {config.customBgVideoDuration ? `Duration: ${formatSecs(config.customBgVideoDuration)} • ` : ''}
                  Active in Live Studio &amp; Video Exporter
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Change Videos</span>
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-all cursor-pointer"
                title="Remove video background and reset to Kaaba photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Darkness Overlay Slider & Controls */}
          <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Darkness Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1 font-semibold">
                  <Sliders className="w-3 h-3 text-amber-400" />
                  <span>Video Darkness Overlay:</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {Math.round(config.bgOverlayDarkness * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.05"
                value={config.bgOverlayDarkness}
                onChange={(e) => onChange({ bgOverlayDarkness: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Higher darkness ensures Arabic calligraphy stands out clearly against bright video footage.
              </p>
            </div>

            {/* Audio & Loop Settings */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={config.bgVideoMuted !== false}
                  onChange={(e) => onChange({ bgVideoMuted: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 font-medium">
                  {config.bgVideoMuted !== false ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Mute background video audio (Recommended)</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={config.bgVideoLoop !== false}
                  onChange={(e) => onChange({ bgVideoLoop: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <span className="font-medium text-[11px] text-slate-400">
                  Loop video seamlessly if surah recitation is longer than video
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Saved Videos Gallery with Multi-Video Rotation Controls */}
      {customVideos.length > 0 && (
        <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-amber-400" /> Your Video Gallery ({customVideos.length} clip{customVideos.length > 1 ? 's' : ''})
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer ml-1"
              >
                + Add more
              </button>
            </div>

            <div className="flex items-center gap-3">
              {customVideos.length > 1 && (
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={config.rotateBgPerAyah === true && config.bgImageCategory === 'custom-video'}
                    onChange={(e) => {
                      onChange({
                        rotateBgPerAyah: e.target.checked,
                        bgImageCategory: 'custom-video',
                        bgType: 'video'
                      });
                    }}
                    className="rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer"
                  />
                  <span className="font-medium">🔄 Rotate videos per Ayah</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleClearAllVideos}
                className="text-[11px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
              >
                Clear gallery
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {customVideos.map((vidItem, idx) => {
              const isSelected = isCustomVideoActive && config.customBgVideoUrl === vidItem.url;
              return (
                <div
                  key={vidItem.id}
                  onClick={() => handleSelectSavedVideo(vidItem)}
                  className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all aspect-video bg-black ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 scale-102'
                      : 'border-slate-800 hover:border-amber-500/60 opacity-80 hover:opacity-100'
                  }`}
                  title={`Click to set "${vidItem.name}" as active background`}
                >
                  <video
                    src={vidItem.url}
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 flex flex-col justify-between p-1.5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1">
                        <span className="bg-black/80 backdrop-blur-xs text-slate-200 text-[9px] font-mono px-1 rounded">
                          #{idx + 1}
                        </span>
                        {isSelected ? (
                          <span className="bg-amber-500 text-slate-950 px-1 py-0.2 rounded text-[8px] font-extrabold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> ACTIVE
                          </span>
                        ) : (
                          <span className="bg-slate-900/80 text-slate-300 px-1 py-0.2 rounded text-[8px]">
                            VIDEO
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedVideo(vidItem.id, e)}
                        className="p-1 rounded bg-black/60 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete video"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="truncate text-[10px] text-slate-200 font-medium">
                      <span className="truncate block">{vidItem.name}</span>
                      <span className="text-[9px] text-amber-400/90 font-mono">
                        {vidItem.duration ? formatSecs(vidItem.duration) : '0:00'}
                        {vidItem.width ? ` • ${vidItem.width >= 3800 ? '4K' : vidItem.width >= 1900 ? '1080p' : `${vidItem.width}p`}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Helpful Tips Box */}
      <div className="p-3 rounded-xl bg-[#0c1322] border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-300">Multi-Video Background Tips:</span>
          <p>
            You can upload multiple nature or drone videos at once. With <strong>"Rotate videos per Ayah"</strong> checked, Ayah 1 will display Clip 1, Ayah 2 will display Clip 2, and so forth in sequence. The video smoothly loops and plays automatically during recitation and video export.
          </p>
        </div>
      </div>
    </div>
  );
};
