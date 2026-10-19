import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Film,
  Sparkles,
  BookOpen,
  Mic,
  Monitor,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Download,
  Share2,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Volume2,
  RotateCcw,
  Upload,
  Layers,
  HelpCircle,
  Eye,
  ShieldCheck
} from 'lucide-react';

interface IntroGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCreating?: () => void;
}

interface GuideStep {
  id: string;
  stepNum: string;
  title: string;
  subtitle: string;
  category: string;
  duration: number; // in seconds for simulation
  description: string;
  highlights: string[];
  mockUi: {
    badge: string;
    arabicText: string;
    translationText: string;
    visualStyle: string;
    aspect: '16:9' | '9:16';
    bgNote: string;
  };
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'surah',
    stepNum: '01',
    title: 'Select Surah & Ayah Range',
    subtitle: 'Pick any of the 114 Surahs and choose your specific verses',
    category: 'Quran Selection',
    duration: 6,
    description:
      'Search from Surah Al-Fatihah to An-Nas. Customize the start and end ayah range to create either a quick 1-verse Reel or an entire Surah recitation video.',
    highlights: [
      'Fast Arabic & English search for all 114 Surahs',
      'Flexible start & end ayah range selector',
      'Instant verse count & estimated recitation length'
    ],
    mockUi: {
      badge: 'Surah Al-Kahf (18:1-4) • 4 Ayat',
      arabicText: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِىٓ أَنزَلَ عَلَىٰ عَبْدِهِ ٱلْكِتَٰبَ',
      translationText: '[All] praise is due to Allah, who has sent down upon His Servant the Book...',
      visualStyle: 'modern-dark',
      aspect: '16:9',
      bgNote: '4K Makkah Kaaba Majestic Scenery'
    }
  },
  {
    id: 'voice',
    stepNum: '02',
    title: 'Qari Recitation or Your Own Voice',
    subtitle: 'Choose world-renowned reciters or record your own voice',
    category: 'Audio Recitation',
    duration: 7,
    description:
      'Select from legendary Qaris like Mishary Alafasy, Abdul Basit, or Sudais. You can also record or upload your own voice recitation with live audio visualizer!',
    highlights: [
      'Top world-renowned Qaris with gapless studio quality',
      '🎙️ "Own Voice" live studio recorder with teleprompter',
      'Upload pre-recorded MP3/WAV verse audio clips'
    ],
    mockUi: {
      badge: '🎙️ Mishary Rashid Alafasy • 120Hz Baritone Resonance',
      arabicText: 'وَلَمْ يَجْعَل لَّهُۥ عِوَجَا ۜ قَيِّمًا لِّيُنذِرَ بَأْسًا',
      translationText: 'And has not made therein any deviance. [He has made it] straight...',
      visualStyle: 'emerald-glow',
      aspect: '16:9',
      bgNote: 'Synced Arabic Audio Waveform'
    }
  },
  {
    id: 'translations',
    stepNum: '03',
    title: 'Multi-Language Spoken Translations',
    subtitle: 'Add synchronized audio & subtitles in 12+ world languages',
    category: 'Translation & Voice',
    duration: 6,
    description:
      'Pair Arabic recitation with translated spoken voiceovers in English, Urdu, Hindi, Bengali, Turkish, Indonesian, French, and more.',
    highlights: [
      'Dual recitation mode: Arabic first, followed by translation',
      'Simultaneous burned-in subtitles with word-by-word pacing',
      'Record your own translation voiceover per ayah'
    ],
    mockUi: {
      badge: '🗣️ Spoken Urdu & English Dual Translation',
      arabicText: 'قَيِّمًا لِّيُنذِرَ بَأْسًا شَدِيدًا مِّن لَّدُنْهُ',
      translationText: 'To warn of a severe punishment from Him and to bring good tidings...',
      visualStyle: 'gold-royal',
      aspect: '16:9',
      bgNote: 'English / Urdu Typography'
    }
  },
  {
    id: 'backgrounds',
    stepNum: '04',
    title: 'Custom Video & Multi-Photo Backgrounds',
    subtitle: 'Upload drone footage, scenic timelapses, or 4K sacred heritage',
    category: 'Visual Scenery',
    duration: 7,
    description:
      'Use 4K Makkah and Madinah sceneries, or upload your own background videos and photos. With "Rotate per Ayah", each verse automatically switches to the next video or photo!',
    highlights: [
      '🎬 Upload single or multiple background videos (.mp4, .webm, .mov)',
      '📸 Batch upload multiple custom photos with drag & drop',
      '🔄 Rotate video clips & photos per Ayah automatically'
    ],
    mockUi: {
      badge: '🎬 Custom 4K Drone Footage • Looping Video Background',
      arabicText: 'وَيُبَشِّرَ ٱلْمُؤْمِنِينَ ٱلَّذِينَ يَعْمَلُونَ ٱلصَّٰلِحَٰتِ',
      translationText: 'And to give good tidings to the believers who do righteous deeds...',
      visualStyle: 'cyber-neon',
      aspect: '16:9',
      bgNote: 'Custom Looping Drone Video Clip'
    }
  },
  {
    id: 'format-style',
    stepNum: '05',
    title: 'Aspect Ratios & Calligraphy Styles',
    subtitle: 'Format for YouTube Shorts, Reels, TikTok, or 16:9 Landscape',
    category: 'Canvas & Layout',
    duration: 6,
    description:
      'Easily switch between 9:16 vertical for TikTok, Instagram Reels, and YouTube Shorts, or 16:9 widescreen for YouTube Landscape. Customize calligraphy typography, text size, and anim speed.',
    highlights: [
      '9:16 Vertical for mobile Shorts, Reels & TikTok',
      '16:9 Widescreen 1080p / 4K for YouTube desktop & TV',
      'Authentic Uthmani Quranic script with Ken-Burns motion'
    ],
    mockUi: {
      badge: '📱 9:16 Vertical Mobile Mode • Shorts & Reels Optimized',
      arabicText: 'مَّٰكِثِينَ فِيهِ أَبَدًا',
      translationText: 'In which they will remain forever...',
      visualStyle: 'parchment-mushaf',
      aspect: '9:16',
      bgNote: 'Vertical 9:16 Mobile Viewport'
    }
  },
  {
    id: 'export',
    stepNum: '06',
    title: 'Live Studio Preview & Fast HD Export',
    subtitle: 'Test in real-time and export full 1080p MP4/WebM videos',
    category: 'Rendering & Export',
    duration: 7,
    description:
      'Watch your complete video in the real-time Live Studio Preview. When ready, click Export Video to render crisp 1080p video with burned-in subtitles and downloadable SRT/VTT captions.',
    highlights: [
      'Live real-time preview with seekable audio controls',
      '1-Click Export to 1080p MP4 or high-speed WebM format',
      'Includes downloadable SRT & VTT subtitles for social platforms'
    ],
    mockUi: {
      badge: '⚡ 1080p HD Video Export Ready • Subtitles Embedded',
      arabicText: 'صَدَقَ ٱللَّهُ ٱلْعَظِيمُ',
      translationText: 'Allah Almighty has spoken the truth.',
      visualStyle: 'modern-dark',
      aspect: '16:9',
      bgNote: 'Full HD Render Engine • 60 FPS'
    }
  }
];

export const IntroGuide: React.FC<IntroGuideProps> = ({
  isOpen,
  onClose,
  onStartCreating
}) => {
  const [activeTab, setActiveTab] = useState<'video-tour' | 'step-by-step' | 'formats' | 'pro-tips'>('video-tour');
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlayingSimulation, setIsPlayingSimulation] = useState<boolean>(true);
  const [simProgress, setSimProgress] = useState<number>(0);

  const currentStep = GUIDE_STEPS[currentStepIdx];
  const progressTimerRef = useRef<any>(null);

  // Auto-play simulation across steps
  useEffect(() => {
    if (!isOpen || activeTab !== 'video-tour' || !isPlayingSimulation) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const intervalMs = 100;
    const totalTicks = (currentStep.duration * 1000) / intervalMs;

    progressTimerRef.current = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          // Advance to next step
          setCurrentStepIdx((idx) => (idx + 1) % GUIDE_STEPS.length);
          return 0;
        }
        return prev + (100 / totalTicks);
      });
    }, intervalMs);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, activeTab, isPlayingSimulation, currentStepIdx, currentStep.duration]);

  // Reset step progress on manual step change
  const handleSelectStep = (idx: number) => {
    setCurrentStepIdx(idx);
    setSimProgress(0);
  };

  const handleNextStep = () => {
    setCurrentStepIdx((prev) => (prev + 1) % GUIDE_STEPS.length);
    setSimProgress(0);
  };

  const handlePrevStep = () => {
    setCurrentStepIdx((prev) => (prev - 1 + GUIDE_STEPS.length) % GUIDE_STEPS.length);
    setSimProgress(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b1220] rounded-2xl border border-amber-500/40 shadow-2xl shadow-amber-500/10 overflow-hidden text-slate-100">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#080d18]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Film className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>Quran Video Maker</span>
                  <span className="text-amber-400 font-extrabold">• Studio Guide &amp; Walkthrough</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase hidden sm:inline-block">
                  Video Tutorial
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Master creating viral 9:16 Shorts, Reels, and 1080p widescreen Quran recitations in minutes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-[#090f1e] overflow-x-auto">
          {[
            { id: 'video-tour', label: '🎬 Interactive Video Tour', icon: Play },
            { id: 'step-by-step', label: '📖 Step-by-Step Manual', icon: BookOpen },
            { id: 'formats', label: '📱 Formats (9:16 & 16:9)', icon: Smartphone },
            { id: 'pro-tips', label: '💡 Pro Tips & Shortcuts', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: INTERACTIVE VIDEO TOUR */}
          {activeTab === 'video-tour' && (
            <div className="space-y-5">
              {/* Simulated Quran Video Player Screen */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-black aspect-video max-h-[380px] w-full flex flex-col justify-between shadow-2xl">
                {/* Background Simulation Scenery */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0c1428] via-[#080d1a] to-[#04060d]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)]" />
                  {/* Subtle animated floating ambient particles */}
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
                  <div className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
                </div>

                {/* Top Video Bar */}
                <div className="relative z-10 flex items-center justify-between p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[10px] tracking-wide">
                      STEP {currentStep.stepNum} OF {GUIDE_STEPS.length}
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[220px] sm:max-w-md">
                      {currentStep.category}: {currentStep.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-700 text-amber-300 text-[10px] font-mono">
                      {currentStep.mockUi.aspect === '9:16' ? '📱 9:16 Shorts/Reels' : '🖥️ 16:9 HD'}
                    </span>
                  </div>
                </div>

                {/* Center Quran Typography Simulation */}
                <div className="relative z-10 px-6 py-4 flex flex-col items-center justify-center text-center space-y-3">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentStep.mockUi.badge}</span>
                  </div>

                  {/* Arabic Calligraphy Mock */}
                  <div className="text-xl sm:text-2xl md:text-3xl font-serif text-amber-100 font-bold leading-relaxed tracking-wide drop-shadow-md max-w-2xl">
                    {currentStep.mockUi.arabicText}
                  </div>

                  {/* Translation Subtitle Mock */}
                  <div className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl line-clamp-2 drop-shadow">
                    {currentStep.mockUi.translationText}
                  </div>

                  {/* Visual Background Tag */}
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 pt-1">
                    <Film className="w-3 h-3 text-amber-400" />
                    <span>{currentStep.mockUi.bgNote}</span>
                  </div>
                </div>

                {/* Bottom Video Controls & Timeline Bar */}
                <div className="relative z-10 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-2">
                  {/* Timeline Progress Bar */}
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden cursor-pointer relative">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100 rounded-full"
                      style={{ width: `${simProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPlayingSimulation(!isPlayingSimulation)}
                        className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer"
                        title={isPlayingSimulation ? 'Pause Tour' : 'Play Tour'}
                      >
                        {isPlayingSimulation ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Previous Step"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Next Step"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <span className="text-[11px] text-slate-300 font-medium">
                        Chapter {currentStepIdx + 1} of {GUIDE_STEPS.length}:{' '}
                        <strong className="text-amber-300">{currentStep.title}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                      <span>Auto-Playing Guide</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Navigation Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                {GUIDE_STEPS.map((step, idx) => {
                  const isActive = currentStepIdx === idx;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => handleSelectStep(idx)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-500/30 shadow-md'
                          : 'border-slate-800 bg-[#0d1424] hover:border-amber-500/40 hover:bg-[#121c32]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-amber-300' : 'text-slate-500'}`}>
                          STEP {step.stepNum}
                        </span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {step.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Step Detailed Explanation */}
              <div className="p-4 rounded-xl bg-[#090e1a] border border-amber-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-mono font-extrabold">
                        STEP {currentStep.stepNum}
                      </span>
                      <span>{currentStep.title}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{currentStep.subtitle}</p>
                  </div>

                  <span className="text-[11px] text-amber-400/90 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 self-start sm:self-auto">
                    {currentStep.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{currentStep.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {currentStep.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[#0e172a] border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP MANUAL */}
          {activeTab === 'step-by-step' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/30">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>The Complete 6-Step Quran Video Production Flow</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Follow these 6 simple steps to produce broadcast-quality 1080p Quran recitation videos ready for YouTube, TikTok, and Instagram Reels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {GUIDE_STEPS.map((step) => (
                  <div
                    key={step.id}
                    className="p-4 rounded-xl bg-[#090e1a] border border-slate-800 hover:border-amber-500/40 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                          {step.stepNum}
                        </span>
                        <h5 className="text-xs font-bold text-white">{step.title}</h5>
                      </div>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                        {step.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>

                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      {step.highlights.map((h, i) => (
                        <div key={i} className="text-[11px] text-slate-300 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FORMATS (9:16 vs 16:9) */}
          {activeTab === 'formats' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 9:16 Vertical Card */}
                <div className="p-5 rounded-xl bg-[#090e1a] border border-amber-500/40 space-y-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>9:16 Vertical Mobile Mode</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">
                          VIRAL FORMAT
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">YouTube Shorts • Instagram Reels • TikTok</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Designed specifically for modern smartphone viewing. Places large, majestic Arabic calligraphy directly in the optical center with subtitle translations below, ensuring nothing is hidden by platform UI like like/share buttons.
                  </p>

                  <div className="space-y-2 bg-[#0d1424] p-3 rounded-lg border border-slate-800 text-xs">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Best Recommended Settings for 9:16:
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                      <li>Choose 1 to 5 Ayat for punchy 30–60 second Shorts</li>
                      <li>Use <strong>"Modern Dark"</strong> or <strong>"Cyber Neon"</strong> calligraphy style</li>
                      <li>Enable <strong>"Rotate video per Ayah"</strong> for dynamic visual pacing</li>
                      <li>Set video darkness overlay to 55–65% for crisp calligraphy contrast</li>
                    </ul>
                  </div>
                </div>

                {/* 16:9 Widescreen Card */}
                <div className="p-5 rounded-xl bg-[#090e1a] border border-slate-800 space-y-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>16:9 Landscape Widescreen</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-extrabold">
                          YOUTUBE STANDARD
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">YouTube Long-Form • Smart TV • Desktop</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    The classic widescreen cinematic format. Perfect for long recitations (full Surahs like Al-Mulk, Yaseen, Ar-Rahman, or Al-Kahf) with sweeping 4K cinematic backgrounds and centered calligraphy.
                  </p>

                  <div className="space-y-2 bg-[#0d1424] p-3 rounded-lg border border-slate-800 text-xs">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Best Recommended Settings for 16:9:
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                      <li>Ideal for complete Surah recitations with chapter titles</li>
                      <li>Use <strong>"4K Makkah Kaaba Majestic"</strong> or <strong>"Madinah Green Dome"</strong></li>
                      <li>Add Spoken Urdu or English translations for educational depth</li>
                      <li>Export in 1080p HD with downloaded SRT subtitles for YouTube closed captions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRO TIPS & SHORTCUTS */}
          {activeTab === 'pro-tips' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-[#090e1a] border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    <span>Upload Multiple Videos at Once</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    You can drag and drop multiple drone footage clips (.mp4, .webm, .mov) simultaneously. Check <strong>"Rotate videos per Ayah"</strong> to automatically switch between clips verse-by-verse!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#090e1a] border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-amber-400" />
                    <span>Teleprompter for Own Voice</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    When using <strong>"Own Voice"</strong> recorder, the teleprompter shows you the exact Arabic text and translation for each verse so you never miss a word during recitation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#090e1a] border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Adjust Darkness for Contrast</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    If your background video is bright, increase the <strong>Darkness Overlay Slider</strong> to 60–75%. This adds a cinematic vignette that ensures Arabic calligraphy stays 100% legible.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#090e1a] border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Universal MP4 &amp; SRT Captions</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The exporter creates universal MP4 videos compatible with iOS, Android, and all social platforms, plus downloadable SRT/VTT subtitle files ready for YouTube.
                  </p>
                </div>
              </div>

              {/* Direct FAQ Box */}
              <div className="p-4 rounded-xl bg-[#0d1424] border border-amber-500/20 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>100% Halal &amp; Sacred Scenery Compliant</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  All default built-in backgrounds are strictly pure sacred architecture and natural landscapes (Makkah Al-Mukarramah, Madinah Al-Munawwarah, Masjid Al-Aqsa, starry deserts, and mountains). No animate beings or inappropriate content.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-[#080d18]">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>You can open this guide anytime by clicking <strong>"Guide Video"</strong> in the top header.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onStartCreating) onStartCreating();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Start Creating Video</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
