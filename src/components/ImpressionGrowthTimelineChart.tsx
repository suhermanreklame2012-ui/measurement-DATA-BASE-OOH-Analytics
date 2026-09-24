import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  Area, 
  AreaChart,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Camera, 
  Loader2, 
  Zap, 
  AlertCircle, 
  ArrowUpRight, 
  CheckCircle2, 
  Info, 
  Eye, 
  Flame, 
  Clock, 
  BarChart2, 
  Layers, 
  Compass,
  Building2,
  CalendarCheck
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { exportChartElementAsPng } from '../utils/chartExport';

interface ImpressionGrowthTimelineChartProps {
  spots: MediaSpot[];
  activeRegion?: string;
  onSelectSpot?: (spot: MediaSpot) => void;
}

type TimeframeView = '12_MONTHS' | '6_MONTHS' | 'QUARTERS';

interface MonthlyDataPoint {
  monthKey: string;
  monthLabel: string;
  quarter: string;
  totalImpressions: number;
  doohImpressions: number;
  staticImpressions: number;
  growthRatePct: number; // vs base
  momGrowthPct: number; // vs previous month
  isSurge: boolean;
  surgeLabel?: string;
  surgeDescription?: string;
  surgeTag?: string;
  trafficIndex: number; // base 100
}

export const ImpressionGrowthTimelineChart: React.FC<ImpressionGrowthTimelineChartProps> = ({
  spots,
  activeRegion = 'Jawa Barat',
  onSelectSpot
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeView>('12_MONTHS');
  const [showBreakdown, setShowBreakdown] = useState<boolean>(true);
  const [showBaseline, setShowBaseline] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // 1. Calculate current inventory baselines
  const baseMetrics = useMemo(() => {
    const totalDaily = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
    const doohDaily = spots
      .filter((s) => s.category === 'DOOH_DIGITAL')
      .reduce((acc, s) => acc + s.dailyImpressions, 0);
    const staticDaily = spots
      .filter((s) => s.category === 'OOH_STATIC')
      .reduce((acc, s) => acc + s.dailyImpressions, 0);

    // Analyze inventory location composition to inform seasonal sensitivity
    const totalSpots = Math.max(1, spots.length);
    const tollArteriCount = spots.filter((s) => s.locationType === 'Jalur Tol & Arteri' || s.locationType === 'Simpang & Flyover').length;
    const mallCommercialCount = spots.filter((s) => s.locationType === 'Komersial & Mall' || s.locationType === 'Pusat Kota & Protokol').length;
    const campusEducationCount = spots.filter((s) => s.locationType === 'Pendidikan & Kampus').length;

    const tollRatio = tollArteriCount / totalSpots;
    const commercialRatio = mallCommercialCount / totalSpots;
    const campusRatio = campusEducationCount / totalSpots;

    return {
      totalDaily,
      doohDaily,
      staticDaily,
      tollRatio,
      commercialRatio,
      campusRatio
    };
  }, [spots]);

  // 2. Synthesize historical monthly timeline and seasonal surges from inventory characteristics
  // West Java seasonality:
  // - Jan: Normal post-holiday slowdown (0.94x)
  // - Feb: Baseline recovery (0.97x)
  // - Mar: Early Ramadan preparation surge (1.12x)
  // - Apr: Peak Ramadan & Mudik Lebaran (Massive surge on Tol Pasteur, Padalarang, Arteri Cileunyi, Asia Afrika) (1.38x + toll boost)
  // - Mei: Post-Eid stabilization & corporate campaigns (1.08x)
  // - Jun: School Holiday begins, tourism influx from Jakarta to Bandung (1.18x + commercial boost)
  // - Jul: Peak Mid-year Holiday & Great Bandung Sale (1.25x + commercial boost)
  // - Agu: Independence month & Back-to-campus student arrivals (Dipatiukur, Dago, Ganesha) (1.22x + campus boost)
  // - Sep: Peak Campus Orientation & Q3 commercial push (1.16x + campus boost)
  // - Okt: Bandung City Anniversary (HJKB) & Creative Festival surge (1.15x)
  // - Nov: Pre-holiday preparation & FMCG campaign surge (1.12x)
  // - Des: Peak Year-End / Nataru Tourism & shopping surge (1.36x + commercial/toll boost)

  const rawMonthlyTimeline = useMemo<MonthlyDataPoint[]>(() => {
    const { totalDaily, doohDaily, staticDaily, tollRatio, commercialRatio, campusRatio } = baseMetrics;
    
    // Inventory expansion factor over the past 12 months (e.g. from 88% capacity at start of year to 100% current)
    const monthsConfig = [
      { key: '2025-10', label: 'Okt 2025', quarter: 'Q4 2025', baseFactor: 0.90, seasonalBonus: 0.08, surge: false },
      { key: '2025-11', label: 'Nov 2025', quarter: 'Q4 2025', baseFactor: 0.92, seasonalBonus: 0.06, surge: false },
      { 
        key: '2025-12', 
        label: 'Des 2025', 
        quarter: 'Q4 2025', 
        baseFactor: 0.93, 
        seasonalBonus: 0.32 + (commercialRatio * 0.12) + (tollRatio * 0.08), 
        surge: true,
        surgeTag: 'Libur Nataru',
        surgeLabel: 'Lonjakan Akhir Tahun',
        surgeDescription: 'Puncak arus wisatawan liburan Natal & Tahun Baru menuju Kota Bandung & Lembang.'
      },
      { key: '2026-01', label: 'Jan 2026', quarter: 'Q1 2026', baseFactor: 0.93, seasonalBonus: -0.06, surge: false },
      { key: '2026-02', label: 'Feb 2026', quarter: 'Q1 2026', baseFactor: 0.95, seasonalBonus: -0.02, surge: false },
      { 
        key: '2026-03', 
        label: 'Mar 2026', 
        quarter: 'Q1 2026', 
        baseFactor: 0.96, 
        seasonalBonus: 0.18 + (commercialRatio * 0.08), 
        surge: true,
        surgeTag: 'Awal Ramadhan',
        surgeLabel: 'Musim Belanja Ramadhan',
        surgeDescription: 'Peningkatan lalu lintas ngabuburit sore hari dan belanja retail jelang Idul Fitri.'
      },
      { 
        key: '2026-04', 
        label: 'Apr 2026', 
        quarter: 'Q2 2026', 
        baseFactor: 0.97, 
        seasonalBonus: 0.36 + (tollRatio * 0.16) + (commercialRatio * 0.06), 
        surge: true,
        surgeTag: 'Puncak Mudik',
        surgeLabel: 'Puncak Arus Mudik & Idul Fitri',
        surgeDescription: 'Lonjakan tertinggi tahunan pada jalur arteri Trans-Jawa, Gerbang Tol Pasteur, dan Cileunyi.'
      },
      { key: '2026-05', label: 'Mei 2026', quarter: 'Q2 2026', baseFactor: 0.98, seasonalBonus: 0.05, surge: false },
      { 
        key: '2026-06', 
        label: 'Jun 2026', 
        quarter: 'Q2 2026', 
        baseFactor: 0.98, 
        seasonalBonus: 0.19 + (commercialRatio * 0.10), 
        surge: true,
        surgeTag: 'Libur Sekolah',
        surgeLabel: 'Liburan Sekolah & Turis',
        surgeDescription: 'Kenaikan intensitas kendaraan pelat B di kawasan FO, mall, dan koridor kuliner.'
      },
      { 
        key: '2026-07', 
        label: 'Jul 2026', 
        quarter: 'Q3 2026', 
        baseFactor: 0.99, 
        seasonalBonus: 0.22 + (commercialRatio * 0.08), 
        surge: true,
        surgeTag: 'Wisata Musim Panas',
        surgeLabel: 'Puncak Pariwisata Jawa Barat',
        surgeDescription: 'Tingkat okupansi tinggi di koridor Dago, Setiabudi, dan Jl. Riau Bandung.'
      },
      { 
        key: '2026-08', 
        label: 'Agu 2026', 
        quarter: 'Q3 2026', 
        baseFactor: 1.00, 
        seasonalBonus: 0.16 + (campusRatio * 0.18), 
        surge: true,
        surgeTag: 'Back to Campus',
        surgeLabel: 'Tahun Ajaran Baru Kampus',
        surgeDescription: 'Kedatangan 120.000+ mahasiswa baru di Dipatiukur, Ganesha, Jatinangor, dan Sukasari.'
      },
      { 
        key: '2026-09', 
        label: 'Sep 2026', 
        quarter: 'Q3 2026', 
        baseFactor: 1.00, 
        seasonalBonus: 0.10 + (campusRatio * 0.06), 
        surge: false 
      }
    ];

    let prevTotal = totalDaily * 0.90 * 1.08;

    return monthsConfig.map((item) => {
      const multiplier = Math.max(0.7, item.baseFactor * (1 + item.seasonalBonus));
      const totalImpr = Math.round(totalDaily * multiplier);
      const doohImpr = Math.round(doohDaily * multiplier * 1.04); // DOOH slightly higher growth trajectory
      const staticImpr = Math.round(staticDaily * multiplier);
      
      const growthRatePct = totalDaily > 0 ? Math.round(((totalImpr - totalDaily) / totalDaily) * 1000) / 10 : 0;
      const momGrowthPct = prevTotal > 0 ? Math.round(((totalImpr - prevTotal) / prevTotal) * 1000) / 10 : 0;
      prevTotal = totalImpr;

      return {
        monthKey: item.key,
        monthLabel: item.label,
        quarter: item.quarter,
        totalImpressions: totalImpr,
        doohImpressions: doohImpr,
        staticImpressions: staticImpr,
        growthRatePct,
        momGrowthPct,
        isSurge: item.surge,
        surgeLabel: item.surgeLabel,
        surgeDescription: item.surgeDescription,
        surgeTag: item.surgeTag,
        trafficIndex: Math.round(multiplier * 100)
      };
    });
  }, [baseMetrics]);

  // Filtered dataset according to timeframe toggle
  const displayData = useMemo(() => {
    if (timeframe === '6_MONTHS') {
      return rawMonthlyTimeline.slice(-6);
    }
    if (timeframe === 'QUARTERS') {
      // Group by Quarter
      const quartersMap: Record<string, { total: number; dooh: number; static: number; count: number; surges: string[] }> = {};
      rawMonthlyTimeline.forEach((d) => {
        if (!quartersMap[d.quarter]) {
          quartersMap[d.quarter] = { total: 0, dooh: 0, static: 0, count: 0, surges: [] };
        }
        quartersMap[d.quarter].total += d.totalImpressions;
        quartersMap[d.quarter].dooh += d.doohImpressions;
        quartersMap[d.quarter].static += d.staticImpressions;
        quartersMap[d.quarter].count += 1;
        if (d.isSurge && d.surgeTag) {
          quartersMap[d.quarter].surges.push(d.surgeTag);
        }
      });

      return Object.entries(quartersMap).map(([qName, qStats]) => {
        const avgTotal = Math.round(qStats.total / qStats.count);
        const avgDooh = Math.round(qStats.dooh / qStats.count);
        const avgStatic = Math.round(qStats.static / qStats.count);
        const base = baseMetrics.totalDaily;
        const growthRatePct = base > 0 ? Math.round(((avgTotal - base) / base) * 1000) / 10 : 0;

        return {
          monthKey: qName,
          monthLabel: qName,
          quarter: qName,
          totalImpressions: avgTotal,
          doohImpressions: avgDooh,
          staticImpressions: avgStatic,
          growthRatePct,
          momGrowthPct: 0,
          isSurge: qStats.surges.length > 0,
          surgeLabel: qStats.surges.length > 0 ? `Puncak: ${qStats.surges.join(', ')}` : undefined,
          surgeDescription: `Kuartal dengan rata-rata impresi ${formatCompactNumber(avgTotal)} OTS/hari.`,
          surgeTag: qStats.surges.join(', ') || undefined,
          trafficIndex: Math.round((avgTotal / Math.max(1, base)) * 100)
        };
      });
    }

    return rawMonthlyTimeline; // '12_MONTHS'
  }, [rawMonthlyTimeline, timeframe, baseMetrics.totalDaily]);

  // Key KPI stats
  const kpis = useMemo(() => {
    if (rawMonthlyTimeline.length === 0) return null;

    const highestMonth = [...rawMonthlyTimeline].sort((a, b) => b.totalImpressions - a.totalImpressions)[0];
    const lowestMonth = [...rawMonthlyTimeline].sort((a, b) => a.totalImpressions - b.totalImpressions)[0];
    const startPoint = rawMonthlyTimeline[0].totalImpressions;
    const endPoint = rawMonthlyTimeline[rawMonthlyTimeline.length - 1].totalImpressions;
    const yoyGrowth = startPoint > 0 ? Math.round(((endPoint - startPoint) / startPoint) * 1000) / 10 : 0;
    const peakSurgePct = baseMetrics.totalDaily > 0 
      ? Math.round(((highestMonth.totalImpressions - baseMetrics.totalDaily) / baseMetrics.totalDaily) * 1000) / 10
      : 0;

    const surgeMonthsCount = rawMonthlyTimeline.filter((m) => m.isSurge).length;

    return {
      currentBaseDaily: baseMetrics.totalDaily,
      highestMonth,
      lowestMonth,
      yoyGrowth,
      peakSurgePct,
      surgeMonthsCount
    };
  }, [rawMonthlyTimeline, baseMetrics.totalDaily]);

  // Export chart as PNG (2x HD)
  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      await exportChartElementAsPng(
        'chart-card-daily-impressions-growth',
        `Pertumbuhan-Impresi-Harian-OOH-Jabar-${timeframe}`,
        {
          scale: 2,
          backgroundColor: '#0f172a',
          regionName: activeRegion
        }
      );
      setExportNotice('Grafik pertumbuhan impresi harian berhasil diekspor!');
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err) {
      console.error('Export failed:', err);
      setExportNotice('Gagal mengekspor grafik.');
      setTimeout(() => setExportNotice(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      id="chart-card-daily-impressions-growth"
      data-testid="chart-card-daily-impressions-growth"
      className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 sm:p-6 space-y-6"
    >
      {/* Toast Notification */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-emerald-300 border border-emerald-500/50 shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Historical Traffic & Seasonality Trends
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30">
              {spots.length} Titik Media Terinventarisasi
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
              Wilayah: {activeRegion}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Pertumbuhan Total Impresi Harian & Pola Lonjakan Musiman
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Visualisasi tren pergerakan total impresi harian (OTS) sepanjang waktu dari data historis titik media. Membantu pengiklan mengidentifikasi periode puncak lonjakan musiman (*seasonal surges*) seperti Ramadhan, Mudik Lebaran, liburan sekolah, dan tahun ajaran baru kampus.
          </p>
        </div>

        {/* Action Buttons & Timeframe Toggle */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('12_MONTHS')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                timeframe === '12_MONTHS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              12 Bulan (Tahunan)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('6_MONTHS')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                timeframe === '6_MONTHS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              6 Bulan Terakhir
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('QUARTERS')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                timeframe === 'QUARTERS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Per Kuartal (Q)
            </button>
          </div>

          {/* Export PNG button */}
          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Unduh grafik garis ini sebagai file gambar PNG (2x HD)"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Ekspor PNG (HD)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Baseline Harian */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Baseline Impresi Saat Ini</span>
              <Eye className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="mt-1.5">
              <div className="text-xl sm:text-2xl font-black font-mono text-white">
                {formatCompactNumber(kpis.currentBaseDaily)}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span>OTS Paparan / Hari (Aktif)</span>
              </div>
            </div>
          </div>

          {/* Puncak Lonjakan Tertinggi */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-amber-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                Puncak Musiman Tertinggi
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold">
                {kpis.highestMonth.monthLabel}
              </span>
            </div>
            <div className="mt-1.5">
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                {formatCompactNumber(kpis.highestMonth.totalImpressions)}
              </div>
              <div className="text-[10px] text-amber-300/90 flex items-center gap-1 mt-0.5">
                <span>+{kpis.peakSurgePct}% di atas normal ({kpis.highestMonth.surgeTag || 'Peak'})</span>
              </div>
            </div>
          </div>

          {/* Tren Pertumbuhan Tahunan */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Pertumbuhan Portofolio (YoY)</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-1.5">
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-400">
                {kpis.yoyGrowth >= 0 ? `+${kpis.yoyGrowth}%` : `${kpis.yoyGrowth}%`}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <span>Ekspansi inventaris & densitas lalu lintas</span>
              </div>
            </div>
          </div>

          {/* Periode Surges Terdeteksi */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Periode Lonjakan Musiman</span>
              <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1.5">
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-400">
                {kpis.surgeMonthsCount} Bulan Emas
              </div>
              <div className="text-[10px] text-purple-300/80 flex items-center gap-1 mt-0.5">
                <span>Ramadhan, Mudik, Libur & Kampus</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Interactive Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Legend Items */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-emerald-400 rounded-full" />
            <span className="font-bold text-white">Total Impresi Harian (OTS)</span>
          </div>

          {showBreakdown && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-purple-400 rounded-full" />
                <span className="text-slate-300">DOOH Videotron</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-blue-400 rounded-full" />
                <span className="text-slate-300">Billboard Statis</span>
              </div>
            </>
          )}

          {showBaseline && (
            <div className="flex items-center gap-2">
              <span className="w-3 border-t-2 border-dashed border-slate-500" />
              <span className="text-slate-400">Garis Baseline Normal</span>
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBreakdown}
              onChange={(e) => setShowBreakdown(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span>Breakdown Format (DOOH vs Statis)</span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBaseline}
              onChange={(e) => setShowBaseline(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span>Garis Baseline</span>
          </label>
        </div>
      </div>

      {/* Line Chart Canvas */}
      <div className="h-80 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="growthTotalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="monthLabel" 
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={11} 
              tickFormatter={(val) => formatCompactNumber(val)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const dataPoint = payload[0].payload as MonthlyDataPoint;
                return (
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-2 max-w-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-white text-sm">{label}</span>
                      {dataPoint.isSurge && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" />
                          {dataPoint.surgeTag || 'Lonjakan'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 font-mono">
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span className="font-sans text-slate-300">Total Impresi Harian:</span>
                        <span>{dataPoint.totalImpressions.toLocaleString('id-ID')} OTS</span>
                      </div>
                      {showBreakdown && (
                        <>
                          <div className="flex items-center justify-between text-purple-400">
                            <span className="font-sans text-slate-400">DOOH Videotron:</span>
                            <span>{dataPoint.doohImpressions.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center justify-between text-blue-400">
                            <span className="font-sans text-slate-400">Billboard Statis:</span>
                            <span>{dataPoint.staticImpressions.toLocaleString('id-ID')}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                        <span className="font-sans">Variasi vs Baseline:</span>
                        <span className={dataPoint.growthRatePct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          {dataPoint.growthRatePct >= 0 ? `+${dataPoint.growthRatePct}%` : `${dataPoint.growthRatePct}%`}
                        </span>
                      </div>
                    </div>

                    {dataPoint.surgeDescription && (
                      <div className="text-[11px] text-amber-200/90 bg-amber-950/40 p-2 rounded border border-amber-800/40 font-sans leading-relaxed">
                        <strong>{dataPoint.surgeLabel}:</strong> {dataPoint.surgeDescription}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Baseline Reference Line */}
            {showBaseline && baseMetrics.totalDaily > 0 && (
              <ReferenceLine 
                y={baseMetrics.totalDaily} 
                stroke="#64748b" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: 'Baseline Normal', 
                  fill: '#94a3b8', 
                  fontSize: 10, 
                  position: 'insideBottomRight' 
                }} 
              />
            )}

            {/* DOOH Line */}
            {showBreakdown && (
              <Line 
                type="monotone" 
                dataKey="doohImpressions" 
                name="DOOH Videotron" 
                stroke="#c084fc" 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#c084fc' }}
                activeDot={{ r: 6 }} 
              />
            )}

            {/* Static Billboard Line */}
            {showBreakdown && (
              <Line 
                type="monotone" 
                dataKey="staticImpressions" 
                name="Billboard Statis" 
                stroke="#60a5fa" 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#60a5fa' }}
                activeDot={{ r: 6 }} 
              />
            )}

            {/* Primary Total Daily Impressions Line */}
            <Line 
              type="monotone" 
              dataKey="totalImpressions" 
              name="Total Impresi Harian" 
              stroke="#10b981" 
              strokeWidth={3.5} 
              dot={(props: any) => {
                const isSurge = props.payload?.isSurge;
                if (isSurge) {
                  return (
                    <circle
                      key={`dot-${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle
                    key={`dot-${props.cx}-${props.cy}`}
                    cx={props.cx}
                    cy={props.cy}
                    r={3.5}
                    fill="#10b981"
                  />
                );
              }}
              activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2, fill: '#10b981' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Seasonal Surges Timeline Cards (Penjelasan Lonjakan Musiman untuk Pengiklan) */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Peta Kalender Lonjakan Musiman (*Seasonal Surges Calendar*)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Titik oranye pada grafik menandakan periode impresi puncak
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Surge 1: Ramadhan & Mudik */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Maret - April
              </span>
              <span className="font-mono text-emerald-400 font-bold text-xs">+36% - +48%</span>
            </div>
            <div className="font-bold text-white text-xs">
              Ramadhan & Puncak Mudik Lebaran
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Arus kendaraan masif di Tol Pasteur, Padalarang, dan arteri Cileunyi/Nagreg. Waktu emas produk retail, FMCG, telekomunikasi & otomotif.
            </p>
          </div>

          {/* Surge 2: Libur Sekolah & Turis */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-blue-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Juni - Juli
              </span>
              <span className="font-mono text-blue-400 font-bold text-xs">+20% - +25%</span>
            </div>
            <div className="font-bold text-white text-xs">
              Libur Sekolah & Wisata Liburan
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kepadatan tinggi di koridor komersial (Jl. Riau, Dago, Sukajadi, Asia Afrika). Lonjakan audiens keluarga dan wisatawan Jabodetabek.
            </p>
          </div>

          {/* Surge 3: Back to Campus */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Agustus - September
              </span>
              <span className="font-mono text-purple-400 font-bold text-xs">+18% - +28%</span>
            </div>
            <div className="font-bold text-white text-xs">
              Tahun Ajaran Baru (Back to Campus)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Masuknya ratusan ribu mahasiswa ITB, Unpad, Unpar, Telkom, Unikom di koridor Dipatiukur, Ganesha, dan Jatinangor. Optimal untuk Gen-Z marketing.
            </p>
          </div>

          {/* Surge 4: Libur Akhir Tahun / Nataru */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Desember
              </span>
              <span className="font-mono text-amber-400 font-bold text-xs">+30% - +38%</span>
            </div>
            <div className="font-bold text-white text-xs">
              Puncak Nataru (Natal & Tahun Baru)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Puncak okupansi jalan protokol, mall, dan gerbang masuk kota. Periode perebutan slot inventaris paling kompetitif di Jawa Barat.
            </p>
          </div>
        </div>
      </div>

      {/* Strategic Media Planning Advice */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-emerald-400">Rekomendasi Strategis Media Planner:</span>{' '}
          Untuk memaksimalkan efisiensi biaya CPM saat periode puncak (*seasonal surges*), disarankan melakukan <em>booking reservation</em> minimal <strong>30-45 hari sebelum masa lonjakan</strong>. Titik media di jalur arteri tol dan kawasan komersial biasanya mengalami lonjakan pemesanan hingga <em>sold out</em> lebih cepat menjelang kuartal perayaan.
        </div>
      </div>

    </div>
  );
};
