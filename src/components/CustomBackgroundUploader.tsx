import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, Check, RefreshCw, Sliders, AlertCircle, Plus, Sparkles } from 'lucide-react';
import { VideoConfig } from '../types';
import { setCustomBackgroundImageUrl, ensureBackgroundImageLoaded } from '../utils/canvasRenderer';

interface CustomBackgroundUploaderProps {
  config: VideoConfig;
  onChange: (updated: Partial<VideoConfig>) => void;
}

export const CustomBackgroundUploader: React.FC<CustomBackgroundUploaderProps> = ({
  config,
  onChange
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCustomActive = config.bgImageCategory === 'custom-upload' && !!config.customBgImageUrl;
  const customImages = config.customBgImages || [];

  const handleProcessFiles = async (files: File[]) => {
    setErrorMessage(null);
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setErrorMessage('Please select valid image files (JPEG, PNG, WEBP, AVIF).');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(`Processing ${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''}...`);

    try {
      const readPromises = imageFiles.map((file, idx) => {
        return new Promise<{ id: string; url: string; name: string } | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (!dataUrl) {
              resolve(null);
              return;
            }
            resolve({
              id: `custom-bg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
              url: dataUrl,
              name: file.name
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(readPromises);
      const validNewImages = results.filter((item): item is { id: string; url: string; name: string } => item !== null);

      if (validNewImages.length === 0) {
        setIsProcessing(false);
        setErrorMessage('Failed to read the selected images. Please try other files.');
        return;
      }

      // Preload all new images into canvas renderer cache
      for (const img of validNewImages) {
        ensureBackgroundImageLoaded('custom-upload', img.url);
      }

      // Active image becomes the first newly uploaded image
      const primaryImage = validNewImages[0];
      setCustomBackgroundImageUrl(primaryImage.url);

      // Merge with existing images, preventing duplicate URLs and keeping up to 30 items
      const existingFiltered = customImages.filter(
        (existing) => !validNewImages.some((newImg) => newImg.url === existing.url)
      );
      const updatedImages = [...validNewImages, ...existingFiltered].slice(0, 30);

      onChange({
        bgImageCategory: 'custom-upload',
        bgType: 'image',
        customBgImageUrl: primaryImage.url,
        customBgImageName: primaryImage.name,
        customBgImages: updatedImages
      });
    } catch (err) {
      console.error('Error processing uploaded images:', err);
      setErrorMessage('An unexpected error occurred while processing photos.');
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

  const handleSelectSavedImage = (item: { id: string; url: string; name: string }) => {
    setCustomBackgroundImageUrl(item.url);
    ensureBackgroundImageLoaded('custom-upload', item.url);
    onChange({
      bgImageCategory: 'custom-upload',
      bgType: 'image',
      customBgImageUrl: item.url,
      customBgImageName: item.name
    });
  };

  const handleDeleteSavedImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = customImages.filter((img) => img.id !== id);
    const wasCurrent = customImages.find((img) => img.id === id)?.url === config.customBgImageUrl;

    if (wasCurrent) {
      if (filtered.length > 0) {
        setCustomBackgroundImageUrl(filtered[0].url);
        ensureBackgroundImageLoaded('custom-upload', filtered[0].url);
        onChange({
          customBgImages: filtered,
          customBgImageUrl: filtered[0].url,
          customBgImageName: filtered[0].name
        });
      } else {
        setCustomBackgroundImageUrl(null);
        onChange({
          customBgImages: [],
          customBgImageUrl: undefined,
          customBgImageName: undefined,
          bgImageCategory: 'makkah-kaaba-majestic',
          bgType: 'image'
        });
      }
    } else {
      onChange({
        customBgImages: filtered
      });
    }
  };

  const handleClearAllImages = () => {
    setCustomBackgroundImageUrl(null);
    onChange({
      customBgImages: [],
      customBgImageUrl: undefined,
      customBgImageName: undefined,
      bgImageCategory: 'makkah-kaaba-majestic',
      bgType: 'image'
    });
  };

  const handleResetToDefault = () => {
    setCustomBackgroundImageUrl(null);
    onChange({
      bgImageCategory: 'makkah-kaaba-majestic',
      bgType: 'image',
      customBgImageUrl: undefined,
      customBgImageName: undefined
    });
  };

  return (
    <div className="bg-[#101728] rounded-xl border border-amber-500/40 p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
              <span>Upload Custom Background Photos</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold">Single or Multi-Photo</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Select one or multiple images at once (JPEG, PNG, WEBP, AVIF). Rotate them verse-by-verse or pick your favorite.
            </p>
          </div>
        </div>

        {isCustomActive && (
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-[11px] text-slate-400 hover:text-rose-300 underline font-medium self-start sm:self-center cursor-pointer"
          >
            Reset to Default Scenery
          </button>
        )}
      </div>

      {/* Error Banner */}
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

      {/* Upload Dropzone (Supports Multiple Files) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : isCustomActive
            ? 'border-amber-500/60 bg-[#141f36]/70 hover:border-amber-400 hover:bg-[#16233d]'
            : 'border-slate-700 bg-[#0d1424] hover:border-amber-500/50 hover:bg-[#121c32]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 text-amber-400 py-3">
            <RefreshCw className="w-7 h-7 animate-spin" />
            <span className="text-xs font-semibold">{processingStatus || 'Processing images...'}</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200">
                Click to browse or drag &amp; drop multiple images here
              </div>
              <p className="text-[11px] text-slate-400">
                Select one or several photos at once • Supports JPG, PNG, WEBP, AVIF (1080p / 4K)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Active Background Information */}
      {isCustomActive && config.customBgImageUrl && (
        <div className="p-3 rounded-xl bg-[#090e1a] border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-20 h-14 rounded-lg overflow-hidden border border-amber-500/40 relative flex-shrink-0 bg-black">
              <img
                src={config.customBgImageUrl}
                alt="Active Background"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 px-1 py-0.2 rounded text-[9px] font-extrabold">
                ACTIVE
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-200 truncate flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">{config.customBgImageName || 'Custom Uploaded Photo'}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Applied to Canvas • Real-time Ken-Burns Zoom &amp; Overlay enabled
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
              <span>Add / Change Photos</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-all cursor-pointer"
              title="Remove custom photo and reset to Holy Kaaba default"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Saved Custom Backgrounds Gallery with Multi-Photo Controls */}
      {customImages.length > 0 && (
        <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Your Photo Gallery ({customImages.length} photo{customImages.length > 1 ? 's' : ''})
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
              {customImages.length > 1 && (
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={config.rotateBgPerAyah === true && config.bgImageCategory === 'custom-upload'}
                    onChange={(e) => {
                      onChange({
                        rotateBgPerAyah: e.target.checked,
                        bgImageCategory: 'custom-upload',
                        bgType: 'image'
                      });
                    }}
                    className="rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer"
                  />
                  <span className="font-medium">🔄 Rotate photos per Ayah</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleClearAllImages}
                className="text-[11px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
              >
                Clear gallery
              </button>
            </div>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {customImages.map((imgItem, idx) => {
              const isSelected = isCustomActive && config.customBgImageUrl === imgItem.url;
              return (
                <div
                  key={imgItem.id}
                  onClick={() => handleSelectSavedImage(imgItem)}
                  className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all aspect-video bg-black ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 scale-102'
                      : 'border-slate-800 hover:border-amber-500/60 opacity-85 hover:opacity-100'
                  }`}
                  title={`Click to set "${imgItem.name}" as active background`}
                >
                  <img
                    src={imgItem.url}
                    alt={imgItem.name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center pointer-events-none">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  )}

                  {/* Order Badge */}
                  <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-slate-200 text-[9px] font-mono px-1 rounded">
                    #{idx + 1}
                  </div>

                  {/* Delete Button on Hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedImage(imgItem.id, e)}
                    className="absolute top-1 right-1 p-1 rounded bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete this photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1 py-0.5 truncate text-[9px] text-slate-300 font-mono">
                    {imgItem.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dark Overlay Fine-Tuning Slider */}
      <div className="p-3 rounded-xl bg-[#090e1a] border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Background Darkness / Contrast Overlay:</span>
          </span>
          <span className="font-mono text-amber-400 font-bold">
            {Math.round((config.bgOverlayDarkness ?? 0.55) * 100)}% Dark
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">Lighter (25%)</span>
          <input
            type="range"
            min="0.25"
            max="0.85"
            step="0.05"
            value={config.bgOverlayDarkness ?? 0.55}
            onChange={(e) => onChange({ bgOverlayDarkness: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            title="Adjust background darkness so Arabic & translation text stand out clearly"
          />
          <span className="text-[10px] text-slate-400 font-mono">Darker (85%)</span>
        </div>
      </div>
    </div>
  );
};
