import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Car,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Info,
  Calendar,
  DollarSign,
  Award,
  Activity,
  Maximize2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { AnalyticsSourceModal } from './AnalyticsSourceModal';
import { ANALYTICS_METRICS_SOURCES } from '../utils/analyticsSourceData';

export interface VisibleSpotsReachLineChartProps {
  visibleSpots: MediaSpot[];
  allFilteredSpots?: MediaSpot[];
  onSelectSpot?: (spot: MediaSpot) => void;
  className?: string;
  defaultExpanded?: boolean;
}

type ChartViewMode = 'cumulative_spots' | 'monthly_seasonal';
type SpotScope = 'visible' | 'all';

// West Java seasonal mobility multipliers for 12-month projections
const MONTHLY_SEASONAL_FACTORS = [
  { monthKey: '01', monthName: 'Jan', multiplier: 0.95, label: 'Pasca Tahun Baru', isPeak: false },
  { monthKey: '02', monthName: 'Feb', multiplier: 0.92, label: 'Aktivitas Normal', isPeak: false },
  { monthKey: '03', monthName: 'Mar', multiplier: 1.05, label: 'Menjelang Ramadan', isPeak: false },
  { monthKey: '04', monthName: 'Apr', multiplier: 1.32, label: 'Arus Mudik & Idul Fitri', isPeak: true },
  { monthKey: '05', monthName: 'Mei', multiplier: 1.18, label: 'Arus Balik & Wisata', isPeak: true },
  { monthKey: '06', monthName: 'Jun', multiplier: 1.08, label: 'Pertengahan Tahun', isPeak: false },
  { monthKey: '07', monthName: 'Jul', multiplier: 1.22, label: 'Libur Sekolah & Kuliah', isPeak: true },
  { monthKey: '08', monthName: 'Agu', multiplier: 1.10, label: 'HUT RI & Festival', isPeak: false },
  { monthKey: '09', monthName: 'Sep', multiplier: 1.02, label: 'Aktivitas Reguler', isPeak: false },
  { monthKey: '10', monthName: 'Okt', multiplier: 1.06, label: 'Q4 Campaign Kickoff', isPeak: false },
  { monthKey: '11', monthName: 'Nov', multiplier: 1.15, label: 'Pemberkasan Akhir Tahun', isPeak: false },
  { monthKey: '12', monthName: 'Des', multiplier: 1.35, label: 'Libur Nataru & Puncak Belanja', isPeak: true }
];

export const VisibleSpotsReachLineChart: React.FC<VisibleSpotsReachLineChartProps> = ({
  visibleSpots,
  allFilteredSpots = [],
  onSelectSpot,
  className = '',
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [viewMode, setViewMode] = useState<ChartViewMode>('cumulative_spots');
  const [scope, setScope] = useState<SpotScope>('visible');
  const [showDoohBreakdown, setShowDoohBreakdown] = useState<boolean>(true);
  const [showAverageBaseline, setShowAverageBaseline] = useState<boolean>(true);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [activeSourceMetricKey, setActiveSourceMetricKey] = useState<'traffic' | 'impressions' | 'visibility' | 'demographics' | 'roi_cpm'>('impressions');

  // Active dataset based on scope
  const activeSpots = useMemo(() => {
    if (scope === 'all' && allFilteredSpots.length > 0) {
      return allFilteredSpots;
    }
    return visibleSpots;
  }, [scope, visibleSpots, allFilteredSpots]);

  // Aggregate Key Performance Indicators for the currently active visible spots
  const metrics = useMemo(() => {
    const count = activeSpots.length;
    if (count === 0) {
      return {
        totalMonthlyImpressions: 0,
        totalDailyImpressions: 0,
        totalMonthlyTraffic: 0,
        totalDailyTraffic: 0,
        avgMonthlyImpressions: 0,
        topSpot: null as MediaSpot | null,
        doohCount: 0,
        staticCount: 0,
        doohMonthlyImpressions: 0,
        staticMonthlyImpressions: 0
      };
    }

    let sumDailyOTS = 0;
    let sumDailyTraffic = 0;
    let topSpot: MediaSpot | null = activeSpots[0];
    let doohCount = 0;
    let staticCount = 0;
    let doohOTS = 0;
    let staticOTS = 0;

    activeSpots.forEach((spot) => {
      const dailyOTS = spot.dailyImpressions || 0;
      const dailyTraffic = spot.dailyTraffic || 0;
      sumDailyOTS += dailyOTS;
      sumDailyTraffic += dailyTraffic;

      if (!topSpot || dailyOTS > (topSpot.dailyImpressions || 0)) {
        topSpot = spot;
      }

      if (spot.category === 'DOOH_DIGITAL') {
        doohCount++;
        doohOTS += dailyOTS * 30;
      } else {
        staticCount++;
        staticOTS += dailyOTS * 30;
      }
    });

    const totalMonthlyImpressions = sumDailyOTS * 30;
    const totalMonthlyTraffic = sumDailyTraffic * 30;
    const avgMonthlyImpressions = Math.round(totalMonthlyImpressions / count);

    return {
      totalMonthlyImpressions,
      totalDailyImpressions: sumDailyOTS,
      totalMonthlyTraffic,
      totalDailyTraffic: sumDailyTraffic,
      avgMonthlyImpressions,
      topSpot,
      doohCount,
      staticCount,
      doohMonthlyImpressions: doohOTS,
      staticMonthlyImpressions: staticOTS
    };
  }, [activeSpots]);

  // Dataset 1: Spot-by-Spot Progression with Cumulative Reach Potential
  const cumulativeSpotsData = useMemo(() => {
    let runningCumulative = 0;
    let runningDoohCumulative = 0;
    let runningStaticCumulative = 0;
    const totalVisibleOTS = metrics.totalMonthlyImpressions || 1;

    return activeSpots.map((spot, idx) => {
      const monthlyOTS = (spot.dailyImpressions || 0) * 30;
      runningCumulative += monthlyOTS;

      const isDooh = spot.category === 'DOOH_DIGITAL';
      if (isDooh) {
        runningDoohCumulative += monthlyOTS;
      } else {
        runningStaticCumulative += monthlyOTS;
      }

      const reachPercentage = Math.min(100, Math.round((runningCumulative / totalVisibleOTS) * 100));

      // Truncate name for clean X-axis display
      const shortName = spot.name.length > 18 
        ? `${spot.name.slice(0, 16)}…` 
        : spot.name;

      return {
        id: spot.id,
        index: idx + 1,
        spotNumber: `#${idx + 1}`,
        name: spot.name,
        shortName: `${idx + 1}. ${shortName}`,
        city: spot.city,
        roadName: spot.roadName,
        mediaType: spot.mediaType,
        category: spot.category,
        isDooh,
        monthlyImpressions: monthlyOTS,
        cumulativeReach: runningCumulative,
        doohMonthly: isDooh ? monthlyOTS : 0,
        staticMonthly: !isDooh ? monthlyOTS : 0,
        reachPercentage,
        dailyTraffic: spot.dailyTraffic || 0,
        monthlyTraffic: (spot.dailyTraffic || 0) * 30,
        oneMonthPrice: spot.pricing?.oneMonth || 0,
        spot
      };
    });
  }, [activeSpots, metrics.totalMonthlyImpressions]);

  // Dataset 2: 12-Month Seasonal Progression for the currently active visible inventory
  const seasonalTrendData = useMemo(() => {
    const baseMonthlyOTS = metrics.totalMonthlyImpressions;
    let runningYearlyReach = 0;

    return MONTHLY_SEASONAL_FACTORS.map((m, idx) => {
      const monthlyOTS = Math.round(baseMonthlyOTS * m.multiplier);
      runningYearlyReach += monthlyOTS;

      const doohShare = metrics.totalMonthlyImpressions > 0 
        ? metrics.doohMonthlyImpressions / metrics.totalMonthlyImpressions 
        : 0.5;

      return {
        monthKey: m.monthKey,
        monthName: m.monthName,
        label: `${m.monthName} (${m.label})`,
        eventLabel: m.label,
        isPeak: m.isPeak,
        multiplier: m.multiplier,
        monthlyImpressions: monthlyOTS,
        cumulativeReach: runningYearlyReach,
        doohMonthly: Math.round(monthlyOTS * doohShare),
        staticMonthly: Math.round(monthlyOTS * (1 - doohShare)),
        averageBaseline: baseMonthlyOTS
      };
    });
  }, [metrics]);

  // If no spots visible, render a clean placeholder
  if (visibleSpots.length === 0) {
    return null;
  }

  return (
    <div
      id="visible-spots-reach-line-chart-container"
      data-testid="visible-spots-reach-line-chart"
      className={`bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white border-b border-slate-700/80 transition-all ${className}`}
    >
      {/* Chart Header Bar */}
      <div className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0">
            <TrendingUp className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>Tren Impresi Bulanan (OTS) &amp; Potensi Jangkauan Kumulatif</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold">
                {activeSpots.length} Titik Terlihat
              </span>
              {viewMode === 'cumulative_spots' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-semibold">
                  <Activity className="w-3 h-3 text-blue-400" />
                  <span>Cumulative Reach Progression</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300">
              Visualisasi Recharts atas estimasi paparan impresi bulanan (Opportunity-to-See) dan kurva akumulasi jangkauan audiens
            </p>
          </div>
        </div>

        {/* Header Quick Controls & Collapse Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 shadow-inner text-xs">
            <button
              type="button"
              id="btn-chart-mode-cumulative"
              onClick={() => setViewMode('cumulative_spots')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'cumulative_spots'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grafik akumulasi jangkauan antar titik terlihat di tabel saat ini"
            >
              Kumulatif per Titik ({activeSpots.length})
            </button>
            <button
              type="button"
              id="btn-chart-mode-seasonal"
              onClick={() => setViewMode('monthly_seasonal')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'monthly_seasonal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grafik proyeksi tren impresi 12 bulan dengan faktor musiman West Java"
            >
              Proyeksi 12-Bulan
            </button>
          </div>

          {/* Scope Selector if allFilteredSpots is larger than visibleSpots */}
          {allFilteredSpots.length > visibleSpots.length && (
            <div className="hidden lg:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScope('visible')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  scope === 'visible'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Hanya titik yang tampil pada halaman aktif tabel saat ini"
              >
                Hal Ini ({visibleSpots.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Seluruh titik hasil pencarian/filter saat ini"
              >
                Semua Terfilter ({allFilteredSpots.length})
              </button>
            </div>
          )}

          {/* Data Source & Calculation Accuracy Audit Trigger */}
          <button
            type="button"
            id="btn-open-analytics-source-modal"
            data-testid="btn-open-analytics-source-modal"
            onClick={() => {
              setActiveSourceMetricKey('impressions');
              setIsSourceModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Lihat sumber pengambilan data (Dishub, BPS, WOO/ESOMAR) dan persentase akurasi kalkulasi"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Sumber Data &amp; Akurasi</span>
            <span className="text-[10px] bg-emerald-400/20 px-1.5 py-0.2 rounded font-mono font-bold">
              91.8%–94.2%
            </span>
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            id="btn-toggle-reach-chart-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            title={isExpanded ? 'Kecilkan grafik tren' : 'Buka grafik tren impresi lengkap'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Tutup Grafik</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buka Grafik ({formatCompactNumber(metrics.totalMonthlyImpressions)} OTS)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mini Summary Strip (Always visible or in compact mode) */}
      <div className="px-5 py-2.5 bg-slate-950/60 border-b border-white/5 flex items-center justify-between gap-3 overflow-x-auto text-xs">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* Total Monthly Impressions KPI */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-[11px]">Total Impresi Bulanan (OTS):</span>
            <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">
              {formatCompactNumber(metrics.totalMonthlyImpressions)} OTS
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({metrics.totalMonthlyImpressions.toLocaleString('id-ID')} /bln)
            </span>
          </div>

          {/* Source Attribution & Accuracy Pill */}
          <button
            type="button"
            onClick={() => {
              setActiveSourceMetricKey('impressions');
              setIsSourceModalOpen(true);
            }}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Klik untuk membuka audit rincian sumber data & metodologi akurasi"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Sumber: <strong>Dishub &amp; WOO</strong></span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-300 font-bold">Akurasi 91.8% (OTS) / 94.2% (Trafik)</span>
          </button>

          {/* Cumulative Reach Potential */}
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[11px]">Potensi Jangkauan Kumulatif:</span>
            <span className="font-bold text-amber-300 text-xs">
              {formatCompactNumber(metrics.totalMonthlyImpressions)} Audiens Unik/Bln
            </span>
          </div>

          {/* Average per Spot */}
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/10">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 text-[11px]">Rata-rata/Titik:</span>
            <span className="font-semibold text-blue-300 text-xs">
              {formatCompactNumber(metrics.avgMonthlyImpressions)} OTS
            </span>
          </div>

          {/* Peak Performer Spot */}
          {metrics.topSpot && (
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-white/10">
              <Award className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-slate-400 text-[11px]">Titik Terpadat:</span>
              <button
                type="button"
                onClick={() => onSelectSpot && metrics.topSpot && onSelectSpot(metrics.topSpot)}
                className="font-bold text-white hover:text-emerald-300 underline underline-offset-2 transition-colors truncate max-w-44 text-left cursor-pointer"
                title={`Lihat detail titik terpadat: ${metrics.topSpot.name}`}
              >
                {metrics.topSpot.name}
              </button>
              <span className="text-[10px] text-emerald-300 font-mono">
                ({formatCompactNumber(metrics.topSpot.dailyImpressions * 30)}/bln)
              </span>
            </div>
          )}
        </div>

        {/* Quick Toggles */}
        {isExpanded && (
          <div className="flex items-center gap-3 shrink-0 text-[11px]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={showDoohBreakdown}
                onChange={(e) => setShowDoohBreakdown(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-800"
              />
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                DOOH / Statis
              </span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={showAverageBaseline}
                onChange={(e) => setShowAverageBaseline(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-800"
              />
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-amber-400 inline-block" />
                Garis Rata-rata
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Expanded Chart Visualization Area */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
          {/* Main Recharts Container */}
          <div className="w-full h-72 sm:h-80 bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-white/10 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'cumulative_spots' ? (
                <ComposedChart
                  data={cumulativeSpotsData}
                  margin={{ top: 15, right: 30, left: 10, bottom: 25 }}
                >
                  <defs>
                    {/* Emerald Gradient for Cumulative Reach Area */}
                    <linearGradient id="reachCumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="monthlyOtsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />

                  <XAxis
                    dataKey="shortName"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={activeSpots.length > 6 ? -25 : 0}
                    textAnchor={activeSpots.length > 6 ? 'end' : 'middle'}
                    height={40}
                  />

                  {/* Left Y-Axis: Cumulative Reach Potential */}
                  <YAxis
                    yAxisId="left"
                    stroke="#10b981"
                    fontSize={11}
                    tickFormatter={(val) => formatCompactNumber(val)}
                    domain={[0, 'auto']}
                    label={{
                      value: 'Potensi Kumulatif (OTS)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#10b981',
                      fontSize: 10,
                      dy: 45
                    }}
                  />

                  {/* Right Y-Axis: Monthly Impressions per Spot */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#38bdf8"
                    fontSize={11}
                    tickFormatter={(val) => formatCompactNumber(val)}
                    domain={[0, 'auto']}
                    label={{
                      value: 'Impresi Titik (OTS/bln)',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#38bdf8',
                      fontSize: 10,
                      dy: 45
                    }}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const item = payload[0]?.payload;
                      if (!item) return null;

                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                            <span className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                                Spot #{item.index}
                              </span>
                              <span className="truncate">{item.name}</span>
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.isDooh ? 'bg-purple-900/90 text-purple-200' : 'bg-blue-900/90 text-blue-200'
                            }`}>
                              {item.isDooh ? 'DOOH' : 'Statis'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-300">
                            <div className="text-slate-400">{item.roadName || item.city} • {item.mediaType}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                            {/* Spot Monthly OTS */}
                            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                              <div className="text-slate-400 text-[10px]">Impresi Titik Ini:</div>
                              <div className="font-extrabold text-sky-400 text-xs">
                                {formatCompactNumber(item.monthlyImpressions)} OTS
                              </div>
                              <div className="text-[9px] text-slate-400">
                                (~{item.spot?.dailyImpressions?.toLocaleString('id-ID')} /hari)
                              </div>
                            </div>

                            {/* Cumulative Reach */}
                            <div className="bg-emerald-950/50 p-2 rounded-lg border border-emerald-700/50">
                              <div className="text-emerald-300 text-[10px]">Potensi Kumulatif:</div>
                              <div className="font-extrabold text-emerald-400 text-xs">
                                {formatCompactNumber(item.cumulativeReach)} OTS
                              </div>
                              <div className="text-[9px] text-emerald-200 font-semibold">
                                {item.reachPercentage}% dari total {activeSpots.length} titik
                              </div>
                            </div>
                          </div>

                          {/* Extra Spot Traffic & Price Info */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3 text-slate-400" />
                              {item.dailyTraffic?.toLocaleString('id-ID')} kend./hari
                            </span>
                            <span className="font-semibold text-emerald-300">
                              {item.oneMonthPrice > 0 ? `${formatIDR(item.oneMonthPrice)}/bln` : 'Hubungi Kami'}
                            </span>
                          </div>

                          {onSelectSpot && (
                            <div className="text-[9px] text-emerald-400 text-center font-medium pt-0.5">
                              Klik titik untuk melihat rincian lokasi
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />

                  {/* Cumulative Reach Potential Area (Smooth filling underneath) */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeReach"
                    name="Potensi Jangkauan Kumulatif (OTS)"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#reachCumulativeGrad)"
                    activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2, fill: '#10b981' }}
                  />

                  {/* Spot Monthly Impressions Line */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="monthlyImpressions"
                    name="Total Impresi Bulanan per Titik"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const spot = props.payload?.spot;
                      const isTop = spot?.id === metrics.topSpot?.id;
                      return (
                        <circle
                          key={`dot-spot-${props.cx}-${props.cy}`}
                          cx={props.cx}
                          cy={props.cy}
                          r={isTop ? 6 : 4}
                          fill={isTop ? '#f59e0b' : '#38bdf8'}
                          stroke="#ffffff"
                          strokeWidth={isTop ? 2 : 1.5}
                          className="cursor-pointer hover:scale-125 transition-transform"
                          onClick={() => onSelectSpot && spot && onSelectSpot(spot)}
                        />
                      );
                    }}
                    activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2, fill: '#38bdf8' }}
                  />

                  {/* DOOH Breakdown Line */}
                  {showDoohBreakdown && metrics.doohCount > 0 && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="doohMonthly"
                      name="DOOH Videotron"
                      stroke="#c084fc"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={{ r: 2.5, fill: '#c084fc' }}
                    />
                  )}

                  {/* Static Billboard Breakdown Line */}
                  {showDoohBreakdown && metrics.staticCount > 0 && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="staticMonthly"
                      name="Billboard Statis"
                      stroke="#60a5fa"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={{ r: 2.5, fill: '#60a5fa' }}
                    />
                  )}

                  {/* Average Baseline Reference Line */}
                  {showAverageBaseline && metrics.avgMonthlyImpressions > 0 && (
                    <ReferenceLine
                      yAxisId="right"
                      y={metrics.avgMonthlyImpressions}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Rata-rata: ${formatCompactNumber(metrics.avgMonthlyImpressions)}`,
                        fill: '#fbbf24',
                        fontSize: 10,
                        position: 'insideTopRight'
                      }}
                    />
                  )}
                </ComposedChart>
              ) : (
                /* Seasonal 12-Month Projections Chart */
                <ComposedChart
                  data={seasonalTrendData}
                  margin={{ top: 15, right: 30, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="seasonalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />

                  <XAxis
                    dataKey="monthName"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />

                  <YAxis
                    yAxisId="left"
                    stroke="#10b981"
                    fontSize={11}
                    tickFormatter={(val) => formatCompactNumber(val)}
                    label={{
                      value: 'Potensi Akumulasi Tahunan (OTS)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#10b981',
                      fontSize: 10,
                      dy: 45
                    }}
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#38bdf8"
                    fontSize={11}
                    tickFormatter={(val) => formatCompactNumber(val)}
                    label={{
                      value: 'Impresi Musiman per Bulan',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#38bdf8',
                      fontSize: 10,
                      dy: 45
                    }}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const item = payload[0]?.payload;
                      if (!item) return null;

                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              Bulan {item.monthName}
                            </span>
                            {item.isPeak ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                                ★ Puncak Lonjakan ({item.multiplier}x)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">{item.multiplier}x normal</span>
                            )}
                          </div>

                          <div className="text-[11px] text-amber-200 bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
                            <strong>Konteks Musiman:</strong> {item.eventLabel}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                              <div className="text-slate-400 text-[10px]">Impresi Bulan Ini:</div>
                              <div className="font-extrabold text-sky-400 text-xs">
                                {formatCompactNumber(item.monthlyImpressions)} OTS
                              </div>
                            </div>
                            <div className="bg-emerald-950/50 p-2 rounded-lg border border-emerald-700/50">
                              <div className="text-emerald-300 text-[10px]">Akumulasi Hingga Bulan Ini:</div>
                              <div className="font-extrabold text-emerald-400 text-xs">
                                {formatCompactNumber(item.cumulativeReach)} OTS
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />

                  {/* Cumulative Annual Reach Area */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeReach"
                    name="Akumulasi Jangkauan Tahunan (OTS)"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#seasonalGrad)"
                  />

                  {/* Monthly Impressions with Seasonal Factors */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="monthlyImpressions"
                    name="Tren Impresi Bulanan (OTS)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const isPeak = props.payload?.isPeak;
                      return (
                        <circle
                          key={`dot-seasonal-${props.cx}-${props.cy}`}
                          cx={props.cx}
                          cy={props.cy}
                          r={isPeak ? 6 : 3.5}
                          fill={isPeak ? '#f59e0b' : '#38bdf8'}
                          stroke="#ffffff"
                          strokeWidth={isPeak ? 2 : 1}
                        />
                      );
                    }}
                    activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2, fill: '#38bdf8' }}
                  />

                  {/* Baseline Reference Line */}
                  <ReferenceLine
                    yAxisId="right"
                    y={metrics.totalMonthlyImpressions}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Baseline Reguler',
                      fill: '#94a3b8',
                      fontSize: 10,
                      position: 'insideBottomRight'
                    }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Bottom Insights Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Insight 1: Cumulative Reach Growth */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">
                  Skalabilitas Jangkauan Kampanye
                </div>
                <div className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                  Setiap titik tambahan memberikan peningkatan rata-rata <strong>+{formatCompactNumber(metrics.avgMonthlyImpressions)} OTS/bulan</strong>, melipatgandakan peluang keterlihatan merek.
                </div>
              </div>
            </div>

            {/* Insight 2: Multi-Format Synergy */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">
                  Sinergi Format Media
                </div>
                <div className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                  Terdiri dari <strong>{metrics.doohCount} Titik DOOH Digital</strong> ({formatCompactNumber(metrics.doohMonthlyImpressions)} OTS) dan <strong>{metrics.staticCount} Titik OOH Statis</strong> ({formatCompactNumber(metrics.staticMonthlyImpressions)} OTS).
                </div>
              </div>
            </div>

            {/* Insight 3: High Density Corridor */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">
                  Volume Trafik Kendaraan
                </div>
                <div className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                  Koridor titik terpilih dilewati estimasi <strong>{metrics.totalDailyTraffic.toLocaleString('id-ID')} unit kendaraan/hari</strong> (~{formatCompactNumber(metrics.totalMonthlyTraffic)} unit/bulan).
                </div>
              </div>
            </div>

            {/* Insight 4: Data Sources & Calculation Accuracy */}
            <div
              onClick={() => {
                setActiveSourceMetricKey('impressions');
                setIsSourceModalOpen(true);
              }}
              className="bg-emerald-950/40 hover:bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/30 flex items-start gap-2.5 cursor-pointer transition-colors group/srcCard"
              title="Klik untuk melihat audit sumber data dan metodologi perhitungan lengkap"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/srcCard:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px] flex items-center justify-between gap-1">
                  <span>Sumber Data &amp; Akurasi</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono font-bold">
                    94.2% / 91.8%
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                  Trafik: <strong>Dishub &amp; Google Matrix (Akurasi 94.2%)</strong>. OTS: <strong>Formula WOO &amp; BPS (Akurasi 91.8%)</strong>. <span className="text-emerald-400 underline font-medium">Lihat Audit &rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Source & Accuracy Modal */}
      <AnalyticsSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        activeMetricKey={activeSourceMetricKey}
      />
    </div>
  );
};
