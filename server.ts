import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);

// Temp directory for video merging
const mergeUploadDir = path.join(os.tmpdir(), "video-merges");
if (!fs.existsSync(mergeUploadDir)) {
  fs.mkdirSync(mergeUploadDir, { recursive: true });
}

const mergeUpload = multer({
  dest: mergeUploadDir,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB per clip
    files: 250 // Up to 250 clips
  }
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Health check endpoint for container platform
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// In-memory and disk cache for surah list and surah texts to speed up subsequent requests
const surahCache: Record<number, any> = {};
let surahListCache: any[] | null = null;
const SURAH_CACHE_DIR = path.join(process.cwd(), "data", "cache", "surahs");
if (!fs.existsSync(SURAH_CACHE_DIR)) {
  fs.mkdirSync(SURAH_CACHE_DIR, { recursive: true });
}

// 1. Get all 114 Surahs
app.get("/api/surahs", async (req, res) => {
  try {
    if (surahListCache) {
      return res.json({ status: "success", data: surahListCache });
    }
    const resp = await fetch("https://api.alquran.cloud/v1/surah");
    if (!resp.ok) throw new Error(`API Error: ${resp.status}`);
    const json = await resp.json();
    surahListCache = json.data;
    res.json({ status: "success", data: surahListCache });
  } catch (err: any) {
    console.error("Error fetching surah list:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 2. Get Surah details with Arabic (Uthmani & IndoPak) + Multi-language translations
app.get("/api/surah/:number", async (req, res) => {
  const surahNum = parseInt(req.params.number, 10);
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    return res.status(400).json({ status: "error", message: "Invalid Surah number (1-114)" });
  }

  res.setHeader("Cache-Control", "public, max-age=86400");

  try {
    // 1. Check in-memory cache
    if (surahCache[surahNum]) {
      return res.json({ status: "success", data: surahCache[surahNum] });
    }

    // 2. Check persistent disk cache
    const diskPath = path.join(SURAH_CACHE_DIR, `${surahNum}.json`);
    if (fs.existsSync(diskPath)) {
      try {
        const rawContent = fs.readFileSync(diskPath, "utf8");
        const parsed = JSON.parse(rawContent);
        if (parsed && parsed.ayahs && parsed.ayahs.length > 0) {
          surahCache[surahNum] = parsed;
          return res.json({ status: "success", data: parsed });
        }
      } catch (e) {
        console.warn(`Could not read disk cache for Surah ${surahNum}:`, e);
      }
    }

    // 3. Fetch from external APIs with safe timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const editionsUrl = `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,en.sahih,ur.jalandhry,hi.hindi,fr.hamidullah,id.indonesian,es.bornez,tr.yildirim,fa.fooladvand,bs.korkut`;

    let uthmaniData: any = null;
    let enData: any = null;
    let urData: any = null;
    let hiData: any = null;
    let frData: any = null;
    let idData: any = null;
    let esData: any = null;
    let trData: any = null;
    let faData: any = null;
    let bsData: any = null;

    try {
      const editionsRes = await fetch(editionsUrl, { signal: controller.signal });
      if (editionsRes && editionsRes.ok) {
        const editionsJson = await editionsRes.json();
        if (Array.isArray(editionsJson?.data)) {
          for (const edition of editionsJson.data) {
            const id = edition?.edition?.identifier;
            if (id === 'quran-uthmani') uthmaniData = edition;
            else if (id === 'en.sahih') enData = edition;
            else if (id === 'ur.jalandhry') urData = edition;
            else if (id === 'hi.hindi') hiData = edition;
            else if (id === 'fr.hamidullah') frData = edition;
            else if (id === 'id.indonesian') idData = edition;
            else if (id === 'es.bornez') esData = edition;
            else if (id === 'tr.yildirim') trData = edition;
            else if (id === 'fa.fooladvand') faData = edition;
            else if (id === 'bs.korkut') bsData = edition;
          }
        }
      }
    } catch (e) {
      console.warn(`Multi-edition fetch for Surah ${surahNum} timed out or failed, falling back to direct endpoints...`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Reliable fallback 1: If multi-edition failed or uthmani is missing, fetch core uthmani directly
    if (!uthmaniData) {
      const singleUthmaniRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`);
      if (!singleUthmaniRes.ok) throw new Error(`Failed to load Arabic text for Surah ${surahNum}`);
      const singleJson = await singleUthmaniRes.json();
      uthmaniData = singleJson.data;
    }

    // Reliable fallback 2: If English is missing, fetch directly
    if (!enData) {
      try {
        const singleEnRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/en.sahih`);
        if (singleEnRes.ok) {
          const singleEnJson = await singleEnRes.json();
          enData = singleEnJson.data;
        }
      } catch (e) {}
    }

    // Reliable fallback 3: If Urdu is missing, fetch directly
    if (!urData) {
      try {
        const singleUrRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ur.jalandhry`);
        if (singleUrRes.ok) {
          const singleUrJson = await singleUrRes.json();
          urData = singleUrJson.data;
        }
      } catch (e) {}
    }

    // Reliable fallback 4: If Hindi is missing, fetch directly
    if (!hiData) {
      try {
        const singleHiRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/hi.hindi`);
        if (singleHiRes.ok) {
          const singleHiJson = await singleHiRes.json();
          hiData = singleHiJson.data;
        }
      } catch (e) {}
    }

    // Authentic IndoPak script from Quran.com API (with stop signs ۖ ۙ ط ج etc.)
    const indopakMap = new Map<number, string>();
    try {
      const indopakRes = await fetch(`https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=${surahNum}`);
      if (indopakRes.ok) {
        const indopakJson = await indopakRes.json();
        if (Array.isArray(indopakJson?.verses)) {
          indopakJson.verses.forEach((v: any) => {
            const verseKey = v.verse_key; // e.g. "67:1"
            const parts = verseKey?.split(':');
            const num = parts ? parseInt(parts[1], 10) : NaN;
            if (!isNaN(num) && v.text_indopak) {
              indopakMap.set(num, v.text_indopak);
            }
          });
        }
      }
    } catch (e) {
      console.warn(`IndoPak script fetch for Surah ${surahNum} skipped or failed:`, e);
    }

    const stripDiacritics = (str: string) => str.replace(/[\u064B-\u065F\u0670\u0671]/g, "").replace(/ٱ/g, "ا");
    const stripBismillah = (text: string, num: number) => {
      if (!text || surahNum === 1 || surahNum === 9 || num !== 1) return text;
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 5) {
        const first4Norm = stripDiacritics(parts.slice(0, 4).join(" "));
        if (first4Norm.includes("بسم") && (first4Norm.includes("الله") || first4Norm.includes("لله")) && first4Norm.includes("رحم")) {
          return parts.slice(4).join(" ");
        }
      }
      return text;
    };

    const rawAyahs = uthmaniData.ayahs || uthmaniData.data?.ayahs || [];
    
    // Create lookup maps by ayah number to ensure 100% accurate text matching for all editions
    const enMap = new Map<number, string>();
    (enData?.ayahs || enData?.data?.ayahs || []).forEach((a: any) => enMap.set(a.numberInSurah, a.text));

    const urMap = new Map<number, string>();
    (urData?.ayahs || urData?.data?.ayahs || []).forEach((a: any) => urMap.set(a.numberInSurah, a.text));

    const hiMap = new Map<number, string>();
    (hiData?.ayahs || hiData?.data?.ayahs || []).forEach((a: any) => hiMap.set(a.numberInSurah, a.text));

    const frMap = new Map<number, string>();
    (frData?.ayahs || frData?.data?.ayahs || []).forEach((a: any) => frMap.set(a.numberInSurah, a.text));

    const idMap = new Map<number, string>();
    (idData?.ayahs || idData?.data?.ayahs || []).forEach((a: any) => idMap.set(a.numberInSurah, a.text));

    const esMap = new Map<number, string>();
    (esData?.ayahs || esData?.data?.ayahs || []).forEach((a: any) => esMap.set(a.numberInSurah, a.text));

    const trMap = new Map<number, string>();
    (trData?.ayahs || trData?.data?.ayahs || []).forEach((a: any) => trMap.set(a.numberInSurah, a.text));

    const faMap = new Map<number, string>();
    (faData?.ayahs || faData?.data?.ayahs || []).forEach((a: any) => faMap.set(a.numberInSurah, a.text));

    const bsMap = new Map<number, string>();
    (bsData?.ayahs || bsData?.data?.ayahs || []).forEach((a: any) => bsMap.set(a.numberInSurah, a.text));

    const ayahs = rawAyahs.map((a: any) => {
      const num = a.numberInSurah;
      const rawArabic = a.text;

      const rawEn = enMap.get(num) || enData?.ayahs?.[num - 1]?.text || "";
      const rawUr = urMap.get(num) || urData?.ayahs?.[num - 1]?.text || "";
      const rawHi = hiMap.get(num) || hiData?.ayahs?.[num - 1]?.text || "";

      const rawIndopak = indopakMap.get(num);

      return {
        num,
        arabic: stripBismillah(rawArabic, num),
        indopak: rawIndopak ? stripBismillah(rawIndopak, num) : stripBismillah(rawArabic, num),
        english: rawEn || rawUr || rawHi || `Verse ${num}`,
        urdu: rawUr || rawHi || rawEn || "",
        hindi: rawHi || rawUr || rawEn || "",
        french: frMap.get(num) || frData?.ayahs?.[num - 1]?.text || rawEn || "",
        indonesian: idMap.get(num) || idData?.ayahs?.[num - 1]?.text || rawEn || "",
        spanish: esMap.get(num) || esData?.ayahs?.[num - 1]?.text || rawEn || "",
        turkish: trMap.get(num) || trData?.ayahs?.[num - 1]?.text || rawEn || "",
        persian: faMap.get(num) || faData?.ayahs?.[num - 1]?.text || rawUr || "",
        bosnian: bsMap.get(num) || bsData?.ayahs?.[num - 1]?.text || rawEn || ""
      };
    });

    const surahMeta = {
      number: uthmaniData.number || uthmaniData.data?.number || surahNum,
      name: uthmaniData.name || uthmaniData.data?.name || "",
      englishName: uthmaniData.englishName || uthmaniData.data?.englishName || "",
      englishNameTranslation: uthmaniData.englishNameTranslation || uthmaniData.data?.englishNameTranslation || "",
      numberOfAyahs: uthmaniData.numberOfAyahs || uthmaniData.data?.numberOfAyahs || ayahs.length,
      revelationType: uthmaniData.revelationType || uthmaniData.data?.revelationType || "Meccan",
      ayahs
    };

    surahCache[surahNum] = surahMeta;
    // Persist to disk cache
    fs.promises.writeFile(path.join(SURAH_CACHE_DIR, `${surahNum}.json`), JSON.stringify(surahMeta), "utf8").catch(() => {});

    res.json({ status: "success", data: surahMeta });
  } catch (err: any) {
    console.error(`Error fetching surah ${surahNum}:`, err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// In-memory caches for fast sub-millisecond audio delivery and zero rate-limiting
const audioProxyCache = new Map<string, { buffer: Buffer; contentType: string }>();
const ttsCache = new Map<string, Buffer>();

// 3. Audio proxy with caching, multi-mirror fallback & automatic retry
app.get("/api/audio-proxy", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ status: "error", message: "Missing url parameter" });
  }

  // Fast cache hit
  if (audioProxyCache.has(url)) {
    const cached = audioProxyCache.get(url)!;
    res.setHeader("Content-Type", cached.contentType || "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(cached.buffer);
  }

  // Derive alternate mirror URLs if url is from EveryAyah
  const candidateUrls: string[] = [url];
  if (url.includes("everyayah.com/data/")) {
    if (url.includes("https://everyayah.com/")) {
      candidateUrls.push(url.replace("https://everyayah.com/", "https://www.everyayah.com/"));
      candidateUrls.push(url.replace("https://everyayah.com/", "http://everyayah.com/"));
      candidateUrls.push(url.replace("https://everyayah.com/", "http://www.everyayah.com/"));
    } else if (url.includes("https://www.everyayah.com/")) {
      candidateUrls.push(url.replace("https://www.everyayah.com/", "https://everyayah.com/"));
      candidateUrls.push(url.replace("https://www.everyayah.com/", "http://everyayah.com/"));
    }
  }

  let lastError: any = null;

  for (const candidateUrl of candidateUrls) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const audioRes = await fetch(candidateUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": "https://everyayah.com/"
          }
        });
        clearTimeout(timeout);

        if (audioRes.ok) {
          const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
          const arrayBuffer = await audioRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 200) {
            // Keep up to 5000 items in cache for large surah generations
            if (audioProxyCache.size > 5000) {
              const firstKey = audioProxyCache.keys().next().value;
              if (firstKey) audioProxyCache.delete(firstKey);
            }
            audioProxyCache.set(url, { buffer, contentType });

            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.setHeader("Access-Control-Allow-Origin", "*");
            return res.send(buffer);
          }
        }
      } catch (err) {
        lastError = err;
      }
      // Small backoff before next attempt
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }

  console.error(`Audio proxy failed after all mirrors for ${url}:`, lastError);
  res.status(500).send("Proxy error: " + (lastError?.message || "Failed to fetch audio stream"));
});

// Helper function to normalize text and correct Islamic/Quranic pronunciation for TTS
function cleanAndNormalizeTextForSpeech(rawText: string, targetLang: string): string {
  if (!rawText) return "";
  let text = rawText;

  if (targetLang === 'ur' || targetLang.startsWith('ur')) {
    text = text
      // 1. Remove bracketed footnotes and numbers e.g. [1], (1), [۱], (۱)
      .replace(/\[\d+\]|\(\d+\)|\[[۰-۹]+\]|\([۰-۹]+\)/g, '')
      // 2. Strip parentheses, brackets, and quotes while keeping the words inside
      .replace(/[\(\)\[\]\{\}«»\"\'\`]/g, '')
      // 3. Correct Quranic and Islamic ligatures to optimal phonetic representations
      .replace(/اللّٰه|الله/g, 'اللہ')
      .replace(/رحمٰن/g, 'رحمان')
      .replace(/تعالٰی|تعالیٰ/g, 'تعالی')
      .replace(/ﷺ|صلعم/g, 'صلی اللہ علیہ وسلم')
      .replace(/ﷻ/g, 'جل جلالہ')
      .replace(/رض/g, 'رضی اللہ عنہ')
      .replace(/رح/g, 'رحمۃ اللہ علیہ')
      .replace(/ع\b/g, 'علیہ السلام')
      .replace(/قرءان/g, 'قرآن')
      .replace(/موسٰی/g, 'موسی')
      .replace(/عیسٰی/g, 'عیسی')
      .replace(/مصطفٰی/g, 'مصطفی')
      .replace(/مجتبٰی/g, 'مجتبی')
      .replace(/مرتضٰی/g, 'مرتضی')
      .replace(/مولٰی/g, 'مولی')
      // 4. Remove Arabic diacritics/harakat that distort Urdu TTS prosody
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // 5. Replace colons and semicolons with soft Urdu pause commas
      .replace(/[\:\;؛]/g, '، ')
      // 6. Clean multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  } else if (targetLang === 'hi' || targetLang.startsWith('hi')) {
    text = text
      .replace(/\[\d+\]|\(\d+\)|\[[०-९]+\]|\([०-९]+\)/g, '')
      .replace(/[\(\)\[\]\{\}«»\"\'\`]/g, '')
      .replace(/[\:\;]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // English & other Latin scripts
    text = text
      .replace(/\[\d+\]|\(\d+\)/g, '')
      .replace(/[\(\)\[\]\{\}«»\"\'\`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return text;
}

// Helper function to fetch and concatenate natural Google Translate TTS chunks with multi-client rotation and retry
async function fetchGoogleTTSBuffer(rawText: string, targetLang: string): Promise<Buffer> {
  let lang = (targetLang || 'ur').toString().toLowerCase().trim();
  if (lang === 'ur-en') lang = 'ur';
  else if (lang === 'hi-en') lang = 'hi';
  else if (lang.includes('-')) lang = lang.split('-')[0];
  else if (lang.includes('_')) lang = lang.split('_')[0];

  const text = cleanAndNormalizeTextForSpeech(rawText, lang);
  if (!text) throw new Error("Empty text after normalization");

  const cacheKey = `${lang}:${text}`;
  if (ttsCache.has(cacheKey)) {
    return ttsCache.get(cacheKey)!;
  }

  // Chunk by punctuation or natural breath pauses (max 140 chars per chunk for calm, human prosody)
  const chunks: string[] = [];
  const sentences = text.split(/([۔،\.!?,;\n]+)/);
  let currentChunk = "";

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    if (!part) continue;
    if ((currentChunk + part).trim().length <= 140) {
      currentChunk += part;
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = part;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  // Fallback word split if any chunk is still too long
  const finalChunks: string[] = [];
  for (const c of chunks) {
    if (c.length <= 160) {
      finalChunks.push(c);
    } else {
      const words = c.split(/\s+/);
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length <= 140) {
          cur = (cur + " " + w).trim();
        } else {
          if (cur) finalChunks.push(cur);
          cur = w;
        }
      }
      if (cur) finalChunks.push(cur);
    }
  }

  const clientRotations = ['tw-ob', 'gtx', 'dict-chrome-ex', 'webapp'];
  const buffers: Buffer[] = [];

  for (const chunk of finalChunks) {
    let chunkBuffer: Buffer | null = null;

    for (const client of clientRotations) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=${client}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);

          const ttsRes = await fetch(ttsUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://translate.google.com/"
            }
          });
          clearTimeout(timeout);

          if (ttsRes.ok) {
            const ab = await ttsRes.arrayBuffer();
            const b = Buffer.from(ab);
            if (b.length > 100) {
              chunkBuffer = b;
              break;
            }
          }
        } catch (e) {
          // Retry on next attempt or client
        }
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
      }
      if (chunkBuffer) break;
    }

    if (chunkBuffer) {
      buffers.push(chunkBuffer);
    } else {
      console.warn(`TTS generation could not fetch chunk for lang '${lang}': '${chunk.substring(0, 30)}'`);
    }
  }

  if (buffers.length === 0) throw new Error(`TTS Generation failed for language: ${lang}`);
  
  const result = Buffer.concat(buffers);
  if (ttsCache.size > 2000) {
    const firstKey = ttsCache.keys().next().value;
    if (firstKey) ttsCache.delete(firstKey);
  }
  ttsCache.set(cacheKey, result);

  return result;
}

// 4. TTS Proxy / Web Speech helper API
app.post("/api/tts", async (req, res) => {
  const { text, lang = "ur" } = req.body;
  if (!text) {
    return res.status(400).json({ status: "error", message: "Text required" });
  }

  try {
    const reqLang = (lang || "ur").toString().toLowerCase().trim();
    const hasDualSeparator = text.includes(" — ") || text.includes(" - ");
    const isDual = reqLang === "ur-en" || reqLang === "hi-en" || (hasDualSeparator && (reqLang.startsWith("ur") || reqLang.startsWith("hi")));

    if (isDual && hasDualSeparator) {
      const parts = text.split(/\s+[—\-]\s+/);
      const primaryText = parts[0]?.trim();
      const secondaryText = parts.slice(1).join(" ").trim();

      const primaryLang = reqLang.startsWith("hi") ? "hi" : "ur";
      const secondaryLang = "en";

      const [primaryBuf, secondaryBuf] = await Promise.all([
        primaryText ? fetchGoogleTTSBuffer(primaryText, primaryLang).catch(() => null) : Promise.resolve(null),
        secondaryText ? fetchGoogleTTSBuffer(secondaryText, secondaryLang).catch(() => null) : Promise.resolve(null)
      ]);

      const validBufs = [primaryBuf, secondaryBuf].filter(Boolean) as Buffer[];
      if (validBufs.length === 0) throw new Error("TTS Generation failed for dual text");

      const combinedBuffer = Buffer.concat(validBufs);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(combinedBuffer);
    }

    const combinedBuffer = await fetchGoogleTTSBuffer(text, reqLang);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(combinedBuffer);
  } catch (err: any) {
    console.error("TTS endpoint error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Helper to safely execute ffmpeg with expanded buffer and warning log level
async function runFfmpeg(args: string[], timeoutMs = 15 * 60 * 1000): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("ffmpeg", args, {
    maxBuffer: 100 * 1024 * 1024, // 100MB buffer prevents stderr maxBuffer errors on long surahs
    timeout: timeoutMs
  });
}

// Helper to check if a media file contains an audio stream
async function hasAudioStream(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "a",
      "-show_entries", "stream=codec_name",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ], { maxBuffer: 10 * 1024 * 1024 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// 7. Fast & Ultra-Reliable Video Concat & Transcoding Endpoint for Batch Export
// Merges all batch MP4/WebM clips into one continuous, 100% universal standard MP4 file
// (Guaranteed H.264 High 4.1 + YUV420p + AAC Stereo 44.1kHz + Faststart for universal playback on Windows Media Player, QuickTime, mobile & TV)
app.post("/api/merge-videos", mergeUpload.array("videos"), async (req, res) => {
  // Allow up to 15 minutes for massive surahs like Al-Baqarah (286 ayahs)
  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(15 * 60 * 1000);

  const files = (req.files as Express.Multer.File[]) || [];
  if (!files || files.length === 0) {
    return res.status(400).json({ status: "error", message: "No video files provided for merging." });
  }

  const sessionDir = path.join(mergeUploadDir, `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const listFilePath = path.join(sessionDir, "concat_list.txt");
  const outputFilePath = path.join(sessionDir, "merged_master.mp4");

  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    try {
      files.forEach((f) => {
        if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
      if (fs.existsSync(sessionDir)) fs.rmdirSync(sessionDir);
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  };

  try {
    // Sort files sequentially by clip index
    const getClipIndex = (name: string): number => {
      const match = (name || "").match(/clip_(\d+)/i);
      if (match) return parseInt(match[1], 10);
      const digits = (name || "").replace(/\D+/g, "");
      return digits ? parseInt(digits, 10) : 0;
    };

    const sortedFiles = [...files].sort((a, b) => getClipIndex(a.originalname) - getClipIndex(b.originalname));

    if (sortedFiles.length === 1) {
      // Single clip: direct transcode to universal MP4
      const audioExists = await hasAudioStream(sortedFiles[0].path);
      const args = [
        "-y",
        "-loglevel", "warning",
        "-fflags", "+genpts",
        "-i", sortedFiles[0].path,
        ...(audioExists ? [] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]),
        "-max_muxing_queue_size", "10240",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
        "-r", "30",
        "-vsync", "cfr",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level", "4.1",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",
        ...(audioExists ? ["-af", "aresample=async=1000:first_pts=0"] : ["-shortest"]),
        "-movflags", "+faststart",
        outputFilePath
      ];
      await runFfmpeg(args);
    } else {
      // Multiple clips: first try concat demuxer with ultrafast settings
      let concatSuccess = false;
      try {
        const listContent = sortedFiles.map((file) => `file '${file.path.replace(/'/g, "'\\''")}'`).join("\n");
        fs.writeFileSync(listFilePath, listContent, "utf8");

        await runFfmpeg([
          "-y",
          "-loglevel", "warning",
          "-fflags", "+genpts",
          "-f", "concat",
          "-safe", "0",
          "-i", listFilePath,
          "-max_muxing_queue_size", "10240",
          "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
          "-r", "30",
          "-vsync", "cfr",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "22",
          "-pix_fmt", "yuv420p",
          "-profile:v", "high",
          "-level", "4.1",
          "-c:a", "aac",
          "-b:a", "192k",
          "-ar", "44100",
          "-ac", "2",
          "-af", "aresample=async=1000:first_pts=0",
          "-movflags", "+faststart",
          outputFilePath
        ]);

        if (fs.existsSync(outputFilePath) && fs.statSync(outputFilePath).size > 1000) {
          concatSuccess = true;
        }
      } catch (demuxerErr) {
        console.warn("Concat demuxer failed, falling back to filter_complex concat:", demuxerErr);
      }

      // Robust fallback: if demuxer failed, use filter_complex concat
      if (!concatSuccess) {
        const inputArgs: string[] = [];
        let filterParts: string[] = [];
        sortedFiles.forEach((file, idx) => {
          inputArgs.push("-i", file.path);
          filterParts.push(`[${idx}:v][${idx}:a]`);
        });

        const filterStr = `${filterParts.join("")}concat=n=${sortedFiles.length}:v=1:a=1[cv][ca];[cv]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[outv];[ca]aresample=async=1000:first_pts=0[outa]`;

        await runFfmpeg([
          "-y",
          "-loglevel", "warning",
          ...inputArgs,
          "-filter_complex", filterStr,
          "-map", "[outv]",
          "-map", "[outa]",
          "-max_muxing_queue_size", "10240",
          "-r", "30",
          "-vsync", "cfr",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "22",
          "-pix_fmt", "yuv420p",
          "-profile:v", "high",
          "-level", "4.1",
          "-c:a", "aac",
          "-b:a", "192k",
          "-ar", "44100",
          "-ac", "2",
          "-movflags", "+faststart",
          outputFilePath
        ]);
      }
    }

    if (!fs.existsSync(outputFilePath) || fs.statSync(outputFilePath).size < 1000) {
      throw new Error("FFmpeg finished but output merged MP4 file was not created or was empty.");
    }

    res.setHeader("Content-Disposition", 'attachment; filename="merged_master.mp4"');
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    res.sendFile(outputFilePath, (sendErr) => {
      if (sendErr) {
        console.error("Error during merged video streaming:", sendErr);
      }
      cleanup();
    });
  } catch (err: any) {
    console.error("Video merge error:", err);
    cleanup();
    res.status(500).json({ status: "error", message: err.message || "Failed to merge video files" });
  }
});

// 8. Single Video MP4 Universal Transcoder (H.264 High 4.1 + AAC Stereo with FastStart)
// Guarantees zero "unsupported codec / format" errors in Windows Media Player, QuickTime, Android, iOS & TVs
app.post("/api/convert-to-mp4", mergeUpload.single("video"), async (req, res) => {
  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(15 * 60 * 1000);

  const file = req.file;
  if (!file) {
    return res.status(400).json({ status: "error", message: "No video provided for conversion" });
  }

  const requestedFilename = (req.body?.filename || "quran_video_universal.mp4").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const outputFilePath = path.join(mergeUploadDir, `converted_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`);
  
  const cleanup = () => {
    try {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    } catch {}
  };

  try {
    const audioExists = await hasAudioStream(file.path);

    let ffmpegArgs: string[];
    if (audioExists) {
      ffmpegArgs = [
        "-y",
        "-loglevel", "warning",
        "-fflags", "+genpts",
        "-i", file.path,
        "-max_muxing_queue_size", "10240",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
        "-r", "30",
        "-vsync", "cfr",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level", "4.1",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",
        "-af", "aresample=async=1000:first_pts=0",
        "-movflags", "+faststart",
        outputFilePath
      ];
    } else {
      // Synthesize silent stereo audio to guarantee all media players and social apps accept the MP4
      ffmpegArgs = [
        "-y",
        "-loglevel", "warning",
        "-fflags", "+genpts",
        "-i", file.path,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-max_muxing_queue_size", "10240",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
        "-r", "30",
        "-vsync", "cfr",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level", "4.1",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",
        "-shortest",
        "-movflags", "+faststart",
        outputFilePath
      ];
    }

    try {
      await runFfmpeg(ffmpegArgs);
    } catch (primaryErr) {
      console.warn("Primary MP4 encode warning, attempting failsafe transcode:", primaryErr);
      await runFfmpeg([
        "-y",
        "-loglevel", "warning",
        "-i", file.path,
        "-max_muxing_queue_size", "10240",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        outputFilePath
      ]);
    }

    if (!fs.existsSync(outputFilePath) || fs.statSync(outputFilePath).size < 1000) {
      throw new Error("Transcode finished but output MP4 file was empty or missing.");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${requestedFilename}"`);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");

    res.sendFile(outputFilePath, (sendErr) => {
      if (sendErr) {
        console.error("Error sending converted MP4:", sendErr);
      }
      cleanup();
    });
  } catch (err: any) {
    console.error("MP4 Transcode error:", err);
    cleanup();
    res.status(500).json({ status: "error", message: err?.message || "Failed to convert video to universal MP4" });
  }
});

// 9. Audio Universal Transcoder to Genuine MP3 (192kbps, 44.1kHz, ID3v2 tagged)
// Guarantees zero "unsupported audio" errors on car players, phones, and media software
app.post("/api/convert-to-mp3", mergeUpload.single("audio"), async (req, res) => {
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);

  const file = req.file;
  if (!file) {
    return res.status(400).json({ status: "error", message: "No audio provided for conversion" });
  }

  const requestedFilename = (req.body?.filename || "quran_recitation.mp3").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const outputFilePath = path.join(mergeUploadDir, `converted_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);

  const cleanup = () => {
    try {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    } catch {}
  };

  try {
    await runFfmpeg([
      "-y",
      "-loglevel", "warning",
      "-i", file.path,
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      "-ar", "44100",
      "-ac", "2",
      "-id3v2_version", "3",
      outputFilePath
    ]);

    if (!fs.existsSync(outputFilePath) || fs.statSync(outputFilePath).size < 500) {
      throw new Error("Audio transcode failed or output MP3 was empty.");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${requestedFilename}"`);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");

    res.sendFile(outputFilePath, (sendErr) => {
      if (sendErr) {
        console.error("Error sending converted MP3:", sendErr);
      }
      cleanup();
    });
  } catch (err: any) {
    console.error("MP3 Transcode error:", err);
    cleanup();
    res.status(500).json({ status: "error", message: err?.message || "Failed to convert audio to universal MP3" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Quran Video Maker Server running on http://0.0.0.0:${PORT}`);
  });
  server.setTimeout(15 * 60 * 1000);
  server.keepAliveTimeout = 65000;
}

startServer().catch((err) => {
  console.error("Failed to start Quran Video Maker server:", err);
  process.exit(1);
});
