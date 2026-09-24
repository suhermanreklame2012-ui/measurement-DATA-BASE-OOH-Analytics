import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Sparkles,
  Target,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  ArrowUpRight,
  FileDown,
  Send,
  Copy,
  Check,
  Trash2,
  Plus,
  MapPin,
  Layers,
  Eye,
  RefreshCw,
  AlertCircle,
  Filter,
  Clock,
  ShieldCheck,
  Building2,
  Flame,
  Scale,
  ChevronRight,
  Info
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';
import {
  PlannerDuration,
  PlannerOptimizationGoal,
  PlannerFilterOptions,
  MediaPlanPackage,
  generateStrategicMediaPlans,
  DURATION_LABELS
} from '../services/strategicMediaPlannerService';
import { exportStrategicMediaPlanPDF } from '../utils/mediaPlanPdfExport';
import { getSpotImageUrl } from '../utils/imageUtils';

interface StrategicMediaPlannerProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
  onOpenAiProposal?: (chosenSpots: MediaSpot[]) => void;
  onNavigateToComparison?: () => void;
  onOpenRoiCalculator?: (spot: MediaSpot) => void;
}

// Preset Budget Options (Rupiah)
const BUDGET_PRESETS = [
  { label: 'Rp 25 Jt', value: 25_000_000, desc: 'Starter' },
  { label: 'Rp 50 Jt', value: 50_000_000, desc: 'Bisnis Reg' },
  { label: 'Rp 100 Jt', value: 100_000_000, desc: 'Populer' },
  { label: 'Rp 200 Jt', value: 200_000_000, desc: 'Dominasi Jabar' },
  { label: 'Rp 500 Jt', value: 500_000_000, desc: 'Enterprise' }
];

export const StrategicMediaPlanner: React.FC<StrategicMediaPlannerProps> = ({
  spots,
  onSelectSpot,
  onOpenAiProposal,
  onNavigateToComparison,
  onOpenRoiCalculator
}) => {
  // Client Input States
  const [budgetInput, setBudgetInput] = useState<number>(100_000_000);
  const [duration, setDuration] = useState<PlannerDuration>('oneMonth');
  const [activeGoal, setActiveGoal] = useState<PlannerOptimizationGoal>('MAX_OTS');

  // Filters & Customization
  const [availableOnly, setAvailableOnly] = useState<boolean>(true);
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'OOH_STATIC' | 'DOOH_DIGITAL'>('ALL');
  const [minVisibility, setMinVisibility] = useState<number>(70);
  const [excludedSpotIds, setExcludedSpotIds] = useState<string[]>([]);
  const [forcedSpotIds, setForcedSpotIds] = useState<string[]>([]);

  // Client Details for PDF Export
  const [clientName, setClientName] = useState<string>('Bpk. Hendra Wijaya');
  const [clientCompany, setClientCompany] = useState<string>('PT Daya Adicipta Motora (Honda Jabar)');

  // Notification / Copy feedback state
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Available unique cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    spots.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set).sort();
  }, [spots]);

  // Generate Plans via Knapsack & Strategic Optimization
  const plannerOutput = useMemo(() => {
    const options: PlannerFilterOptions = {
      availableOnly,
      selectedCity,
      selectedCategory,
      minVisibilityScore: minVisibility,
      excludedSpotIds,
      forcedSpotIds
    };

    return generateStrategicMediaPlans(spots, budgetInput, duration, options);
  }, [spots, budgetInput, duration, availableOnly, selectedCity, selectedCategory, minVisibility, excludedSpotIds, forcedSpotIds]);

  // Selected active plan package
  const currentPlan: MediaPlanPackage = useMemo(() => {
    if (activeGoal === 'BEST_CPM') return plannerOutput.bestCpmPlan;
    if (activeGoal === 'BALANCED_CORRIDORS') return plannerOutput.balancedPlan;
    return plannerOutput.maxOtsPlan;
  }, [activeGoal, plannerOutput]);

  // Quick reset excluded spots
  const handleResetExclusions = () => {
    setExcludedSpotIds([]);
    setForcedSpotIds([]);
  };

  // Exclude single spot and re-optimize
  const handleExcludeSpot = (spotId: string) => {
    setExcludedSpotIds((prev) => [...prev, spotId]);
  };

  // Copy Plan details to clipboard
  const handleCopyPlanSummary = () => {
    if (!currentPlan) return;
    const lines = [
      `*REKOMENDASI STRATEGIC MEDIA PLAN - SUHERMAN REKLAME*`,
      `Klien: ${clientName} (${clientCompany})`,
      `Plafon Budget: ${formatIDR(currentPlan.budgetLimit)}`,
      `Durasi Kampanye: ${currentPlan.durationLabel}`,
      `Strategi Optimasi: ${currentPlan.goalTitle}`,
      `------------------------------------------`,
      `Total Biaya Paket: ${formatIDR(currentPlan.totalCost)} (${currentPlan.budgetUtilizationPercent}% anggaran terpakai)`,
      `Sisa Saldo: ${formatIDR(currentPlan.remainingBudget)}`,
      `Total Impresi Terproyeksi: ${formatCompactNumber(currentPlan.totalImpressionsOTS)} OTS`,
      `Blended CPM: ${formatIDR(currentPlan.blendedCpm)} / 1.000 tayang`,
      `Rata-rata Visibilitas: ${currentPlan.averageVisibilityScore}/100`,
      `------------------------------------------`,
      `DAFTAR TITIK REKOMENDASI TERPILIH (${currentPlan.spots.length} Titik):`,
      ...currentPlan.spots.map((item, idx) => 
        `${idx + 1}. ${item.spot.name} (${item.spot.mediaType}) - ${item.spot.roadName}, ${item.spot.city} | Tarif: ${formatIDR(item.costForDuration)} | Impresi: ${formatCompactNumber(item.periodImpressions)} OTS [${item.strategicRole}]`
      ),
      `------------------------------------------`,
      `Catatan Analis: ${currentPlan.executiveAssessment}`,
      `Hubungi: 0878-2224-8975 atas nama Suherman (Suherman Reklame Bandung)`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // Export PDF
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportStrategicMediaPlanPDF(currentPlan, clientName, clientCompany);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Proceed to Proposal Outreach Modal with selected spots
  const handleProceedToOutreach = () => {
    if (onOpenAiProposal && currentPlan.spots.length > 0) {
      const selectedMediaSpots = currentPlan.spots.map((item) => item.spot);
      onOpenAiProposal(selectedMediaSpots);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Header Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl border border-slate-700/80 p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                AI Knapsack Media Optimizer
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Strategic Media Planner v2.6
              </span>
              <span className="text-xs text-slate-400">
                Optimasi Anggaran & Jangkauan Impresi (OTS) Jawa Barat
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Strategic Media Planner & Budget Optimizer</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Masukkan target anggaran (budget) klien dan durasi sewa, sistem secara otomatis menghitung algoritma kombinasi titik media paling optimal untuk memaksimalkan akumulasi impresi mata (OTS) tanpa melebihi pagu anggaran.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center shrink-0">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf || currentPlan.spots.length === 0}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-slate-600 shadow-sm cursor-pointer disabled:opacity-50"
              title="Unduh dokumen resmi PDF Media Plan"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh PDF Media Plan'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPlanSummary}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-slate-600 shadow-sm cursor-pointer"
              title="Salin ringkasan media plan ke clipboard"
            >
              {copiedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span>{copiedSuccess ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>

            {onOpenAiProposal && (
              <button
                type="button"
                onClick={handleProceedToOutreach}
                disabled={currentPlan.spots.length === 0}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 hover:shadow-indigo-500/20"
              >
                <Send className="w-4 h-4 text-indigo-200" />
                <span>Kirim Proposal Klien ({currentPlan.spots.length} Titik)</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Live Summary Indicators on Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Plafon Anggaran Klien</span>
            <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
              {formatCompactIDR(budgetInput)}
            </div>
            <span className="text-[10px] text-slate-400">{formatIDR(budgetInput)}</span>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Total Biaya Paket Terpilih</span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              {formatCompactIDR(currentPlan.totalCost)}
            </div>
            <span className="text-[10px] text-emerald-300/80">
              {currentPlan.budgetUtilizationPercent}% Terpakai (Sisa {formatCompactIDR(currentPlan.remainingBudget)})
            </span>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Total Impresi Terproyeksi</span>
            <div className="text-lg font-black text-blue-400 font-mono mt-0.5">
              {formatCompactNumber(currentPlan.totalImpressionsOTS)} <span className="text-xs font-normal text-slate-300">OTS</span>
            </div>
            <span className="text-[10px] text-slate-400">Selama {currentPlan.durationLabel}</span>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Blended CPM Efisiensi</span>
            <div className="text-lg font-black text-purple-300 font-mono mt-0.5">
              {formatIDR(currentPlan.blendedCpm)}
            </div>
            <span className="text-[10px] text-slate-400">Per 1.000 pasang mata views</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Input & Strategy Configurator Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <span>Konfigurasi Anggaran & Target Kampanye</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tentukan batasan dana yang dialokasikan pengiklan dan durasi kontrak penayangan.
            </p>
          </div>

          {/* Target Client Input (for proposal & PDF) */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">Klien:</span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none w-36"
                placeholder="Nama Klien"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">Perusahaan:</span>
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none w-48"
                placeholder="Nama Perusahaan"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Budget & Duration Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Budget Input & Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Plafon Anggaran Klien (Budget Ceiling)</span>
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {formatIDR(budgetInput)}
                </span>
              </div>

              {/* Number Input Field */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white overflow-hidden shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                  Rp
                </div>
                <input
                  type="text"
                  value={budgetInput ? budgetInput.toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const cleanNum = Number(e.target.value.replace(/[^0-9]/g, ''));
                    setBudgetInput(cleanNum || 0);
                  }}
                  placeholder="100.000.000"
                  className="w-full pl-11 pr-4 py-2.5 text-base sm:text-lg font-black text-slate-900 focus:outline-none"
                />
              </div>

              {/* Quick Budget Chips */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Preset Cepat:</span>
                {BUDGET_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setBudgetInput(p.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      budgetInput === p.value
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[9px] opacity-75 ml-1">({p.desc})</span>
                  </button>
                ))}
              </div>

              {/* Slider for fluid adjustment */}
              <div className="mt-3">
                <input
                  type="range"
                  min={15_000_000}
                  max={600_000_000}
                  step={5_000_000}
                  value={Math.min(600_000_000, Math.max(15_000_000, budgetInput))}
                  onChange={(e) => setBudgetInput(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Rp 15 Jt</span>
                  <span>Rp 150 Jt</span>
                  <span>Rp 300 Jt</span>
                  <span>Rp 600 Jt+</span>
                </div>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Durasi Kontrak Sewa Media</span>
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(DURATION_LABELS) as PlannerDuration[]).map((durKey) => {
                  const info = DURATION_LABELS[durKey];
                  const isSelected = duration === durKey;
                  return (
                    <button
                      key={durKey}
                      type="button"
                      onClick={() => setDuration(durKey)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold block">{info.label.split(' ')[0]} {info.label.split(' ')[1]}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{info.days} Hari</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Preferences & Filters (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter Kriteria Titik</span>
              </span>

              {(excludedSpotIds.length > 0 || forcedSpotIds.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetExclusions}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Kustom ({excludedSpotIds.length + forcedSpotIds.length})</span>
                </button>
              )}
            </div>

            {/* Available Only Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Hanya Titik Siap Pasang</span>
                <span className="text-[10px] text-slate-500">Kecualikan titik yang sedang tersewa</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* City Selection */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Fokus Kota / Kabupaten:
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Kota Jawa Barat ({uniqueCities.length} Wilayah)</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Media Category Selection */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Format Media Iklan:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Format (Billboard Statis & DOOH Digital)</option>
                <option value="OOH_STATIC">Billboard Fisik / Statis Saja</option>
                <option value="DOOH_DIGITAL">Videotron / DOOH Digital Saja</option>
              </select>
            </div>

            {/* Minimum Visibility Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Minimal Skor Visibilitas:</span>
                <span className="font-mono text-indigo-600 font-bold">{minVisibility}/100</span>
              </div>
              <input
                type="range"
                min={70}
                max={95}
                step={5}
                value={minVisibility}
                onChange={(e) => setMinVisibility(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Kandidat Memenuhi Kriteria:</span>
              <strong className="text-slate-800 font-mono">{plannerOutput.allAvailableCandidatesCount} Titik</strong>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Strategy Objective Selector (3 Knapsack Optimization Modes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <span>Pilih Karakter Strategi Paket Media Plan</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tiap model strategi menghitung perpaduan titik media secara matematis berdasarkan objektif kampanye klien.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* PACKAGE 1: MAX OTS */}
          <div
            onClick={() => setActiveGoal('MAX_OTS')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              activeGoal === 'MAX_OTS'
                ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wide">
                  Rekomendasi Utama
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {plannerOutput.maxOtsPlan.spots.length} Titik
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>Paket Maksimal Impresi (Max Reach)</span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Memaksimalkan akumulasi volume penonton (OTS) tertinggi yang muat di dalam pagu anggaran.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Impresi OTS</span>
                <strong className="text-indigo-600 font-mono text-sm">
                  {formatCompactNumber(plannerOutput.maxOtsPlan.totalImpressionsOTS)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Biaya Paket</span>
                <strong className="text-slate-900 font-mono text-xs">
                  {formatIDR(plannerOutput.maxOtsPlan.totalCost)}
                </strong>
              </div>
            </div>
          </div>

          {/* PACKAGE 2: BEST CPM */}
          <div
            onClick={() => setActiveGoal('BEST_CPM')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              activeGoal === 'BEST_CPM'
                ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                  Efisiensi Tertinggi
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {plannerOutput.bestCpmPlan.spots.length} Titik
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Paket Efisiensi Biaya CPM Rendah</span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Memprioritaskan titik dengan tarif per 1.000 tayang (CPM) paling ekonomis untuk efisiensi investasi.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Blended CPM</span>
                <strong className="text-emerald-600 font-mono text-sm">
                  {formatIDR(plannerOutput.bestCpmPlan.blendedCpm)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Biaya Paket</span>
                <strong className="text-slate-900 font-mono text-xs">
                  {formatIDR(plannerOutput.bestCpmPlan.totalCost)}
                </strong>
              </div>
            </div>
          </div>

          {/* PACKAGE 3: BALANCED CORRIDORS */}
          <div
            onClick={() => setActiveGoal('BALANCED_CORRIDORS')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              activeGoal === 'BALANCED_CORRIDORS'
                ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                  Sebaran Merata
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {plannerOutput.balancedPlan.spots.length} Titik
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Paket Dominasi Multi-Koridor</span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Keseimbangan sebaran antara gerbang tol, pusat kota protokol, dan zona pusat perbelanjaan.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Sebaran Zona</span>
                <strong className="text-amber-700 font-mono text-sm">
                  {Object.keys(plannerOutput.balancedPlan.corridorSpread).length} Koridor
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Biaya Paket</span>
                <strong className="text-slate-900 font-mono text-xs">
                  {formatIDR(plannerOutput.balancedPlan.totalCost)}
                </strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Active Plan Package Dashboard (Utilization Gauge & Strategic Overview) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        
        {/* Top Header of Active Package */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                  Hasil Rekomendasi Terpilih
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {currentPlan.goalTitle} ({currentPlan.durationLabel})
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {currentPlan.goalTagline}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                {currentPlan.goalDescription}
              </p>
            </div>

            {/* Action Group */}
            <div className="flex items-center gap-2 shrink-0">
              {onOpenAiProposal && (
                <button
                  type="button"
                  onClick={handleProceedToOutreach}
                  disabled={currentPlan.spots.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Penawaran Klien</span>
                </button>
              )}
            </div>
          </div>

          {/* Budget Utilization Progress Bar */}
          <div className="mt-5 p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pemanfaatan Anggaran: {currentPlan.budgetUtilizationPercent}% Terpakai</span>
              </span>
              <span className="font-mono text-slate-600">
                Terpakai: <strong>{formatIDR(currentPlan.totalCost)}</strong> dari Plafon <strong>{formatIDR(currentPlan.budgetLimit)}</strong>
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200 flex">
              <div
                className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500 relative"
                style={{ width: `${Math.min(100, currentPlan.budgetUtilizationPercent)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
              <span className="text-emerald-700 font-semibold">
                ✓ Sisa Saldo: {formatIDR(currentPlan.remainingBudget)} (Efisiensi Tinggi)
              </span>
              <span className="text-slate-400">
                Kapasitas Penuh 100%
              </span>
            </div>
          </div>

          {/* Executive Assessment Box */}
          <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-xs text-indigo-950 mb-1">
                Executive Strategy Assessment (Analisis AI)
              </h5>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {currentPlan.executiveAssessment}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Breakdown Table of Selected Spots */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Rincian {currentPlan.spots.length} Titik Media dalam Paket</span>
              </h4>
              <p className="text-xs text-slate-500">
                Susunan titik paling bernilai tinggi yang lolos algoritma optimasi knapsack.
              </p>
            </div>

            <span className="text-xs text-slate-500">
              Total Impresi: <strong className="text-emerald-700 font-mono">{formatCompactNumber(currentPlan.totalImpressionsOTS)} OTS</strong>
            </span>
          </div>

          {currentPlan.spots.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="font-bold text-slate-700">Tidak ada titik yang muat ke dalam pagu anggaran ini.</div>
              <p className="max-w-md mx-auto text-slate-500 text-[11px]">
                Coba naikkan nilai plafon anggaran (misal Rp 25 Jt atau Rp 50 Jt) atau nonaktifkan filter "Hanya Titik Siap Pasang".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentPlan.spots.map((item, index) => {
                const spot = item.spot;
                const spotImage = getSpotImageUrl(spot);

                return (
                  <div
                    key={spot.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Spot Info & Thumbnail */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                        <img
                          src={spotImage}
                          alt={spot.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-mono px-1 rounded">
                          #{index + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            spot.category === 'DOOH_DIGITAL'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {spot.mediaType}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            {item.strategicRole}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            spot.isAvailable 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {spot.isAvailable ? 'Siap Pasang' : 'Tersewa'}
                          </span>
                        </div>

                        <h5 className="font-bold text-sm text-slate-900 truncate">
                          {spot.name}
                        </h5>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{spot.roadName}, {spot.city} • <strong className="text-slate-700">{spot.locationType}</strong></span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-2 flex-wrap">
                          <span>Ukuran: <strong className="text-slate-800">{spot.size}</strong></span>
                          <span>•</span>
                          <span>Visibilitas: <strong className="text-slate-800 font-mono">{spot.visibilityScore}/100</strong></span>
                          <span>•</span>
                          <span>Trafik Harian: <strong className="text-slate-800 font-mono">{formatCompactNumber(spot.dailyTraffic)} kend/hari</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Performance & Price Numbers */}
                    <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      
                      {/* Impressions & CPM */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-400 block">Proyeksi Impresi</span>
                        <div className="font-black text-emerald-600 font-mono text-sm">
                          {formatCompactNumber(item.periodImpressions)} OTS
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {item.otsSharePercent}% share • CPM {formatIDR(item.cpm)}
                        </span>
                      </div>

                      {/* Cost for duration */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-400 block">Tarif ({currentPlan.durationLabel})</span>
                        <div className="font-black text-slate-900 font-mono text-sm">
                          {formatIDR(item.costForDuration)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {item.budgetSharePercent}% dari paket
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {onOpenRoiCalculator && (
                          <button
                            type="button"
                            onClick={() => onOpenRoiCalculator(spot)}
                            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Hitung Estimasi ROI & Proyeksi Konversi Titik Ini"
                          >
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectSpot(spot)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Lihat Detail & Foto Lokasi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcludeSpot(spot.id)}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                          title="Keluarkan titik ini dari paket (optimalkan ulang pengganti)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. Footer Action Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Kombinasi disusun otomatis menggunakan algoritma <em>0-1 Knapsack Optimization</em> berbasis data impresi telemetri Jawa Barat.
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf || currentPlan.spots.length === 0}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-600" />
              <span>Unduh PDF</span>
            </button>

            {onOpenAiProposal && (
              <button
                type="button"
                onClick={handleProceedToOutreach}
                disabled={currentPlan.spots.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Proposal Klien</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
