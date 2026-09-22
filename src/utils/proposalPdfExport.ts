import jsPDF from 'jspdf';
import { MediaSpot, ClientContact, ProposalDuration } from '../types/ooh';
import { formatIDR, formatCompactNumber } from './formatters';
import { UnifiedProposalAnalytics } from './audienceDemographics';

export function generateExecutiveProposalPDF(
  client: ClientContact,
  spots: MediaSpot[],
  analytics: UnifiedProposalAnalytics,
  duration: ProposalDuration = '1 Bulan',
  customNote?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // PAGE 1: EXECUTIVE COVER & AUDIENCE INTELLIGENCE
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
  doc.text(`Ref: PROP-OOH-${Date.now().toString().slice(-6)} | Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} | Durasi: ${duration}`, margin, 24);

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
    if (y > pageHeight - 35) {
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
  y += 12;
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 15;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('KETENTUAN ALL-IN & JAMINAN SUHERMAN REKLAME:', margin + 4, y + 5.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('1. 100% Pajak Reklame Resmi & Perizinan Penyelenggaraan Reklame Pemkot/Pemda Jawa Barat Terjamin.', margin + 4, y + 10.5);
  doc.text('2. Penerangan lampu malam hari / operasional LED high-refresh rate dengan proteksi kelistrikan aman.', margin + 4, y + 15);
  doc.text('3. Laporan foto dokumentasi berkala (Day & Night View) untuk akuntabilitas tayang kampanye.', margin + 4, y + 19.5);

  if (customNote) {
    y += 28;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`Catatan Khusus Sales: ${customNote}`, margin, y);
  }

  const filename = `Proposal-OOH-DOOH-${client.company.replace(/[^a-zA-Z0-9]/g, '_')}-${duration.replace(/\s+/g, '')}.pdf`;
  doc.save(filename);
  return filename;
}
