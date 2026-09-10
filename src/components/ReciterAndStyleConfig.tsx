import React, { useState, useRef } from 'react';
import { Mic, Palette, Video, Languages, Type, Sparkles, Volume2, Zap, Image as ImageIcon, Film, ShieldCheck, Star, Play, Pause, Headphones, ZoomIn } from 'lucide-react';
import { VideoConfig, VideoStyle, AudioMode, TranslationLang, ArabicScript, BgImageCategory, TextAnimation, TextSize } from '../types';
import { RECITERS, TRANSLATION_RECITERS, getAudioUrl } from '../data/reciters';
import { ReciterReviewModal } from './ReciterReviewModal';

interface ConfigProps {
  config: VideoConfig;
  onChange: (updated: Partial<VideoConfig>) => void;
}

const VIDEO_STYLES: { id: VideoStyle; name: string; desc: string; previewBg: string }[] = [
  {
    id: 'scholar-rembrandt',
    name: '🎓 Scholar Study & Library (Rembrandt Lighting)',
    desc: 'Archival study setting with mahogany bookshelves, 45° warm amber Rembrandt key-light & golden rim (100% human-free)',
    previewBg: 'bg-gradient-to-br from-[#241308] via-[#140b04] to-[#080402] border-amber-500/80 text-amber-200'
  },
  {
    id: 'symbolic-broll',
    name: '🌅 Symbolic Twilight & Divine Glow (Aniconic)',
    desc: 'Pure silent cinematic landscapes & heritage architecture in twilight lighting with golden divine aura (zero humans)',
    previewBg: 'bg-gradient-to-b from-[#1a0b18] via-[#13071b] to-[#0d0408] border-amber-400/80 text-amber-200'
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    desc: 'Deep navy background with gold spotlight glow & typography',
    previewBg: 'bg-gradient-to-b from-slate-900 to-black border-amber-500/40'
  },
  {
    id: 'classic-mushaf',
    name: 'Classic Mushaf',
    desc: 'Ivory parchment paper with double beaded golden calligraphic border',
    previewBg: 'bg-[#fcfbf6] text-amber-950 border-amber-700'
  },
  {
    id: 'parchment-mushaf',
    name: 'Parchment Manuscript',
    desc: 'Traditional manuscript page with corner medallions & active line highlight',
    previewBg: 'bg-[#eee6d3] text-amber-950 border-amber-600'
  },
  {
    id: 'emerald-gold',
    name: 'Emerald & Gold',
    desc: 'Deep emerald green canvas with geometric star lattice & gold calligraphy',
    previewBg: 'bg-gradient-to-b from-[#06231c] to-[#02110d] border-emerald-500/50'
  },
  {
    id: 'minimal-twilight',
    name: 'Minimal Obsidian',
    desc: 'Ultra-clean dark obsidian canvas with high-contrast warm white text',
    previewBg: 'bg-slate-950 border-slate-700'
  },
  {
    id: 'quran-page',
    name: 'Madani Quran Page',
    desc: 'Authentic printed Mushaf layout with pure Arabic text, enlarged dynamic page typography & real-time voice sync',
    previewBg: 'bg-[#fdfcf7] text-emerald-950 border-emerald-700 ring-1 ring-amber-500/50'
  }
];

const BG_IMAGE_CATEGORIES: { id: BgImageCategory; name: string; desc: string; previewUrl: string }[] = [
  {
    id: 'holy-kaaba-makkah',
    name: '🕋 Holy Kaaba (Makkah Al-Mukarramah 4K)',
    desc: 'Majestic 4K view of the Holy Kaaba with golden embroidered Kiswah in Makkah (100% human-free)',
    previewUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'kaaba-kiswah-gold',
    name: '✨ Kaaba Sacred Kiswah Gold Embroidery (4K)',
    desc: 'Pure golden embroidered Quranic calligraphy of the Holy Kaaba Kiswah (Close-up 4K)',
    previewUrl: 'https://images.unsplash.com/photo-1590076215667-875d4ef2d7ee?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'prophets-mosque-madinah',
    name: '🕌 Prophet\'s Mosque — Masjid an-Nabawi (Madinah 4K)',
    desc: 'The iconic Green Dome and illuminated Madinah canopies under twilight sky (pure architecture)',
    previewUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'masjid-al-aqsa-dome',
    name: '🕌 Masjid Al-Aqsa / Dome of the Rock (4K)',
    desc: 'Radiant golden dome and Ottoman blue geometric ceramic tiles at sunset (100% human-free)',
    previewUrl: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'makkah-grand-mosque-minarets',
    name: '🕋 Makkah Grand Mosque & Holy Spire (4K)',
    desc: 'Towering marble minarets and Grand Mosque architecture under night illumination',
    previewUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'islamic-geometric-calligraphy',
    name: '📜 Sacred Arabesque & Gilded Calligraphy (4K)',
    desc: 'Intricate gold-leaf Islamic illumination and historic geometric patterns',
    previewUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'scholar-study',
    name: '📚 Scholar Archival Study & Bookshelves',
    desc: 'Warm mahogany archival library with books in background & Rembrandt directional lighting (100% human-free)',
    previewUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'symbolic-twilight-desert',
    name: '🏜️ Symbolic Twilight Desert Dunes',
    desc: 'Pure silent cinematic sand dunes in soft sunset twilight lighting (empty landscape, no people)',
    previewUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'symbolic-ancient-marketplace',
    name: '🏛️ Ancient Islamic Architecture & Arches',
    desc: 'Historical oriental arches and heritage architecture at twilight (pure architectural scenery)',
    previewUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'symbolic-divine-light',
    name: '✨ Divine Radiant Golden Light (Aniconic Aura)',
    desc: 'Soft golden glowing light representing unseen divine elements with strict Islamic aniconism (zero humans)',
    previewUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'historical-artifacts',
    name: '📜 Historical Artifacts & Parchment',
    desc: 'Ancient manuscript parchment and historical artifacts in warm amber light (pure objects)',
    previewUrl: 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'noble-quran',
    name: '📖 Noble Quran on Wooden Rahl',
    desc: 'Holy Quran manuscript open on carved wooden stand with warm light',
    previewUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'quran-tazkeer-bookmark',
    name: '📖 Open Quran & Ribbon Bookmark',
    desc: 'Beautiful open Holy Quran with gold rosette page marker',
    previewUrl: 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'ramadan-lantern',
    name: '🌙 Ramadan Lantern (Fanous)',
    desc: 'Glowing golden Ramadan lantern with warm spiritual light',
    previewUrl: 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'blue-mosque-istanbul',
    name: '🕌 Sultanahmet Blue Mosque',
    desc: 'Iconic minarets & dome silhouette against golden sunset sky',
    previewUrl: 'https://images.unsplash.com/photo-1574246604907-db69e30ddb97?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'sheikh-zayed-mosque',
    name: '🕌 Sheikh Zayed Grand Mosque',
    desc: 'Pristine white marble arches & reflective water pools',
    previewUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'mosque-arches',
    name: '✨ Illuminated Mosque Arches',
    desc: 'Intricate golden Islamic arches and vaulted hallways',
    previewUrl: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'mosque-minaret-sky',
    name: '🕌 Minaret Silhouette at Sunset',
    desc: 'Golden sunset sky framing a peaceful mosque minaret',
    previewUrl: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'islamic-pattern',
    name: '✨ Islamic Arabesque Mosaic',
    desc: 'Intricate arabesque mosaics, golden star lattice & arched architecture',
    previewUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'starry-night',
    name: '🌌 Starry Cosmic Sky',
    desc: 'Deep dark night sky filled with glowing stars & stardust',
    previewUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'golden-desert',
    name: '🏜️ Golden Desert Sunset',
    desc: 'Majestic rolling sand dunes under warm sunset light rays',
    previewUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'divine-sky',
    name: '🌤️ Divine Sun Rays & Sky',
    desc: 'Peaceful sky with golden sunbeams breaking through soft clouds',
    previewUrl: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'misty-nature',
    name: '🌲 Misty Forest Canopy',
    desc: 'Serene emerald pine forest trees & peaceful misty mountains',
    previewUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'peaceful-ocean',
    name: '🌊 Peaceful Ocean Waves',
    desc: 'Calm turquoise sea horizon & soothing ocean water',
    previewUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'glowing-waterfall',
    name: '🏞️ Mountain Waterfall & River',
    desc: 'Cascading forest waterfall and crystalline natural stream',
    previewUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'blooming-garden',
    name: '🌿 Lush Forest Greenery',
    desc: 'Fresh green leaves and soft dappled forest sunlight',
    previewUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'cosmic-nebula',
    name: '✨ Deep Space Nebula',
    desc: 'Stunning celestial gas nebula & distant galaxy light',
    previewUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'snowy-mountains',
    name: '🏔️ Majestic Snowy Peaks',
    desc: 'Alpine snow-capped mountain peaks bathed in soft sunrise',
    previewUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'emerald-valley',
    name: '⛰️ Emerald Mountain Lake',
    desc: 'Crystalline mountain mirror lake reflecting green valleys',
    previewUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'aurora-borealis',
    name: '🌌 Northern Aurora Sky',
    desc: 'Dancing green celestial aurora lights over quiet night landscape',
    previewUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'none',
    name: '🎨 Solid Color Theme (No Photo)',
    desc: 'Clean color theme without background photography',
    previewUrl: ''
  }
];

const TEXT_ANIMATIONS: { id: TextAnimation; name: string; desc: string }[] = [
  { id: 'fade-scale', name: 'Fade & Smooth Scale', desc: 'Text gently expands and fades into focus on verse changes' },
  { id: 'slide-up', name: 'Slide Up Entrance', desc: 'Verses slide smoothly upward into position' },
  { id: 'glow-pulse', name: 'Golden Glowing Aura', desc: 'Text emits a soft, breathing golden light pulse' },
  { id: 'none', name: 'Static (Instant)', desc: 'Instant text display without animation effect' }
];

export const ReciterAndStyleConfig: React.FC<ConfigProps> = ({ config, onChange }) => {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPlayingQuickSample, setIsPlayingQuickSample] = useState(false);
  const quickAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentReciter = RECITERS.find((r) => r.folder === config.reciterFolder) || RECITERS[0];
  const currentTranslationReciter = TRANSLATION_RECITERS.find((tr) => tr.folder === config.translationReciterFolder) || TRANSLATION_RECITERS[0];

  const toggleQuickSample = () => {
    if (isPlayingQuickSample) {
      if (quickAudioRef.current) {
        quickAudioRef.current.pause();
        quickAudioRef.current = null;
      }
      setIsPlayingQuickSample(false);
      return;
    }

    if (quickAudioRef.current) {
      quickAudioRef.current.pause();
      quickAudioRef.current = null;
    }

    const sampleUrl = getAudioUrl(config.reciterFolder, 1, 1);
    const audio = new Audio(sampleUrl);
    quickAudioRef.current = audio;

    audio.oncanplay = () => {
      setIsPlayingQuickSample(true);
      audio.play().catch((e) => console.warn('Quick audio sample playback prevented:', e));
    };

    audio.onended = () => {
      setIsPlayingQuickSample(false);
    };

    audio.onerror = () => {
      setIsPlayingQuickSample(false);
    };
  };

  return (
    <div className="bg-[#0e1626] rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4" /> Video Studio Customization
        </h2>

        {/* Reciter Review Open Button */}
        <button
          type="button"
          onClick={() => setIsReviewModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-md shadow-amber-500/20 self-start sm:self-auto"
        >
          <Headphones className="w-4 h-4" />
          <span>🎧 Reciter Review &amp; Voice Catalog</span>
        </button>
      </div>

      {/* Feature Showcase: Exact Quran Page Visual */}
      <div className="bg-gradient-to-r from-[#0d2a20] via-[#083829] to-[#0a231b] p-4 rounded-xl border border-emerald-500/40 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-wider">
                New Visual Feature
              </span>
              <h3 className="text-sm font-extrabold text-emerald-300 flex items-center gap-1.5">
                📖 Exact Quran Page Visual (Authentic Printed Mushaf)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Displays authentic Madani Quran pages with pure Arabic calligraphy, enlarged font size dynamically fitted to page space, and word-by-word recitation highlights (pure Arabic, no translation text).
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-stretch sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onChange({
                  videoStyle: 'quran-page',
                  bgImageCategory: 'none',
                  arabicScript: 'uthmani',
                  highlightRecitedWords: true
                });
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md ${
                config.videoStyle === 'quran-page' && config.bgImageCategory === 'none'
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/80 shadow-amber-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <span>{config.videoStyle === 'quran-page' && config.bgImageCategory === 'none' ? '✓ Authentic Page Active' : '✨ Apply Authentic Quran Page'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange({
                  videoStyle: 'quran-page',
                  bgImageCategory: config.bgImageCategory === 'none' ? 'starry-night' : config.bgImageCategory,
                  highlightRecitedWords: true
                });
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                config.videoStyle === 'quran-page' && config.bgImageCategory !== 'none'
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 ring-1 ring-emerald-400/50'
                  : 'bg-[#12231e] text-slate-200 border-emerald-500/30 hover:bg-[#18312a]'
              }`}
            >
              <span>🖼️ Page Frame + Scenery Photo</span>
            </button>
          </div>
        </div>
      </div>

      {/* 100% Copyright-Free & YouTube Monetization Shield Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-[#0d2218] to-slate-900 border border-emerald-500/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0 text-lg">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
                100% Copyright-Free &amp; Monetization Safe
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-400 text-slate-950 font-extrabold uppercase">
                Zero Content ID Claims
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/80 mt-0.5 leading-relaxed">
              Synthesized AI Translation Voices + Public Domain Arabic Recitations + 4K Unsplash Backgrounds + Google Open Fonts. 100% safe for YouTube Shorts, Reels &amp; TikTok monetization.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onChange({
              audioMode: 'both',
              translationReciterFolder: 'tts-ur-scholar',
              translationReciterName: 'Urdu — Mature Indian Scholar (50-55 yrs, 120Hz Baritone • Voice Lock)',
              translationLang: 'ur',
              voiceLock: true,
              voiceProfile: 'scholar-mature-baritone',
              deliverySpeed: 1.0,
              baritoneResonance: true,
              bgImageCategory: 'holy-kaaba-makkah',
              rotateBgPerAyah: true,
              videoStyle: 'modern-dark'
            });
          }}
          className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm flex-shrink-0 whitespace-nowrap"
        >
          <span>✨</span> Apply 100% Copyright-Free Setup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Reciter Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-amber-400" /> Arabic Qari Voice
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="text-[11px] text-amber-400 hover:underline font-semibold flex items-center gap-1"
              >
                Review Specs &amp; Ratings
              </button>
              {config.audioMode === 'translation-only' && (
                <span className="text-[10px] text-amber-400/80 font-normal">(Disabled in Translation-Only mode)</span>
              )}
            </div>
          </label>

          <div className="flex items-center gap-2">
            <select
              value={config.reciterFolder}
              disabled={config.audioMode === 'translation-only'}
              onChange={(e) => {
                const selected = RECITERS.find((r) => r.folder === e.target.value);
                onChange({
                  reciterFolder: e.target.value,
                  reciterName: selected ? selected.name : e.target.value
                });
              }}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                config.audioMode === 'translation-only'
                  ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-[#141e33] border-slate-700 text-slate-100 focus:border-amber-400 focus:outline-none'
              }`}
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.folder}>
                  {r.name} ({r.quality})
                </option>
              ))}
            </select>

            {/* Quick Listen Sample Button */}
            <button
              type="button"
              onClick={toggleQuickSample}
              disabled={config.audioMode === 'translation-only'}
              title="Listen to voice sample"
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                isPlayingQuickSample
                  ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                  : 'bg-[#141e33] border-slate-700 text-amber-400 hover:bg-[#1c2a47]'
              }`}
            >
              {isPlayingQuickSample ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>

          {/* Reciter Review Snippet Banner */}
          {currentReciter && (
            <div className="bg-[#121c30] p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-300 gap-2">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="font-semibold text-amber-300 truncate">{currentReciter.style || 'Murattal'}</span>
                <span className="text-slate-500">•</span>
                <span className="text-[11px] text-slate-400 truncate">{currentReciter.description}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 font-bold flex-shrink-0">
                <Star className="w-3 h-3 fill-amber-400" /> {currentReciter.rating?.toFixed(1) || '4.9'}
              </div>
            </div>
          )}
        </div>

        {/* 2. Audio Mode */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-amber-400" /> Audio Mode
          </label>
          <select
            value={config.audioMode}
            onChange={(e) => onChange({ audioMode: e.target.value as AudioMode })}
            className="w-full bg-[#141e33] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-all"
          >
            <option value="recitation">Recitation Only (Arabic Qari)</option>
            <option value="both">Arabic Recitation + Spoken Translation Voice</option>
            <option value="translation-only">Translation Voice Only</option>
          </select>
        </div>

        {/* 3. Translation Voice Selection & Speed Options */}
        {(config.audioMode === 'both' || config.audioMode === 'translation-only') && (
          <div className="space-y-3 col-span-1 md:col-span-2 bg-[#121b2f] p-4 rounded-xl border border-amber-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-400" /> Translation Audio Voice &amp; Reciter
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <span>✓</span> 100% Copyright-Free API Voice
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              All AI Spoken Voices (Urdu, English, Hindi, French, Indonesian, Spanish, Turkish, Persian, Bosnian) are generated via real-time Text-to-Speech API with zero Content ID match—100% safe for YouTube monetization, Shorts &amp; Reels.
            </p>

            <select
              value={config.translationReciterFolder}
              onChange={(e) => {
                const selected = TRANSLATION_RECITERS.find((t) => t.folder === e.target.value);
                const folderVal = e.target.value;
                let profile: 'scholar-mature-baritone' | 'elder-bayan-warm' | 'mufti-deep-resonant' | 'gentle-muallim-narrator' | 'dignified-female-scholar' | 'authentic-human' | 'standard' = 'standard';

                if (folderVal === 'tts-ur-scholar') profile = 'scholar-mature-baritone';
                else if (folderVal === 'tts-ur-bayan') profile = 'elder-bayan-warm';
                else if (folderVal === 'tts-ur-mufti') profile = 'mufti-deep-resonant';
                else if (folderVal === 'tts-ur-muallim') profile = 'gentle-muallim-narrator';
                else if (folderVal === 'translations/urdu_farhat_hashmi') profile = 'dignified-female-scholar';
                else if (folderVal === 'translations/urdu_shamshad_ali_khan_46kbps') profile = 'authentic-human';

                onChange({
                  translationReciterFolder: e.target.value,
                  translationReciterName: selected ? selected.name : e.target.value,
                  voiceProfile: profile,
                  baritoneResonance: profile !== 'standard' && profile !== 'authentic-human'
                });
              }}
              className="w-full bg-[#17233d] border border-amber-500/40 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-all font-semibold"
            >
              {TRANSLATION_RECITERS.map((tr) => (
                <option key={tr.id} value={tr.folder}>
                  {tr.name} ({tr.quality})
                </option>
              ))}
            </select>

            {/* Voice Speed Control */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-medium">Translation Voice Speed:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '0.85x (Slow & Calm)', val: 0.85 },
                  { label: '1.0x (Normal Authentic)', val: 1.0 },
                  { label: '1.15x (Brisk)', val: 1.15 },
                  { label: '1.25x (Fast)', val: 1.25 },
                  { label: '1.5x (Accelerated)', val: 1.5 }
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => onChange({ translationSpeechRate: s.val, deliverySpeed: s.val })}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      (config.deliverySpeed || config.translationSpeechRate || 1.0) === s.val
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-[#182643] text-slate-300 hover:text-white hover:bg-[#203157]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Permanent Voice Settings (Voice Lock) Special Panel */}
            <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-[#1c1208] via-[#160d05] to-[#0f0803] border border-amber-500/60 shadow-lg">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-base">🔒</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                      Permanent Voice Settings (Voice Lock)
                    </h4>
                    <p className="text-[11px] text-amber-400/80">
                      Mature Indian Scholar (50-55 yrs) • 120Hz Mid-Baritone • Natural Authentic Delivery
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextLocked = !config.voiceLock;
                    if (nextLocked) {
                      onChange({
                        voiceLock: true,
                        voiceProfile: 'scholar-mature-baritone',
                        deliverySpeed: 1.0,
                        baritoneResonance: true,
                        translationReciterFolder: 'tts-ur-scholar',
                        translationReciterName: 'Urdu — Mature Indian Scholar (50-55 yrs, 120Hz Baritone • Voice Lock)',
                        translationLang: 'ur',
                        videoStyle: config.videoStyle === 'modern-dark' ? 'scholar-rembrandt' : config.videoStyle,
                        slotType: config.slotType || 'alternating-slots'
                      });
                    } else {
                      onChange({
                        voiceLock: false,
                        voiceProfile: 'standard',
                        baritoneResonance: false
                      });
                    }
                  }}
                  className={`px-3 py-1 text-xs rounded-full font-bold transition-all flex items-center gap-1.5 ${
                    config.voiceLock
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {config.voiceLock ? '✓ Voice Locked (Active)' : 'Enable Voice Lock'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-2 border-t border-amber-900/50">
                <div className="space-y-1">
                  <div className="text-amber-300 font-semibold flex items-center gap-1">
                    <span>🎙️</span> Narration Voice &amp; Resonance:
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Mature Indian male scholar (50-55 yrs). Warm, deep mid-baritone (120 Hz centered) with rich chest resonance. Mature Indian Urdu (thehra hua, ba-adab) with respectful Arabic phonetics (deep qaaf ق, clear khe خ, soft he ح, natural ain ع).
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-amber-300 font-semibold flex items-center gap-1">
                    <span>⚡</span> Authentic Delivery &amp; Pacing:
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Authentic 1.0x human tempo with natural breath pauses. Uses warm archival library setting for scholar study slots &amp; silent twilight nature/architecture visuals for symbolic slots (100% human-free imagery throughout).
                  </p>
                </div>
              </div>

              {/* Slot Type Mode Selector */}
              <div className="mt-3 pt-2 border-t border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-amber-200">🎨 Visual Slot Type:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'scholar-study', label: '📚 Scholar Study (No Humans)' },
                    { id: 'symbolic-broll', label: '🌅 Symbolic Twilight (Aniconic)' },
                    { id: 'alternating-slots', label: '🔄 Alternating Slots' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onChange({ slotType: st.id as any })}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        (config.slotType || 'alternating-slots') === st.id ||
                        (st.id === 'scholar-study' && config.slotType === 'scholar-on-screen')
                          ? 'bg-amber-400 text-slate-950 font-bold shadow'
                          : 'bg-[#22140a] text-amber-200/80 hover:bg-[#301c0e]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1 pt-1">
              🎙️ <strong>Authentic Human Urdu:</strong> Select <strong>Shamshad Ali Khan</strong> or <strong>Mature Indian Scholar (Voice Lock)</strong> for 100% natural, expressive human studio recitation with flawless Urdu pronunciation.
            </p>
          </div>
        )}

        {/* 4. Translation Language */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-amber-400" /> Translation Text
          </label>
          <select
            value={config.translationLang}
            onChange={(e) => {
              const newLang = e.target.value as TranslationLang;
              onChange({
                translationLang: newLang
              });
            }}
            className="w-full bg-[#141e33] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-all"
          >
            <option value="en">English (Saheeh International)</option>
            <option value="ur">Urdu — اردو (Jalandhry)</option>
            <option value="hi">Hindi — हिंदी</option>
            <option value="hi-en">✨ Dual Subtitles: Hindi + English (Both on Same Screen)</option>
            <option value="ur-en">✨ Dual Subtitles: Urdu + English (Both on Same Screen)</option>
            <option value="fr">French — Hamidullah</option>
            <option value="id">Indonesian — Bahasa Indonesia</option>
            <option value="es">Spanish — Español</option>
            <option value="tr">Turkish — Türkçe</option>
            <option value="bs">Bosnian — Besim Korkut</option>
            <option value="fa">Farsi — Fooladvand & Hedayatfar</option>
            <option value="none">None (Arabic Only)</option>
          </select>
        </div>

        {/* 5. Arabic Script */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-amber-400" /> Arabic Script Format
          </label>
          <select
            value={config.arabicScript}
            onChange={(e) => onChange({ arabicScript: e.target.value as ArabicScript })}
            className="w-full bg-[#141e33] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-all"
          >
            <option value="uthmani">Uthmani Script (Madani Diacritics)</option>
            <option value="indopak">IndoPak Script (South Asian Format)</option>
          </select>
        </div>

        {/* 6. Arabic Calligraphy & Subtitle Text Scale */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Arabic &amp; Subtitle Text Size
            </span>
            <span className="text-[11px] text-amber-400 font-medium">Automatic Dynamic Fitting</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'normal', label: 'Normal (1X)', scale: '1.0x scale' },
              { id: 'large', label: 'Large (1.5X)', scale: '1.35x scale' },
              { id: 'extra-large', label: 'Extra Large (2X)', scale: '1.75x scale' },
              { id: 'huge', label: 'Huge (3X)', scale: '2.25x scale' }
            ].map((s) => {
              const active = (config.textSize || 'large') === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ textSize: s.id as TextSize })}
                  className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 font-bold'
                      : 'bg-[#141e33] border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs">{s.label}</div>
                  <div className="text-[9px] opacity-70">{s.scale}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The Authentic Quran Page dynamically fits calligraphy to maximize page space while preserving classical Mushaf proportions.
          </p>
        </div>

        {/* 7. Quran Page Specific: Verses per Screen */}
        {config.videoStyle === 'quran-page' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                📖 Verses Displayed Per Page
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Fewer verses = larger calligraphy</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { count: 1, label: '1 Ayah', sub: 'Max Size' },
                { count: 2, label: '2 Ayat', sub: 'Super Large' },
                { count: 3, label: '3 Ayat', sub: 'Royal ★' },
                { count: 5, label: '5 Ayat', sub: 'Balanced' },
                { count: 10, label: '10 Ayat', sub: 'Mushaf ★' }
              ].map((opt) => {
                const active = (config.mushafAyatPerPage || 10) === opt.count;
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => onChange({ mushafAyatPerPage: opt.count })}
                    className={`py-2 px-1 rounded-xl border text-center transition-all ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30 font-bold'
                        : 'bg-[#141e33] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[9px] opacity-70">{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Single Focused Line per Frame Toggle */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between bg-[#121c30] p-3 rounded-xl border border-slate-800">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Single Focused Line per Frame (Max Enlargement)
            </span>
            <p className="text-[11px] text-slate-400">
              Enlarges Arabic calligraphy &amp; subtitles into one prominent focused line per video frame (ideal for Shorts, Reels &amp; TikTok).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ oneLinePerFrame: !config.oneLinePerFrame })}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
              config.oneLinePerFrame ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                config.oneLinePerFrame ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 6. Gapless Verse Combination Setting */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between bg-[#121c30] p-3 rounded-xl border border-slate-800">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Seamless 0ms Gapless Verse Audio
            </span>
            <p className="text-[11px] text-slate-400">
              Trims silent padding between combined verses to eliminate pauses during playback &amp; export.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ gaplessAudio: !config.gaplessAudio })}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
              config.gaplessAudio ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                config.gaplessAudio ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 7. Video Aspect Ratio Toggle */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Video Aspect Ratio &amp; Platform</span>
          <span className="text-[11px] text-slate-400 font-normal">Choose 16:9 for YouTube or 9:16 for Shorts/TikTok</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ aspectRatio: '16:9' })}
            className={`p-3.5 rounded-xl border flex items-center justify-center gap-3 transition-all ${
              config.aspectRatio === '16:9'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                : 'bg-[#141e33] border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="w-8 h-4 border-2 border-current rounded-sm flex items-center justify-center text-[9px] font-bold">
              16:9
            </div>
            <div className="text-left">
              <div className="text-xs font-bold">16:9 Landscape</div>
              <div className="text-[10px] opacity-75">YouTube / TV / Desktop (1920x1080)</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ aspectRatio: '9:16' })}
            className={`p-3.5 rounded-xl border flex items-center justify-center gap-3 transition-all ${
              config.aspectRatio === '9:16'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                : 'bg-[#141e33] border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="w-4 h-7 border-2 border-current rounded-sm flex items-center justify-center text-[9px] font-bold">
              9:16
            </div>
            <div className="text-left">
              <div className="text-xs font-bold">9:16 Vertical</div>
              <div className="text-[10px] opacity-75">YouTube Shorts / TikTok / Reels</div>
            </div>
          </button>
        </div>
      </div>

      {/* 8. Text Animation Effect */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-amber-400" /> Verse Text Animation Effect
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEXT_ANIMATIONS.map((anim) => (
            <button
              key={anim.id}
              type="button"
              onClick={() => onChange({ textAnimation: anim.id })}
              className={`p-3 rounded-xl border text-left transition-all ${
                config.textAnimation === anim.id
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                  : 'border-slate-800 bg-[#121c30] hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-bold text-slate-100 flex items-center justify-between">
                <span>{anim.name}</span>
                {config.textAnimation === anim.id && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{anim.desc}</p>
            </button>
          ))}
        </div>

        {/* Word-by-Word Recitation Highlight Toggle */}
        <div className="mt-3 bg-[#121c30] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Active Word Color Highlighting
            </span>
            <p className="text-[10px] text-slate-400">
              Changes word color to glowing gold in real-time as the Qari recites it
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ highlightRecitedWords: !(config.highlightRecitedWords ?? true) })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              (config.highlightRecitedWords ?? true) ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                (config.highlightRecitedWords ?? true) ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Text Size & Screen Spacing Selector */}
        <div className="mt-3 bg-[#121c30] p-3.5 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-400" /> Verse Font Size &amp; Screen Spacing
            </span>
            <span className="text-[11px] text-amber-300 font-medium">
              {config.textSize === 'compact' && 'Compact (हल्का / कम)'}
              {(config.textSize === 'normal' || !config.textSize) && 'Balanced (संतुलित)'}
              {config.textSize === 'large' && 'Large (बड़ा)'}
              {config.textSize === 'extra-large' && 'Extra Large'}
              {config.textSize === 'huge' && 'Huge'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Font size kam/chhota karne se screen bhari hui nahi lagti aur layout saaf aur khula dikhta hai.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-0.5">
            {[
              { id: 'compact', label: 'Compact', sub: 'कम / छोटा' },
              { id: 'normal', label: 'Balanced', sub: 'संतुलित' },
              { id: 'large', label: 'Large', sub: 'बड़ा' },
              { id: 'extra-large', label: 'X-Large', sub: 'विशाल' },
              { id: 'huge', label: 'Huge', sub: 'अधिक बड़ा' }
            ].map((s) => {
              const isActive = (config.textSize || 'normal') === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ textSize: s.id as any })}
                  className={`py-2 px-2 rounded-lg border text-center transition-all ${
                    isActive
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/30 font-bold'
                      : 'border-slate-800 bg-[#162238] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{s.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{s.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 9. Background Image Themes */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Verse Background Image Theme
          </label>
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold self-start sm:self-auto">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Pure Natural Scenery (No Humans / Animals)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BG_IMAGE_CATEGORIES.map((bgCat) => (
            <button
              key={bgCat.id}
              type="button"
              onClick={() => onChange({ bgImageCategory: bgCat.id })}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                config.bgImageCategory === bgCat.id
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                  : 'border-slate-800 bg-[#121c30] hover:border-slate-700'
              }`}
            >
              {bgCat.previewUrl ? (
                <div className="h-16 w-full rounded-lg mb-2 overflow-hidden relative border border-slate-700/80">
                  <img
                    src={bgCat.previewUrl}
                    alt={bgCat.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-1.5">
                    <span className="text-[10px] font-bold text-amber-300 drop-shadow-md">
                      {bgCat.name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-16 w-full rounded-lg mb-2 border border-slate-700/80 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center text-slate-400 text-xs font-medium">
                  Default Color Gradient
                </div>
              )}
              <div className="text-xs font-bold text-slate-200">{bgCat.name}</div>
              <div className="text-[10px] text-slate-400 line-clamp-1">{bgCat.desc}</div>
            </button>
          ))}
        </div>

        {/* Scenery Motion & Rotation Feature Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="bg-[#121c30] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" /> 1 Line Per Frame
              </span>
              <p className="text-[10px] text-slate-400">
                Large, uncongested single-line verse display
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ oneLinePerFrame: !config.oneLinePerFrame })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.oneLinePerFrame ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.oneLinePerFrame ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="bg-[#121c30] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Auto-Rotate Scenery
              </span>
              <p className="text-[10px] text-slate-400">
                New background photo every verse
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ rotateBgPerAyah: !(config.rotateBgPerAyah ?? true) })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (config.rotateBgPerAyah ?? true) ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  (config.rotateBgPerAyah ?? true) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="bg-[#121c30] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-amber-400" /> Motion &amp; Stardust
              </span>
              <p className="text-[10px] text-slate-400">
                Cinematic slow zoom &amp; particles
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ animatedSceneryEffects: !(config.animatedSceneryEffects ?? true) })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (config.animatedSceneryEffects ?? true) ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  (config.animatedSceneryEffects ?? true) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Background Overlay Darkness Slider */}
        {config.bgImageCategory && config.bgImageCategory !== 'none' && (
          <div className="mt-3 bg-[#121c30] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200">
                Background Image Dimness (Text Contrast):
              </span>
              <p className="text-[10px] text-slate-400">
                Higher dimness ensures Arabic calligraphy stays crystal clear.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.3"
                max="0.85"
                step="0.05"
                value={config.bgOverlayDarkness ?? 0.55}
                onChange={(e) => onChange({ bgOverlayDarkness: parseFloat(e.target.value) })}
                className="w-24 accent-amber-400 cursor-pointer"
              />
              <span className="text-xs font-bold text-amber-400 min-w-[36px] text-right">
                {Math.round((config.bgOverlayDarkness ?? 0.55) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 10. Video Themes */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Video Canvas Frame Theme
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VIDEO_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange({ videoStyle: style.id })}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                config.videoStyle === style.id
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                  : 'border-slate-800 bg-[#121c30] hover:border-slate-700'
              }`}
            >
              <div className={`h-12 w-full rounded-lg mb-2.5 border p-2 flex items-center justify-center ${style.previewBg}`}>
                <span className="font-quran text-sm font-bold">
                  بِسْمِ ٱللَّهِ
                </span>
              </div>
              <div className="text-xs font-bold text-slate-200">{style.name}</div>
              <div className="text-[11px] text-slate-400 line-clamp-1">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Reciter Review & Audio Voice Catalog Modal */}
      <ReciterReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        config={config}
        onChange={onChange}
      />
    </div>
  );
};
