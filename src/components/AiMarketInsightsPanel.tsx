import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Calendar, 
  MapPin, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  BarChart3, 
  Building2, 
  Target, 
  Flame, 
  Clock, 
  Eye, 
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { 
  MarketMacroInsights, 
  HighGrowthRecommendation, 
  fetchAiMarketInsights, 
  generateMarketInsights 
} from '../services/aiMarketInsightsService';

interface AiMarketInsightsPanelProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
}

export const AiMarketInsightsPanel: React.FC<AiMarketInsightsPanelProps> = ({ spots, onSelectSpot }) => {
  const [insights, setInsights] = useState<MarketMacroInsights>(() => generateMarketInsights(spots));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'AVAILABLE_ONLY' | 'SUPER_HIGH' | 'DOOH'>('ALL');
  const [activeTab, setActiveTab] = useState<'RECOMMENDATIONS' | 'WEEKLY_CURVE' | 'SECTORS'>('RECOMMENDATIONS');
  const [selectedGrowthSpotId, setSelectedGrowthSpotId] = useState<string | null>(null);

  // Automatically recalculate or fetch when spots list changes
  useEffect(() => {
    let isMounted = true;
    const runAnalysis = async () => {
      setIsLoading(true);
      try {
        const result = await fetchAiMarketInsights(spots);
        if (isMounted) {
          setInsights(result);
        }
      } catch (err) {
        console.warn('AI analysis fallback to local:', err);
        if (isMounted) {
          setInsights(generateMarketInsights(spots));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    runAnalysis();
    return () => {
      isMounted = false;
    };
  }, [spots]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await fetchAiMarketInsights(spots);
      setInsights(result);
    } catch {
      setInsights(generateMarketInsights(spots));
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recommendations based on active filterMode
  const filteredSpots = useMemo(() => {
    if (!insights?.highGrowthSpots) return [];
    return insights.highGrowthSpots.filter((rec) => {
      if (filterMode === 'AVAILABLE_ONLY' && !rec.spot.isAvailable) return false;
      if (filterMode === 'SUPER_HIGH' && rec.growthTier !== 'SUPER_HIGH') return false;
      if (filterMode === 'DOOH' && rec.spot.category !== 'DOOH_DIGITAL') return false;
      return true;
    });
  }, [insights, filterMode]);

  // Selected spot highlight for inspection
  const activeSpotRec = useMemo(() => {
    if (!selectedGrowthSpotId) return filteredSpots[0] || insights.highGrowthSpots[0];
    return insights.highGrowthSpots.find((h) => h.spot.id === selectedGrowthSpotId) || filteredSpots[0];
  }, [selectedGrowthSpotId, filteredSpots, insights]);

  return (
    <div id="ai-market-insights-panel" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
      
      {/* Header Banner */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                AI Market Insights Engine
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                Analisis Otomatis 7-Day Traffic Velocity
              </span>
              <span className="text-xs text-slate-400">
                {spots.length} Titik Media Jawa Barat Dipantau
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>AI Market Insights & Rekomendasi Lokasi High-Growth</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Analisis cerdas pola pergerakan komuter mingguan dan deteksi koridor lalu lintas dengan lonjakan impresi tertinggi untuk alokasi kampanye brand yang paling bernilai.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              title="Perbarui analisis telemetri mingguan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Menganalisis...' : 'Analisis Ulang AI'}</span>
            </button>
          </div>
        </div>

        {/* 4 Top Executive KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/60">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Pertumbuhan Mingguan</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              +{insights.averageWeeklyGrowth}% <span className="text-xs text-slate-300 font-normal">WoW</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              Rerata akselerasi arus koridor
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Hari Puncak Mobilitas</span>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-amber-300 font-mono">
              {insights.peakDayName}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              Lonjakan 1.35x vs hari biasa
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total OTS Mingguan</span>
              <Eye className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-extrabold text-blue-300 font-mono">
              {formatCompactNumber(insights.totalWeeklyOTSVolume)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              OTS Views terukur 7 hari
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Koridor High-Growth Utama</span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-sm font-bold text-rose-300 truncate" title={insights.topSurgeCorridor}>
              {insights.topSurgeCorridor}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              Kepadatan komuter & wisata
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('RECOMMENDATIONS')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'RECOMMENDATIONS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Rekomendasi Lokasi High-Growth</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'RECOMMENDATIONS' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'}`}>
              {filteredSpots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WEEKLY_CURVE')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'WEEKLY_CURVE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kurva Trafik 7 Hari (Senin - Minggu)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SECTORS')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'SECTORS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Strategi Sektoral Industri</span>
          </button>
        </div>

        {/* Filter Chips for Recommendations */}
        {activeTab === 'RECOMMENDATIONS' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua ({insights.highGrowthSpots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('AVAILABLE_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'AVAILABLE_ONLY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              Siap Pasang
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('SUPER_HIGH')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'SUPER_HIGH'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              Super High (&gt;15%)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('DOOH')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'DOOH'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
              }`}
            >
              DOOH Digital
            </button>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="p-5 sm:p-6 space-y-6">
        
        {/* Executive Summary Callout */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 via-slate-50 to-emerald-50/50 border border-indigo-100 text-slate-800 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                Executive Market Intelligence Summary
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Pembaruan: {new Date(insights.analyzedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              {insights.executiveSummary}
            </p>
          </div>
        </div>

        {/* TAB 1: RECOMMENDATIONS */}
        {activeTab === 'RECOMMENDATIONS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Daftar Rekomendasi Lokasi 'High-Growth' Teratas</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Diurutkan berdasarkan skor AI Opportunity (kecepatan pertumbuhan lalu lintas mingguan, visibilitas sudut pandang, dan efisiensi CPM).
                </p>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Menampilkan <strong className="text-slate-800">{filteredSpots.length}</strong> titik rekomendasi
              </span>
            </div>

            {filteredSpots.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                Tidak ada titik yang sesuai dengan kriteria filter saat ini. Coba pilih 'Semua'.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSpots.map((rec, index) => {
                  const spot = rec.spot;
                  const isAvailable = spot.isAvailable;
                  const isDooh = spot.category === 'DOOH_DIGITAL';
                  const isSuper = rec.growthTier === 'SUPER_HIGH';
                  const isSelected = activeSpotRec?.spot.id === spot.id;

                  return (
                    <div
                      key={spot.id}
                      onClick={() => setSelectedGrowthSpotId(spot.id)}
                      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Badges Bar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            index === 0 
                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                              : index === 1 
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <Flame className="w-3 h-3 text-rose-500" />
                            #{index + 1} High Growth
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isSuper 
                                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              +{rec.growthRateWoW}% WoW
                            </span>

                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isAvailable 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isAvailable ? 'Siap Pasang' : 'Tersewa'}
                            </span>
                          </div>
                        </div>

                        {/* Title & Location */}
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                          {spot.name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 line-clamp-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{spot.roadName}, {spot.city}</span>
                        </div>

                        {/* Growth Driver Box */}
                        <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1 text-indigo-900">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>{rec.growthDriverTitle}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                            {rec.growthDriverDescription}
                          </p>
                        </div>

                        {/* Weekly Metrics Matrix */}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-50/70 p-2 rounded-lg">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Trafik 7 Hari</span>
                            <span className="font-bold text-slate-800 text-xs">
                              ~{formatCompactNumber(rec.weeklyTrafficEstimated)} kend
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Impresi 7 Hari</span>
                            <span className="font-bold text-emerald-600 text-xs">
                              ~{formatCompactNumber(rec.weeklyImpressionsEstimated)} OTS
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Jam Sibuk Optimal</span>
                            <span className="text-[11px] text-slate-700 font-medium">
                              {rec.primeViewingHours}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">AI Score</span>
                            <span className="font-extrabold text-indigo-600 text-xs">
                              {rec.aiOpportunityScore}/100
                            </span>
                          </div>
                        </div>

                        {/* Industries Tags */}
                        <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 mr-1">Cocok:</span>
                          {rec.bestSuitedIndustries.slice(0, 3).map((ind, i) => (
                            <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              {ind}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer: Price & CTA */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] text-slate-400">Tarif Sewa 1 Bulan</div>
                          <div className="text-xs font-bold text-slate-900">
                            {formatIDR(spot.pricing.oneMonth)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSpot(spot);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Pilih Titik</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WEEKLY TRAFFIC CURVE */}
        {activeTab === 'WEEKLY_CURVE' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Dinamika Kurva Arus Lalu Lintas Mingguan (7 Hari)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Agregasi volume kendaraan dan paparan OTS di seluruh titik media Jawa Barat dari Senin s/d Minggu.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Volume Kendaraan
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Impresi OTS
                </span>
              </div>
            </div>

            <div className="h-72 w-full bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.weeklyTrendDays} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="otsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dayName" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => formatCompactNumber(val)} />
                  <Tooltip 
                    formatter={(val: any, name: any) => [
                      Number(val).toLocaleString('id-ID'),
                      name === 'trafficVehicles' ? 'Volume Kendaraan' : 'Impresi OTS'
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="trafficVehicles" 
                    name="trafficVehicles"
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#trafficGradient)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="impressionsOTS" 
                    name="impressionsOTS"
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#otsGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Breakdown Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
              {insights.weeklyTrendDays.map((d) => (
                <div 
                  key={d.dayName} 
                  className={`p-2.5 rounded-lg border text-xs text-center ${
                    d.isPeakDay 
                      ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400/40' 
                      : d.dayType === 'weekend' 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-800 flex items-center justify-center gap-1">
                    <span>{d.dayName}</span>
                    {d.isPeakDay && <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    {formatCompactNumber(d.trafficVehicles)} kend
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    {formatCompactNumber(d.impressionsOTS)} OTS
                  </div>
                  <div className={`text-[9px] mt-1 px-1 py-0.2 rounded font-bold ${
                    d.isPeakDay ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {d.isPeakDay ? 'PEAK SURGE' : `${d.trafficIndex}x Indeks`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SECTOR STRATEGY */}
        {activeTab === 'SECTORS' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <span>Rekomendasi Strategis Penetrasi Industri & Sektor Brand</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pemetaan kecocokan karakter audiens koridor high-growth dengan industri pengiklan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.recommendedSectors.map((sec, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs shrink-0">
                        0{idx + 1}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {sec.sector}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {sec.rationale}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 text-[11px]">
                    <span className="text-slate-400 block text-[10px]">Area Target Utama:</span>
                    <span className="font-semibold text-indigo-900">
                      {sec.targetArea}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategic Checklist */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                3 Langkah Tindakan Media Planning Terarah (AI Strategic Guidance)
              </h4>
              <div className="space-y-2">
                {insights.strategicRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
