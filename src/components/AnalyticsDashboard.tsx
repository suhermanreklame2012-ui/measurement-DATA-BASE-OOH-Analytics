import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { 
  TrendingUp, 
  Activity, 
  Users, 
  Car, 
  DollarSign, 
  Zap, 
  Clock, 
  Building2,
  PieChart as PieIcon,
  ShieldCheck,
  Scale,
  Sparkles,
  Calculator,
  MessageCircle,
  Share2,
  Copy,
  Check,
  ExternalLink,
  X,
  Send,
  Phone,
  FileText,
  CheckCircle2,
  Camera,
  Loader2
} from 'lucide-react';
import { MediaComparisonSection } from './MediaComparisonSection';
import { AiMarketInsightsPanel } from './AiMarketInsightsPanel';
import { ChartExportFloatingMenu } from './ChartExportFloatingMenu';
import { exportChartElementAsPng } from '../utils/chartExport';
import { 
  generateRegionalReportWhatsAppMessage, 
  getRegionalReportWhatsAppUrl, 
  BUSINESS_WA_NUMBER 
} from '../utils/whatsapp';

interface AnalyticsDashboardProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
  onNavigateToPlanner?: () => void;
  onNavigateToRoi?: () => void;
  selectedCity?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  spots, 
  onSelectSpot,
  onNavigateToPlanner,
  onNavigateToRoi,
  selectedCity 
}) => {
  // WhatsApp Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [targetPhone, setTargetPhone] = useState<string>(BUSINESS_WA_NUMBER);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [quickExportingCard, setQuickExportingCard] = useState<string | null>(null);

  const handleQuickExportCard = async (elementId: string, filename: string) => {
    setQuickExportingCard(elementId);
    try {
      await exportChartElementAsPng(elementId, filename, {
        scale: 2,
        backgroundColor: '#ffffff',
        regionName: activeRegion
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal mengekspor grafik ke gambar PNG.');
    } finally {
      setQuickExportingCard(null);
    }
  };

  // Live ticking OTS counter
  const [liveImpressionCounter, setLiveImpressionCounter] = useState<number>(() => {
    const totalDaily = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
    // Fraction of the day elapsed
    const now = new Date();
    const secPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const ratio = Math.min(1, Math.max(0.1, secPassed / 86400));
    return Math.floor(totalDaily * ratio);
  });

  useEffect(() => {
    const totalDaily = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
    const interval = setInterval(() => {
      // simulate realistic real-time viewer ticks
      const increment = Math.floor((totalDaily / 86400) * 2 + Math.random() * 8);
      setLiveImpressionCounter((prev) => prev + increment);
    }, 1500);

    return () => clearInterval(interval);
  }, [spots]);

  // Aggregate stats
  const totalSpots = spots.length;
  const availableSpots = spots.filter((s) => s.isAvailable).length;
  const soldOutSpots = totalSpots - availableSpots;
  const occupancyRate = totalSpots > 0 ? Math.round((soldOutSpots / totalSpots) * 100) : 0;
  const totalDailyTraffic = spots.reduce((acc, s) => acc + s.dailyTraffic, 0);
  const totalDailyImpressions = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
  const totalMonthlyInventory = spots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);

  // Determine active filtered city/region name
  const activeRegion = useMemo(() => {
    if (selectedCity && selectedCity !== 'All') return selectedCity;
    const uniqueCities = Array.from(new Set(spots.map((s) => s.city).filter(Boolean)));
    if (uniqueCities.length === 1) return uniqueCities[0];
    if (uniqueCities.length <= 3 && uniqueCities.length > 0) return uniqueCities.join(', ');
    return 'Jawa Barat (Semua Wilayah)';
  }, [selectedCity, spots]);

  // Generate WhatsApp report text and direct web link
  const reportMessage = useMemo(() => {
    return generateRegionalReportWhatsAppMessage(spots, activeRegion);
  }, [spots, activeRegion]);

  const whatsappUrl = useMemo(() => {
    return getRegionalReportWhatsAppUrl(spots, activeRegion, targetPhone);
  }, [spots, activeRegion, targetPhone]);

  const handleCopyReport = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportMessage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Hourly Traffic simulation data
  const hourlyData = [
    { hour: '06:00', traffic: Math.round(totalDailyTraffic * 0.025), doohReach: Math.round(totalDailyImpressions * 0.022) },
    { hour: '07:00', traffic: Math.round(totalDailyTraffic * 0.075), doohReach: Math.round(totalDailyImpressions * 0.078) },
    { hour: '08:00', traffic: Math.round(totalDailyTraffic * 0.095), doohReach: Math.round(totalDailyImpressions * 0.102) }, // Morning Peak
    { hour: '09:00', traffic: Math.round(totalDailyTraffic * 0.065), doohReach: Math.round(totalDailyImpressions * 0.068) },
    { hour: '11:00', traffic: Math.round(totalDailyTraffic * 0.055), doohReach: Math.round(totalDailyImpressions * 0.052) },
    { hour: '12:00', traffic: Math.round(totalDailyTraffic * 0.070), doohReach: Math.round(totalDailyImpressions * 0.072) }, // Lunch
    { hour: '14:00', traffic: Math.round(totalDailyTraffic * 0.058), doohReach: Math.round(totalDailyImpressions * 0.055) },
    { hour: '16:00', traffic: Math.round(totalDailyTraffic * 0.082), doohReach: Math.round(totalDailyImpressions * 0.086) },
    { hour: '17:00', traffic: Math.round(totalDailyTraffic * 0.108), doohReach: Math.round(totalDailyImpressions * 0.118) }, // Evening Peak
    { hour: '18:30', traffic: Math.round(totalDailyTraffic * 0.098), doohReach: Math.round(totalDailyImpressions * 0.106) }, // Night Out
    { hour: '20:00', traffic: Math.round(totalDailyTraffic * 0.065), doohReach: Math.round(totalDailyImpressions * 0.070) },
    { hour: '21:30', traffic: Math.round(totalDailyTraffic * 0.040), doohReach: Math.round(totalDailyImpressions * 0.042) }
  ];

  // Distribution by Media Type
  const mediaTypeMap: Record<string, { count: number; totalTraffic: number; totalImpressions: number }> = {};
  spots.forEach((s) => {
    const key = s.category === 'DOOH_DIGITAL' ? 'DOOH Videotron' : s.mediaType.includes('JPO') ? 'JPO (Backlite/Front)' : s.mediaType.includes('Bando') ? 'Bando Jalan' : 'Billboard Frontlite';
    if (!mediaTypeMap[key]) {
      mediaTypeMap[key] = { count: 0, totalTraffic: 0, totalImpressions: 0 };
    }
    mediaTypeMap[key].count += 1;
    mediaTypeMap[key].totalTraffic += s.dailyTraffic;
    mediaTypeMap[key].totalImpressions += s.dailyImpressions;
  });

  const mediaTypeData = Object.entries(mediaTypeMap).map(([type, stats]) => ({
    name: type,
    titik: stats.count,
    impresi: Math.round(stats.totalImpressions / 1000)
  }));

  // Distribution by Location Type
  const locTypeMap: Record<string, number> = {};
  spots.forEach((s) => {
    locTypeMap[s.locationType] = (locTypeMap[s.locationType] || 0) + 1;
  });

  const locTypeData = Object.entries(locTypeMap).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  // Top 5 Spots Leaderboard
  const topSpots = [...spots].sort((a, b) => b.dailyImpressions - a.dailyImpressions).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Real-Time Impression Ticker Bar */}
      <div 
        id="chart-card-kpi-banner"
        data-testid="chart-card-kpi-banner"
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-lg border border-slate-700/80"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                Live Telemetri Real-Time
              </span>
              <span className="text-xs text-slate-400">Akumulasi OTS Hari Ini (Jawa Barat)</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-emerald-400">
                {liveImpressionCounter.toLocaleString('id-ID')}
              </span>
              <span className="text-sm text-slate-300 font-medium">OTS Views Terukur</span>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {/* WhatsApp Share Regional Report Button */}
              <button
                id="btn-share-regional-report"
                data-testid="btn-share-regional-report"
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title={`Kirim Ringkasan Laporan Kinerja Wilayah (${activeRegion}) via WhatsApp`}
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span>Share Regional Report</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-slate-950/20 text-slate-900 font-bold">
                  {activeRegion}
                </span>
              </button>

              <a
                href="#ai-market-insights-panel"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Market Insights & High-Growth</span>
              </a>
              {onNavigateToPlanner && (
                <button
                  type="button"
                  onClick={onNavigateToPlanner}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Strategic Media Planner (Knapsack)</span>
                </button>
              )}
              {onNavigateToRoi && (
                <button
                  type="button"
                  onClick={onNavigateToRoi}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Estimated ROI Calculator (OOH CTR)</span>
                </button>
              )}
              <a
                href="#media-comparison-section"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Bandingkan 2-3 Titik Media</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-xs">
            <div>
              <div className="text-slate-400 text-[10px]">Traffic Harian</div>
              <div className="font-bold text-white text-sm">{formatCompactNumber(totalDailyTraffic)}</div>
              <div className="text-[10px] text-emerald-400">Kendaraan / Hari</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Potensi Bulanan</div>
              <div className="font-bold text-white text-sm">{formatCompactNumber(totalDailyImpressions * 30)}</div>
              <div className="text-[10px] text-amber-400">Impresi OTS / Bln</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Occupancy Rate</div>
              <div className="font-bold text-white text-sm">{occupancyRate}%</div>
              <div className="text-[10px] text-blue-400">{soldOutSpots} dari {totalSpots} Tersewa</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Nilai Portofolio</div>
              <div className="font-bold text-white text-sm">{formatCompactNumber(totalMonthlyInventory)}</div>
              <div className="text-[10px] text-purple-400">Tarif 1 Bln / Sisi</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Market Insights Panel: Automated Weekly Traffic Trend Analysis & High-Growth Recommendations */}
      <AiMarketInsightsPanel 
        spots={spots} 
        onSelectSpot={onSelectSpot} 
      />

      {/* Charts Presentation Suite: Wrap all primary and secondary analytics for full presentation export */}
      <div id="charts-presentation-suite" data-testid="charts-presentation-suite" className="space-y-6">

        {/* Primary Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Hourly Traffic & Commuter Peak Chart (2 Cols) */}
          <div 
            id="chart-card-hourly-traffic"
            data-testid="chart-card-hourly-traffic"
            className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Tren Arus Lalu Lintas & Paparan Impresi Harian (24 Jam)
                </h3>
                <p className="text-xs text-slate-500">
                  Pola pergerakan komuter Kota Bandung & arteri Jawa Barat (Puncak Pagi 07:00-09:00 & Sore 16:30-19:00)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Traffic Kendaraan
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Impresi OTS
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickExportCard('chart-card-hourly-traffic', `OOH-Jabar-Traffic-24Jam-${activeRegion}`)}
                  disabled={quickExportingCard !== null}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200 cursor-pointer disabled:opacity-50"
                  title="Unduh grafik garis ini sebagai gambar PNG (2x HD)"
                >
                  {quickExportingCard === 'chart-card-hourly-traffic' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => formatCompactNumber(val)} />
                <Tooltip 
                  formatter={(val: any) => [Number(val).toLocaleString('id-ID'), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="traffic" name="Volume Kendaraan" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="doohReach" name="Estimasi Impresi OTS" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

          {/* Location Type Distribution Pie Chart (1 Col) */}
          <div 
            id="chart-card-location-type"
            data-testid="chart-card-location-type"
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Karakteristik Koridor Lokasi
                </h3>
                <button
                  type="button"
                  onClick={() => handleQuickExportCard('chart-card-location-type', `OOH-Jabar-Karakteristik-Koridor-${activeRegion}`)}
                  disabled={quickExportingCard !== null}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200 cursor-pointer shrink-0 disabled:opacity-50"
                  title="Unduh grafik lingkaran ini sebagai gambar PNG (2x HD)"
                >
                  {quickExportingCard === 'chart-card-location-type' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Distribusi titik media berdasarkan profil zona geografis
              </p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={locTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {locTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-slate-100 text-[11px]">
            {locTypeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-600 truncate">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

        {/* Secondary Grid: Format Breakdown & Top 5 Spots */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Impresi & Titik Berdasarkan Format Media */}
          <div 
            id="chart-card-media-format"
            data-testid="chart-card-media-format"
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs"
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <BarChart className="w-4 h-4 text-purple-600" />
                  Performa per Format Media
                </h3>
                <p className="text-xs text-slate-500">
                  Total titik dan ribuan impresi harian (k OTS)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleQuickExportCard('chart-card-media-format', `OOH-Jabar-Performa-Format-Media-${activeRegion}`)}
                disabled={quickExportingCard !== null}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200 cursor-pointer shrink-0 disabled:opacity-50"
                title="Unduh grafik batang ini sebagai gambar PNG (2x HD)"
              >
                {quickExportingCard === 'chart-card-media-format' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mediaTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="titik" name="Jumlah Titik" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="impresi" name="Ribuan Impresi (k OTS)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

          {/* Top 5 High-Impact Media Spots Leaderboard (2 Cols) */}
          <div 
            id="chart-card-top-spots"
            data-testid="chart-card-top-spots"
            className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Top 5 Titik Impresi Tertinggi (Highest Spatial Reach)
                </h3>
                <p className="text-xs text-slate-500">
                  Lokasi dengan paparan traffic dan efisiensi CPM paling maksimal di Jawa Barat
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-1 rounded-md border border-amber-200">
                  Prime Spots
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickExportCard('chart-card-top-spots', `OOH-Jabar-Top-5-Prime-Spots-${activeRegion}`)}
                  disabled={quickExportingCard !== null}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200 cursor-pointer shrink-0 disabled:opacity-50"
                  title="Unduh leaderboard ini sebagai gambar PNG (2x HD)"
                >
                  {quickExportingCard === 'chart-card-top-spots' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

          <div className="divide-y divide-slate-100">
            {topSpots.map((spot, idx) => {
              const isDooh = spot.category === 'DOOH_DIGITAL';
              return (
                <div
                  key={spot.id}
                  onClick={() => onSelectSpot(spot)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {spot.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          isDooh ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isDooh ? 'DOOH' : spot.size}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {spot.city} • {spot.locationType} • {spot.trafficDensity}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-emerald-600">
                      {formatCompactNumber(spot.dailyImpressions)} OTS/hr
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatIDR(spot.pricing.oneMonth)}/bln
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      {/* End of Charts Presentation Suite */}
      </div>

      {/* Head-to-Head 2-3 Media Spots Comparison Table Section */}
      <MediaComparisonSection 
        spots={spots} 
        onSelectSpot={onSelectSpot} 
      />

      {/* WhatsApp Share Regional Report Modal */}
      {isShareModalOpen && (
        <div 
          id="modal-share-regional-report"
          data-testid="modal-share-regional-report"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                  <MessageCircle className="w-6 h-6 fill-current text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <span>Share Regional Report via WhatsApp</span>
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Ringkasan performa media OOH & DOOH untuk <strong>{activeRegion}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Highlight Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Cakupan Wilayah</span>
                  <span className="block font-bold text-slate-900 text-xs sm:text-sm truncate" title={activeRegion}>
                    {activeRegion}
                  </span>
                  <span className="text-[10px] text-slate-400">{totalSpots} Titik Media</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Paparan OTS/Hari</span>
                  <span className="block font-bold text-emerald-600 text-xs sm:text-sm">
                    {formatCompactNumber(totalDailyImpressions)}
                  </span>
                  <span className="text-[10px] text-slate-400">Total Impresi</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Tingkat Okupansi</span>
                  <span className="block font-bold text-blue-600 text-xs sm:text-sm">
                    {occupancyRate}%
                  </span>
                  <span className="text-[10px] text-slate-400">{soldOutSpots} dari {totalSpots} Tersewa</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Nilai Portofolio</span>
                  <span className="block font-bold text-purple-600 text-xs sm:text-sm">
                    {formatCompactNumber(totalMonthlyInventory)}
                  </span>
                  <span className="text-[10px] text-slate-400">Tarif 1 Bln / Sisi</span>
                </div>
              </div>

              {/* Recipient Phone Configuration */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nomor WhatsApp Tujuan:</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Ketik nomor klien / agensi (awali 62 atau 08)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="input-whatsapp-target-phone"
                      type="text"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      placeholder="6281234567890 (atau kosongkan untuk memilih chat)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetPhone(BUSINESS_WA_NUMBER)}
                    className="px-2.5 py-2 text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Gunakan Nomor Admin Suherman Reklame"
                  >
                    Set Admin (+62878)
                  </button>
                </div>
              </div>

              {/* Message Content Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pratinjau Format Pesan WhatsApp:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-slate-200"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Tersalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-all">
                  {reportMessage}
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal / Tutup
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'Tersalin!' : 'Salin Laporan'}</span>
                </button>

                <a
                  id="link-send-whatsapp-regional-report"
                  data-testid="link-send-whatsapp-regional-report"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Kirim via WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating Action Menu for Chart PNG Exports */}
      <ChartExportFloatingMenu activeRegion={activeRegion} />

    </div>
  );
};
