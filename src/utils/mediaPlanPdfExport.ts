import jsPDF from 'jspdf';
import { MediaPlanPackage } from '../services/strategicMediaPlannerService';
import { formatIDR, formatCompactNumber } from './formatters';
import { getAllSpotImages, loadImageAsBase64, createSpotFallbackCanvas } from './imageUtils';

export async function exportStrategicMediaPlanPDF(
  plan: MediaPlanPackage,
  clientName: string = 'Klien Eksekutif',
  clientCompany: string = 'Perusahaan Mitra'
): Promise<string> {
  // Preload all spot photos concurrently
  const spotImagesMap: Record<string, string[]> = {};
  await Promise.all(
    plan.spots.map(async (item) => {
      const spot = item.spot;
      const urls = getAllSpotImages(spot);
      const loaded: string[] = [];
      const imagesToLoad = urls.slice(0, 1);
      const loadedDataUrls = await Promise.all(
        imagesToLoad.map((u) => loadImageAsBase64(u, 3000))
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

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('STRATEGIC MEDIA PLAN & BUDGET ALLOCATION REPORT', margin, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SUHERMAN REKLAME • AUTOMATED AI KNAPSACK MEDIA OPTIMIZER', margin, 18);
  doc.text(
    `Dokumen ID: PLAN-${Date.now().toString().slice(-6)} | Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} | Durasi: ${plan.durationLabel}`,
    margin,
    24
  );

  // Client & Budget Pagu Box
  let y = 37;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TARGET KLIEN & PLAFON ANGGARAN (BUDGET CEILING):', margin + 4, y + 5);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${clientName} (${clientCompany})`, margin + 4, y + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Plafon Budget: ${formatIDR(plan.budgetLimit)} | Biaya Terpakai: ${formatIDR(plan.totalCost)} (${plan.budgetUtilizationPercent}%) | Sisa Saldo: ${formatIDR(plan.remainingBudget)}`,
    margin + 4,
    y + 17
  );

  // 4 Executive KPI Cards
  y += 26;
  const colW = (pageWidth - margin * 2 - 9) / 4;

  const kpis = [
    { title: 'Total Titik Terpilih', value: `${plan.spots.length} Titik`, note: 'Kombinasi Optimal' },
    { title: 'Total Impresi (OTS)', value: `${formatCompactNumber(plan.totalImpressionsOTS)} Views`, note: `Periode ${plan.durationLabel}` },
    { title: 'Blended CPM', value: `${formatIDR(plan.blendedCpm)}`, note: 'Ongkos per 1K Views' },
    { title: 'Visibilitas Rata-rata', value: `${plan.averageVisibilityScore}/100`, note: 'Skor Angle & Dwell' }
  ];

  kpis.forEach((kpi, i) => {
    const x = margin + i * (colW + 3);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, colW, 20, 1.5, 1.5, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 3, y + 5);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, y + 11.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.note, x + 3, y + 16.5);
  });

  // Strategy Narrative Box
  y += 24;
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text(`STRATEGI: ${plan.goalTitle.toUpperCase()}`, margin + 4, y + 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const narrativeLines = doc.splitTextToSize(plan.executiveAssessment, pageWidth - margin * 2 - 8);
  doc.text(narrativeLines.slice(0, 3), margin + 4, y + 10);

  // Table of Selected Spots
  y += 26;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DAFTAR REKOMENDASI TITIK MEDIA TERPILIH', margin, y);

  y += 4;
  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NO', margin + 2, y + 4.8);
  doc.text('NAMA TITIK & KORIDOR LOKASI', margin + 12, y + 4.8);
  doc.text('KATEGORI', margin + 85, y + 4.8);
  doc.text('TARIF PERIODE', margin + 115, y + 4.8);
  doc.text('IMPRESI OTS', margin + 145, y + 4.8);
  doc.text('PERAN STRATEGIS', margin + 167, y + 4.8);

  y += 7;

  plan.spots.forEach((item, index) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 15;
    }

    const rowBg = index % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, pageWidth - margin * 2, 9.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 9.5, pageWidth - margin, y + 9.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${index + 1}`, margin + 2, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const spotName = item.spot.name.length > 38 ? item.spot.name.slice(0, 36) + '...' : item.spot.name;
    doc.text(spotName, margin + 12, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`${item.spot.roadName}, ${item.spot.city} (${item.spot.locationType})`, margin + 12, y + 7.5);

    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.spot.mediaType.slice(0, 16), margin + 85, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.text(formatIDR(item.costForDuration), margin + 115, y + 5.5);

    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`${formatCompactNumber(item.periodImpressions)} OTS`, margin + 145, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(79, 70, 229); // indigo
    const roleText = item.strategicRole.length > 20 ? item.strategicRole.slice(0, 19) + '..' : item.strategicRole;
    doc.text(roleText, margin + 167, y + 5.5);

    y += 9.5;
  });

  // Footer on Page 1
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Halaman 1 • Dokumen Resmi Strategic Media Plan — Suherman Reklame Jawa Barat', margin, pageHeight - 8);
  doc.text(`Budget Terpakai: ${plan.budgetUtilizationPercent}% | Total: ${formatIDR(plan.totalCost)}`, pageWidth - margin - 65, pageHeight - 8);

  // ==========================================
  // PAGE 2+: LAMPIRAN FOTO DOKUMENTASI TITIK
  // ==========================================
  doc.addPage();

  const drawMediaPlanVisualHeader = (pageNum: number) => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('LAMPIRAN: DOKUMENTASI FOTO TITIK MEDIA TERPILIH', margin, 10);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('BUKTI FOTO LAPANGAN, SUDUT PANDANG VISUAL & KONSTRUKSI', margin, 15.5);

    doc.setFontSize(7);
    doc.setTextColor(52, 211, 153);
    doc.setFont('helvetica', 'bold');
    doc.text(`Klien: ${clientCompany} | Total: ${plan.spots.length} Titik`, pageWidth - margin - 50, 15.5);
  };

  let planVisualPage = 2;
  drawMediaPlanVisualHeader(planVisualPage);

  let vy = 28;
  plan.spots.forEach((item, idx) => {
    const s = item.spot;
    const photo = (spotImagesMap[s.id] && spotImagesMap[s.id][0]) || createSpotFallbackCanvas(s);
    const cardH = 68;

    if (vy + cardH > pageHeight - 16) {
      doc.addPage();
      planVisualPage++;
      drawMediaPlanVisualHeader(planVisualPage);
      vy = 28;
    }

    // Card Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, vy, pageWidth - margin * 2, cardH, 2, 2, 'FD');

    // Header strip
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, vy, pageWidth - margin * 2, 6.5, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`#${idx + 1}: ${s.name}`, margin + 3, vy + 4.5);

    doc.setFontSize(6.8);
    doc.setTextColor(52, 211, 153);
    doc.text(`${s.mediaType} • ${s.size} • ${item.strategicRole}`, pageWidth - margin - 60, vy + 4.5);

    // Photo
    const pw = 65;
    const ph = 42;
    const px = margin + 3.5;
    const py = vy + 9;
    try {
      doc.addImage(photo, 'JPEG', px, py, pw, ph);
    } catch (e) {
      console.warn('Media plan photo addImage error:', e);
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(px, py, pw, ph);

    // Caption
    doc.setFillColor(15, 23, 42);
    doc.rect(px, py + ph, pw, 5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Foto: ${s.roadName}, ${s.city}`, px + 2, py + ph + 3.5);

    // Right Specs
    const rx = margin + pw + 8;
    let rsy = vy + 13;
    const step = 6.2;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    doc.text('Koridor Lokasi:', rx, rsy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${s.roadName}, ${s.city}`, rx + 22, rsy);

    rsy += step;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Zonasi & Orientasi:', rx, rsy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Kawasan ${s.locationType} • ${s.layout}`, rx + 22, rsy);

    rsy += step;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Est. Impresi Periode:', rx, rsy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${formatCompactNumber(item.periodImpressions)} OTS (${formatCompactNumber(s.dailyImpressions)} OTS/hari)`, rx + 22, rsy);

    rsy += step;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Alokasi Anggaran:', rx, rsy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${formatIDR(item.costForDuration)} (${plan.durationLabel})`, rx + 22, rsy);

    rsy += step;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Peran Strategis:', rx, rsy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(item.strategicRole, rx + 22, rsy);

    rsy += step;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Keterangan & Izin:', rx, rsy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Lampu Malam Aktif • Garansi Izin & Pajak Pemda 100%', rx + 22, rsy);

    vy += cardH + 4;
  });

  const filename = `Strategic_Media_Plan_${plan.goal.toLowerCase()}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}
