import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Camera,
  Loader2,
  Sliders,
  ChevronRight,
  Building2,
  AlertCircle,
  MapPin,
  ExternalLink,
  Flame,
  Info,
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatCompactIDR, formatCompactNumber, formatIDR } from '../utils/formatters';
import {
  calculateRevenueSummary,
  generateMonthlyProjections,
  identifyGrowthOpportunities,
  calculateCorridorBreakdown,
  generateRevenueForecastWhatsAppText,
  ForecastScenario,
  RevenueGrowthOpportunity,
} from '../services/revenueForecastingService';
import { exportChartElementAsPng } from '../utils/chartExport';
import { BUSINESS_WA_NUMBER } from '../utils/whatsapp';

interface RevenueForecastingWidgetProps {
  spots: MediaSpot[];
  activeRegion?: string;
  onSelectSpot: (spot: MediaSpot) => void;
  onNavigateToPlanner?: () => void;
  onNavigateToRoi?: () => void;
}

export const RevenueForecastingWidget: React.FC<RevenueForecastingWidgetProps> = ({
  spots,
  activeRegion = 'Jawa Barat',
  onSelectSpot,
  onNavigateToPlanner,
  onNavigateToRoi,
}) => {
  // Scenario state
  const [scenario, setScenario] = useState<ForecastScenario>('REALISTIC');
  const [activeTab, setActiveTab] = useState<'FORECAST_CHART' | 'OPPORTUNITIES' | 'CORRIDOR_BREAKDOWN' | 'WHAT_IF_SIMULATOR'>('FORECAST_CHART');
  
  // What-If Simulator sliders
  const summary = useMemo(() => calculateRevenueSummary(spots), [spots]);
  const [simTargetOccupancy, setSimTargetOccupancy] = useState<number>(() => Math.min(95, Math.max(summary.currentOccupancyRate + 15, 80)));
  const [simRateMultiplier, setSimRateMultiplier] = useState<number>(1.05); // +5% dynamic pricing

  // Export & copy states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Filtered / computed projections
  const projections = useMemo(() => {
    return generateMonthlyProjections(spots, scenario, {
      targetOccupancy: simTargetOccupancy,
      rateMultiplier: simRateMultiplier,
    });
  }, [spots, scenario, simTargetOccupancy, simRateMultiplier]);

  // Growth opportunities
  const opportunities = useMemo(() => identifyGrowthOpportunities(spots), [spots]);

  // Corridor breakdown
  const corridorBreakdown = useMemo(() => calculateCorridorBreakdown(spots), [spots]);

  // What-If simulation results
  const simulatedMonthlyRevenue = useMemo(() => {
    const totalPotentialAtTarget = summary.totalCapacityMonthly * (simTargetOccupancy / 100) * simRateMultiplier;
    return Math.round(totalPotentialAtTarget);
  }, [summary, simTargetOccupancy, simRateMultiplier]);

  const simulatedDeltaMonthly = simulatedMonthlyRevenue - summary.contractedMonthlyRevenue;
  const simulatedDeltaAnnual = simulatedDeltaMonthly * 12;

  // Chart data formatted for Recharts (values in Millions IDR for clean readable axis)
  const chartData = useMemo(() => {
    return projections.map((p) => ({
      name: p.monthLabel,
      fullLabel: `${p.monthLabel} (${p.seasonalityNote})`,
      contracted: Math.round(p.contractedRevenue / 1_000_000),
      pipeline: Math.round(p.projectedPipelineRevenue / 1_000_000),
      totalProjected: Math.round(p.totalProjectedRevenue / 1_000_000),
      targetCapacity: Math.round(p.targetPotentialRevenue / 1_000_000),
      occupancy: p.projectedOccupancyRate,
      rawTotal: p.totalProjectedRevenue,
      seasonalityMultiplier: p.seasonalityMultiplier,
      seasonalityNote: p.seasonalityNote,
    }));
  }, [projections]);

  // Average projected monthly revenue over next 6 months
  const avgProjectedMonthly = useMemo(() => {
    if (projections.length === 0) return 0;
    const total = projections.reduce((acc, p) => acc + p.totalProjectedRevenue, 0);
    return Math.round(total / projections.length);
  }, [projections]);

  const projectedGrowthPercent = summary.contractedMonthlyRevenue > 0
    ? Math.round(((avgProjectedMonthly - summary.contractedMonthlyRevenue) / summary.contractedMonthlyRevenue) * 100)
    : 0;

  // Handle PNG Export
  const handleExportChart = async () => {
    setIsExporting(true);
    try {
      await exportChartElementAsPng('chart-card-revenue-forecasting-suite', `Suherman-OOH-Revenue-Forecast-${activeRegion}`, {
        scale: 2,
        backgroundColor: '#ffffff',
        regionName: activeRegion,
      });
      setCopyToast('Grafik Proyeksi Pendapatan berhasil diunduh sebagai gambar PNG HD!');
      setTimeout(() => setCopyToast(null), 4000);
    } catch (err) {
      console.error('Export revenue chart error:', err);
      setCopyToast('Gagal mengunduh gambar. Silakan coba kembali.');
      setTimeout(() => setCopyToast(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle WhatsApp Copy / Share
  const handleCopyWhatsAppForecast = () => {
    const text = generateRevenueForecastWhatsAppText(spots, scenario, projections, opportunities);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyToast('Ringkasan Proyeksi Pendapatan disalin ke clipboard!');
      setTimeout(() => setCopyToast(null), 3500);
    }
  };

  const handleOpenWhatsAppForecast = () => {
    const text = generateRevenueForecastWhatsAppText(spots, scenario, projections, opportunities);
    const encoded = encodeURIComponent(text);
    window.open(`https://web.whatsapp.com/send?phone=${BUSINESS_WA_NUMBER}&text=${encoded}`, '_blank');
  };

  return (
    <div
      id="revenue-forecasting-widget"
      data-testid="revenue-forecasting-widget"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0"
    >
      {/* Toast Alert */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border bg-slate-900 text-emerald-300 border-emerald-500/50 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Widget Header Strip */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 border-b border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Revenue Intelligence Engine
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <Calendar className="w-3 h-3 text-indigo-400" />
                Proyeksi 6 Bulan Mendatang
              </span>
              <span className="text-xs text-slate-400">
                Wilayah: <strong className="text-slate-200">{activeRegion}</strong>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Proyeksi Pendapatan & Pertumbuhan Omzet OOH</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Model prediksi arus kas berbasis tingkat okupansi titik reklame, tarif historis komitmen sewa (1-12 bulan),
              bobot konversi pipeline CRM, serta indeks musiman belanja iklan Jawa Barat.
            </p>
          </div>

          {/* Quick Share & Export Tools */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
            <button
              type="button"
              onClick={handleCopyWhatsAppForecast}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-xs cursor-pointer active:scale-95"
              title="Salin ringkasan proyeksi untuk laporan manajemen atau chat WhatsApp"
            >
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>Salin Ringkasan</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsAppForecast}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Buka WhatsApp Web dan kirim proyeksi pendapatan ke 0878-2224-8975"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Kirim via WA</span>
            </button>

            <button
              type="button"
              onClick={handleExportChart}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Unduh visualisasi proyeksi pendapatan ini sebagai gambar PNG HD"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span>Unduh PNG</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
          {/* Card 1: Contracted Revenue (Current MRR) */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-medium">Omzet Terkontrak (MRR)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-emerald-400 truncate">
              {formatCompactIDR(summary.contractedMonthlyRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{summary.occupiedSpots} Titik Tersewa</span>
              <span className="text-emerald-300 font-semibold">{summary.currentOccupancyRate}% Okupansi</span>
            </div>
          </div>

          {/* Card 2: Unrealized Potential (Vacant Slots) */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-medium">Potensi Tertahan (Kosong)</span>
              <span className="text-amber-400 text-[10px] font-bold">Untapped</span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-amber-400 truncate">
              {formatCompactIDR(summary.unrealizedPotentialMonthly)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{summary.availableSpots} Titik Tersedia</span>
              <span className="text-amber-300 font-semibold">Siap Dijual</span>
            </div>
          </div>

          {/* Card 3: Total Gross Capacity (100% Occupancy) */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-medium">Kapasitas Gross 100%</span>
              <span className="text-blue-400 text-[10px]">Plafon Maks</span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-blue-300 truncate">
              {formatCompactIDR(summary.totalCapacityMonthly)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Total {summary.totalSpots} Titik Media</span>
              <span className="text-blue-300 font-semibold">100% Kapasitas</span>
            </div>
          </div>

          {/* Card 4: 6-Month Projected Average */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-medium">Proyeksi Rata-rata 6 Bln</span>
              <span className="inline-flex items-center text-emerald-400 text-[10px] font-bold">
                +{projectedGrowthPercent}%
              </span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-indigo-300 truncate">
              {formatCompactIDR(avgProjectedMonthly)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Efek Musim & Pipeline</span>
              <span className="text-indigo-300 font-semibold">Rata-rata/Bln</span>
            </div>
          </div>

          {/* Card 5: Annualized Run Rate (ARR) */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-purple-500/40 transition-colors col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-medium">Run-Rate Tahunan (ARR)</span>
              <span className="text-purple-400 text-[10px]">Annualized</span>
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-purple-300 truncate">
              {formatCompactIDR(summary.annualizedContractedRunRate)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Target 85%: {formatCompactIDR(summary.annualizedTargetRunRate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Navigation & Scenario Toolbar */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* View Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('FORECAST_CHART')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'FORECAST_CHART'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Grafik Proyeksi 6 Bulan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OPPORTUNITIES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'OPPORTUNITIES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Peluang Pertumbuhan ({opportunities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WHAT_IF_SIMULATOR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'WHAT_IF_SIMULATOR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulator What-If</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CORRIDOR_BREAKDOWN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'CORRIDOR_BREAKDOWN'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Sebaran Wilayah & Koridor</span>
          </button>
        </div>

        {/* Scenario Selectors (applicable in Chart & Growth views) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden md:inline">Skenario:</span>
          {(['CONSERVATIVE', 'REALISTIC', 'AGGRESSIVE', 'CUSTOM'] as ForecastScenario[]).map((sc) => {
            const labelMap = {
              CONSERVATIVE: 'Konservatif (65%)',
              REALISTIC: 'Realistis (80%)',
              AGGRESSIVE: 'Agresif (92%)',
              CUSTOM: 'Kustom',
            };
            const isActive = scenario === sc;
            return (
              <button
                key={sc}
                type="button"
                onClick={() => setScenario(sc)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {labelMap[sc]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container Wrapper for Screenshot / Export */}
      <div id="chart-card-revenue-forecasting-suite" className="p-5 space-y-6 bg-white">
        
        {/* TAB 1: FORECAST CHART VIEW */}
        {activeTab === 'FORECAST_CHART' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Trajektori Proyeksi Pendapatan Bulanan (Jawa Barat)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Kombinasi pendapatan terkontrak eksisting, konversi pipeline prospek baru, dan target kapasitas 85%
                </p>
              </div>

              {/* Legend & Summary Notes */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600" /> Kontrak Terjamin (MRR)
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-indigo-500" /> Inflow Pipeline & Booking Baru
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-0.5 bg-amber-500" /> Target Plafon (85%)
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-blue-600" /> Proyeksi Okupansi (%)
                </span>
              </div>
            </div>

            {/* Recharts Composed Chart (Stacked Bar + Target Line + Occupancy %) */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  {/* Left Y Axis: Revenue in Millions IDR */}
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(val) => `Rp ${val} Jt`}
                  />
                  {/* Right Y Axis: Occupancy Rate % */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="#3b82f6"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs space-y-2 min-w-[240px]">
                            <div className="border-b border-slate-800 pb-1.5">
                              <div className="font-bold text-sm text-indigo-300">{data.fullLabel}</div>
                              <div className="text-[10px] text-emerald-400 font-medium">
                                Indeks Musim: {(data.seasonalityMultiplier * 100).toFixed(0)}% ({data.seasonalityNote})
                              </div>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex justify-between text-slate-300">
                                <span>Kontrak Terjamin:</span>
                                <span className="font-mono font-bold text-emerald-400">Rp {data.contracted} Juta</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>Inflow Pipeline/Baru:</span>
                                <span className="font-mono font-bold text-indigo-400">Rp {data.pipeline} Juta</span>
                              </div>
                              <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                                <span>Total Proyeksi Omzet:</span>
                                <span className="font-mono text-emerald-300">Rp {data.totalProjected} Juta</span>
                              </div>
                              <div className="flex justify-between text-amber-300 text-[10px] pt-0.5">
                                <span>Target Plafon Optimal:</span>
                                <span className="font-mono">Rp {data.targetCapacity} Juta</span>
                              </div>
                              <div className="flex justify-between text-blue-300 text-[10px] pt-0.5">
                                <span>Estimasi Okupansi:</span>
                                <span className="font-mono font-bold">{data.occupancy}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Stacked Bars: Contracted MRR + Projected Pipeline */}
                  <Bar
                    yAxisId="left"
                    dataKey="contracted"
                    name="Kontrak Terjamin"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="pipeline"
                    name="Pipeline & Booking Baru"
                    stackId="a"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  {/* Target Revenue Line */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="targetCapacity"
                    name="Target Potensi Optimal"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  {/* Projected Occupancy Line on Right Axis */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="occupancy"
                    name="Proyeksi Okupansi (%)"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#3b82f6' }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Forecast Projection Breakdown Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Bulan</th>
                    <th className="py-2.5 px-3">Indeks Musiman & Momentum</th>
                    <th className="py-2.5 px-3 text-right">Kontrak Berjalan</th>
                    <th className="py-2.5 px-3 text-right">Est. Booking Baru</th>
                    <th className="py-2.5 px-3 text-right">Total Proyeksi</th>
                    <th className="py-2.5 px-3 text-center">Okupansi</th>
                    <th className="py-2.5 px-3 text-right">Peluang Tertahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {projections.map((p, idx) => (
                    <tr key={p.monthKey} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        {p.monthLabel}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              p.seasonalityMultiplier >= 1.2
                                ? 'bg-rose-100 text-rose-700'
                                : p.seasonalityMultiplier >= 1.05
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {(p.seasonalityMultiplier * 100).toFixed(0)}%
                          </span>
                          <span>{p.seasonalityNote}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                        {formatCompactIDR(p.contractedRevenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-600 font-semibold">
                        +{formatCompactIDR(p.projectedPipelineRevenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCompactIDR(p.totalProjectedRevenue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {p.projectedOccupancyRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 font-medium">
                        {formatCompactIDR(p.opportunityGap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: GROWTH OPPORTUNITIES LEVERS VIEW */}
        {activeTab === 'OPPORTUNITIES' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Peluang Pertumbuhan Pendapatan Teridentifikasi (Actionable Growth Levers)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Rekomendasi strategis untuk meningkatkan okupansi dan monetisasi ruang iklan tanpa biaya modal baru
                </p>
              </div>

              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                Total Potensi Tambahan: +{formatCompactIDR(opportunities.reduce((acc, o) => acc + o.potentialMonthlyUplift, 0))}/bulan
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp) => {
                const isCritical = opp.priority === 'CRITICAL';
                return (
                  <div
                    key={opp.id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-md flex flex-col justify-between ${
                      isCritical
                        ? 'bg-amber-50/50 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCritical ? 'bg-amber-500 text-slate-950' : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {opp.badge}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Keyakinan: {opp.confidence === 'VERY_HIGH' ? 'Sangat Tinggi' : opp.confidence === 'HIGH' ? 'Tinggi' : 'Strategis'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-extrabold text-sm text-emerald-600">
                            {opp.metricLabel}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ~{formatCompactIDR(opp.annualizedUplift)}/tahun
                          </div>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1.5 leading-snug">
                        {opp.title}
                      </h4>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        {opp.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80">
                      <div className="text-[11px] text-slate-700 bg-slate-100 p-2.5 rounded-lg mb-3 flex items-start gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-indigo-900 font-semibold">Tindakan Rekomendasi:</strong>{' '}
                          <span>{opp.actionRecommendation}</span>
                        </div>
                      </div>

                      {/* Related Spots Chips with 1-click preview */}
                      {opp.relatedSpotIds.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Titik Terkait:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {opp.relatedSpotIds.map((sId) => {
                              const found = spots.find((s) => s.id === sId);
                              if (!found) return null;
                              return (
                                <button
                                  key={sId}
                                  type="button"
                                  onClick={() => onSelectSpot(found)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded text-[11px] text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                                  title={`Lihat detail titik "${found.name}"`}
                                >
                                  <MapPin className="w-3 h-3 text-indigo-500" />
                                  <span className="font-medium truncate max-w-[180px]">{found.name}</span>
                                  <span className="font-mono text-[10px] text-emerald-600 font-bold">
                                    {formatCompactIDR(found.pricing.oneMonth)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: WHAT-IF SIMULATOR VIEW */}
        {activeTab === 'WHAT_IF_SIMULATOR' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Kalkulator Simulasi Pendapatan What-If Dinamis</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Uji dampak finansial dari peningkatan rasio okupansi dan penyesuaian tarif dinamis terhadap arus kas bulanan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimTargetOccupancy(85);
                    setSimRateMultiplier(1.05);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Reset Standar (85% / +5%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sliders Panel */}
              <div className="lg:col-span-2 space-y-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
                {/* Slider 1: Target Occupancy */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span>Target Rasio Okupansi Inventaris:</span>
                    </label>
                    <span className="font-mono text-base font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {simTargetOccupancy}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="1"
                    value={simTargetOccupancy}
                    onChange={(e) => setSimTargetOccupancy(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Okupansi Saat Ini ({summary.currentOccupancyRate}%)</span>
                    <span>Target Standar Industri (80%)</span>
                    <span>Penuh 100% (Semua Titik Terisi)</span>
                  </div>
                </div>

                {/* Slider 2: Rate Card Multiplier / Dynamic Pricing */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Penyesuaian Tarif Sewa (Dynamic Yield):</span>
                    </label>
                    <span className="font-mono text-base font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {simRateMultiplier >= 1 ? `+${Math.round((simRateMultiplier - 1) * 100)}%` : `${Math.round((simRateMultiplier - 1) * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.85"
                    max="1.30"
                    step="0.01"
                    value={simRateMultiplier}
                    onChange={(e) => setSimRateMultiplier(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Diskon Promosi (-15%)</span>
                    <span>Tarif Dasar Normal (0%)</span>
                    <span>Surge Premium High Season (+30%)</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200/80 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Simulasi ini memperhitungkan kapasitas portofolio sebesar <strong>{formatIDR(summary.totalCapacityMonthly)}</strong>/bulan
                    pada {summary.totalSpots} titik media di Jawa Barat.
                  </span>
                </div>
              </div>

              {/* Simulation Result Card */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Hasil Proyeksi What-If
                  </span>

                  <div className="mt-3">
                    <div className="text-xs text-slate-300">Hasil Omzet Bulanan Simulasi:</div>
                    <div className="text-2xl font-mono font-extrabold text-emerald-400 mt-0.5">
                      {formatIDR(simulatedMonthlyRevenue)}
                    </div>
                    <div className="text-[11px] text-slate-400">per bulan (vs {formatCompactIDR(summary.contractedMonthlyRevenue)} saat ini)</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Pertambahan Bulanan:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {simulatedDeltaMonthly >= 0 ? `+${formatIDR(simulatedDeltaMonthly)}` : formatIDR(simulatedDeltaMonthly)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Pertambahan Tahunan:</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {simulatedDeltaAnnual >= 0 ? `+${formatCompactIDR(simulatedDeltaAnnual)}` : formatCompactIDR(simulatedDeltaAnnual)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  {onNavigateToPlanner && (
                    <button
                      type="button"
                      onClick={onNavigateToPlanner}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
                    >
                      Buka Media Planner
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CORRIDOR GEOGRAPHIC BREAKDOWN VIEW */}
        {activeTab === 'CORRIDOR_BREAKDOWN' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Sebaran Potensi Pendapatan per Wilayah & Kota</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Konsentrasi pendapatan terkontrak vs peluang pendapatan belum terisi di koridor strategis Jawa Barat
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {corridorBreakdown.map((corridor) => (
                <div
                  key={corridor.city}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-slate-900 truncate">
                      {corridor.city}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {corridor.occupancyPercent}% Okupansi
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Titik:</span>
                      <span className="font-bold text-slate-900">{corridor.totalSpots} ({corridor.occupiedSpots} Tersewa / {corridor.availableSpots} Kosong)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Omzet Terkontrak:</span>
                      <span className="font-mono font-semibold text-emerald-600">
                        {formatCompactIDR(corridor.currentContractedRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peluang Tersedia:</span>
                      <span className="font-mono font-semibold text-amber-600">
                        {formatCompactIDR(corridor.untappedPotentialRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                      <span>Kapasitas Gross:</span>
                      <span className="font-mono">
                        {formatCompactIDR(corridor.totalGrossCapacity)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${corridor.occupancyPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
