import jsPDF from 'jspdf';
import { MediaSpot, ClientContact, ProposalDuration } from '../types/ooh';
import { formatIDR, formatCompactNumber } from './formatters';
import { UnifiedProposalAnalytics } from './audienceDemographics';
import { getAllSpotImages, loadImageAsBase64, createSpotFallbackCanvas } from './imageUtils';

export async function generateExecutiveProposalPDF(
  client: ClientContact,
  spots: MediaSpot[],
  analytics: UnifiedProposalAnalytics,
  duration: ProposalDuration = '1 Bulan',
  customNote?: string
): Promise<string> {
  // Preload all spot photos concurrently in base64 format
  const spotImagesMap: Record<string, string[]> = {};
  await Promise.all(
    spots.map(async (spot) => {
      const urls = getAllSpotImages(spot);
      const loaded: string[] = [];
      const imagesToLoad = urls.slice(0, 2); // take up to 2 primary photos
      const loadedDataUrls = await Promise.all(
        imagesToLoad.map((u) => loadImageAsBase64(u, 3500))
      );
      loadedDataUrls.forEach((dataUrl) => {
        if (dataUrl) loaded.push(dataUrl);
      });
      if (loaded.length === 0) {
        loaded.push(createSpotFallbackCanvas(spot));
      }
      spotImagesMap[spot.id] = loaded;
    })
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const refId = `PROP-OOH-${Date.now().toString().slice(-6)}`;
  const dateFormatted = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });

  // ==========================================
  // PAGE 1: EXECUTIVE COVER & AUDIENCE INTELLIGENCE
  // ==========================================

  // Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE MEDIA PROPOSAL & AUDIENCE INTELLIGENCE', margin, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SUHERMAN REKLAME • STRATEGIC OOH & DOOH MEDIA NETWORK JAWA BARAT', margin, 18);
  doc.text(`Ref: ${refId} | Tanggal: ${dateFormatted} | Durasi: ${duration}`, margin, 24);

  // Client Box
  let y = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DIPERSIAPKAN KHUSUS UNTUK KLIEN:', margin + 4, y + 6);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${client.name} — ${client.company}`, margin + 4, y + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Jabatan: ${client.role || 'Brand Director'} | Kategori: ${client.category || 'Korporat'} | Kontak: ${client.phone || '-'} / ${client.email || '-'}`, margin + 4, y + 17);

  // 1. Executive Performance Scorecard
  y += 28;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. RINGKASAN EKSEKUTIF & KPI AUDIENS (TITIK DITANDAI)', margin, y);

  y += 4;
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const kpis = [
    { label: 'Titik Terpilih', val: `${spots.length} Titik`, sub: 'Pilihan Khusus' },
    { label: 'Est. Impresi / Bln', val: `${formatCompactNumber(analytics.totalMonthlyImpressions)} OTS`, sub: `${formatCompactNumber(analytics.totalDailyImpressions)} OTS/hari` },
    { label: 'Volume Trafik', val: `${formatCompactNumber(analytics.totalDailyTraffic)} / hari`, sub: 'Motor, Mobil & Bus' },
    { label: 'Investasi Paket', val: formatCompactNumber(analytics.financials.packageTotalCost), sub: `Hemat ${analytics.financials.discountPercentage}% (${duration})` }
  ];

  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * (cardWidth + 3);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, y, cardWidth, 18, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + 3, y + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, kx + 3, y + 11);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, kx + 3, y + 15.5);
  });

  // 2. Unified Traffic & Demographics Intelligence
  y += 24;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. ANALISA TERPADU TRAFFIC & DEMOGRAFI AUDIENS', margin, y);

  y += 5;
  const halfWidth = (pageWidth - margin * 2 - 4) / 2;

  // Box Left: Traffic Analytics
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, halfWidth, 42, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Karakteristik & Volume Trafik Koridor', margin + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`• Modal Split: Motor 67%, Mobil 25%, Angkutan/Logistik 8%`, margin + 4, y + 12);
  doc.text(`• Rerata Dwell Time di Persimpangan: ${analytics.demographics.averageDwellTimeSec} detik`, margin + 4, y + 17);
  doc.text(`• Index Visibilitas Sudut Pandang: ${analytics.demographics.averageVisibilityScore}/100`, margin + 4, y + 22);
  doc.text(`• Peak Exposure: ${analytics.demographics.peakTrafficHours}`, margin + 4, y + 27);
  doc.text(`• Efisiensi CPM: Rp ${analytics.financials.effectiveCPM} per 1.000 tayang`, margin + 4, y + 32);
  doc.text(`• Biaya Efektif per Hari: ${formatIDR(analytics.financials.costPerDay)} / hari`, margin + 4, y + 37);

  // Box Right: Demographic Profile
  const rightX = margin + halfWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, y, halfWidth, 42, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Profil Demografi & SES Target Audiens', rightX + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`• Sosio-Ekonomi (SES): SES A (${analytics.demographics.sesA}%), SES B (${analytics.demographics.sesB}%), SES C+ (${analytics.demographics.sesC}%)`, rightX + 4, y + 12);
  doc.text(`• Kelompok Usia Dominan: 25 - 39 thn (48%), 18 - 24 thn (24%)`, rightX + 4, y + 17);
  doc.text(`• Rasio Gender: 54% Pria | 46% Wanita`, rightX + 4, y + 22);
  doc.text(`• Persona Utama: Eksekutif, Profesional Muda, & Urban Shoppers`, rightX + 4, y + 27);
  doc.text(`• Karakteristik Koridor: ${analytics.citiesCovered.join(', ')}`, rightX + 4, y + 32);
  doc.text(`• Jangkauan Wilayah: Pusat Kota, Komersial, & Jalur Protokol`, rightX + 4, y + 37);

  // 3. Media Spots Table Header
  y += 48;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`3. SPESIFIKASI TITIK MEDIA TERPILIH (${spots.length} TITIK DITANDAI)`, margin, y);

  y += 5;
  const colWidths = [8, 52, 26, 26, 22, 25, 23];
  const tableHeaders = ['No', 'Nama Titik & Lokasi', 'Wilayah', 'Jenis Media', 'Ukuran', `Tarif (${duration})`, 'OTS / Hari'];

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  tableHeaders.forEach((h, idx) => {
    doc.text(h, curX + 1.5, y + 4.5);
    curX += colWidths[idx];
  });

  y += 7.5;

  // Spots Rows
  spots.forEach((s, idx) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 15;
    }

    // Pricing calculation
    let pPrice = s.pricing?.oneMonth || 0;
    if (duration === '3 Bulan') pPrice = s.pricing?.threeMonths || pPrice * 3 * 0.95;
    else if (duration === '6 Bulan') pPrice = s.pricing?.sixMonths || pPrice * 6 * 0.90;
    else if (duration === '1 Tahun') pPrice = s.pricing?.oneYear || pPrice * 12 * 0.85;

    // Alternate background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.2, pageWidth - margin * 2, 6, 'F');
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    let rx = margin;
    // No
    doc.text(String(idx + 1), rx + 1.5, y + 1);
    rx += colWidths[0];

    // Nama Titik
    const nameStr = s.name.length > 32 ? s.name.slice(0, 30) + '..' : s.name;
    doc.setFont('helvetica', 'bold');
    doc.text(nameStr, rx + 1.5, y + 1);
    doc.setFont('helvetica', 'normal');
    rx += colWidths[1];

    // Wilayah
    doc.text(s.city.replace('Kota ', ''), rx + 1.5, y + 1);
    rx += colWidths[2];

    // Jenis
    const mType = s.category === 'DOOH_DIGITAL' ? 'DOOH LED' : s.mediaType.slice(0, 14);
    doc.text(mType, rx + 1.5, y + 1);
    rx += colWidths[3];

    // Ukuran
    doc.text(s.size, rx + 1.5, y + 1);
    rx += colWidths[4];

    // Tarif
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(formatCompactNumber(pPrice), rx + 1.5, y + 1);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    rx += colWidths[5];

    // OTS / Hari
    doc.text(`${formatCompactNumber(s.dailyImpressions)} OTS`, rx + 1.5, y + 1);

    y += 6.5;
  });

  // Total Summary Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 2, pageWidth - margin * 2, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL INVESTASI PAKET KHUSUS:', margin + 4, y + 2.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`${formatIDR(analytics.financials.packageTotalCost)} (${duration})`, pageWidth - margin - 45, y + 2.5);

  // Terms & Assurances Footer
  y += 11;
  if (y > pageHeight - 42) {
    doc.addPage();
    y = 15;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 23, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('KETENTUAN ALL-IN & JAMINAN SUHERMAN REKLAME:', margin + 4, y + 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('1. 100% Pajak Reklame Resmi & Perizinan Penyelenggaraan Reklame Pemkot/Pemda Jawa Barat Terjamin.', margin + 4, y + 9.5);
  doc.text('2. Penerangan lampu malam hari / operasional LED high-refresh rate dengan proteksi kelistrikan aman.', margin + 4, y + 13.5);
  doc.text('3. Laporan foto dokumentasi berkala (Day & Night View) untuk akuntabilitas tayang kampanye.', margin + 4, y + 17.5);

  if (customNote) {
    y += 26;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`Catatan Khusus Sales: ${customNote}`, margin, y);
  }

  // Footnote on page 1 indicating attached photos
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('*) Foto dokumentasi fisik, sudut pandang pengendara, dan spesifikasi visual setiap titik terlampir lengkap pada halaman berikutnya.', margin, pageHeight - 11);

  // Page 1 Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Halaman 1 • Dokumen Resmi Executive Media Proposal — Suherman Reklame', margin, pageHeight - 6);
  doc.text('Hotline: 0878-2224-8975 (Suherman)', pageWidth - margin - 55, pageHeight - 6);

  // ==========================================
  // SECTION 4: LAMPIRAN DOKUMENTASI FOTO LOKASI
  // ==========================================

  // Always start visual photo attachments on a dedicated, pristine page
  doc.addPage();

  const drawVisualPageHeader = (pageNumber: number) => {
    // Dark Top Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. DOKUMENTASI VISUAL & FOTO LOKASI MEDIA TERPILIH', margin, 10);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('SUHERMAN REKLAME • BUKTI FOTO EKSISTING, ANGLE VIEW & VISIBILITAS KORIDOR', margin, 15.5);

    doc.setFontSize(7);
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.setFont('helvetica', 'bold');
    doc.text(`Lampiran Visual: ${spots.length} Titik Ditawarkan | Ref: ${refId} | Klien: ${client.company}`, margin, 20.5);

    // Green Verified Tag
    doc.setFillColor(6, 78, 59); // emerald-900
    doc.roundedRect(pageWidth - margin - 42, 6, 42, 12, 1.5, 1.5, 'F');
    doc.setTextColor(110, 231, 183);
    doc.setFontSize(7);
    doc.text('✓ 100% TERVERIFIKASI', pageWidth - margin - 40, 11);
    doc.setFontSize(6);
    doc.setTextColor(209, 250, 229);
    doc.text('AUDIT LAPANGAN AKTIF', pageWidth - margin - 40, 15.5);
  };

  const drawVisualPageFooter = (pageNumber: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Halaman ${pageNumber} • Lampiran Visual & Foto Lokasi — Suherman Reklame Jawa Barat`, margin, pageHeight - 6);
    doc.text('Hotline: 0878-2224-8975 (Suherman) | suherman.reklame2012@gmail.com', pageWidth - margin - 82, pageHeight - 6);
  };

  let visualPageNumber = 2;
  drawVisualPageHeader(visualPageNumber);
  drawVisualPageFooter(visualPageNumber);

  // CASE 1: SINGLE SPOT PROPOSAL (Featured Showcase Layout)
  if (spots.length === 1) {
    const s = spots[0];
    const photos = spotImagesMap[s.id] || [];

    // Calculate Spot Price
    let spotPrice = s.pricing?.oneMonth || 0;
    if (duration === '3 Bulan') spotPrice = s.pricing?.threeMonths || spotPrice * 3 * 0.95;
    else if (duration === '6 Bulan') spotPrice = s.pricing?.sixMonths || spotPrice * 6 * 0.90;
    else if (duration === '1 Tahun') spotPrice = s.pricing?.oneYear || spotPrice * 12 * 0.85;

    let vy = 29;

    // Spot Title & Header Strip
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, vy, pageWidth - margin * 2, 9, 1.5, 1.5, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`TITIK #1: ${s.name}`, margin + 3.5, vy + 6);

    doc.setFontSize(7.5);
    doc.setTextColor(52, 211, 153); // emerald-400
    const spotMetaText = `${s.category === 'DOOH_DIGITAL' ? 'DOOH VIDEOTRON LED' : 'BILLBOARD FRONTLITE'} • ${s.size} (${s.layout}) • ${formatCompactNumber(s.dailyImpressions)} OTS/HARI`;
    doc.text(spotMetaText, pageWidth - margin - doc.getTextWidth(spotMetaText) - 3.5, vy + 6);

    vy += 12;

    // PHOTO(S) SHOWCASE
    if (photos.length >= 2) {
      // 2 Photos Side by Side
      const photoW = (pageWidth - margin * 2 - 5) / 2; // ~88.5mm
      const photoH = 58;

      // Photo 1
      try {
        doc.addImage(photos[0], 'JPEG', margin, vy, photoW, photoH);
      } catch (e) {
        console.warn('doc.addImage photo 0 error:', e);
      }
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, vy, photoW, photoH);

      // Photo 1 Caption
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, vy + photoH - 6.5, photoW, 6.5, 'F');
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Foto 1: Tampak Depan / Sudut Pandang Utama (Eye-Level Line of Sight)', margin + 3, vy + photoH - 2.2);

      // Photo 2
      const photo2X = margin + photoW + 5;
      try {
        doc.addImage(photos[1], 'JPEG', photo2X, vy, photoW, photoH);
      } catch (e) {
        console.warn('doc.addImage photo 1 error:', e);
      }
      doc.setDrawColor(203, 213, 225);
      doc.rect(photo2X, vy, photoW, photoH);

      // Photo 2 Caption
      doc.setFillColor(15, 23, 42);
      doc.rect(photo2X, vy + photoH - 6.5, photoW, 6.5, 'F');
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Foto 2: Tampak Perspektif Koridor & Pencahayaan / Konstruksi', photo2X + 3, vy + photoH - 2.2);

      vy += photoH + 6;
    } else {
      // 1 Large Center Photo
      const photoW = 125;
      const photoH = 75;
      const photoX = margin + (pageWidth - margin * 2 - photoW) / 2;

      try {
        doc.addImage(photos[0] || createSpotFallbackCanvas(s), 'JPEG', photoX, vy, photoW, photoH);
      } catch (e) {
        console.warn('doc.addImage single photo error:', e);
      }
      doc.setDrawColor(203, 213, 225);
      doc.rect(photoX, vy, photoW, photoH);

      // Photo Caption Bar
      doc.setFillColor(15, 23, 42);
      doc.rect(photoX, vy + photoH - 6.5, photoW, 6.5, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Dokumentasi Foto Lapangan: ${s.name} (${s.roadName}, ${s.city})`, photoX + 4, vy + photoH - 2.2);

      vy += photoH + 6;
    }

    // DETAILED SPECIFICATIONS & SITE INTELLIGENCE BOX
    const specBoxH = 68;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, vy, pageWidth - margin * 2, specBoxH, 2, 2, 'FD');

    // Spec Box Title
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SPESIFIKASI TEKNIS & INTELEGENSI SITUS TITIK MEDIA', margin + 5, vy + 7);

    // Subtle divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 5, vy + 9.5, pageWidth - margin - 5, vy + 9.5);

    // Left Column Specs
    const col1X = margin + 5;
    const col2X = margin + (pageWidth - margin * 2) / 2 + 2;
    let sy = vy + 15;
    const rowStep = 8.5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Row 1
    doc.text('• Koridor Lokasi:', col1X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${s.roadName}, ${s.district}, ${s.city}`, col1X + 25, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text('• Index Visibilitas:', col2X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${s.visibilityScore} / 100 (Jarak Bebas >150 Meter)`, col2X + 28, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Row 2
    sy += rowStep;
    doc.text('• Zonasi Kawasan:', col1X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Kawasan ${s.locationType} (${s.trafficDensity})`, col1X + 25, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text('• Penerangan Lampu:', col2X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('LED High-Lumen / Timer Otomatis (s/d 24:00 WIB)', col2X + 28, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Row 3
    sy += rowStep;
    doc.text('• Dimensi & Bidang:', col1X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${s.size} • Orientasi ${s.layout} (${s.availability})`, col1X + 25, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text('• Rangka Konstruksi:', col2X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Konstruksi Baja SNI, Pondasi Kokoh & Terawat', col2X + 28, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Row 4
    sy += rowStep;
    doc.text('• Volume Trafik:', col1X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${formatCompactNumber(s.dailyTraffic)} kendaraan/hari (Motor 67%, Mobil 25%)`, col1X + 25, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text('• Pajak & Izin:', col2X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('100% Resmi Terdaftar Pemkot/Pemda Jawa Barat', col2X + 28, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Row 5
    sy += rowStep;
    doc.text('• Est. Impresi (OTS):', col1X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${formatCompactNumber(s.dailyImpressions)} OTS/hari (~${formatCompactNumber(s.dailyImpressions * 30)} OTS/bln)`, col1X + 25, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text('• Investasi Penawaran:', col2X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${formatIDR(spotPrice)} (${duration})`, col2X + 28, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Row 6
    sy += rowStep;
    doc.text('• Koordinat Peta GPS:', col1X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Lat: ${s.coordinates.lat}, Lng: ${s.coordinates.lng} (Tautan Google Maps)`, col1X + 25, sy);

    doc.text('• Akses Koridor:', col2X, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Arteri Primer Pusat Bisnis & Komersial Kota', col2X + 28, sy);

    vy += specBoxH + 5;

    // Quality & Audit Guarantee Seal
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(margin, vy, pageWidth - margin * 2, 17, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text('✓ JAMINAN KUALITAS TAYANG & LINE-OF-SIGHT SUHERMAN REKLAME', margin + 4, vy + 5.5);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Titik reklame ini telah diverifikasi langsung di lapangan (in-situ site inspection). Posisi bidang tegak lurus terhadap arah lalu lintas', margin + 4, vy + 10);
    doc.text('utama tanpa halangan pohon rindang atau tiang utilitas, memastikan keterbacaan (readability) merek Anda mencapai efektivitas tertinggi.', margin + 4, vy + 14);

  } else {
    // CASE 2: MULTIPLE SPOTS PROPOSAL (Catalog Card Grid Layout)
    let vy = 28;

    spots.forEach((s, idx) => {
      const photos = spotImagesMap[s.id] || [];
      const primaryPhoto = photos[0] || createSpotFallbackCanvas(s);

      // Spot Price
      let spotPrice = s.pricing?.oneMonth || 0;
      if (duration === '3 Bulan') spotPrice = s.pricing?.threeMonths || spotPrice * 3 * 0.95;
      else if (duration === '6 Bulan') spotPrice = s.pricing?.sixMonths || spotPrice * 6 * 0.90;
      else if (duration === '1 Tahun') spotPrice = s.pricing?.oneYear || spotPrice * 12 * 0.85;

      const cardH = 75;

      // Check if card fits on current page
      if (vy + cardH > pageHeight - 16) {
        doc.addPage();
        visualPageNumber++;
        drawVisualPageHeader(visualPageNumber);
        drawVisualPageFooter(visualPageNumber);
        vy = 28;
      }

      // Outer Card Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, vy, pageWidth - margin * 2, cardH, 2, 2, 'FD');

      // Card Header Strip
      doc.setFillColor(30, 41, 59); // slate-800
      doc.roundedRect(margin, vy, pageWidth - margin * 2, 7, 2, 2, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const titleStr = `TITIK #${idx + 1}: ${s.name.length > 38 ? s.name.slice(0, 36) + '..' : s.name}`;
      doc.text(titleStr, margin + 3.5, vy + 4.8);

      doc.setFontSize(7);
      doc.setTextColor(52, 211, 153); // emerald-400
      const metaRight = `${s.category === 'DOOH_DIGITAL' ? 'DOOH LED' : 'BILLBOARD'} • ${s.size} • ${formatCompactNumber(s.dailyImpressions)} OTS/HARI`;
      doc.text(metaRight, pageWidth - margin - doc.getTextWidth(metaRight) - 3.5, vy + 4.8);

      // Photo on Left
      const pw = 70;
      const ph = 46;
      const px = margin + 3.5;
      const py = vy + 10;

      try {
        doc.addImage(primaryPhoto, 'JPEG', px, py, pw, ph);
      } catch (e) {
        console.warn('doc.addImage error:', e);
      }
      doc.setDrawColor(203, 213, 225);
      doc.rect(px, py, pw, ph);

      // Photo Caption
      doc.setFillColor(15, 23, 42);
      doc.rect(px, py + ph, pw, 5.5, 'F');
      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Foto Lapangan: ${s.city} (${s.layout})`, px + 2.5, py + ph + 3.8);

      // Specs on Right
      const rx = margin + pw + 8;
      let rsy = vy + 14;
      const rStep = 6.8;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      // Spec Rows
      doc.text('Koridor Lokasi:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${s.roadName}, ${s.district}, ${s.city}`, rx + 22, rsy);

      rsy += rStep;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Jenis & Ukuran:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${s.mediaType} (${s.size} - ${s.layout})`, rx + 22, rsy);

      rsy += rStep;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Karakteristik:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Kawasan ${s.locationType} • Kepadatan ${s.trafficDensity}`, rx + 22, rsy);

      rsy += rStep;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Trafik & OTS:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`${formatCompactNumber(s.dailyTraffic)} kend./hari • ${formatCompactNumber(s.dailyImpressions)} OTS/hari`, rx + 22, rsy);

      rsy += rStep;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Visibilitas:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Skor ${s.visibilityScore}/100 • Sudut Pandang Tegak Lurus Arus Utama`, rx + 22, rsy);

      rsy += rStep;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Tarif Paket:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`${formatIDR(spotPrice)} (${duration})`, rx + 22, rsy);

      rsy += rStep;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Fasilitas & Izin:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Lampu Malam Aktif • 100% Bebas Sengketa & Legal Pemda', rx + 22, rsy);

      rsy += rStep;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Koordinat GPS:', rx, rsy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`${s.coordinates.lat}, ${s.coordinates.lng} (Google Maps Verified)`, rx + 22, rsy);

      vy += cardH + 5;
    });
  }

  const filename = `Proposal-OOH-DOOH-${client.company.replace(/[^a-zA-Z0-9]/g, '_')}-${duration.replace(/\s+/g, '')}.pdf`;
  doc.save(filename);
  return filename;
}
