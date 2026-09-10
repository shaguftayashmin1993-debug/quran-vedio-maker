import { Surah, Ayah } from '../types';
import { SurahMeta, SURAHS } from '../data/surahs';

// In-memory cache of loaded Surahs
const memorySurahCache = new Map<number, Surah>();

const stripDiacritics = (str: string) => str.replace(/[\u064B-\u065F\u0670\u0671]/g, '').replace(/ٱ/g, 'ا');

export function cleanBismillah(text: string, surahNum: number, ayahNum: number): string {
  if (!text || surahNum === 1 || surahNum === 9 || ayahNum !== 1) return text;
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 5) {
    const first4Norm = stripDiacritics(parts.slice(0, 4).join(' '));
    if (
      first4Norm.includes('بسم') &&
      (first4Norm.includes('الله') || first4Norm.includes('لله')) &&
      first4Norm.includes('رحم')
    ) {
      return parts.slice(4).join(' ');
    }
  }
  return text;
}

/**
 * Robustly loads Surah text and translations:
 * 1. Checks memory cache
 * 2. Checks sessionStorage
 * 3. Fetches from backend /api/surah/:number with up to 3 retries
 * 4. Fallback: Fetches directly from public Quran CDN mirrors (AlQuran Cloud / Quran.com)
 */
export async function getSurahDetails(meta: SurahMeta): Promise<Surah> {
  const surahNum = meta.number;

  // 1. Memory Cache
  if (memorySurahCache.has(surahNum)) {
    return memorySurahCache.get(surahNum)!;
  }

  // 2. SessionStorage Cache
  try {
    const cachedStr = sessionStorage.getItem(`quran_surah_cache_${surahNum}`);
    if (cachedStr) {
      const parsed: Surah = JSON.parse(cachedStr);
      if (parsed?.ayahs && parsed.ayahs.length > 0 && parsed.ayahs[0].arabic) {
        memorySurahCache.set(surahNum, parsed);
        return parsed;
      }
    }
  } catch (e) {
    // SessionStorage may be restricted in some iframes
  }

  let lastError: any = null;

  // 3. Try backend /api/surah/:number with retries
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`/api/surah/${surahNum}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data && json.data.ayahs?.length > 0) {
          const surah = json.data as Surah;
          memorySurahCache.set(surahNum, surah);
          try {
            sessionStorage.setItem(`quran_surah_cache_${surahNum}`, JSON.stringify(surah));
          } catch {}
          return surah;
        }
      }
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt + 1} to load Surah ${surahNum} from server failed:`, err);
    }
    // Wait before retrying (400ms, 800ms)
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }

  // 4. Direct Client-Side Fallback Mirrors (if server is restarting or unreachable)
  console.log(`Using client-side fallback mirrors for Surah ${surahNum}...`);

  try {
    // Mirror A: AlQuran Cloud core uthmani & english
    const directRes = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,en.sahih,ur.jalandhry`
    );
    if (directRes.ok) {
      const directJson = await directRes.json();
      if (Array.isArray(directJson?.data) && directJson.data.length > 0) {
        const uthmaniEd = directJson.data.find((d: any) => d.edition?.identifier === 'quran-uthmani');
        const enEd = directJson.data.find((d: any) => d.edition?.identifier === 'en.sahih');
        const urEd = directJson.data.find((d: any) => d.edition?.identifier === 'ur.jalandhry');

        const rawAyahs = uthmaniEd?.ayahs || [];
        const ayahs: Ayah[] = rawAyahs.map((a: any, idx: number) => {
          const num = a.numberInSurah;
          const arabic = cleanBismillah(a.text, surahNum, num);
          const english = enEd?.ayahs?.[idx]?.text || `Verse ${num}`;
          const urdu = urEd?.ayahs?.[idx]?.text || '';
          return {
            num,
            arabic,
            indopak: arabic,
            english,
            urdu,
            hindi: '',
            french: '',
            indonesian: '',
            spanish: '',
            turkish: '',
            persian: '',
            bosnian: ''
          };
        });

        const fallbackSurah: Surah = {
          number: meta.number,
          name: meta.name,
          englishName: meta.englishName,
          englishNameTranslation: meta.englishNameTranslation,
          numberOfAyahs: meta.numberOfAyahs,
          revelationType: meta.revelationType,
          ayahs
        };

        memorySurahCache.set(surahNum, fallbackSurah);
        try {
          sessionStorage.setItem(`quran_surah_cache_${surahNum}`, JSON.stringify(fallbackSurah));
        } catch {}
        return fallbackSurah;
      }
    }
  } catch (mirrorErr) {
    console.warn(`Direct Mirror A failed for Surah ${surahNum}:`, mirrorErr);
  }

  // Mirror B: Single uthmani directly from api.alquran.cloud
  try {
    const singleRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`);
    if (singleRes.ok) {
      const singleJson = await singleRes.json();
      const rawAyahs = singleJson?.data?.ayahs || [];
      if (rawAyahs.length > 0) {
        const ayahs: Ayah[] = rawAyahs.map((a: any) => ({
          num: a.numberInSurah,
          arabic: cleanBismillah(a.text, surahNum, a.numberInSurah),
          indopak: cleanBismillah(a.text, surahNum, a.numberInSurah),
          english: `Verse ${a.numberInSurah} of Surah ${meta.englishName}`,
          urdu: ''
        }));

        const fallbackSurah: Surah = {
          number: meta.number,
          name: meta.name,
          englishName: meta.englishName,
          englishNameTranslation: meta.englishNameTranslation,
          numberOfAyahs: meta.numberOfAyahs,
          revelationType: meta.revelationType,
          ayahs
        };

        memorySurahCache.set(surahNum, fallbackSurah);
        return fallbackSurah;
      }
    }
  } catch (mirrorBErr) {
    console.warn(`Direct Mirror B failed for Surah ${surahNum}:`, mirrorBErr);
  }

  // Mirror C: Quran.com API
  try {
    const quranComRes = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?language=en&words=false&per_page=300&fields=text_uthmani,text_indopak`
    );
    if (quranComRes.ok) {
      const qcJson = await quranComRes.json();
      const rawVerses = qcJson?.verses || [];
      if (rawVerses.length > 0) {
        const ayahs: Ayah[] = rawVerses.map((v: any) => {
          const num = v.verse_number;
          const arabic = cleanBismillah(v.text_uthmani || '', surahNum, num);
          const indopak = cleanBismillah(v.text_indopak || arabic, surahNum, num);
          return {
            num,
            arabic,
            indopak,
            english: `Verse ${num} of Surah ${meta.englishName}`
          };
        });

        const fallbackSurah: Surah = {
          number: meta.number,
          name: meta.name,
          englishName: meta.englishName,
          englishNameTranslation: meta.englishNameTranslation,
          numberOfAyahs: meta.numberOfAyahs,
          revelationType: meta.revelationType,
          ayahs
        };

        memorySurahCache.set(surahNum, fallbackSurah);
        return fallbackSurah;
      }
    }
  } catch (qcErr) {
    console.warn(`Quran.com API failed for Surah ${surahNum}:`, qcErr);
  }

  throw lastError || new Error(`Unable to fetch Surah ${surahNum} from all available sources`);
}
