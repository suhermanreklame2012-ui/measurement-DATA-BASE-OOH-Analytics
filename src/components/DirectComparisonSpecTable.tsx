import React, { useState } from 'react';
import { 
  Building, 
  MapPin, 
  ExternalLink, 
  Eye, 
  X, 
  Plus, 
  Sparkles, 
  Award, 
  Copy, 
  CheckCircle2, 
  Printer, 
  Check, 
  ShieldCheck, 
  DollarSign, 
  Layers, 
  Compass, 
  Car, 
  Clock, 
  Calendar, 
  FileCheck, 
  TrendingUp, 
  Maximize2 
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { formatImageUrl } from '../utils/imageUtils';

interface DirectComparisonSpecTableProps {
  selectedSpots: MediaSpot[];
  benchmarks: {
    highestImpressionsId: string;
    lowestCpmId: string;
    lowestPriceId: string;
    highestVisibilityId: string;
    bestValueId: string;
    spotMetrics: Record<string, any>;
  };
  onSelectSpot: (spot: MediaSpot) => void;
  onOpenPicker: (slotIndex: number | null) => void;
  onRemoveSpot: (spotId: string) => void;
}

// Helper to extract dimensions (width, height, area in m²)
export const parseSpotDimensions = (sizeStr: string) => {
  if (!sizeStr) return { width: 0, height: 0, area: 0, formatted: '-' };
  const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*m?\s*[xX*]\s*(\d+(?:\.\d+)?)\s*m?/);
  if (match) {
    const width = parseFloat(match[1]);
    const height = parseFloat(match[2]);
    const area = Math.round(width * height * 10) / 10;
    return { width, height, area, formatted: `${width} m × ${height} m` };
  }
  return { width: 0, height: 0, area: 0, formatted: sizeStr };
};

export const DirectComparisonSpecTable: React.FC<DirectComparisonSpecTableProps> = ({
  selectedSpots,
  benchmarks,
  onSelectSpot,
  onOpenPicker,
  onRemoveSpot
}) => {
  const [copiedSpec, setCopiedSpec] = useState<boolean>(false);

  // Copy procurement technical specification sheet to clipboard in Markdown table format
  const handleCopySpecSheet = () => {
    if (selectedSpots.length < 2) return;

    const headers = ['Parameter Spesifikasi Teknis', ...selectedSpots.map((s) => `${s.name} (${s.id})`)];
    const rows = [
      ['Kategori Media', ...selectedSpots.map((s) => (s.category === 'DOOH_DIGITAL' ? 'DOOH Videotron' : 'OOH Statis'))],
      ['Format Media', ...selectedSpots.map((s) => s.mediaType)],
      ['Dimensi Fisik (P × L)', ...selectedSpots.map((s) => s.size)],
      ['Luas Bidang Efektif', ...selectedSpots.map((s) => `${parseSpotDimensions(s.size).area} m²`)],
      ['Orientasi Konstruksi', ...selectedSpots.map((s) => s.layout)],
      ['Sistem Pencahayaan', ...selectedSpots.map((s) => s.lighting || 'Standar Frontlite')],
      ['Kepadatan Lalu Lintas', ...selectedSpots.map((s) => s.trafficDensity)],
      ['Volume Kendaraan / Hari', ...selectedSpots.map((s) => `${s.dailyTraffic.toLocaleString('id-ID')} unit/hari`)],
      ['Estimasi Impresi Harian (OTS)', ...selectedSpots.map((s) => `${s.dailyImpressions.toLocaleString('id-ID')} OTS/hari`)],
      ['Potensi Impresi Bulanan', ...selectedSpots.map((s) => `${(s.dailyImpressions * 30).toLocaleString('id-ID')} OTS/bulan`)],
      ['Skor Visibilitas', ...selectedSpots.map((s) => `${s.visibilityScore}/100`)],
      ['Unit Price 1 Bulan (Dasar)', ...selectedSpots.map((s) => formatIDR(s.pricing.oneMonth))],
      ['Unit Price 3 Bulan (Kuartal)', ...selectedSpots.map((s) => formatIDR(s.pricing.threeMonths))],
      ['Unit Price 6 Bulan (Semester)', ...selectedSpots.map((s) => formatIDR(s.pricing.sixMonths))],
      ['Unit Price 1 Tahun (Tahunan)', ...selectedSpots.map((s) => formatIDR(s.pricing.oneYear))],
      ['Biaya Satuan Efektif / Hari', ...selectedSpots.map((s) => `${formatIDR(Math.round(s.pricing.oneMonth / 30))}/hari`)],
      ['Biaya Satuan per m² / Bulan', ...selectedSpots.map((s) => {
        const area = parseSpotDimensions(s.size).area;
        return area > 0 ? `${formatIDR(Math.round(s.pricing.oneMonth / area))}/m²` : '-';
      })],
      ['Efisiensi CPM Pengadaan', ...selectedSpots.map((s) => `${formatIDR(Math.round((s.pricing.oneMonth / (s.dailyImpressions * 30)) * 1000))}/1k views`)],
      ['Status Ketersediaan', ...selectedSpots.map((s) => (s.isAvailable ? 'Siap Pasang' : 'Tersewa'))],
      ['Lead Time Pemasangan', ...selectedSpots.map(() => '3 - 5 Hari Kerja')],
      ['Legalitas & Pajak Reklame', ...selectedSpots.map(() => 'Resmi Terdaftar Pemda (Termasuk Koordinasi)')]
    ];

    const markdown = [
      `# LEMBAR SPESIFIKASI TEKNIS PENGADAAN MEDIA OOH / DOOH`,
      `Tanggal Penerbitan: ${new Date().toLocaleDateString('id-ID')}`,
      `Jumlah Titik Terbanding: ${selectedSpots.length} Titik (Maksimal 3)`,
      '',
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...rows.map((r) => `| ${r.join(' | ')} |`),
      '',
      `*Dokumen ini diterbitkan oleh Suherman Reklame OOH Intelligence Platform untuk evaluasi pengadaan media luar ruang.*`
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(markdown);
      setCopiedSpec(true);
      setTimeout(() => setCopiedSpec(false), 2500);
    }
  };

  // Helper to trigger browser print dialog for procurement documentation
  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      id="direct-comparison-spec-sheet"
      data-testid="direct-comparison-spec-sheet" 
      className="space-y-4"
    >
      {/* Table Subheader & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              PROCUREMENT SPEC SHEET
            </span>
            <span className="text-xs text-slate-300">
              Perbandingan Berdampingan Hingga 3 Titik Media
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
            Lembar Spesifikasi Teknis & Evaluasi Pengadaan (Side-by-Side Sheet)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Membantu komite pengadaan, media buyer, dan brand manager mengevaluasi dimensi fisik, kepadatan lalu lintas, serta efisiensi unit pricing sebelum pemesanan kontrak.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopySpecSheet}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Salin tabel spesifikasi teknis format Markdown untuk memo internal pengadaan"
          >
            {copiedSpec ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Tersalin (Markdown)!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>Salin Spek Teknis</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Cetak atau simpan lembar spesifikasi teknis ini sebagai PDF resmi"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-200" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Side-by-Side Technical Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
        <table className="w-full text-left border-collapse min-w-[720px]">
          {/* Table Header: Spot Profiles */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              <th className="p-4 w-52 sm:w-60 text-xs font-black text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50/95 backdrop-blur-xs z-10 border-r border-slate-200">
                Spesifikasi Teknis
              </th>
              {selectedSpots.map((spot, idx) => {
                const photoUrl = spot.imageUrl || (spot.imageUrls && spot.imageUrls[0]);
                const isDooh = spot.category === 'DOOH_DIGITAL';
                const isBestValue = spot.id === benchmarks.bestValueId;
                const isHighestImp = spot.id === benchmarks.highestImpressionsId;
                const dimensions = parseSpotDimensions(spot.size);

                return (
                  <th 
                    key={spot.id} 
                    className={`p-4 text-left font-normal align-top border-r border-slate-100 last:border-r-0 relative transition-all ${
                      isBestValue 
                        ? 'bg-gradient-to-b from-emerald-50/80 via-emerald-50/30 to-transparent border-t-2 border-t-emerald-500' 
                        : ''
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Badge Rekomendasi Pengadaan */}
                      {isBestValue ? (
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-2 rounded-lg text-xs flex items-center justify-between shadow-2xs">
                          <span className="font-extrabold flex items-center gap-1 text-[10px] uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                            BEST VALUE PROCUREMENT
                          </span>
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded font-mono">
                            GRADE A+
                          </span>
                        </div>
                      ) : isHighestImp ? (
                        <div className="bg-slate-800 text-white p-2 rounded-lg text-xs flex items-center justify-between shadow-2xs">
                          <span className="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-300">
                            <Award className="w-3.5 h-3.5" />
                            MAX AUDIENCE REACH
                          </span>
                          <span className="text-[9px] bg-slate-700 text-slate-200 font-bold px-1.5 py-0.2 rounded font-mono">
                            PRIME
                          </span>
                        </div>
                      ) : (
                        <div className="bg-slate-100 text-slate-600 p-2 rounded-lg text-xs flex items-center justify-between">
                          <span className="font-semibold text-[10px] uppercase tracking-wider">
                            PILIHAN PENGADAAN
                          </span>
                          <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded font-mono">
                            GRADE A
                          </span>
                        </div>
                      )}

                      {/* Photo Thumbnail */}
                      <div className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs">
                        {photoUrl ? (
                          <img
                            src={formatImageUrl(photoUrl)}
                            alt={spot.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-400 bg-slate-800">
                            <Building className="w-6 h-6 mb-1 text-slate-500" />
                            <span className="text-[10px] text-slate-400">Foto Titik</span>
                          </div>
                        )}

                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-xs text-[10px] font-bold text-white font-mono">
                            Slot #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isDooh ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {isDooh ? 'DOOH' : 'OOH STATIS'}
                          </span>
                        </div>

                        <div className="absolute bottom-2 right-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            spot.isAvailable ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {spot.isAvailable ? 'Siap Pasang' : 'Tersewa'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {spot.id}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenPicker(idx)}
                              className="text-[11px] text-emerald-600 hover:text-emerald-800 hover:underline font-medium cursor-pointer"
                            >
                              Ganti
                            </button>
                            {selectedSpots.length > 2 && (
                              <button
                                type="button"
                                onClick={() => onRemoveSpot(spot.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                title="Hapus dari perbandingan"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-1 line-clamp-2 leading-snug" title={spot.name}>
                          {spot.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {spot.city} • Kec. {spot.district}
                        </div>
                      </div>

                      {/* Detail CTA */}
                      <button
                        type="button"
                        onClick={() => onSelectSpot(spot)}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Detail Media</span>
                      </button>
                    </div>
                  </th>
                );
              })}

              {/* Slot 3 Placeholder when 2 spots selected */}
              {selectedSpots.length === 2 && (
                <th className="p-4 text-left font-normal align-middle w-56 bg-slate-50/40 border-dashed border-r border-slate-200">
                  <button
                    type="button"
                    onClick={() => onOpenPicker(null)}
                    className="w-full h-full min-h-[220px] border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center mb-2 transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      Tambah Titik ke-3
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Pilih titik ke-3 untuk komparasi 3 sisi berdampingan
                    </span>
                  </button>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body: Grouped Technical Specifications */}
          <tbody className="divide-y divide-slate-100 text-xs">

            {/* ======================================================== */}
            {/* GROUP A: SPESIFIKASI FISIK & DIMENSI (PHYSICAL DIMENSIONS) */}
            {/* ======================================================== */}
            <tr className="bg-emerald-50/80 font-bold text-emerald-950">
              <td colSpan={selectedSpots.length + (selectedSpots.length === 2 ? 2 : 1)} className="px-4 py-2.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Maximize2 className="w-4 h-4 text-emerald-700" />
                <span>1. Spesifikasi Fisik, Dimensi & Rekayasa Konstruksi</span>
              </td>
            </tr>

            {/* Dimensi Fisik (P x L) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Dimensi Fisik (Panjang × Lebar)</div>
                <div className="text-[10px] text-slate-400 font-normal">Ukuran bidang tayang iklan</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="text-sm font-black font-mono text-slate-900">
                    {spot.size}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Standar konstruksi reklame
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Luas Bidang Efektif (m²) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Luas Bidang Efektif (Area)</div>
                <div className="text-[10px] text-slate-400 font-normal">Total meter persegi bidang visual</div>
              </td>
              {selectedSpots.map((spot) => {
                const dims = parseSpotDimensions(spot.size);
                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <span className="text-sm font-extrabold font-mono text-emerald-700">
                      {dims.area} m²
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1">bidang tayang</span>
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Orientasi Konstruksi */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Orientasi Layout</div>
                <div className="text-[10px] text-slate-400 font-normal">Posisi vertikal atau horizontal</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    spot.layout === 'Horizontal'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-purple-50 text-purple-800 border border-purple-200'
                  }`}>
                    {spot.layout}
                  </span>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Tipe Konstruksi / Format Media */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Format & Tipe Konstruksi</div>
                <div className="text-[10px] text-slate-400 font-normal">Karakteristik struktur tiang & panel</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-bold text-slate-900">{spot.mediaType}</div>
                  <div className="text-[10px] text-slate-500">
                    {spot.category === 'DOOH_DIGITAL' ? 'Layar LED Digital Display' : 'Konstruksi Baja Statis'}
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Sistem Pencahayaan */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Sistem Pencahayaan (Lighting)</div>
                <div className="text-[10px] text-slate-400 font-normal">Visibilitas malam hari</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-semibold text-slate-800">
                    {spot.lighting || (spot.category === 'DOOH_DIGITAL' ? 'LED Digital RGB' : 'Standar Frontlite LED')}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {spot.category === 'DOOH_DIGITAL' ? 'Menyala Penuh 18-24 Jam' : 'Penerangan Otomatis 18:00 - 06:00'}
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Operasional DOOH / Display Slot */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Spesifikasi Slot Tayang</div>
                <div className="text-[10px] text-slate-400 font-normal">Durasi loop & rotasi penayangan</div>
              </td>
              {selectedSpots.map((spot) => {
                const isDooh = spot.category === 'DOOH_DIGITAL';
                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    {isDooh ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-purple-700">
                          {spot.loopDurationSec || 15} Detik / Slot
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          {spot.spotsPerDay || 540} Tayang / Hari
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-bold text-emerald-700">
                          Eksklusif 1 Muka Penuh
                        </div>
                        <div className="text-[10px] text-slate-600">
                          24 Jam Non-stop Static Display
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* ======================================================== */}
            {/* GROUP B: KEPADATAN LALU LINTAS & AUDIENS (TRAFFIC DENSITY) */}
            {/* ======================================================== */}
            <tr className="bg-blue-50/80 font-bold text-blue-950">
              <td colSpan={selectedSpots.length + (selectedSpots.length === 2 ? 2 : 1)} className="px-4 py-2.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-700" />
                <span>2. Kepadatan Lalu Lintas & Potensi Paparan Audiens</span>
              </td>
            </tr>

            {/* Tingkat Kepadatan Lalu Lintas */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Kepadatan Lalu Lintas (Traffic Density)</div>
                <div className="text-[10px] text-slate-400 font-normal">Tingkat kemacetan & dwell time mata</div>
              </td>
              {selectedSpots.map((spot) => {
                let badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                if (spot.trafficDensity === 'Sangat Padat') {
                  badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                } else if (spot.trafficDensity === 'Sedang') {
                  badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                } else if (spot.trafficDensity === 'Lancar') {
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                }

                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClass}`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {spot.trafficDensity}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {spot.trafficDensity === 'Sangat Padat' 
                        ? 'Dwell time tinggi (waktu pandang optimal)' 
                        : 'Arus dinamis lancar & kontinu'}
                    </div>
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Volume Kendaraan Harian (Daily Traffic) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Volume Traffic Kendaraan Harian</div>
                <div className="text-[10px] text-slate-400 font-normal">Motor, mobil & transportasi umum/hari</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="text-sm font-black font-mono text-blue-700">
                    {formatCompactNumber(spot.dailyTraffic)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {spot.dailyTraffic.toLocaleString('id-ID')} unit / hari
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Estimasi Impresi Harian (OTS) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Estimasi Kontak Harian (Daily OTS)</div>
                <div className="text-[10px] text-slate-400 font-normal">Opportunity to See harian terukur</div>
              </td>
              {selectedSpots.map((spot) => {
                const isWinner = spot.id === benchmarks.highestImpressionsId;
                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="text-sm font-black font-mono text-emerald-700">
                      {formatCompactNumber(spot.dailyImpressions)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {spot.dailyImpressions.toLocaleString('id-ID')} views / hari
                    </div>
                    {isWinner && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                          🏆 Paparan Tertinggi
                        </span>
                      </div>
                    )}
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Potensi Kontak Bulanan (Monthly OTS) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Potensi Kontak Bulanan (30 Hari)</div>
                <div className="text-[10px] text-slate-400 font-normal">Akumulasi OTS per bulan tayang</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-bold font-mono text-slate-900">
                    {formatCompactNumber(spot.dailyImpressions * 30)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {(spot.dailyImpressions * 30).toLocaleString('id-ID')} views / bln
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Karakteristik Koridor Lokasi */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Karakteristik Koridor / Zonasi</div>
                <div className="text-[10px] text-slate-400 font-normal">Profil demografi audiens sekitar</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    {spot.locationType}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Jl. {spot.roadName}
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Skor Visibilitas Jarak Pandang */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Skor Visibilitas Jarak Pandang</div>
                <div className="text-[10px] text-slate-400 font-normal">Evaluasi sudut pandang bebas rintangan</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 font-mono">{spot.visibilityScore}/100</span>
                    <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          spot.visibilityScore >= 90 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${spot.visibilityScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {spot.visibilityScore >= 90 ? 'Sangat Optimal (> 200m)' : 'Jarak Pandang Baik'}
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* ======================================================== */}
            {/* GROUP C: UNIT PRICING & STRUKTUR BIAYA PENGADAAN (PRICING) */}
            {/* ======================================================== */}
            <tr className="bg-amber-50/80 font-bold text-amber-950">
              <td colSpan={selectedSpots.length + (selectedSpots.length === 2 ? 2 : 1)} className="px-4 py-2.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-700" />
                <span>3. Struktur Harga Satuan Pengadaan (Unit Pricing Tiers)</span>
              </td>
            </tr>

            {/* Unit Price 1 Bulan (Harga Satuan Dasar) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Unit Price: 1 Bulan (Dasar)</div>
                <div className="text-[10px] text-slate-400 font-normal">Tarif sewa satuan durasi minimum</div>
              </td>
              {selectedSpots.map((spot) => {
                const isLowestPrice = spot.id === benchmarks.lowestPriceId;
                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="text-sm font-black font-mono text-slate-900">
                      {formatIDR(spot.pricing.oneMonth)}
                    </div>
                    <div className="text-[10px] text-slate-500">per 1 bulan tayang</div>
                    {isLowestPrice && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.2 rounded">
                        ✓ Tarif Termurah
                      </span>
                    )}
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Unit Price 3 Bulan (Paket Kuartal) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Unit Price: 3 Bulan (Kuartal)</div>
                <div className="text-[10px] text-slate-400 font-normal">Paket kampanye 1 kuartal</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-bold font-mono text-slate-900">
                    {formatIDR(spot.pricing.threeMonths)}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold">
                    ≈ {formatIDR(Math.round(spot.pricing.threeMonths / 3))}/bln
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Unit Price 6 Bulan (Paket Semester) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Unit Price: 6 Bulan (Semester)</div>
                <div className="text-[10px] text-slate-400 font-normal">Paket kampanye semesteran</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-bold font-mono text-slate-900">
                    {formatIDR(spot.pricing.sixMonths)}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold">
                    ≈ {formatIDR(Math.round(spot.pricing.sixMonths / 6))}/bln
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Unit Price 1 Tahun (Kontrak Tahunan) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Unit Price: 1 Tahun (Tahunan)</div>
                <div className="text-[10px] text-slate-400 font-normal">Kontrak tahunan branding dominan</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-bold font-mono text-slate-900">
                    {formatIDR(spot.pricing.oneYear)}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold">
                    ≈ {formatIDR(Math.round(spot.pricing.oneYear / 12))}/bln (Hemat Maksimal)
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Biaya Satuan Efektif per Hari (Daily Unit Rate) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Biaya Satuan Efektif / Hari</div>
                <div className="text-[10px] text-slate-400 font-normal">Rasio tarif sewa bulanan / 30 hari</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-mono font-bold text-slate-800">
                    {formatIDR(Math.round(spot.pricing.oneMonth / 30))}
                  </div>
                  <div className="text-[10px] text-slate-400">/ hari tayang</div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Biaya Satuan per Meter Persegi (Price / m² / Bulan) */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Biaya Satuan per m² / Bulan</div>
                <div className="text-[10px] text-slate-400 font-normal">Efisiensi harga per meter persegi konstruksi</div>
              </td>
              {selectedSpots.map((spot) => {
                const dims = parseSpotDimensions(spot.size);
                const pricePerM2 = dims.area > 0 ? Math.round(spot.pricing.oneMonth / dims.area) : 0;
                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-mono font-bold text-purple-700">
                      {pricePerM2 > 0 ? formatIDR(pricePerM2) : '-'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      per m² luas / bulan
                    </div>
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Efisiensi CPM Pengadaan (Cost Per 1,000 OTS) */}
            <tr className="hover:bg-slate-50/80 transition-colors bg-amber-50/30">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Efisiensi Biaya per 1.000 Kontak (CPM)
                </div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Biaya riil pengadaan per seribu paparan mata
                </div>
              </td>
              {selectedSpots.map((spot) => {
                const monthlyImpressions = spot.dailyImpressions * 30;
                const cpm = Math.round((spot.pricing.oneMonth / (monthlyImpressions || 1)) * 1000);
                const isBestCpm = spot.id === benchmarks.lowestCpmId;
                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="text-sm font-black font-mono text-slate-900">
                      {formatIDR(cpm)}
                    </div>
                    <div className="text-[10px] text-slate-500">per 1.000 OTS</div>
                    {isBestCpm && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                        ★ CPM Paling Hemat
                      </span>
                    )}
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* ======================================================== */}
            {/* GROUP D: KELAYAKAN LOGISTIK & EVALUASI PENGADAAN */}
            {/* ======================================================== */}
            <tr className="bg-slate-100 font-bold text-slate-800">
              <td colSpan={selectedSpots.length + (selectedSpots.length === 2 ? 2 : 1)} className="px-4 py-2.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <span>4. Kelayakan Legalitas, Logistik & Evaluasi Pengadaan</span>
              </td>
            </tr>

            {/* Status Ketersediaan */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Status Ketersediaan Pengadaan</div>
                <div className="text-[10px] text-slate-400 font-normal">Kesiapan slot tayang saat ini</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                    spot.isAvailable 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {spot.isAvailable ? 'Siap Pasang Langsung' : 'Sedang Tersewa'}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {spot.availability}
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Lead Time Produksi & Naik Tayang */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Lead Time Pemasangan</div>
                <div className="text-[10px] text-slate-400 font-normal">Waktu pengerjaan hingga live display</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-bold text-slate-900">
                    {spot.category === 'DOOH_DIGITAL' ? '1 - 2 Hari Kerja' : '3 - 5 Hari Kerja'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {spot.category === 'DOOH_DIGITAL' ? 'Unggah materi digital CMS cepat' : 'Cetak vinyl frontlite & instalasi fisik'}
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Legalitas & Pajak Reklame */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Legalitas & Pajak Reklame (NSR)</div>
                <div className="text-[10px] text-slate-400 font-normal">Kepatuhan regulasi Pemda Jawa Barat</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Resmi & Bebas Sengketa</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Termasuk izin koordinasi Bapenda / Dishub setempat
                  </div>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Koordinat GPS & Peta */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-slate-900">Koordinat Presisi GPS</div>
                <div className="text-[10px] text-slate-400 font-normal">Tautan verifikasi lapangan langsung</div>
              </td>
              {selectedSpots.map((spot) => (
                <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                  <div className="font-mono text-[11px] text-slate-600">
                    {spot.coordinates.lat.toFixed(4)}, {spot.coordinates.lng.toFixed(4)}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${spot.coordinates.lat},${spot.coordinates.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline mt-1 font-semibold"
                  >
                    Buka Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              ))}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

            {/* Rekomendasi Evaluasi Pengadaan */}
            <tr className="hover:bg-slate-50/80 transition-colors bg-emerald-50/30">
              <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                <div className="font-bold text-emerald-950 flex items-center gap-1">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  Kesimpulan Evaluasi Pengadaan
                </div>
                <div className="text-[10px] text-slate-400 font-normal">Skor rekomendasi pengadaan</div>
              </td>
              {selectedSpots.map((spot) => {
                const isBestValue = spot.id === benchmarks.bestValueId;
                const isHighestImp = spot.id === benchmarks.highestImpressionsId;
                const isLowestPrice = spot.id === benchmarks.lowestPriceId;

                return (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    {isBestValue ? (
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded font-black text-[11px] bg-emerald-600 text-white shadow-2xs">
                          ★ REKOMENDASI UTAMA: BEST VALUE
                        </span>
                        <div className="text-[11px] text-emerald-900 font-medium">
                          Efisiensi biaya tertinggi per paparan mata, sangat direkomendasikan untuk alokasi tender.
                        </div>
                      </div>
                    ) : isHighestImp ? (
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded font-black text-[11px] bg-slate-800 text-amber-300 shadow-2xs">
                          ★ REKOMENDASI: HIGH REACH BRANDING
                        </span>
                        <div className="text-[11px] text-slate-700 font-medium">
                          Paparan kontak terbanyak per hari, pilihan paling dominan untuk peluncuran produk baru.
                        </div>
                      </div>
                    ) : isLowestPrice ? (
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded font-black text-[11px] bg-blue-600 text-white shadow-2xs">
                          ★ REKOMENDASI: BUDGET FRIENDLY
                        </span>
                        <div className="text-[11px] text-slate-700 font-medium">
                          Nilai kontrak paling terjangkau, cocok untuk uji coba pasar atau kampanye jangka pendek.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-[11px] bg-slate-200 text-slate-800">
                          MEMENUHI SYARAT TEKNIS
                        </span>
                        <div className="text-[11px] text-slate-600">
                          Spesifikasi konstruksi dan legalitas memenuhi standar pengadaan media.
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
              {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
};
