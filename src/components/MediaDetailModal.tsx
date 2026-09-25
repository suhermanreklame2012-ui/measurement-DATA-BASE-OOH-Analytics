import React, { useState, useMemo, useEffect } from 'react';
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
  CalendarCheck,
  Pencil,
  Trash2,
  Smartphone,
  Bell,
  Flame,
  Users,
  UserCheck
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';
import { openSpotDirectWhatsApp, openCustomWhatsAppMessage, getSpotDeepLink } from '../utils/whatsapp';
import { calculateCampaignPricing, calculatePotentialRoi } from '../utils/pricing';
import { TECHNICAL_NOTES } from '../data/spotsData';
import { SpotQrCodeGenerator } from './SpotQrCodeGenerator';
import { SpotRoiCalculator } from './SpotRoiCalculator';
import { ConstructionPhotoCarousel } from './ConstructionPhotoCarousel';
import { googleSignIn, getAccessToken } from '../services/googleAuthService';
import { createCalendarEvent } from '../services/googleCalendarService';
import { addNotification } from '../services/storageService';
import { formatImageUrl } from '../utils/imageUtils';
import {
  AvailabilityAlertItem,
  getAlertsForSpot,
  addAvailabilityAlert,
  updateAlertStatus,
  deleteAlert
} from '../services/availabilityAlertService';

interface MediaDetailModalProps {
  spot: MediaSpot | null;
  onClose: () => void;
  onToggleAvailability: (spotId: string) => void;
  onOpenAiProposal?: (spot: MediaSpot) => void;
  onEditSpot?: (spot: MediaSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
  onOpenRoiCalculator?: (spot: MediaSpot) => void;
  isAdmin?: boolean;
  onRequestAdminLogin?: (reason?: string) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  spot,
  onClose,
  onToggleAvailability,
  onOpenAiProposal,
  onEditSpot,
  onDeleteSpot,
  onOpenRoiCalculator,
  isAdmin = false,
  onRequestAdminLogin
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [campaignMonths, setCampaignMonths] = useState<number>(1);
  const [bookingStartDate, setBookingStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isBookingCalendar, setIsBookingCalendar] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Availability Alert Sign Up & Queue States
  const [spotAlerts, setSpotAlerts] = useState<AvailabilityAlertItem[]>([]);
  const [isAlertFormOpen, setIsAlertFormOpen] = useState<boolean>(false);
  const [alertName, setAlertName] = useState<string>('');
  const [alertPhone, setAlertPhone] = useState<string>('');
  const [alertEmail, setAlertEmail] = useState<string>('');
  const [alertCompany, setAlertCompany] = useState<string>('');
  const [alertDuration, setAlertDuration] = useState<string>('3 Bulan');
  const [alertPreferredMonth, setAlertPreferredMonth] = useState<string>('Segera saat kosong');
  const [alertNotes, setAlertNotes] = useState<string>('');
  const [alertSuccess, setAlertSuccess] = useState<boolean>(false);
  const [registeredAlert, setRegisteredAlert] = useState<AvailabilityAlertItem | null>(null);

  // Load alerts for this specific spot
  const loadSpotAlerts = () => {
    if (spot) {
      setSpotAlerts(getAlertsForSpot(spot.id));
    }
  };

  useEffect(() => {
    loadSpotAlerts();
    setAlertSuccess(false);
    setRegisteredAlert(null);
  }, [spot?.id]);

  useEffect(() => {
    const handleAlertChange = () => loadSpotAlerts();
    window.addEventListener('ooh_availability_alert_updated', handleAlertChange);
    window.addEventListener('ooh_availability_alert_added', handleAlertChange);
    return () => {
      window.removeEventListener('ooh_availability_alert_updated', handleAlertChange);
      window.removeEventListener('ooh_availability_alert_added', handleAlertChange);
    };
  }, [spot?.id]);

  const handleRegisterAvailabilityAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spot || !alertName || !alertPhone || !alertEmail) {
      alert('Mohon lengkapi Nama, Nomor WhatsApp, dan Email.');
      return;
    }

    const newAlert = addAvailabilityAlert({
      spotId: spot.id,
      spotName: spot.name,
      roadName: spot.roadName,
      city: spot.city,
      mediaType: spot.mediaType,
      userName: alertName,
      userPhone: alertPhone,
      userEmail: alertEmail,
      company: alertCompany,
      targetDuration: alertDuration,
      preferredMonth: alertPreferredMonth,
      notes: alertNotes,
      isCurrentlyBooked: !spot.isAvailable
    });

    setRegisteredAlert(newAlert);
    setAlertSuccess(true);
    loadSpotAlerts();
  };

  const handleUpdateProspectStatus = (alertId: string, status: AvailabilityAlertItem['status']) => {
    updateAlertStatus(alertId, status);
    loadSpotAlerts();
  };

  const handleDeleteProspectAlert = (alertId: string) => {
    if (window.confirm('Hapus peminat ini dari antrean?')) {
      deleteAlert(alertId);
      loadSpotAlerts();
    }
  };

  const spotPhotos = useMemo(() => {
    if (spot?.imageUrls && spot.imageUrls.length > 0) {
      return spot.imageUrls.filter(p => p && p.trim().length > 0);
    }
    if (spot?.imageUrl) {
      return [spot.imageUrl];
    }
    return [];
  }, [spot?.imageUrls, spot?.imageUrl]);

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

  const trafficBadge = useMemo(() => {
    if (!spot) return { label: 'Normal Traffic', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', badgeBg: 'bg-slate-900' };
    const density = spot.trafficDensity;
    const traffic = spot.dailyTraffic || 0;
    if (density === 'Sangat Padat' || traffic >= 60000) {
      return {
        label: 'High Traffic',
        sublabel: 'Sangat Padat',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        badgeBg: 'bg-rose-950/60'
      };
    }
    if (density === 'Padat' || traffic >= 35000) {
      return {
        label: 'High Traffic',
        sublabel: 'Padat',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        badgeBg: 'bg-amber-950/60'
      };
    }
    if (density === 'Sedang' || traffic >= 20000) {
      return {
        label: 'Moderate Traffic',
        sublabel: 'Sedang',
        color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        badgeBg: 'bg-blue-950/60'
      };
    }
    return {
      label: 'Smooth Traffic',
      sublabel: 'Lancar',
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      badgeBg: 'bg-emerald-950/60'
    };
  }, [spot?.trafficDensity, spot?.dailyTraffic]);

  const roiBadge = useMemo(() => {
    if (!spot) return { label: 'Standard ROI', detail: 'Normal', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', badgeBg: 'bg-slate-900' };
    const roi = potentialRoi.roiPercentage;
    const impressions = spot.dailyImpressions || 0;
    const isCommercial = spot.locationType === 'Komersial & Mall' || spot.locationType === 'Pusat Kota & Protokol';
    
    if (roi >= 90 || impressions >= 70000 || (isCommercial && impressions >= 50000)) {
      return {
        label: 'Growth Potential',
        detail: 'High Yield',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        badgeBg: 'bg-emerald-950/60'
      };
    }
    if (roi >= 60 || impressions >= 40000) {
      return {
        label: 'Growth Potential',
        detail: 'Solid Reach',
        color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        badgeBg: 'bg-teal-950/60'
      };
    }
    if (potentialRoi.cpm > 0 && potentialRoi.cpm <= 15000) {
      return {
        label: 'High Efficiency',
        detail: 'Low CPM',
        color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        badgeBg: 'bg-cyan-950/60'
      };
    }
    return {
      label: 'Steady Performer',
      detail: 'Consistent OTS',
      color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      badgeBg: 'bg-indigo-950/60'
    };
  }, [spot?.dailyImpressions, spot?.locationType, potentialRoi.roiPercentage, potentialRoi.cpm]);

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

  const handleCopyShareableLink = async () => {
    if (!spot) return;
    const directUrl = getSpotDeepLink(spot.id);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(directUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = directUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setLinkCopied(true);
      addNotification({
        title: 'Tautan Titik Tersalin',
        message: `Tautan langsung untuk "${spot.name}" berhasil disalin ke clipboard.`,
        type: 'create'
      });
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy shareable link:', err);
    }
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
            {/* Edit Spot Action */}
            {onEditSpot && (
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    if (onRequestAdminLogin) {
                      onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengedit data titik reklame ini.');
                    }
                    return;
                  }
                  onClose();
                  onEditSpot(spot);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isAdmin 
                    ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700' 
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
                }`}
                title={isAdmin ? "Edit data titik media ini" : "Edit data titik media ini (Perlu Akses Admin)"}
              >
                <Pencil className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            {/* Delete Spot Action */}
            {onDeleteSpot && (
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    if (onRequestAdminLogin) {
                      onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menghapus titik reklame.');
                    }
                    return;
                  }
                  if (window.confirm(`Apakah Anda yakin ingin menghapus titik media "${spot.name}" (${spot.id}) dari database?`)) {
                    onDeleteSpot(spot.id);
                    onClose();
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isAdmin
                    ? 'bg-slate-800 hover:bg-rose-950 text-rose-400 border-slate-700 hover:border-rose-700'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
                }`}
                title={isAdmin ? "Hapus titik media ini dari database" : "Hapus titik media ini (Perlu Akses Admin)"}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}

            {/* Share via WhatsApp (Header Button) */}
            <button
              id="btn-share-via-whatsapp-header"
              type="button"
              onClick={() => openSpotDirectWhatsApp(spot)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Share via WhatsApp: Bagikan spesifikasi titik reklame ini ke calon klien via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
              <span className="hidden sm:inline">Share via WhatsApp</span>
            </button>

            {/* Copy Shareable Link (Header Button) */}
            <button
              id="btn-copy-shareable-link-header"
              type="button"
              onClick={handleCopyShareableLink}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                linkCopied
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
              }`}
              title="Salin tautan URL langsung untuk titik ini (Copy Shareable Link)"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Tautan Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Salin Link</span>
                </>
              )}
            </button>

            {/* Scan Spot QR Code on Mobile Device */}
            <button
              id="btn-toggle-mobile-qr-header"
              data-testid="btn-toggle-mobile-qr-header"
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showQrCode
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
              }`}
              title="Tampilkan QR Code unik untuk dipindai calon klien di ponsel pintar mereka"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{showQrCode ? 'Tutup QR' : '📱 Buka di HP (QR)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Spot Highlights Bar (Traffic Density & ROI Category Badges directly under Header) */}
        <div 
          id="spot-header-badges-bar"
          className="px-6 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {/* Traffic Density Badge (e.g. 'High Traffic') */}
            <span
              id="badge-traffic-density"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${trafficBadge.color} ${trafficBadge.badgeBg}`}
              title={`Kepadatan Lalu Lintas: ${spot.trafficDensity} (~${spot.dailyTraffic.toLocaleString('id-ID')} kendaraan/hari)`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{trafficBadge.label}</span>
              <span className="text-[10px] opacity-75 font-normal">({trafficBadge.sublabel})</span>
            </span>

            {/* ROI Category Badge (e.g. 'Growth Potential') */}
            <span
              id="badge-roi-category"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roiBadge.color} ${roiBadge.badgeBg}`}
              title={`Kategori ROI: ${roiBadge.label} • ${roiBadge.detail} (Estimasi ROI: +${potentialRoi.roiPercentage.toFixed(1)}%)`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{roiBadge.label}</span>
              <span className="text-[10px] opacity-75 font-normal font-mono">+{potentialRoi.roiPercentage.toFixed(0)}% ROI</span>
            </span>

            {/* Corridor Location Tag */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/80">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{spot.city} (Kec. {spot.district})</span>
            </span>

            {/* Availability Demand & Queue Badge */}
            {spotAlerts.length > 0 ? (
              <button
                type="button"
                id="badge-demand-queue-header"
                onClick={() => {
                  const el = document.getElementById('availability-alerts-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  setIsAlertFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-500/40 bg-amber-950/70 text-amber-300 hover:bg-amber-900/60 transition-colors cursor-pointer"
                title={`${spotAlerts.length} calon pengiklan mengantre di Availability Alert untuk titik ini`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{spotAlerts.length} Peminat Mengantre</span>
                {!spot.isAvailable && <span className="text-[10px] text-rose-400 font-semibold">(Sold Out)</span>}
              </button>
            ) : !spot.isAvailable ? (
              <button
                type="button"
                id="badge-demand-queue-header"
                onClick={() => {
                  const el = document.getElementById('availability-alerts-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  setIsAlertFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-rose-500/40 bg-rose-950/70 text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer"
                title="Titik ini berstatus Tersewa. Klik untuk daftar ke antrean ketersediaan."
              >
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                <span>Tersewa • Daftar Antrean</span>
              </button>
            ) : (
              <button
                type="button"
                id="badge-demand-queue-header"
                onClick={() => {
                  const el = document.getElementById('availability-alerts-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  setIsAlertFormOpen(true);
                }}
                className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-700 bg-slate-900 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                title="Daftar ke antrean Availability Alert untuk titik ini"
              >
                <Bell className="w-3 h-3 text-slate-400" />
                <span>Availability Alert</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Summary */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>
              OTS: <strong className="text-white font-semibold">{formatCompactNumber(spot.dailyImpressions)}</strong> /hari
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Trafik: <strong className="text-white font-semibold">{formatCompactNumber(spot.dailyTraffic)}</strong> kend.
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Simulated Media Display Visual Box */}
          <div 
            className="relative w-full h-44 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 text-center border border-slate-700 shadow-inner bg-cover bg-center"
            style={spotPhotos.length > 0 ? { backgroundImage: `url(${formatImageUrl(spotPhotos[0])})` } : {}}
          >
            {/* Dark overlay for readability if image exists */}
            {spotPhotos.length > 0 && <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px]"></div>}
            
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

          {/* Dedicated Interactive Construction Photos Carousel */}
          <ConstructionPhotoCarousel
            photos={spotPhotos}
            spotTitle={spot.name}
            spotCategory={spot.category}
            spotSize={spot.size}
            onOpenEdit={onEditSpot ? () => onEditSpot(spot) : undefined}
          />

          {/* Field Agent QR Code Generator Section (Unique Spot Mobile Pass) */}
          {showQrCode ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
              <SpotQrCodeGenerator spot={spot} onClose={() => setShowQrCode(false)} />
            </div>
          ) : (
            <div 
              id="card-open-mobile-qr-trigger"
              data-testid="card-open-mobile-qr-trigger"
              onClick={() => setShowQrCode(true)}
              className="p-3.5 bg-gradient-to-r from-emerald-950/15 via-slate-900/10 to-indigo-950/15 border border-emerald-300 hover:border-emerald-500 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer transition-all group shadow-2xs hover:shadow-xs"
              title="Buat QR Code unik untuk dipindai calon klien agar langsung membuka detail media ini di smartphone mereka"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>📱 Pindai QR Code di Smartphone Calon Klien</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Mobile Media Pass
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Buat QR Code unik titik <strong className="text-slate-900">{spot.name}</strong>. Calon klien cukup mengarahkan kamera ponsel untuk langsung membaca spesifikasi, estimasi impresi harian, dan tarif resmi tanpa perlu instal aplikasi.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 group-hover:border-emerald-300 shadow-2xs">
                <span>Tampilkan QR</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </div>
          )}

          {/* Direct Shareable Link Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Share2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>Tautan Berbagi Langsung (Shareable Link)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    Direct URL
                  </span>
                </div>
                <div className="text-slate-700 font-mono text-[11px] truncate select-all" title={getSpotDeepLink(spot.id)}>
                  {getSpotDeepLink(spot.id)}
                </div>
              </div>
            </div>

            <button
              id="btn-copy-shareable-link-inline"
              type="button"
              onClick={handleCopyShareableLink}
              className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                linkCopied
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-400'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
              }`}
              title="Salin tautan langsung ini ke clipboard"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Tautan Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Shareable Link</span>
                </>
              )}
            </button>
          </div>

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
                    onClick={() => {
                      if (!isAdmin) {
                        if (onRequestAdminLogin) {
                          onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk merubah status ketersediaan titik reklame.');
                        }
                        return;
                      }
                      onToggleAvailability(spot.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      spot.isAvailable
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                    }`}
                    title={isAdmin ? "Klik untuk ubah status" : "Status ketersediaan (Perlu Login Admin untuk mengubah)"}
                  >
                    {spot.isAvailable ? 'Tersedia (Ready)' : 'Tersewa (Sold Out)'}
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {isAdmin ? '(klik untuk ubah)' : '(publik - lihat saja)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Alerts Sign Up & Mock-Queue Section */}
          <div 
            id="availability-alerts-section"
            className={`rounded-2xl border transition-all overflow-hidden ${
              !spot.isAvailable
                ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-amber-950/20 border-rose-500/40 shadow-sm'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-emerald-500/40 shadow-sm'
            }`}
          >
            {/* Alert Header Banner */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    !spot.isAvailable
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {!spot.isAvailable ? <Flame className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {!spot.isAvailable 
                          ? 'Sign Up for Availability Alerts (Antrean Ketersediaan)'
                          : 'Availability Alert & Reservasi Periode Mendatang'}
                      </h4>
                      
                      {!spot.isAvailable ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          ⚠️ Tersewa / Sold Out
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ✓ Tersedia
                        </span>
                      )}

                      {spotAlerts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                          🔥 {spotAlerts.length} Peminat di Antrean
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {!spot.isAvailable 
                        ? 'Titik strategis ini sedang tersewa. Daftarkan nomor WhatsApp dan email Anda agar sistem memprioritaskan penawaran kepada Anda begitu masa sewa pengiklan saat ini berakhir.'
                        : 'Ingin memesan periode kampanye mendatang atau mendapatkan pembaruan status prioritas untuk titik ini? Daftarkan kontak Anda di antrean ketersediaan.'}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAlertFormOpen(!isAlertFormOpen)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      isAlertFormOpen
                        ? 'bg-slate-800 text-slate-200 border border-slate-700'
                        : !spot.isAvailable
                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{isAlertFormOpen ? 'Tutup Formulir' : 'Daftar Antrean Alert'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Registration Form / Success Confirmation */}
            {isAlertFormOpen && (
              <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800">
                {alertSuccess && registeredAlert ? (
                  <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm">
                          Pendaftaran Availability Alert Berhasil!
                        </div>
                        <p className="text-xs text-emerald-200 mt-0.5">
                          Terima kasih <strong className="text-white">{registeredAlert.userName}</strong>
                          {registeredAlert.company ? ` (${registeredAlert.company})` : ''}. Ketertarikan Anda untuk titik <strong className="text-white">{spot.name}</strong> telah disimpan di antrean ketersediaan (Local Mock-Queue).
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/40 font-mono">
                            No. Antrean: #{spotAlerts.length}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                            Durasi: {registeredAlert.targetDuration}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                            Waktu: {registeredAlert.preferredMonth}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          const msg = encodeURIComponent(
                            `Halo Pak Suherman, saya ${registeredAlert.userName}${registeredAlert.company ? ` dari ${registeredAlert.company}` : ''}. ` +
                            `Saya baru saja mendaftar antrean Availability Alert untuk titik reklame *${spot.name}* (${spot.city}). ` +
                            `Mohon diprioritaskan saat slot sewa tersedia. Terima kasih.`
                          );
                          window.open(`https://wa.me/6287822248975?text=${msg}`, '_blank');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs cursor-pointer shadow-xs active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Konfirmasi via WhatsApp ke Suherman</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAlertSuccess(false);
                          setRegisteredAlert(null);
                          setAlertName('');
                          setAlertPhone('');
                          setAlertEmail('');
                          setAlertCompany('');
                          setAlertNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer"
                      >
                        Daftar Kontak Lain
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterAvailabilityAlert} className="space-y-3.5">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Formulir Pendaftaran Antrean Ketersediaan</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        * Data akan disimpan langsung ke Mock-Queue Admin
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Nama Lengkap / PIC <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama Anda / Marketing Manager"
                          value={alertName}
                          onChange={(e) => setAlertName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Nomor WhatsApp <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Contoh: 08123456789"
                          value={alertPhone}
                          onChange={(e) => setAlertPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Email Bisnis / Perusahaan <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="nama@perusahaan.co.id"
                          value={alertEmail}
                          onChange={(e) => setAlertEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Nama Brand / Perusahaan (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: PT Brand Nusantara / FMCG"
                          value={alertCompany}
                          onChange={(e) => setAlertCompany(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Rencana Durasi Sewa
                        </label>
                        <select
                          value={alertDuration}
                          onChange={(e) => setAlertDuration(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white cursor-pointer focus:outline-none focus:border-emerald-500"
                        >
                          <option value="1 Bulan">1 Bulan</option>
                          <option value="3 Bulan">3 Bulan</option>
                          <option value="6 Bulan">6 Bulan (Hemat 5%)</option>
                          <option value="1 Tahun">1 Tahun (Hemat 5%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Rencana Mulai Pemasangan
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Segera saat kosong / 1-2 Bulan ke depan"
                          value={alertPreferredMonth}
                          onChange={(e) => setAlertPreferredMonth(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Catatan Tambahan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Siap tanda tangan kontrak kilat, butuh materi penerangan malam maksimal"
                        value={alertNotes}
                        onChange={(e) => setAlertNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAlertFormOpen(false)}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs text-white transition-all shadow-sm cursor-pointer ${
                          !spot.isAvailable
                            ? 'bg-rose-600 hover:bg-rose-500'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Daftarkan ke Antrean Ketersediaan</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Admin Insights: Waiting List Queue for this Spot */}
            {isAdmin && (
              <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Admin Demand Insights: Antrean Peminat Titik Ini</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                        {spotAlerts.length} Peminat
                      </span>
                    </h5>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    Akses Superadmin Aktif
                  </span>
                </div>

                {spotAlerts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center">
                    Belum ada calon pengiklan yang mendaftar di antrean untuk titik ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {spotAlerts.map(alert => (
                      <div 
                        key={alert.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{alert.userName}</span>
                            {alert.company && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                                {alert.company}
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              alert.status === 'PENDING'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                                : alert.status === 'CONTACTED'
                                ? 'bg-blue-950/80 text-blue-300 border-blue-600/40'
                                : alert.status === 'CONVERTED'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {alert.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-slate-300 font-mono">{alert.userPhone}</span>
                            <span>•</span>
                            <span className="text-slate-300">{alert.userEmail}</span>
                            <span>•</span>
                            <span>Durasi: <strong className="text-slate-200">{alert.targetDuration}</strong></span>
                            <span>•</span>
                            <span>Target: <strong className="text-emerald-400">{alert.preferredMonth}</strong></span>
                          </div>

                          {alert.notes && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                              "{alert.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              let cleanPhone = alert.userPhone.replace(/\D/g, '');
                              if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
                              const msg = encodeURIComponent(
                                `Halo ${alert.userName}, saya Suherman dari OOH/DOOH Bandung. ` +
                                `Menindaklanjuti antrean Availability Alert Anda untuk titik *${spot.name}*. ` +
                                `Kapan ada waktu luang untuk mendiskusikan jadwal dan materi iklan? Terima kasih.`
                              );
                              window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                            title="Chat calon klien via WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 fill-slate-950" />
                            <span>WhatsApp</span>
                          </button>

                          <select
                            value={alert.status}
                            onChange={(e) => handleUpdateProspectStatus(alert.id, e.target.value as any)}
                            className="bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-1 cursor-pointer"
                          >
                            <option value="PENDING">Menunggu</option>
                            <option value="CONTACTED">Dihubungi</option>
                            <option value="CONVERTED">Selesai/Deal</option>
                            <option value="ARCHIVED">Arsipkan</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteProspectAlert(alert.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Hapus peminat ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          {onOpenRoiCalculator && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-200 font-medium">
                  Ingin analisis CTR mendalam untuk 9 industri berbeda?
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRoiCalculator(spot);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Buka Estimated ROI Calculator</span>
              </button>
            </div>
          )}

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
            {/* Share via WhatsApp button */}
            <button
              id="btn-share-via-whatsapp-footer"
              type="button"
              onClick={() => openSpotDirectWhatsApp(spot)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg text-xs shadow-sm shadow-emerald-950/20 transition-all active:scale-95 cursor-pointer"
              title="Share via WhatsApp: Bagikan spesifikasi titik reklame ini langsung ke calon klien via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950 text-[#25D366]" />
              <span>Share via WhatsApp</span>
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

            {/* Copy Shareable Link Button */}
            <button
              id="btn-copy-shareable-link-footer"
              type="button"
              onClick={handleCopyShareableLink}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold rounded-lg text-xs border transition-colors shadow-2xs cursor-pointer ${
                linkCopied
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
              title="Salin tautan URL langsung untuk titik ini ke clipboard (Copy Shareable Link)"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tautan Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Shareable Link</span>
                </>
              )}
            </button>

            {/* Unique Spot Mobile QR Code Button in Footer */}
            <button
              id="btn-toggle-mobile-qr-footer"
              data-testid="btn-toggle-mobile-qr-footer"
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold rounded-lg text-xs transition-all cursor-pointer ${
                showQrCode
                  ? 'bg-slate-900 text-emerald-400 border border-slate-700 shadow-sm ring-1 ring-emerald-500/40'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs'
              }`}
              title="Tampilkan QR Code unik untuk dipindai calon klien di ponsel pintar mereka"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>{showQrCode ? 'Tutup QR' : '📱 Scan QR di HP Klien'}</span>
            </button>

            {/* Availability Alert Button in Footer */}
            <button
              id="btn-availability-alert-footer"
              data-testid="btn-availability-alert-footer"
              type="button"
              onClick={() => {
                const el = document.getElementById('availability-alerts-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                setIsAlertFormOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-2xs ${
                !spot.isAvailable
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
              title="Daftar ke antrean Availability Alert untuk titik ini"
            >
              <Bell className="w-4 h-4" />
              <span>
                Availability Alert {spotAlerts.length > 0 ? `(${spotAlerts.length})` : ''}
              </span>
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
