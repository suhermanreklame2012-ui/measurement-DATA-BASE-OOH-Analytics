import React, { useState, useMemo } from 'react';
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
  CheckCircle2, 
  Share2,
  Minus,
  Plus,
  Tag,
  Calendar,
  Zap
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';
import { calculateCampaignPricing, CampaignDurationPricing } from '../utils/pricing';

interface SpotRoiCalculatorProps {
  spot: MediaSpot;
  months?: number;
  onMonthsChange?: (months: number) => void;
  onShareToWhatsApp?: (simulationText: string) => void;
}

interface IndustryPreset {
  name: string;
  aov: number;
  rate: number;
}

const INDUSTRY_PRESETS: IndustryPreset[] = [
  { name: 'F&B / Kafe', aov: 75_000, rate: 0.08 },
  { name: 'Retail / Fashion', aov: 350_000, rate: 0.05 },
  { name: 'Klinik / Medis', aov: 1_200_000, rate: 0.03 },
  { name: 'Gadget / Elektronik', aov: 3_500_000, rate: 0.02 },
  { name: 'Otomotif / Properti', aov: 15_000_000, rate: 0.01 },
];

export const SpotRoiCalculator: React.FC<SpotRoiCalculatorProps> = ({ 
  spot, 
  months: externalMonths, 
  onMonthsChange, 
  onShareToWhatsApp 
}) => {
  const [internalMonths, setInternalMonths] = useState<number>(1);
  const [conversionRate, setConversionRate] = useState<number>(0.05); // in percent: 0.05%
  const [avgOrderValue, setAvgOrderValue] = useState<number>(350_000); // Rp 350.000
  const [customAovInput, setCustomAovInput] = useState<string>('350000');
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Active months (controlled or uncontrolled)
  const activeMonths = externalMonths !== undefined ? externalMonths : internalMonths;

  const handleSetMonths = (newMonths: number) => {
    const clamped = Math.max(1, Math.min(12, Math.round(newMonths)));
    if (onMonthsChange) {
      onMonthsChange(clamped);
    } else {
      setInternalMonths(clamped);
    }
  };

  // Pricing calculation with bulk discounts
  const pricingInfo: CampaignDurationPricing = useMemo(() => {
    return calculateCampaignPricing(spot.pricing, activeMonths);
  }, [spot.pricing, activeMonths]);

  const { days, totalPrice, savingsAmount, discountPercentage, effectiveMonthlyRate, tierBadge } = pricingInfo;

  // Accumulation of impressions (OTS)
  const totalImpressions = useMemo(() => {
    return Math.max(1, spot.dailyImpressions * days);
  }, [spot.dailyImpressions, days]);

  // Cost Per Mille (per 1,000 OTS)
  const cpm = useMemo(() => {
    return (totalPrice / totalImpressions) * 1_000;
  }, [totalPrice, totalImpressions]);

  // Cost per Single Impression (OTS)
  const costPerImpression = useMemo(() => {
    return totalPrice / totalImpressions;
  }, [totalPrice, totalImpressions]);

  // Estimated Responses / Orders
  const estimatedConversions = useMemo(() => {
    const raw = totalImpressions * (conversionRate / 100);
    return Math.round(raw);
  }, [totalImpressions, conversionRate]);

  // Projected Gross Revenue
  const projectedRevenue = useMemo(() => {
    return estimatedConversions * avgOrderValue;
  }, [estimatedConversions, avgOrderValue]);

  // Net Profit over Rental Cost
  const netProfit = useMemo(() => {
    return projectedRevenue - totalPrice;
  }, [projectedRevenue, totalPrice]);

  // Projected ROI Percentage
  const roiPercentage = useMemo(() => {
    if (totalPrice <= 0) return 0;
    return ((projectedRevenue - totalPrice) / totalPrice) * 100;
  }, [projectedRevenue, totalPrice]);

  // Break-even Units / Customers needed
  const breakEvenCustomers = useMemo(() => {
    if (avgOrderValue <= 0) return 0;
    return Math.ceil(totalPrice / avgOrderValue);
  }, [totalPrice, avgOrderValue]);

  // Break-even percentage of total impressions
  const breakEvenRate = useMemo(() => {
    if (totalImpressions <= 0) return 0;
    return (breakEvenCustomers / totalImpressions) * 100;
  }, [breakEvenCustomers, totalImpressions]);

  // Handle custom AOV change
  const handleAovChange = (valStr: string) => {
    const numeric = parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0;
    setCustomAovInput(valStr);
    setAvgOrderValue(numeric);
  };

  // Apply Industry Preset
  const handleApplyPreset = (preset: IndustryPreset) => {
    setAvgOrderValue(preset.aov);
    setCustomAovInput(String(preset.aov));
    setConversionRate(preset.rate);
  };

  // Generate formatted text for proposals & chat
  const generateRoiSummaryText = (): string => {
    const discountText = savingsAmount > 0 
      ? `• Diskon Durasi (>6 Bulan): Diskon 5% (Hemat ${formatIDR(savingsAmount)})` 
      : '• Diskon Durasi: Tidak ada diskon (durasi ≤ 6 bulan)';

    return `*ESTIMASI ROI & EFISIENSI BIAYA SEWA REKLAME*
Titik: ${spot.name} (${spot.city})
Format: ${spot.mediaType} - ${spot.size}
Durasi Kampanye: ${activeMonths} Bulan (${days} hari)
Perhitungan Sewa: ${formatIDR(spot.pricing.oneMonth)} × ${activeMonths} bln = ${formatIDR(pricingInfo.undiscountedPrice)}
${discountText}
Total Biaya Sewa: ${formatIDR(totalPrice)} (${formatIDR(effectiveMonthlyRate)}/bln)

*1. Efisiensi Media (OTS):*
• Total Est. Impresi: ${totalImpressions.toLocaleString('id-ID')} tayangan
• CPM (Biaya / 1.000 Impresi): ${formatIDR(Math.round(cpm))}
• Biaya per Impresi (Cost/View): Rp ${costPerImpression.toFixed(2)}

*2. Proyeksi Penjualan & ROI:*
• Asumsi Respon/Konversi: ${conversionRate.toFixed(2)}%
• Nilai Transaksi Rata-rata: ${formatIDR(avgOrderValue)}
• Estimasi Pelanggan/Penjualan: ~${estimatedConversions.toLocaleString('id-ID')} transaksi
• Estimasi Omzet Penjualan: ${formatIDR(projectedRevenue)}
• Proyeksi ROI: ${roiPercentage > 0 ? '+' : ''}${roiPercentage.toFixed(1)}% (${formatIDR(netProfit)})

*3. Titik Impas (BEP):*
• Hanya butuh ${breakEvenCustomers.toLocaleString('id-ID')} transaksi (${breakEvenRate.toFixed(4)}% dari total impresi) untuk menutup 100% biaya sewa!`;
  };

  const handleCopySummary = () => {
    const text = generateRoiSummaryText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-slate-700/80 p-4 sm:p-5 text-white shadow-xl space-y-4">
      
      {/* Header with Title & Expand Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-white">
                Kalkulator Estimasi ROI & CPM
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                Durasi 1 - 12 Bulan
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ukur efisiensi biaya sewa berdasarkan angka impresi (OTS), durasi, dan diskon kuantitas.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isExpanded ? 'Sembunyikan' : 'Buka Kalkulator'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1 border-t border-slate-800 animate-in fade-in duration-200">
          
          {/* Step 1: Campaign Duration Selector (1 - 12 Months) with Bulk Discount Notification */}
          <div className="space-y-2.5 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Durasi Kampanye Iklan (1 - 12 Bulan):</span>
              </label>

              {/* Direct Input & Stepper Controls */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleSetMonths(activeMonths - 1)}
                  disabled={activeMonths <= 1}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Kurangi 1 Bulan"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center mx-1">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={activeMonths}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) handleSetMonths(val);
                    }}
                    className="w-9 text-center text-xs font-bold font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded bg-slate-800"
                  />
                  <span className="text-[11px] text-slate-400 ml-1">Bulan</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSetMonths(activeMonths + 1)}
                  disabled={activeMonths >= 12}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tambah 1 Bulan"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick 1-12 Month Pills Toggle Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isSelected = activeMonths === m;
                const isMilestone = m === 1 || m === 3 || m === 6 || m === 12;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSetMonths(m)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer text-xs font-semibold relative ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-bold ring-2 ring-emerald-300'
                        : isMilestone
                          ? 'bg-slate-700/80 text-emerald-300 hover:bg-slate-700 border border-emerald-500/40'
                          : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-750'
                    }`}
                    title={`Durasi ${m} Bulan`}
                  >
                    <div>{m} bln</div>
                    {isMilestone && !isSelected && (
                      <span className="block text-[8px] text-emerald-400/80 -mt-0.5 leading-none">
                        {m === 3 ? '★ 3m' : m === 6 ? '★ 6m' : m === 12 ? '★ 1y' : 'reg'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Month Slider */}
            <div className="pt-1">
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={activeMonths}
                onChange={(e) => handleSetMonths(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>1 Bulan (Reguler)</span>
                <span>3 Bulan (Kuartal)</span>
                <span>6 Bulan (Semester)</span>
                <span>12 Bulan (1 Tahun Penuh)</span>
              </div>
            </div>

            {/* Pricing Breakdown & Bulk Discount Highlight Card */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total Tarif Sewa ({activeMonths} Bulan):</span>
                  {tierBadge && (
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                      {tierBadge}
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">
                  {formatIDR(totalPrice)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Rata-rata: <span className="text-slate-200 font-medium">{formatIDR(effectiveMonthlyRate)}</span> / bulan ({days} hari tayang)
                </div>
              </div>

              {savingsAmount > 0 ? (
                <div className="px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-right flex flex-col sm:items-end justify-center">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Diskon 5% Aktif (&gt;6 Bulan)</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-200">
                    Hemat {formatIDR(savingsAmount)}
                  </div>
                  <div className="text-[9px] text-emerald-400/80">
                    Dibanding tarif bulanan reguler ({formatCompactIDR(pricingInfo.undiscountedPrice)})
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 italic bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700">
                  Tip: Durasi kampanye &gt; 6 bulan (7–12 bulan) otomatis mendapatkan diskon sewa 5%!
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Interactive Business Assumptions */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                2. Asumsi Konversi & Nilai Transaksi Klien:
              </span>
              <span className="text-[10px] text-slate-400">Sesuaikan profil usaha</span>
            </div>

            {/* Quick Industry Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Preset Cepat:</span>
              {INDUSTRY_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-1 rounded-md bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] border border-slate-650 transition-colors cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Conversion Rate Slider */}
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Est. Respon / Konversi:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {conversionRate.toFixed(2)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>0.01% (Konservatif)</span>
                  <span>0.10% (Moderat)</span>
                  <span>0.30% (Agresif)</span>
                </div>
              </div>

              {/* Average Order Value (AOV) Input */}
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Rata-rata Nilai Transaksi:</span>
                  <span className="font-bold text-amber-300 font-mono">
                    {formatIDR(avgOrderValue)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-medium">Rp</span>
                  <input
                    type="text"
                    value={customAovInput}
                    onChange={(e) => handleAovChange(e.target.value)}
                    placeholder="350000"
                    className="w-full pl-8 pr-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="text-[9px] text-slate-500">
                  Estimasi rata-rata pembelian per customer
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Key Results Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* CPM Efficiency Card */}
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3 text-blue-400" />
                CPM (per 1.000 OTS)
              </div>
              <div className="text-base font-bold text-blue-400 font-mono">
                {formatIDR(Math.round(cpm))}
              </div>
              <div className="text-[9px] text-slate-400">
                Hanya Rp {costPerImpression.toFixed(2)}/orang
              </div>
            </div>

            {/* Total Accumulated Impressions */}
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-emerald-400" />
                Akumulasi Impresi
              </div>
              <div className="text-base font-bold text-emerald-400 font-mono">
                {formatCompactNumber(totalImpressions)}
              </div>
              <div className="text-[9px] text-slate-400">
                Selama {activeMonths} bln ({days} hari)
              </div>
            </div>

            {/* Projected Conversions & Revenue */}
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-purple-400" />
                Est. Penjualan
              </div>
              <div className="text-base font-bold text-purple-300 font-mono">
                ~{estimatedConversions.toLocaleString('id-ID')}
              </div>
              <div className="text-[9px] text-purple-300/80 truncate" title={`Omzet: ${formatIDR(projectedRevenue)}`}>
                Omzet: {formatCompactIDR(projectedRevenue)}
              </div>
            </div>

            {/* Projected ROI % */}
            <div className={`p-3 rounded-xl border space-y-1 ${
              roiPercentage >= 0 
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}>
              <div className="text-[10px] flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                Proyeksi ROI
              </div>
              <div className={`text-base font-bold font-mono ${roiPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {roiPercentage > 0 ? '+' : ''}{roiPercentage.toFixed(1)}%
              </div>
              <div className="text-[9px] opacity-80 truncate">
                Laba: {formatCompactIDR(netProfit)}
              </div>
            </div>

          </div>

          {/* Break-Even Highlight Banner */}
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-emerald-200">
                Insight Titik Impas (Break-Even Point):
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Klien Anda hanya membutuhkan <span className="font-bold text-emerald-300">{breakEvenCustomers.toLocaleString('id-ID')} transaksi</span> selama {activeMonths} Bulan (hanya <span className="font-mono text-emerald-300 font-semibold">{breakEvenRate.toFixed(4)}%</span> dari {formatCompactNumber(totalImpressions)} pasang mata yang melihat reklame ini) untuk menutup 100% biaya sewa media!
              </p>
            </div>
          </div>

          {/* Action Buttons for Client Proposal */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="text-[10px] text-slate-400">
              *Model simulasi berbasis formulasi OTS & response-rate industri periklanan OOH Indonesia.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Salin ringkasan analisis ROI ini untuk dikirim ke klien"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Salin Analisis ROI</span>
                  </>
                )}
              </button>

              {onShareToWhatsApp && (
                <button
                  type="button"
                  onClick={() => onShareToWhatsApp(generateRoiSummaryText())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-xs font-bold text-slate-950 transition-colors cursor-pointer"
                  title="Bagikan simulasi ini langsung via WhatsApp Web"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim via WA</span>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
