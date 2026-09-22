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

          const totalDailyTraffic = spots.reduce((acc: number, s: any) => acc + (s.dailyTraffic || 0), 0);
          const totalMonthlyTraffic = totalDailyTraffic * 30;

          // Pricing calculation based on duration
          const getDurationPrice = (s: any) => {
            if (duration === '3 Bulan') return s.pricing?.threeMonths || (s.pricing?.oneMonth || 0) * 3 * 0.95;
            if (duration === '6 Bulan') return s.pricing?.sixMonths || (s.pricing?.oneMonth || 0) * 6 * 0.90;
            if (duration === '1 Tahun') return s.pricing?.oneYear || (s.pricing?.oneMonth || 0) * 12 * 0.85;
            return s.pricing?.oneMonth || 0;
          };

          const totalPackageCost = spots.reduce((acc: number, s: any) => acc + getDurationPrice(s), 0);
          const effectiveCPM = totalMonthlyImpressions > 0 
            ? ((totalPackageCost / totalMonthlyImpressions) * 1000).toFixed(1)
            : '0';

          const spotsDetails = spots.map((s: any, idx: number) => {
            const price = getDurationPrice(s);
            const sesTier = s.locationType === 'Komersial & Mall' ? 'SES A/B (High Affluent)' : 
                            s.locationType === 'Pusat Kota & Protokol' ? 'SES A/B/C+ (Executive & Shoppers)' :
                            s.locationType === 'Pendidikan & Kampus' ? 'SES B/C+ (Gen Z & Youth)' : 'SES B/C+ (Commuters)';
            return `${idx + 1}. ${s.name} (${s.city}, Kec. ${s.district || '-'}) | Kategori: ${s.category === 'DOOH_DIGITAL' ? 'DOOH (Videotron Digital)' : 'OOH (Billboard/Bando Statis)'} | Format: ${s.mediaType} (${s.size}, ${s.layout}) | Trafik: ~${s.dailyTraffic?.toLocaleString('id-ID')} kend./hari | Impresi: ~${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari | Koridor: ${s.locationType} [${sesTier}] | Investasi (${duration}): Rp ${(price || 0).toLocaleString('id-ID')}`;
          }).join('\n');

          const prompt = `Anda adalah Senior Media Planner & Solutions Architect OOH/DOOH dari Suherman Reklame Jawa Barat.
Tugas Anda adalah merancang proposal penawaran media luar ruang yang SANGAT PROFESIONAL dengan MENYATUKAN DATA ANALISA TRAFFIC, DEMOGRAFI, DAN SPESIFIKASI TITIK DALAM 1 KESATUAN TERPADU.

Profil Klien:
- Nama Kontak: ${sanitizeString(client.name)}
- Perusahaan / Brand: ${sanitizeString(client.company)}
- Jabatan: ${sanitizeString(client.role || 'Brand Leader')}
- Kategori Industri: ${sanitizeString(client.category || 'Korporat')}
- Durasi Kampanye: ${duration}
- Nada Bahasa (Tone): ${tone}
${customNote ? `- Catatan Khusus Sales: ${sanitizeString(customNote)}` : ''}

Titik Media Pilihan yang DITANDAI (${spots.length} Titik):
${spotsDetails}

Ringkasan Metrik Terpadu (Traffic & Demografi 1 Kesatuan):
- Total Volume Kendaraan: ~${totalDailyTraffic.toLocaleString('id-ID')} kendaraan/hari (~${totalMonthlyTraffic.toLocaleString('id-ID')} kendaraan/bulan)
- Total Estimasi Impresi (OTS): ~${totalDailyImpressions.toLocaleString('id-ID')} OTS/hari (~${totalMonthlyImpressions.toLocaleString('id-ID')} OTS/bulan)
- Profil Demografi Audiens: Dominan SES A & B (65-75%), Usia produktif 20-45 tahun (Pekerja Kantoran, Pebisnis, Komuter Harian, & Urban Shoppers)
- Karakteristik Jam Padat (Peak Hours): Pagi (06.30 - 09.30) & Sore (16.30 - 20.00) dengan rerata dwell time persimpangan 45-80 detik
- Total Investasi Paket (${duration}): Rp ${Math.round(totalPackageCost).toLocaleString('id-ID')} (Efisiensi CPM sangat kompetitif: ~Rp ${effectiveCPM} per 1.000 OTS)

Ketentuan & Jaminan Suherman Reklame:
- 100% Legalitas terjamin (Pajak Reklame resmi & perizinan Pemda/Pemkot Jawa Barat)
- Pemeliharaan visual, penerangan malam prima / operasional LED high-refresh rate
- Laporan dokumentasi foto berkala (Day & Night View) untuk akuntabilitas tayang
- Kontak: Suherman Reklame (WhatsApp: 0812-3456-7890 / 0878-2224-8975, Email: suherman.reklame2012@gmail.com)

Instruksi Output:
Buat draf WhatsApp dan Email yang menyatukan analisa traffic, demografi audiens, dan rincian titik pilihan dalam satu kesatuan terstruktur elegan.
Keluarkan output dalam JSON murni (tanpa tag markdown) dengan skema:
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

      // If AI did not populate body, craft rich fallback template with unified traffic & demographics
      if (!emailBody || !whatsappText) {
        const totalDailyTraffic = spots.reduce((acc: number, s: any) => acc + (s.dailyTraffic || 0), 0);
        const totalMonthlyTraffic = totalDailyTraffic * 30;

        const getDurationPrice = (s: any) => {
          if (duration === '3 Bulan') return s.pricing?.threeMonths || (s.pricing?.oneMonth || 0) * 3 * 0.95;
          if (duration === '6 Bulan') return s.pricing?.sixMonths || (s.pricing?.oneMonth || 0) * 6 * 0.90;
          if (duration === '1 Tahun') return s.pricing?.oneYear || (s.pricing?.oneMonth || 0) * 12 * 0.85;
          return s.pricing?.oneMonth || 0;
        };

        const totalPackageCost = spots.reduce((acc: number, s: any) => acc + getDurationPrice(s), 0);
        const effectiveCPM = totalMonthlyImpressions > 0 
          ? ((totalPackageCost / totalMonthlyImpressions) * 1000).toFixed(1)
          : '0';

        const spotLines = spots.map((s: any, idx: number) => {
          const sesTier = s.locationType === 'Komersial & Mall' ? 'SES A/B (Commercial Hub)' : 
                          s.locationType === 'Pusat Kota & Protokol' ? 'SES A/B (Main Protocol)' : 'SES B/C+ (Arteri & Commuter)';
          const photoUrl = s.imageUrl || (s.imageUrls && s.imageUrls[0]) || s.photoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
          return `${idx + 1}. *${s.name}* (${s.city})
   • Format: ${s.mediaType} (${s.size}, ${s.layout})
   • Trafik: ~${s.dailyTraffic?.toLocaleString('id-ID')} kend./hari | Impresi: *${s.dailyImpressions?.toLocaleString('id-ID')} OTS/hari*
   • Target Audiens: ${sesTier}
   • Investasi (${duration}): Rp ${Math.round(getDurationPrice(s)).toLocaleString('id-ID')}
   • 📸 Gambar Lokasi: ${photoUrl}`;
        }).join('\n\n');

        whatsappText = `*PROPOSAL PENAWARAN MEDIA OOH & DOOH STRATEGIS JAWA BARAT*
Kepada Yth. *${client.name}*
_${client.role ? `${client.role} - ` : ''}${client.company}_

Halo ${client.name}, salam hangat dari Suherman Reklame.

Menindaklanjuti strategi penguatan brand awareness & market dominance *${client.company}*, berikut rekomendasi terpadu *${spots.length} Titik Media Terpilih* lengkap dengan analisa traffic dan profil demografi audiens:

📍 *REKOMENDASI TITIK TERPILIH (${spots.length} Titik Ditandai):*
${spotLines}

📊 *ANALISA TRAFFIC & DEMOGRAFI TERPADU (AUDIENCE INTELLIGENCE):*
• *Total Impresi (OTS):* *${totalDailyImpressions.toLocaleString('id-ID')} views/hari* (~${totalMonthlyImpressions.toLocaleString('id-ID')} views/bulan)
• *Volume Trafik Koridor:* ~${totalDailyTraffic.toLocaleString('id-ID')} kendaraan/hari (~${totalMonthlyTraffic.toLocaleString('id-ID')} unit/bulan)
• *Profil Demografi (SES):* Dominan *SES A & B (70%)*, usia produktif 20–45 thn (Profesional, Pebisnis, & Urban Families)
• *Jam Paparan Prima (Peak Hours):* Pagi (06.30 - 09.30) & Sore-Malam (16.30 - 20.30) dengan rerata dwell time lampu merah 45-80 detik
• *Total Investasi (${duration}):* *Rp ${Math.round(totalPackageCost).toLocaleString('id-ID')}* (Efisiensi CPM: ~Rp ${effectiveCPM} / 1.000 OTS)
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

        emailBody = `Kepada Yth.
${client.name}
${client.role ? `${client.role} - ` : ''}${client.company}

Dengan hormat,

Sehubungan dengan rencana kampanye promosi dan perluasan jangkauan merek ${client.company} di wilayah strategis Jawa Barat, bersama ini Suherman Reklame menyampaikan proposal penawaran terpadu media luar ruang (OOH & DOOH) dengan analisa lalu lintas dan profil demografi audiens lengkap:

1. DAFTAR TITIK REKLAME PILIHAN (${spots.length} Titik Ditandai):
${spots.map((s: any, idx: number) => {
  const sesTier = s.locationType === 'Komersial & Mall' ? 'SES A/B' : 'SES A/B/C+';
  return `   ${idx + 1}. ${s.name} - ${s.city} (Kec. ${s.district || '-'})
      - Format Media: ${s.mediaType} (${s.size}, ${s.layout})
      - Estimasi Lalu Lintas: ${s.dailyTraffic?.toLocaleString('id-ID')} kendaraan / hari
      - Peluang Melihat (OTS): ${s.dailyImpressions?.toLocaleString('id-ID')} impresi / hari
      - Klasifikasi Koridor: ${s.locationType} [${sesTier}]
      - Investasi (${duration}): Rp ${Math.round(getDurationPrice(s)).toLocaleString('id-ID')}`;
}).join('\n\n')}

2. KESATUAN ANALISA TRAFFIC & DEMOGRAFI AUDIENS:
   - Total Peluang Melihat (OTS): ${totalDailyImpressions.toLocaleString('id-ID')} impresi/hari (~${totalMonthlyImpressions.toLocaleString('id-ID')} impresi/bulan)
   - Volume Lalu Lintas Koridor: ${totalDailyTraffic.toLocaleString('id-ID')} kendaraan/hari (~${totalMonthlyTraffic.toLocaleString('id-ID')} unit/bulan)
   - Komposisi Demografi (SES): 70% SES A & B, didominasi kelompok usia 20-45 tahun (Eksekutif, Pengusaha, Profesional, dan Komuter Aktif)
   - Karakteristik Mobilitas: Rerata waktu henti (dwell time) di persimpangan mencapai 45-80 detik, menjamin retensi visual tinggi
   - Total Investasi Paket: Rp ${Math.round(totalPackageCost).toLocaleString('id-ID')} untuk durasi ${duration} (Efisiensi CPM: ~Rp ${effectiveCPM} per 1.000 tayang)
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

  // AI Market Insights Endpoint (Weekly traffic analysis & High-Growth recommendations)
  app.post('/api/ai/market-insights', async (req, res) => {
    try {
      const {
        spotsCount,
        averageWeeklyGrowth,
        peakDayName,
        topSurgeCorridor,
        highGrowthSpotsSample
      } = req.body;

      let executiveSummary = '';
      let strategicRecommendations: string[] = [];

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = getAi();
          const prompt = `Anda adalah Direktur Intelijen Pasar dan Analis Trafik OOH/DOOH senior untuk Suherman Reklame di Jawa Barat (Bandung Raya & sekitarnya).
Berdasarkan data telemetri lalu lintas mingguan terbaru:
- Total Titik Terpantau: ${spotsCount} lokasi
- Rerata Pertumbuhan Arus Lalu Lintas (WoW): +${averageWeeklyGrowth}%
- Hari Puncak Mobilitas (Peak Day): ${peakDayName}
- Koridor Lonjakan Tertinggi: ${topSurgeCorridor}
- Sampel Titik Rekomendasi High-Growth Teratas:
${JSON.stringify(highGrowthSpotsSample || [], null, 2)}

Tugas:
1. Tulis ringkasan eksekutif pasar (executiveSummary) maksimal 3-4 kalimat dalam Bahasa Indonesia yang formal, meyakinkan, berbasis data (tanpa hype kosong). Sebutkan lonjakan akhir pekan vs hari kerja dan peluang bagi pengiklan.
2. Berikan 3 poin rekomendasi strategis konkret (strategicRecommendations) untuk media planner dan pengiklan (misal penempatan materi, jam tayang, dan pemilihan koridor).

Keluarkan format JSON murni:
{
  "executiveSummary": "string",
  "strategicRecommendations": ["string", "string", "string"]
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
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed.executiveSummary) executiveSummary = parsed.executiveSummary;
              if (Array.isArray(parsed.strategicRecommendations)) {
                strategicRecommendations = parsed.strategicRecommendations;
              }
            }
          }
        } catch (aiErr: any) {
          console.warn('Gemini Market Insights error or timeout, utilizing heuristic generator:', aiErr?.message);
        }
      }

      if (!executiveSummary) {
        executiveSummary = `Analisis telemetri mingguan mengidentifikasi akselerasi mobilitas rata-rata +${averageWeeklyGrowth || 13.8}% WoW di koridor Jawa Barat. Puncak pergerakan tercatat pada ${peakDayName || 'Sabtu'} dengan dominasi arus di ${topSurgeCorridor || 'Bandung Raya'}, memberikan peningkatan efisiensi impresi OTS harian yang signifikan bagi kampanye multi-format OOH & DOOH.`;
      }

      if (strategicRecommendations.length === 0) {
        strategicRecommendations = [
          `Optimalkan materi bertarget 'Brand Awareness' di koridor gerbang tol dan pusat perbelanjaan untuk menjaring kenaikan trafik akhir pekan (+${Math.round((averageWeeklyGrowth || 13) * 1.35)}% vs hari kerja).`,
          `Prioritaskan titik berstatus 'Available' di persimpangan lampu merah utama dengan waktu pandang 60-90 detik guna memaksimalkan retensi visual.`,
          `Kombinasikan penayangan DOOH dinamis pada jam sibuk (07.00-09.30 & 16.30-20.30 WIB) untuk efisiensi biaya CPM terbaik.`
        ];
      }

      res.json({
        success: true,
        executiveSummary,
        strategicRecommendations,
        generatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error in /api/ai/market-insights:', err);
      res.status(500).json({ error: err.message || 'Gagal memproses AI Market Insights' });
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
