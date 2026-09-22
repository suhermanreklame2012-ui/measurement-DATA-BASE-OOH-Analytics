import jsPDF from 'jspdf';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber } from './formatters';

export interface RoiSimulationData {
  spot: MediaSpot;
  months: number;
  days: number;
  totalCost: number;
  totalImpressions: number;
  industryName: string;
  industryCtr: number; // in percent, e.g. 0.15%
  postClickConversionRate: number; // in percent, e.g. 8%
  avgOrderValue: number;
  potentialEngagements: number;
  potentialConversions: number;
  projectedRevenue: number;
  netProfit: number;
  roiPercentage: number;
  cpa: number;
  cpm: number;
  breakEvenConversions: number;
  breakEvenCtrNeeded: number;
  clientName?: string;
  clientCompany?: string;
}

export function exportEstimatedRoiPDF(data: RoiSimulationData) {
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
  doc.text('ESTIMATED ROI & OOH CONVERSION REPORT', margin, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SUHERMAN REKLAME • OOH & DOOH MEDIA CONVERSION ANALYZER', margin, 18);
  doc.text(
    `Dokumen ID: ROI-${Date.now().toString().slice(-6)} | Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} | Industri: ${data.industryName}`,
    margin,
    24
  );

  let y = 38;

  // Top Section: Location & Campaign Summary
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 2, 2, 'FD');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Lokasi Terpilih: ${data.spot.name}`, margin + 4, y + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Kota/Area: ${data.spot.city} | Format: ${data.spot.mediaType} | Ukuran: ${data.spot.size}`, margin + 4, y + 12);
  doc.text(`Impresi Harian (OTS): ${data.spot.dailyImpressions.toLocaleString('id-ID')} tayangan/hari | Lalu Lintas: ${data.spot.dailyTraffic.toLocaleString('id-ID')} kendaraan/hari`, margin + 4, y + 17);
  doc.text(`Durasi Sewa: ${data.months} Bulan (${data.days} Hari) | Biaya Investasi Sewa: ${formatIDR(data.totalCost)}`, margin + 4, y + 22);

  // Client Info box
  const clientText = `Klien: ${data.clientName || 'Mitra Pengiklan'} | Perusahaan: ${data.clientCompany || 'Brand Partner'}`;
  doc.text(clientText, margin + 4, y + 28);
  doc.text(`Benchmark Industri: ${data.industryName} (Typical OOH CTR: ${data.industryCtr.toFixed(2)}%)`, margin + 4, y + 33);

  y += 44;

  // 4 Key Executive Performance Cards
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 22;

  // Card 1: Potential Conversions
  doc.setFillColor(245, 243, 255); // purple-50
  doc.setDrawColor(196, 181, 253);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(109, 40, 217);
  doc.text('POTENSI KONVERSI', margin + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(76, 29, 149);
  doc.text(`~${data.potentialConversions.toLocaleString('id-ID')}`, margin + 3, y + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(124, 58, 237);
  doc.text('Transaksi Pembeli', margin + 3, y + 18);

  // Card 2: Projected Revenue
  const c2x = margin + cardWidth + 3;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(c2x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('PROYEKSI OMZET', c2x + 3, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text(formatIDR(data.projectedRevenue), c2x + 3, y + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text(`Laba: ${formatIDR(data.netProfit)}`, c2x + 3, y + 18);

  // Card 3: Projected ROI %
  const c3x = c2x + cardWidth + 3;
  const isPosRoi = data.roiPercentage >= 0;
  doc.setFillColor(isPosRoi ? 236 : 255, isPosRoi ? 253 : 241, isPosRoi ? 245 : 242);
  doc.setDrawColor(isPosRoi ? 167 : 254, isPosRoi ? 243 : 202, isPosRoi ? 208 : 202);
  doc.roundedRect(c3x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPosRoi ? 4 : 185, isPosRoi ? 120 : 28, isPosRoi ? 87 : 28);
  doc.text('PROYEKSI ROI', c3x + 3, y + 5);
  doc.setFontSize(11);
  doc.text(`${isPosRoi ? '+' : ''}${data.roiPercentage.toFixed(1)}%`, c3x + 3, y + 13);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`AOV: ${formatIDR(data.avgOrderValue)}`, c3x + 3, y + 18);

  // Card 4: Cost Efficiency (CPM & CPA)
  const c4x = c3x + cardWidth + 3;
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(c4x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text('EFISIENSI BIAYA', c4x + 3, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`CPM: ${formatIDR(Math.round(data.cpm))}`, c4x + 3, y + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(59, 130, 246);
  doc.text(`CPA: ${formatIDR(Math.round(data.cpa))}`, c4x + 3, y + 18);

  y += 28;

  // Funnel Stage Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Tahapan Corong Konversi (OOH Conversion Funnel)', margin, y);

  y += 5;

  // Table Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TAHAP CORONG', margin + 3, y + 4.5);
  doc.text('DEFINISI & METRIK', margin + 50, y + 4.5);
  doc.text('FORMULA & RASIO', margin + 115, y + 4.5);
  doc.text('HASIL PROYEKSI', pageWidth - margin - 30, y + 4.5);

  y += 7;

  const funnelStages = [
    {
      stage: '1. Total Impresi (OTS)',
      desc: 'Akumulasi pasang mata yang terpapar iklan selama masa sewa',
      formula: `${data.spot.dailyImpressions.toLocaleString('id-ID')} × ${data.days} hari`,
      result: `${data.totalImpressions.toLocaleString('id-ID')} tayangan`
    },
    {
      stage: '2. Respon / Click-Through (CTR)',
      desc: `Aksi keterlibatan audiens (QR scan, web search, call) berdasar CTR OOH ${data.industryName}`,
      formula: `OTS × CTR (${data.industryCtr.toFixed(2)}%)`,
      result: `~${data.potentialEngagements.toLocaleString('id-ID')} interaksi`
    },
    {
      stage: '3. Konversi Transaksi / Pembeli',
      desc: 'Pelanggan yang melakukan pembelian / penutupan penjualan dari respon iklan',
      formula: `Interaksi × Konversi (${data.postClickConversionRate.toFixed(1)}%)`,
      result: `~${data.potentialConversions.toLocaleString('id-ID')} pembeli`
    },
    {
      stage: '4. Omzet Penjualan Bruto',
      desc: 'Total omzet pendapatan yang dihasilkan dari pembeli hasil kampanye reklame',
      formula: `Pembeli × AOV (${formatIDR(data.avgOrderValue)})`,
      result: formatIDR(data.projectedRevenue)
    },
    {
      stage: '5. Laba Bersih Setelah Biaya Media',
      desc: 'Keuntungan bersih pengiklan setelah dipotong seluruh biaya sewa reklame',
      formula: `Omzet - Biaya Sewa (${formatIDR(data.totalCost)})`,
      result: `${data.netProfit >= 0 ? '+' : ''}${formatIDR(data.netProfit)}`
    }
  ];

  funnelStages.forEach((item, index) => {
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(margin, y, pageWidth - margin * 2, 9.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 9.5, pageWidth - margin, y + 9.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.stage, margin + 3, y + 4);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.desc.slice(0, 55), margin + 3, y + 8);

    doc.setFontSize(7);
    doc.text(item.formula, margin + 50, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(item.result, pageWidth - margin - 30, y + 5.5);

    y += 9.5;
  });

  y += 6;

  // Break-even Analysis Box
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('ANALISIS TITIK IMPAS (BREAK-EVEN POINT / BEP)', margin + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(4, 120, 87);
  doc.text(
    `Untuk menutup 100% biaya investasi sewa reklame (${formatIDR(data.totalCost)}), bisnis Anda hanya membutuhkan:`,
    margin + 4,
    y + 11
  );
  doc.setFont('helvetica', 'bold');
  doc.text(
    `• ${data.breakEvenConversions.toLocaleString('id-ID')} Transaksi Pembelian (AOV: ${formatIDR(data.avgOrderValue)})`,
    margin + 4,
    y + 16
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Hanya mewakili ${(data.totalImpressions > 0 ? (data.breakEvenConversions / data.totalImpressions) * 100 : 0).toFixed(5)}% dari total ${data.totalImpressions.toLocaleString('id-ID')} pasang mata yang melihat reklame ini!`,
    margin + 80,
    y + 16
  );

  y += 28;

  // Sensitivity Scenarios Table
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Analisis Sensitivitas Skenario (Konservatif vs Realistis vs Optimis)', margin, y);

  y += 4;

  const scenarios = [
    {
      name: 'Konservatif (-30% CTR)',
      ctr: data.industryCtr * 0.7,
      conv: Math.round(data.potentialConversions * 0.7),
      rev: Math.round(data.projectedRevenue * 0.7),
      profit: Math.round(data.projectedRevenue * 0.7) - data.totalCost,
      roi: data.totalCost > 0 ? (((Math.round(data.projectedRevenue * 0.7) - data.totalCost) / data.totalCost) * 100) : 0
    },
    {
      name: 'Realistis (Benchmark Industri)',
      ctr: data.industryCtr,
      conv: data.potentialConversions,
      rev: data.projectedRevenue,
      profit: data.netProfit,
      roi: data.roiPercentage
    },
    {
      name: 'Optimis (+30% CTR / Promo Menarik)',
      ctr: data.industryCtr * 1.3,
      conv: Math.round(data.potentialConversions * 1.3),
      rev: Math.round(data.projectedRevenue * 1.3),
      profit: Math.round(data.projectedRevenue * 1.3) - data.totalCost,
      roi: data.totalCost > 0 ? (((Math.round(data.projectedRevenue * 1.3) - data.totalCost) / data.totalCost) * 100) : 0
    }
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SKENARIO', margin + 3, y + 4);
  doc.text('CTR EFEKTIF', margin + 55, y + 4);
  doc.text('EST. PEMBELI', margin + 85, y + 4);
  doc.text('EST. OMZET', margin + 115, y + 4);
  doc.text('LABA BERSIH', margin + 145, y + 4);
  doc.text('PROYEKSI ROI', pageWidth - margin - 22, y + 4);

  y += 6;

  scenarios.forEach((sc, idx) => {
    const isMid = idx === 1;
    doc.setFillColor(isMid ? 245 : 255, isMid ? 243 : 255, isMid ? 255 : 255);
    doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', isMid ? 'bold' : 'normal');
    doc.setTextColor(isMid ? 109 : 51, isMid ? 40 : 65, isMid ? 217 : 85);
    doc.text(sc.name, margin + 3, y + 4.5);
    doc.text(`${sc.ctr.toFixed(2)}%`, margin + 55, y + 4.5);
    doc.text(`~${sc.conv.toLocaleString('id-ID')}`, margin + 85, y + 4.5);
    doc.text(formatIDR(sc.rev), margin + 115, y + 4.5);
    doc.text(`${sc.profit >= 0 ? '+' : ''}${formatIDR(sc.profit)}`, margin + 145, y + 4.5);
    doc.text(`${sc.roi >= 0 ? '+' : ''}${sc.roi.toFixed(1)}%`, pageWidth - margin - 22, y + 4.5);

    y += 6.5;
  });

  // Footer notes & signatures
  const footerY = pageHeight - 26;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    '*Catatan: Model estimasi ROI disusun berdasarkan formulasi standar OTS (Opportunities to See) dan rata-rata rasio respon industri OOH/DOOH di Indonesia. Hasil nyata dapat dipengaruhi oleh kreativitas visual materi iklan, daya tarik promo, dan faktor musiman.',
    margin,
    footerY + 4,
    { maxWidth: pageWidth - margin * 2 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'PT. Suherman Reklame Bandung | Divisi Perencanaan Media & Analitika Spasial | Kontak: suherman.reklame2012@gmail.com',
    margin,
    footerY + 12
  );

  // Trigger browser download
  const fileName = `Laporan_Estimasi_ROI_${data.spot.name.replace(/[^a-zA-Z0-9]/g, '_')}_${data.industryName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}
