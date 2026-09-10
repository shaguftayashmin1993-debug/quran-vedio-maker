import { Ayah, Surah, VideoConfig, TextSize } from '../types';
import { stripBismillahFromAyah1 } from './audioUtils';
import { getAyahTranslationText, getDualTranslationTexts } from './translationUtils';
import { getRukuCount, getMadaniMushafPage } from '../data/surahs';

export function getTextScaleFactor(size?: TextSize): number {
  switch (size) {
    case 'compact':
      return 0.72;
    case 'normal':
      return 0.85;
    case 'large':
      return 1.05;
    case 'extra-large':
      return 1.25;
    case 'huge':
      return 1.45;
    default:
      return 0.85;
  }
}

export function toArabicDigits(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => digits[parseInt(w, 10)]);
}

// Curated royalty-free Islamic & pure natural scenery background image URLs (Strictly 100% human-free & animal-free: pure Islamic architecture, noble manuscripts, and pristine nature only)
const BG_IMAGE_URLS: Record<string, string> = {
  'holy-kaaba-makkah': 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1600&auto=format&fit=crop',
  'kaaba-kiswah-gold': 'https://images.unsplash.com/photo-1590076215667-875d4ef2d7ee?q=80&w=1600&auto=format&fit=crop',
  'prophets-mosque-madinah': 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=1600&auto=format&fit=crop',
  'masjid-al-aqsa-dome': 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1600&auto=format&fit=crop',
  'makkah-grand-mosque-minarets': 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1600&auto=format&fit=crop',
  'islamic-geometric-calligraphy': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1600&auto=format&fit=crop',
  'scholar-study': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1200&auto=format&fit=crop',
  'symbolic-twilight-desert': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop',
  'symbolic-ancient-marketplace': 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop',
  'symbolic-divine-light': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
  'symbolic-divine-silhouette': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
  'historical-artifacts': 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?q=80&w=1200&auto=format&fit=crop',
  'noble-quran': 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop',
  'quran-tazkeer-bookmark': 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?q=80&w=1200&auto=format&fit=crop',
  'ramadan-lantern': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?q=80&w=1200&auto=format&fit=crop',
  'blue-mosque-istanbul': 'https://images.unsplash.com/photo-1574246604907-db69e30ddb97?q=80&w=1200&auto=format&fit=crop',
  'sheikh-zayed-mosque': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=1200&auto=format&fit=crop',
  'mosque-arches': 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1200&auto=format&fit=crop',
  'mosque-minaret-sky': 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?q=80&w=1200&auto=format&fit=crop',
  'islamic-pattern': 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1200&auto=format&fit=crop',
  'starry-night': 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
  'golden-desert': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop',
  'divine-sky': 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=1200&auto=format&fit=crop',
  'misty-nature': 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop',
  'peaceful-ocean': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
  'glowing-waterfall': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=1200&auto=format&fit=crop',
  'blooming-garden': 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop',
  'cosmic-nebula': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
  'snowy-mountains': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop',
  'emerald-valley': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
  'aurora-borealis': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1200&auto=format&fit=crop',
};

export const SCENERY_ROTATION_LIST: VideoConfig['bgImageCategory'][] = [
  'holy-kaaba-makkah',
  'kaaba-kiswah-gold',
  'prophets-mosque-madinah',
  'masjid-al-aqsa-dome',
  'makkah-grand-mosque-minarets',
  'islamic-geometric-calligraphy',
  'noble-quran',
  'sheikh-zayed-mosque',
  'blue-mosque-istanbul',
  'mosque-arches',
  'scholar-study',
  'symbolic-twilight-desert',
  'symbolic-ancient-marketplace',
  'symbolic-divine-light',
  'historical-artifacts',
  'quran-tazkeer-bookmark',
  'ramadan-lantern',
  'mosque-minaret-sky',
  'islamic-pattern',
  'starry-night',
  'golden-desert',
  'divine-sky',
  'misty-nature',
  'peaceful-ocean',
  'glowing-waterfall',
  'blooming-garden',
  'cosmic-nebula',
  'snowy-mountains',
  'emerald-valley',
  'aurora-borealis'
];

const imageCacheMap = new Map<string, HTMLImageElement>();

export function preloadAllBackgroundImages() {
  if (typeof window === 'undefined') return;
  Object.entries(BG_IMAGE_URLS).forEach(([category, url]) => {
    if (!imageCacheMap.has(category)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      imageCacheMap.set(category, img);
    }
  });
}

// Immediately trigger background image preloading for lightning-fast rendering
preloadAllBackgroundImages();

const imageLoadListeners = new Set<() => void>();

export function subscribeBackgroundImageLoad(cb: () => void) {
  imageLoadListeners.add(cb);
  return () => imageLoadListeners.delete(cb);
}

function getBackgroundImage(category: string): HTMLImageElement | null {
  if (!category || category === 'none') return null;
  const url = BG_IMAGE_URLS[category];
  if (!url) return null;

  if (imageCacheMap.has(category)) {
    const img = imageCacheMap.get(category)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    imageLoadListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  };
  img.src = url;
  imageCacheMap.set(category, img);
  return null;
}

let cachedPaperCanvas: HTMLCanvasElement | null = null;
let cachedPaperW = 0;
let cachedPaperH = 0;

export function drawParchmentPaperBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  if (!cachedPaperCanvas || cachedPaperW !== width || cachedPaperH !== height) {
    cachedPaperCanvas = document.createElement('canvas');
    cachedPaperCanvas.width = width;
    cachedPaperCanvas.height = height;
    const pCtx = cachedPaperCanvas.getContext('2d');
    if (pCtx) {
      // 1. Warm ivory / off-white paper base gradient
      const grad = pCtx.createRadialGradient(
        width / 2, height / 2, width * 0.12,
        width / 2, height / 2, Math.max(width, height) * 0.78
      );
      grad.addColorStop(0, '#fdfbf7');    // Warm bright ivory center
      grad.addColorStop(0.50, '#f8f4e6'); // Natural cream/ivory
      grad.addColorStop(0.82, '#f1e9d6'); // Subtle aged paper
      grad.addColorStop(1, '#e6d9bf');    // Soft antique edge vignette
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, width, height);

      // 2. Natural paper vellum cloudiness (soft organic fiber density variation)
      const numClouds = 16;
      for (let i = 0; i < numClouds; i++) {
        const cx = ((i * 197.3) % width);
        const cy = ((i * 283.7) % height);
        const r = (Math.min(width, height) * 0.18) + ((i * 53) % (Math.min(width, height) * 0.28));
        const cloudGrad = pCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const tone = i % 2 === 0 ? 'rgba(215, 192, 150, 0.05)' : 'rgba(255, 255, 255, 0.04)';
        cloudGrad.addColorStop(0, tone);
        cloudGrad.addColorStop(1, 'rgba(248, 244, 230, 0)');
        pCtx.fillStyle = cloudGrad;
        pCtx.beginPath();
        pCtx.arc(cx, cy, r, 0, Math.PI * 2);
        pCtx.fill();
      }

      // 3. Subtle horizontal laid-paper lines (traditional paper manufacturing texture)
      pCtx.save();
      pCtx.strokeStyle = 'rgba(150, 125, 80, 0.024)';
      pCtx.lineWidth = 1;
      const step = 9;
      for (let y = 0; y < height; y += step) {
        pCtx.beginPath();
        pCtx.moveTo(0, y);
        pCtx.lineTo(width, y);
        pCtx.stroke();
      }
      pCtx.restore();

      // 4. Subtle microscopic paper fiber grain (tactile pressed paper fibers)
      try {
        const imgData = pCtx.getImageData(0, 0, width, height);
        const data = imgData.data;
        let seed = 987654321;
        const nextRand = () => {
          seed = (seed * 1664525 + 1013904223) % 4294967296;
          return seed / 4294967296;
        };

        const totalPixels = width * height;
        const stepPixel = Math.max(1, Math.floor(totalPixels / 300000));
        for (let i = 0; i < totalPixels; i += stepPixel) {
          if (nextRand() > 0.45) {
            const idx = i * 4;
            const noise = (nextRand() - 0.5) * 10;
            data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise * 0.7));
          }
        }
        pCtx.putImageData(imgData, 0, 0);
      } catch (e) {
        // Fallback gracefully if pixel manipulation is restricted
      }

      cachedPaperW = width;
      cachedPaperH = height;
    }
  }

  if (cachedPaperCanvas) {
    ctx.drawImage(cachedPaperCanvas, 0, 0);
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: VideoConfig['videoStyle'],
  bgImageCategory?: VideoConfig['bgImageCategory'],
  bgOverlayDarkness: number = 0.55,
  animTime: number = Date.now(),
  enableMotion: boolean = true
) {
  // 1. Check if background image is active and loaded
  const hasValidBg = bgImageCategory && bgImageCategory !== 'none';
  const bgImg = hasValidBg ? getBackgroundImage(bgImageCategory) : null;

  if (bgImg) {
    const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
    const canvasRatio = width / height;
    let renderW = width;
    let renderH = height;

    if (imgRatio > canvasRatio) {
      renderW = height * imgRatio;
    } else {
      renderH = width / imgRatio;
    }

    ctx.save();

    if (enableMotion) {
      // Smooth 22s Ken-Burns motion cycle (cinematic slow pan & gentle zoom)
      const cycle = (animTime % 22000) / 22000;
      const zoom = 1.0 + 0.075 * Math.sin(cycle * Math.PI * 2);
      const panX = Math.cos(cycle * Math.PI * 2) * (width * 0.02);
      const panY = Math.sin(cycle * Math.PI * 2) * (height * 0.015);

      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(zoom, zoom);
      ctx.drawImage(bgImg, -renderW / 2, -renderH / 2, renderW, renderH);
    } else {
      ctx.drawImage(bgImg, (width - renderW) / 2, (height - renderH) / 2, renderW, renderH);
    }

    ctx.restore();

    // Draw dark vignette overlay for 100% text legibility
    const darkAlpha = Math.max(0.25, Math.min(0.85, bgOverlayDarkness));
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.12, width / 2, height / 2, width * 0.75);
    vignette.addColorStop(0, `rgba(5, 8, 18, ${darkAlpha * 0.75})`);
    vignette.addColorStop(1, `rgba(2, 4, 10, ${Math.min(0.96, darkAlpha + 0.2)})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Animated floating ambient stardust particles for an active scenery clip feel
    if (enableMotion) {
      ctx.save();
      const is4k = width >= 2160 || height >= 2160;
      const pCount = is4k ? 15 : 24;
      const sec = animTime / 1000;
      for (let i = 0; i < pCount; i++) {
        const seedX = (i * 137.5) % width;
        const speed = 12 + (i % 6) * 6; // px per second drift
        const floatY = (height + 40) - ((sec * speed + i * 50) % (height + 80));
        const floatX = (seedX + Math.sin(sec * 0.8 + i) * 25) % width;
        const px = floatX < 0 ? floatX + width : floatX;
        const radius = (1.2 + (i % 4) * 0.7) * (is4k ? 1.6 : 1.0);
        const alpha = 0.25 + 0.45 * Math.sin(sec * 1.5 + i);

        // Render soft glowing stardust without heavy CPU canvas shadowBlur
        ctx.beginPath();
        ctx.arc(px, floatY, radius * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? `rgba(254, 240, 138, ${alpha * 0.35})` : `rgba(255, 255, 255, ${alpha * 0.25})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, floatY, radius, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? `rgba(254, 240, 138, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.fill();
      }
      ctx.restore();
    }

    // Add gold corner filigree for mushaf/quran-page styles over image if requested
    if (style === 'quran-page' || style === 'classic-mushaf') {
      const pad = Math.min(width, height) * 0.035;
      ctx.strokeStyle = '#c59b27';
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
    }
    return;
  }

  // 2. Base Procedural Fallback Styles
  if (style === 'classic-mushaf' || style === 'parchment-mushaf' || style === 'quran-page') {
    // Authentic Warm Ivory / Off-White Paper with subtle tactile paper texture
    drawParchmentPaperBackground(ctx, width, height);

    const pad = Math.min(width, height) * 0.035;

    if (style === 'quran-page') {
      // Elegant dark background with subtle vignette when no image is selected
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      const pad = Math.min(width, height) * 0.035;
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
      return;
    }

    // Beaded double border for classic/parchment
    ctx.strokeStyle = '#2b2418';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

    ctx.strokeStyle = '#a67c20';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad + 8, pad + 8, width - (pad + 8) * 2, height - (pad + 8) * 2);

    if (style === 'parchment-mushaf') {
      // Corner medallions
      const cornerR = Math.min(width, height) * 0.018;
      const corners = [
        [pad + 8, pad + 8],
        [width - (pad + 8), pad + 8],
        [pad + 8, height - (pad + 8)],
        [width - (pad + 8), height - (pad + 8)]
      ];
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.arc(cx, cy, cornerR, 0, Math.PI * 2);
        ctx.fillStyle = '#a67c20';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, cornerR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fcfbf6';
        ctx.fill();
      }
    }
    return;
  }

  if (style === 'scholar-rembrandt') {
    // Warm Mahogany Study & Archival Library Background
    const grad = ctx.createLinearGradient(0, 0, width * 0.8, height);
    grad.addColorStop(0, '#1c1007');
    grad.addColorStop(0.5, '#120a04');
    grad.addColorStop(1, '#080402');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Warm Rembrandt Key-Light (45-degree directional golden light beam from top-left)
    const keyLight = ctx.createRadialGradient(width * 0.25, height * 0.22, 10, width * 0.35, height * 0.35, width * 0.85);
    keyLight.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    keyLight.addColorStop(0.35, 'rgba(217, 119, 6, 0.12)');
    keyLight.addColorStop(0.7, 'rgba(180, 83, 9, 0.04)');
    keyLight.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = keyLight;
    ctx.fillRect(0, 0, width, height);

    // Rembrandt Triangle Highlight & Edge Rim Light
    const rimLight = ctx.createLinearGradient(width, 0, width * 0.85, 0);
    rimLight.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
    rimLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rimLight;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (style === 'symbolic-broll') {
    // Pure Silent Twilight Sunset & Divine Glow
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1a0b18');
    grad.addColorStop(0.4, '#13071b');
    grad.addColorStop(0.75, '#24100b');
    grad.addColorStop(1, '#0d0408');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Radiant Golden Divine Glowing Light (Aniconic representation of unseen elements)
    const divineGlow = ctx.createRadialGradient(width / 2, height * 0.38, 20, width / 2, height * 0.40, width * 0.72);
    divineGlow.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
    divineGlow.addColorStop(0.3, 'rgba(245, 158, 11, 0.16)');
    divineGlow.addColorStop(0.65, 'rgba(180, 83, 9, 0.06)');
    divineGlow.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = divineGlow;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (style === 'emerald-gold') {
    // Deep emerald green gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#06231c');
    grad.addColorStop(1, '#02110d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Geometric radial glow
    const glow = ctx.createRadialGradient(width / 2, height * 0.4, 0, width / 2, height * 0.4, width * 0.6);
    glow.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (style === 'minimal-twilight') {
    // Obsidian black
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Default: modern-dark
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0b1329');
  grad.addColorStop(1, '#030611');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient gold radial spotlight
  const spot = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.6);
  spot.addColorStop(0, 'rgba(212, 175, 55, 0.07)');
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, width, height);
}

// Helper to apply text animation matrix/opacity before drawing text
function applyTextAnimation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  animMode: VideoConfig['textAnimation'],
  progress: number = 1,
  timeMs: number = Date.now()
) {
  const p = Math.max(0, Math.min(1, progress));
  const ease = Math.sin((p * Math.PI) / 2); // Smooth sine ease-out

  ctx.save();

  if (animMode === 'fade-scale') {
    const scale = 0.94 + 0.06 * ease;
    ctx.globalAlpha = ease;
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
  } else if (animMode === 'slide-up') {
    const slideY = (1 - ease) * 42;
    ctx.globalAlpha = Math.min(1, ease * 1.25);
    ctx.translate(0, slideY);
  } else if (animMode === 'glow-pulse') {
    ctx.globalAlpha = ease;
    const pulseBlur = 8 + Math.sin(timeMs / 320) * 6;
    ctx.shadowColor = 'rgba(212, 175, 55, 0.85)';
    ctx.shadowBlur = pulseBlur * ease;
  } else {
    ctx.globalAlpha = 1;
  }
}

export function drawTitleFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  surah: Surah,
  config: VideoConfig,
  animProgress: number = 1,
  animTime: number = Date.now()
) {
  drawBackground(
    ctx,
    width,
    height,
    config.videoStyle,
    config.bgImageCategory,
    config.bgOverlayDarkness,
    animTime,
    config.animatedSceneryEffects !== false
  );

  const hasBgImg = config.bgImageCategory && config.bgImageCategory !== 'none' && config.videoStyle !== 'quran-page';
  const isLight = !hasBgImg && (config.videoStyle === 'classic-mushaf' || config.videoStyle === 'parchment-mushaf' || config.videoStyle === 'quran-page');
  const goldColor = config.videoStyle === 'quran-page' ? '#0a3d2e' : '#d4af37';
  const textColor = hasBgImg ? '#fdfcf7' : config.videoStyle === 'quran-page' ? '#0a0a0a' : isLight ? '#2b2418' : '#f5f0dc';
  const subColor = hasBgImg ? '#e2e8f0' : config.videoStyle === 'quran-page' ? '#8c6d28' : isLight ? '#66522c' : '#a0aec0';

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  const textScale = getTextScaleFactor(config.textSize);
  const isPortrait = config.aspectRatio === '9:16';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (config.videoStyle === 'quran-page') {
    // Authentic Classical Unwan Title Page - 100% Arabic Calligraphy, Black Ink & Antique Gold, No Modern Typography
    const centerY = isPortrait ? height * 0.42 : height * 0.42;
    const arabicTitleFontSize = Math.round((isPortrait ? width * 0.095 : height * 0.115) * textScale);

    // Decorative Calligraphic Surah Name in crisp deep black ink (#0a0a0a)
    ctx.font = `bold 700 ${arabicTitleFontSize}px 'Amiri', 'Amiri Quran', serif`;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(`سُورَةُ ${surah.name}`, width / 2, centerY);

    // Classical Revelation Metadata in antique gold calligraphy
    const revText = surah.revelationType === 'Medinan' ? 'مَدَنِيَّةٌ' : 'مَكِّيَّةٌ';
    const metaText = `${revText} • آيَاتُهَا ${toArabicDigits(surah.numberOfAyahs)}`;
    const metaFontSize = Math.round((isPortrait ? width * 0.038 : height * 0.040) * Math.min(1.2, textScale));
    ctx.font = `bold 600 ${metaFontSize}px 'Amiri', 'Amiri Quran', serif`;
    ctx.fillStyle = '#8c6d28';
    ctx.fillText(metaText, width / 2, centerY + (isPortrait ? height * 0.085 : height * 0.10));

    // Classical double gold satr rule with central diamond
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 1.5;
    const lineW = width * (isPortrait ? 0.48 : 0.38);
    const ruleY = centerY + (isPortrait ? height * 0.15 : height * 0.18);
    ctx.beginPath();
    ctx.moveTo(width / 2 - lineW / 2, ruleY);
    ctx.lineTo(width / 2 + lineW / 2, ruleY);
    ctx.stroke();

    // Central decorative star/diamond on the rule
    ctx.beginPath();
    ctx.arc(width / 2, ruleY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0a3d2e';
    ctx.fill();

    ctx.restore();
    return;
  }

  // Decorative emblem / Surah Arabic Name
  const centerY = isPortrait ? height * 0.38 : height * 0.36;
  const arabicTitleFontSize = Math.round((isPortrait ? width * 0.095 : height * 0.115) * textScale);
  ctx.font = `600 ${arabicTitleFontSize}px 'Amiri', 'Amiri Quran', serif`;
  ctx.fillStyle = goldColor;
  ctx.fillText(surah.name, width / 2, centerY);

  // Subtitle / English Name
  const subY = isPortrait ? height * 0.50 : height * 0.52;
  const englishTitleFontSize = Math.round((isPortrait ? width * 0.052 : height * 0.048) * textScale);
  ctx.font = `600 ${englishTitleFontSize}px 'Playfair Display', Georgia, serif`;
  ctx.fillStyle = textColor;
  ctx.fillText(`Surah ${surah.englishName}`, width / 2, subY);

  const metaFontSize = Math.round((isPortrait ? width * 0.034 : height * 0.032) * Math.min(1.2, textScale));
  ctx.font = `500 ${metaFontSize}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = subColor;
  ctx.fillText(`"${surah.englishNameTranslation}" • ${surah.numberOfAyahs} Verses • ${surah.revelationType}`, width / 2, subY + height * 0.055);

  // Gold accent rule
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 2.0;
  const lineW = width * (isPortrait ? 0.44 : 0.34);
  ctx.beginPath();
  ctx.moveTo(width / 2 - lineW / 2, subY + height * 0.10);
  ctx.lineTo(width / 2 + lineW / 2, subY + height * 0.10);
  ctx.stroke();

  ctx.restore();
}

export function drawBismillahFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: VideoConfig,
  animProgress: number = 1,
  animTime: number = Date.now()
) {
  drawBackground(
    ctx,
    width,
    height,
    config.videoStyle,
    config.bgImageCategory,
    config.bgOverlayDarkness,
    animTime,
    config.animatedSceneryEffects !== false
  );

  const hasBgImg = config.bgImageCategory && config.bgImageCategory !== 'none' && config.videoStyle !== 'quran-page';
  const isLight = !hasBgImg && (config.videoStyle === 'classic-mushaf' || config.videoStyle === 'parchment-mushaf' || config.videoStyle === 'quran-page');
  const textColor = config.videoStyle === 'quran-page' ? '#0a0a0a' : hasBgImg ? '#fdfcf7' : isLight ? '#2b2418' : '#f5f0dc';

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  const textScale = getTextScaleFactor(config.textSize);
  const isPortrait = config.aspectRatio === '9:16';
  const bismillahFontSize = Math.round((isPortrait ? width * 0.072 : height * 0.088) * textScale);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 700 ${bismillahFontSize}px 'Amiri Quran', 'Amiri', serif`;
  ctx.fillStyle = textColor;
  ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', width / 2, height / 2);

  if (config.videoStyle === 'quran-page') {
    // Ruled gold divider lines above and below Bismillah
    const lineW = width * (isPortrait ? 0.68 : 0.52);
    const ruleH = bismillahFontSize * 0.95;
    ctx.strokeStyle = 'rgba(197, 155, 39, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - lineW / 2, height / 2 - ruleH);
    ctx.lineTo(width / 2 + lineW / 2, height / 2 - ruleH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2 - lineW / 2, height / 2 + ruleH);
    ctx.lineTo(width / 2 + lineW / 2, height / 2 + ruleH);
    ctx.stroke();
  }

  ctx.restore();
}

function getLineTranslationChunk(fullText: string, lineIndex: number, totalLines: number): string {
  if (!fullText || totalLines <= 1) return fullText || '';
  const words = fullText.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return fullText || '';
  if (words.length <= 4) return fullText; // Short translations should stay whole to preserve meaning
  const startIdx = Math.floor((lineIndex / totalLines) * words.length);
  let endIdx = Math.floor(((lineIndex + 1) / totalLines) * words.length);
  if (lineIndex === totalLines - 1) endIdx = words.length;
  const chunk = words.slice(startIdx, endIdx).join(' ').trim();
  return chunk || fullText;
}

export function drawAyahFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  surah: Surah,
  ayah: Ayah,
  config: VideoConfig,
  animProgress: number = 1,
  animTime: number = Date.now(),
  audioProgress: number = -1, // -1 = static, 0.0 to 1.0 = active audio playback progress
  showSurahHeader: boolean = true
) {
  if (config.videoStyle === 'quran-page') {
    return drawQuranBookPageFrame(ctx, width, height, surah, ayah, config, animProgress, animTime, audioProgress, showSurahHeader);
  }

  // Determine Slot Type for Scholar Study vs Symbolic B-roll (100% human-free visuals)
  const isScholarSlot =
    config.slotType === 'scholar-study' ||
    config.slotType === 'scholar-on-screen' ||
    config.videoStyle === 'scholar-rembrandt' ||
    (config.slotType === 'alternating-slots' && ayah.num % 2 === 0);

  const isSymbolicSlot =
    config.slotType === 'symbolic-broll' ||
    config.videoStyle === 'symbolic-broll' ||
    (config.slotType === 'alternating-slots' && ayah.num % 2 === 1);

  let activeStyle = config.videoStyle;
  if (isScholarSlot) activeStyle = 'scholar-rembrandt';
  else if (isSymbolicSlot) activeStyle = 'symbolic-broll';

  let activeBgCategory = config.bgImageCategory;
  if ((config.rotateBgPerAyah !== false) && config.bgImageCategory !== 'none') {
    if (isScholarSlot) {
      activeBgCategory = 'scholar-study';
    } else if (isSymbolicSlot) {
      const brollList: VideoConfig['bgImageCategory'][] = [
        'symbolic-twilight-desert',
        'symbolic-ancient-marketplace',
        'symbolic-divine-light',
        'historical-artifacts',
        'golden-desert',
        'divine-sky'
      ];
      activeBgCategory = brollList[(ayah.num - 1) % brollList.length];
    } else {
      const bgIndex = (ayah.num - 1) % SCENERY_ROTATION_LIST.length;
      activeBgCategory = SCENERY_ROTATION_LIST[bgIndex];
    }
    // Preload next background image
    const nextIndex = ayah.num % SCENERY_ROTATION_LIST.length;
    getBackgroundImage(SCENERY_ROTATION_LIST[nextIndex]);
  } else if (activeBgCategory === 'none') {
    if (isScholarSlot) activeBgCategory = 'scholar-study';
    else if (isSymbolicSlot) activeBgCategory = 'symbolic-twilight-desert';
  }

  drawBackground(
    ctx,
    width,
    height,
    activeStyle,
    activeBgCategory,
    config.bgOverlayDarkness,
    animTime,
    config.animatedSceneryEffects !== false
  );

  const isPortrait = config.aspectRatio === '9:16';
  const hasBgImg = activeBgCategory && activeBgCategory !== 'none';
  const isLight = !hasBgImg && (activeStyle === 'classic-mushaf' || activeStyle === 'parchment-mushaf');
  const textColor = '#ffffff'; // Pure white color for Arabic text
  const transColor = '#ffffff'; // Pure white color for English / Translation text
  const goldColor = '#d4af37';

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  const marginX = width * (isPortrait ? 0.08 : 0.07);
  const maxW = width - marginX * 2;

  // Arabic Text
  const rawArabic = (config.arabicScript === 'indopak' && ayah.indopak) ? ayah.indopak : ayah.arabic;
  const arabicText = stripBismillahFromAyah1(rawArabic, surah.number, ayah.num);
  const rawWords = arabicText.split(' ').filter((w) => w.trim().length > 0);

  const useOneLinePerFrame = config.oneLinePerFrame === true;
  const textScale = getTextScaleFactor(config.textSize);

  // Adaptive typography calculation based on canvas aspect ratio and verse length
  const availableContentHeight = height * (isPortrait ? 0.76 : 0.74);
  const rawWordCount = rawWords.length;
  const rawArabicCharCount = arabicText.length;

  // Compute adaptive base font sizes - comfortable, airy & uncluttered
  let targetArabicSize = isPortrait
    ? Math.round(width * 0.105 * textScale)
    : Math.round(height * 0.125 * textScale);

  let targetPrimaryTransSize = isPortrait
    ? Math.round(width * 0.038 * textScale)
    : Math.round(height * 0.042 * textScale);

  let targetSecondaryTransSize = isPortrait
    ? Math.round(width * 0.030 * textScale)
    : Math.round(height * 0.034 * textScale);

  let adaptiveSepMargin = isPortrait
    ? Math.round(width * 0.055)
    : 28;

  if (!useOneLinePerFrame) {
    if (rawWordCount > 40 || rawArabicCharCount > 200) {
      targetArabicSize = Math.round(targetArabicSize * 0.72);
      targetPrimaryTransSize = Math.round(targetPrimaryTransSize * 0.84);
      targetSecondaryTransSize = Math.round(targetSecondaryTransSize * 0.84);
      adaptiveSepMargin = Math.round(adaptiveSepMargin * 0.65);
    } else if (rawWordCount > 25 || rawArabicCharCount > 130) {
      targetArabicSize = Math.round(targetArabicSize * 0.82);
      targetPrimaryTransSize = Math.round(targetPrimaryTransSize * 0.88);
      targetSecondaryTransSize = Math.round(targetSecondaryTransSize * 0.88);
      adaptiveSepMargin = Math.round(adaptiveSepMargin * 0.76);
    } else if (rawWordCount > 16 || rawArabicCharCount > 80) {
      targetArabicSize = Math.round(targetArabicSize * 0.90);
      targetPrimaryTransSize = Math.round(targetPrimaryTransSize * 0.94);
      targetSecondaryTransSize = Math.round(targetSecondaryTransSize * 0.94);
      adaptiveSepMargin = Math.round(adaptiveSepMargin * 0.88);
    }
  }

  const minArabicFloor = Math.round((isPortrait ? 30 : 24) * Math.min(1.2, textScale));
  let arabicFontSize = Math.max(minArabicFloor, targetArabicSize);
  ctx.font = `500 ${arabicFontSize}px 'Amiri Quran', 'Amiri', 'Scheherazade New', serif`;

  // Ensure individual long words fit within maxW comfortably
  for (const w of rawWords) {
    while (ctx.measureText(w).width > maxW && arabicFontSize > 24) {
      arabicFontSize -= 2;
      ctx.font = `500 ${arabicFontSize}px 'Amiri Quran', 'Amiri', 'Scheherazade New', serif`;
    }
  }

  // Tokenize into words
  const activeWordIndex = (config.highlightRecitedWords !== false && audioProgress >= 0)
    ? Math.min(rawWords.length - 1, Math.floor(audioProgress * rawWords.length))
    : -1;

  interface WordToken {
    text: string;
    globalIndex: number;
  }

  const linesOfWords: WordToken[][] = [];
  let currentLineWords: WordToken[] = [];
  let currentLineText = '';

  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i];
    const testText = currentLineText ? `${currentLineText} ${w}` : w;
    const metrics = ctx.measureText(testText);
    if (metrics.width > maxW && currentLineWords.length > 0) {
      linesOfWords.push(currentLineWords);
      currentLineWords = [{ text: w, globalIndex: i }];
      currentLineText = w;
    } else {
      currentLineWords.push({ text: w, globalIndex: i });
      currentLineText = testText;
    }
  }
  if (currentLineWords.length > 0) {
    linesOfWords.push(currentLineWords);
  }

  // End of Ayah symbol with Arabic digits
  const ayahSymbol = `۝${toArabicDigits(ayah.num)}`;
  if (linesOfWords.length > 0) {
    linesOfWords[linesOfWords.length - 1].push({
      text: ayahSymbol,
      globalIndex: 9999
    });
  }

  // Determine active line index when using 1 line per frame
  let activeLineIdx = 0;
  if (useOneLinePerFrame && linesOfWords.length > 1) {
    if (activeWordIndex >= 0) {
      for (let l = 0; l < linesOfWords.length; l++) {
        if (linesOfWords[l].some((t) => t.globalIndex === activeWordIndex)) {
          activeLineIdx = l;
          break;
        }
      }
    } else if (audioProgress >= 0) {
      activeLineIdx = Math.min(linesOfWords.length - 1, Math.floor(audioProgress * linesOfWords.length));
    }
  }

  // Header Pill
  if (showSurahHeader !== false) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const headerLineInfo = (useOneLinePerFrame && linesOfWords.length > 1)
      ? ` • Line ${activeLineIdx + 1} of ${linesOfWords.length}`
      : '';

    ctx.font = `600 ${Math.round(isPortrait ? width * 0.042 : height * 0.046)}px 'Amiri', 'Amiri Quran', serif`;
    ctx.fillStyle = goldColor;
    ctx.fillText(`${surah.name} • ${surah.englishName}${headerLineInfo}`, width / 2, height * 0.05);
  } else if (useOneLinePerFrame && linesOfWords.length > 1) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${Math.round(isPortrait ? width * 0.036 : height * 0.040)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = goldColor;
    ctx.fillText(`Line ${activeLineIdx + 1} of ${linesOfWords.length}`, width / 2, height * 0.05);
  }

  // Filter lines to render: 1 line if useOneLinePerFrame, else all lines
  const linesToRender = (useOneLinePerFrame && linesOfWords.length > 1)
    ? [linesOfWords[activeLineIdx]]
    : linesOfWords;

  // Generous, authentic line spacing so Arabic tashkeel, descenders and diacritics NEVER collide
  const lineSpacing = Math.round(arabicFontSize * 1.78);
  const numArabicLines = linesToRender.length;
  const totalArabicHeight = numArabicLines > 0 ? ((numArabicLines - 1) * lineSpacing + Math.round(arabicFontSize * 1.22)) : 0;

  // 2. Pre-calculate Translation Lines & Height
  interface TranslationBlock {
    fontFamily: string;
    fontSize: number;
    fillStyle: string;
    lines: string[];
    spacing: number;
    blockHeight: number;
  }
  const translationBlocks: TranslationBlock[] = [];
  let totalTranslationHeight = 0;

  const interBlockGap = isPortrait ? Math.round(width * 0.038) : 18;

  if (config.translationLang !== 'none') {
    const rawDual = getDualTranslationTexts(ayah, config.translationLang);

    // Slice translation chunk for current line if 1-line-per-frame is active
    const dual = (useOneLinePerFrame && linesOfWords.length > 1)
      ? {
          primaryText: getLineTranslationChunk(rawDual.primaryText, activeLineIdx, linesOfWords.length),
          primaryFont: rawDual.primaryFont,
          secondaryText: rawDual.secondaryText ? getLineTranslationChunk(rawDual.secondaryText, activeLineIdx, linesOfWords.length) : undefined,
          secondaryFont: rawDual.secondaryFont
        }
      : rawDual;

    const buildTranslationBlock = (
      text: string,
      fontFamily: string,
      initialFontSize: number,
      fillStyle: string,
      maxAllowedLines = 10
    ): TranslationBlock | null => {
      if (!text) return null;
      let fontSize = initialFontSize;
      ctx.font = `600 ${fontSize}px ${fontFamily}`;

      const tWords = text.split(' ');
      let tLines: string[] = [];
      let tCurLine = '';

      for (const tw of tWords) {
        const test = tCurLine ? `${tCurLine} ${tw}` : tw;
        if (ctx.measureText(test).width > maxW * 0.94 && tCurLine) {
          tLines.push(tCurLine);
          tCurLine = tw;
        } else {
          tCurLine = test;
        }
      }
      if (tCurLine) tLines.push(tCurLine);

      // Auto-shrink font if lines wrap too much for long verses, but keep high readable floor
      const minTransFloor = Math.round(22 * Math.min(1.25, textScale));
      if (tLines.length > (isPortrait ? 4 : 3) && fontSize > minTransFloor) {
        fontSize = Math.max(minTransFloor, Math.round(fontSize * 0.88));
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        tLines = [];
        tCurLine = '';
        for (const tw of tWords) {
          const test = tCurLine ? `${tCurLine} ${tw}` : tw;
          if (ctx.measureText(test).width > maxW * 0.94 && tCurLine) {
            tLines.push(tCurLine);
            tCurLine = tw;
          } else {
            tCurLine = test;
          }
        }
        if (tCurLine) tLines.push(tCurLine);
      }

      const finalLines = tLines.slice(0, maxAllowedLines);
      const isHindi = fontFamily.includes('Devanagari');
      const spacing = Math.round(fontSize * (isHindi ? 1.58 : 1.48));
      const blockHeight = finalLines.length > 0 ? ((finalLines.length - 1) * spacing + Math.round(fontSize * 1.20)) : 0;

      return {
        fontFamily,
        fontSize,
        fillStyle,
        lines: finalLines,
        spacing,
        blockHeight
      };
    };

    if (dual.secondaryText) {
      const b1 = buildTranslationBlock(
        dual.primaryText,
        dual.primaryFont || "'Noto Sans Devanagari', sans-serif",
        targetPrimaryTransSize,
        '#ffffff',
        6
      );
      const b2 = buildTranslationBlock(
        dual.secondaryText,
        dual.secondaryFont || "'Plus Jakarta Sans', sans-serif",
        targetSecondaryTransSize,
        '#ffffff',
        6
      );

      if (b1) {
        translationBlocks.push(b1);
        totalTranslationHeight += b1.blockHeight;
      }
      if (b2) {
        if (b1) totalTranslationHeight += interBlockGap;
        translationBlocks.push(b2);
        totalTranslationHeight += b2.blockHeight;
      }
    } else if (dual.primaryText) {
      const fontFamily = config.translationLang === 'ur'
        ? "'Noto Naskh Arabic', 'Amiri', serif"
        : config.translationLang === 'hi'
        ? "'Noto Sans Devanagari', sans-serif"
        : "'Plus Jakarta Sans', sans-serif";

      const b1 = buildTranslationBlock(dual.primaryText, fontFamily, targetPrimaryTransSize, '#ffffff', 8);
      if (b1) {
        translationBlocks.push(b1);
        totalTranslationHeight += b1.blockHeight;
      }
    }
  }

  // 3. Calculate Perfect Center Starting Y & Symmetrical Separator Gaps
  let separatorMargin = adaptiveSepMargin;
  const bottomLimit = height - (isPortrait ? height * 0.07 : height * 0.05);
  const minY = isPortrait ? height * 0.11 : height * 0.09;
  const maxAvailableH = bottomLimit - minY;

  let separatorTotalGap = translationBlocks.length > 0 ? (separatorMargin * 2) : 0;
  let totalBlockHeight = totalArabicHeight + separatorTotalGap + totalTranslationHeight;

  // If total height exceeds available room, compress separator margin and line gap so everything fits 100%
  if (totalBlockHeight > maxAvailableH && translationBlocks.length > 0) {
    const excess = totalBlockHeight - maxAvailableH;
    separatorMargin = Math.max(12, Math.round(separatorMargin - (excess / 2)));
    separatorTotalGap = separatorMargin * 2;
    totalBlockHeight = totalArabicHeight + separatorTotalGap + totalTranslationHeight;
  }

  const targetCenterY = height * 0.48; // Center between top header and bottom footer
  let blockStartY = targetCenterY - (totalBlockHeight / 2);

  if (blockStartY < minY) {
    blockStartY = minY;
  }
  // Ensure the bottom of the block never overflows bottomLimit
  if (blockStartY + totalBlockHeight > bottomLimit) {
    blockStartY = Math.max(minY, bottomLimit - totalBlockHeight);
  }

  // 4. Draw Arabic lines
  ctx.font = `500 ${arabicFontSize}px 'Amiri Quran', 'Amiri', 'Scheherazade New', serif`;
  const spaceW = ctx.measureText(' ').width * 1.25;
  let currentArabicY = blockStartY;

  ctx.textBaseline = 'top';

  for (let lIdx = 0; lIdx < linesToRender.length; lIdx++) {
    const lineWords = linesToRender[lIdx];
    let lineW = 0;
    for (let k = 0; k < lineWords.length; k++) {
      lineW += ctx.measureText(lineWords[k].text).width;
      if (k < lineWords.length - 1) lineW += spaceW;
    }

    let currentX = (width / 2) + (lineW / 2);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    for (const token of lineWords) {
      const wordW = ctx.measureText(token.text).width;
      const isCurrentActive = activeWordIndex >= 0 && token.globalIndex === activeWordIndex;
      const isPastRecited = activeWordIndex >= 0 && token.globalIndex < activeWordIndex;

      ctx.save();
      const is4k = width >= 2160 || height >= 2160;

      if (token.globalIndex === 9999) {
        ctx.fillStyle = goldColor;
      } else if (isCurrentActive) {
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
        ctx.shadowBlur = is4k ? 6 : 20;
      } else if (isPastRecited) {
        ctx.fillStyle = '#f59e0b';
      } else {
        ctx.fillStyle = textColor;
      }

      if (isLight) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = is4k ? 4 : 10;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
      }

      ctx.fillText(token.text, currentX, currentArabicY);
      ctx.restore();

      currentX -= (wordW + spaceW);
    }

    if (lIdx < linesToRender.length - 1) {
      currentArabicY += lineSpacing;
    }
  }
  ctx.direction = 'inherit';

  const lastArabicBottom = currentArabicY + arabicFontSize;

  // 5. Draw Gold Separator & Translation Blocks with Equal Symmetrical Spacing
  if (translationBlocks.length > 0) {
    const lineY = lastArabicBottom + separatorMargin;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(width / 2 - width * (isPortrait ? 0.28 : 0.20), lineY);
    ctx.lineTo(width / 2 + width * (isPortrait ? 0.28 : 0.20), lineY);
    ctx.stroke();

    let currentTransY = lineY + separatorMargin;

    ctx.textBaseline = 'top';

    for (let bIdx = 0; bIdx < translationBlocks.length; bIdx++) {
      const block = translationBlocks[bIdx];
      if (bIdx > 0) {
        currentTransY += interBlockGap;
      }

      ctx.font = `600 ${block.fontSize}px ${block.fontFamily}`;
      ctx.fillStyle = block.fillStyle;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';

      const blockLinesCount = block.lines.length;
      let effectiveSpacing = block.spacing;
      const roomLeft = bottomLimit - currentTransY;
      if (blockLinesCount > 1 && (blockLinesCount * effectiveSpacing) > roomLeft) {
        effectiveSpacing = Math.max(Math.round(block.fontSize * 1.38), Math.floor(roomLeft / blockLinesCount));
      }

      for (let tLineIdx = 0; tLineIdx < blockLinesCount; tLineIdx++) {
        const tl = block.lines[tLineIdx];
        ctx.save();
        if (isLight) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
        }
        ctx.fillText(tl, width / 2, currentTransY);
        ctx.restore();

        currentTransY += effectiveSpacing;
      }
    }
  }

  // Footer Reference
  ctx.textBaseline = 'bottom';
  ctx.font = `700 ${Math.round(isPortrait ? width * 0.035 : height * 0.032)}px 'Playfair Display', serif`;
  ctx.fillStyle = goldColor;
  ctx.fillText(`VERSE ${ayah.num} OF ${surah.numberOfAyahs}`, width / 2, height - height * 0.035);

  ctx.restore();
}

function drawBeadChain(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  radius: number,
  spacing: number
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy);
  const count = Math.floor(len / spacing);
  if (count <= 0) return;
  const stepX = dx / count;
  const stepY = dy / count;

  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.fillStyle = '#ffffff';

  for (let i = 0; i <= count; i++) {
    const cx = startX + stepX * i;
    const cy = startY + stepY * i;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
  }
  ctx.restore();
}

function drawFloralCornerEngraving(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  flipX: boolean,
  flipY: boolean,
  color: string = '#d4af37'
) {
  ctx.save();
  ctx.translate(flipX ? x + w : x, flipY ? y + h : y);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.85);
  ctx.bezierCurveTo(w * 0.18, h * 0.35, w * 0.35, h * 0.18, w * 0.85, h * 0.08);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w * 0.32, h * 0.32, Math.min(w, h) * 0.16, 0, Math.PI * 2);
  ctx.fill();

  const dots = [
    [w * 0.18, h * 0.18],
    [w * 0.52, h * 0.16],
    [w * 0.16, h * 0.52],
    [w * 0.72, h * 0.12],
    [w * 0.12, h * 0.72]
  ];
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(dx, dy, Math.min(w, h) * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 1; i <= 3; i++) {
    const frac = i * 0.22;
    ctx.beginPath();
    ctx.moveTo(0, h * frac);
    ctx.lineTo(w * frac, 0);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawQuranBookPageFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  surah: Surah,
  activeAyah: Ayah,
  config: VideoConfig,
  animProgress: number = 1,
  animTime: number = Date.now(),
  audioProgress: number = -1,
  showSurahHeader: boolean = true
) {
  let activeBgCategory = config.bgImageCategory;
  if ((config.rotateBgPerAyah !== false) && config.bgImageCategory !== 'none') {
    const bgIndex = (activeAyah.num - 1) % SCENERY_ROTATION_LIST.length;
    activeBgCategory = SCENERY_ROTATION_LIST[bgIndex];
    const nextIndex = activeAyah.num % SCENERY_ROTATION_LIST.length;
    getBackgroundImage(SCENERY_ROTATION_LIST[nextIndex]);
  }

  // 1. Background & Margins
  drawBackground(
    ctx,
    width,
    height,
    config.videoStyle,
    activeBgCategory,
    config.bgOverlayDarkness,
    animTime,
    config.animatedSceneryEffects !== false
  );

  const hasBgImg = activeBgCategory && activeBgCategory !== 'none';
  const isPortrait = config.aspectRatio === '9:16';
  const pad = Math.min(width, height) * (isPortrait ? 0.025 : 0.030);

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  // 2. Determine Screen Window of Ayat (Supports 10 Ayat per Mushaf Page, or user choice)
  const startNum = config.startAyah || 1;
  const endNum = config.endAyah || surah.numberOfAyahs || 10;
  let allSelectedAyahs: Ayah[] = [];

  if (surah.ayahs && surah.ayahs.length > 0) {
    allSelectedAyahs = surah.ayahs.filter((a) => a.num >= startNum && a.num <= endNum);
  }
  if (allSelectedAyahs.length === 0) {
    allSelectedAyahs = [activeAyah];
  }

  // Position of active reciting ayah in the selection
  const activeIdxInSelected = allSelectedAyahs.findIndex((a) => a.num === activeAyah.num);
  const safeActiveIdx = activeIdxInSelected >= 0 ? activeIdxInSelected : 0;

  // Default to 10 Ayat per screen (or user configured)
  const AYAT_PER_SCREEN = config.mushafAyatPerPage || 10;
  const screenIndex = Math.floor(safeActiveIdx / AYAT_PER_SCREEN);
  const screenStartIdx = screenIndex * AYAT_PER_SCREEN;
  const screenEndIdx = Math.min(screenStartIdx + AYAT_PER_SCREEN, allSelectedAyahs.length);
  const screenAyahs = allSelectedAyahs.slice(screenStartIdx, screenEndIdx);

  const totalScreens = Math.ceil(allSelectedAyahs.length / AYAT_PER_SCREEN);
  const currentScreenNum = screenIndex + 1;
  const screenFirstAyah = screenAyahs[0]?.num || activeAyah.num;
  const screenLastAyah = screenAyahs[screenAyahs.length - 1]?.num || activeAyah.num;

  // Layout Dimensions & Fonts
  const bannerH = Math.min(width, height) * (isPortrait ? 0.072 : 0.078);
  const bannerY = pad + (isPortrait ? 22 : 28);
  const bannerW = width - (pad + (isPortrait ? 16 : 24)) * 2;
  const bannerX = pad + (isPortrait ? 16 : 24);

  const ruleLeft = bannerX;
  const ruleRight = bannerX + bannerW;

  const innerMarginX = Math.round(isPortrait ? width * 0.015 : height * 0.018);
  const textRight = ruleRight - innerMarginX;
  const textLeft = ruleLeft + innerMarginX;
  const colW = Math.max(100, textRight - textLeft);

  const arabicFontFamily = config.arabicScript === 'indopak'
    ? "'Scheherazade New', 'Gulzar', 'Noto Naskh Arabic', serif"
    : "'Scheherazade New', 'Amiri Quran', 'Amiri', serif";

  // 3. Gather Tokens for the Ayat on Current Screen
  interface PageToken {
    text: string;
    ayahNum: number;
    wordIndex: number;
    isEndSymbol?: boolean;
  }

  const allTokens: PageToken[] = [];
  for (const a of screenAyahs) {
    const rawArabic = (config.arabicScript === 'indopak' && a.indopak) ? a.indopak : a.arabic;
    const cleanText = stripBismillahFromAyah1(rawArabic, surah.number, a.num);
    const words = cleanText.split(/\s+/).filter((w) => w.length > 0);

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      allTokens.push({
        text: words[wIdx],
        ayahNum: a.num,
        wordIndex: wIdx
      });
    }

    // Classical ornate bracketed verse end marker: ﴿١﴾, ﴿۲﴾, ﴿۳﴾
    const symbolText = `﴿${toArabicDigits(a.num)}﴾`;
    allTokens.push({
      text: symbolText,
      ayahNum: a.num,
      wordIndex: 9999,
      isEndSymbol: true
    });
  }

  // Show Surah header only when on the very first screen of the Surah (Ayah 1)
  const isOpeningScreen = screenFirstAyah === 1;
  const showHeaderOnScreen = isOpeningScreen && (showSurahHeader !== false);
  const showBismillah = showHeaderOnScreen && (surah.number !== 1 && surah.number !== 9);
  const bismillahH = showBismillah ? Math.round(bannerH * 0.68) : 0;
  const bismillahY = bannerY + bannerH;

  // Space allocation: Reserve room for bottom Subtitle Card (matches reference video)
  const cardMarginX = isPortrait ? width * 0.04 : width * 0.06;
  const cardW = width - cardMarginX * 2;
  const cardH = Math.round(isPortrait ? height * 0.17 : height * 0.145);
  const cardX = cardMarginX;
  const cardY = height - cardH - (isPortrait ? 12 : 14);

  const pageTopY = showHeaderOnScreen
    ? (bannerY + bannerH + bismillahH + (isPortrait ? 10 : 14))
    : (pad + (isPortrait ? 16 : 22));

  const contentBottomY = cardY - (isPortrait ? 10 : 14);

  // 4. Dynamic Font Sizing to Maximize Page Space
  const wrapTokensIntoLines = (fontSize: number): PageToken[][] => {
    ctx.font = `bold 700 ${fontSize}px ${arabicFontFamily}`;
    const spaceW = Math.max(ctx.measureText(' ').width * 0.98, fontSize * 0.14);
    const innerM = Math.round(fontSize * 0.05);
    const colWInner = Math.max(100, (ruleRight - innerM) - (ruleLeft + innerM));

    const lines: PageToken[][] = [];
    let curLine: PageToken[] = [];
    let curW = 0;

    for (const token of allTokens) {
      const extraPad = token.isEndSymbol ? (fontSize * 0.22) : 0;
      const tW = ctx.measureText(token.text).width + extraPad;
      const testW = curW === 0 ? tW : curW + spaceW + tW;
      if (testW > colWInner && curLine.length > 0) {
        lines.push(curLine);
        curLine = [token];
        curW = tW;
      } else {
        curLine.push(token);
        curW = testW;
      }
    }
    if (curLine.length > 0) lines.push(curLine);
    return lines;
  };

  const fitsInPage = (fontSize: number) => {
    ctx.font = `bold 700 ${fontSize}px ${arabicFontFamily}`;
    const innerM = Math.round(fontSize * 0.05);
    const colWInner = Math.max(100, (ruleRight - innerM) - (ruleLeft + innerM));

    for (const token of allTokens) {
      const extraPad = token.isEndSymbol ? (fontSize * 0.22) : 0;
      const tW = ctx.measureText(token.text).width + extraPad;
      if (tW > colWInner) {
        return { fits: false, lines: [] as PageToken[][], lineSpacing: 0, contentTopY: 0, availableH: 0, totalH: 0 };
      }
    }

    const lines = wrapTokensIntoLines(fontSize);
    const lineSpacing = Math.round(fontSize * (isPortrait ? 1.76 : 1.70));
    const contentTopY = pageTopY;
    const availableH = Math.max(120, contentBottomY - contentTopY);
    const totalH = lines.length * lineSpacing;

    return {
      fits: totalH <= availableH,
      lines,
      lineSpacing,
      contentTopY,
      availableH,
      totalH
    };
  };

  const textScale = getTextScaleFactor(config.textSize);
  let low = 16;
  // Controlled cap so Quran calligraphy never appears congested or bloated
  const maxCap = isPortrait
    ? Math.round(width * 0.050 * textScale)
    : Math.round(height * 0.054 * textScale);
  let high = Math.max(20, Math.min(maxCap, isPortrait ? 50 : 42));
  let bestSize = 16;
  let bestLines = wrapTokensIntoLines(16);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const res = fitsInPage(mid);
    if (res.fits) {
      bestSize = mid;
      bestLines = res.lines;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const arabicFontSize = bestSize;
  const linesOfTokens = bestLines;

  // 5. Outer Gold Border Frame with Floral Corner Engravings
  const frameX = pad;
  const frameY = pad;
  const frameW = width - pad * 2;
  const frameH = height - pad * 2;

  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.lineWidth = 2.0;
  ctx.strokeRect(frameX, frameY, frameW, frameH);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.40)';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(frameX + 4, frameY + 4, frameW - 8, frameH - 8);

  const cornerSize = Math.round(Math.min(width, height) * (isPortrait ? 0.055 : 0.045));
  drawFloralCornerEngraving(ctx, frameX + 6, frameY + 6, cornerSize, cornerSize, false, false, '#d4af37');
  drawFloralCornerEngraving(ctx, frameX + frameW - 6 - cornerSize, frameY + 6, cornerSize, cornerSize, true, false, '#d4af37');
  drawFloralCornerEngraving(ctx, frameX + 6, frameY + frameH - 6 - cornerSize, cornerSize, cornerSize, false, true, '#d4af37');
  drawFloralCornerEngraving(ctx, frameX + frameW - 6 - cornerSize, frameY + frameH - 6 - cornerSize, cornerSize, cornerSize, true, true, '#d4af37');
  ctx.restore();

  // 6. Top Surah Unwan Cartouche Banner (Only on Opening Screen)
  if (showHeaderOnScreen) {
    const beadY = bannerY - (isPortrait ? 13 : 16);
    const beadR = isPortrait ? 4.5 : 5.5;
    const beadSpacing = isPortrait ? 13 : 15;

    ctx.save();
    drawBeadChain(ctx, ruleLeft, beadY, ruleRight, beadY, beadR, beadSpacing);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ruleLeft, beadY - (beadR + 3));
    ctx.lineTo(ruleRight, beadY - (beadR + 3));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ruleLeft, beadY + (beadR + 3));
    ctx.lineTo(ruleRight, beadY + (beadR + 3));
    ctx.stroke();
    ctx.restore();

    const revText = surah.revelationType === 'Medinan' ? 'مَدَنِيَّةٌ' : 'مَكِّيَّةٌ';
    const rukuCount = getRukuCount(surah.number);

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    ctx.lineWidth = 1.0;
    ctx.strokeRect(bannerX + 3, bannerY + 3, bannerW - 6, bannerH - 6);

    const sideW = Math.round(bannerW * 0.22);
    const centerW = bannerW - (sideW * 2);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bannerX + sideW, bannerY);
    ctx.lineTo(bannerX + sideW, bannerY + bannerH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bannerX + bannerW - sideW, bannerY);
    ctx.lineTo(bannerX + bannerW - sideW, bannerY + bannerH);
    ctx.stroke();

    const rightPanelX = bannerX + bannerW - sideW;
    const bannerCornerW = Math.round(sideW * 0.24);
    const bannerCornerH = Math.round(bannerH * 0.36);

    drawFloralCornerEngraving(ctx, rightPanelX + 4, bannerY + 4, bannerCornerW, bannerCornerH, false, false, '#d4af37');
    drawFloralCornerEngraving(ctx, bannerX + bannerW - 4 - bannerCornerW, bannerY + 4, bannerCornerW, bannerCornerH, true, false, '#d4af37');
    drawFloralCornerEngraving(ctx, rightPanelX + 4, bannerY + bannerH - 4 - bannerCornerH, bannerCornerW, bannerCornerH, false, true, '#d4af37');
    drawFloralCornerEngraving(ctx, bannerX + bannerW - 4 - bannerCornerW, bannerY + bannerH - 4 - bannerCornerH, bannerCornerW, bannerCornerH, true, true, '#d4af37');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 700 ${Math.round(bannerH * 0.38)}px ${arabicFontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`آيَاتُهَا ${toArabicDigits(surah.numberOfAyahs)}`, rightPanelX + sideW / 2, bannerY + bannerH / 2);

    const centerX = bannerX + sideW;
    const centerMidX = centerX + centerW / 2;
    const pageBadge = totalScreens > 1 ? ` (${toArabicDigits(currentScreenNum)})` : '';
    const centerTitle = `(${toArabicDigits(surah.number)}) سُوْرَةُ ${surah.name} ${revText}${pageBadge}`;
    ctx.font = `bold 700 ${Math.round(bannerH * 0.46)}px ${arabicFontFamily}`;
    ctx.fillStyle = '#fde047';
    ctx.fillText(centerTitle, centerMidX, bannerY + bannerH / 2);

    const leftPanelX = bannerX;
    drawFloralCornerEngraving(ctx, leftPanelX + 4, bannerY + 4, bannerCornerW, bannerCornerH, false, false, '#d4af37');
    drawFloralCornerEngraving(ctx, leftPanelX + sideW - 4 - bannerCornerW, bannerY + 4, bannerCornerW, bannerCornerH, true, false, '#d4af37');
    drawFloralCornerEngraving(ctx, leftPanelX + 4, bannerY + bannerH - 4 - bannerCornerH, bannerCornerW, bannerCornerH, false, true, '#d4af37');
    drawFloralCornerEngraving(ctx, leftPanelX + sideW - 4 - bannerCornerW, bannerY + bannerH - 4 - bannerCornerH, bannerCornerW, bannerCornerH, true, true, '#d4af37');

    ctx.font = `bold 700 ${Math.round(bannerH * 0.38)}px ${arabicFontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`رُكُوعَاتُهَا ${toArabicDigits(rukuCount)}`, leftPanelX + sideW / 2, bannerY + bannerH / 2);
    ctx.restore();

    if (showBismillah) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(bannerX, bismillahY, bannerW, bismillahH);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bannerX, bismillahY + bismillahH);
      ctx.lineTo(bannerX + bannerW, bismillahY + bismillahH);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 700 ${Math.round(bismillahH * 0.56)}px ${arabicFontFamily}`;
      ctx.fillStyle = '#fde047';
      ctx.fillText('بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ ۝', bannerX + bannerW / 2, bismillahY + bismillahH / 2);
      ctx.restore();
    }
  }

  // 7. Authentic Mushaf Satr Lines & Vertical Jadwal Frame
  const lineSpacing = Math.round(arabicFontSize * (isPortrait ? 1.76 : 1.70));
  const availableH = Math.max(120, contentBottomY - pageTopY);
  const totalTextHeight = linesOfTokens.length * lineSpacing;
  const gridTopY = pageTopY + Math.max(0, Math.round((availableH - totalTextHeight) * 0.50));
  const gridBottomY = gridTopY + totalTextHeight;

  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)';
  ctx.lineWidth = 1.8;

  // Left & Right Vertical Border Lines
  ctx.beginPath();
  ctx.moveTo(ruleLeft, gridTopY);
  ctx.lineTo(ruleLeft, gridBottomY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ruleRight, gridTopY);
  ctx.lineTo(ruleRight, gridBottomY);
  ctx.stroke();

  // Ruled horizontal lines separating each satr (line of Quran)
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.lineWidth = 1.2;
  for (let lIdx = 0; lIdx < linesOfTokens.length; lIdx++) {
    const satrY = gridTopY + (lIdx + 1) * lineSpacing;
    ctx.beginPath();
    ctx.moveTo(ruleLeft, satrY);
    ctx.lineTo(ruleRight, satrY);
    ctx.stroke();
  }
  ctx.restore();

  // 8. Calculate Active Spoken Word Index for Voice Synchronization
  const activeAyahWords = (stripBismillahFromAyah1(
    (config.arabicScript === 'indopak' && activeAyah.indopak) ? activeAyah.indopak : activeAyah.arabic,
    surah.number,
    activeAyah.num
  )).split(/\s+/).filter((w) => w.length > 0);

  const activeWordIndex = (config.highlightRecitedWords !== false && audioProgress >= 0)
    ? Math.min(activeAyahWords.length - 1, Math.floor(audioProgress * activeAyahWords.length))
    : -1;

  // 9. Draw Continuous Lines of the Ayat in Pure White with Gold Active Badges
  ctx.textBaseline = 'alphabetic';
  const defaultInkColor = '#ffffff';
  const textColW = textRight - textLeft;

  for (let lIdx = 0; lIdx < linesOfTokens.length; lIdx++) {
    const line = linesOfTokens[lIdx];
    const isLastLine = lIdx === linesOfTokens.length - 1;

    const rowTopY = gridTopY + (lIdx * lineSpacing);
    const rowBottomY = rowTopY + lineSpacing;
    const baselineY = rowTopY + Math.round(lineSpacing * 0.70);

    ctx.font = `bold 700 ${arabicFontSize}px ${arabicFontFamily}`;
    let totalWordsW = 0;
    const tokenWidths: number[] = [];
    for (let k = 0; k < line.length; k++) {
      const extraPad = line[k].isEndSymbol ? (arabicFontSize * 0.22) : 0;
      const w = ctx.measureText(line[k].text).width + extraPad;
      tokenWidths.push(w);
      totalWordsW += w;
    }

    const numGaps = line.length - 1;
    const defaultSpaceW = Math.max(ctx.measureText(' ').width * 0.98, arabicFontSize * 0.14);
    const naturalLineW = totalWordsW + numGaps * defaultSpaceW;

    const shouldJustify = numGaps > 0 && (!isLastLine || naturalLineW >= textColW * 0.70);
    const wordGap = shouldJustify ? ((textColW - totalWordsW) / numGaps) : defaultSpaceW;
    let currentX = shouldJustify ? textRight : (width / 2) + (naturalLineW / 2);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    for (let k = 0; k < line.length; k++) {
      const token = line[k];
      const wordW = tokenWidths[k];
      const isActiveVerse = token.ayahNum === activeAyah.num;
      const isActiveWord = isActiveVerse && activeWordIndex >= 0 && token.wordIndex === activeWordIndex;

      // Solid Amber/Gold Badge behind active spoken word
      if (isActiveWord && !token.isEndSymbol) {
        ctx.save();
        const pillPadX = Math.round(arabicFontSize * 0.14);
        const pillTop = rowTopY + Math.round(lineSpacing * 0.08);
        const pillBottom = rowBottomY - Math.round(lineSpacing * 0.08);
        const pillH = pillBottom - pillTop;
        const pillY = pillTop;
        const pillX = currentX - wordW - pillPadX;
        const pillW = wordW + pillPadX * 2;
        const pillR = Math.min(6, Math.round(pillH * 0.18));

        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.85)';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(pillX, pillY, pillW, pillH, pillR);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }
        ctx.fill();
        ctx.restore();
      }

      ctx.save();

      if (token.isEndSymbol) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = `bold 700 ${Math.round(arabicFontSize * 0.95)}px ${arabicFontFamily}`;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
        ctx.shadowBlur = 8;
      } else if (isActiveWord) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold 700 ${arabicFontSize}px ${arabicFontFamily}`;
      } else if (isActiveVerse) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 700 ${arabicFontSize}px ${arabicFontFamily}`;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = defaultInkColor;
        ctx.font = `bold 700 ${arabicFontSize}px ${arabicFontFamily}`;
      }

      ctx.fillText(token.text, currentX, baselineY);
      ctx.restore();

      currentX -= (wordW + wordGap);
    }
  }
  ctx.direction = 'inherit';

  // 10. Floating Subtitle Card at Bottom (Matches Reference Video)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(cardX, cardY, cardW, cardH, 14);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  // Top Red Pill Badge: AYAH X • RECITATION SYNC
  const badgeW = isPortrait ? 165 : 195;
  const badgeH = isPortrait ? 18 : 21;
  const badgeX = cardX + (cardW - badgeW) / 2;
  const badgeY = cardY + (isPortrait ? 6 : 7);

  ctx.fillStyle = 'rgba(185, 28, 28, 0.92)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 700 ${isPortrait ? 9 : 11}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`AYAH ${activeAyah.num} • RECITATION SYNC`, badgeX + badgeW / 2, badgeY + badgeH / 2);

  // Dual Translations
  const dual = getDualTranslationTexts(activeAyah, config.translationLang || 'hi-en');
  const primaryText = activeAyah.hindi || dual.primaryText || activeAyah.urdu || activeAyah.english || '';
  const secondaryText = (activeAyah.hindi && activeAyah.english) ? activeAyah.english : (dual.secondaryText || '');

  let transCurrentY = badgeY + badgeH + (isPortrait ? 8 : 10);
  const maxTransW = cardW - 32;

  if (primaryText) {
    ctx.font = `600 ${isPortrait ? 13 : 15}px 'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let displayPrimary = primaryText;
    if (ctx.measureText(displayPrimary).width > maxTransW) {
      const words = displayPrimary.split(' ');
      let buf = '';
      for (const w of words) {
        if (ctx.measureText(buf + ' ' + w + '...').width > maxTransW) break;
        buf = buf ? `${buf} ${w}` : w;
      }
      displayPrimary = buf + '...';
    }
    ctx.fillText(displayPrimary, cardX + cardW / 2, transCurrentY);
    transCurrentY += (isPortrait ? 22 : 25);
  }

  if (secondaryText) {
    ctx.font = `500 ${isPortrait ? 11 : 13}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let displaySecondary = secondaryText;
    if (ctx.measureText(displaySecondary).width > maxTransW) {
      const words = displaySecondary.split(' ');
      let buf = '';
      for (const w of words) {
        if (ctx.measureText(buf + ' ' + w + '...').width > maxTransW) break;
        buf = buf ? `${buf} ${w}` : w;
      }
      displaySecondary = buf + '...';
    }
    ctx.fillText(displaySecondary, cardX + cardW / 2, transCurrentY);
  }

  // Footer Line
  const pageNum = getMadaniMushafPage(surah.number, activeAyah.num);
  const surahNameDisplay = (surah.englishName || surah.name).toUpperCase().replace(/AL-/g, '').trim();
  const metaText = `MADANI MUSHAF • SURAH ${surahNameDisplay} • AYAT ${activeAyah.num} • PAGE ${pageNum}`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `bold 600 ${isPortrait ? 9 : 10}px 'Playfair Display', 'Plus Jakarta Sans', serif`;
  ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.fillText(metaText, cardX + cardW / 2, cardY + cardH - (isPortrait ? 5 : 6));

  ctx.restore();

  ctx.restore();
}
