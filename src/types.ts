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
  persian?: string;
  bosnian?: string;
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
  | 'quran-page'
  | 'scholar-rembrandt'
  | 'symbolic-broll';

export type AudioMode = 'recitation' | 'both' | 'translation-only';

export type ArabicScript = 'uthmani' | 'indopak';

export type TranslationLang = 'en' | 'ur' | 'hi' | 'fr' | 'id' | 'es' | 'tr' | 'bs' | 'fa' | 'hi-en' | 'ur-en' | 'none';

export type SlotType = 'scholar-study' | 'scholar-on-screen' | 'symbolic-broll' | 'alternating-slots' | 'standard';

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

export type TextSize = 'compact' | 'normal' | 'large' | 'extra-large' | 'huge';

export type BgImageCategory =
  | 'none'
  // 4K Makkah Al-Mukarramah
  | 'makkah-kaaba-majestic'
  | 'makkah-clock-tower-night'
  | 'makkah-grand-minarets'
  | 'makkah-haram-golden-night'
  | 'makkah-spire-skyline'
  | 'holy-kaaba-makkah'
  | 'kaaba-kiswah-gold'
  | 'makkah-grand-mosque-minarets'
  // 4K Madinah Al-Munawwarah
  | 'madinah-green-dome'
  | 'madinah-giant-umbrellas'
  | 'madinah-sacred-arches'
  | 'madinah-minaret-sunset'
  | 'madinah-marble-courtyard'
  | 'prophets-mosque-madinah'
  // Sacred Islamic Heritage & Nature
  | 'masjid-al-aqsa-dome'
  | 'islamic-geometric-calligraphy'
  | 'scholar-study'
  | 'symbolic-twilight-desert'
  | 'symbolic-ancient-marketplace'
  | 'symbolic-divine-light'
  | 'symbolic-divine-silhouette'
  | 'historical-artifacts'
  | 'noble-quran'
  | 'quran-tazkeer-bookmark'
  | 'ramadan-lantern'
  | 'blue-mosque-istanbul'
  | 'sheikh-zayed-mosque'
  | 'mosque-arches'
  | 'mosque-minaret-sky'
  | 'islamic-pattern'
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
  textSize?: TextSize; // Text scale: 'normal', 'large', 'extra-large', 'huge' (enlarged text)
  mushafAyatPerPage?: number; // Verses displayed per page in Quran Page mode
  oneLinePerFrame?: boolean; // Display 1 line per frame to avoid multi-line congestion
  draftQuality: boolean;
  gaplessAudio: boolean;
  // Permanent Voice Lock & Scholar Cinematic System
  voiceLock?: boolean;
  voiceProfile?:
    | 'scholar-mature-baritone'
    | 'elder-bayan-warm'
    | 'mufti-deep-resonant'
    | 'gentle-muallim-narrator'
    | 'dignified-female-scholar'
    | 'authentic-human'
    | 'standard';
  deliverySpeed?: number; // 0.85, 1.0, 1.15, 1.25, 1.5, 2.0, 2.5
  slotType?: SlotType;
  baritoneResonance?: boolean; // 120Hz deep chest resonance
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
  audioBlobUrl?: string;
  sdBlobUrl?: string;
  hdBlobUrl?: string;
  resolutionMode?: 'sd' | 'hd';
}

export interface SavedTaskSession {
  id: string;
  surahNumber: number;
  surahName: string;
  englishName: string;
  startAyah: number;
  endAyah: number;
  config: VideoConfig;
  updatedAt: string;
  status: 'draft' | 'incomplete_export' | 'exported' | 'completed';
  completedVideoId?: string;
  completedVideoTitle?: string;
  completedVideoUrl?: string;
  completedFileSize?: string;
  completedDuration?: number;
  lastExportProgress?: {
    stepText?: string;
    completedVerses?: number;
    totalVerses?: number;
  };
}

export type UserRole = 'admin' | 'subscriber' | 'member' | 'guest';
export type AccessStatus = 'active' | 'pending' | 'revoked' | 'unauthorized';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  status: AccessStatus;
  subscriptionPlan?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AllowedUser {
  email: string;
  role: UserRole;
  status: 'active' | 'revoked';
  plan?: string;
  notes?: string;
  addedBy: string;
  addedAt: string;
}

export interface SubscriberRecord {
  id: string;
  memberId: string;
  email: string;
  password?: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'pending' | 'revoked';
  subscriptionPlan: string;
  createdAt: string;
  lastLoginAt?: string;
  emailVerified?: boolean;
  notes?: string;
  issuedBy?: string;
}

export interface AccessRequest {
  id: string;
  email: string;
  displayName?: string;
  reason?: string;
  plan?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface AccessCode {
  id: string;
  code: string;
  role: UserRole;
  plan?: string;
  usesLeft: number;
  createdBy: string;
  createdAt: string;
}

export type BatchExportMode = 'individual-clips' | 'consolidated-segment' | 'full-merged-master';

export interface BatchClipItem {
  id: string;
  clipNumber: number;
  startAyah: number;
  endAyah: number;
  ayahCount: number;
  title: string;
  fileName: string;
  status: 'idle' | 'rendering' | 'completed' | 'error' | 'skipped';
  progressPercent: number;
  elapsedSec?: number;
  durationSec?: number;
  videoBlob?: Blob;
  videoUrl?: string;
  audioBlob?: Blob;
  audioUrl?: string;
  srtContent?: string;
  vttContent?: string;
  fileSize?: string;
  errorMessage?: string;
}

export interface BatchExportSettings {
  mode: BatchExportMode;
  chunkSize: number; // 1 = 1 Ayah/Clip, 3, 5, 10, 15, 20 or full
  resolution: 'fast' | 'hd';
  includeTitleCard: 'every-clip' | 'first-clip-only' | 'none';
  includeBismillah: 'surah-start-only' | 'none';
  autoSaveToLibrary: boolean;
  autoMergeAllVerses: boolean; // Merge all generated verses into 1 master video when batch completes
  autoDownloadMerged?: boolean; // Automatically trigger browser download of merged MP4 when ready
  namingPattern: 'surah-ayah-range' | 'part-number' | 'social-reel';
}
