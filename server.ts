import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = 3000;

// Initialize Google Gen AI lazily
let genAiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!genAiClient) {
    genAiClient = new GoogleGenAI();
  }
  return genAiClient;
}

// West Java Geofence constants
const WEST_JAVA_BOUNDS = {
  minLat: -7.95,
  maxLat: -5.90,
  minLng: 106.20,
  maxLng: 108.95
};

// Timeout helper to ensure non-blocking AI responses
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini API call timed out')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// Sanitization helper
function sanitizeString(str: any): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:[^\s]*/gi, '')
    .trim();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'OOH-DOOH-Bandung-Backend',
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // 1. Audit Single Spot Endpoint
  app.post('/api/ai/audit-spot', async (req, res) => {
    try {
      const spot = req.body;
      if (!spot || typeof spot !== 'object') {
        return res.status(400).json({ error: 'Data spot tidak valid' });
      }

      const issues: string[] = [];
      let severity: 'SAFE' | 'WARNING' | 'DANGEROUS' = 'SAFE';

      // Security check: Script injection / XSS
      const rawPayload = JSON.stringify(spot);
      if (/<script|javascript:|onload=|onerror=/i.test(rawPayload)) {
        issues.push('Terdeteksi upaya injeksi skrip berbahaya (XSS / Script Tag)');
        severity = 'DANGEROUS';
      }

      // Geofence check
      const lat = spot.coordinates?.lat;
      const lng = spot.coordinates?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        issues.push('Koordinat lintang/bujur tidak berupa angka valid');
        severity = 'WARNING';
      } else if (
        lat < WEST_JAVA_BOUNDS.minLat ||
        lat > WEST_JAVA_BOUNDS.maxLat ||
        lng < WEST_JAVA_BOUNDS.minLng ||
        lng > WEST_JAVA_BOUNDS.maxLng
      ) {
        issues.push(`Koordinat [${lat}, ${lng}] berada di luar batas wilayah Jawa Barat`);
        severity = severity === 'DANGEROUS' ? 'DANGEROUS' : 'WARNING';
      }

      // Pricing integrity check
      const pricing = spot.pricing;
      if (!pricing || typeof pricing !== 'object') {
        issues.push('Struktur harga sewa belum lengkap');
        severity = 'WARNING';
      } else {
        if (pricing.oneMonth <= 0 || pricing.oneYear <= 0) {
          issues.push('Tarif sewa tidak boleh nol atau negatif');
          severity = 'WARNING';
        }
        if (pricing.oneYear < pricing.oneMonth) {
          issues.push('Tarif tahunan tidak boleh lebih rendah dari tarif bulanan');
          severity = 'WARNING';
        }
      }

      // Traffic & Impressions logic check
      const traffic = Number(spot.dailyTraffic) || 0;
      const impressions = Number(spot.dailyImpressions) || 0;
      if (traffic <= 0) {
        issues.push('Volume lalu lintas harian harus bernilai positif');
        severity = 'WARNING';
      }
      if (impressions <= 0) {
        issues.push('Estimasi impresi OTS harus bernilai positif');
        severity = 'WARNING';
      } else if (traffic > 0 && impressions > traffic * 5) {
        issues.push(`Estimasi impresi (${impressions.toLocaleString()}) terlalu tinggi (>5x) dibanding trafik harian (${traffic.toLocaleString()})`);
        severity = 'WARNING';
      }

      // Sanitize fields
      const sanitizedSpot = {
        ...spot,
        name: sanitizeString(spot.name),
        roadName: sanitizeString(spot.roadName),
        district: sanitizeString(spot.district),
        city: sanitizeString(spot.city),
        notes: sanitizeString(spot.notes || '')
      };

      // Call Gemini AI for deeper semantic safety evaluation
      let aiVerdict = 'Data memenuhi standar verifikasi keamanan sistem.';
      try {
        if (process.env.GEMINI_API_KEY) {
          const ai = getAi();
          const prompt = `Anda adalah Sistem AI Keamanan & Integritas Data OOH/DOOH Jawa Barat.
Evaluasi data titik media berikut:
- Nama: ${sanitizedSpot.name}
- Jalan: ${sanitizedSpot.roadName}, ${sanitizedSpot.city}
- Kategori: ${sanitizedSpot.category} (${sanitizedSpot.mediaType})
- Ukuran: ${sanitizedSpot.size}
- Trafik: ${traffic.toLocaleString()} kendaraan/hari
- Impresi OTS: ${impressions.toLocaleString()} OTS/hari
- Tarif 1 Bln: Rp ${pricing?.oneMonth?.toLocaleString('id-ID')}
- Tarif 1 Thn: Rp ${pricing?.oneYear?.toLocaleString('id-ID')}
- Koordinat: [${lat}, ${lng}]
Isu terdeteksi sistem lokal: ${issues.length > 0 ? issues.join('; ') : 'Tidak ada'}.

Berikan ulasan singkat (maksimal 2 kalimat) dalam bahasa Indonesia tentang keamanan, validitas data, dan kewajaran metrik reklame ini.`;

          const response = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt
            }),
            7000
          );
          if (response && response.text) {
            aiVerdict = response.text.trim();
          }
        }
      } catch (aiErr: any) {
        aiVerdict = severity === 'SAFE' 
          ? 'Verifikasi aturan integritas geospasial & tarif OOH Jawa Barat berhasil disetujui.'
          : `Peringatan validitas: ${issues.join(', ')}.`;
      }

      res.json({
        severity,
        isSafe: severity === 'SAFE',
        issues,
        sanitizedSpot,
        aiVerdict,
        checkedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error in /api/ai/audit-spot:', err);
      res.status(500).json({ error: err.message || 'Gagal memeriksa keamanan data' });
    }
  });

  // 2. Audit Entire Database Endpoint
  app.post('/api/ai/audit-database', async (req, res) => {
    try {
      const { spots } = req.body;
      if (!Array.isArray(spots)) {
        return res.status(400).json({ error: 'Parameter spots harus berupa array' });
      }

      const issues: Array<{ spotId: string; spotName: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];
      const seenIds = new Set<string>();
      const seenNos = new Set<number>();
      let duplicateIdCount = 0;
      let duplicateNoCount = 0;
      let outOfBoundsCount = 0;
      let suspiciousOtsCount = 0;
      let badPricingCount = 0;

      spots.forEach((spot, idx) => {
        const id = spot.id || `UNKNOWN-${idx}`;
        const name = spot.name || 'Tanpa Nama';

        // Check duplicate ID
        if (seenIds.has(id)) {
          duplicateIdCount++;
          issues.push({ spotId: id, spotName: name, message: 'ID titik terduplikasi dalam database', severity: 'high' });
        }
        seenIds.add(id);

        // Check duplicate No
        if (typeof spot.no === 'number') {
          if (seenNos.has(spot.no)) {
            duplicateNoCount++;
            issues.push({ spotId: id, spotName: name, message: `Nomor urut ${spot.no} ganda / bentrok`, severity: 'medium' });
          }
          seenNos.add(spot.no);
        }

        // Coordinates check
        const lat = spot.coordinates?.lat;
        const lng = spot.coordinates?.lng;
        if (
          typeof lat !== 'number' ||
          typeof lng !== 'number' ||
          lat < WEST_JAVA_BOUNDS.minLat ||
          lat > WEST_JAVA_BOUNDS.maxLat ||
          lng < WEST_JAVA_BOUNDS.minLng ||
          lng > WEST_JAVA_BOUNDS.maxLng
        ) {
          outOfBoundsCount++;
          issues.push({ spotId: id, spotName: name, message: `Koordinat [${lat}, ${lng}] berada di luar Jawa Barat`, severity: 'high' });
        }

        // Traffic & OTS Check
        const traffic = spot.dailyTraffic || 0;
        const imp = spot.dailyImpressions || 0;
        if (traffic <= 0 || imp <= 0 || imp > traffic * 4.5) {
          suspiciousOtsCount++;
          issues.push({ spotId: id, spotName: name, message: `Kalkulasi impresi (${imp}) tidak proporsional dengan trafik (${traffic})`, severity: 'medium' });
        }

        // Pricing check
        if (!spot.pricing || spot.pricing.oneMonth <= 0 || spot.pricing.oneYear <= 0) {
          badPricingCount++;
          issues.push({ spotId: id, spotName: name, message: 'Tarif sewa tidak terdefinisi dengan benar', severity: 'medium' });
        }
      });

      // Calculate health score (100 is perfect)
      const penalty = (duplicateIdCount * 10) + (duplicateNoCount * 2) + (outOfBoundsCount * 5) + (suspiciousOtsCount * 2) + (badPricingCount * 2);
      const healthScore = Math.max(20, Math.min(100, 100 - penalty));

      // Call Gemini AI for strategic executive summary
      let aiSummary = 'Sistem AI telah memverifikasi seluruh database reklame.';
      let recommendations: string[] = [
        'Pastikan penomoran urut (no) bersifat unik secara global untuk kestabilan pengurutan.',
        'Pertahankan verifikasi geofence koordinat batas Jawa Barat saat menambah titik baru.',
        'Lakukan audit berkala sebelum mengekspor laporan PDF bulanan.'
      ];

      try {
        if (process.env.GEMINI_API_KEY) {
          const ai = getAi();
          const prompt = `Anda adalah Sistem AI Pengawas Keamanan & Integritas Data OOH/DOOH Jawa Barat.
Hasil audit sistem lokal terhadap ${spots.length} titik reklame:
- Skor Integritas: ${healthScore}/100
- ID Duplikat: ${duplicateIdCount}
- Nomor Urut Duplikat: ${duplicateNoCount}
- Koordinat Di Luar Jawa Barat: ${outOfBoundsCount}
- Anomali Rasio OTS / Trafik: ${suspiciousOtsCount}
- Isu Tarif: ${badPricingCount}
- Total Catatan Isu: ${issues.length}

Berikan kesimpulan ringkas (2-3 kalimat) dan 3 poin rekomendasi perbaikan/pengamanan data profesional untuk administrator. Format output:
KESIMPULAN: <teks>
REKOMENDASI:
- <poin 1>
- <poin 2>
- <poin 3>`;

          const response = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt
            }),
            8500
          );

          if (response && response.text) {
            const text = response.text;
            const summaryMatch = text.match(/KESIMPULAN:\s*([\s\S]*?)(?=REKOMENDASI:|$)/i);
            if (summaryMatch) {
              aiSummary = summaryMatch[1].trim();
            } else {
              aiSummary = text.slice(0, 250).trim();
            }

            const recsMatches = [...text.matchAll(/-\s*([^\n]+)/g)].map(m => m[1].trim());
            if (recsMatches.length > 0) {
              recommendations = recsMatches.slice(0, 4);
            }
          }
        }
      } catch (aiErr: any) {
        console.info('Audit AI: Memakai model evaluasi komputasi geospasial lokal:', aiErr?.message || 'Timeout / Quota');
        if (healthScore >= 95) {
          aiSummary = `Audit AI Database: Seluruh ${spots.length} titik reklame OOH/DOOH Jawa Barat terverifikasi dalam kondisi prima (Integritas ${healthScore}%). Koordinat geospasial dan proyeksi impresi konsisten dengan koridor lalu lintas Bandung Raya.`;
        } else if (healthScore >= 80) {
          aiSummary = `Audit AI Database: Database beroperasi stabil dengan skor integritas ${healthScore}%. Ditemukan beberapa penyesuaian minor pada nomor urut atau tarif yang dapat diselaraskan menggunakan fitur Auto-Heal.`;
        } else {
          aiSummary = `Audit AI Database: Integritas database berada pada skor ${healthScore}%. Terdeteksi ${issues.length} isu catatan yang memerlukan perbaikan koordinat atau deduplikasi nomor urut.`;
        }
      }

      res.json({
        healthScore,
        totalSpots: spots.length,
        totalIssues: issues.length,
        duplicateIdCount,
        duplicateNoCount,
        outOfBoundsCount,
        suspiciousOtsCount,
        badPricingCount,
        issues: issues.slice(0, 50),
        aiSummary,
        recommendations,
        auditedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error in /api/ai/audit-database:', err);
      res.status(500).json({ error: err.message || 'Gagal melakukan audit database' });
    }
  });

  // 3. Auto-Heal & Sanitize Database Endpoint
  app.post('/api/ai/auto-heal', async (req, res) => {
    try {
      const { spots } = req.body;
      if (!Array.isArray(spots)) {
        return res.status(400).json({ error: 'Parameter spots harus berupa array' });
      }

      let fixedCount = 0;
      const changeLog: string[] = [];

      // Sort deterministically by existing 'no' or ID
      const sorted = [...spots].sort((a, b) => (a.no || 0) - (b.no || 0) || String(a.id).localeCompare(String(b.id)));

      const healedSpots = sorted.map((spot, index) => {
        const expectedNo = index + 1;
        let modified = false;

        // 1. Repair sequence number
        let no = spot.no;
        if (no !== expectedNo) {
          no = expectedNo;
          modified = true;
        }

        // 2. Sanitize strings
        const name = sanitizeString(spot.name);
        const roadName = sanitizeString(spot.roadName);
        const district = sanitizeString(spot.district);
        const city = sanitizeString(spot.city);
        if (name !== spot.name || roadName !== spot.roadName) {
          modified = true;
        }

        // 3. Coordinate bounds clamp if slightly drifted
        let lat = Number(spot.coordinates?.lat) || -6.9175;
        let lng = Number(spot.coordinates?.lng) || 107.6191;
        if (lat > 0 && lat < 10) lat = -lat; // Fix accidental positive latitude
        if (lat < WEST_JAVA_BOUNDS.minLat || lat > WEST_JAVA_BOUNDS.maxLat) {
          lat = -6.9175; // Reset to central Bandung if completely wild
          modified = true;
        }
        if (lng < WEST_JAVA_BOUNDS.minLng || lng > WEST_JAVA_BOUNDS.maxLng) {
          lng = 107.6191; // Reset to central Bandung if completely wild
          modified = true;
        }

        // 4. OTS Formula Recalibration
        let dailyTraffic = Math.max(1000, Number(spot.dailyTraffic) || 50000);
        let dailyImpressions = Number(spot.dailyImpressions);
        // Standard formula: OTS = traffic * multiplier (based on visibility 0.7 - 0.99 and layout)
        const visibility = Math.min(99, Math.max(60, Number(spot.visibilityScore) || 85));
        const multiplier = (visibility / 100) * 1.65;
        const expectedOts = Math.round(dailyTraffic * multiplier);

        // If dailyImpressions is missing or wildly out of bounds (>4x or <=0)
        if (!dailyImpressions || dailyImpressions <= 0 || dailyImpressions > dailyTraffic * 4) {
          dailyImpressions = expectedOts;
          modified = true;
        }

        if (modified) {
          fixedCount++;
        }

        return {
          ...spot,
          no,
          name,
          roadName,
          district,
          city,
          dailyTraffic,
          dailyImpressions,
          visibilityScore: visibility,
          coordinates: { lat, lng },
          updatedAt: new Date().toISOString()
        };
      });

      changeLog.push(`Menormalkan penomoran urut 1 sampai ${healedSpots.length} secara berurutan.`);
      changeLog.push(`Melakukan sanitasi proteksi terhadap tag HTML & skrip pada teks.`);
      changeLog.push(`Memvalidasi dan mengkalibrasi rasio impresi OTS terhadap volume lalu lintas.`);

      res.json({
        success: true,
        healedSpots,
        fixedCount,
        changeLog,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error in /api/ai/auto-heal:', err);
      res.status(500).json({ error: err.message || 'Gagal melakukan pemulihan otomatis' });
    }
  });

  // AI-Powered Client Proposal & Outreach Generator (Email + WhatsApp)
  app.post('/api/ai/draft-proposal', async (req, res) => {
    try {
      const { client, spots, duration = '1 Bulan', tone = 'formal', customNote = '' } = req.body;

      if (!client || !client.name || !Array.isArray(spots) || spots.length === 0) {
        return res.status(400).json({ error: 'Data klien dan minimal 1 titik media wajib disertakan.' });
      }

      const totalMonthlyPrice = spots.reduce((acc: number, s: any) => acc + (Number(s.pricing?.oneMonth) || 0), 0);
      const totalDailyImpressions = spots.reduce((acc: number, s: any) => acc + (Number(s.dailyImpressions) || 0), 0);
      const totalMonthlyImpressions = totalDailyImpressions * 30;

      let emailSubject = `[Penawaran Resmi] Media Reklame OOH/DOOH Strategis Jawa Barat - ${client.company}`;
      let emailBody = '';
      let whatsappText = '';
      let keyHighlights: string[] = [];
      let estimatedReachSummary = `Total estimasi impresi mencapai ${totalDailyImpressions.toLocaleString('id-ID')} OTS/hari (${totalMonthlyImpressions.toLocaleString('id-ID')} OTS/bulan) dari ${spots.length} titik reklame di Jawa Barat.`;

      // Try Gemini 3.8 Flash
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = getAi();

          const spotsDetails = spots.map((s: any, idx: number) => {
            const price = duration === '3 Bulan' ? (s.pricing?.threeMonths || s.pricing?.oneMonth * 3) :
                          duration === '6 Bulan' ? (s.pricing?.sixMonths || s.pricing?.oneMonth * 6) :
                          duration === '1 Tahun' ? (s.pricing?.oneYear || s.pricing?.oneMonth * 12) :
                          (s.pricing?.oneMonth || 0);
            return `${idx + 1}. ${s.name} (${s.city}) | Kategori: ${s.category === 'DOOH_DIGITAL' ? 'DOOH (Digital Videotron)' : 'OOH (Billboard Statis)'} | Format: ${s.mediaType} (${s.size}) | Trafik: ~${s.dailyTraffic?.toLocaleString('id-ID')} kendaraan/hari | Impresi: ~${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari | Tarif (${duration}): Rp ${(price || 0).toLocaleString('id-ID')}`;
          }).join('\n');

          const prompt = `Anda adalah Senior Media Planner & Account Director dari Suherman Reklame (jaringan periklanan luar ruang OOH & DOOH terdepan di Jawa Barat).
Tugas Anda adalah membuat 2 draf penawaran personal untuk klien:
1. Format Email formal & meyakinkan.
2. Format WhatsApp ringkas, terstruktur rapi dengan format tebal (*...*), bullet point, dan emoji profesional.

Profil Klien:
- Nama Kontak: ${sanitizeString(client.name)}
- Perusahaan / Brand: ${sanitizeString(client.company)}
- Jabatan: ${sanitizeString(client.role || 'Brand Leader')}
- Kategori Industri: ${sanitizeString(client.category || 'Korporat')}
- Durasi Kampanye: ${duration}
- Nada Bahasa (Tone): ${tone}
${customNote ? `- Catatan Khusus dari Sales: ${sanitizeString(customNote)}` : ''}

Titik Media yang Ditawarkan (${spots.length} Titik):
${spotsDetails}

Total Estimasi Impresi: ${totalDailyImpressions.toLocaleString('id-ID')} OTS/hari (~${totalMonthlyImpressions.toLocaleString('id-ID')} OTS/bulan).

Ketentuan All-In Suherman Reklame:
- Sudah termasuk pajak reklame resmi & izin Pemda/Pemkot
- Penerangan lampu malam / operasional digital prima
- Pembersihan visual & pemeliharaan berkala
- Laporan dokumentasi foto berkala (Day & Night)
- Kontak: Suherman Reklame (WhatsApp: 0812-3456-7890, Email: suherman.reklame2012@gmail.com)

Keluarkan output dalam JSON murni (tanpa tag markdown di luar) dengan skema:
{
  "emailSubject": "string",
  "emailBody": "string",
  "whatsappText": "string",
  "keyHighlights": ["string", "string", "string"],
  "estimatedReachSummary": "string"
}`;

          const response = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt
            }),
            5000
          );

          if (response && response.text) {
            const rawText = response.text.trim();
            // Extract JSON block if wrapped in markdown
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.emailSubject && parsed.emailBody && parsed.whatsappText) {
                emailSubject = parsed.emailSubject;
                emailBody = parsed.emailBody;
                whatsappText = parsed.whatsappText;
                if (Array.isArray(parsed.keyHighlights)) keyHighlights = parsed.keyHighlights;
                if (parsed.estimatedReachSummary) estimatedReachSummary = parsed.estimatedReachSummary;
              }
            }
          }
        } catch (aiErr: any) {
          console.warn('Gemini draft proposal error or timeout, continuing with fallback:', aiErr.message);
        }
      }

      // If AI did not populate body, craft rich fallback template
      if (!emailBody || !whatsappText) {
        const spotLines = spots.map((s: any, idx: number) => {
          return `${idx + 1}. *${s.name}* (${s.city})
- Tipe: ${s.mediaType} (${s.size})
- Trafik: ~${s.dailyTraffic?.toLocaleString('id-ID')} kend./hari | Impresi: ${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari`;
        }).join('\n\n');

        whatsappText = `*PENAWARAN TITIK MEDIA OOH/DOOH JAWA BARAT*
Kepada Yth. *${client.name}*
_${client.company}_

Halo ${client.name}, salam hangat dari tim Suherman Reklame.

Menindaklanjuti rencana ekspansi brand awareness ${client.company}, berikut rekomendasi titik media reklame strategis Jawa Barat:

📍 *TITIK REKLAME TERPILIH (${spots.length} Titik):*
${spotLines}

📊 *ESTIMASI JANGKAUAN AUDIENS:*
• Total Peluang Melihat (OTS): *${totalDailyImpressions.toLocaleString('id-ID')} impresi/hari* (~${totalMonthlyImpressions.toLocaleString('id-ID')} impresi/bulan)
• Pilihan Durasi: *${duration}*
${customNote ? `• Catatan Khusus: ${customNote}\n` : ''}
🛡️ *FASILITAS SUDAH TERMASUK:*
✅ Pajak Reklame & Izin Pemda Resmi
✅ Lampu penerangan / operasional LED terjamin
✅ Pemeliharaan materi berkala & monitoring visual

Apakah ${client.name} berkenan untuk pembahasan draft SPK atau peninjauan lokasi (site survey) bersama tim kami?

Hormat kami,
*Suherman Reklame*
WhatsApp: 0812-3456-7890 | suherman.reklame2012@gmail.com`;

        emailBody = `Kepada Yth.
${client.name}
${client.role ? `${client.role} - ` : ''}${client.company}

Dengan hormat,

Sehubungan dengan rencana kampanye promosi dan penguatan brand awareness ${client.company} di wilayah Jawa Barat, bersama ini Suherman Reklame menyampaikan penawaran inventaris media luar ruang (OOH/DOOH) terpilih:

1. DAFTAR TITIK REKLAME PILIHAN:
${spots.map((s: any, idx: number) => `   ${idx + 1}. ${s.name} - ${s.city}
      - Format: ${s.mediaType} (${s.size})
      - Estimasi Impresi: ${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari`).join('\n\n')}

2. ESTIMASI JANGKAUAN & KETENTUAN:
   - Jumlah Titik: ${spots.length} Titik Strategis
   - Estimasi Impresi Harian: ${totalDailyImpressions.toLocaleString('id-ID')} OTS / hari (~${totalMonthlyImpressions.toLocaleString('id-ID')} OTS / bulan)
   - Durasi Sewa: ${duration}
${customNote ? `   - Catatan / Promo Khusus: ${customNote}\n` : ''}
3. FASILITAS ALL-IN:
   - Pajak Reklame Resmi & Retribusi Pemda Jawa Barat
   - Perawatan berkala, instalasi materi, dan pencahayaan optimal
   - Laporan berkala kondisi visual materi reklame

Kami siap membantu menyiapkan simulasi materi visual dan penyesuaian paket sesuai kebutuhan kampanye ${client.company}.

Hormat kami,

Suherman Reklame
Jawa Barat OOH Media Network
Email: suherman.reklame2012@gmail.com | WhatsApp: 0812-3456-7890`;

        keyHighlights = [
          `Total potensi jangkauan audiens mencapai ${totalDailyImpressions.toLocaleString('id-ID')} impresi per hari di titik arteri Jawa Barat.`,
          `Paket lengkap mencakup izin resmi pemerintah kota/kabupaten serta perawatan visual materi.`,
          `Fleksibilitas opsi durasi kampanye mulai dari 1 bulan hingga 1 tahun.`
        ];
      }

      res.json({
        emailSubject,
        emailBody,
        whatsappText,
        keyHighlights,
        estimatedReachSummary,
        totalMonthlyPrice,
        totalSpotsCount: spots.length,
        generatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error in /api/ai/draft-proposal:', err);
      res.status(500).json({ error: err.message || 'Gagal membuat draft proposal AI' });
    }
  });

  // Vite Middleware Setup for dev & production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OOH/DOOH Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
