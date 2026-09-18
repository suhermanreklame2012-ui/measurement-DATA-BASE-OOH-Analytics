import jsPDF from 'jspdf';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber } from './formatters';
import { TECHNICAL_NOTES } from '../data/spotsData';

export function generateMonthlyPDFReport(spots: MediaSpot[], monthName: string = 'September 2026') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN PENGUKURAN MEDIA OOH & DOOH', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Wilayah: Kota Bandung & Jawa Barat | Periode Laporan: ${monthName}`, margin, 18);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Status: Resmi Terverifikasi`, margin, 23);

  // Executive Summary Metrics
  const totalSpots = spots.length;
  const availableSpots = spots.filter(s => s.isAvailable).length;
  const soldOutSpots = totalSpots - availableSpots;
  const occupancyRate = totalSpots > 0 ? Math.round((soldOutSpots / totalSpots) * 100) : 0;
  const totalDailyTraffic = spots.reduce((sum, s) => sum + s.dailyTraffic, 0);
  const totalDailyImpressions = spots.reduce((sum, s) => sum + s.dailyImpressions, 0);
  const totalMonthlyImpressions = totalDailyImpressions * 30;
  const totalMonthlyValue = spots.reduce((sum, s) => sum + s.pricing.oneMonth, 0);

  let y = 35;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RINGKASAN EKSEKUTIF INVENTARIS & IMPRESI', margin, y);

  y += 5;
  // Draw 4 Metric Cards
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const metrics = [
    { label: 'Total Titik Media', val: `${totalSpots} Titik`, sub: `${availableSpots} Tersedia (${100 - occupancyRate}%)` },
    { label: 'Occupancy Rate', val: `${occupancyRate}%`, sub: `${soldOutSpots} Tersewa / Kontrak` },
    { label: 'Est. Impresi / Bulan', val: `${formatCompactNumber(totalMonthlyImpressions)} OTS`, sub: `${formatCompactNumber(totalDailyTraffic)} Kendaraan/hari` },
    { label: 'Nilai Portofolio (1 Bln)', val: formatCompactNumber(totalMonthlyValue), sub: 'Gross inventory per mo' }
  ];

  metrics.forEach((m, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, y, cardWidth, 20, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, cardX + 3, y + 5);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, cardX + 3, y + 12);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(m.sub, cardX + 3, y + 17);
  });

  y += 26;

  // Regional Breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. DISTRIBUSI WILAYAH JAWA BARAT', margin, y);

  y += 4;
  const cityGroups: Record<string, { total: number; available: number; traffic: number }> = {};
  spots.forEach(s => {
    if (!cityGroups[s.city]) cityGroups[s.city] = { total: 0, available: 0, traffic: 0 };
    cityGroups[s.city].total += 1;
    if (s.isAvailable) cityGroups[s.city].available += 1;
    cityGroups[s.city].traffic += s.dailyTraffic;
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  let cityTextArr: string[] = [];
  Object.entries(cityGroups).forEach(([city, stats]) => {
    cityTextArr.push(`${city}: ${stats.total} titik (${stats.available} avail, traffic ${formatCompactNumber(stats.traffic)}/hr)`);
  });

  const citySummaryStr = cityTextArr.join('  •  ');
  const splitSummary = doc.splitTextToSize(citySummaryStr, pageWidth - margin * 2);
  doc.text(splitSummary, margin, y + 3);

  y += splitSummary.length * 4.5 + 6;

  // Top 10 Media Spots Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. DAFTAR TITIK MEDIA UNGGULAN (TOP SPOTS & HARGA)', margin, y);

  y += 5;
  // Table Headers
  const colWidths = [8, 48, 25, 26, 22, 26, 25];
  const tableHeaders = ['No', 'Lokasi & Jalan', 'Wilayah', 'Jenis Media', 'Ukuran', 'Tarif 1 Bln', 'Status'];
  
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  let curX = margin;
  tableHeaders.forEach((h, idx) => {
    doc.text(h, curX + 1.5, y + 4.2);
    curX += colWidths[idx];
  });

  y += 7;

  // Render Top 14 spots
  const sortedSpots = [...spots].sort((a, b) => b.dailyImpressions - a.dailyImpressions).slice(0, 14);

  sortedSpots.forEach((s, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    // alternate row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.2, pageWidth - margin * 2, 5.5, 'F');
    }

    let rx = margin;
    // No
    doc.text(String(idx + 1), rx + 1.5, y);
    rx += colWidths[0];

    // Lokasi (truncated)
    const shortName = s.name.length > 32 ? s.name.substring(0, 31) + '..' : s.name;
    doc.text(shortName, rx + 1.5, y);
    rx += colWidths[1];

    // Wilayah
    doc.text(`${s.city} (${s.district})`.substring(0, 18), rx + 1.5, y);
    rx += colWidths[2];

    // Jenis Media
    doc.text(s.mediaType.replace('Billboard', 'BB').replace('Frontlite', 'FL').replace('Backlite', 'BL'), rx + 1.5, y);
    rx += colWidths[3];

    // Ukuran
    doc.text(s.size, rx + 1.5, y);
    rx += colWidths[4];

    // Tarif 1 Bln
    doc.text(formatIDR(s.pricing.oneMonth), rx + 1.5, y);
    rx += colWidths[5];

    // Status
    if (s.isAvailable) {
      doc.setTextColor(22, 101, 52); // green-800
      doc.text('Tersedia', rx + 1.5, y);
    } else {
      doc.setTextColor(153, 27, 27); // red-800
      doc.text('Tersewa', rx + 1.5, y);
    }

    y += 5.5;
  });

  y += 4;

  // Technical Terms & Notes
  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. KETENTUAN TEKNIS & SYARAT PENAWARAN', margin, y);

  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  TECHNICAL_NOTES.forEach((note, idx) => {
    doc.text(`${idx + 1}. ${note}`, margin, y);
    y += 4.2;
  });

  // Footer on current page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen ini dibuat otomatis oleh Sistem Database Pengukuran OOH & DOOH Jawa Barat.', margin, pageHeight - 7);
  doc.text('Halaman 1 dari 1', pageWidth - margin - 20, pageHeight - 7);

  // Save PDF
  const filename = `Laporan_OOH_DOOH_Bandung_Jabar_${monthName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  return filename;
}
