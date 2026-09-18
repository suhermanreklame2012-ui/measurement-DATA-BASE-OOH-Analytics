import React from 'react';
import { Tag, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import { formatIDR, formatCompactIDR } from '../utils/formatters';

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  minBound?: number;
  maxBound?: number;
  step?: number;
  onChange: (minPrice: number, maxPrice: number) => void;
  matchingCount?: number;
}

export const DEFAULT_MIN_BOUND = 0;
export const DEFAULT_MAX_BOUND = 150000000; // Rp 150.000.000 (150 Juta)
export const DEFAULT_STEP = 5000000; // Rp 5.000.000 (5 Juta)

interface PresetOption {
  label: string;
  subLabel?: string;
  min: number;
  max: number;
}

const PRESETS: PresetOption[] = [
  { label: 'Semua Tarif', min: DEFAULT_MIN_BOUND, max: DEFAULT_MAX_BOUND },
  { label: '< Rp 35 Jt', subLabel: 'Ekonomis', min: DEFAULT_MIN_BOUND, max: 35000000 },
  { label: 'Rp 35 - 65 Jt', subLabel: 'Standar', min: 35000000, max: 65000000 },
  { label: 'Rp 65 - 100 Jt', subLabel: 'Prime Arteri', min: 65000000, max: 100000000 },
  { label: '> Rp 100 Jt', subLabel: 'Premium/LED', min: 100000000, max: DEFAULT_MAX_BOUND },
];

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  minPrice,
  maxPrice,
  minBound = DEFAULT_MIN_BOUND,
  maxBound = DEFAULT_MAX_BOUND,
  step = DEFAULT_STEP,
  onChange,
  matchingCount
}) => {
  const isFiltered = minPrice > minBound || maxPrice < maxBound;

  // Percentage calculations for slider track
  const minPercent = Math.max(0, Math.min(100, ((minPrice - minBound) / (maxBound - minBound)) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxPrice - minBound) / (maxBound - minBound)) * 100));

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.min(val, maxPrice - step);
    onChange(Math.max(minBound, clamped), maxPrice);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.max(val, minPrice + step);
    onChange(minPrice, Math.min(maxBound, clamped));
  };

  const handleReset = () => {
    onChange(minBound, maxBound);
  };

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-3">
      {/* Header & Badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Tag className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Rentang Tarif Sewa (1 Bulan)</span>
              {isFiltered && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                  Aktif
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {matchingCount !== undefined && (
            <span className="text-[11px] text-slate-500 font-medium">
              {matchingCount} titik cocok
            </span>
          )}
          {isFiltered && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Reset ke semua harga"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Formatted Price Display Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Tarif Minimum
          </span>
          <span className="text-sm font-bold text-slate-900 mt-0.5">
            {formatIDR(minPrice)}
          </span>
          <span className="text-[10px] text-slate-500">
            {minPrice === minBound ? 'Mulai dari Rp 0' : `${formatCompactIDR(minPrice)} / bulan`}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Tarif Maksimum
          </span>
          <span className="text-sm font-bold text-emerald-700 mt-0.5">
            {formatIDR(maxPrice)}
          </span>
          <span className="text-[10px] text-slate-500">
            {maxPrice >= maxBound ? 'Tanpa batas atas' : `Hingga ${formatCompactIDR(maxPrice)} / bln`}
          </span>
        </div>
      </div>

      {/* Dual Range Slider Component */}
      <div className="pt-2 pb-1 px-1">
        <div className="relative h-6 flex items-center">
          {/* Base Track */}
          <div className="absolute w-full h-2 bg-slate-200 rounded-full" />

          {/* Active Highlight Range Track */}
          <div
            className="absolute h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-75 shadow-xs"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`
            }}
          />

          {/* Min Input Slider */}
          <input
            type="range"
            min={minBound}
            max={maxBound}
            step={step}
            value={minPrice}
            onChange={handleMinChange}
            aria-label="Tarif Minimum Sewa 1 Bulan"
            className="absolute left-0 w-full h-2 appearance-none bg-transparent pointer-events-none z-20 
              [&::-webkit-slider-thumb]:pointer-events-auto 
              [&::-webkit-slider-thumb]:w-4 
              [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-emerald-600 
              [&::-webkit-slider-thumb]:border-2 
              [&::-webkit-slider-thumb]:border-white 
              [&::-webkit-slider-thumb]:shadow-md 
              [&::-webkit-slider-thumb]:hover:scale-115 
              [&::-webkit-slider-thumb]:transition-transform 
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:pointer-events-auto 
              [&::-moz-range-thumb]:w-4 
              [&::-moz-range-thumb]:h-4 
              [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-emerald-600 
              [&::-moz-range-thumb]:border-2 
              [&::-moz-range-thumb]:border-white 
              [&::-moz-range-thumb]:cursor-pointer"
          />

          {/* Max Input Slider */}
          <input
            type="range"
            min={minBound}
            max={maxBound}
            step={step}
            value={maxPrice}
            onChange={handleMaxChange}
            aria-label="Tarif Maksimum Sewa 1 Bulan"
            className="absolute left-0 w-full h-2 appearance-none bg-transparent pointer-events-none z-20 
              [&::-webkit-slider-thumb]:pointer-events-auto 
              [&::-webkit-slider-thumb]:w-4 
              [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-emerald-700 
              [&::-webkit-slider-thumb]:border-2 
              [&::-webkit-slider-thumb]:border-white 
              [&::-webkit-slider-thumb]:shadow-md 
              [&::-webkit-slider-thumb]:hover:scale-115 
              [&::-webkit-slider-thumb]:transition-transform 
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:pointer-events-auto 
              [&::-moz-range-thumb]:w-4 
              [&::-moz-range-thumb]:h-4 
              [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-emerald-700 
              [&::-moz-range-thumb]:border-2 
              [&::-moz-range-thumb]:border-white 
              [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>

        {/* Min/Max Bound Labels */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
          <span>{formatCompactIDR(minBound)}</span>
          <span>Rp 50 Jt</span>
          <span>Rp 100 Jt</span>
          <span>{formatCompactIDR(maxBound)}+</span>
        </div>
      </div>

      {/* Quick Filter Presets */}
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Preset Cepat:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const isSelected = minPrice === preset.min && maxPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.min, preset.max)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{preset.label}</span>
                {preset.subLabel && (
                  <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    ({preset.subLabel})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
