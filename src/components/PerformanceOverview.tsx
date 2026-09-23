import React, { useMemo, useState } from 'react';
import { MediaSpot, FilterState } from '../types/ooh';
import { formatCompactNumber, formatCompactIDR, formatIDR } from '../utils/formatters';
import {
  TrendingUp,
  MapPin,
  CheckCircle2,
  PieChart,
  Eye,
  Car,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Sparkles,
  Zap,
  Building,
  Radio,
  SlidersHorizontal,
  Flame,
  HelpCircle
} from 'lucide-react';

export interface PerformanceOverviewProps {
  spots: MediaSpot[];
  filter?: FilterState;
  onSelectRegion?: (region: string) => void;
  className?: string;
}

interface RegionStat {
  region: string;
  count: number;
  totalOTS: number;
  avgOTS: number;
  totalTraffic: number;
  avgTraffic: number;
  occupiedCount: number;
  availableCount: number;
  occupancyRate: number;
  avgPrice: number;
  digitalCount: number;
  staticCount: number;
}

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({
  spots,
  filter,
  onSelectRegion,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedSortBy, setSelectedSortBy] = useState<'ots' | 'occupancy' | 'count'>('ots');

  // Compute Aggregate & Regional Performance Metrics in Real-Time
  const {
    totalSpots,
    totalOTS,
    overallAvgOTS,
    totalTraffic,
    overallAvgTraffic,
    occupiedSpots,
    availableSpots,
    occupancyRate,
    availabilityRate,
    overallAvgPrice,
    digitalSpots,
    staticSpots,
    digitalPercentage,
    regionalStats,
    topRegionByOTS,
    topRegionByOccupancy,
    maxRegionalAvgOTS
  } = useMemo(() => {
    const total = spots.length;
    if (total === 0) {
      return {
        totalSpots: 0,
        totalOTS: 0,
        overallAvgOTS: 0,
        totalTraffic: 0,
        overallAvgTraffic: 0,
        occupiedSpots: 0,
        availableSpots: 0,
        occupancyRate: 0,
        availabilityRate: 0,
        overallAvgPrice: 0,
        digitalSpots: 0,
        staticSpots: 0,
        digitalPercentage: 0,
        regionalStats: [] as RegionStat[],
        topRegionByOTS: null as RegionStat | null,
        topRegionByOccupancy: null as RegionStat | null,
        maxRegionalAvgOTS: 0
      };
    }

    let sumOTS = 0;
    let sumTraffic = 0;
    let sumPrice = 0;
    let occupied = 0;
    let digital = 0;

    // Grouping by Region / City
    const regionMap = new Map<string, {
      count: number;
      totalOTS: number;
      totalTraffic: number;
      occupiedCount: number;
      totalPrice: number;
      digitalCount: number;
    }>();

    spots.forEach((spot) => {
      const ots = spot.dailyImpressions || 0;
      const traffic = spot.dailyTraffic || 0;
      const price = spot.pricing?.oneMonth || 0;
      const isOcc = !spot.isAvailable;
      const isDig = spot.category === 'DOOH_DIGITAL';

      sumOTS += ots;
      sumTraffic += traffic;
      sumPrice += price;
      if (isOcc) occupied++;
      if (isDig) digital++;

      const regionKey = spot.city?.trim() || 'Lainnya';
      const existing = regionMap.get(regionKey) || {
        count: 0,
        totalOTS: 0,
        totalTraffic: 0,
        occupiedCount: 0,
        totalPrice: 0,
        digitalCount: 0
      };

      existing.count += 1;
      existing.totalOTS += ots;
      existing.totalTraffic += traffic;
      existing.totalPrice += price;
      if (isOcc) existing.occupiedCount += 1;
      if (isDig) existing.digitalCount += 1;

      regionMap.set(regionKey, existing);
    });

    const regions: RegionStat[] = Array.from(regionMap.entries()).map(([region, data]) => {
      const avgOTS = Math.round(data.totalOTS / data.count);
      const avgTraffic = Math.round(data.totalTraffic / data.count);
      const avgPrice = Math.round(data.totalPrice / data.count);
      const occRate = Math.round((data.occupiedCount / data.count) * 100);
      const availCount = data.count - data.occupiedCount;
      const staticCount = data.count - data.digitalCount;

      return {
        region,
        count: data.count,
        totalOTS: data.totalOTS,
        avgOTS,
        totalTraffic: data.totalTraffic,
        avgTraffic,
        occupiedCount: data.occupiedCount,
        availableCount: availCount,
        occupancyRate: occRate,
        avgPrice,
        digitalCount: data.digitalCount,
        staticCount
      };
    });

    // Sort regions by OTS descending by default
    const sortedByOTS = [...regions].sort((a, b) => b.avgOTS - a.avgOTS);
    const sortedByOccupancy = [...regions].sort((a, b) => b.occupancyRate - a.occupancyRate);
    const maxAvgOTS = sortedByOTS.length > 0 ? sortedByOTS[0].avgOTS : 0;

    const occRate = Math.round((occupied / total) * 100);
    const availRate = 100 - occRate;
    const avgOTS = Math.round(sumOTS / total);
    const avgTraffic = Math.round(sumTraffic / total);
    const avgPrice = Math.round(sumPrice / total);
    const digPct = Math.round((digital / total) * 100);

    return {
      totalSpots: total,
      totalOTS: sumOTS,
      overallAvgOTS: avgOTS,
      totalTraffic: sumTraffic,
      overallAvgTraffic: avgTraffic,
      occupiedSpots: occupied,
      availableSpots: total - occupied,
      occupancyRate: occRate,
      availabilityRate: availRate,
      overallAvgPrice: avgPrice,
      digitalSpots: digital,
      staticSpots: total - digital,
      digitalPercentage: digPct,
      regionalStats: regions,
      topRegionByOTS: sortedByOTS[0] || null,
      topRegionByOccupancy: sortedByOccupancy[0] || null,
      maxRegionalAvgOTS: maxAvgOTS
    };
  }, [spots]);

  // Sorted regions based on user toggle
  const sortedRegionalStats = useMemo(() => {
    return [...regionalStats].sort((a, b) => {
      if (selectedSortBy === 'ots') return b.avgOTS - a.avgOTS;
      if (selectedSortBy === 'occupancy') return b.occupancyRate - a.occupancyRate;
      return b.count - a.count;
    });
  }, [regionalStats, selectedSortBy]);

  // Determine Occupancy Health Category
  const occupancyStatus = useMemo(() => {
    if (occupancyRate >= 75) {
      return {
        label: 'Tingkat Okupansi Tinggi',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badge: 'bg-amber-600',
        barColor: 'bg-amber-500',
        description: 'Trafik inventaris didominasi kampanye aktif. Slot prime terbatas.'
      };
    }
    if (occupancyRate >= 45) {
      return {
        label: 'Okupansi Seimbang (Optimal)',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badge: 'bg-emerald-600',
        barColor: 'bg-emerald-500',
        description: 'Distribusi unit terisi dan siap tayang seimbang untuk penetrasi brand.'
      };
    }
    return {
      label: 'Ketersediaan Tinggi (Banyak Slot)',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      badge: 'bg-blue-600',
      barColor: 'bg-blue-500',
      description: 'Peluang ekspansi media terbuka luas dengan berbagai opsi koridor strategis.'
    };
  }, [occupancyRate]);

  // Handle 0 spots filtered state
  if (totalSpots === 0) {
    return (
      <div 
        id="performance-overview-empty"
        data-testid="performance-overview-empty"
        className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-center ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Tidak Ada Data Inventaris pada Filter Ini</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Kombinasi filter pencarian, wilayah, atau harga saat ini menghasilkan 0 titik media. 
          Sesuaikan atau reset filter untuk melihat kalkulasi real-time performa inventaris.
        </p>
      </div>
    );
  }

  return (
    <div
      id="performance-overview"
      data-testid="performance-overview"
      className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Top Banner / Header Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Performance Overview & Regional Metrics</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Real-Time
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
              <span>Berdasarkan {totalSpots} titik media terfilter</span>
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              <span>{regionalStats.length} Wilayah Cakupan</span>
              {topRegionByOTS && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  <span className="text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Top OTS: {topRegionByOTS.region} ({formatCompactNumber(topRegionByOTS.avgOTS)})
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Action: Expand/Collapse Details */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition-colors cursor-pointer"
            aria-expanded={isExpanded}
            title={isExpanded ? 'Sembunyikan Rincian Per Wilayah' : 'Tampilkan Rincian Per Wilayah'}
          >
            <span>{isExpanded ? 'Ringkas Metrik' : 'Rincian Wilayah Lengkap'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="p-4 sm:p-5 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 border-b border-slate-100">
        
        {/* KPI 1: AVERAGE OTS PER REGION (Overall Scope) */}
        <div 
          id="metric-avg-ots"
          data-testid="metric-avg-ots"
          className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-xl p-3.5 border border-amber-200/80 shadow-2xs relative overflow-hidden group hover:border-amber-300 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-900 tracking-wide uppercase flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                Rata-rata OTS / Titik
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCompactNumber(overallAvgOTS)}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  OTS/hari
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-amber-200/50 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Akumulasi OTS Total:</span>
            <span className="font-bold text-amber-800">
              {formatCompactNumber(totalOTS)} impresi/hari
            </span>
          </div>

          <div className="mt-1 text-[10.5px] text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">
              Tertinggi: <strong className="text-slate-700">{topRegionByOTS?.region || '-'}</strong> ({topRegionByOTS ? formatCompactNumber(topRegionByOTS.avgOTS) : '0'} OTS)
            </span>
          </div>
        </div>

        {/* KPI 2: TOTAL INVENTORY OCCUPANCY RATE (%) */}
        <div 
          id="metric-occupancy-rate"
          data-testid="metric-occupancy-rate"
          className="bg-gradient-to-br from-indigo-50/60 via-white to-indigo-50/20 rounded-xl p-3.5 border border-indigo-200/80 shadow-2xs relative overflow-hidden group hover:border-indigo-300 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-900 tracking-wide uppercase flex items-center gap-1">
                <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                Total Occupancy Rate
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {occupancyRate}%
                </span>
                <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-semibold">
                  {occupiedSpots}/{totalSpots} Terisi
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Dual Progress Meter Bar */}
          <div className="mt-2.5 space-y-1">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/70">
              <div 
                className="h-full bg-amber-500 transition-all duration-500" 
                style={{ width: `${occupancyRate}%` }} 
                title={`Terisi (Occupied): ${occupiedSpots} unit (${occupancyRate}%)`}
              />
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${availabilityRate}%` }} 
                title={`Tersedia (Available): ${availableSpots} unit (${availabilityRate}%)`}
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {occupancyRate}% Terisi ({occupiedSpots})
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {availabilityRate}% Ready ({availableSpots})
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: DAILY TRAFFIC FLOW & REACH */}
        <div 
          id="metric-daily-traffic"
          data-testid="metric-daily-traffic"
          className="bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 rounded-xl p-3.5 border border-emerald-200/80 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-900 tracking-wide uppercase flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-emerald-600" />
                Total Arus Kendaraan
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCompactNumber(totalTraffic)}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  kendaraan/hari
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Rerata Lalu Lintas:</span>
            <span className="font-bold text-emerald-800">
              {formatCompactNumber(overallAvgTraffic)} kend./titik
            </span>
          </div>

          <div className="mt-1 text-[10.5px] text-slate-500 flex items-center justify-between">
            <span>Komposisi Media:</span>
            <span className="font-semibold text-slate-700">
              {digitalSpots} DOOH Digital ({digitalPercentage}%) • {staticSpots} Statis
            </span>
          </div>
        </div>

        {/* KPI 4: AVERAGE COMMERCIAL VALUE (1 Month Rental) */}
        <div 
          id="metric-avg-price"
          data-testid="metric-avg-price"
          className="bg-gradient-to-br from-purple-50/60 via-white to-purple-50/20 rounded-xl p-3.5 border border-purple-200/80 shadow-2xs relative overflow-hidden group hover:border-purple-300 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-900 tracking-wide uppercase flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                Rerata Nilai Sewa 1 Bln
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCompactIDR(overallAvgPrice)}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  /bulan
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <Building className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-purple-200/50 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Estimasi Total Pool:</span>
            <span className="font-bold text-purple-800">
              {formatCompactIDR(overallAvgPrice * totalSpots)}/bln
            </span>
          </div>

          <div className="mt-1 text-[10.5px] text-slate-500 flex items-center gap-1 truncate">
            <Radio className="w-3 h-3 text-purple-600 shrink-0" />
            <span>Kategori: {filter?.category === 'ALL' || !filter?.category ? 'Semua Kategori (OOH & DOOH)' : filter.category}</span>
          </div>
        </div>

      </div>

      {/* Expandable Deep-Dive: Average OTS per Region & Regional Occupancy Breakdown */}
      {isExpanded && (
        <div 
          id="regional-ots-breakdown"
          data-testid="regional-ots-breakdown"
          className="p-4 sm:p-5 bg-slate-50/70 space-y-3.5"
        >
          {/* Section Toolbar: Title, Sorting, and Context */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Distribusi Average OTS & Okupansi per Wilayah ({regionalStats.length} Kota/Kabupaten)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Perbandingan performa impresi harian (OTS) dan rasio keterisian media pada area cakupan aktif
              </p>
            </div>

            {/* Sorting Tabs for Regional Cards */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-auto text-xs">
              <span className="text-[10px] text-slate-400 font-semibold px-1.5">Urutkan:</span>
              <button
                type="button"
                onClick={() => setSelectedSortBy('ots')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedSortBy === 'ots'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                OTS Tertinggi
              </button>
              <button
                type="button"
                onClick={() => setSelectedSortBy('occupancy')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedSortBy === 'occupancy'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Okupansi Tertinggi
              </button>
              <button
                type="button"
                onClick={() => setSelectedSortBy('count')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedSortBy === 'count'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-900 hover:bg-slate-100'
                }`}
              >
                Jumlah Unit
              </button>
            </div>
          </div>

          {/* Regional Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedRegionalStats.map((item) => {
              const otsRatio = maxRegionalAvgOTS > 0 ? (item.avgOTS / maxRegionalAvgOTS) * 100 : 0;
              const isSelected = filter?.city === item.region;

              return (
                <div
                  key={item.region}
                  onClick={() => onSelectRegion?.(item.region)}
                  className={`bg-white rounded-xl p-3.5 border transition-all duration-150 hover:shadow-md cursor-pointer relative ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                  title={`Klik untuk fokus atau filter wilayah: ${item.region}`}
                >
                  {/* Region Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center font-bold text-xs shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 leading-tight flex items-center gap-1.5">
                          <span>{item.region}</span>
                          {item.region === topRegionByOTS?.region && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-extrabold flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 text-amber-600" />
                              Top OTS
                            </span>
                          )}
                        </h5>
                        <span className="text-[10px] text-slate-400">
                          {item.count} unit ({item.digitalCount} DOOH • {item.staticCount} OOH)
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/80">
                      {Math.round((item.count / totalSpots) * 100)}% dari filter
                    </span>
                  </div>

                  {/* Core Metrics: Avg OTS & Occupancy Rate */}
                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50/80 rounded-lg border border-slate-100 text-[11px] mb-2.5">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Rata-rata OTS / Titik</span>
                      <span className="text-sm font-black text-amber-900">
                        {formatCompactNumber(item.avgOTS)}
                      </span>
                      <span className="text-[9.5px] text-slate-400 block mt-0.5">
                        Total {formatCompactNumber(item.totalOTS)}/hari
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Occupancy Rate</span>
                      <span className="text-sm font-black text-indigo-900">
                        {item.occupancyRate}%
                      </span>
                      <span className="text-[9.5px] text-slate-400 block mt-0.5">
                        {item.occupiedCount} Terisi / {item.availableCount} Ready
                      </span>
                    </div>
                  </div>

                  {/* Visual OTS Relative Strength Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Kepadatan Relatif Wilayah</span>
                      <span className="font-semibold text-slate-700">{Math.round(otsRatio)}% Max OTS</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(8, otsRatio))}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Stats: Avg Traffic & Avg Price */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3 text-slate-400" />
                      <span>{formatCompactNumber(item.avgTraffic)} kend./titik</span>
                    </span>
                    <span className="font-semibold text-slate-700">
                      {formatCompactIDR(item.avgPrice)}/bln
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Insights Note */}
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-lg text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-emerald-600 text-white shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] leading-tight">
                <strong>Insight Strategis:</strong> Wilayah <strong className="underline">{topRegionByOTS?.region || 'Kota Bandung'}</strong> menawarkan rata-rata impresi tertinggi ({formatCompactNumber(topRegionByOTS?.avgOTS || 0)} OTS/titik). Tingkat keterisian tertinggi berada di <strong className="underline">{topRegionByOccupancy?.region || 'Kota Bandung'}</strong> ({topRegionByOccupancy?.occupancyRate || 0}%).
              </p>
            </div>
            <div className="text-[10px] text-emerald-700/80 shrink-0 font-medium sm:text-right">
              Data terhitung real-time per perubahan filter
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
