import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, Layers } from 'lucide-react';
import { SurahMeta, SURAHS, searchSurahs } from '../data/surahs';

interface SurahSelectorProps {
  selectedSurah: SurahMeta;
  onSelectSurah: (surah: SurahMeta) => void;
  startAyah: number;
  endAyah: number;
  onRangeChange: (start: number, end: number) => void;
}

const PRESETS = [
  { name: 'Al-Fatiha (All 7 Verses)', surahNum: 1, start: 1, end: 7 },
  { name: 'Al-Kahf (Verses 1–10)', surahNum: 18, start: 1, end: 10 },
  { name: 'Yasin (Verses 1–12)', surahNum: 36, start: 1, end: 12 },
  { name: 'Al-Mulk (Verses 1–10)', surahNum: 67, start: 1, end: 10 },
  { name: 'Ar-Rahman (Verses 1–13)', surahNum: 55, start: 1, end: 13 },
  { name: 'Al-Ikhlas, Falaq, Nas', surahNum: 112, start: 1, end: 4 }
];

export const SurahSelector: React.FC<SurahSelectorProps> = ({
  selectedSurah,
  onSelectSurah,
  startAyah,
  endAyah,
  onRangeChange
}) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchResults = searchSurahs(query);

  const handleSelect = (s: SurahMeta) => {
    onSelectSurah(s);
    setQuery('');
    setIsDropdownOpen(false);
    onRangeChange(1, Math.min(10, s.numberOfAyahs));
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const found = SURAHS.find((s) => s.number === preset.surahNum);
    if (found) {
      onSelectSurah(found);
      onRangeChange(preset.start, Math.min(preset.end, found.numberOfAyahs));
    }
  };

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

      {/* Quick Presets */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Popular Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, idx) => (
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
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md">
              Ayah {startAyah} to {endAyah} ({endAyah - startAyah + 1} Verses)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Start Ayah: <strong className="text-slate-200">{startAyah}</strong>
              </label>
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
              <label className="block text-[11px] text-slate-400 mb-1">
                End Ayah: <strong className="text-slate-200">{endAyah}</strong>
              </label>
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
        </div>
      </div>
    </div>
  );
};
