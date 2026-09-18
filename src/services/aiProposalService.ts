import { MediaSpot, ClientContact, ProposalDuration, ProposalTone, ProposalDraft } from '../types/ooh';
import { formatIDR, formatCompactNumber } from '../utils/formatters';

interface DraftProposalRequest {
  client: ClientContact;
  spots: MediaSpot[];
  duration: ProposalDuration;
  tone: ProposalTone;
  customNote?: string;
}

/**
 * Request AI-drafted proposal from server-side Gemini 3.8 Flash API
 * with instant local algorithmic fallback.
 */
export async function generateProposalDraft(params: DraftProposalRequest): Promise<ProposalDraft> {
  const { client, spots, duration, tone, customNote } = params;

  try {
    const res = await fetch('/api/ai/draft-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client,
        spots,
        duration,
        tone,
        customNote
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.emailSubject && data.emailBody && data.whatsappText) {
        return data;
      }
    }
  } catch (err) {
    console.warn('AI proposal server error, switching to local draft generator:', err);
  }

  // Local fallback algorithmic generator
  return generateLocalProposalFallback(params);
}

/**
 * High-craft local template generator in case server is temporarily unreachable.
 */
export function generateLocalProposalFallback(params: DraftProposalRequest): ProposalDraft {
  const { client, spots, duration, tone, customNote } = params;

  const totalMonthlyPrice = spots.reduce((acc, s) => acc + (s.pricing?.oneMonth || 0), 0);
  const totalDailyTraffic = spots.reduce((acc, s) => acc + (s.dailyTraffic || 0), 0);
  const totalDailyImpressions = spots.reduce((acc, s) => acc + (s.dailyImpressions || 0), 0);
  const totalMonthlyImpressions = totalDailyImpressions * 30;

  // Pricing multiplier for duration
  const getDurationPrice = (s: MediaSpot) => {
    if (duration === '3 Bulan') return s.pricing?.threeMonths || (s.pricing?.oneMonth * 3 * 0.95);
    if (duration === '6 Bulan') return s.pricing?.sixMonths || (s.pricing?.oneMonth * 6 * 0.90);
    if (duration === '1 Tahun') return s.pricing?.oneYear || (s.pricing?.oneMonth * 12 * 0.85);
    return s.pricing?.oneMonth || 0;
  };

  const totalDurationPrice = spots.reduce((acc, s) => acc + getDurationPrice(s), 0);

  // Key highlights
  const keyHighlights = [
    `Total estimasi impresi mencapai ${formatCompactNumber(totalDailyImpressions)} OTS/hari (${formatCompactNumber(totalMonthlyImpressions)} OTS/bulan) di koridor jalan utama Jawa Barat.`,
    `Penempatan strategis di ${Array.from(new Set(spots.map(s => s.city))).join(', ')} dengan visibilitas sudut pandang optimal tanpa halangan.`,
    `Paket all-in mencakup izin reklame resmi, instalasi, penerangan malam (frontlite/digital), dan pemeliharaan materi berkala.`,
    `Tersedia opsi monitoring live report dan dokumentasi berkala untuk akuntabilitas kampanye ${client.company}.`
  ];

  const spotSummaryLines = spots.map((s, idx) => {
    return `${idx + 1}. *${s.name}* (${s.city})
   - Format: ${s.mediaType} (${s.size})
   - Trafik: ~${s.dailyTraffic?.toLocaleString('id-ID')} kend./hari | Impresi: ${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari
   - Tarif Sewa (${duration}): ${formatIDR(getDurationPrice(s))}`;
  }).join('\n\n');

  // WhatsApp Message
  const whatsappText = `*PENAWARAN KHUSUS MEDIA REKLAME OOH/DOOH JAWA BARAT*
Kepada Yth. *${client.name}*
_${client.company}_

Halo ${client.name}, salam hangat dari Suherman Reklame (OOH Jawa Barat).

Menindaklanjuti rencana penguatan branding dan penetrasi pasar ${client.company}, kami telah menyusun rekomendasi titik media *Out-Of-Home (OOH & DOOH)* paling strategis:

📍 *REKOMENDASI TITIK TERPILIH (${spots.length} Titik):*
${spotSummaryLines}

📊 *ESTIMASI JANGKAUAN AUDIENS:*
• Total Kendaraan: ~${totalDailyTraffic.toLocaleString('id-ID')} unit/hari
• Total Peluang Melihat (OTS): *${totalDailyImpressions.toLocaleString('id-ID')} impresi/hari* (~${totalMonthlyImpressions.toLocaleString('id-ID')} impresi/bulan)
• Durasi Kampanye: *${duration}*
• Total Investasi Paket: *${formatIDR(totalDurationPrice)}* ${customNote ? `\n• Catatan Khusus: ${customNote}` : ''}

🛡️ *FASILITAS & JAMINAN:*
✅ Pajak Reklame & Izin Resmi Pemda/Pemkot terjamin
✅ Instalasi & Perawatan materi berkala
✅ Garansi pencahayaan lampu / operasional LED 100%
✅ Laporan foto berkala (Day & Night View)

Apakah ${client.name} berkenan untuk kami kirimkan draft SPK dan jadwal site visit bersama tim minggu ini?

Terima kasih atas kepercayaannya.
Hormat kami,
*Suherman Reklame*
OOH & DOOH Strategic Media Network Jawa Barat
WhatsApp: 0812-3456-7890 | Email: suherman.reklame2012@gmail.com`;

  // Email Subject
  const emailSubject = `[Penawaran Resmi] Media Luar Ruang (OOH/DOOH) Strategis Jawa Barat - ${client.company}`;

  // Email Body
  const emailBody = `Kepada Yth.
${client.name}
${client.role ? `${client.role} - ` : ''}${client.company}

Dengan hormat,

Semoga ${client.name} dan tim ${client.company} senantiasa dalam keadaan sehat dan sukses selalu.

Sehubungan dengan kebutuhan media luar ruang (Out-of-Home / DOOH) untuk memperkuat brand awareness serta penetrasi pasar di wilayah Jawa Barat, bersama ini kami dari Suherman Reklame menyampaikan proposal penawaran untuk ${spots.length} titik reklame pilihan berkepadatan tinggi:

1. IKHTISAR TITIK REKLAME TERPILIH:
${spots.map((s, idx) => `   ${idx + 1}. ${s.name} - ${s.city}
      - Format Media: ${s.mediaType} (${s.size}, ${s.layout})
      - Estimasi Lalu Lintas: ${s.dailyTraffic?.toLocaleString('id-ID')} kendaraan/hari
      - Estimasi Impresi (OTS): ${s.dailyImpressions?.toLocaleString('id-ID')} impresi/hari
      - Investasi (${duration}): ${formatIDR(getDurationPrice(s))}`).join('\n\n')}

2. TOTAL ESTIMASI JANGKAUAN & INVESTASI:
   - Jumlah Titik: ${spots.length} Titik Strategis
   - Estimasi Impresi Harian: ${totalDailyImpressions.toLocaleString('id-ID')} OTS / hari
   - Estimasi Impresi Bulanan: ${totalMonthlyImpressions.toLocaleString('id-ID')} OTS / bulan
   - Pilihan Durasi: ${duration}
   - Total Paket Investasi: ${formatIDR(totalDurationPrice)} (Belum termasuk PPN 11%)
${customNote ? `   - Catatan / Penawaran Khusus: ${customNote}\n` : ''}
3. FASILITAS SUDAH TERMASUK (ALL-IN):
   - Pajak Reklame Resmi & Perizinan Pemerintah Daerah (Kota Bandung & Sekitarnya)
   - Konstruksi, pencahayaan malam hari (Frontlite/Backlite/LED High Refresh Rate)
   - Pemeliharaan visual & pembersihan berkala sepanjang masa tayang
   - Laporan monitoring foto awal dan foto berkala (siang & malam)

Kami sangat siap mendiskusikan penyesuaian materi visual, negosiasi paket bundling, maupun pengaturan jadwal pemasangan sesuai timeline kampanye ${client.company}.

Demikian surat penawaran ini kami sampaikan. Kami menantikan kabar baik dan konfirmasi dari Bapak/Ibu.

Hormat kami,

Suherman Reklame
PT Media Reklame Jawa Barat Mandiri
Jl. Asia Afrika / Dago Protokol, Bandung
Telepon / WhatsApp: 0812-3456-7890
Email: suherman.reklame2012@gmail.com`;

  return {
    emailSubject,
    emailBody,
    whatsappText,
    keyHighlights,
    estimatedReachSummary: `Total ${formatCompactNumber(totalDailyImpressions)} impresi harian (~${formatCompactNumber(totalMonthlyImpressions)} OTS/bulan) dari ${spots.length} titik di Jawa Barat.`,
    totalMonthlyPrice,
    totalSpotsCount: spots.length,
    generatedAt: new Date().toISOString()
  };
}
