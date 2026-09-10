import { Ayah, TranslationLang } from '../types';

export function getAyahTranslationText(ayah: Ayah, lang: TranslationLang): string {
  if (!ayah) return '';

  if (lang === 'hi-en') {
    const h = ayah.hindi || '';
    const e = ayah.english || ayah.urdu || '';
    if (h && e) return `${h} — ${e}`;
    return h || e || ayah.urdu || '';
  }

  if (lang === 'ur-en') {
    const u = ayah.urdu || '';
    const e = ayah.english || ayah.hindi || '';
    if (u && e) return `${u} — ${e}`;
    return u || e || ayah.hindi || '';
  }

  if (lang === 'ur' && ayah.urdu) return ayah.urdu;
  if (lang === 'hi' && ayah.hindi) return ayah.hindi;
  if (lang === 'fr' && ayah.french) return ayah.french;
  if (lang === 'id' && ayah.indonesian) return ayah.indonesian;
  if (lang === 'es' && ayah.spanish) return ayah.spanish;
  if (lang === 'tr' && ayah.turkish) return ayah.turkish;
  if (lang === 'fa' && ayah.persian) return ayah.persian;
  if (lang === 'bs' && ayah.bosnian) return ayah.bosnian;
  if (lang === 'en' && ayah.english) return ayah.english;

  // Fallback to whichever translation exists so text is never empty
  return (
    ayah.urdu ||
    ayah.english ||
    ayah.hindi ||
    ayah.french ||
    ayah.indonesian ||
    ayah.spanish ||
    ayah.turkish ||
    ayah.persian ||
    ayah.bosnian ||
    ''
  );
}

export interface DualTranslationResult {
  primaryText: string;
  secondaryText?: string;
  primaryFont?: string;
  secondaryFont?: string;
}

/**
 * Resolves the accurate spoken translation text and language corresponding to the
 * chosen Translation Voice / Reciter folder, so voice synthesis matches the selected voice,
 * independent of visual subtitle styling.
 */
export function getSpokenTranslationTextAndLang(
  ayah: Ayah,
  voiceFolder: string,
  visualLang?: TranslationLang
): { text: string; lang: TranslationLang; voiceProfile: string } {
  if (!ayah) {
    return { text: '', lang: 'ur', voiceProfile: 'standard' };
  }

  // 1. Urdu Voices (AI TTS & Human Reciters)
  const isUrdu =
    voiceFolder.startsWith('tts-ur') ||
    voiceFolder.includes('urdu') ||
    voiceFolder.includes('shamshad') ||
    voiceFolder.includes('farhat') ||
    voiceFolder.includes('scholar') ||
    voiceFolder.includes('bayan') ||
    voiceFolder.includes('mufti') ||
    voiceFolder.includes('muallim');

  if (isUrdu) {
    let profile = 'standard';
    if (voiceFolder === 'tts-ur-scholar') profile = 'scholar-mature-baritone';
    else if (voiceFolder === 'tts-ur-bayan') profile = 'elder-bayan-warm';
    else if (voiceFolder === 'tts-ur-mufti') profile = 'mufti-deep-resonant';
    else if (voiceFolder === 'tts-ur-muallim') profile = 'gentle-muallim-narrator';
    else if (voiceFolder.includes('farhat')) profile = 'dignified-female-scholar';
    else if (voiceFolder.includes('shamshad')) profile = 'authentic-human';
    else profile = 'scholar-mature-baritone';

    if (voiceFolder === 'tts-ur-en') {
      const u = ayah.urdu || '';
      const e = ayah.english || '';
      return {
        text: u && e ? `${u} — ${e}` : u || e,
        lang: 'ur-en',
        voiceProfile: profile
      };
    }

    return {
      text: ayah.urdu || getAyahTranslationText(ayah, 'ur'),
      lang: 'ur',
      voiceProfile: profile
    };
  }

  // 2. Hindi Voice
  if (voiceFolder === 'tts-hi' || voiceFolder.includes('hindi')) {
    return {
      text: ayah.hindi || getAyahTranslationText(ayah, 'hi'),
      lang: 'hi',
      voiceProfile: 'standard'
    };
  }

  // 3. English Voice
  if (voiceFolder === 'tts-en' || voiceFolder.includes('english') || voiceFolder.includes('sahih')) {
    return {
      text: ayah.english || getAyahTranslationText(ayah, 'en'),
      lang: 'en',
      voiceProfile: 'standard'
    };
  }

  // 4. Default by folder prefix or visual translation
  if (voiceFolder.startsWith('tts-')) {
    const code = voiceFolder.replace('tts-', '') as TranslationLang;
    return {
      text: getAyahTranslationText(ayah, code),
      lang: code,
      voiceProfile: 'standard'
    };
  }

  const effectiveLang = visualLang || 'ur';
  return {
    text: getAyahTranslationText(ayah, effectiveLang),
    lang: effectiveLang,
    voiceProfile: 'standard'
  };
}

export function getDualTranslationTexts(ayah: Ayah, lang: TranslationLang): DualTranslationResult {
  if (!ayah) return { primaryText: '' };

  if (lang === 'hi-en') {
    const primary = ayah.hindi || ayah.urdu || ayah.english || '';
    const secondary = ayah.english || (ayah.hindi ? (ayah.urdu || '') : '');
    return {
      primaryText: primary,
      secondaryText: secondary && secondary !== primary ? secondary : undefined,
      primaryFont: ayah.hindi ? "'Noto Sans Devanagari', sans-serif" : (ayah.urdu ? "'Noto Naskh Arabic', 'Amiri', serif" : "'Plus Jakarta Sans', sans-serif"),
      secondaryFont: "'Plus Jakarta Sans', sans-serif"
    };
  }

  if (lang === 'ur-en') {
    const primary = ayah.urdu || ayah.hindi || ayah.english || '';
    const secondary = ayah.english || (ayah.urdu ? (ayah.hindi || '') : '');
    return {
      primaryText: primary,
      secondaryText: secondary && secondary !== primary ? secondary : undefined,
      primaryFont: ayah.urdu ? "'Noto Naskh Arabic', 'Amiri', serif" : (ayah.hindi ? "'Noto Sans Devanagari', sans-serif" : "'Plus Jakarta Sans', sans-serif"),
      secondaryFont: "'Plus Jakarta Sans', sans-serif"
    };
  }

  return {
    primaryText: getAyahTranslationText(ayah, lang)
  };
}
