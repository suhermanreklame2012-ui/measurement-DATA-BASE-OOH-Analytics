import React, { useState, useMemo } from 'react';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber } from '../utils/formatters';
import { exportSpotsToCSV } from '../services/storageService';
import { openSpotDirectWhatsApp, openMultipleSpotsDirectWhatsApp } from '../utils/whatsapp';
import { 
  ArrowUpDown, 
  CheckCircle, 
  XCircle, 
  Info,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  MinusSquare,
  Check,
  X,
  Download,
  Layers,
  Sparkles,
  Send,
  MessageCircle,
  Pencil,
  TrendingUp
} from 'lucide-react';

interface MediaTableProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
  onEditSpot?: (spot: MediaSpot) => void;
  onToggleAvailability: (spotId: string) => void;
  onBulkUpdateAvailability: (spotIds: string[], isAvailable: boolean) => void;
  onOpenAiProposal?: (spots: MediaSpot[]) => void;
  onOpenRoiCalculator?: (spot: MediaSpot) => void;
}

type SortField = 'no' | 'name' | 'city' | 'dailyImpressions' | 'dailyTraffic' | 'oneMonthPrice';
type SortOrder = 'asc' | 'desc';

export const MediaTable: React.FC<MediaTableProps> = ({
  spots,
  onSelectSpot,
  onEditSpot,
  onToggleAvailability,
  onBulkUpdateAvailability,
  onOpenAiProposal,
  onOpenRoiCalculator
}) => {
  const [sortField, setSortField] = useState<SortField>('dailyImpressions');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedSpots = useMemo(() => {
    return [...spots].sort((a, b) => {
      let aVal: any = a[sortField as keyof MediaSpot];
      let bVal: any = b[sortField as keyof MediaSpot];

      if (sortField === 'oneMonthPrice') {
        aVal = a.pricing.oneMonth;
        bVal = b.pricing.oneMonth;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [spots, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedSpots.length / itemsPerPage) || 1;
  const paginatedSpots = useMemo(() => {
    return sortedSpots.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedSpots, currentPage, itemsPerPage]);

  // Page selection helpers
  const pageSpotIds = useMemo(() => paginatedSpots.map((s) => s.id), [paginatedSpots]);
  const allSpotsIds = useMemo(() => sortedSpots.map((s) => s.id), [sortedSpots]);

  const isAllPageSelected = pageSpotIds.length > 0 && pageSpotIds.every((id) => selectedIds.has(id));
  const isSomePageSelected = pageSpotIds.some((id) => selectedIds.has(id)) && !isAllPageSelected;
  const isAllTotalSelected = allSpotsIds.length > 0 && allSpotsIds.every((id) => selectedIds.has(id));

  // Toggle single item selection
  const toggleSelectSpot = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle page selection checkbox
  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        // Uncheck all on current page
        pageSpotIds.forEach((id) => next.delete(id));
      } else {
        // Check all on current page
        pageSpotIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Select all filtered spots
  const selectAllFiltered = () => {
    setSelectedIds(new Set(allSpotsIds));
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk update availability handler
  const handleBulkSetStatus = (isAvailable: boolean) => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    onBulkUpdateAvailability(idsArray, isAvailable);
  };

  // Export selected spots to CSV
  const handleExportSelected = () => {
    if (selectedIds.size === 0) return;
    const selectedSpotsList = spots.filter((s) => selectedIds.has(s.id));
    const csvContent = exportSpotsToCSV(selectedSpotsList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OOH_Selected_Media_Plan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute stats of current selection
  const selectedSpotsList = useMemo(() => {
    return spots.filter((s) => selectedIds.has(s.id));
  }, [spots, selectedIds]);

  const selectedAvailableCount = selectedSpotsList.filter((s) => s.isAvailable).length;
  const selectedSoldOutCount = selectedSpotsList.length - selectedAvailableCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      
      {/* Table Container Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Controls Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Database Inventaris Media OOH & DOOH Jawa Barat
            </h3>
            <p className="text-xs text-slate-500">
              Total {spots.length} titik media terverifikasi dengan data spasial dan estimasi impresi harian
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Urutkan:</span>
            <select
              value={sortField}
              onChange={(e) => handleSort(e.target.value as SortField)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="dailyImpressions">Impresi Harian (OTS)</option>
              <option value="dailyTraffic">Volume Traffic Kendaraan</option>
              <option value="oneMonthPrice">Tarif 1 Bulan</option>
              <option value="name">Nama Lokasi</option>
              <option value="city">Wilayah / Kota</option>
            </select>
          </div>
        </div>

        {/* Dynamic Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-emerald-900 text-white px-5 py-3 border-b border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-emerald-800/80 px-3 py-1 rounded-lg border border-emerald-700">
                <CheckSquare className="w-4 h-4 text-emerald-300" />
                <span className="font-bold text-xs text-white">
                  {selectedIds.size} titik dipilih
                </span>
                <span className="text-[10px] text-emerald-200">
                  ({selectedAvailableCount} Tersedia, {selectedSoldOutCount} Tersewa)
                </span>
              </div>

              {!isAllTotalSelected ? (
                <button
                  onClick={selectAllFiltered}
                  className="text-xs text-emerald-200 hover:text-white underline font-medium transition-colors"
                >
                  Pilih Semua ({allSpotsIds.length} Titik)
                </button>
              ) : (
                <span className="text-xs text-emerald-300 font-medium">
                  ✓ Semua {allSpotsIds.length} titik terpilih
                </span>
              )}

              <button
                onClick={clearSelection}
                className="text-xs text-rose-300 hover:text-rose-100 underline font-medium transition-colors ml-1"
              >
                Batal Pilih
              </button>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-emerald-200 font-medium hidden lg:inline">
                Aksi Massal:
              </span>

              {/* Set to Available */}
              <button
                onClick={() => handleBulkSetStatus(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs border border-emerald-400/40 active:scale-95"
                title="Ubah semua titik terpilih menjadi Tersedia"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Set Tersedia ({selectedIds.size})
              </button>

              {/* Set to Reserved / Sold Out */}
              <button
                onClick={() => handleBulkSetStatus(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs border border-rose-400/40 active:scale-95"
                title="Ubah semua titik terpilih menjadi Tersewa / Reserved"
              >
                <XCircle className="w-3.5 h-3.5" />
                Set Tersewa / Reserved ({selectedIds.size})
              </button>

              {/* Export Selected to CSV */}
              <button
                onClick={handleExportSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors border border-slate-700 active:scale-95"
                title="Unduh data titik terpilih ke berkas CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Ekspor Terpilih
              </button>

              {/* Direct WhatsApp Web for selected spots */}
              <button
                onClick={() => {
                  const selected = spots.filter((s) => selectedIds.has(s.id));
                  openMultipleSpotsDirectWhatsApp(selected, true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
                title="Buka langsung di WhatsApp Web (web.whatsapp.com) ke nomor +62 87822248975 dengan rincian paket titik terpilih"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
                <span>WhatsApp Web ({selectedIds.size})</span>
              </button>

              {/* AI Proposal Outreach for selected */}
              {onOpenAiProposal && (
                <button
                  onClick={() => {
                    const selected = spots.filter((s) => selectedIds.has(s.id));
                    onOpenAiProposal(selected);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm active:scale-95 cursor-pointer"
                  title="Susun draf penawaran AI (WhatsApp & Email) untuk titik terpilih"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Penawaran AI ({selectedIds.size})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-800 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                {/* Checkbox Column */}
                <th className="py-3 px-3 w-10 text-center">
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={toggleSelectPage}
                      className="text-slate-600 hover:text-emerald-700 transition-colors focus:outline-hidden"
                      title={isAllPageSelected ? 'Batal pilih halaman ini' : 'Pilih semua di halaman ini'}
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : isSomePageSelected ? (
                        <MinusSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="py-3 px-2 w-8 text-center">No</th>
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Lokasi & Jalan
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('city')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Wilayah & Zona
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Format & Ukuran</th>
                <th 
                  onClick={() => handleSort('dailyTraffic')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Traffic / Hari
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('dailyImpressions')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Est. Impresi (OTS)
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('oneMonthPrice')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Tarif 1 Bln
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedSpots.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada titik media yang sesuai dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                paginatedSpots.map((spot, idx) => {
                  const isDooh = spot.category === 'DOOH_DIGITAL';
                  const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isSelected = selectedIds.has(spot.id);

                  return (
                    <tr 
                      key={spot.id}
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/60' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectSpot(spot.id, e)}
                          className="text-slate-500 hover:text-emerald-700 transition-colors focus:outline-hidden"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-2 text-center text-slate-400 font-medium">
                        {rowNum}
                      </td>

                      {/* Lokasi */}
                      <td className="py-3 px-4">
                        <div 
                          className="font-semibold text-slate-900 text-xs hover:text-emerald-700 cursor-pointer" 
                          onClick={() => onSelectSpot(spot)}
                        >
                          {spot.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {spot.roadName}
                        </div>
                      </td>

                      {/* Wilayah & Zona */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">
                          {spot.city}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {spot.district} • <span className="text-blue-600 font-medium">{spot.locationType}</span>
                        </div>
                      </td>

                      {/* Format & Ukuran */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isDooh 
                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {isDooh ? 'DOOH' : spot.mediaType.replace('Billboard', 'BB')}
                          </span>
                          <span className="text-slate-600 font-medium text-[11px]">
                            {spot.size}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {spot.layout} {spot.lighting ? `• ${spot.lighting}` : ''}
                        </div>
                      </td>

                      {/* Traffic */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {spot.dailyTraffic.toLocaleString('id-ID')}
                        </div>
                        <div className={`text-[10px] font-medium ${
                          spot.trafficDensity === 'Sangat Padat' 
                            ? 'text-rose-600' 
                            : spot.trafficDensity === 'Padat' 
                            ? 'text-amber-600' 
                            : 'text-emerald-600'
                        }`}>
                          {spot.trafficDensity}
                        </div>
                      </td>

                      {/* Impresi */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-600 text-xs">
                          {formatCompactNumber(spot.dailyImpressions)} OTS
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Score: {spot.visibilityScore}/100
                        </div>
                      </td>

                      {/* Tarif 1 Bln */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-900">
                          {formatIDR(spot.pricing.oneMonth)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          1 Bln / Sisi
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onToggleAvailability(spot.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-transform active:scale-95 ${
                            spot.isAvailable
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                          title="Klik untuk ubah status ketersediaan"
                        >
                          {spot.isAvailable ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Tersedia
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Tersewa
                            </>
                          )}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onEditSpot && (
                            <button
                              onClick={() => onEditSpot(spot)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Edit Titik Media"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectSpot(spot)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Lihat Detail & Spesifikasi"
                          >
                            <Info className="w-4 h-4" />
                          </button>

                          {onOpenRoiCalculator && (
                            <button
                              onClick={() => onOpenRoiCalculator(spot)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Hitung Estimasi ROI & Rasio Konversi (OOH CTR)"
                            >
                              <TrendingUp className="w-4 h-4 text-indigo-600" />
                            </button>
                          )}

                          {/* Direct WhatsApp Web button */}
                          <button
                            onClick={() => openSpotDirectWhatsApp(spot, true)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Buka Chat WhatsApp Web (+62 87822248975) dengan rincian titik ini"
                          >
                            <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]/20" />
                          </button>

                          {onOpenAiProposal && (
                            <button
                              onClick={() => onOpenAiProposal([spot])}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                              title="Buat Draf Penawaran AI (Email/WA)"
                            >
                              <Send className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Menampilkan baris {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedSpots.length)} dari {sortedSpots.length}
            {selectedIds.size > 0 && (
              <span className="ml-2 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {selectedIds.size} terpilih
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800 px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
