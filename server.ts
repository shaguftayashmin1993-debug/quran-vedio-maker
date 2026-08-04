import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// In-memory cache for surah list and surah texts to speed up subsequent requests
const surahCache: Record<number, any> = {};
let surahListCache: any[] | null = null;

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

  try {
    if (surahCache[surahNum]) {
      return res.json({ status: "success", data: surahCache[surahNum] });
    }

    // Single multi-edition fetch to alquran.cloud + parallel indopak fetch with 20s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const editionsUrl = `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,en.sahih,ur.jalandhry,hi.hindi,fr.hamidullah,id.indonesian,es.bornez,tr.yildirim`;
    const indopakUrl = `https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=${surahNum}&per_page=300`;

    const [editionsRes, indopakRes] = await Promise.all([
      fetch(editionsUrl, { signal: controller.signal }).catch(() => null),
      fetch(indopakUrl, { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    let uthmaniData: any = null;
    let enData: any = null;
    let urData: any = null;
    let hiData: any = null;
    let frData: any = null;
    let idData: any = null;
    let esData: any = null;
    let trData: any = null;

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
        }
      }
    }

    // Fallback: If multi-edition failed or uthmani is missing, fetch uthmani directly
    if (!uthmaniData) {
      const singleRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`).catch(() => null);
      if (!singleRes || !singleRes.ok) throw new Error(`Failed to load Arabic text for Surah ${surahNum}`);
      const singleJson = await singleRes.json();
      uthmaniData = singleJson.data;
    }

    let indopakMap: Record<number, string> = {};
    if (indopakRes && indopakRes.ok) {
      const indopakJson = await indopakRes.json();
      if (indopakJson?.verses) {
        for (const v of indopakJson.verses) {
          const ayahNum = parseInt(v.verse_key.split(":")[1], 10);
          indopakMap[ayahNum] = v.text_indopak || "";
        }
      }
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
    const ayahs = rawAyahs.map((a: any) => {
      const num = a.numberInSurah;
      const rawArabic = a.text;
      const rawIndopak = indopakMap[num] || a.text;

      return {
        num,
        arabic: stripBismillah(rawArabic, num),
        indopak: stripBismillah(rawIndopak, num),
        english: enData?.ayahs?.[num - 1]?.text || "",
        urdu: urData?.ayahs?.[num - 1]?.text || "",
        hindi: hiData?.ayahs?.[num - 1]?.text || "",
        french: frData?.ayahs?.[num - 1]?.text || "",
        indonesian: idData?.ayahs?.[num - 1]?.text || "",
        spanish: esData?.ayahs?.[num - 1]?.text || "",
        turkish: trData?.ayahs?.[num - 1]?.text || ""
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
    res.json({ status: "success", data: surahMeta });
  } catch (err: any) {
    console.error(`Error fetching surah ${surahNum}:`, err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 3. Audio proxy for EveryAyah and external mp3s (avoids CORS issues in browser canvas/audio)
app.get("/api/audio-proxy", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ status: "error", message: "Missing url parameter" });
  }

  try {
    const audioRes = await fetch(url);
    if (!audioRes.ok) {
      return res.status(audioRes.status).send("Failed to fetch audio stream");
    }

    res.setHeader("Content-Type", audioRes.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const arrayBuffer = await audioRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Audio proxy error:", err);
    res.status(500).send("Proxy error: " + err.message);
  }
});

// Helper function to fetch and concatenate Google Translate TTS chunks
async function fetchGoogleTTSBuffer(text: string, targetLang: string): Promise<Buffer> {
  let lang = (targetLang || 'ur').toString().toLowerCase().trim();
  if (lang === 'ur-en') lang = 'ur';
  else if (lang === 'hi-en') lang = 'hi';
  else if (lang.includes('-')) lang = lang.split('-')[0];
  else if (lang.includes('_')) lang = lang.split('_')[0];

  const chunks: string[] = [];
  let currentChunk = "";
  const words = text.split(/\s+/);

  for (const word of words) {
    if ((currentChunk + " " + word).trim().length <= 180) {
      currentChunk = (currentChunk + " " + word).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
    const ttsRes = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (ttsRes.ok) {
      const ab = await ttsRes.arrayBuffer();
      buffers.push(Buffer.from(ab));
    } else {
      console.warn(`Google TTS failed for lang '${lang}' chunk: '${chunk.substring(0, 30)}', status: ${ttsRes.status}`);
    }
  }

  if (buffers.length === 0) throw new Error(`TTS Generation failed for language: ${lang}`);
  return Buffer.concat(buffers);
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Quran Video Maker Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
