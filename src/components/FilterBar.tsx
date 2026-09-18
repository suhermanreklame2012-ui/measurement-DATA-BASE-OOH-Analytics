import React from 'react';
import { Search, Filter, X, SlidersHorizontal, MapPin, Car, Building2, Tag, DollarSign } from 'lucide-react';
import { FilterState, LocationType, TrafficDensity } from '../types/ooh';
import { PriceRangeFilter, DEFAULT_MAX_BOUND, DEFAULT_MIN_BOUND } from './PriceRangeFilter';
import { formatCompactIDR } from '../utils/formatters';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  availableCities: string[];
  totalMatches: number;
  totalSpots: number;
}

const ALL_LOCATION_TYPES: LocationType[] = [
  'Komersial & Mall',
  'Pusat Kota & Protokol',
  'Jalur Tol & Arteri',
  'Pendidikan & Kampus',
  'Simpang & Flyover',
  'Transport Hub & Stasiun'
];

const ALL_TRAFFIC_DENSITIES: TrafficDensity[] = [
  'Sangat Padat',
  'Padat',
  'Sedang',
  'Lancar'
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  availableCities,
  totalMatches,
  totalSpots
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleLocationType = (type: LocationType) => {
    const exists = filter.locationTypes.includes(type);
    const updated = exists
      ? filter.locationTypes.filter((t) => t !== type)
      : [...filter.locationTypes, type];
    onFilterChange({ ...filter, locationTypes: updated });
  };

  const toggleTrafficDensity = (density: TrafficDensity) => {
    const exists = filter.trafficDensities.includes(density);
    const updated = exists
      ? filter.trafficDensities.filter((d) => d !== density)
      : [...filter.trafficDensities, density];
    onFilterChange({ ...filter, trafficDensities: updated });
  };

  const isPriceActive =
    (filter.minPrice !== undefined && filter.minPrice > DEFAULT_MIN_BOUND) ||
    (filter.maxPrice !== undefined && filter.maxPrice < DEFAULT_MAX_BOUND);

  const resetFilters = () => {
    onFilterChange({
      search: '',
      city: 'All',
      category: 'ALL',
      locationTypes: [],
      trafficDensities: [],
      mediaTypes: [],
      availability: 'ALL',
      minTraffic: 0,
      minPrice: DEFAULT_MIN_BOUND,
      maxPrice: DEFAULT_MAX_BOUND
    });
  };

  const hasActiveFilters =
    filter.search !== '' ||
    filter.city !== 'All' ||
    filter.category !== 'ALL' ||
    filter.locationTypes.length > 0 ||
    filter.trafficDensities.length > 0 ||
    filter.availability !== 'ALL' ||
    isPriceActive;

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        
        {/* Top Filter Row: Search, Category & City */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter.search}
              onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
              placeholder="Cari jalan, lokasi, mall, atau kecamatan (contoh: Dago, PVJ, Soekarno Hatta)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            {filter.search && (
              <button
                onClick={() => onFilterChange({ ...filter, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Group: Category & Availability */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Category Segmented Control */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium border border-slate-200">
              <button
                onClick={() => onFilterChange({ ...filter, category: 'ALL' })}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  filter.category === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Format
              </button>
              <button
                onClick={() => onFilterChange({ ...filter, category: 'OOH_STATIC' })}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  filter.category === 'OOH_STATIC'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                OOH Statis (Billboard/Bando/JPO)
              </button>
              <button
                onClick={() => onFilterChange({ ...filter, category: 'DOOH_DIGITAL' })}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  filter.category === 'DOOH_DIGITAL'
                    ? 'bg-white text-purple-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DOOH Videotron
              </button>
            </div>

            {/* Availability filter */}
            <select
              value={filter.availability}
              onChange={(e) => onFilterChange({ ...filter, availability: e.target.value as any })}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">Status: Semua</option>
              <option value="AVAILABLE">Hanya Tersedia (Available)</option>
              <option value="SOLD_OUT">Tersewa / Sold Out</option>
            </select>

            {/* Quick Price Range Pill Trigger */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                isPriceActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Sesuaikan rentang tarif sewa bulanan"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {isPriceActive
                  ? `${formatCompactIDR(filter.minPrice)} - ${formatCompactIDR(filter.maxPrice)}/bln`
                  : 'Tarif / Bulan'}
              </span>
              {isPriceActive && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterChange({ ...filter, minPrice: DEFAULT_MIN_BOUND, maxPrice: DEFAULT_MAX_BOUND });
                  }}
                  className="p-0.5 hover:bg-emerald-200 rounded text-emerald-800 ml-0.5"
                  title="Reset tarif sewa"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>

            {/* Toggle Advanced Filters Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                isExpanded || hasActiveFilters
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Detail</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 underline font-medium px-1"
              >
                Reset
              </button>
            )}

          </div>

        </div>

        {/* City / Wilayah Scrollable Tab Bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1 flex-shrink-0 mr-1">
            <MapPin className="w-3 h-3" />
            Wilayah:
          </span>
          <button
            onClick={() => onFilterChange({ ...filter, city: 'All' })}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors text-xs ${
              filter.city === 'All'
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Jabar ({totalSpots})
          </button>
          {availableCities.map((city) => (
            <button
              key={city}
              onClick={() => onFilterChange({ ...filter, city })}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors text-xs ${
                filter.city === city
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Expandable Advanced Section: Rentang Harga, Jenis Lokasi, & Kepadatan Traffic */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
            
            {/* Filter Rentang Harga Sewa (1 Bulan) */}
            <PriceRangeFilter
              minPrice={filter.minPrice ?? DEFAULT_MIN_BOUND}
              maxPrice={filter.maxPrice ?? DEFAULT_MAX_BOUND}
              minBound={DEFAULT_MIN_BOUND}
              maxBound={DEFAULT_MAX_BOUND}
              matchingCount={totalMatches}
              onChange={(minPrice, maxPrice) => {
                onFilterChange({ ...filter, minPrice, maxPrice });
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Filter 1: Jenis Lokasi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Karakteristik & Jenis Lokasi:
                </span>
                {filter.locationTypes.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filter, locationTypes: [] })}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Pilih Semua
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_LOCATION_TYPES.map((type) => {
                  const isSelected = filter.locationTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleLocationType(type)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-50 text-blue-800 border-blue-300 font-medium shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter 2: Kepadatan Traffic Kendaraan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-amber-600" />
                  Kepadatan Traffic Kendaraan:
                </span>
                {filter.trafficDensities.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filter, trafficDensities: [] })}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Pilih Semua
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TRAFFIC_DENSITIES.map((density) => {
                  const isSelected = filter.trafficDensities.includes(density);
                  const colorClass =
                    density === 'Sangat Padat'
                      ? isSelected ? 'bg-rose-100 text-rose-800 border-rose-300 font-medium' : 'hover:bg-rose-50'
                      : density === 'Padat'
                      ? isSelected ? 'bg-amber-100 text-amber-800 border-amber-300 font-medium' : 'hover:bg-amber-50'
                      : isSelected ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium' : 'hover:bg-emerald-50';

                  return (
                    <button
                      key={density}
                      onClick={() => toggleTrafficDensity(density)}
                      className={`px-2.5 py-1 text-xs rounded-lg border border-slate-200 transition-all ${colorClass} ${
                        !isSelected ? 'bg-white text-slate-600' : ''
                      }`}
                    >
                      {density}
                      {density === 'Sangat Padat' && ' (>120k/hari)'}
                      {density === 'Padat' && ' (80k-120k/hari)'}
                      {density === 'Sedang' && ' (40k-80k/hari)'}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

        {/* Results count badge */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-900">{totalMatches}</span> dari {totalSpots} titik media OOH & DOOH
          </div>
          {totalMatches < totalSpots && (
            <div className="text-emerald-600 font-medium">
              Filter aktif menyaring {totalSpots - totalMatches} titik
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
