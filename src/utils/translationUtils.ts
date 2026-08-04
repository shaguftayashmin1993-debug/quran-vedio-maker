import { Ayah, TranslationLang } from '../types';

export function getAyahTranslationText(ayah: Ayah, lang: TranslationLang): string {
  if (!ayah) return '';

  if (lang === 'hi-en') {
    const h = ayah.hindi || '';
    const e = ayah.english || '';
    if (h && e) return `${h} — ${e}`;
    return h || e;
  }

  if (lang === 'ur-en') {
    const u = ayah.urdu || '';
    const e = ayah.english || '';
    if (u && e) return `${u} — ${e}`;
    return u || e;
  }

  if (lang === 'ur' && ayah.urdu) return ayah.urdu;
  if (lang === 'hi' && ayah.hindi) return ayah.hindi;
  if (lang === 'fr' && ayah.french) return ayah.french;
  if (lang === 'id' && ayah.indonesian) return ayah.indonesian;
  if (lang === 'es' && ayah.spanish) return ayah.spanish;
  if (lang === 'tr' && ayah.turkish) return ayah.turkish;
  if (lang === 'en' && ayah.english) return ayah.english;

  // Fallback to whichever translation exists
  return (
    ayah.urdu ||
    ayah.english ||
    ayah.hindi ||
    ayah.french ||
    ayah.indonesian ||
    ayah.spanish ||
    ayah.turkish ||
    ''
  );
}

export interface DualTranslationResult {
  primaryText: string;
  secondaryText?: string;
  primaryFont?: string;
  secondaryFont?: string;
}

export function getDualTranslationTexts(ayah: Ayah, lang: TranslationLang): DualTranslationResult {
  if (!ayah) return { primaryText: '' };

  if (lang === 'hi-en') {
    return {
      primaryText: ayah.hindi || '',
      secondaryText: ayah.english || '',
      primaryFont: "'Noto Sans Devanagari', sans-serif",
      secondaryFont: "'Plus Jakarta Sans', sans-serif"
    };
  }

  if (lang === 'ur-en') {
    return {
      primaryText: ayah.urdu || '',
      secondaryText: ayah.english || '',
      primaryFont: "'Noto Naskh Arabic', 'Amiri', serif",
      secondaryFont: "'Plus Jakarta Sans', sans-serif"
    };
  }

  return {
    primaryText: getAyahTranslationText(ayah, lang)
  };
}
