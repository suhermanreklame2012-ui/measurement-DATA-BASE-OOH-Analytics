import React, { useState, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Eye, 
  Car, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  Layers, 
  Zap,
  Clock,
  ShieldCheck,
  ExternalLink,
  Navigation,
  Send,
  MessageCircle,
  QrCode,
  Tag,
  Minus,
  Plus,
  TrendingUp,
  Percent,
  Sliders,
  Calculator,
  CalendarCheck
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';
import { openSpotDirectWhatsApp, openCustomWhatsAppMessage } from '../utils/whatsapp';
import { calculateCampaignPricing, calculatePotentialRoi } from '../utils/pricing';
import { TECHNICAL_NOTES } from '../data/spotsData';
import { SpotQrCodeGenerator } from './SpotQrCodeGenerator';
import { SpotRoiCalculator } from './SpotRoiCalculator';
import { googleSignIn, getAccessToken } from '../services/googleAuthService';
import { createCalendarEvent } from '../services/googleCalendarService';
import { addNotification } from '../services/storageService';

interface MediaDetailModalProps {
  spot: MediaSpot | null;
  onClose: () => void;
  onToggleAvailability: (spotId: string) => void;
  onOpenAiProposal?: (spot: MediaSpot) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  spot,
  onClose,
  onToggleAvailability,
  onOpenAiProposal
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [campaignMonths, setCampaignMonths] = useState<number>(1);
  const [bookingStartDate, setBookingStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isBookingCalendar, setIsBookingCalendar] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const activePricing = useMemo(() => {
    if (!spot) return { days: 0, totalPrice: 0, savingsAmount: 0, undiscountedPrice: 0, effectiveMonthlyRate: 0 };
    return calculateCampaignPricing(spot.pricing, campaignMonths);
  }, [spot?.pricing, campaignMonths]);

  const potentialRoi = useMemo(() => {
    if (!spot) return {
      roiPercentage: 0,
      totalImpressions: 0,
      cpm: 0,
      projectedRevenue: 0,
      netProfit: 0,
      breakEvenTransactions: 0
    };
    return calculatePotentialRoi(
      spot.dailyImpressions,
      activePricing.days,
      activePricing.totalPrice
    );
  }, [spot?.dailyImpressions, activePricing.days, activePricing.totalPrice]);

  if (!spot) return null;

  const isDooh = spot.category === 'DOOH_DIGITAL';

  const handleBookCalendar = async () => {
    setBookingError(null);
    setIsBookingCalendar(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (authRes) {
          token = authRes.accessToken;
        } else {
          throw new Error('Gagal masuk ke Google. Silakan coba lagi.');
        }
      }

      if (token) {
        if (!confirm(`Apakah Anda yakin ingin menjadwalkan sewa untuk "${spot.name}" di Google Calendar selama ${campaignMonths} bulan mulai tanggal ${bookingStartDate}?`)) {
          setIsBookingCalendar(false);
          return;
        }

        const startDate = new Date(bookingStartDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + campaignMonths);

        const event = {
          summary: `Booking OOH: ${spot.name}`,
          description: `Durasi: ${campaignMonths} Bulan\nHarga Total: ${formatIDR(activePricing.totalPrice)}\nLokasi: ${spot.address}`,
          location: spot.address,
          start: {
            date: startDate.toISOString().split('T')[0]
          },
          end: {
            date: endDate.toISOString().split('T')[0]
          }
        };

        await createCalendarEvent(token, event);
        addNotification({
          title: 'Berhasil Dijadwalkan',
          message: `Booking sewa "${spot.name}" selama ${campaignMonths} bulan telah ditambahkan ke Google Calendar Anda.`,
          type: 'create'
        });
        alert('Berhasil dijadwalkan ke Google Calendar!');
      }
    } catch (err: any) {
      console.error(err);
      setBookingError(err.message || 'Gagal menjadwalkan ke kalender.');
    } finally {
      setIsBookingCalendar(false);
    }
  };

  const handleCopyProposal = () => {
    const savingsNote = activePricing.savingsAmount > 0 
      ? `• Diskon Durasi (>6 Bulan): Diskon 5% (Hemat ${formatIDR(activePricing.savingsAmount)})`
      : '• Diskon Durasi: Tidak ada diskon (durasi ≤ 6 bulan)';

    const text = `*PENAWARAN TITIK MEDIA OOH/DOOH JAWA BARAT*
Lokasi: ${spot.name}
Wilayah: ${spot.city} (Kec. ${spot.district})
Jenis Media: ${spot.mediaType}
Ukuran: ${spot.size} (${spot.layout})
Kepadatan Traffic: ${spot.trafficDensity} (~${spot.dailyTraffic.toLocaleString('id-ID')} kend./hari)
Est. Impresi: ${spot.dailyImpressions.toLocaleString('id-ID')} OTS/hari
Status: ${spot.isAvailable ? 'TERSEDIA' : 'TERSEWA'}

*Simulasi Durasi Kampanye: ${campaignMonths} Bulan (${activePricing.days} Hari)*
• Tarif Dasar Bulanan: ${formatIDR(spot.pricing.oneMonth)}/bulan
• Perhitungan Sewa: ${formatIDR(spot.pricing.oneMonth)} × ${campaignMonths} bulan = ${formatIDR(activePricing.undiscountedPrice)}
${savingsNote}
• Total Biaya Sewa: ${formatIDR(activePricing.totalPrice)} (rata-rata ${formatIDR(activePricing.effectiveMonthlyRate)}/bulan)
• Est. Akumulasi Impresi: ${potentialRoi.totalImpressions.toLocaleString('id-ID')} OTS
• CPM (Cost / 1.000 Tayang): ${formatIDR(Math.round(potentialRoi.cpm))}
• Potensi Total ROI: +${potentialRoi.roiPercentage.toFixed(1)}% (Estimasi Profit Bersih: +${formatIDR(potentialRoi.netProfit)})
• Titik Impas (BEP): Cukup ${potentialRoi.breakEvenTransactions} transaksi (asumsi belanja rata-rata Rp 350.000)

*Struktur Tarif Standar:*
- 1 Bulan / Sisi: ${formatIDR(spot.pricing.oneMonth)}
- 3 Bulan / Sisi: ${formatIDR(spot.pricing.threeMonths)}
- 6 Bulan / Sisi: ${formatIDR(spot.pricing.sixMonths)}
- 1 Tahun / Sisi: ${formatIDR(spot.pricing.oneYear)}

*Ketentuan:*
- Produksi 3 hari kerja setelah PO/SPK.
- Harga belum termasuk PPN 11%.
- Sudah termasuk listrik, asuransi, dan pemeliharaan materi.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide flex-shrink-0 ${
              isDooh 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isDooh ? 'DOOH Videotron' : 'OOH Statis'}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-white truncate">
              {spot.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <button
              onClick={() => setShowQrCode(!showQrCode)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showQrCode
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
              }`}
              title="Tampilkan QR Code WhatsApp Deep Link untuk di-scan klien di lapangan"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{showQrCode ? 'Tutup QR' : 'QR Scan'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Simulated Media Display Visual Box */}
          <div 
            className="relative w-full h-44 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 text-center border border-slate-700 shadow-inner bg-cover bg-center"
            style={spot.imageUrl ? { backgroundImage: `url(${spot.imageUrl})` } : {}}
          >
            {/* Dark overlay for readability if image exists */}
            {spot.imageUrl && <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>}
            
            <div className="relative z-10 w-full">
              {isDooh ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 text-[11px] font-semibold animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    LED Digital Video Wall Display
                  </div>
                  <div className="text-white font-bold text-lg tracking-wide drop-shadow-md">
                    {spot.name}
                  </div>
                  <div className="text-xs text-slate-300 drop-shadow-md">
                    {spot.size} • {spot.spotsPerDay || 540} Spot Tayang/Hari • Durasi {spot.loopDurationSec || 15} Detik
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-semibold">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Konstruksi {spot.mediaType}
                  </div>
                  <div className="text-white font-bold text-lg tracking-wide drop-shadow-md">
                    {spot.name}
                  </div>
                  <div className="text-xs text-slate-300 drop-shadow-md">
                    Ukuran {spot.size} ({spot.layout}) • Pencahayaan {spot.lighting || 'Frontlite'}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Tag */}
            <div className="absolute bottom-2 right-3 z-10 text-[10px] text-slate-300 font-mono drop-shadow-md">
              Koordinat: {spot.coordinates.lat}, {spot.coordinates.lng}
            </div>
          </div>

          {/* Field Agent QR Code Generator Section (WhatsApp Deep Link) */}
          {showQrCode ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
              <SpotQrCodeGenerator spot={spot} onClose={() => setShowQrCode(false)} />
            </div>
          ) : (
            <div 
              onClick={() => setShowQrCode(true)}
              className="p-3 bg-gradient-to-r from-emerald-950/10 via-slate-50 to-emerald-950/5 border border-emerald-200 hover:border-emerald-400 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer transition-all group shadow-2xs hover:shadow-xs"
              title="Buka generator QR Code untuk dibagikan ke smartphone klien"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform shrink-0">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Integrasi WhatsApp Web & QR Code</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      web.whatsapp.com
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Buka langsung di WhatsApp Web komputer Anda atau pindai QR Code dengan smartphone klien (+62 87822248975).
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-0.5 shrink-0">
                Buka QR & Web →
              </span>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                <Car className="w-3 h-3 text-blue-500" />
                Traffic Harian
              </div>
              <div className="text-sm font-bold text-slate-900">
                {spot.dailyTraffic.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {spot.trafficDensity}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                <Eye className="w-3 h-3 text-emerald-500" />
                Est. Impresi (OTS)
              </div>
              <div className="text-sm font-bold text-emerald-600">
                {formatCompactNumber(spot.dailyImpressions)} /hari
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                OTS Views Terukur
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Visibility Score
              </div>
              <div className="text-sm font-bold text-amber-600">
                {spot.visibilityScore} / 100
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Sudut & Jarak Pandang
              </div>
            </div>
          </div>

          {/* Location & Zoning Details */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Lokasi & Klasifikasi Spasial
            </h4>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[11px]">Wilayah Administratif:</span>
                <div className="font-semibold text-slate-800">{spot.city} (Kec. {spot.district})</div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Koridor Jalan:</span>
                <div className="font-semibold text-slate-800">{spot.roadName}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Karakteristik Lokasi:</span>
                <div className="font-semibold text-blue-700">{spot.locationType}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Status Ketersediaan:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <button
                    onClick={() => onToggleAvailability(spot.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      spot.isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {spot.isAvailable ? 'Tersedia (Ready)' : 'Tersewa (Sold Out)'}
                  </button>
                  <span className="text-[10px] text-slate-400">(klik untuk ubah)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Duration, Pricing & Potential Total ROI Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulasi Durasi Kampanye & Potensi Total ROI</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">
                Pilih Durasi 1 – 12 Bulan
              </span>
            </div>

            {/* Interactive Duration Controller Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
              {/* Duration Header with Input & Stepper */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label htmlFor="campaign-duration-input" className="block text-xs font-bold text-slate-900">
                    Campaign Duration (Durasi Kampanye)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tarif dasar bulanan: <span className="font-semibold text-slate-800">{formatIDR(spot.pricing.oneMonth)}</span> / bulan
                  </p>
                </div>

                {/* Direct Numeric Input & Steppers */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCampaignMonths(Math.max(1, campaignMonths - 1))}
                      disabled={campaignMonths <= 1}
                      className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Kurangi 1 Bulan"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="flex items-center mx-1">
                      <input
                        id="campaign-duration-input"
                        type="number"
                        min="1"
                        max="12"
                        value={campaignMonths}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setCampaignMonths(Math.max(1, Math.min(12, val)));
                          }
                        }}
                        className="w-10 text-center text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded bg-transparent"
                      />
                      <span className="text-xs font-semibold text-slate-600 mr-1">Bulan</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCampaignMonths(Math.min(12, campaignMonths + 1))}
                      disabled={campaignMonths >= 12}
                      className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Tambah 1 Bulan"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {campaignMonths > 6 ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs animate-pulse">
                      <Percent className="w-3 h-3" />
                      Diskon 5% Aktif
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-medium">
                      Reguler
                    </span>
                  )}
                </div>
              </div>

              {/* Campaign Duration Slider (1-12 Months) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-emerald-600" />
                    <span>Geser Durasi Kampanye:</span>
                  </span>
                  <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                    {campaignMonths} Bulan ({activePricing.days} Hari Tayang)
                  </span>
                </div>

                <div className="relative pt-1 pb-2">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={campaignMonths}
                    onChange={(e) => setCampaignMonths(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer transition-all"
                  />
                  {/* Slider visual track ticks and discount boundary label */}
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span className="cursor-pointer hover:text-emerald-700" onClick={() => setCampaignMonths(1)}>1 bln</span>
                    <span className="cursor-pointer hover:text-emerald-700" onClick={() => setCampaignMonths(3)}>3 bln</span>
                    <span className="cursor-pointer hover:text-emerald-700 font-semibold text-slate-700" onClick={() => setCampaignMonths(6)}>6 bln (Batas)</span>
                    <span className="cursor-pointer text-emerald-700 font-bold" onClick={() => setCampaignMonths(7)}>7 bln (+5% OFF)</span>
                    <span className="cursor-pointer hover:text-emerald-700" onClick={() => setCampaignMonths(9)}>9 bln</span>
                    <span className="cursor-pointer text-purple-700 font-bold" onClick={() => setCampaignMonths(12)}>12 bln</span>
                  </div>
                </div>
              </div>

              {/* 1 - 12 Month Quick Toggle Buttons */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const isSelected = campaignMonths === m;
                  const isOver6 = m > 6;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCampaignMonths(m)}
                      className={`py-1.5 px-0.5 rounded-lg text-center transition-all cursor-pointer text-xs font-semibold ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md font-bold ring-2 ring-emerald-400'
                          : isOver6
                            ? 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100 border border-emerald-300/80 font-medium'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div>{m}m</div>
                      {isOver6 && !isSelected && (
                        <span className="block text-[8px] text-emerald-600 font-bold -mt-0.5 leading-none">
                          -5%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pricing Multiplication & 5% Discount Breakdown */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-600 flex items-center gap-1.5 flex-wrap">
                    <span>Perhitungan Sewa:</span>
                    <span className="font-mono font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                      {formatIDR(spot.pricing.oneMonth)} × {campaignMonths} bln
                    </span>
                    <span>=</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatIDR(activePricing.undiscountedPrice)}
                    </span>
                  </div>

                  {activePricing.savingsAmount > 0 ? (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span>Diskon 5% (&gt;6 Bulan): Hemat {formatIDR(activePricing.savingsAmount)}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Durasi &gt; 6 bulan (7-12 bln) berhak atas diskon 5%
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-500">Total Biaya Sewa ({campaignMonths} Bulan):</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-lg sm:text-xl font-bold font-mono text-slate-950">
                        {formatIDR(activePricing.totalPrice)}
                      </span>
                      {activePricing.savingsAmount > 0 && (
                        <span className="text-xs text-slate-400 line-through font-mono">
                          {formatIDR(activePricing.undiscountedPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Efektif per Bulan:</span>
                    <div className="text-xs sm:text-sm font-semibold text-emerald-800 font-mono">
                      {formatIDR(activePricing.effectiveMonthlyRate)} / bulan
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Potential Total ROI Showcase Metrics Card */}
            <div className="p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl border border-emerald-800/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Proyeksi Potensi Total ROI ({campaignMonths} Bulan)</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 text-[10px] font-normal normal-case">
                        Est. Respon 0.05%
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-300">
                      Berdasarkan {spot.dailyImpressions.toLocaleString('id-ID')} OTS/hari dan total sewa {formatIDR(activePricing.totalPrice)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                    Potensi Total ROI
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
                    {potentialRoi.roiPercentage >= 0 ? `+${potentialRoi.roiPercentage.toFixed(1)}%` : `${potentialRoi.roiPercentage.toFixed(1)}%`}
                  </span>
                </div>
              </div>

              {/* 4 Metric Columns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800">
                <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Total Impresi OTS</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-white mt-0.5 block">
                    {formatCompactNumber(potentialRoi.totalImpressions)} OTS
                  </span>
                  <span className="text-[9px] text-slate-400">
                    Selama {activePricing.days} hari aktif
                  </span>
                </div>

                <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Efisiensi CPM</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-300 mt-0.5 block">
                    {formatIDR(Math.round(potentialRoi.cpm))}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    Biaya per 1.000 tayang
                  </span>
                </div>

                <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Proyeksi Omzet</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-white mt-0.5 block">
                    {formatCompactIDR(potentialRoi.projectedRevenue)}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-medium">
                    Profit: +{formatCompactIDR(potentialRoi.netProfit)}
                  </span>
                </div>

                <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Titik Impas (BEP)</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-amber-300 mt-0.5 block">
                    {potentialRoi.breakEvenTransactions} Transaksi
                  </span>
                  <span className="text-[9px] text-slate-400">
                    @ Rp 350.000 belanja
                  </span>
                </div>
              </div>
            </div>

            {/* Standard Contract Tier Milestone Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCampaignMonths(1)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  campaignMonths === 1
                    ? 'bg-emerald-50 border-emerald-400 shadow-sm ring-2 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-emerald-800 font-semibold">1 Bulan / Sisi</div>
                  {campaignMonths === 1 && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-950 mt-1">
                  {formatIDR(spot.pricing.oneMonth)}
                </div>
                <div className="text-[9px] text-emerald-700 mt-0.5">Rate standar</div>
              </button>

              <button
                type="button"
                onClick={() => setCampaignMonths(3)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  campaignMonths === 3
                    ? 'bg-emerald-50 border-emerald-400 shadow-sm ring-2 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-slate-700 font-semibold">3 Bulan / Sisi</div>
                  {campaignMonths === 3 && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                  {formatIDR(spot.pricing.oneMonth * 3)}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">Reguler 3 Bulan</div>
              </button>

              <button
                type="button"
                onClick={() => setCampaignMonths(6)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  campaignMonths === 6
                    ? 'bg-emerald-50 border-emerald-400 shadow-sm ring-2 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-slate-700 font-semibold">6 Bulan / Sisi</div>
                  {campaignMonths === 6 && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                  {formatIDR(spot.pricing.oneMonth * 6)}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">Reguler Semester</div>
              </button>

              <button
                type="button"
                onClick={() => setCampaignMonths(12)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  campaignMonths === 12
                    ? 'bg-purple-50 border-purple-400 shadow-sm ring-2 ring-purple-300'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-purple-800 font-semibold">1 Tahun / Sisi</div>
                  {campaignMonths === 12 && <CheckCircle className="w-3 h-3 text-purple-600" />}
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                  {formatIDR(Math.round(spot.pricing.oneMonth * 12 * 0.95))}
                </div>
                <div className="text-[9px] text-emerald-600 font-bold mt-0.5">Diskon 5% Aktif</div>
              </button>
            </div>
          </div>

          {/* Interactive ROI & CPM Estimator Calculator (Synced with Campaign Duration) */}
          <SpotRoiCalculator 
            spot={spot} 
            months={campaignMonths}
            onMonthsChange={setCampaignMonths}
            onShareToWhatsApp={(text) => openCustomWhatsAppMessage(text)} 
          />

          {/* Google Calendar Booking Section */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Jadwalkan Sewa di Google Calendar</span>
            </div>
            <p className="text-xs text-slate-500">
              Buat jadwal otomatis di Google Calendar Anda untuk kampanye selama {campaignMonths} bulan.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Mulai Tanggal</label>
                <input 
                  type="date" 
                  value={bookingStartDate}
                  onChange={(e) => setBookingStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="flex-1 flex items-end">
                <button
                  onClick={handleBookCalendar}
                  disabled={isBookingCalendar || !bookingStartDate}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs disabled:opacity-50"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {isBookingCalendar ? 'Menjadwalkan...' : 'Tambahkan ke Calendar'}
                </button>
              </div>
            </div>
            {bookingError && (
              <div className="text-[10px] text-rose-500 mt-1">
                {bookingError}
              </div>
            )}
          </div>

          {/* Google Maps Real-Time Location Card */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Peta Lokasi Google Maps</span>
              </div>
              <span className="text-[10px] text-blue-700 font-medium">Standar Tanpa API Key</span>
            </div>
            
            <p className="text-[11px] text-slate-600">
              Titik koordinat presisi: <span className="font-mono font-semibold text-slate-800">{spot.coordinates.lat}, {spot.coordinates.lng}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${spot.coordinates.lat},${spot.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-semibold rounded-lg text-xs transition-colors shadow-2xs"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Buka di Google Maps</span>
                <ExternalLink className="w-3 h-3 text-blue-400" />
              </a>

              <a
                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${spot.coordinates.lat},${spot.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 font-semibold rounded-lg text-xs transition-colors shadow-2xs"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-600" />
                <span>Lihat Street View</span>
                <ExternalLink className="w-3 h-3 text-amber-500" />
              </a>
            </div>
          </div>

          {/* Technical Notes */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Ketentuan Penawaran:
            </div>
            {TECHNICAL_NOTES.slice(0, 3).map((note, idx) => (
              <div key={idx}>• {note}</div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct WhatsApp Web button */}
            <button
              onClick={() => openSpotDirectWhatsApp(spot, true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg text-xs shadow-sm shadow-emerald-950/20 transition-all active:scale-95 cursor-pointer"
              title="Buka langsung di WhatsApp Web (web.whatsapp.com) dengan rincian lengkap ke nomor +62 87822248975"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950 text-[#25D366]" />
              <span>Chat WhatsApp Web</span>
            </button>

            {onOpenAiProposal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAiProposal(spot);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm shadow-emerald-900/20 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Penawaran AI</span>
              </button>
            )}

            <button
              onClick={handleCopyProposal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  Salin Rincian
                </>
              )}
            </button>

            {/* Field Agent QR Code Button */}
            <button
              onClick={() => setShowQrCode(!showQrCode)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold rounded-lg text-xs transition-all cursor-pointer ${
                showQrCode
                  ? 'bg-slate-900 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs'
              }`}
              title="Tampilkan QR Code WhatsApp Deep Link untuk di-scan klien di lapangan"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>{showQrCode ? 'Tutup QR' : 'QR Code'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
