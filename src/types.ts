export interface Ayah {
  num: number;
  arabic: string;
  indopak?: string;
  english?: string;
  urdu?: string;
  hindi?: string;
  french?: string;
  indonesian?: string;
  spanish?: string;
  turkish?: string;
  audioUrl?: string;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs?: Ayah[];
}

export type AspectRatio = '16:9' | '9:16';

export type VideoStyle =
  | 'modern-dark'
  | 'classic-mushaf'
  | 'parchment-mushaf'
  | 'emerald-gold'
  | 'minimal-twilight'
  | 'quran-page';

export type AudioMode = 'recitation' | 'both' | 'translation-only';

export type ArabicScript = 'uthmani' | 'indopak';

export type TranslationLang = 'en' | 'ur' | 'hi' | 'fr' | 'id' | 'es' | 'tr' | 'bs' | 'fa' | 'hi-en' | 'ur-en' | 'none';

export interface Reciter {
  id: string;
  name: string;
  folder: string;
  quality: string;
  category: 'popular' | 'classic' | 'melodic' | 'custom';
  style?: string;
  rating?: number;
  reviewsCount?: number;
  description?: string;
  tags?: string[];
  sampleAyah?: { surah: number; ayah: number };
}

export interface TranslationReciter {
  id: string;
  name: string;
  lang: TranslationLang;
  folder: string;
  quality: string;
  style?: string;
  rating?: number;
  reviewsCount?: number;
  description?: string;
  tags?: string[];
  sampleText?: string;
}

export type TextAnimation = 'fade-scale' | 'slide-up' | 'glow-pulse' | 'none';

export type BgImageCategory =
  | 'none'
  | 'starry-night'
  | 'golden-desert'
  | 'divine-sky'
  | 'misty-nature'
  | 'peaceful-ocean'
  | 'glowing-waterfall'
  | 'blooming-garden'
  | 'cosmic-nebula'
  | 'snowy-mountains'
  | 'emerald-valley'
  | 'aurora-borealis';

export interface VideoConfig {
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  reciterFolder: string;
  reciterName: string;
  translationLang: TranslationLang;
  translationReciterFolder: string;
  translationReciterName: string;
  translationSpeechRate?: number; // 0.85, 1.0, 1.15
  audioMode: AudioMode;
  aspectRatio: AspectRatio;
  videoStyle: VideoStyle;
  bgImageCategory: BgImageCategory;
  rotateBgPerAyah?: boolean; // Automatically rotate scenery background for every new Ayah
  animatedSceneryEffects?: boolean; // Subtle motion zoom, drift & floating ambient particles
  bgOverlayDarkness: number; // 0.3 to 0.8
  textAnimation: TextAnimation;
  highlightRecitedWords?: boolean; // Real-time word-by-word recitation color highlight
  arabicScript: ArabicScript;
  draftQuality: boolean;
  gaplessAudio: boolean;
}

export interface SavedVideo {
  id: string;
  title: string;
  surahName: string;
  surahNumber: number;
  aspectRatio: AspectRatio;
  duration: number;
  blobUrl: string;
  fileSize: string;
  createdAt: string;
  thumbnailUrl?: string;
}
