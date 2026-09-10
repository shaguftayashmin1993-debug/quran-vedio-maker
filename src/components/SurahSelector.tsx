import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, Layers } from 'lucide-react';
import { SurahMeta, SURAHS, searchSurahs } from '../data/surahs';

interface SurahSelectorProps {
  selectedSurah: SurahMeta;
  onSelectSurah: (surah: SurahMeta) => void;
  startAyah: number;
  endAyah: number;
  onRangeChange: (start: number, end: number) => void;
  onOpenBatchExport?: () => void;
}

const GLOBAL_PRESETS = [
  { name: 'Al-Fatiha (All 7 Verses)', surahNum: 1, start: 1, end: 7 },
  { name: 'Al-Baqarah: Ayat al-Kursi (255)', surahNum: 2, start: 255, end: 255 },
  { name: 'Al-Baqarah: Last 2 Verses (285–286)', surahNum: 2, start: 285, end: 286 },
  { name: 'Al-Kahf (Verses 1–10)', surahNum: 18, start: 1, end: 10 },
  { name: 'Yasin (Verses 1–12)', surahNum: 36, start: 1, end: 12 },
  { name: 'Ar-Rahman (Verses 1–13)', surahNum: 55, start: 1, end: 13 },
  { name: 'Al-Mulk (Verses 1–10)', surahNum: 67, start: 1, end: 10 },
  { name: 'Al-Ikhlas, Falaq, Nas', surahNum: 112, start: 1, end: 4 }
];

const FAMOUS_PASSAGES: Record<number, { title: string; start: number; end: number; desc: string }[]> = {
  2: [
    { title: 'Ayat al-Kursi', start: 255, end: 255, desc: 'The Throne Verse (Greatest Verse)' },
    { title: 'Last 2 Verses (Amanar-Rasul)', start: 285, end: 286, desc: 'Nightly protection & dua' },
    { title: 'Opening Guidance', start: 1, end: 7, desc: 'Characteristics of believers' },
    { title: 'Patience & Trials', start: 152, end: 157, desc: 'Inna Lillahi wa Inna Ilayhi Raji\'un' },
    { title: 'Ramadan & Dua', start: 183, end: 186, desc: 'Fasting and near response to prayer' },
    { title: 'Ayah 255 to 257', start: 255, end: 257, desc: 'Light out of darkness' },
  ],
  3: [
    { title: 'Opening Verses', start: 1, end: 9, desc: 'Firmness in faith' },
    { title: 'Shahada of Allah', start: 18, end: 19, desc: 'Divine Oneness & Truth' },
    { title: 'Creation of Heavens & Earth', start: 190, end: 194, desc: 'Reflection and Supplication' },
  ],
  18: [
    { title: 'First 10 Verses', start: 1, end: 10, desc: 'Protection from Dajjal' },
    { title: 'Story of the Cave Sleepers', start: 9, end: 22, desc: 'Faith & Divine refuge' },
    { title: 'Last 10 Verses', start: 101, end: 110, desc: 'Good deeds and sincere worship' },
  ],
  36: [
    { title: 'Opening Passage', start: 1, end: 12, desc: 'The Quran full of wisdom' },
    { title: 'Signs of Allah in Nature', start: 33, end: 44, desc: 'The Dead Earth & Heavenly Orbits' },
    { title: 'Kun Fa Yakun', start: 77, end: 83, desc: 'Resurrection and His Command' },
  ],
  55: [
    { title: 'The Most Merciful (1–16)', start: 1, end: 16, desc: 'Creation & Quranic blessings' },
    { title: 'Everything Upon It Will Perish', start: 26, end: 36, desc: 'The Majestic Lord' },
    { title: 'The Two Gardens (46–61)', start: 46, end: 61, desc: 'Descriptions of Jannah' },
  ],
  67: [
    { title: 'Verses 1–10', start: 1, end: 10, desc: 'Creation of life and death' },
    { title: 'Verses 11–20', start: 11, end: 20, desc: 'Allah\'s Power & Provision' },
    { title: 'Verses 21–30', start: 21, end: 30, desc: 'The Sustainer of the Earth' },
  ]
};

export const SurahSelector: React.FC<SurahSelectorProps> = ({
  selectedSurah,
  onSelectSurah,
  startAyah,
  endAyah,
  onRangeChange,
  onOpenBatchExport
}) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchResults = searchSurahs(query);

  const handleSelect = (s: SurahMeta) => {
    onSelectSurah(s);
    setQuery('');
    setIsDropdownOpen(false);
    onRangeChange(1, s.numberOfAyahs);
  };

  const applyPreset = (preset: typeof GLOBAL_PRESETS[0]) => {
    const found = SURAHS.find((s) => s.number === preset.surahNum);
    if (found) {
      onSelectSurah(found);
      onRangeChange(preset.start, Math.min(preset.end, found.numberOfAyahs));
    }
  };

  const famousPassages = FAMOUS_PASSAGES[selectedSurah.number] || [];

  // Generate 10-ayah chunk presets if the Surah is long (> 15 ayahs)
  const chunkButtons: { label: string; start: number; end: number }[] = [];
  if (selectedSurah.numberOfAyahs > 15) {
    const chunkSize = 10;
    for (let s = 1; s <= selectedSurah.numberOfAyahs; s += chunkSize) {
      const e = Math.min(s + chunkSize - 1, selectedSurah.numberOfAyahs);
      chunkButtons.push({
        label: `${s}–${e}`,
        start: s,
        end: e
      });
      // Limit to first 12 chunks to keep UI compact
      if (chunkButtons.length >= 12) break;
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelect(searchResults[0]);
      }
    }
  };

  const handleNativeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const num = parseInt(e.target.value, 10);
    const found = SURAHS.find((s) => s.number === num);
    if (found) {
      handleSelect(found);
    }
  };

  return (
    <div className="bg-[#0e1626] rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-5">
      {/* 1. Direct Dropdown Select for All 114 Surahs */}
      <div>
        <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Select Surah (1 to 114)
          </span>
          <span className="text-amber-300/90 font-medium text-[11px]">
            Selected: #{selectedSurah.number} Surah {selectedSurah.englishName}
          </span>
        </label>

        <select
          value={selectedSurah.number}
          onChange={handleNativeSelectChange}
          className="w-full bg-[#141e33] border border-amber-500/40 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-semibold text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-inner"
        >
          {SURAHS.map((s) => (
            <option key={s.number} value={s.number} className="bg-[#0e1626] text-slate-100 py-1">
              {s.number}. Surah {s.englishName} ({s.name}) — {s.numberOfAyahs} Ayahs
            </option>
          ))}
        </select>
      </div>

      {/* 2. Fast Search Input Box */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Or Quick Search by Name / Number / Keyword</span>
          <span className="text-[11px] text-slate-500">Press Enter to select top match</span>
        </label>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Type Surah name (e.g. Yasin, Mulk, Rahman, Baqarah, 67)..."
            className="w-full bg-[#141e33] border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
          <Search className="w-4 h-4 text-amber-400/70 absolute left-3.5 top-3" />
        </div>

        {/* Dropdown Results */}
        {isDropdownOpen && query.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-[#121c30] border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-800">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No Surah found matching &quot;{query}&quot;. Try typing a number (1-114) or English name.
              </div>
            ) : (
              searchResults.map((s) => (
                <button
                  key={s.number}
                  onClick={() => handleSelect(s)}
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-amber-500/10 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                      {s.number}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-200 group-hover:text-amber-300">
                        {s.englishName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.englishNameTranslation} • {s.numberOfAyahs} Ayahs
                      </div>
                    </div>
                  </div>
                  <span className="font-quran text-lg text-amber-300/80 group-hover:text-amber-300">
                    {s.name}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Famous Passages for Active Surah */}
      {famousPassages.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Popular Passages in Surah {selectedSurah.englishName}
            </span>
            <span className="text-[10px] text-amber-400/80 font-normal">Click to load passage</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {famousPassages.map((p, idx) => {
              const isSelected = startAyah === p.start && endAyah === p.end;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onRangeChange(p.start, p.end)}
                  className={`px-3 py-2 rounded-lg text-left text-xs transition-all border ${
                    isSelected
                      ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-sm'
                      : 'bg-slate-900/60 border-slate-700/70 hover:border-amber-500/50 text-slate-300 hover:text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{p.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                      Ayah {p.start === p.end ? p.start : `${p.start}–${p.end}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 10-Ayah Chunks for Long Surahs */}
      {chunkButtons.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Quick 10-Ayah Video Segments
            </label>
            {onOpenBatchExport && (
              <button
                type="button"
                onClick={onOpenBatchExport}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full transition-all"
              >
                <span>⚡ Batch Export All Clips</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chunkButtons.map((cb, idx) => {
              const isSelected = startAyah === cb.start && endAyah === cb.end;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onRangeChange(cb.start, cb.end)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {cb.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Quick Presets */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Global Popular Surahs & Passages
        </label>
        <div className="flex flex-wrap gap-2">
          {GLOBAL_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/40 transition-all flex items-center gap-1.5"
            >
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Surah Badge & Ayah Range Selector */}
      <div className="bg-[#141f36] rounded-xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-sm">
              {selectedSurah.number}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Surah {selectedSurah.englishName}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-normal">
                  {selectedSurah.revelationType}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                &quot;{selectedSurah.englishNameTranslation}&quot; • Total {selectedSurah.numberOfAyahs} Verses
              </p>
            </div>
          </div>
          <span className="font-quran text-2xl text-amber-400">
            {selectedSurah.name}
          </span>
        </div>

        {/* Range Sliders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Layers className="w-3.5 h-3.5" /> Select Ayah Range for Video
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRangeChange(1, selectedSurah.numberOfAyahs)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
                  startAyah === 1 && endAyah === selectedSurah.numberOfAyahs
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                }`}
              >
                ✨ Select Full Surah (All {selectedSurah.numberOfAyahs} Verses)
              </button>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md">
                Ayah {startAyah} to {endAyah} ({endAyah - startAyah + 1} Verses)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-400">
                  Start Ayah:
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedSurah.numberOfAyahs}
                  value={startAyah}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(selectedSurah.numberOfAyahs, parseInt(e.target.value, 10) || 1));
                    const newEnd = Math.max(val, endAyah);
                    onRangeChange(val, newEnd);
                  }}
                  className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>
              <input
                type="range"
                min={1}
                max={selectedSurah.numberOfAyahs}
                value={startAyah}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const newEnd = Math.max(val, endAyah);
                  onRangeChange(val, newEnd);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-400">
                  End Ayah:
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedSurah.numberOfAyahs}
                  value={endAyah}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(selectedSurah.numberOfAyahs, parseInt(e.target.value, 10) || selectedSurah.numberOfAyahs));
                    const newStart = Math.min(val, startAyah);
                    onRangeChange(newStart, val);
                  }}
                  className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>
              <input
                type="range"
                min={1}
                max={selectedSurah.numberOfAyahs}
                value={endAyah}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const newStart = Math.min(val, startAyah);
                  onRangeChange(newStart, val);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {endAyah - startAyah + 1 > 25 && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span>⚡ Tip: Rendering {endAyah - startAyah + 1} verses? Use Batch Exporter to render as individual clips or chapter parts.</span>
              <div className="flex items-center gap-2">
                {onOpenBatchExport && (
                  <button
                    type="button"
                    onClick={onOpenBatchExport}
                    className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[11px] whitespace-nowrap hover:bg-amber-400 cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Open Batch Exporter</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRangeChange(startAyah, Math.min(startAyah + 9, selectedSurah.numberOfAyahs))}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-bold text-[11px] whitespace-nowrap hover:bg-slate-700 cursor-pointer border border-slate-700"
                >
                  Limit to 10 Verses
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
