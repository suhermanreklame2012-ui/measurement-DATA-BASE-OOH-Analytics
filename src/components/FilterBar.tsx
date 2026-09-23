import React from 'react';
import { 
  Search, 
  Filter, 
  X, 
  SlidersHorizontal, 
  MapPin, 
  Car, 
  Building2, 
  Tag, 
  DollarSign, 
  History,
  CheckCircle2,
  Flame,
  Crown,
  Zap,
  Sparkles
} from 'lucide-react';
import { FilterState, LocationType, TrafficDensity, MediaSpot } from '../types/ooh';
import { PriceRangeFilter, DEFAULT_MAX_BOUND, DEFAULT_MIN_BOUND } from './PriceRangeFilter';
import { formatCompactIDR } from '../utils/formatters';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  availableCities: string[];
  totalMatches: number;
  totalSpots: number;
  spots?: MediaSpot[];
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

const RECENT_SEARCHES_STORAGE_KEY = 'ooh_recent_searches_v1';
const DEFAULT_RECENT_SEARCHES = ['Dago', 'Pasteur', 'Asia Afrika'];

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  availableCities,
  totalMatches,
  totalSpots,
  spots
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Quick Filters Active State Checks
  const isAvailableOnlyActive = filter.availability === 'AVAILABLE';

  const isHighTrafficActive =
    filter.trafficDensities.length > 0 &&
    filter.trafficDensities.includes('Sangat Padat') &&
    filter.trafficDensities.includes('Padat') &&
    filter.trafficDensities.length === 2;

  const isPremiumLocationsActive =
    filter.locationTypes.length > 0 &&
    filter.locationTypes.includes('Komersial & Mall') &&
    filter.locationTypes.includes('Pusat Kota & Protokol') &&
    filter.locationTypes.length === 2;

  const isDoohActive = filter.category === 'DOOH_DIGITAL';

  const isTolArteriActive =
    filter.locationTypes.length === 1 && filter.locationTypes.includes('Jalur Tol & Arteri');

  const anyQuickFilterActive =
    isAvailableOnlyActive ||
    isHighTrafficActive ||
    isPremiumLocationsActive ||
    isDoohActive ||
    isTolArteriActive;

  // Single-click Quick Filter Toggle Handlers
  const toggleAvailableOnly = () => {
    onFilterChange({
      ...filter,
      availability: isAvailableOnlyActive ? 'ALL' : 'AVAILABLE'
    });
  };

  const toggleHighTraffic = () => {
    if (isHighTrafficActive) {
      onFilterChange({ ...filter, trafficDensities: [] });
    } else {
      onFilterChange({ ...filter, trafficDensities: ['Sangat Padat', 'Padat'] });
    }
  };

  const togglePremiumLocations = () => {
    if (isPremiumLocationsActive) {
      onFilterChange({ ...filter, locationTypes: [] });
    } else {
      onFilterChange({ ...filter, locationTypes: ['Komersial & Mall', 'Pusat Kota & Protokol'] });
    }
  };

  const toggleDooh = () => {
    onFilterChange({
      ...filter,
      category: isDoohActive ? 'ALL' : 'DOOH_DIGITAL'
    });
  };

  const toggleTolArteri = () => {
    if (isTolArteriActive) {
      onFilterChange({ ...filter, locationTypes: [] });
    } else {
      onFilterChange({ ...filter, locationTypes: ['Jalur Tol & Arteri'] });
    }
  };

  const clearAllQuickFilters = () => {
    onFilterChange({
      ...filter,
      availability: 'ALL',
      trafficDensities: [],
      locationTypes: [],
      category: 'ALL'
    });
  };

  // Dynamic Spot Counts for Quick Filters
  const availableCount = React.useMemo(() => {
    return spots ? spots.filter((s) => s.isAvailable).length : undefined;
  }, [spots]);

  const highTrafficCount = React.useMemo(() => {
    return spots ? spots.filter((s) => s.trafficDensity === 'Sangat Padat' || s.trafficDensity === 'Padat').length : undefined;
  }, [spots]);

  const premiumCount = React.useMemo(() => {
    return spots ? spots.filter((s) => s.locationType === 'Komersial & Mall' || s.locationType === 'Pusat Kota & Protokol').length : undefined;
  }, [spots]);

  const doohCount = React.useMemo(() => {
    return spots ? spots.filter((s) => s.category === 'DOOH_DIGITAL').length : undefined;
  }, [spots]);

  const tolArteriCount = React.useMemo(() => {
    return spots ? spots.filter((s) => s.locationType === 'Jalur Tol & Arteri').length : undefined;
  }, [spots]);

  // Recent Searches State (Last 3 queries)
  const [recentSearches, setRecentSearches] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed
            .filter((item) => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim())
            .slice(0, 3);
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {
      console.warn('Failed to load recent searches from localStorage:', e);
    }
    return DEFAULT_RECENT_SEARCHES;
  });

  // Reusable helper to record and persist a search query
  const recordSearchQuery = React.useCallback((query: string) => {
    const clean = query.trim();
    if (!clean || clean.length < 2) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 3);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save recent searches:', e);
      }
      return updated;
    });
  }, []);

  // Debounced effect to auto-save queries typed by user
  React.useEffect(() => {
    const query = filter.search.trim();
    if (!query || query.length < 2) return;

    const timer = setTimeout(() => {
      recordSearchQuery(query);
    }, 800);

    return () => clearTimeout(timer);
  }, [filter.search, recordSearchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      recordSearchQuery(filter.search);
    }
  };

  const handleSearchBlur = () => {
    recordSearchQuery(filter.search);
  };

  const handleApplyRecentSearch = (query: string) => {
    onFilterChange({ ...filter, search: query });
    recordSearchQuery(query);
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== queryToRemove.toLowerCase());
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update recent searches in localStorage:', e);
      }
      return updated;
    });
  };

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
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
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

        {/* Quick Filters Pill Bar (Single-click views) */}
        <div
          id="quick-filters-bar"
          data-testid="quick-filters-bar"
          className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs"
        >
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 mr-0.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Quick Filters:</span>
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Quick Filter 1: Available Only */}
            <button
              id="quick-filter-available"
              data-testid="quick-filter-available"
              type="button"
              onClick={toggleAvailableOnly}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border select-none shadow-2xs ${
                isAvailableOnlyActive
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
              title="Tampilkan hanya titik media yang siap tayang / tersedia (Available Only)"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isAvailableOnlyActive ? 'text-white' : 'text-emerald-600'}`} />
              <span>Available Only</span>
              {availableCount !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isAvailableOnlyActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {availableCount}
                </span>
              )}
              {isAvailableOnlyActive && <X className="w-3 h-3 ml-0.5 opacity-80" />}
            </button>

            {/* Quick Filter 2: High Traffic */}
            <button
              id="quick-filter-high-traffic"
              data-testid="quick-filter-high-traffic"
              type="button"
              onClick={toggleHighTraffic}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border select-none shadow-2xs ${
                isHighTrafficActive
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
              title="Saring titik koridor lalu lintas padat (>80.000 kendaraan/hari)"
            >
              <Flame className={`w-3.5 h-3.5 ${isHighTrafficActive ? 'text-white' : 'text-amber-500'}`} />
              <span>High Traffic</span>
              {highTrafficCount !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isHighTrafficActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {highTrafficCount}
                </span>
              )}
              {isHighTrafficActive && <X className="w-3 h-3 ml-0.5 opacity-80" />}
            </button>

            {/* Quick Filter 3: Premium Locations */}
            <button
              id="quick-filter-premium-locations"
              data-testid="quick-filter-premium-locations"
              type="button"
              onClick={togglePremiumLocations}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border select-none shadow-2xs ${
                isPremiumLocationsActive
                  ? 'bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
              title="Fokus pada kawasan Komersial & Mall serta Koridor Protokol Pusat Kota"
            >
              <Crown className={`w-3.5 h-3.5 ${isPremiumLocationsActive ? 'text-white' : 'text-purple-600'}`} />
              <span>Premium Locations</span>
              {premiumCount !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isPremiumLocationsActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {premiumCount}
                </span>
              )}
              {isPremiumLocationsActive && <X className="w-3 h-3 ml-0.5 opacity-80" />}
            </button>

            {/* Quick Filter 4: DOOH Videotron */}
            <button
              id="quick-filter-dooh"
              data-testid="quick-filter-dooh"
              type="button"
              onClick={toggleDooh}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border select-none shadow-2xs ${
                isDoohActive
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
              title="Tampilkan hanya layar LED DOOH Digital Videotron"
            >
              <Zap className={`w-3.5 h-3.5 ${isDoohActive ? 'text-white' : 'text-indigo-600'}`} />
              <span>DOOH Digital</span>
              {doohCount !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isDoohActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {doohCount}
                </span>
              )}
              {isDoohActive && <X className="w-3 h-3 ml-0.5 opacity-80" />}
            </button>

            {/* Quick Filter 5: Tol & Arteri */}
            <button
              id="quick-filter-arteri"
              data-testid="quick-filter-arteri"
              type="button"
              onClick={toggleTolArteri}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border select-none shadow-2xs ${
                isTolArteriActive
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
              title="Titik strategis di jalur Tol & Jalan Arteri Utama"
            >
              <Car className={`w-3.5 h-3.5 ${isTolArteriActive ? 'text-white' : 'text-blue-600'}`} />
              <span>Tol & Arteri</span>
              {tolArteriCount !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isTolArteriActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {tolArteriCount}
                </span>
              )}
              {isTolArteriActive && <X className="w-3 h-3 ml-0.5 opacity-80" />}
            </button>

            {/* Clear All Quick Filters button */}
            {anyQuickFilterActive && (
              <button
                id="btn-clear-quick-filters"
                type="button"
                onClick={clearAllQuickFilters}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                title="Bersihkan semua Quick Filters"
              >
                Hapus Quick Filter
              </button>
            )}
          </div>
        </div>

        {/* Recent Searches Chip Area (Last 3 queries) */}
        {recentSearches.length > 0 && (
          <div 
            id="recent-searches-area" 
            className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs"
            data-testid="recent-searches-area"
          >
            <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 mr-0.5">
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recent Searches:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {recentSearches.slice(0, 3).map((query, idx) => {
                const isActive = filter.search.trim().toLowerCase() === query.toLowerCase();
                return (
                  <button
                    key={`${query}-${idx}`}
                    id={`chip-recent-search-${idx}`}
                    type="button"
                    onClick={() => handleApplyRecentSearch(query)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer border group select-none shadow-2xs ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300'
                    }`}
                    title={`Klik untuk mencari ulang: "${query}"`}
                  >
                    <Search className={`w-3 h-3 ${isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{query}</span>
                    <span
                      role="button"
                      onClick={(e) => handleRemoveRecentSearch(e, query)}
                      className="p-0.5 -mr-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-200/70 transition-colors ml-0.5"
                      title={`Hapus "${query}" dari riwayat`}
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>

            {filter.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, search: '' })}
                className="text-[11px] text-slate-400 hover:text-rose-600 ml-1 transition-colors underline cursor-pointer"
                title="Hapus pencarian aktif"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        )}

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
