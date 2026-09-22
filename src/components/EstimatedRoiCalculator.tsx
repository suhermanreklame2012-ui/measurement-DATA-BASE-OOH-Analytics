import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  Target,
  Sliders,
  Sparkles,
  Copy,
  Check,
  Eye,
  BarChart3,
  Calendar,
  Share2,
  FileDown,
  ChevronDown,
  Search,
  MapPin,
  Building2,
  Tag,
  DollarSign,
  Minus,
  Plus,
  ArrowRight,
  Info,
  CheckCircle2,
  Layers,
  Send,
  HelpCircle,
  Percent,
  X
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';
import { calculateCampaignPricing, CampaignDurationPricing } from '../utils/pricing';
import { exportEstimatedRoiPDF, RoiSimulationData } from '../utils/roiPdfExport';
import { openCustomWhatsAppMessage } from '../utils/whatsapp';
import { getSpotImageUrl } from '../utils/imageUtils';

export interface EstimatedRoiCalculatorProps {
  spots: MediaSpot[];
  initialSpotId?: string;
  selectedSpot?: MediaSpot;
  onSelectSpot?: (spot: MediaSpot) => void;
  onOpenAiProposal?: (spot: MediaSpot) => void;
  onClose?: () => void;
  standalone?: boolean;
}

export interface IndustryBenchmark {
  id: string;
  name: string;
  category: string;
  ctr: number; // in percent (e.g. 0.15 = 0.15%)
  ctrRange: string;
  defaultAov: number; // in IDR
  defaultConversionRate: number; // in percent (lead to closed sale, e.g. 8%)
  description: string;
}

export const OOH_INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  {
    id: 'fnb',
    name: 'Kuliner, F&B & Kafe',
    category: 'Food & Beverage',
    ctr: 0.15,
    ctrRange: '0.10% - 0.25%',
    defaultAov: 85_000,
    defaultConversionRate: 12,
    description: 'Tinggi dorongan impulsif, QR promo pesan antar, dan kunjungan dine-in cepat.'
  },
  {
    id: 'retail',
    name: 'Retail, Fashion & Lifestyle',
    category: 'Retail',
    ctr: 0.08,
    ctrRange: '0.05% - 0.15%',
    defaultAov: 350_000,
    defaultConversionRate: 8,
    description: 'Mendorong footfall ke butik/outlet & promo diskon musiman akhir pekan.'
  },
  {
    id: 'fmcg',
    name: 'FMCG & Kebutuhan Harian',
    category: 'Consumer Goods',
    ctr: 0.10,
    ctrRange: '0.06% - 0.18%',
    defaultAov: 120_000,
    defaultConversionRate: 15,
    description: 'Membangun brand recall kuat saat konsumen berbelanja ke supermarket.'
  },
  {
    id: 'tech',
    name: 'Gadget, Aplikasi & Tech',
    category: 'Technology',
    ctr: 0.12,
    ctrRange: '0.08% - 0.20%',
    defaultAov: 2_500_000,
    defaultConversionRate: 5,
    description: 'Pemicu unduhan aplikasi, kunjungan web, dan pencarian spesifikasi produk.'
  },
  {
    id: 'health',
    name: 'Klinik, Medis & Estetika',
    category: 'Healthcare',
    ctr: 0.06,
    ctrRange: '0.04% - 0.10%',
    defaultAov: 850_000,
    defaultConversionRate: 9,
    description: 'Mendorong reservasi konsultasi dokter spesialis & treatment kecantikan.'
  },
  {
    id: 'auto',
    name: 'Otomotif, EV & Dealer',
    category: 'Automotive',
    ctr: 0.04,
    ctrRange: '0.02% - 0.08%',
    defaultAov: 25_000_000,
    defaultConversionRate: 3,
    description: 'Pendaftaran test drive kendaraan, DP pembelian, dan servis berkala.'
  },
  {
    id: 'finance',
    name: 'Perbankan, Fintech & Asuransi',
    category: 'Financial',
    ctr: 0.05,
    ctrRange: '0.03% - 0.09%',
    defaultAov: 1_500_000,
    defaultConversionRate: 6,
    description: 'Pengajuan kredit usaha, pembukaan rekening digital, dan premi asuransi.'
  },
  {
    id: 'entertainment',
    name: 'Konser, Bioskop & Event',
    category: 'Entertainment',
    ctr: 0.18,
    ctrRange: '0.12% - 0.30%',
    defaultAov: 450_000,
    defaultConversionRate: 14,
    description: 'Viralitas QR scan tiket presale dan dorongan tanggal tayang terbatas.'
  },
  {
    id: 'property',
    name: 'Properti & Residensial',
    category: 'Real Estate',
    ctr: 0.03,
    ctrRange: '0.02% - 0.06%',
    defaultAov: 50_000_000,
    defaultConversionRate: 2,
    description: 'Kunjungan show unit perumahan cluster & booking fee investasi tanah.'
  }
];

export const EstimatedRoiCalculator: React.FC<EstimatedRoiCalculatorProps> = ({
  spots,
  initialSpotId,
  selectedSpot: controlledSpot,
  onSelectSpot,
  onOpenAiProposal,
  onClose,
  standalone = false
}) => {
  // Determine initially selected spot
  const defaultSpot = useMemo(() => {
    if (controlledSpot) return controlledSpot;
    if (initialSpotId) {
      const found = spots.find((s) => s.id === initialSpotId);
      if (found) return found;
    }
    return spots[0] || null;
  }, [controlledSpot, initialSpotId, spots]);

  const [activeSpotId, setActiveSpotId] = useState<string>(defaultSpot?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSpotSelectorOpen, setIsSpotSelectorOpen] = useState<boolean>(false);

  // Sync state if controlledSpot changes
  useEffect(() => {
    if (controlledSpot) {
      setActiveSpotId(controlledSpot.id);
    }
  }, [controlledSpot]);

  const currentSpot = useMemo(() => {
    return spots.find((s) => s.id === activeSpotId) || defaultSpot || spots[0];
  }, [spots, activeSpotId, defaultSpot]);

  // Campaign parameters
  const [campaignMonths, setCampaignMonths] = useState<number>(1);
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>('retail');
  const [isCustomCtr, setIsCustomCtr] = useState<boolean>(false);
  const [ctrValue, setCtrValue] = useState<number>(0.08); // in percent, e.g. 0.08%
  const [conversionRate, setConversionRate] = useState<number>(8); // in percent, e.g. 8%
  const [avgOrderValue, setAvgOrderValue] = useState<number>(350_000); // IDR
  const [aovInput, setAovInput] = useState<string>('350000');
  const [clientName, setClientName] = useState<string>('');
  const [clientCompany, setClientCompany] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // When changing industry benchmark
  const handleSelectIndustry = (benchmark: IndustryBenchmark) => {
    setSelectedIndustryId(benchmark.id);
    setIsCustomCtr(false);
    setCtrValue(benchmark.ctr);
    setConversionRate(benchmark.defaultConversionRate);
    setAvgOrderValue(benchmark.defaultAov);
    setAovInput(String(benchmark.defaultAov));
  };

  const handleCustomAovChange = (valStr: string) => {
    const numeric = parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0;
    setAovInput(valStr);
    setAvgOrderValue(numeric);
  };

  // Pricing calculations
  const pricingInfo: CampaignDurationPricing = useMemo(() => {
    if (!currentSpot) {
      return {
        months: 1,
        days: 30,
        monthlyRate: 0,
        totalPrice: 0,
        undiscountedPrice: 0,
        savingsAmount: 0,
        discountPercentage: 0,
        effectiveMonthlyRate: 0,
        isDiscounted: false
      };
    }
    return calculateCampaignPricing(currentSpot.pricing, campaignMonths);
  }, [currentSpot, campaignMonths]);

  const { days, totalPrice, savingsAmount, isDiscounted } = pricingInfo;

  // OTS and impressions
  const totalImpressions = useMemo(() => {
    if (!currentSpot) return 0;
    return Math.max(1, currentSpot.dailyImpressions * days);
  }, [currentSpot, days]);

  // Stage 1: CTR Responders / Engagements
  const potentialEngagements = useMemo(() => {
    return Math.max(1, Math.round(totalImpressions * (ctrValue / 100)));
  }, [totalImpressions, ctrValue]);

  // Stage 2: Potential Final Conversions (paying customers / sales closed)
  const potentialConversions = useMemo(() => {
    return Math.max(1, Math.round(potentialEngagements * (conversionRate / 100)));
  }, [potentialEngagements, conversionRate]);

  // Stage 3: Revenue & ROI
  const projectedRevenue = useMemo(() => {
    return potentialConversions * avgOrderValue;
  }, [potentialConversions, avgOrderValue]);

  const netProfit = useMemo(() => {
    return projectedRevenue - totalPrice;
  }, [projectedRevenue, totalPrice]);

  const roiPercentage = useMemo(() => {
    if (totalPrice <= 0) return 0;
    return ((projectedRevenue - totalPrice) / totalPrice) * 100;
  }, [projectedRevenue, totalPrice]);

  // Cost Per Mille (CPM)
  const cpm = useMemo(() => {
    if (totalImpressions <= 0) return 0;
    return (totalPrice / totalImpressions) * 1_000;
  }, [totalPrice, totalImpressions]);

  // Cost Per Acquisition (CPA)
  const cpa = useMemo(() => {
    if (potentialConversions <= 0) return 0;
    return totalPrice / potentialConversions;
  }, [totalPrice, potentialConversions]);

  // Cost per Engagement (CPE)
  const cpe = useMemo(() => {
    if (potentialEngagements <= 0) return 0;
    return totalPrice / potentialEngagements;
  }, [totalPrice, potentialEngagements]);

  // Break-even analysis
  const breakEvenConversions = useMemo(() => {
    if (avgOrderValue <= 0) return 0;
    return Math.ceil(totalPrice / avgOrderValue);
  }, [totalPrice, avgOrderValue]);

  const breakEvenRate = useMemo(() => {
    if (totalImpressions <= 0) return 0;
    return (breakEvenConversions / totalImpressions) * 100;
  }, [breakEvenConversions, totalImpressions]);

  // Filtered spots for dropdown selector
  const filteredSpots = useMemo(() => {
    if (!searchQuery.trim()) return spots;
    const q = searchQuery.toLowerCase();
    return spots.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.mediaType.toLowerCase().includes(q)
    );
  }, [spots, searchQuery]);

  // Selected benchmark object
  const currentBenchmark = useMemo(() => {
    return (
      OOH_INDUSTRY_BENCHMARKS.find((b) => b.id === selectedIndustryId) ||
      OOH_INDUSTRY_BENCHMARKS[1]
    );
  }, [selectedIndustryId]);

  // Simulation Data object for PDF export & Clipboard
  const simulationData: RoiSimulationData = useMemo(() => {
    return {
      spot: currentSpot,
      months: campaignMonths,
      days,
      totalCost: totalPrice,
      totalImpressions,
      industryName: isCustomCtr ? 'Kustom (Manual CTR)' : currentBenchmark.name,
      industryCtr: ctrValue,
      postClickConversionRate: conversionRate,
      avgOrderValue,
      potentialEngagements,
      potentialConversions,
      projectedRevenue,
      netProfit,
      roiPercentage,
      cpa,
      cpm,
      breakEvenConversions,
      breakEvenCtrNeeded: breakEvenRate,
      clientName: clientName || undefined,
      clientCompany: clientCompany || undefined
    };
  }, [
    currentSpot,
    campaignMonths,
    days,
    totalPrice,
    totalImpressions,
    isCustomCtr,
    currentBenchmark,
    ctrValue,
    conversionRate,
    avgOrderValue,
    potentialEngagements,
    potentialConversions,
    projectedRevenue,
    netProfit,
    roiPercentage,
    cpa,
    cpm,
    breakEvenConversions,
    breakEvenRate,
    clientName,
    clientCompany
  ]);

  // Text summary for WhatsApp & proposals
  const generateRoiText = (): string => {
    const isPos = roiPercentage >= 0;
    return `*ESTIMASI ROI & PROYEKSI KONVERSI OOH*
Titik: ${currentSpot.name} (${currentSpot.city})
Format: ${currentSpot.mediaType} • Ukuran: ${currentSpot.size}
Durasi Sewa: ${campaignMonths} Bulan (${days} hari)
Investasi Media: ${formatIDR(totalPrice)}

*1. Metrik Jangkauan & Respon OOH:*
• Total Impresi (OTS): ${totalImpressions.toLocaleString('id-ID')} tayangan
• Benchmark Industri: ${isCustomCtr ? 'Kustom' : currentBenchmark.name} (CTR ${ctrValue.toFixed(2)}%)
• Est. Respon / Interaksi Audiens: ~${potentialEngagements.toLocaleString('id-ID')} aksi (QR/Search/Call)
• Rasio Konversi ke Penjualan: ${conversionRate.toFixed(1)}%

*2. Proyeksi Penjualan & ROI Klien:*
• Potensi Pembeli / Transaksi: ~${potentialConversions.toLocaleString('id-ID')} penjualan
• Rata-rata Nilai Belanja (AOV): ${formatIDR(avgOrderValue)}
• Proyeksi Omzet Bruto: ${formatIDR(projectedRevenue)}
• Proyeksi Laba Bersih: ${isPos ? '+' : ''}${formatIDR(netProfit)}
• Estimasi ROI: ${isPos ? '+' : ''}${roiPercentage.toFixed(1)}%

*3. Efisiensi Biaya:*
• CPM (per 1.000 OTS): ${formatIDR(Math.round(cpm))}
• Biaya Akuisisi per Pembeli (CPA): ${formatIDR(Math.round(cpa))}
• Titik Impas (BEP): Cukup ${breakEvenConversions.toLocaleString('id-ID')} transaksi (${breakEvenRate.toFixed(5)}% dari total impresi) untuk menutup 100% biaya sewa!

_Dibuat otomatis oleh Estimated ROI Calculator • Suherman Reklame Bandung_`;
  };

  const handleCopySummary = () => {
    const text = generateRoiText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      exportEstimatedRoiPDF(simulationData);
    } catch (err) {
      console.error('Failed to generate ROI PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWa = () => {
    openCustomWhatsAppMessage(generateRoiText());
  };

  return (
    <div
      id="estimated-roi-calculator-section"
      className={`bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl overflow-hidden ${
        standalone ? 'w-full max-w-7xl mx-auto my-4 sm:my-6 p-4 sm:p-6' : 'p-4 sm:p-6'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Estimated ROI Calculator
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                OOH CTR Engine
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-semibold hidden md:inline-flex">
                Benchmark 9 Industri
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulasi proyeksi konversi & keuntungan bisnis berdasarkan impresi harian titik reklame dan rata-rata rasio respon (CTR) industri.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Unduh laporan proyeksi ROI dalam format dokumen PDF resmi"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Ekspor PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Salin analisis lengkap ke clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Salin</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShareWa}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="Kirim simulasi instan via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim WA</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Tutup Kalkulator"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Configuration & Right Executive Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        
        {/* LEFT COLUMN: Controls & Input Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* STEP 1: Selected Location Picker */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold font-mono">
                  1
                </span>
                <span>Pilih Lokasi Reklame (Selected Location)</span>
              </label>

              <span className="text-[11px] text-slate-400 font-mono">
                {spots.length} Titik Terdaftar
              </span>
            </div>

            {/* Custom Location Selector with Search Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSpotSelectorOpen(!isSpotSelectorOpen)}
                className="w-full flex items-center justify-between gap-3 p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-700 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                    <img
                      src={getSpotImageUrl(currentSpot)}
                      alt={currentSpot.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {currentSpot.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          currentSpot.mediaType === 'DOOH'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {currentSpot.mediaType}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        {currentSpot.city}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {currentSpot.dailyImpressions.toLocaleString('id-ID')} OTS/hari
                      </span>
                      <span>•</span>
                      <span className="text-slate-300">
                        {formatCompactIDR(currentSpot.pricing.oneMonth)}/bln
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:block text-right">
                    <div className="text-[10px] text-slate-400">Skor Visibilitas</div>
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      {currentSpot.visibilityScore}/100
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isSpotSelectorOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Dropdown Menu */}
              {isSpotSelectorOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-2 animate-in fade-in duration-150">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari lokasi, jalan, atau kota..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {filteredSpots.map((spot) => {
                      const isSel = spot.id === currentSpot.id;
                      return (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => {
                            setActiveSpotId(spot.id);
                            setIsSpotSelectorOpen(false);
                            if (onSelectSpot) onSelectSpot(spot);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-emerald-600/25 border border-emerald-500/50 text-white'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-white truncate">
                              {spot.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{spot.city}</span>
                              <span>•</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                {spot.dailyImpressions.toLocaleString('id-ID')} OTS/hari
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold font-mono text-slate-200">
                              {formatCompactIDR(spot.pricing.oneMonth)}
                            </div>
                            <div className="text-[9px] text-slate-400">/bulan</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Location Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Impresi Harian (OTS)</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {currentSpot.dailyImpressions.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Trafik Kendaraan</div>
                <div className="text-xs sm:text-sm font-bold text-blue-400 font-mono mt-0.5">
                  {currentSpot.dailyTraffic.toLocaleString('id-ID')}/hari
                </div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Dimensi & Tipe</div>
                <div className="text-xs sm:text-sm font-bold text-slate-200 truncate mt-0.5">
                  {currentSpot.size}
                </div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Tarif Bulanan Standar</div>
                <div className="text-xs sm:text-sm font-bold text-amber-300 font-mono mt-0.5">
                  {formatCompactIDR(currentSpot.pricing.oneMonth)}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Campaign Duration Selector (1 - 12 Months) */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold font-mono">
                  2
                </span>
                <span>Durasi Kampanye Iklan ({campaignMonths} Bulan / {days} Hari)</span>
              </label>

              {/* Stepper +/- */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setCampaignMonths(Math.max(1, campaignMonths - 1))}
                  disabled={campaignMonths <= 1}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center mx-1">
                  <span className="text-xs font-bold font-mono text-emerald-300 px-1">
                    {campaignMonths}
                  </span>
                  <span className="text-[11px] text-slate-400">Bln</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCampaignMonths(Math.min(12, campaignMonths + 1))}
                  disabled={campaignMonths >= 12}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Pills (1, 3, 6, 12 Months) */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { m: 1, label: '1 Bulan', sub: '30 Hari' },
                { m: 3, label: '3 Bulan', sub: 'Kuartal (90h)' },
                { m: 6, label: '6 Bulan', sub: 'Semester (180h)' },
                { m: 12, label: '1 Tahun', sub: 'Diskon 5% (365h)' }
              ].map((tier) => {
                const isSelected = campaignMonths === tier.m;
                return (
                  <button
                    key={tier.m}
                    type="button"
                    onClick={() => setCampaignMonths(tier.m)}
                    className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-750 text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{tier.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {tier.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Duration Slider */}
            <div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={campaignMonths}
                onChange={(e) => setCampaignMonths(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-750 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>1 Bln</span>
                <span>3 Bln</span>
                <span>6 Bln</span>
                <span>9 Bln</span>
                <span>12 Bln (1 Tahun)</span>
              </div>
            </div>

            {/* Rental Cost Summary with Discount notification */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-750 text-xs">
              <div className="text-slate-300">
                Total Biaya Sewa ({campaignMonths} Bulan):{' '}
                <span className="font-bold text-emerald-400 font-mono ml-1">
                  {formatIDR(totalPrice)}
                </span>
              </div>

              {isDiscounted ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40">
                  <Tag className="w-3 h-3" />
                  Hemat {formatIDR(savingsAmount)} (Diskon 5%)
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatCompactNumber(totalImpressions)} Kumulatif OTS
                </span>
              )}
            </div>
          </div>

          {/* STEP 3: Typical Industry CTR & Response Benchmarks */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold font-mono">
                  3
                </span>
                <span>Benchmark CTR Industri OOH (Click-Through Rate)</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCustomCtr(!isCustomCtr)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  isCustomCtr
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                }`}
              >
                {isCustomCtr ? 'Mode: Kustom Manual' : 'Kustom CTR'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              CTR pada media luar ruang (OOH/DOOH) mencerminkan persentase audiens yang melakukan aksi lanjutan (seperti pemindaian kode QR, pencarian Google, kunjungan website kampanye, atau telepon/WhatsApp).
            </p>

            {/* Quick Industry Grid (9 options) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OOH_INDUSTRY_BENCHMARKS.map((benchmark) => {
                const isSelected = !isCustomCtr && selectedIndustryId === benchmark.id;
                return (
                  <button
                    key={benchmark.id}
                    type="button"
                    onClick={() => handleSelectIndustry(benchmark)}
                    className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-500 text-white ring-1 ring-emerald-400'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-750 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold truncate">
                        {benchmark.name}
                      </span>
                      <span className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {benchmark.ctr.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 truncate">
                      Rentang: {benchmark.ctrRange}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Benchmark Description */}
            {!isCustomCtr && (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-300">
                  <span className="font-semibold text-white mr-1">
                    Karakteristik {currentBenchmark.name}:
                  </span>
                  {currentBenchmark.description}
                </div>
              </div>
            )}

            {/* CTR Slider Control */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-750 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Rasio Respon CTR Kampanye:
                </span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {ctrValue.toFixed(2)}%
                </span>
              </div>

              <input
                type="range"
                min="0.01"
                max="0.40"
                step="0.01"
                value={ctrValue}
                onChange={(e) => {
                  setCtrValue(parseFloat(e.target.value));
                  setIsCustomCtr(true);
                }}
                className="w-full accent-emerald-500 h-1.5 bg-slate-750 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0.01% (Sangat Konservatif)</span>
                <span>0.10% (Rata-rata OOH)</span>
                <span>0.25% (Agresif / Viral)</span>
                <span>0.40%</span>
              </div>
            </div>
          </div>

          {/* STEP 4: Conversion Rate & Average Order Value (AOV) */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold font-mono">
                  4
                </span>
                <span>Konversi Pembelian & Rata-rata Nilai Transaksi (AOV)</span>
              </label>

              <span className="text-[10px] text-slate-400">Parameter Finansial</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Conversion Rate from Click to Sale */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    Konversi Respon → Pembeli:
                  </span>
                  <span className="font-bold text-purple-300 font-mono">
                    {conversionRate.toFixed(1)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="25"
                  step="0.5"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-750 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>1% (Pintu Masuk)</span>
                  <span>8% (Standar)</span>
                  <span>25% (Tinggi)</span>
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  Persentase audiens yang merespon iklan yang akhirnya melakukan transaksi pembelian riil.
                </p>
              </div>

              {/* Average Order Value (AOV) */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    Rata-rata Nilai Belanja (AOV):
                  </span>
                  <span className="font-bold text-amber-300 font-mono">
                    {formatCompactIDR(avgOrderValue)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-medium font-mono">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={aovInput}
                    onChange={(e) => handleCustomAovChange(e.target.value)}
                    placeholder="350000"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Quick AOV Presets */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { l: '75 Rb', v: 75_000 },
                    { l: '350 Rb', v: 350_000 },
                    { l: '1.5 Jt', v: 1_500_000 },
                    { l: '5 Jt', v: 5_000_000 }
                  ].map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => {
                        setAvgOrderValue(p.v);
                        setAovInput(String(p.v));
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Optional Client Metadata for Proposal/PDF */}
          <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 flex flex-col sm:flex-row items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium shrink-0">Nama Klien / Brand (Opsional):</span>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Contoh: PT. Sumber Rasa Nusantara"
              className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Performance Projections & Conversion Funnel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Executive Performance Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* 1. Potential Conversions */}
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-1">
              <div className="text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                Potensi Konversi Penjualan
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                ~{potentialConversions.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-purple-200">
                Dari ~{potentialEngagements.toLocaleString('id-ID')} respon CTR
              </div>
            </div>

            {/* 2. Projected ROI % */}
            <div
              className={`p-3.5 rounded-xl border space-y-1 ${
                roiPercentage >= 0
                  ? 'bg-emerald-950/50 border-emerald-500/50'
                  : 'bg-rose-950/50 border-rose-500/50'
              }`}
            >
              <div className="text-[10px] font-semibold flex items-center gap-1 text-slate-300">
                <TrendingUp className="w-3.5 h-3.5" />
                Estimasi ROI Kampanye
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold font-mono ${
                  roiPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {roiPercentage >= 0 ? '+' : ''}
                {roiPercentage.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-300 truncate font-mono">
                Laba: {netProfit >= 0 ? '+' : ''}
                {formatCompactIDR(netProfit)}
              </div>
            </div>

            {/* 3. Projected Gross Revenue */}
            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Proyeksi Omzet Bruto
              </div>
              <div className="text-base sm:text-lg font-bold text-amber-300 font-mono truncate">
                {formatIDR(projectedRevenue)}
              </div>
              <div className="text-[10px] text-slate-400">
                Investasi: {formatCompactIDR(totalPrice)}
              </div>
            </div>

            {/* 4. Cost Per Acquisition (CPA) & CPM */}
            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Efisiensi Biaya (CPA)
              </div>
              <div className="text-base sm:text-lg font-bold text-blue-300 font-mono truncate">
                {formatIDR(Math.round(cpa))}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                CPM: {formatIDR(Math.round(cpm))} / 1rb OTS
              </div>
            </div>

          </div>

          {/* OOH CONVERSION FUNNEL VISUALIZATION */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Corong Konversi OOH (Conversion Funnel)</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                {days} Hari Tayang
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {/* Funnel Step 1: Total Impressions (100%) */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    1. Total Impresi Audiens (OTS)
                  </span>
                  <span className="font-bold text-white font-mono">
                    {totalImpressions.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full w-full" />
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Pasang mata terpapar reklame</span>
                  <span className="font-mono">100% Paparan</span>
                </div>
              </div>

              {/* Funnel Step 2: Clicks / Engagements via Industry CTR */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    2. Respon Audiens (CTR {ctrValue.toFixed(2)}%)
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">
                    ~{potentialEngagements.toLocaleString('id-ID')} aksi
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(15, ctrValue * 250))}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Scan QR / Kunjungan Web / Call</span>
                  <span className="font-mono">Biaya per respon: {formatIDR(Math.round(cpe))}</span>
                </div>
              </div>

              {/* Funnel Step 3: Paying Conversions */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    3. Pelanggan Konversi ({conversionRate.toFixed(1)}%)
                  </span>
                  <span className="font-bold text-purple-300 font-mono">
                    ~{potentialConversions.toLocaleString('id-ID')} pembeli
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, conversionRate * 4))}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Transaksi riil penutupan penjualan</span>
                  <span className="font-mono text-purple-300 font-semibold">
                    CPA: {formatIDR(Math.round(cpa))}
                  </span>
                </div>
              </div>

              {/* Funnel Step 4: Gross Revenue */}
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-300 font-semibold">
                    4. Omzet Penjualan yang Dihasilkan
                  </div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {formatIDR(projectedRevenue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Laba Bersih</div>
                  <div
                    className={`text-xs font-bold font-mono ${
                      netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
                    }`}
                  >
                    {netProfit >= 0 ? '+' : ''}
                    {formatIDR(netProfit)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BREAK-EVEN POINT (BEP) INSIGHT CARD */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Analisis Titik Impas (Break-Even Point):</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Bisnis Anda hanya membutuhkan{' '}
              <span className="font-bold text-emerald-300 font-mono">
                {breakEvenConversions.toLocaleString('id-ID')} transaksi
              </span>{' '}
              (hanya{' '}
              <span className="font-mono text-emerald-300 font-semibold">
                {breakEvenRate.toFixed(5)}%
              </span>{' '}
              dari total {totalImpressions.toLocaleString('id-ID')} impresi yang melihat reklame) untuk menutup 100% biaya sewa media{' '}
              <span className="font-semibold text-slate-200">
                {formatIDR(totalPrice)}
              </span>
              !
            </p>
          </div>

          {/* CALL TO ACTION: BRIDGE TO AI PROPOSAL */}
          {onOpenAiProposal && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onOpenAiProposal(currentSpot)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer group"
              >
                <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                <span>Buat Penawaran AI Lengkap dengan Analisis ROI Ini</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* SENSITIVITY BENCHMARK TABLE (Bottom Strip) */}
      <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Matriks Skenario Sensitivitas (Konservatif vs Realistis vs Optimis)</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Tolok ukur variasi performa materi visual reklame
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: 'Skenario Konservatif',
              badge: 'Materi Standar (-30%)',
              ctr: ctrValue * 0.7,
              conv: Math.round(potentialConversions * 0.7),
              rev: Math.round(projectedRevenue * 0.7),
              profit: Math.round(projectedRevenue * 0.7) - totalPrice,
              borderColor: 'border-slate-750',
              bgColor: 'bg-slate-850'
            },
            {
              title: 'Skenario Realistis',
              badge: 'Benchmark Industri',
              ctr: ctrValue,
              conv: potentialConversions,
              rev: projectedRevenue,
              profit: netProfit,
              borderColor: 'border-emerald-500/50',
              bgColor: 'bg-emerald-950/20'
            },
            {
              title: 'Skenario Optimis',
              badge: 'Promo Menarik / Viral (+30%)',
              ctr: ctrValue * 1.3,
              conv: Math.round(potentialConversions * 1.3),
              rev: Math.round(projectedRevenue * 1.3),
              profit: Math.round(projectedRevenue * 1.3) - totalPrice,
              borderColor: 'border-purple-500/40',
              bgColor: 'bg-purple-950/20'
            }
          ].map((sc, idx) => {
            const roi =
              totalPrice > 0 ? ((sc.profit) / totalPrice) * 100 : 0;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border ${sc.borderColor} ${sc.bgColor} space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{sc.title}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {sc.badge}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <div className="text-[10px] text-slate-400">CTR Efektif:</div>
                    <div className="font-mono font-bold text-emerald-400">
                      {sc.ctr.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Est. Pembeli:</div>
                    <div className="font-mono font-bold text-purple-300">
                      ~{sc.conv.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Est. Omzet:</div>
                    <div className="font-mono font-bold text-amber-300 truncate">
                      {formatCompactIDR(sc.rev)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Proyeksi ROI:</div>
                    <div
                      className={`font-mono font-bold ${
                        roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {roi >= 0 ? '+' : ''}
                      {roi.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
