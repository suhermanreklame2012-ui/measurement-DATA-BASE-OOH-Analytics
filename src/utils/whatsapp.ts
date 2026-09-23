import { MediaSpot } from '../types/ooh';
import { formatIDR } from './formatters';

export const BUSINESS_WA_NUMBER = '6287822248975'; // +62 87822248975

/**
 * Check if the current browser environment is a mobile phone/tablet
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Construct deep link URL for specific media spot
 */
export function getSpotDeepLink(spotId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?spot=${encodeURIComponent(spotId)}`;
}

/**
 * Clean phone number to digits only with Indonesia international code (62)
 */
export function cleanPhoneNumberForWhatsApp(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62') && clean.length > 0) {
    clean = '62' + clean;
  }
  return clean || BUSINESS_WA_NUMBER;
}

/**
 * Build prefilled message text for a specific media spot
 */
export function generateSpotWhatsAppMessage(spot: MediaSpot): string {
  const deepLink = getSpotDeepLink(spot.id);
  const statusText = spot.isAvailable ? 'Tersedia (Ready)' : 'Tersewa (Reserved)';
  const trafficText = spot.dailyTraffic ? `${spot.dailyTraffic.toLocaleString('id-ID')} kend./hari` : '-';
  const impressionsText = spot.dailyImpressions ? `${spot.dailyImpressions.toLocaleString('id-ID')} OTS/hari` : '-';
  const priceText = spot.pricing?.oneMonth ? formatIDR(spot.pricing.oneMonth) : 'Hubungi Sales';

  return `Halo Admin Suherman Reklame,

Saya tertarik dan ingin menanyakan informasi ketersediaan / penawaran untuk titik reklame berikut:

📍 *Titik*: ${spot.name}
🏙️ *Wilayah*: ${spot.city} (${spot.roadName || '-'})
📐 *Format*: ${spot.mediaType} (${spot.size})
🚗 *Estimasi Lalu Lintas*: ~${trafficText}
👁️ *Estimasi Impresi (OTS)*: ~${impressionsText}
💰 *Tarif 1 Bulan*: ${priceText}
📊 *Status Unit*: ${statusText}

🔗 *Tautan Detail Media Spot*:
${deepLink}

Mohon informasi ketersediaan slot tayang, simulasi visual, dan penawaran terbaiknya. Terima kasih!`;
}

/**
 * Build WhatsApp Web direct URL (web.whatsapp.com)
 */
export function generateSpotWhatsAppWebUrl(spot: MediaSpot, phone: string = BUSINESS_WA_NUMBER): string {
  const message = generateSpotWhatsAppMessage(spot);
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp Mobile Deep Link URL (wa.me)
 */
export function generateSpotWhatsAppMobileUrl(spot: MediaSpot, phone: string = BUSINESS_WA_NUMBER): string {
  const message = generateSpotWhatsAppMessage(spot);
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate WhatsApp URL (defaults to WhatsApp Web as requested)
 */
export function generateSpotWhatsAppUrl(spot: MediaSpot, forceWeb: boolean = true): string {
  if (forceWeb || !isMobileDevice()) {
    return generateSpotWhatsAppWebUrl(spot);
  }
  return generateSpotWhatsAppMobileUrl(spot);
}

/**
 * Open WhatsApp Web / App conversation directly
 */
export function openSpotDirectWhatsApp(spot: MediaSpot, forceWeb: boolean = true): void {
  const url = generateSpotWhatsAppUrl(spot, forceWeb);
  window.open(url, '_blank');
}

/**
 * Build prefilled message text for multiple media spots
 */
export function generateMultipleSpotsWhatsAppMessage(spots: MediaSpot[]): string {
  const spotsList = spots.map((s, idx) => {
    const deepLink = getSpotDeepLink(s.id);
    const price = s.pricing?.oneMonth ? formatIDR(s.pricing.oneMonth) : 'Hubungi Sales';
    return `${idx + 1}. *${s.name}* (${s.city})
   - Format: ${s.mediaType} (${s.size})
   - Impresi: ~${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari
   - Tarif: ${price}
   - Tautan Detail: ${deepLink}`;
  }).join('\n\n');

  const totalMonthly = spots.reduce((acc, s) => acc + (s.pricing?.oneMonth || 0), 0);
  const totalOTS = spots.reduce((acc, s) => acc + (s.dailyImpressions || 0), 0);

  return `Halo Admin Suherman Reklame,

Saya ingin menanyakan ketersediaan dan penawaran paket untuk *${spots.length} titik reklame OOH/DOOH* terpilih di Jawa Barat:

${spotsList}

📊 *Total Estimasi Jangkauan*: ~${totalOTS.toLocaleString('id-ID')} OTS/hari
💰 *Total Estimasi Nilai Paket (1 Bulan)*: ${formatIDR(totalMonthly)}

Mohon info ketersediaan jadwal pemasangan dan penawaran paket terbaiknya. Terima kasih!`;
}

/**
 * Open WhatsApp conversation for multiple selected spots via WhatsApp Web
 */
export function openMultipleSpotsDirectWhatsApp(spots: MediaSpot[], forceWeb: boolean = true): void {
  if (spots.length === 0) return;
  if (spots.length === 1) {
    openSpotDirectWhatsApp(spots[0], forceWeb);
    return;
  }

  const message = generateMultipleSpotsWhatsAppMessage(spots);
  const url = (forceWeb || !isMobileDevice())
    ? `https://web.whatsapp.com/send?phone=${BUSINESS_WA_NUMBER}&text=${encodeURIComponent(message)}`
    : `https://wa.me/${BUSINESS_WA_NUMBER}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}

/**
 * Open WhatsApp conversation with custom message
 */
export function openCustomWhatsAppMessage(message: string, phone: string = BUSINESS_WA_NUMBER, forceWeb: boolean = true): void {
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  const url = (forceWeb || !isMobileDevice())
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/**
 * Generate a comprehensive, professional performance report for a specific region or filtered spots
 */
export function generateRegionalReportWhatsAppMessage(
  spots: MediaSpot[],
  regionName?: string
): string {
  const totalSpots = spots.length;
  if (totalSpots === 0) {
    return `Halo Admin Suherman Reklame, belum ada data titik media yang dipilih untuk wilayah ini.`;
  }

  // Determine display region
  let displayRegion = regionName && regionName !== 'All' ? regionName : '';
  if (!displayRegion) {
    const uniqueCities = Array.from(new Set(spots.map((s) => s.city).filter(Boolean)));
    if (uniqueCities.length === 1) {
      displayRegion = uniqueCities[0];
    } else if (uniqueCities.length <= 3 && uniqueCities.length > 0) {
      displayRegion = uniqueCities.join(', ');
    } else {
      displayRegion = 'Jawa Barat (Semua Wilayah)';
    }
  }

  const availableSpots = spots.filter((s) => s.isAvailable).length;
  const soldOutSpots = totalSpots - availableSpots;
  const occupancyRate = Math.round((soldOutSpots / totalSpots) * 100);
  
  const doohCount = spots.filter((s) => s.category === 'DOOH_DIGITAL').length;
  const oohCount = totalSpots - doohCount;

  const totalDailyTraffic = spots.reduce((acc, s) => acc + (s.dailyTraffic || 0), 0);
  const totalDailyOTS = spots.reduce((acc, s) => acc + (s.dailyImpressions || 0), 0);
  const totalMonthlyOTS = totalDailyOTS * 30;
  const avgOts = Math.round(totalDailyOTS / totalSpots);

  const totalMonthlyInventory = spots.reduce((acc, s) => acc + (s.pricing?.oneMonth || 0), 0);
  const avgMonthlyPrice = Math.round(totalMonthlyInventory / totalSpots);

  // Top 3 highest OTS spots in this region
  const topSpots = [...spots].sort((a, b) => (b.dailyImpressions || 0) - (a.dailyImpressions || 0)).slice(0, 3);
  const topSpotsText = topSpots
    .map((s, i) => {
      const price = s.pricing?.oneMonth ? formatIDR(s.pricing.oneMonth) : 'Hubungi Sales';
      const type = s.category === 'DOOH_DIGITAL' ? 'DOOH' : 'OOH';
      return `${i + 1}. *${s.name}* [${type}]
   • Lokasi: ${s.roadName ? `${s.roadName}, ` : ''}${s.city}
   • Impresi: ~${(s.dailyImpressions || 0).toLocaleString('id-ID')} OTS/hari
   • Tarif: ${price}/bln | Status: ${s.isAvailable ? '✅ Tersedia' : '🔒 Tersewa'}`;
    })
    .join('\n\n');

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `📊 *RINGKASAN PERFORMA MEDIA OOH/DOOH*
📍 *Wilayah*: *${displayRegion}*
📅 *Tanggal Rilis*: ${dateFormatted}
🏢 *Network*: Suherman Reklame OOH Jawa Barat

━━━━━━━━━━━━━━━━━━━━━
📈 *METRIK JANGKAUAN & AUDIENS*
• Total Titik Terpantau: *${totalSpots} Titik*
  - DOOH Videotron: *${doohCount} Titik*
  - OOH Statis/Billboard: *${oohCount} Titik*
• Estimasi Trafik Harian: *${totalDailyTraffic.toLocaleString('id-ID')} kendaraan/hari*
• Total Paparan Harian (OTS): *${totalDailyOTS.toLocaleString('id-ID')} OTS/hari*
• Potensi Impresi Bulanan: *${totalMonthlyOTS.toLocaleString('id-ID')} OTS/bulan*
• Rata-rata OTS per Titik: *${avgOts.toLocaleString('id-ID')} OTS/hari*

━━━━━━━━━━━━━━━━━━━━━
💼 *METRIK OKUPANSI & PORTOFOLIO*
• Tingkat Okupansi: *${occupancyRate}%*
  - Titik Tersewa: *${soldOutSpots} Titik*
  - Titik Siap Tayang (Available): *${availableSpots} Titik*
• Total Nilai Portofolio (1 Bln): *${formatIDR(totalMonthlyInventory)}*
• Rerata Tarif Sewa / Titik: *${formatIDR(avgMonthlyPrice)} / bulan*

━━━━━━━━━━━━━━━━━━━━━
🏆 *TOP 3 REKOMENDASI TITIK DENGAN OTS TERTINGGI:*
${topSpotsText}

━━━━━━━━━━━━━━━━━━━━━
📲 *Informasi Pemesanan & Proposal Media:*
Website: Sistem Database & Strategic Media Planner OOH Jabar
Kontak Sales: +${BUSINESS_WA_NUMBER} (Suherman Reklame)`;
}

/**
 * Get direct WhatsApp link for regional report
 */
export function getRegionalReportWhatsAppUrl(
  spots: MediaSpot[],
  regionName?: string,
  phone: string = BUSINESS_WA_NUMBER,
  forceWeb: boolean = true
): string {
  const message = generateRegionalReportWhatsAppMessage(spots, regionName);
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  return (forceWeb || !isMobileDevice())
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

