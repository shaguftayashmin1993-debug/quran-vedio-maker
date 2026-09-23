import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import fs from "fs";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const IMAGES: Record<string, string> = {
  'makkah-kaaba-majestic': 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=400&auto=format&fit=crop',
  'makkah-clock-tower-night': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop',
  'makkah-grand-minarets': 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=400&auto=format&fit=crop',
  'makkah-haram-golden-night': 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=400&auto=format&fit=crop',
  'makkah-spire-skyline': 'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=400&auto=format&fit=crop',
  'madinah-green-dome': 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=400&auto=format&fit=crop',
  'madinah-giant-umbrellas': 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=400&auto=format&fit=crop',
  'madinah-sacred-arches': 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=400&auto=format&fit=crop',
  'madinah-minaret-sunset': 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?q=80&w=400&auto=format&fit=crop',
  'madinah-marble-courtyard': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=400&auto=format&fit=crop',
  'masjid-al-aqsa-dome': 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=400&auto=format&fit=crop',
  'islamic-geometric-calligraphy': 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=400&auto=format&fit=crop',
  'scholar-study': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=400&auto=format&fit=crop',
  'symbolic-twilight-desert': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=400&auto=format&fit=crop',
  'symbolic-ancient-marketplace': 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=400&auto=format&fit=crop',
  'symbolic-divine-light': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
  'historical-artifacts': 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?q=80&w=400&auto=format&fit=crop',
  'noble-quran': 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=400&auto=format&fit=crop',
  'ramadan-lantern': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?q=80&w=400&auto=format&fit=crop',
  'blue-mosque-istanbul': 'https://images.unsplash.com/photo-1574246604907-db69e30ddb97?q=80&w=400&auto=format&fit=crop',
  'starry-night': 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=400&auto=format&fit=crop',
  'golden-desert': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=400&auto=format&fit=crop',
  'divine-sky': 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=400&auto=format&fit=crop',
  'misty-nature': 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400&auto=format&fit=crop',
  'peaceful-ocean': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
  'glowing-waterfall': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=400&auto=format&fit=crop',
  'blooming-garden': 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=400&auto=format&fit=crop',
  'cosmic-nebula': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop',
  'snowy-mountains': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400&auto=format&fit=crop',
  'emerald-valley': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop',
  'aurora-borealis': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=400&auto=format&fit=crop'
};

async function checkOne(id: string, url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { id, has_human: false, error: `fetch_${res.status}` };
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';

    const resp = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64, mimeType } },
            {
              text: `Critically inspect this image. Does it contain ANY of the following:
1. Any human person, people, crowd, pilgrims, worshippers, body parts (face, hands, legs, head)?
2. Any human silhouette, human outline, shadow of a human?
3. Any human cartoon, anime character, anime figurine, doll, toy person, human illustration, statue/painting/sculpture depicting human form?

Reply in format:
HAS_HUMAN: YES or NO
REASON: <concise explanation of what is in the picture>`
            }
          ]
        }
      ]
    });
    const text = resp.text || '';
    const hasHuman = text.includes('HAS_HUMAN: YES');
    const reasonMatch = text.match(/REASON:\s*(.*)/i);
    const reason = reasonMatch ? reasonMatch[1] : text;
    return { id, hasHuman, reason: reason.trim() };
  } catch (e: any) {
    return { id, hasHuman: false, error: e.message };
  }
}

async function run() {
  const results = [];
  const entries = Object.entries(IMAGES);
  for (const [id, url] of entries) {
    const res = await checkOne(id, url);
    console.log(`[AUDIT] ${id} -> HAS_HUMAN=${res.hasHuman} | ${res.reason || res.error}`);
    results.push(res);
    fs.writeFileSync('scripts/audit_results.json', JSON.stringify(results, null, 2));
    await new Promise(r => setTimeout(r, 600));
  }

  const flagged = results.filter(r => r.hasHuman);
  console.log("\n==========================================");
  console.log("FINAL FLAGGED IMAGES WITH HUMANS/FIGURES/CARTOONS:");
  flagged.forEach(f => console.log(` * ${f.id}: ${f.reason}`));
  console.log("==========================================");
}

run();
