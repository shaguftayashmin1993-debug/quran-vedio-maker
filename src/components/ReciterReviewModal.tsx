import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Star, Check, Search, X, Mic, Sparkles, Music, ShieldCheck, Tag } from 'lucide-react';
import { VideoConfig, Reciter, TranslationReciter } from '../types';
import { RECITERS, TRANSLATION_RECITERS, getAudioUrl } from '../data/reciters';

interface ReciterReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VideoConfig;
  onChange: (updated: Partial<VideoConfig>) => void;
}

export const ReciterReviewModal: React.FC<ReciterReviewModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'melodic' | 'classic' | 'translation'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audio Player State
  const [playingFolder, setPlayingFolder] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount or modal close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setPlayingFolder(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle Audio Sample Playback
  const handlePlaySample = (item: Reciter | TranslationReciter, isArabicQari: boolean) => {
    if (playingFolder === item.folder && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoadingAudio(true);
    setPlayingFolder(item.folder);
    setAudioProgress(0);

    let sampleUrl = '';
    if (isArabicQari) {
      // Play Bismillah or Alhamdu Lillah from Surah 1, Ayah 1 or 2
      sampleUrl = getAudioUrl(item.folder, 1, 1);
    } else {
      // For translation reciters
      if (item.folder.startsWith('tts-')) {
        // AI TTS sample
        const langCode = (item as TranslationReciter).lang === 'ur' ? 'ur' : (item as TranslationReciter).lang === 'hi' ? 'hi' : 'en';
        sampleUrl = `/api/tts`;
      } else {
        sampleUrl = getAudioUrl(item.folder, 1, 1);
      }
    }

    let audio: HTMLAudioElement;
    if (!isArabicQari && item.folder.startsWith('tts-')) {
      const trLang = (item as TranslationReciter).lang;
      let voiceProfile = 'standard';
      if (item.folder === 'tts-ur-scholar') voiceProfile = 'scholar-mature-baritone';
      else if (item.folder === 'tts-ur-bayan') voiceProfile = 'elder-bayan-warm';
      else if (item.folder === 'tts-ur-mufti') voiceProfile = 'mufti-deep-resonant';
      else if (item.folder === 'tts-ur-muallim') voiceProfile = 'gentle-muallim-narrator';

      const sampleText = (trLang === 'ur' || trLang === 'ur-en')
        ? (trLang === 'ur-en'
            ? 'تمام تعریفیں اللہ کے لیے ہیں — All praise is due to Allah, Lord of all the worlds.'
            : 'تمام تعریفیں اللہ کے لیے ہیں جو تمام جہانوں کا پروردگار ہے۔')
        : (trLang === 'hi' || trLang === 'hi-en')
        ? (trLang === 'hi-en'
            ? 'सब तारीफें अल्लाह ही के लिए हैं — All praise is due to Allah, Lord of all the worlds.'
            : 'सब तारीफें अल्लाह ही के लिए हैं जो तमाम जहानों का पालने वाला है।')
        : 'All praise is due to Allah, Lord of all the worlds.';

      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sampleText, lang: trLang || 'ur', voiceProfile })
      })
        .then((res) => {
          if (!res.ok) throw new Error(`TTS HTTP error ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          audio = new Audio(blobUrl);
          setupAudioEvents(audio);
        })
        .catch((err) => {
          console.error('Failed to load TTS sample:', err);
          setIsLoadingAudio(false);
          setPlayingFolder(null);
        });
      return;
    } else {
      audio = new Audio(sampleUrl);

      // Attach fallback error handler for human translation reciters
      if (!isArabicQari) {
        audio.onerror = () => {
          console.warn('Human translation audio sample failed, falling back to TTS...');
          const trLang = (item as TranslationReciter).lang || 'ur';
          const sampleText = (trLang === 'ur' || trLang === 'ur-en')
            ? 'تمام تعریفیں اللہ کے لیے ہیں جو تمام جہانوں کا پروردگار ہے۔'
            : 'All praise is due to Allah, Lord of all the worlds.';

          fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sampleText, lang: trLang })
          })
            .then((res) => res.blob())
            .then((blob) => {
              const blobUrl = URL.createObjectURL(blob);
              const fallbackAudio = new Audio(blobUrl);
              setupAudioEvents(fallbackAudio);
            })
            .catch(() => {
              setIsLoadingAudio(false);
              setPlayingFolder(null);
            });
        };
      }

      setupAudioEvents(audio);
    }
  };

  const setupAudioEvents = (audio: HTMLAudioElement) => {
    audioRef.current = audio;

    audio.oncanplay = () => {
      setIsLoadingAudio(false);
      setIsPlaying(true);
      audio.play().catch((e) => console.warn('Audio play prevented:', e));
    };

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setPlayingFolder(null);
      setAudioProgress(0);
    };

    audio.onerror = () => {
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setPlayingFolder(null);
    };
  };

  // Filter Reciters
  const filteredArabicReciters = RECITERS.filter((r) => {
    const matchesCategory =
      activeCategory === 'all' ||
      (activeCategory === 'popular' && r.category === 'popular') ||
      (activeCategory === 'melodic' && r.category === 'melodic') ||
      (activeCategory === 'classic' && r.category === 'classic');

    const matchesSearch =
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const filteredTranslationReciters = TRANSLATION_RECITERS.filter((tr) => {
    const matchesCategory = activeCategory === 'all' || activeCategory === 'translation';
    const matchesSearch =
      !searchQuery ||
      tr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const isSelectedQari = (folder: string) => config.reciterFolder === folder;
  const isSelectedTranslation = (folder: string) => config.translationReciterFolder === folder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-[#0e172a] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Reciter Review &amp; Voice Catalog
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                  Live Audio Previews
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Listen to voice samples, compare audio quality &amp; review reciter ratings before creating your video.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-4 bg-[#0e1628] border-b border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {[
              { id: 'all', label: 'All Reciters' },
              { id: 'popular', label: '⭐ Top Rated / Popular' },
              { id: 'melodic', label: '🎵 Melodic & Soft' },
              { id: 'classic', label: '📖 Classic Haramain' },
              { id: 'translation', label: '🗣️ Spoken Translation Voices' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3.5 py-1.5 text-xs rounded-xl font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-[#141f36] text-slate-300 hover:bg-[#1a2947] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reciters, style, tags..."
              className="w-full bg-[#141f36] border border-slate-700/80 focus:border-amber-400 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-100 focus:outline-none transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Reciters List Scrollable Area */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
          
          {/* Section 1: Arabic Qari Voices */}
          {activeCategory !== 'translation' && filteredArabicReciters.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Music className="w-4 h-4" /> Arabic Quran Qaris ({filteredArabicReciters.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Click <strong className="text-amber-300">Listen Sample</strong> to preview real audio
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArabicReciters.map((reciter) => {
                  const selected = isSelectedQari(reciter.folder);
                  const isThisPlaying = playingFolder === reciter.folder && isPlaying;
                  const isThisLoading = playingFolder === reciter.folder && isLoadingAudio;

                  return (
                    <div
                      key={reciter.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                        selected
                          ? 'bg-amber-500/10 border-amber-500/80 ring-2 ring-amber-500/30'
                          : 'bg-[#121c30] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar: Name, Quality & Rating */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-100">{reciter.name}</h4>
                            {selected && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Selected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              {reciter.style || 'Quran Recitation'}
                            </span>
                            <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                              {reciter.quality}
                            </span>
                          </div>
                        </div>

                        {/* Star Rating Review */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 text-amber-400 font-bold text-xs justify-end">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{reciter.rating?.toFixed(1) || '4.9'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            ({reciter.reviewsCount?.toLocaleString() || '1.2k'} reviews)
                          </span>
                        </div>
                      </div>

                      {/* Review Description */}
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {reciter.description}
                      </p>

                      {/* Tags */}
                      {reciter.tags && reciter.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {reciter.tags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] text-slate-400 bg-[#17243c] px-2 py-0.5 rounded-md border border-slate-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Interactive Controls Bar: Audio Preview & Select Button */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                        {/* Sample Audio Button */}
                        <button
                          type="button"
                          onClick={() => handlePlaySample(reciter, true)}
                          disabled={isThisLoading}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                            isThisPlaying
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                              : 'bg-[#1a2845] text-amber-300 hover:bg-[#22355c] hover:text-amber-200'
                          }`}
                        >
                          {isThisLoading ? (
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          ) : isThisPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>{isThisPlaying ? 'Playing Sample...' : 'Listen Sample'}</span>
                        </button>

                        {/* Select Reciter Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onChange({
                              reciterFolder: reciter.folder,
                              reciterName: reciter.name
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                          }`}
                        >
                          {selected ? 'Active Voice' : 'Select Reciter'}
                        </button>
                      </div>

                      {/* Playing Progress Bar Overlay */}
                      {isThisPlaying && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                          <div
                            className="h-full bg-amber-400 transition-all duration-100"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Spoken Translation Voices */}
          {(activeCategory === 'all' || activeCategory === 'translation') && filteredTranslationReciters.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> Spoken Translation Voices ({filteredTranslationReciters.length})
                </h3>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Monetization Safe Options Available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTranslationReciters.map((tr) => {
                  const selected = isSelectedTranslation(tr.folder);
                  const isThisPlaying = playingFolder === tr.folder && isPlaying;
                  const isThisLoading = playingFolder === tr.folder && isLoadingAudio;

                  return (
                    <div
                      key={tr.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                        selected
                          ? 'bg-emerald-500/10 border-emerald-500/80 ring-2 ring-emerald-500/30'
                          : 'bg-[#121c30] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-100">{tr.name}</h4>
                            {selected && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Selected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              {tr.style || 'Translation Audio'}
                            </span>
                            <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                              {tr.quality}
                            </span>
                          </div>
                        </div>

                        {/* Star Rating Review */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 text-amber-400 font-bold text-xs justify-end">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{tr.rating?.toFixed(1) || '5.0'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            ({tr.reviewsCount?.toLocaleString() || '1.5k'} reviews)
                          </span>
                        </div>
                      </div>

                      {/* Review Description */}
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {tr.description}
                      </p>

                      {/* Tags */}
                      {tr.tags && tr.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {tr.tags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] text-slate-400 bg-[#17243c] px-2 py-0.5 rounded-md border border-slate-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Interactive Controls Bar: Audio Preview & Select Button */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handlePlaySample(tr, false)}
                          disabled={isThisLoading}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                            isThisPlaying
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                              : 'bg-[#1a2845] text-emerald-300 hover:bg-[#22355c] hover:text-emerald-200'
                          }`}
                        >
                          {isThisLoading ? (
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          ) : isThisPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>{isThisPlaying ? 'Playing Sample...' : 'Listen Sample'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            let profile: any = 'standard';
                            if (tr.folder === 'tts-ur-scholar') profile = 'scholar-mature-baritone';
                            else if (tr.folder === 'tts-ur-bayan') profile = 'elder-bayan-warm';
                            else if (tr.folder === 'tts-ur-mufti') profile = 'mufti-deep-resonant';
                            else if (tr.folder === 'tts-ur-muallim') profile = 'gentle-muallim-narrator';
                            else if (tr.folder.includes('farhat')) profile = 'dignified-female-scholar';
                            else if (tr.folder.includes('shamshad')) profile = 'authentic-human';

                            onChange({
                              translationReciterFolder: tr.folder,
                              translationReciterName: tr.name,
                              voiceProfile: profile,
                              baritoneResonance: profile !== 'standard' && profile !== 'authentic-human'
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm'
                          }`}
                        >
                          {selected ? 'Active Translation Voice' : 'Select Voice'}
                        </button>
                      </div>

                      {/* Playing Progress Bar Overlay */}
                      {isThisPlaying && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-100"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0e172a] border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Selected Qari: <strong className="text-amber-300">{config.reciterName}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
          >
            Apply &amp; Done
          </button>
        </div>

      </div>
    </div>
  );
};
