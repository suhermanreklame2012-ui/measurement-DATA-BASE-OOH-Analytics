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
  const effectiveCPM = totalMonthlyImpressions > 0 
    ? ((totalDurationPrice / totalMonthlyImpressions) * 1000).toFixed(1)
    : '0';

  // Key highlights
  const keyHighlights = [
    `Total estimasi impresi mencapai ${formatCompactNumber(totalDailyImpressions)} OTS/hari (~${formatCompactNumber(totalMonthlyImpressions)} OTS/bulan) di koridor prima Jawa Barat.`,
    `Profil demografi terverifikasi: Dominan SES A & B (70%), menjangkau pengambil keputusan, profesional muda (20-45 thn), dan komuter urban.`,
    `Penempatan strategis di ${Array.from(new Set(spots.map(s => s.city))).join(', ')} dengan visibilitas sudut pandang frontal tinggi dan waktu henti persimpangan optimal.`,
    `Paket all-in mencakup perizinan legalitas Pemda/Pemkot resmi, garansi pencahayaan malam / operasional digital prima, dan laporan berkala.`
  ];

  const spotSummaryLines = spots.map((s, idx) => {
    const sesTier = s.locationType === 'Komersial & Mall' ? 'SES A/B' : 'SES A/B/C+';
    return `${idx + 1}. *${s.name}* (${s.city})
   • Format: ${s.mediaType} (${s.size}, ${s.layout})
   • Trafik: ~${s.dailyTraffic?.toLocaleString('id-ID')} kend./hari | Impresi: *${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari*
   • Target Audiens: ${s.locationType} [${sesTier}]
   • Investasi (${duration}): ${formatIDR(getDurationPrice(s))}`;
  }).join('\n\n');

  // WhatsApp Message
  const whatsappText = `*PROPOSAL PENAWARAN MEDIA OOH & DOOH STRATEGIS JAWA BARAT*
Kepada Yth. *${client.name}*
_${client.role ? `${client.role} - ` : ''}${client.company}_

Halo ${client.name}, salam hangat dari Suherman Reklame.

Menindaklanjuti strategi penguatan brand awareness & market dominance *${client.company}*, berikut rekomendasi terpadu *${spots.length} Titik Media Terpilih* lengkap dengan analisa traffic dan profil demografi audiens:

📍 *REKOMENDASI TITIK TERPILIH (${spots.length} Titik Ditandai):*
${spotSummaryLines}

📊 *ANALISA TRAFFIC & DEMOGRAFI TERPADU (AUDIENCE INTELLIGENCE):*
• *Total Impresi (OTS):* *${totalDailyImpressions.toLocaleString('id-ID')} views/hari* (~${totalMonthlyImpressions.toLocaleString('id-ID')} views/bulan)
• *Volume Trafik Koridor:* ~${totalDailyTraffic.toLocaleString('id-ID')} kendaraan/hari (~${(totalDailyTraffic * 30).toLocaleString('id-ID')} unit/bulan)
• *Profil Demografi (SES):* Dominan *SES A & B (70%)*, usia produktif 20–45 thn (Profesional, Pebisnis, & Urban Families)
• *Jam Paparan Prima (Peak Hours):* Pagi (06.30 - 09.30) & Sore-Malam (16.30 - 20.30) dengan rerata dwell time lampu merah 45-80 detik
• *Total Investasi (${duration}):* *${formatIDR(totalDurationPrice)}* (Efisiensi CPM: ~Rp ${effectiveCPM} / 1.000 OTS)
${customNote ? `• *Catatan Khusus Sales:* ${customNote}\n` : ''}
🛡️ *JAMINAN & FASILITAS ALL-IN:*
✅ Pajak Reklame Resmi & Perizinan Pemda/Pemkot Jawa Barat Terjamin 100%
✅ Garansi Penerangan Malam & Operasional LED High Refresh Rate Prima
✅ Pemeliharaan Visual Rutin & Laporan Foto Monitoring Berkala (Day & Night)

Apakah ${client.name} berkenan untuk peninjauan titik lokasi bersama tim atau penerbitan berkas SPK resmi?

Hormat kami,
*Suherman Reklame*
OOH & DOOH Media Specialist Jawa Barat
WhatsApp: 0812-3456-7890 / 0878-2224-8975
Email: suherman.reklame2012@gmail.com`;

  // Email Subject
  const emailSubject = `[Proposal Resmi] Rekomendasi Media Luar Ruang (OOH/DOOH) Strategis Jawa Barat - ${client.company}`;

  // Email Body
  const emailBody = `Kepada Yth.
${client.name}
${client.role ? `${client.role} - ` : ''}${client.company}

Dengan hormat,

Sehubungan dengan rencana kampanye promosi dan perluasan jangkauan merek ${client.company} di wilayah strategis Jawa Barat, bersama ini Suherman Reklame menyampaikan proposal penawaran terpadu media luar ruang (OOH & DOOH) dengan analisa lalu lintas dan profil demografi audiens lengkap:

1. DAFTAR TITIK REKLAME PILIHAN (${spots.length} Titik Ditandai):
${spots.map((s, idx) => {
  const sesTier = s.locationType === 'Komersial & Mall' ? 'SES A/B' : 'SES A/B/C+';
  return `   ${idx + 1}. ${s.name} - ${s.city} (Kec. ${s.district || '-'})
      - Format Media: ${s.mediaType} (${s.size}, ${s.layout})
      - Estimasi Lalu Lintas: ${s.dailyTraffic?.toLocaleString('id-ID')} kendaraan / hari
      - Peluang Melihat (OTS): ${s.dailyImpressions?.toLocaleString('id-ID')} impresi / hari
      - Klasifikasi Koridor: ${s.locationType} [${sesTier}]
      - Investasi (${duration}): ${formatIDR(getDurationPrice(s))}`;
}).join('\n\n')}

2. KESATUAN ANALISA TRAFFIC & DEMOGRAFI AUDIENS:
   - Total Peluang Melihat (OTS): ${totalDailyImpressions.toLocaleString('id-ID')} impresi/hari (~${totalMonthlyImpressions.toLocaleString('id-ID')} impresi/bulan)
   - Volume Lalu Lintas Koridor: ${totalDailyTraffic.toLocaleString('id-ID')} kendaraan/hari (~${(totalDailyTraffic * 30).toLocaleString('id-ID')} unit/bulan)
   - Komposisi Demografi (SES): 70% SES A & B, didominasi kelompok usia 20-45 tahun (Eksekutif, Pengusaha, Profesional, dan Komuter Aktif)
   - Karakteristik Mobilitas: Rerata waktu henti (dwell time) di persimpangan mencapai 45-80 detik, menjamin retensi visual tinggi
   - Total Investasi Paket: ${formatIDR(totalDurationPrice)} untuk durasi ${duration} (Efisiensi CPM: ~Rp ${effectiveCPM} per 1.000 tayang)
${customNote ? `   - Catatan / Penawaran Khusus: ${customNote}\n` : ''}
3. FASILITAS ALL-IN & JAMINAN KEPATUHAN HUKUM:
   - Pajak Reklame Resmi & Izin Penyelenggaraan Reklame Pemkot/Pemda Jawa Barat
   - Perawatan materi cetak, lampu penerangan malam terintegrasi, dan operasional layar digital prima
   - Bukti tayang akuntabel berupa laporan monitoring foto berkala (Day & Night View)

Kami siap mendiskusikan penyesuaian materi visual maupun survei lokasi langsung bersama tim ${client.company}.

Demikian proposal penawaran ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.

Hormat kami,

Suherman Reklame
PT Media Reklame Jawa Barat Mandiri
WhatsApp: 0812-3456-7890 / 0878-2224-8975
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
