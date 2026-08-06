import { Ayah, Surah, VideoConfig } from '../types';
import { stripBismillahFromAyah1 } from './audioUtils';
import { getAyahTranslationText, getDualTranslationTexts } from './translationUtils';

export function toArabicDigits(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => digits[parseInt(w, 10)]);
}

// Curated royalty-free Islamic & pure natural scenery background image URLs (Strictly NO humans, NO animals)
const BG_IMAGE_URLS: Record<string, string> = {
  'holy-kaaba': 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1200&auto=format&fit=crop',
  'madinah-prophet-mosque': 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1200&auto=format&fit=crop',
  'madinah-mosque-dusk': 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1200&auto=format&fit=crop',
  'noble-quran': 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop',
  'quran-tazkeer-bookmark': 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?q=80&w=1200&auto=format&fit=crop',
  'ramadan-lantern': 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?q=80&w=1200&auto=format&fit=crop',
  'grand-mosque': 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=1200&auto=format&fit=crop',
  'blue-mosque-istanbul': 'https://images.unsplash.com/photo-1574246604907-db69e30ddb97?q=80&w=1200&auto=format&fit=crop',
  'sheikh-zayed-mosque': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=80&w=1200&auto=format&fit=crop',
  'mosque-arches': 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1200&auto=format&fit=crop',
  'mosque-interior': 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?q=80&w=1200&auto=format&fit=crop',
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
  'holy-kaaba',
  'madinah-prophet-mosque',
  'madinah-mosque-dusk',
  'noble-quran',
  'quran-tazkeer-bookmark',
  'ramadan-lantern',
  'grand-mosque',
  'blue-mosque-istanbul',
  'sheikh-zayed-mosque',
  'mosque-arches',
  'mosque-interior',
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
  img.src = url;
  imageCacheMap.set(category, img);
  return null;
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
  const bgImg = bgImageCategory ? getBackgroundImage(bgImageCategory) : null;

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
      const pCount = 35;
      const sec = animTime / 1000;
      for (let i = 0; i < pCount; i++) {
        const seedX = (i * 137.5) % width;
        const speed = 12 + (i % 6) * 6; // px per second drift
        const floatY = (height + 40) - ((sec * speed + i * 50) % (height + 80));
        const floatX = (seedX + Math.sin(sec * 0.8 + i) * 25) % width;
        const px = floatX < 0 ? floatX + width : floatX;
        const radius = 1.2 + (i % 4) * 0.7;
        const alpha = 0.25 + 0.45 * Math.sin(sec * 1.5 + i);

        ctx.beginPath();
        ctx.arc(px, floatY, radius, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? `rgba(254, 240, 138, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
        ctx.shadowBlur = 8;
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
    // Parchment / Ivory paper
    const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.85);
    if (style === 'quran-page') {
      grad.addColorStop(0, '#fdfcf7');
      grad.addColorStop(0.75, '#f7f1e1');
      grad.addColorStop(1, '#e5d7b5');
    } else {
      grad.addColorStop(0, '#fcfbf6');
      grad.addColorStop(1, '#eee6d3');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const pad = Math.min(width, height) * 0.035;

    if (style === 'quran-page') {
      // Outer Deep Emerald Frame
      ctx.strokeStyle = '#0a3d2e';
      ctx.lineWidth = 5;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

      // Middle Gold Filigree Line
      ctx.strokeStyle = '#c59b27';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(pad + 6, pad + 6, width - (pad + 6) * 2, height - (pad + 6) * 2);

      // Inner Dark Line
      ctx.strokeStyle = '#523f1c';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(pad + 12, pad + 12, width - (pad + 12) * 2, height - (pad + 12) * 2);

      // Corner Islamic 8-Pointed Star / Rosette Motifs
      const cornerR = Math.min(width, height) * 0.032;
      const corners = [
        [pad + 12, pad + 12],
        [width - (pad + 12), pad + 12],
        [pad + 12, height - (pad + 12)],
        [width - (pad + 12), height - (pad + 12)]
      ];

      for (const [cx, cy] of corners) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, cornerR, 0, Math.PI * 2);
        ctx.fillStyle = '#0a3d2e';
        ctx.fill();
        ctx.strokeStyle = '#c59b27';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, cornerR * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#f7f1e1';
        ctx.fill();
        ctx.strokeStyle = '#c59b27';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, cornerR * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#c59b27';
        ctx.fill();
        ctx.restore();
      }

      // Top Header Banner Box (Surah Unwan Cartouche Box)
      const bannerH = Math.min(width, height) * 0.065;
      const bannerW = width - (pad + 28) * 2;
      const bannerX = pad + 28;
      const bannerY = pad + 18;

      const bannerGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
      bannerGrad.addColorStop(0, '#0a3d2e');
      bannerGrad.addColorStop(0.5, '#135c46');
      bannerGrad.addColorStop(1, '#0a3d2e');
      ctx.fillStyle = bannerGrad;
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

      ctx.strokeStyle = '#c59b27';
      ctx.lineWidth = 2;
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

      // Inner Gold Accent Line inside banner
      ctx.strokeStyle = '#e6c875';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bannerX + 4, bannerY + 4, bannerW - 8, bannerH - 8);

      // Banner Side Gold Diamonds & Star Rosettes
      const drawDiamond = (dx: number, dy: number, s: number) => {
        ctx.beginPath();
        ctx.moveTo(dx, dy - s);
        ctx.lineTo(dx + s, dy);
        ctx.lineTo(dx, dy + s);
        ctx.lineTo(dx - s, dy);
        ctx.closePath();
        ctx.fillStyle = '#f7d774';
        ctx.fill();
        ctx.strokeStyle = '#0a3d2e';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };
      drawDiamond(bannerX + 16, bannerY + bannerH / 2, 6);
      drawDiamond(bannerX + 32, bannerY + bannerH / 2, 4);
      drawDiamond(bannerX + bannerW - 16, bannerY + bannerH / 2, 6);
      drawDiamond(bannerX + bannerW - 32, bannerY + bannerH / 2, 4);

      // Authentic Side Margin Medallion Badge (Juz / Hizb Rosette)
      const medallionX = width - pad - 6;
      const medallionY = pad + bannerH + 45;
      const medR = Math.min(width, height) * 0.040;

      ctx.save();
      // Outer Gold Star Spikes
      ctx.beginPath();
      const numSpikes = 12;
      for (let i = 0; i < numSpikes; i++) {
        const angle = (i * Math.PI * 2) / numSpikes;
        const outer = medR + 5;
        const inner = medR;
        const ox = medallionX + Math.cos(angle) * outer;
        const oy = medallionY + Math.sin(angle) * outer;
        const ix = medallionX + Math.cos(angle + Math.PI / numSpikes) * inner;
        const iy = medallionY + Math.sin(angle + Math.PI / numSpikes) * inner;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fillStyle = '#c59b27';
      ctx.fill();

      // Inner Emerald Rosette Circle
      ctx.beginPath();
      ctx.arc(medallionX, medallionY, medR, 0, Math.PI * 2);
      ctx.fillStyle = '#0a3d2e';
      ctx.fill();
      ctx.strokeStyle = '#f7d774';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text inside Juz Medallion
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.round(medR * 0.55)}px 'Amiri Quran', 'Amiri', serif`;
      ctx.fillStyle = '#f7d774';
      ctx.fillText('جُزْءُ ١', medallionX, medallionY - 1);
      ctx.restore();

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

  const hasBgImg = config.bgImageCategory && config.bgImageCategory !== 'none';
  const isLight = !hasBgImg && (config.videoStyle === 'classic-mushaf' || config.videoStyle === 'parchment-mushaf' || config.videoStyle === 'quran-page');
  const goldColor = config.videoStyle === 'quran-page' && !hasBgImg ? '#0a3d2e' : '#d4af37';
  const textColor = hasBgImg ? '#fdfcf7' : config.videoStyle === 'quran-page' ? '#120d08' : isLight ? '#2b2418' : '#f5f0dc';
  const subColor = hasBgImg ? '#e2e8f0' : config.videoStyle === 'quran-page' ? '#4a3a22' : isLight ? '#66522c' : '#a0aec0';

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  const isPortrait = config.aspectRatio === '9:16';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Decorative emblem / Surah Arabic Name
  const centerY = isPortrait ? height * 0.40 : height * 0.38;
  const arabicTitleFontSize = isPortrait ? Math.round(width * 0.12) : Math.round(height * 0.14);
  ctx.font = `600 ${arabicTitleFontSize}px 'Amiri', 'Amiri Quran', serif`;
  ctx.fillStyle = goldColor;
  ctx.fillText(surah.name, width / 2, centerY);

  // Subtitle / English Name
  const subY = isPortrait ? height * 0.52 : height * 0.54;
  const englishTitleFontSize = isPortrait ? Math.round(width * 0.062) : Math.round(height * 0.056);
  ctx.font = `600 ${englishTitleFontSize}px 'Playfair Display', Georgia, serif`;
  ctx.fillStyle = textColor;
  ctx.fillText(`Surah ${surah.englishName}`, width / 2, subY);

  const metaFontSize = isPortrait ? Math.round(width * 0.038) : Math.round(height * 0.036);
  ctx.font = `500 ${metaFontSize}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = subColor;
  ctx.fillText(`"${surah.englishNameTranslation}" • ${surah.numberOfAyahs} Verses • ${surah.revelationType}`, width / 2, subY + height * 0.055);

  // Gold accent rule
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 2.5;
  const lineW = width * (isPortrait ? 0.50 : 0.35);
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

  const hasBgImg = config.bgImageCategory && config.bgImageCategory !== 'none';
  const isLight = !hasBgImg && (config.videoStyle === 'classic-mushaf' || config.videoStyle === 'parchment-mushaf' || config.videoStyle === 'quran-page');
  const textColor = hasBgImg ? '#fdfcf7' : config.videoStyle === 'quran-page' ? '#120d08' : isLight ? '#2b2418' : '#f5f0dc';

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  const isPortrait = config.aspectRatio === '9:16';
  const bismillahFontSize = isPortrait ? Math.round(width * 0.078) : Math.round(height * 0.105);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${bismillahFontSize}px 'Amiri Quran', 'Amiri', serif`;
  ctx.fillStyle = textColor;
  ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', width / 2, height / 2);

  ctx.restore();
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
  audioProgress: number = -1 // -1 = static, 0.0 to 1.0 = active audio playback progress
) {
  if (config.videoStyle === 'quran-page') {
    return drawQuranBookPageFrame(ctx, width, height, surah, ayah, config, animProgress, animTime, audioProgress);
  }

  let activeBgCategory = config.bgImageCategory;
  if ((config.rotateBgPerAyah !== false) && config.bgImageCategory !== 'none') {
    const bgIndex = (ayah.num - 1) % SCENERY_ROTATION_LIST.length;
    activeBgCategory = SCENERY_ROTATION_LIST[bgIndex];
    // Preload next background image
    const nextIndex = ayah.num % SCENERY_ROTATION_LIST.length;
    getBackgroundImage(SCENERY_ROTATION_LIST[nextIndex]);
  }

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

  const isPortrait = config.aspectRatio === '9:16';
  const hasBgImg = activeBgCategory && activeBgCategory !== 'none';
  const isLight = !hasBgImg && (config.videoStyle === 'classic-mushaf' || config.videoStyle === 'parchment-mushaf' || config.videoStyle === 'quran-page');
  const textColor = hasBgImg ? '#ffffff' : config.videoStyle === 'quran-page' ? '#120d08' : isLight ? '#1a140c' : '#f8f6f0';
  const transColor = hasBgImg ? '#f1f5f9' : config.videoStyle === 'quran-page' ? '#3d2e1e' : isLight ? '#4a3d28' : '#cbd5e1';
  const goldColor = config.videoStyle === 'quran-page' && !hasBgImg ? '#b8860b' : '#d4af37';

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  const marginX = width * (isPortrait ? 0.08 : 0.07);
  const maxW = width - marginX * 2;

  // Header Pill
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (config.videoStyle === 'quran-page' && !hasBgImg) {
    const pad = Math.min(width, height) * 0.035;
    const bannerH = Math.min(width, height) * 0.065;
    const bannerY = pad + 18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(isPortrait ? width * 0.045 : height * 0.046)}px 'Amiri Quran', 'Amiri', serif`;
    ctx.fillStyle = '#f7d774';
    ctx.fillText(`سُورَةُ ${surah.name} • ${surah.englishName}`, width / 2, bannerY + bannerH / 2);
  } else {
    ctx.font = `600 ${Math.round(isPortrait ? width * 0.042 : height * 0.046)}px 'Amiri', 'Amiri Quran', serif`;
    ctx.fillStyle = goldColor;
    ctx.fillText(`${surah.name} • ${surah.englishName}`, width / 2, height * 0.05);
  }

  // Arabic Text (Proportional sizing for 9:16 & auto-scaling for long verses)
  const rawArabic = (config.arabicScript === 'indopak' && ayah.indopak) ? ayah.indopak : ayah.arabic;
  const arabicText = stripBismillahFromAyah1(rawArabic, surah.number, ayah.num);
  const rawWords = arabicText.split(' ').filter((w) => w.trim().length > 0);

  // Dynamic font scaling based on word count & aspect ratio
  let baseArabicSize = isPortrait ? Math.round(width * 0.072) : Math.round(height * 0.088);
  if (rawWords.length > 35 || arabicText.length > 160) {
    baseArabicSize = Math.round(baseArabicSize * 0.72);
  } else if (rawWords.length > 22 || arabicText.length > 100) {
    baseArabicSize = Math.round(baseArabicSize * 0.85);
  }

  const arabicFontSize = Math.max(28, baseArabicSize);
  ctx.font = `600 ${arabicFontSize}px 'Amiri Quran', 'Amiri', 'Scheherazade New', serif`;

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

  const lineSpacing = arabicFontSize * (isPortrait ? 1.82 : 1.75);
  const numArabicLines = linesOfWords.length;
  const totalArabicHeight = numArabicLines > 0 ? ((numArabicLines - 1) * lineSpacing + arabicFontSize) : 0;

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

  const interBlockGap = isPortrait ? Math.round(width * 0.045) : 24; // Generous gap between Hindi & English

  if (config.translationLang !== 'none') {
    const dual = getDualTranslationTexts(ayah, config.translationLang);

    const buildTranslationBlock = (
      text: string,
      fontFamily: string,
      initialFontSize: number,
      fillStyle: string,
      maxAllowedLines = 8
    ): TranslationBlock | null => {
      if (!text) return null;
      let fontSize = initialFontSize;
      ctx.font = `600 ${fontSize}px ${fontFamily}`;

      const tWords = text.split(' ');
      let tLines: string[] = [];
      let tCurLine = '';

      for (const tw of tWords) {
        const test = tCurLine ? `${tCurLine} ${tw}` : tw;
        if (ctx.measureText(test).width > maxW * 0.92 && tCurLine) {
          tLines.push(tCurLine);
          tCurLine = tw;
        } else {
          tCurLine = test;
        }
      }
      if (tCurLine) tLines.push(tCurLine);

      // Auto-shrink font if lines wrap too much
      if (tLines.length > (isPortrait ? 3 : 4) && fontSize > 16) {
        fontSize = Math.round(fontSize * 0.82);
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        tLines = [];
        tCurLine = '';
        for (const tw of tWords) {
          const test = tCurLine ? `${tCurLine} ${tw}` : tw;
          if (ctx.measureText(test).width > maxW * 0.92 && tCurLine) {
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
      const spacing = fontSize * (isHindi ? 1.58 : isPortrait ? 1.52 : 1.45);
      const blockHeight = finalLines.length > 0 ? ((finalLines.length - 1) * spacing + fontSize) : 0;

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
      const primaryFontSize = isPortrait ? Math.round(width * 0.046) : Math.round(height * 0.048);
      const secondaryFontSize = isPortrait ? Math.round(width * 0.038) : Math.round(height * 0.040);

      const b1 = buildTranslationBlock(
        dual.primaryText,
        dual.primaryFont || "'Noto Sans Devanagari', sans-serif",
        primaryFontSize,
        transColor,
        5
      );
      const b2 = buildTranslationBlock(
        dual.secondaryText,
        dual.secondaryFont || "'Plus Jakarta Sans', sans-serif",
        secondaryFontSize,
        'rgba(212, 175, 55, 0.95)',
        5
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
      let transFontSize = isPortrait ? Math.round(width * 0.048) : Math.round(height * 0.054);
      if (dual.primaryText.length > 140) {
        transFontSize = Math.round(transFontSize * 0.85);
      }

      const fontFamily = config.translationLang === 'ur'
        ? "'Noto Naskh Arabic', 'Amiri', serif"
        : config.translationLang === 'hi'
        ? "'Noto Sans Devanagari', sans-serif"
        : "'Plus Jakarta Sans', sans-serif";

      const b1 = buildTranslationBlock(dual.primaryText, fontFamily, transFontSize, transColor, 8);
      if (b1) {
        translationBlocks.push(b1);
        totalTranslationHeight += b1.blockHeight;
      }
    }
  }

  // 3. Calculate Perfect Center Starting Y & Symmetrical Separator Gaps
  const separatorMargin = isPortrait ? Math.round(width * 0.052) : 28; // Symmetrical gap above and below separator line
  const separatorTotalGap = translationBlocks.length > 0 ? (separatorMargin * 2) : 0;
  const totalBlockHeight = totalArabicHeight + separatorTotalGap + totalTranslationHeight;

  const targetCenterY = height * 0.48; // Center between top header and bottom footer
  let blockStartY = targetCenterY - (totalBlockHeight / 2);

  // Safe minimum top margin so it doesn't overlap header
  const minY = isPortrait ? height * 0.11 : height * 0.09;
  if (blockStartY < minY) {
    blockStartY = minY;
  }

  // 4. Draw Arabic lines
  const spaceW = ctx.measureText(' ').width * 1.25;
  let currentArabicY = blockStartY;

  ctx.textBaseline = 'top';

  for (let lIdx = 0; lIdx < linesOfWords.length; lIdx++) {
    const lineWords = linesOfWords[lIdx];
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

      if (token.globalIndex === 9999) {
        ctx.fillStyle = goldColor;
      } else if (isCurrentActive) {
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
        ctx.shadowBlur = 20;
      } else if (isPastRecited) {
        ctx.fillStyle = '#f59e0b';
      } else {
        ctx.fillStyle = textColor;
      }

      ctx.fillText(token.text, currentX, currentArabicY);
      ctx.restore();

      currentX -= (wordW + spaceW);
    }

    if (lIdx < linesOfWords.length - 1) {
      currentArabicY += lineSpacing;
    }
  }
  ctx.direction = 'inherit';

  const lastArabicBottom = currentArabicY + arabicFontSize;

  // 5. Draw Gold Separator & Translation Blocks with Distinct Symmetrical Spacing
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
    const bottomLimit = height - (isPortrait ? height * 0.07 : height * 0.05);

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

      for (let tLineIdx = 0; tLineIdx < block.lines.length; tLineIdx++) {
        const tl = block.lines[tLineIdx];
        if (currentTransY + block.fontSize > bottomLimit) {
          break; // Avoid drawing over footer
        }
        ctx.fillText(tl, width / 2, currentTransY);
        if (tLineIdx < block.lines.length - 1) {
          currentTransY += block.spacing;
        }
      }
      currentTransY += block.fontSize;
    }
  }

  // Footer Reference
  ctx.textBaseline = 'bottom';
  ctx.font = `700 ${Math.round(isPortrait ? width * 0.035 : height * 0.032)}px 'Playfair Display', serif`;
  ctx.fillStyle = goldColor;
  ctx.fillText(`VERSE ${ayah.num} OF ${surah.numberOfAyahs}`, width / 2, height - height * 0.035);

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
  audioProgress: number = -1
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
  const pad = Math.min(width, height) * 0.035;

  applyTextAnimation(ctx, width, height, config.textAnimation, animProgress, animTime);

  // 2. Surah Cartouche Banner (Header)
  const bannerH = Math.min(width, height) * 0.065;
  const bannerY = pad + 18;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(isPortrait ? width * 0.036 : height * 0.038)}px 'Amiri Quran', 'Amiri', serif`;
  ctx.fillStyle = '#f7d774';
  ctx.fillText(`سُورَةُ ${surah.name} • ${surah.englishName}`, width / 2, bannerY + bannerH / 2);

  // 3. Determine Selected Range of Ayahs
  const startNum = config.startAyah || 1;
  const endNum = config.endAyah || surah.numberOfAyahs || 10;
  let rangeAyahs: Ayah[] = [];

  if (surah.ayahs && surah.ayahs.length > 0) {
    rangeAyahs = surah.ayahs.filter((a) => a.num >= startNum && a.num <= endNum);
  }
  if (rangeAyahs.length === 0) {
    rangeAyahs = [activeAyah];
  }

  // 4. Gather Tokens for Continuous Page Layout
  interface PageToken {
    text: string;
    ayahNum: number;
    wordIndex: number;
    isEndSymbol?: boolean;
  }

  const allTokens: PageToken[] = [];

  for (const a of rangeAyahs) {
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

    // Append verse end rosette marker: ۝١, ۝٢, etc.
    const symbolText = `۝${toArabicDigits(a.num)}`;
    allTokens.push({
      text: symbolText,
      ayahNum: a.num,
      wordIndex: 9999,
      isEndSymbol: true
    });
  }

  // 5. Calculate Font Sizing based on Total Word Count
  const maxW = width - pad * 2 - (isPortrait ? 50 : 90);
  const totalTokens = allTokens.length;

  let baseFontSize = isPortrait ? Math.round(width * 0.072) : Math.round(height * 0.078);
  if (totalTokens > 250) baseFontSize = Math.round(baseFontSize * 0.68);
  else if (totalTokens > 150) baseFontSize = Math.round(baseFontSize * 0.76);
  else if (totalTokens > 80) baseFontSize = Math.round(baseFontSize * 0.85);
  else if (totalTokens > 40) baseFontSize = Math.round(baseFontSize * 0.92);

  const arabicFontSize = Math.max(26, baseFontSize);
  ctx.font = `600 ${arabicFontSize}px 'Amiri Quran', 'Amiri', 'Scheherazade New', serif`;

  // 6. Wrap Tokens into Continuous RTL Lines with Generous Spacing
  const baseSpaceW = ctx.measureText(' ').width;
  const spaceW = Math.max(baseSpaceW * 1.6, arabicFontSize * 0.32);
  const linesOfTokens: PageToken[][] = [];
  let curLineTokens: PageToken[] = [];
  let curLineWidth = 0;

  for (const token of allTokens) {
    const extraPad = token.isEndSymbol ? (arabicFontSize * 0.35) : 0;
    const tokenW = ctx.measureText(token.text).width + extraPad;
    const testW = curLineWidth === 0 ? tokenW : curLineWidth + spaceW + tokenW;

    if (testW > maxW && curLineTokens.length > 0) {
      linesOfTokens.push(curLineTokens);
      curLineTokens = [token];
      curLineWidth = tokenW;
    } else {
      curLineTokens.push(token);
      curLineWidth = testW;
    }
  }
  if (curLineTokens.length > 0) {
    linesOfTokens.push(curLineTokens);
  }

  // 7. Calculate Active Word Index in Active Verse
  const activeAyahWords = (stripBismillahFromAyah1(
    (config.arabicScript === 'indopak' && activeAyah.indopak) ? activeAyah.indopak : activeAyah.arabic,
    surah.number,
    activeAyah.num
  )).split(/\s+/).filter((w) => w.length > 0);

  const activeWordIndex = (config.highlightRecitedWords !== false && audioProgress >= 0)
    ? Math.min(activeAyahWords.length - 1, Math.floor(audioProgress * activeAyahWords.length))
    : -1;

  // 8. Vertical Layout Positions with Generous Line Height for Diacritics
  const lineSpacing = arabicFontSize * (isPortrait ? 1.88 : 1.80);
  const showBismillah = (startNum === 1 && surah.number !== 1 && surah.number !== 9);
  const bismillahH = showBismillah ? (arabicFontSize * 1.5) : 0;

  const pageTopY = bannerY + bannerH + (isPortrait ? 28 : 20);
  let currentY = pageTopY;

  // Draw Bismillah Header if starting at Verse 1
  if (showBismillah) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${Math.round(arabicFontSize * 1.05)}px 'Amiri Quran', 'Amiri', serif`;
    ctx.fillStyle = hasBgImg ? '#fef08a' : '#0a3d2e';
    ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', width / 2, currentY);
    currentY += bismillahH + 10;
  }

  // 9. Draw Continuous Page Lines
  ctx.font = `600 ${arabicFontSize}px 'Amiri Quran', 'Amiri', 'Scheherazade New', serif`;
  ctx.textBaseline = 'top';

  const defaultInkColor = hasBgImg ? '#fdfbf7' : '#0e0a05';

  for (let lIdx = 0; lIdx < linesOfTokens.length; lIdx++) {
    const line = linesOfTokens[lIdx];
    let lineW = 0;
    for (let k = 0; k < line.length; k++) {
      const extraPad = line[k].isEndSymbol ? (arabicFontSize * 0.35) : 0;
      lineW += ctx.measureText(line[k].text).width + extraPad;
      if (k < line.length - 1) lineW += spaceW;
    }

    let currentX = (width / 2) + (lineW / 2); // Center justified RTL block
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    for (const token of line) {
      const extraPad = token.isEndSymbol ? (arabicFontSize * 0.35) : 0;
      const wordW = ctx.measureText(token.text).width + extraPad;
      const isActiveVerse = token.ayahNum === activeAyah.num;
      const isActiveWord = isActiveVerse && activeWordIndex >= 0 && token.wordIndex === activeWordIndex;

      ctx.save();

      if (token.isEndSymbol) {
        ctx.fillStyle = '#d97706'; // Vibrant Gold rosette symbol
        ctx.font = `700 ${Math.round(arabicFontSize * 0.95)}px 'Amiri Quran', 'Amiri', serif`;
      } else if (isActiveWord) {
        // Active Spoken Word Highlight Box & Glow
        ctx.fillStyle = '#ffea78';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
        ctx.shadowBlur = 22;
      } else if (isActiveVerse) {
        // Active Verse Highlight
        ctx.fillStyle = hasBgImg ? '#fef08a' : '#b45309'; // Warm Glowing Amber
      } else {
        // Preceding/Succeeding Verse Ink
        ctx.fillStyle = defaultInkColor;
      }

      ctx.fillText(token.text, currentX, currentY);
      ctx.restore();

      currentX -= (wordW + spaceW);
    }

    currentY += lineSpacing;
  }
  ctx.direction = 'inherit';

  // 10. Translation Card at Bottom for Currently Recited Verse
  if (config.translationLang !== 'none') {
    const transText = getAyahTranslationText(activeAyah, config.translationLang);
    if (transText) {
      const cardY = Math.max(currentY + 20, height - (isPortrait ? height * 0.20 : height * 0.24));
      const cardW = width - pad * 2 - (isPortrait ? 30 : 80);
      const cardX = (width - cardW) / 2;
      const cardH = isPortrait ? height * 0.13 : height * 0.16;

      ctx.save();
      // Translucent Box
      ctx.fillStyle = hasBgImg ? 'rgba(6, 24, 18, 0.90)' : 'rgba(247, 243, 233, 0.92)';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = '#c59b27';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Card Header Tag
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `800 ${Math.round(isPortrait ? width * 0.032 : height * 0.032)}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = '#d97706';
      ctx.fillText(`VERSE ${activeAyah.num} TRANSLATION`, width / 2, cardY + 10);

      // Translation Text
      let transFontSize = isPortrait ? Math.round(width * 0.046) : Math.round(height * 0.048);
      if (transText.length > 120) transFontSize = Math.round(transFontSize * 0.85);

      const fontFamily = config.translationLang === 'ur'
        ? "'Noto Naskh Arabic', 'Amiri', serif"
        : config.translationLang === 'hi'
        ? "'Noto Sans Devanagari', sans-serif"
        : "'Plus Jakarta Sans', sans-serif";

      ctx.font = `600 ${transFontSize}px ${fontFamily}`;
      ctx.fillStyle = hasBgImg ? '#ffffff' : '#1e140a';

      // Wrap translation text into 2-3 lines max inside card
      const tWords = transText.split(' ');
      let tLines: string[] = [];
      let tCur = '';
      for (const tw of tWords) {
        const test = tCur ? `${tCur} ${tw}` : tw;
        if (ctx.measureText(test).width > cardW * 0.90 && tCur) {
          tLines.push(tCur);
          tCur = tw;
        } else {
          tCur = test;
        }
      }
      if (tCur) tLines.push(tCur);

      const displayLines = tLines.slice(0, 2);
      let tY = cardY + (isPortrait ? 34 : 38);
      for (const tl of displayLines) {
        ctx.fillText(tl, width / 2, tY);
        tY += transFontSize * 1.40;
      }
      ctx.restore();
    }
  }

  // 11. Footer Reference
  ctx.textBaseline = 'bottom';
  ctx.font = `700 ${Math.round(isPortrait ? width * 0.034 : height * 0.032)}px 'Playfair Display', serif`;
  ctx.fillStyle = '#c59b27';
  ctx.fillText(`MADANI MUSHAF PAGE • SURAH ${surah.englishName.toUpperCase()} (${surah.number}) • VERSES ${startNum}–${endNum}`, width / 2, height - height * 0.022);

  ctx.restore();
}
