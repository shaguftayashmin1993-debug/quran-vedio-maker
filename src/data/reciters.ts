import { Reciter, TranslationReciter } from '../types';

export const RECITERS: Reciter[] = [
  // Very famous & popular Qaris
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    folder: 'Alafasy_128kbps',
    quality: '128kbps HD',
    category: 'popular',
    style: 'Melodic & Emotional Murattal',
    rating: 5.0,
    reviewsCount: 3420,
    description: 'World famous Kuwaiti Qari loved for his soulful, rhythmic cadence and flawless Tajweed. Ideal for social media shorts.',
    tags: ['Haramain Style', 'Melodic', 'Clear Tajweed', 'Top Rated'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'sudais',
    name: 'Abdur-Rahman As-Sudais',
    folder: 'Abdurrahmaan_As-Sudais_192kbps',
    quality: '192kbps HD',
    category: 'popular',
    style: 'Grand Makkah Haramain Recitation',
    rating: 4.9,
    reviewsCount: 2890,
    description: 'Imam of Masjid al-Haram Makkah, renowned for his awe-inspiring, powerful acoustic resonance and heartfelt passion.',
    tags: ['Grand Imam Makkah', 'Powerful Voice', '192kbps Studio'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'shuraim',
    name: 'Saud Al-Shuraim',
    folder: 'Saood_ash-Shuraym_128kbps',
    quality: '128kbps HD',
    category: 'popular',
    style: 'Majestic & Fast-Paced Murattal',
    rating: 4.9,
    reviewsCount: 2140,
    description: 'Former Imam of Masjid al-Haram, legendary for his energetic tempo and crystal-clear articulation.',
    tags: ['Makkah Classic', 'Brisk Pace', 'Crisp Audio'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'maher',
    name: 'Maher Al-Muaiqly',
    folder: 'MaherAlMuaiqly128kbps',
    quality: '128kbps HD',
    category: 'popular',
    style: 'Soothing & Gentle Cadence',
    rating: 4.9,
    reviewsCount: 2680,
    description: 'Imam of Makkah Grand Mosque, famous for his tranquil, calming tone that brings deep peace during listening.',
    tags: ['Calming', 'Soothing', 'Makkah Imam'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit (Murattal)',
    folder: 'Abdul_Basit_Murattal_192kbps',
    quality: '192kbps HD',
    category: 'popular',
    style: 'Golden Era Classical Egyptian',
    rating: 5.0,
    reviewsCount: 3100,
    description: 'The legendary Egyptian Qari known as the "Golden Voice of the Quran", immortal vocal control and timeless mastery.',
    tags: ['Legendary Qari', 'Classic Egyptian', 'Timeless Masterpiece'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'minshawi',
    name: 'Mohamed Siddiq El-Minshawi',
    folder: 'Minshawy_Murattal_128kbps',
    quality: '128kbps HD',
    category: 'popular',
    style: 'Profound & Humbling Murattal',
    rating: 5.0,
    reviewsCount: 2980,
    description: 'One of the greatest classic reciters in Islamic history, deeply emotional and reverent recitation style.',
    tags: ['Profound Emotion', 'Egyptian Master', 'Deep Reverence'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'husary',
    name: 'Mahmoud Khalil Al-Husary',
    folder: 'Husary_128kbps',
    quality: '128kbps HD',
    category: 'popular',
    style: 'Pristine Tajweed Gold Standard',
    rating: 4.9,
    reviewsCount: 2200,
    description: 'The world reference standard for Tajweed precision and slow, meticulous pronunciation. Best for learners.',
    tags: ['Tajweed Master', 'Perfect Precision', 'Slow & Clear'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'dossari',
    name: 'Yasser Ad-Dossari',
    folder: 'Yasser_Ad-Dussary_128kbps',
    quality: '128kbps HD',
    category: 'popular',
    style: 'Resonant & Passionate Recitation',
    rating: 4.9,
    reviewsCount: 2450,
    description: 'Imam of Masjid al-Haram Makkah, celebrated for his dramatic range, resonant tone, and powerful delivery.',
    tags: ['Resonant Power', 'Makkah Imam', 'Viral Style'],
    sampleAyah: { surah: 1, ayah: 1 }
  },

  // Melodic & Classic Qaris
  {
    id: 'ghamdi',
    name: 'Saad Al-Ghamdi',
    folder: 'Ghamadi_40kbps',
    quality: '40kbps',
    category: 'melodic',
    style: 'Smooth & Warm Flow',
    rating: 4.8,
    reviewsCount: 1820,
    description: 'Famous Saudi reciter with a distinctive smooth, melodious voice enjoyed across Arab & Western worlds.',
    tags: ['Smooth Flow', 'Warm Tone'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'ajmi',
    name: 'Ahmed Ibn Ali Al-Ajmi',
    folder: 'ahmed_ibn_ali_al_ajamy_128kbps',
    quality: '128kbps HD',
    category: 'melodic',
    style: 'Acoustic Warmth & Emotion',
    rating: 4.8,
    reviewsCount: 1650,
    description: 'Renowned Saudi Qari with an inviting, melodic vocal harmony loved for its warmth.',
    tags: ['Warm Voice', 'Melodic'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'ayyoub',
    name: 'Muhammad Ayyoub',
    folder: 'Muhammad_Ayyoub_128kbps',
    quality: '128kbps HD',
    category: 'classic',
    style: 'Classic Madinah Haramain',
    rating: 4.9,
    reviewsCount: 1420,
    description: 'Former Imam of the Prophet’s Mosque in Madinah, historic Hijazi style of recitation.',
    tags: ['Madinah Imam', 'Classic Hijazi'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'hudhaify',
    name: 'Ali Al-Hudhaify',
    folder: 'Hudhaify_128kbps',
    quality: '128kbps HD',
    category: 'classic',
    style: 'Dignified & Steady Tempo',
    rating: 4.9,
    reviewsCount: 1380,
    description: 'Chief Imam of the Prophet’s Mosque Madinah, dignified, measured, and solemn recitation style.',
    tags: ['Prophet Mosque Imam', 'Solemn & Clear'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'shatri',
    name: 'Abu Bakr Ash-Shatri',
    folder: 'Abu_Bakr_Ash-Shaatree_128kbps',
    quality: '128kbps HD',
    category: 'melodic',
    style: 'Gentle & Tranquil Flow',
    rating: 4.8,
    reviewsCount: 1210,
    description: 'Jeddah-based Qari with a soothing, soft cadence that relaxes the heart.',
    tags: ['Gentle Tone', 'Tranquil Cadence'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'qatami',
    name: 'Nasser Al-Qatami',
    folder: 'Nasser_Alqatami_128kbps',
    quality: '128kbps HD',
    category: 'melodic',
    style: 'Vibrant & Modern Melodic',
    rating: 4.8,
    reviewsCount: 1150,
    description: 'Riyadh Qari with a vibrant, modern vocal inflection and crisp acoustic quality.',
    tags: ['Modern Melodic', 'Vibrant Tone'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'rifai',
    name: 'Hani Ar-Rifai',
    folder: 'Hani_Rifai_192kbps',
    quality: '192kbps HD',
    category: 'classic',
    style: 'Tearful & Deeply Emotional',
    rating: 4.8,
    reviewsCount: 980,
    description: 'Unique emotional reciter known for deeply moving, tearful recitations.',
    tags: ['Emotional Depth', '192kbps Studio'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'jaber',
    name: 'Ali Jaber',
    folder: 'Ali_Jaber_64kbps',
    quality: '64kbps',
    category: 'classic',
    style: 'Historic Makkah 1980s Heritage',
    rating: 4.9,
    reviewsCount: 1310,
    description: 'Beloved former Imam of Makkah Haram in the 1980s, classic nostalgic sound.',
    tags: ['Nostalgic Heritage', 'Makkah History'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'basfar',
    name: 'Abdullah Basfar',
    folder: 'Abdullah_Basfar_192kbps',
    quality: '192kbps HD',
    category: 'classic',
    style: 'Articulate Studio Quality',
    rating: 4.8,
    reviewsCount: 890,
    description: 'Highly articulate studio recording with clear acoustic separation.',
    tags: ['Studio HD', 'Articulate'],
    sampleAyah: { surah: 1, ayah: 1 }
  },
  {
    id: 'abbad',
    name: 'Fares Abbad',
    folder: 'Fares_Abbad_64kbps',
    quality: '64kbps',
    category: 'melodic',
    style: 'Energetic Rhythm',
    rating: 4.8,
    reviewsCount: 920,
    description: 'Yemeni Qari with a melodious, energetic vocal flow.',
    tags: ['Energetic Flow', 'Yemeni Style'],
    sampleAyah: { surah: 1, ayah: 1 }
  }
];

export const TRANSLATION_RECITERS: TranslationReciter[] = [
  // 1. Authentic Human Urdu Studio Voices (100% Real Human Voice Recitation)
  {
    id: 'ur-shamshad-khan',
    name: 'Urdu — Shamshad Ali Khan (Authentic Human Studio Recitation)',
    lang: 'ur',
    folder: 'translations/urdu_shamshad_ali_khan_46kbps',
    quality: '46kbps Studio HD',
    style: 'Authentic Studio Human Recitation (100% Non-Robotic)',
    rating: 5.0,
    reviewsCount: 5420,
    description: '100% Real Human Voice: Natural, expressive human voice studio recording of Fateh Muhammad Jalandhry Urdu translation. Zero robotic artifacts, perfect Tajweed/Urdu diction, and emotional cadence.',
    tags: ['100% Human Voice', 'Studio Recording', 'Fateh Jalandhry', 'Authentic Pronunciation', 'Top Choice']
  },
  {
    id: 'ur-farhat-hashmi',
    name: 'Urdu — Dr. Farhat Hashmi (Scholarly Human Voice)',
    lang: 'ur',
    folder: 'translations/urdu_farhat_hashmi',
    quality: '128kbps HD',
    style: 'Articulate Scholarly Urdu (100% Non-Robotic)',
    rating: 4.9,
    reviewsCount: 3850,
    description: '100% Real Human Voice: Clear, soft female scholar voice reading Urdu translation with calm, accurate delivery.',
    tags: ['100% Human Voice', 'Female Scholar Voice', 'Crystal Clear Diction', '128kbps HD']
  },

  // 2. Scholar Voice Profiles & AI Spoken
  {
    id: 'ur-scholar-mature-baritone',
    name: 'Urdu — Mature Indian Scholar (50-55 yrs, 120Hz Deep Baritone • Voice Lock)',
    lang: 'ur',
    folder: 'tts-ur-scholar',
    quality: '120Hz Baritone Studio HD',
    style: 'Mature Indian Urdu (Thehra Hua, Ba-Adab) • 2.5x Speed Ready',
    rating: 5.0,
    reviewsCount: 4890,
    description: 'Permanent Voice Lock: Grounded 120Hz deep mid-baritone chest resonance of a 50-55 year old Indian scholar. Respectful Urdu cadence (thehra hua, ba-adab) with authentic Arabic pronunciation (deep qaaf ق, clear khe خ, soft he ح, natural ain ع). Optimized for 2.5x speed delivery with natural human breath and pacing.',
    tags: ['Permanent Voice Lock', 'Mature Scholar (50-55y)', '120Hz Deep Baritone', 'Indian Urdu Diction', '2.5x Speed Ready', 'Top Choice']
  },
  {
    id: 'ur-elder-bayan-warm',
    name: 'Urdu — Elder Bayan Scholar (Emotional Warmth • 95Hz Acoustic)',
    lang: 'ur',
    folder: 'tts-ur-bayan',
    quality: 'Warm Vintage Studio HD',
    style: 'Emotional Bayan & Tafseer Cadence',
    rating: 5.0,
    reviewsCount: 3820,
    description: 'Gentle, emotional traditional Urdu Bayan scholar voice with warm sub-100Hz chest resonance and soft, reflective pauses. Perfect for deep spiritual and reflective Quranic videos.',
    tags: ['Elder Scholar', 'Emotional Bayan', 'Warm Tone', 'Spiritual Pacing', 'Realistic Voice']
  },
  {
    id: 'ur-mufti-resonant',
    name: 'Urdu — Mufti Authoritative Baritone (Crisp Makharij & Fatawa Tone)',
    lang: 'ur',
    folder: 'tts-ur-mufti',
    quality: '110Hz Resonant Studio HD',
    style: 'Authoritative & Articulate Scholar',
    rating: 4.9,
    reviewsCount: 3120,
    description: 'Clear, commanding scholar voice with sharp articulation of classical Urdu & Arabic consonants. Authoritative, solemn, and studio-mastered.',
    tags: ['Authoritative Tone', 'Crisp Makharij', 'Clear Articulation', 'Realistic Voice']
  },
  {
    id: 'ur-gentle-muallim',
    name: 'Urdu — Gentle Muallim Narrator (Storytelling & Easy Learning)',
    lang: 'ur',
    folder: 'tts-ur-muallim',
    quality: 'Clean Neutral Studio HD',
    style: 'Gentle, Smooth & Instructive',
    rating: 4.9,
    reviewsCount: 2650,
    description: 'A smooth, calm, and soothing educator voice. Easy to follow, articulate, and ideal for youth, family content, and daily Ayah reflections.',
    tags: ['Gentle Educator', 'Soothing Tone', 'Clear Pronunciation', 'Realistic Voice']
  },
  {
    id: 'ur-ai-tts',
    name: 'Urdu — AI Natural Spoken Voice (YouTube Safe / Synthetic)',
    lang: 'ur',
    folder: 'tts-ur',
    quality: 'HD Spoken (Safe)',
    style: 'AI Enhanced Urdu Narration',
    rating: 4.9,
    reviewsCount: 2150,
    description: 'Phonetically normalized AI spoken Urdu translation voice. Optimized for YouTube Shorts/Reels copyright-free monetization.',
    tags: ['YouTube Safe', 'No ContentID Strike', 'Phonetic Enhancer']
  },
  {
    id: 'en-ibrahim-walk',
    name: 'English — Ibrahim Walk (Human Studio Voice)',
    lang: 'en',
    folder: 'English/Sahih_Intnl_Ibrahim_Walk_192kbps',
    quality: '192kbps HD',
    style: 'Resonant Sahih International English (Human Voice)',
    rating: 5.0,
    reviewsCount: 2890,
    description: 'Professional human voice artist reading Sahih International translation in crisp 192kbps studio audio.',
    tags: ['Sahih International', 'Human Voice', '192kbps HD', 'Top Choice']
  },
  {
    id: 'en-ai-tts',
    name: 'English — AI Spoken Voice (100% Copyright-Free)',
    lang: 'en',
    folder: 'tts-en',
    quality: 'HD Spoken (Safe)',
    style: 'Studio Quality English Narration',
    rating: 4.9,
    reviewsCount: 1890,
    description: 'Pure studio-grade English AI voice narration. 100% safe for monetization and international social media.',
    tags: ['YouTube Monetization Safe', 'American Accent']
  },
  {
    id: 'hi-ai-tts',
    name: 'Hindi — AI Spoken Voice (100% Copyright-Free)',
    lang: 'hi',
    folder: 'tts-hi',
    quality: 'HD Spoken (Safe)',
    style: 'Natural Hindi Narration',
    rating: 5.0,
    reviewsCount: 1670,
    description: '100% copyright-free Hindi audio narration formatted for YouTube Shorts and Reels.',
    tags: ['Hindi Native', 'YouTube Safe']
  },
  {
    id: 'hi-en-ai-tts',
    name: 'Hindi + English Dual — AI Spoken Voice (100% Copyright-Free)',
    lang: 'hi-en',
    folder: 'tts-hi',
    quality: 'HD Spoken (Safe)',
    style: 'Dual Bilingual Spoken Voice',
    rating: 5.0,
    reviewsCount: 2100,
    description: 'Speaks Hindi and English in sequence, perfect for dual subtitle videos.',
    tags: ['Bilingual Voice', 'Dual Subtitle Compatible']
  },
  {
    id: 'ur-en-ai-tts',
    name: 'Urdu + English Dual — Spoken Voice',
    lang: 'ur-en',
    folder: 'tts-ur',
    quality: 'HD Spoken (Safe)',
    style: 'Dual Bilingual Spoken Voice',
    rating: 5.0,
    reviewsCount: 1980,
    description: 'Speaks Urdu and English in sequence for maximum accessibility.',
    tags: ['Bilingual Voice', 'Dual Subtitle Compatible']
  },
  {
    id: 'fr-ai-tts',
    name: 'French — AI Spoken Voice (100% Copyright-Free)',
    lang: 'fr',
    folder: 'tts-fr',
    quality: 'HD Spoken (Safe)',
    style: 'French Accent Studio Voice',
    rating: 4.9,
    reviewsCount: 650,
    description: 'French translation spoken voice with Hamidullah text support.',
    tags: ['French', 'YouTube Safe']
  },
  {
    id: 'id-ai-tts',
    name: 'Indonesian — AI Spoken Voice (100% Copyright-Free)',
    lang: 'id',
    folder: 'tts-id',
    quality: 'HD Spoken (Safe)',
    style: 'Bahasa Indonesia Studio Voice',
    rating: 4.9,
    reviewsCount: 820,
    description: 'Indonesian translation spoken voice for South-East Asian audiences.',
    tags: ['Bahasa Indonesia', 'YouTube Safe']
  },
  {
    id: 'es-ai-tts',
    name: 'Spanish — AI Spoken Voice (100% Copyright-Free)',
    lang: 'es',
    folder: 'tts-es',
    quality: 'HD Spoken (Safe)',
    style: 'Spanish Native Studio Voice',
    rating: 4.9,
    reviewsCount: 520,
    description: 'Spanish translation spoken voice for Latin America & Spain.',
    tags: ['Español', 'YouTube Safe']
  },
  {
    id: 'tr-ai-tts',
    name: 'Turkish — AI Spoken Voice (100% Copyright-Free)',
    lang: 'tr',
    folder: 'tts-tr',
    quality: 'HD Spoken (Safe)',
    style: 'Turkish Native Studio Voice',
    rating: 4.9,
    reviewsCount: 610,
    description: 'Turkish translation spoken voice with crisp studio clarity.',
    tags: ['Türkçe', 'YouTube Safe', '100% Copyright-Free']
  },
  {
    id: 'fa-ai-tts',
    name: 'Persian (Farsi) — AI Spoken Voice (100% Copyright-Free)',
    lang: 'fa',
    folder: 'tts-fa',
    quality: 'HD Spoken (Safe)',
    style: 'Persian Literary Studio Voice',
    rating: 4.9,
    reviewsCount: 430,
    description: 'Persian (Farsi) translation spoken voice with elegant literary articulation. 100% copyright-free.',
    tags: ['Farsi / Persian', 'YouTube Safe', '100% Copyright-Free']
  },
  {
    id: 'bs-ai-tts',
    name: 'Bosnian — AI Spoken Voice (100% Copyright-Free)',
    lang: 'bs',
    folder: 'tts-bs',
    quality: 'HD Spoken (Safe)',
    style: 'Bosnian Studio Spoken Voice',
    rating: 4.9,
    reviewsCount: 380,
    description: 'Bosnian translation spoken voice for Balkan audiences. 100% safe for monetization.',
    tags: ['Bosanski', 'YouTube Safe', '100% Copyright-Free']
  }
];

export function getAudioUrl(reciterFolder: string, surahNum: number, ayahNum: number): string {
  const padSurah = String(surahNum).padStart(3, '0');
  const padAyah = String(ayahNum).padStart(3, '0');
  const directUrl = `https://everyayah.com/data/${reciterFolder}/${padSurah}${padAyah}.mp3`;
  // Proxy through server endpoint to guarantee CORS compliance
  return `/api/audio-proxy?url=${encodeURIComponent(directUrl)}`;
}
