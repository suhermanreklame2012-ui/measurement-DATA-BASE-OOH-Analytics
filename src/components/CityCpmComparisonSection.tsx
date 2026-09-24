import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Scale, 
  TrendingUp, 
  DollarSign, 
  Award, 
  ArrowRight, 
  ArrowLeftRight, 
  CheckCircle2, 
  Sparkles, 
  Camera, 
  Loader2, 
  Info, 
  ExternalLink, 
  Copy, 
  Check, 
  Zap,
  BarChart2,
  Layers,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend, 
  Cell 
} from 'recharts';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { exportChartElementAsPng } from '../utils/chartExport';

interface CityCpmComparisonSectionProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
}

export const CityCpmComparisonSection: React.FC<CityCpmComparisonSectionProps> = ({
  spots,
  onSelectSpot
}) => {
  // Extract all unique cities that have at least 1 spot
  const availableCities = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    spots.forEach((s) => {
      if (s.city) {
        cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
      }
    });

    return Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by number of spots descending
      .map(([cityName]) => cityName);
  }, [spots]);

  // Default selection: top 2 cities by spots count (e.g. "Kota Bandung" & "Cimahi" or first two)
  const [cityA, setCityA] = useState<string>(() => availableCities[0] || 'Kota Bandung');
  const [cityB, setCityB] = useState<string>(() => availableCities[1] || 'Cimahi');

  // Format filter toggle: 'ALL' | 'DOOH_DIGITAL' | 'OOH_STATIC'
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'DOOH_DIGITAL' | 'OOH_STATIC'>('ALL');

  // Export & copy states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Helper: Calculate CPM for a spot
  // CPM = (Biaya Sewa 1 Bulan / (Impresi Harian * 30)) * 1000
  const calculateSpotCpm = (spot: MediaSpot): number => {
    const monthlyImpressions = spot.dailyImpressions * 30;
    if (monthlyImpressions <= 0) return 0;
    return Math.round((spot.pricing.oneMonth / monthlyImpressions) * 1000);
  };

  // Helper: Aggregate city metrics
  const getCityMetrics = (cityName: string) => {
    let citySpots = spots.filter((s) => s.city === cityName);
    if (formatFilter !== 'ALL') {
      citySpots = citySpots.filter((s) => s.category === formatFilter);
    }

    if (citySpots.length === 0) return null;

    const totalMonthlyCost = citySpots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);
    const totalDailyImpressions = citySpots.reduce((acc, s) => acc + s.dailyImpressions, 0);
    const totalDailyTraffic = citySpots.reduce((acc, s) => acc + s.dailyTraffic, 0);
    const totalMonthlyImpressions = totalDailyImpressions * 30;

    // Weighted City CPM = (Total Monthly Cost / Total Monthly Impresi) * 1000
    const weightedCpm = totalMonthlyImpressions > 0 
      ? Math.round((totalMonthlyCost / totalMonthlyImpressions) * 1000)
      : 0;

    // Spot ranking by CPM (Lowest CPM = Best Bargain)
    const spotsWithCpm = citySpots.map((s) => ({
      spot: s,
      cpm: calculateSpotCpm(s)
    })).sort((a, b) => a.cpm - b.cpm);

    const avgSpotCpm = Math.round(
      spotsWithCpm.reduce((acc, curr) => acc + curr.cpm, 0) / citySpots.length
    );

    const bestValueSpot = spotsWithCpm[0]; // Spot with lowest CPM
    const highestTrafficSpot = [...citySpots].sort((a, b) => b.dailyTraffic - a.dailyTraffic)[0];

    const avgMonthlyCost = Math.round(totalMonthlyCost / citySpots.length);
    const avgVisibility = Math.round(
      citySpots.reduce((acc, s) => acc + s.visibilityScore, 0) / citySpots.length
    );
    const availableCount = citySpots.filter((s) => s.isAvailable).length;
    const occupancyRate = Math.round(((citySpots.length - availableCount) / citySpots.length) * 100);

    // Format breakdown
    const doohSpots = citySpots.filter((s) => s.category === 'DOOH_DIGITAL');
    const staticSpots = citySpots.filter((s) => s.category === 'OOH_STATIC');

    const doohMonthlyCost = doohSpots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);
    const doohMonthlyImpr = doohSpots.reduce((acc, s) => acc + s.dailyImpressions * 30, 0);
    const doohCpm = doohMonthlyImpr > 0 ? Math.round((doohMonthlyCost / doohMonthlyImpr) * 1000) : null;

    const staticMonthlyCost = staticSpots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);
    const staticMonthlyImpr = staticSpots.reduce((acc, s) => acc + s.dailyImpressions * 30, 0);
    const staticCpm = staticMonthlyImpr > 0 ? Math.round((staticMonthlyCost / staticMonthlyImpr) * 1000) : null;

    return {
      cityName,
      spots: citySpots,
      totalSpots: citySpots.length,
      availableCount,
      occupancyRate,
      totalMonthlyCost,
      avgMonthlyCost,
      totalDailyImpressions,
      totalMonthlyImpressions,
      totalDailyTraffic,
      avgVisibility,
      weightedCpm,
      avgSpotCpm,
      bestValueSpot,
      highestTrafficSpot,
      doohCount: doohSpots.length,
      staticCount: staticSpots.length,
      doohCpm,
      staticCpm
    };
  };

  const metricsA = useMemo(() => getCityMetrics(cityA), [cityA, spots, formatFilter]);
  const metricsB = useMemo(() => getCityMetrics(cityB), [cityB, spots, formatFilter]);

  // Efficiency comparison analysis
  const comparison = useMemo(() => {
    if (!metricsA || !metricsB || metricsA.weightedCpm === 0 || metricsB.weightedCpm === 0) {
      return null;
    }

    const isAEfficient = metricsA.weightedCpm < metricsB.weightedCpm;
    const isTie = metricsA.weightedCpm === metricsB.weightedCpm;

    const winner = isAEfficient ? metricsA : metricsB;
    const runnerUp = isAEfficient ? metricsB : metricsA;

    const cpmDelta = Math.abs(metricsA.weightedCpm - metricsB.weightedCpm);
    const percentageCheaper = runnerUp.weightedCpm > 0 
      ? Math.round(((runnerUp.weightedCpm - winner.weightedCpm) / runnerUp.weightedCpm) * 1000) / 10
      : 0;

    // Savings per 1 Million Impresi OTS
    const savingsPerMillion = cpmDelta * 1000;

    return {
      isTie,
      winner,
      runnerUp,
      isAEfficient,
      cpmDelta,
      percentageCheaper,
      savingsPerMillion
    };
  }, [metricsA, metricsB]);

  // Swap cities function
  const handleSwapCities = () => {
    const temp = cityA;
    setCityA(cityB);
    setCityB(temp);
  };

  // Recharts grouped bar data for side-by-side visualization
  const comparisonChartData = useMemo(() => {
    if (!metricsA || !metricsB) return [];

    return [
      {
        metric: 'Biaya CPM (Rp / 1.000 Impresi)',
        [cityA]: metricsA.weightedCpm,
        [cityB]: metricsB.weightedCpm,
        isCpm: true
      },
      {
        metric: 'Tarif Rata-rata (Juta Rp / bln)',
        [cityA]: Math.round(metricsA.avgMonthlyCost / 1_000_000),
        [cityB]: Math.round(metricsB.avgMonthlyCost / 1_000_000),
        isCpm: false
      },
      {
        metric: 'Impresi Harian (Ribu OTS)',
        [cityA]: Math.round(metricsA.totalDailyImpressions / 1_000),
        [cityB]: Math.round(metricsB.totalDailyImpressions / 1_000),
        isCpm: false
      }
    ];
  }, [metricsA, metricsB, cityA, cityB]);

  // Quick export chart as PNG
  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      await exportChartElementAsPng(
        'city-cpm-comparison-container', 
        `Perbandingan-CPM-${cityA}-vs-${cityB}`,
        {
          scale: 2,
          backgroundColor: '#0f172a',
          regionName: `${cityA} vs ${cityB}`
        }
      );
      setExportNotice('Grafik perbandingan kota berhasil diekspor!');
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err) {
      console.error('Export failed:', err);
      setExportNotice('Gagal mengekspor perbandingan.');
      setTimeout(() => setExportNotice(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy textual summary to clipboard
  const handleCopySummary = () => {
    if (!metricsA || !metricsB || !comparison) return;

    const text = `📊 ANALISIS PERBANDINGAN CPM TITIK MEDIA ANTAR KOTA
OOH & DOOH Analytics Jawa Barat
==================================================
Kota A: ${cityA}
- Titik Media: ${metricsA.totalSpots} lokasi
- Biaya per 1.000 Impresi (CPM): Rp ${metricsA.weightedCpm.toLocaleString('id-ID')}
- Total Impresi Bulanan: ${formatCompactNumber(metricsA.totalMonthlyImpressions)} OTS
- Rata-rata Tarif Sewa / Bln: ${formatIDR(metricsA.avgMonthlyCost)}

Kota B: ${cityB}
- Titik Media: ${metricsB.totalSpots} lokasi
- Biaya per 1.000 Impresi (CPM): Rp ${metricsB.weightedCpm.toLocaleString('id-ID')}
- Total Impresi Bulanan: ${formatCompactNumber(metricsB.totalMonthlyImpressions)} OTS
- Rata-rata Tarif Sewa / Bln: ${formatIDR(metricsB.avgMonthlyCost)}
--------------------------------------------------
🏆 KESIMPULAN EFISIENSI BIAYA (CPM):
${comparison.winner.cityName} LEBIH EFISIEN ${comparison.percentageCheaper}% dibandingkan ${comparison.runnerUp.cityName}!
Selisih Biaya: Rp ${comparison.cpmDelta.toLocaleString('id-ID')} per 1.000 tayang.
Potensi Penghematan: ${formatIDR(comparison.savingsPerMillion)} per 1 Juta Impresi OTS.
==================================================`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <section 
      id="city-cpm-comparison-section" 
      data-testid="city-cpm-comparison-section" 
      className="space-y-6 pt-2"
    >
      {/* Toast Notification */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-emerald-300 border border-emerald-500/50 shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Main Card Container */}
      <div 
        id="city-cpm-comparison-container"
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 sm:p-7 space-y-6"
      >
        {/* Header & Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Scale className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Head-to-Head City Efficiency
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                Cost Per Mille (CPM)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Komparasi Titik Media Antar Dua Kota (Efisiensi CPM)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bandingkan biaya per seribu impresi (CPM OTS) secara berdampingan untuk mengoptimalkan alokasi anggaran kampanye iklan Anda.
            </p>
          </div>

          {/* Action buttons: Export PNG & Copy Summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Salin ringkasan komparasi ke clipboard"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Analisis</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh visual komparasi ini sebagai file gambar PNG (2x HD)"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span>Ekspor PNG (HD)</span>
            </button>
          </div>
        </div>

        {/* City Selector Bar & Format Filter */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* City Selection Inputs */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto flex-1 flex-wrap sm:flex-nowrap">
            {/* City A Select */}
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>Kota Pertama (A):</span>
              </label>
              <select
                value={cityA}
                onChange={(e) => setCityA(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
              >
                {availableCities.map((c) => (
                  <option key={`city-a-${c}`} value={c} disabled={c === cityB}>
                    {c} {c === cityB ? '(Dipilih di Kota B)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwapCities}
              className="mt-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer self-center"
              title="Tukar posisi Kota A dan Kota B"
            >
              <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            </button>

            {/* City B Select */}
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>Kota Kedua (B):</span>
              </label>
              <select
                value={cityB}
                onChange={(e) => setCityB(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500 transition-colors"
              >
                {availableCities.map((c) => (
                  <option key={`city-b-${c}`} value={c} disabled={c === cityA}>
                    {c} {c === cityA ? '(Dipilih di Kota A)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format Filter Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs w-full md:w-auto justify-center">
            <span className="text-[10px] text-slate-400 font-semibold px-2">Filter Format:</span>
            <button
              type="button"
              onClick={() => setFormatFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                formatFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Semua Format
            </button>
            <button
              type="button"
              onClick={() => setFormatFilter('DOOH_DIGITAL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                formatFilter === 'DOOH_DIGITAL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              DOOH Saja
            </button>
            <button
              type="button"
              onClick={() => setFormatFilter('OOH_STATIC')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                formatFilter === 'OOH_STATIC'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Statis Saja
            </button>
          </div>
        </div>

        {/* Executive Verdict Banner (Pemenang Efisiensi CPM) */}
        {comparison && !comparison.isTie && (
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                      Pemenang Efisiensi Biaya
                    </span>
                    <span className="text-xs font-bold text-emerald-300">
                      Lebih Hemat {comparison.percentageCheaper}%
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                    {comparison.winner.cityName} Memiliki CPM Lebih Efisien Dibanding {comparison.runnerUp.cityName}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Pengiklan membayar <strong className="text-emerald-400 font-mono">Rp {comparison.winner.weightedCpm.toLocaleString('id-ID')}</strong> per 1.000 impresi di <strong className="text-white">{comparison.winner.cityName}</strong>, dibandingkan <strong className="text-rose-300 font-mono">Rp {comparison.runnerUp.weightedCpm.toLocaleString('id-ID')}</strong> di <strong className="text-white">{comparison.runnerUp.cityName}</strong>.
                  </p>
                </div>
              </div>

              {/* Potential Savings Box */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-emerald-500/30 text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Estimasi Selisih Penghematan
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                  {formatIDR(comparison.savingsPerMillion)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Per 1 Juta Paparan Impresi (OTS)
                </div>
              </div>
            </div>
          </div>
        )}

        {comparison && comparison.isTie && (
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="font-bold text-white text-sm">
              Kedua kota memiliki tingkat efisiensi CPM yang seimbang (Rp {metricsA?.weightedCpm.toLocaleString('id-ID')}).
            </span>
          </div>
        )}

        {/* Side-by-Side Comparison Cards Grid (2 Columns) */}
        {metricsA && metricsB ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            
            {/* CITY A CARD */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
              comparison?.winner.cityName === cityA
                ? 'bg-slate-900/95 border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/80 border-slate-700/80'
            }`}>
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                    <h3 className="font-black text-lg text-white tracking-wide">
                      {cityA}
                    </h3>
                  </div>
                  {comparison?.winner.cityName === cityA && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Kota Paling Efisien
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {metricsA.totalSpots} Titik Media Aktif ({metricsA.doohCount} DOOH, {metricsA.staticCount} Statis)
                </p>
              </div>

              {/* Primary CPM Metric Highlight */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Weighted CPM Rata-rata:</span>
                  <span className="font-mono text-[10px] text-slate-500">Biaya / 1k OTS</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    Rp {metricsA.weightedCpm.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-400">/ 1.000 tayang</span>
                </div>

                {/* Progress bar visual relative to competitor */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, Math.max(15, (metricsA.weightedCpm / Math.max(metricsA.weightedCpm, metricsB.weightedCpm)) * 100))}%` 
                    }} 
                  />
                </div>
              </div>

              {/* Metrics Table */}
              <div className="divide-y divide-slate-800/80 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Rata-rata Tarif Sewa / Bln:</span>
                  <span className="font-bold text-white font-mono">{formatIDR(metricsA.avgMonthlyCost)}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Total Impresi Bulanan (OTS):</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatCompactNumber(metricsA.totalMonthlyImpressions)}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Traffic Kendaraan Harian:</span>
                  <span className="font-bold text-white font-mono">{formatCompactNumber(metricsA.totalDailyTraffic)} Unit</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Rata-rata Skor Visibilitas:</span>
                  <span className="font-bold text-amber-400 font-mono">{metricsA.avgVisibility} / 100</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Tingkat Keterisian (Occupancy):</span>
                  <span className="font-bold text-blue-400 font-mono">{metricsA.occupancyRate}% Tersewa</span>
                </div>
                {metricsA.doohCpm && (
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-400">CPM Khusus DOOH (Videotron):</span>
                    <span className="font-bold text-purple-400 font-mono">Rp {metricsA.doohCpm.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {metricsA.staticCpm && (
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-400">CPM Khusus Billboard Statis:</span>
                    <span className="font-bold text-blue-400 font-mono">Rp {metricsA.staticCpm.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              {/* Best Value Spot in City A */}
              {metricsA.bestValueSpot && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-300" />
                      Titik Paling Hemat di {cityA}:
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      CPM Rp {metricsA.bestValueSpot.cpm.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {metricsA.bestValueSpot.spot.name}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{metricsA.bestValueSpot.spot.roadName} ({metricsA.bestValueSpot.spot.mediaType})</span>
                    <span className="font-mono text-slate-300">{formatIDR(metricsA.bestValueSpot.spot.pricing.oneMonth)}/bln</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSpot(metricsA.bestValueSpot.spot)}
                    className="w-full mt-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Lihat Rincian Titik Ini</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* CITY B CARD */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
              comparison?.winner.cityName === cityB
                ? 'bg-slate-900/95 border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/80 border-slate-700/80'
            }`}>
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                    <h3 className="font-black text-lg text-white tracking-wide">
                      {cityB}
                    </h3>
                  </div>
                  {comparison?.winner.cityName === cityB && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Kota Paling Efisien
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {metricsB.totalSpots} Titik Media Aktif ({metricsB.doohCount} DOOH, {metricsB.staticCount} Statis)
                </p>
              </div>

              {/* Primary CPM Metric Highlight */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Weighted CPM Rata-rata:</span>
                  <span className="font-mono text-[10px] text-slate-500">Biaya / 1k OTS</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    Rp {metricsB.weightedCpm.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-400">/ 1.000 tayang</span>
                </div>

                {/* Progress bar visual relative to competitor */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, Math.max(15, (metricsB.weightedCpm / Math.max(metricsA.weightedCpm, metricsB.weightedCpm)) * 100))}%` 
                    }} 
                  />
                </div>
              </div>

              {/* Metrics Table */}
              <div className="divide-y divide-slate-800/80 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Rata-rata Tarif Sewa / Bln:</span>
                  <span className="font-bold text-white font-mono">{formatIDR(metricsB.avgMonthlyCost)}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Total Impresi Bulanan (OTS):</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatCompactNumber(metricsB.totalMonthlyImpressions)}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Traffic Kendaraan Harian:</span>
                  <span className="font-bold text-white font-mono">{formatCompactNumber(metricsB.totalDailyTraffic)} Unit</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Rata-rata Skor Visibilitas:</span>
                  <span className="font-bold text-amber-400 font-mono">{metricsB.avgVisibility} / 100</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-400">Tingkat Keterisian (Occupancy):</span>
                  <span className="font-bold text-blue-400 font-mono">{metricsB.occupancyRate}% Tersewa</span>
                </div>
                {metricsB.doohCpm && (
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-400">CPM Khusus DOOH (Videotron):</span>
                    <span className="font-bold text-purple-400 font-mono">Rp {metricsB.doohCpm.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {metricsB.staticCpm && (
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-400">CPM Khusus Billboard Statis:</span>
                    <span className="font-bold text-blue-400 font-mono">Rp {metricsB.staticCpm.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              {/* Best Value Spot in City B */}
              {metricsB.bestValueSpot && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-300" />
                      Titik Paling Hemat di {cityB}:
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      CPM Rp {metricsB.bestValueSpot.cpm.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {metricsB.bestValueSpot.spot.name}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{metricsB.bestValueSpot.spot.roadName} ({metricsB.bestValueSpot.spot.mediaType})</span>
                    <span className="font-mono text-slate-300">{formatIDR(metricsB.bestValueSpot.spot.pricing.oneMonth)}/bln</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSpot(metricsB.bestValueSpot.spot)}
                    className="w-full mt-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Lihat Rincian Titik Ini</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
            Tidak ada titik media yang ditemukan untuk kota yang dipilih dengan filter format saat ini.
          </div>
        )}

        {/* Comparison Bar Chart (Visualisasi Grafik Berdampingan) */}
        {comparisonChartData.length > 0 && (
          <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  Visualisasi Grafik Komparasi Metrik Kunci
                </h4>
                <p className="text-xs text-slate-400">
                  Perbandingan sisi demi sisi antara {cityA} vs {cityB}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {cityA}
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {cityB}
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => formatCompactNumber(val)} />
                  <Tooltip
                    formatter={(val: any) => [Number(val).toLocaleString('id-ID'), '']}
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', borderRadius: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey={cityA} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={cityB} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Informative Guidance & Recommendation */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-300">Tips Optimasi Media Planner:</span>{' '}
            Kota dengan nilai CPM yang lebih rendah memberikan efisiensi jangkauan audiens lebih tinggi per Rupiah investasi iklan. Namun, pertimbangkan juga faktor kesesuaian target audiens, visibilitas titik strategis, serta durasi sewa yang ditawarkan untuk mencapai hasil pemasaran OOH/DOOH yang optimal.
          </div>
        </div>

      </div>
    </section>
  );
};
