import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from './formatters';

export interface GeneratePdfReportOptions {
  spots: MediaSpot[];
  activeRegion: string;
  totalDailyTraffic: number;
  totalDailyImpressions: number;
  occupancyRate: number;
  totalMonthlyInventory: number;
  clientName?: string;
}

/**
 * Generates an executive, formal PDF proposal and performance report
 * using the jspdf library and html2canvas for rich visual chart snapshots.
 */
export async function generateAnalyticsPdfReport({
  spots,
  activeRegion,
  totalDailyTraffic,
  totalDailyImpressions,
  occupancyRate,
  totalMonthlyInventory,
  clientName = 'Klien Rekanan / Agensi'
}: GeneratePdfReportOptions): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // ==========================================
  // PAGE 1: EXECUTIVE SUMMARY & PROPOSAL COVER
  // ==========================================

  // Emerald Top Brand Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFillColor(5, 150, 105); // emerald-600 accent line
  doc.rect(0, 42, pageWidth, 3, 'F');

  // Brand Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('OOH & DOOH JABAR ANALYTICS', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(167, 243, 208); // emerald-200
  doc.text('Strategic Media Intelligence & Proposal Eksekutif — Suherman Reklame', margin, 26);

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Wilayah Target: ${activeRegion}  |  Tanggal Terbit: ${todayStr}`, margin, 34);

  // Proposal Meta Details Right Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL PROPOSAL', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Ditujukan: ${clientName}`, pageWidth - margin, 26, { align: 'right' });
  doc.text('Ref: PROP-OOH-JABAR', pageWidth - margin, 34, { align: 'right' });

  let currentY = 56;

  // Section Header: Ringkasan Eksekutif
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Ringkasan Eksekutif & Potensi Jangkauan Media', margin, currentY);

  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // 4 Key Metric KPI Cards (Box Grid)
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 22;

  const kpis = [
    { label: 'TRAFFIC HARIAN', value: `${formatCompactNumber(totalDailyTraffic)}`, sub: 'Kendaraan/Hari', color: [37, 99, 235] },
    { label: 'POTENSI BULANAN', value: `${formatCompactNumber(totalDailyImpressions * 30)}`, sub: 'OTS Views/Bln', color: [217, 119, 6] },
    { label: 'OCCUPANCY RATE', value: `${occupancyRate}%`, sub: `${spots.filter(s => !s.isAvailable).length}/${spots.length} Tersewa`, color: [16, 185, 129] },
    { label: 'NILAI PORTOFOLIO', value: `${formatCompactNumber(totalMonthlyInventory)}`, sub: 'Tarif Rata-Rata/Bln', color: [147, 51, 234] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3);
    // Background card box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Colored top tag
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, currentY, cardWidth, 1.5, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, currentY + 6);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, currentY + 13);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.sub, x + 3, currentY + 18.5);
  });

  currentY += cardHeight + 10;

  // Capture Chart Snapshot: Hourly Traffic & Impressions or Timeline
  const chartEl = document.getElementById('chart-card-hourly-traffic');
  if (chartEl) {
    try {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Pola Arus Komuter & Paparan Impresi 24 Jam', margin, currentY);
      currentY += 4;

      const canvas = await html2canvas(chartEl, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const chartImgHeight = Math.min(68, (canvas.height * contentWidth) / canvas.width);
      doc.addImage(imgData, 'JPEG', margin, currentY, contentWidth, chartImgHeight);
      currentY += chartImgHeight + 10;
    } catch (err) {
      console.warn('Could not snapshot chart-card-hourly-traffic for PDF:', err);
    }
  }

  // Section: Top Recommended Media Spots for Client
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Daftar Rekomendasi Titik Strategis Prioritas (Top Leaderboard)', margin, currentY);

  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // Table Header
  const colX = {
    no: margin,
    name: margin + 8,
    city: margin + 70,
    type: margin + 98,
    traffic: margin + 128,
    price: margin + 155
  };

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('#', colX.no + 2, currentY + 4.8);
  doc.text('NAMA TITIK MEDIA', colX.name, currentY + 4.8);
  doc.text('KOTA / KAWASAN', colX.city, currentY + 4.8);
  doc.text('TIPE & UKURAN', colX.type, currentY + 4.8);
  doc.text('OTS VIEWS / HR', colX.traffic, currentY + 4.8);
  doc.text('TARIF ESTIMASI', colX.price, currentY + 4.8);

  currentY += 8;

  // Sorted Top 6 Spots
  const topSpots = [...spots].sort((a, b) => b.dailyImpressions - a.dailyImpressions).slice(0, 6);

  topSpots.forEach((spot, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY - 1, contentWidth, 8, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}`, colX.no + 2, currentY + 4.5);

    // Truncate name cleanly if too long
    const cleanName = spot.name.length > 34 ? spot.name.slice(0, 32) + '...' : spot.name;
    doc.text(cleanName, colX.name, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`${spot.city}`, colX.city, currentY + 4.5);

    const typeStr = spot.category === 'DOOH_DIGITAL' ? `DOOH (${spot.size})` : `Static (${spot.size})`;
    doc.text(typeStr, colX.type, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`${formatCompactNumber(spot.dailyImpressions)}`, colX.traffic, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${formatIDR(spot.pricing.oneMonth)}/bln`, colX.price, currentY + 4.5);

    currentY += 8.5;
  });

  // ==========================================
  // FOOTER BANNER FOR PAGE 1
  // ==========================================
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen proposal resmi diterbitkan secara otomatis oleh OOH & DOOH Jabar Analytics Platform.', margin, footerY + 5);
  doc.text('Hubungi Suherman Reklame via WhatsApp (+62 878-2287-2178) untuk pemesanan & ketersediaan slot tayang.', margin, footerY + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Halaman 1 dari 1', pageWidth - margin, footerY + 7, { align: 'right' });

  // Save generated PDF file with timestamped name
  const now = new Date();
  const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const sanitizedRegion = activeRegion.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  const filename = `Proposal-Resmi-OOH-Jabar-${sanitizedRegion}_${dateStamp}.pdf`;

  doc.save(filename);
  return filename;
}

/**
 * Generates the monthly report PDF for MonthlyReportModal using jsPDF
 */
export function generateMonthlyPDFReport(spots: MediaSpot[], period: string): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 36, pageWidth, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN BULANAN KINERJA MEDIA OOH & DOOH', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 243, 208);
  doc.text(`Periode: ${period}  |  Suherman Reklame Bandung & Jawa Barat`, margin, 26);

  const totalDailyTraffic = spots.reduce((acc, s) => acc + s.dailyTraffic, 0);
  const totalDailyImpressions = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
  const totalMonthlyPortfolio = spots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);
  const availableCount = spots.filter(s => s.isAvailable).length;

  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Ringkasan Metrik Akumulatif', margin, y);

  y += 6;
  // KPI summary grid
  const boxW = contentWidth / 4 - 3;
  const metrics = [
    { label: 'TOTAL TITIK', val: `${spots.length}`, sub: `${availableCount} Tersedia` },
    { label: 'TRAFFIC HARIAN', val: formatCompactNumber(totalDailyTraffic), sub: 'Kendaraan/Hari' },
    { label: 'IMPRESI BULANAN', val: formatCompactNumber(totalDailyImpressions * 30), sub: 'OTS Views' },
    { label: 'NILAI INVENTARIS', val: formatCompactNumber(totalMonthlyPortfolio), sub: 'Tarif/Bln' }
  ];

  metrics.forEach((m, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, boxW, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, y + 5.5);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, x + 3, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(5, 150, 105);
    doc.text(m.sub, x + 3, y + 17);
  });

  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Daftar Inventaris Titik Media Terdaftar', margin, y);

  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('#', margin + 2, y + 4.8);
  doc.text('NAMA TITIK MEDIA', margin + 8, y + 4.8);
  doc.text('KOTA', margin + 70, y + 4.8);
  doc.text('UKURAN / TIPE', margin + 100, y + 4.8);
  doc.text('IMPRESI/HR', margin + 135, y + 4.8);
  doc.text('TARIF 1 BLN', margin + 160, y + 4.8);

  y += 8;

  spots.slice(0, 18).forEach((spot, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 1, contentWidth, 7, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}`, margin + 2, y + 4);
    doc.text(spot.name.slice(0, 32), margin + 8, y + 4);
    doc.text(spot.city, margin + 70, y + 4);
    doc.text(spot.size, margin + 100, y + 4);
    doc.text(formatCompactNumber(spot.dailyImpressions), margin + 135, y + 4);
    doc.text(formatIDR(spot.pricing.oneMonth), margin + 160, y + 4);
    y += 7.5;
  });

  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Dicetak pada ${new Date().toLocaleDateString('id-ID')} — OOH & DOOH Jabar Analytics`, margin, footerY + 5);

  const filename = `Laporan-Bulanan-OOH-Jabar-${period.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
  return filename;
}
