import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  X, 
  Eye, 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { formatImageUrl } from '../utils/imageUtils';

interface MediaComparisonSectionProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
}

export const MediaComparisonSection: React.FC<MediaComparisonSectionProps> = ({
  spots,
  onSelectSpot
}) => {
  // Sort spots by impression by default for smart default selection
  const sortedByImpressions = useMemo(() => {
    return [...spots].sort((a, b) => b.dailyImpressions - a.dailyImpressions);
  }, [spots]);

  // Selected spots for comparison (2 to 3 spots)
  const [selectedSpotIds, setSelectedSpotIds] = useState<string[]>(() => {
    if (sortedByImpressions.length >= 2) {
      return [sortedByImpressions[0].id, sortedByImpressions[1].id];
    }
    return spots.slice(0, 2).map((s) => s.id);
  });

  // Picker modal / popover state
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerSlotIndex, setPickerSlotIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('ALL');
  const [copied, setCopied] = useState<boolean>(false);

  // Selected MediaSpot objects
  const selectedSpots = useMemo(() => {
    return selectedSpotIds
      .map((id) => spots.find((s) => s.id === id))
      .filter((s): s is MediaSpot => Boolean(s));
  }, [selectedSpotIds, spots]);

  // Unique cities from spots
  const cities = useMemo(() => {
    const list = Array.from(new Set(spots.map((s) => s.city))).filter(Boolean);
    return ['ALL', ...list];
  }, [spots]);

  // Filtered spots for the picker dialog
  const pickerAvailableSpots = useMemo(() => {
    return spots.filter((spot) => {
      // Don't show spots already selected (unless it's the one currently being replaced)
      const isAlreadyChosen = selectedSpotIds.includes(spot.id);
      const isCurrentSlotSpot = pickerSlotIndex !== null && selectedSpotIds[pickerSlotIndex] === spot.id;
      if (isAlreadyChosen && !isCurrentSlotSpot) {
        return false;
      }

      if (filterCity !== 'ALL' && spot.city !== filterCity) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = spot.name.toLowerCase().includes(q);
        const matchRoad = spot.roadName.toLowerCase().includes(q);
        const matchId = spot.id.toLowerCase().includes(q);
        const matchType = spot.mediaType.toLowerCase().includes(q);
        if (!matchName && !matchRoad && !matchId && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [spots, selectedSpotIds, pickerSlotIndex, filterCity, searchQuery]);

  // Calculations for benchmarks (winner highlights)
  const benchmarks = useMemo(() => {
    if (selectedSpots.length < 2) {
      return {
        highestImpressionsId: '',
        lowestCpmId: '',
        lowestPriceId: '',
        highestVisibilityId: ''
      };
    }

    let maxImp = -1;
    let highestImpressionsId = '';

    let minCpm = Infinity;
    let lowestCpmId = '';

    let minPrice = Infinity;
    let lowestPriceId = '';

    let maxVis = -1;
    let highestVisibilityId = '';

    selectedSpots.forEach((s) => {
      // Impressions
      if (s.dailyImpressions > maxImp) {
        maxImp = s.dailyImpressions;
        highestImpressionsId = s.id;
      }

      // CPM (Cost per 1,000 views) = (1 Month Price / (Daily Imp * 30)) * 1000
      const monthlyImpressions = s.dailyImpressions * 30;
      const cpm = monthlyImpressions > 0 ? (s.pricing.oneMonth / monthlyImpressions) * 1000 : Infinity;
      if (cpm < minCpm) {
        minCpm = cpm;
        lowestCpmId = s.id;
      }

      // 1 Month Price
      if (s.pricing.oneMonth < minPrice) {
        minPrice = s.pricing.oneMonth;
        lowestPriceId = s.id;
      }

      // Visibility
      if (s.visibilityScore > maxVis) {
        maxVis = s.visibilityScore;
        highestVisibilityId = s.id;
      }
    });

    return {
      highestImpressionsId,
      lowestCpmId,
      lowestPriceId,
      highestVisibilityId
    };
  }, [selectedSpots]);

  // Handler to open picker for a slot
  const handleOpenPicker = (slotIndex: number | null) => {
    setPickerSlotIndex(slotIndex);
    setSearchQuery('');
    setFilterCity('ALL');
    setIsPickerOpen(true);
  };

  // Handler when selecting a spot from picker
  const handleSelectFromPicker = (spot: MediaSpot) => {
    if (pickerSlotIndex !== null && pickerSlotIndex < selectedSpotIds.length) {
      // Replace existing slot
      const next = [...selectedSpotIds];
      next[pickerSlotIndex] = spot.id;
      setSelectedSpotIds(next);
    } else {
      // Add new spot (up to 3)
      if (selectedSpotIds.length < 3 && !selectedSpotIds.includes(spot.id)) {
        setSelectedSpotIds([...selectedSpotIds, spot.id]);
      }
    }
    setIsPickerOpen(false);
    setPickerSlotIndex(null);
  };

  // Remove a spot from comparison
  const handleRemoveSpot = (spotId: string) => {
    if (selectedSpotIds.length <= 2) {
      // Keep at least 2 spots if possible, or allow user to replace
      setSelectedSpotIds(selectedSpotIds.filter((id) => id !== spotId));
    } else {
      setSelectedSpotIds(selectedSpotIds.filter((id) => id !== spotId));
    }
  };

  // Presets
  const handlePresetTop2 = () => {
    if (sortedByImpressions.length >= 2) {
      setSelectedSpotIds([sortedByImpressions[0].id, sortedByImpressions[1].id]);
    }
  };

  const handlePresetTop3 = () => {
    if (sortedByImpressions.length >= 3) {
      setSelectedSpotIds([
        sortedByImpressions[0].id,
        sortedByImpressions[1].id,
        sortedByImpressions[2].id
      ]);
    } else {
      setSelectedSpotIds(sortedByImpressions.slice(0, 3).map((s) => s.id));
    }
  };

  const handlePresetBestValue = () => {
    // Sort by lowest CPM
    const sortedByCpm = [...spots].sort((a, b) => {
      const cpmA = (a.pricing.oneMonth / (a.dailyImpressions * 30)) * 1000;
      const cpmB = (b.pricing.oneMonth / (b.dailyImpressions * 30)) * 1000;
      return cpmA - cpmB;
    });

    if (sortedByCpm.length >= 3) {
      setSelectedSpotIds([sortedByCpm[0].id, sortedByCpm[1].id, sortedByCpm[2].id]);
    }
  };

  // Copy comparison text summary
  const handleCopySummary = () => {
    if (selectedSpots.length === 0) return;

    let text = `📊 KOMPARASI MEDIA OOH / BILLBOARD JAWA BARAT\n`;
    text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;

    selectedSpots.forEach((s, idx) => {
      const monthlyImpressions = s.dailyImpressions * 30;
      const cpm = Math.round((s.pricing.oneMonth / monthlyImpressions) * 1000);
      text += `[Titik ${idx + 1}] ${s.name} (${s.id})\n`;
      text += `• Lokasi: ${s.city}, ${s.roadName} (${s.locationType})\n`;
      text += `• Format: ${s.mediaType} (${s.size})\n`;
      text += `• Impresi Harian: ${formatCompactNumber(s.dailyImpressions)} OTS/hari\n`;
      text += `• Traffic Kendaraan: ${formatCompactNumber(s.dailyTraffic)} kendaraan/hari\n`;
      text += `• Tarif 1 Bulan: ${formatIDR(s.pricing.oneMonth)}\n`;
      text += `• Estimasi CPM: ${formatIDR(cpm)} / 1.000 tayang\n`;
      text += `• Status: ${s.isAvailable ? 'AVAILABLE (Siap Pasang)' : 'TERSEWA (Booked)'}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div id="media-comparison-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-700" />
                Fitur Komparasi Media Berdampingan
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {selectedSpots.length}/3 Titik Dipilih
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Tabel Komparasi Performa, Harga & Lokasi Media
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Analisis komparatif head-to-head untuk membandingkan impresi OTS, efisiensi investasi, dan spesifikasi titik media.
            </p>
          </div>

          {/* Action toolbar & presets */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={handlePresetTop2}
                className="px-2.5 py-1 rounded-md font-medium text-slate-700 hover:bg-white hover:shadow-xs transition-all"
              >
                Top 2 Reach
              </button>
              <button
                type="button"
                onClick={handlePresetTop3}
                className="px-2.5 py-1 rounded-md font-medium text-slate-700 hover:bg-white hover:shadow-xs transition-all"
              >
                Top 3 Reach
              </button>
              <button
                type="button"
                onClick={handlePresetBestValue}
                className="px-2.5 py-1 rounded-md font-medium text-slate-700 hover:bg-white hover:shadow-xs transition-all"
              >
                Best Value CPM
              </button>
            </div>

            {selectedSpots.length < 3 && (
              <button
                type="button"
                onClick={() => handleOpenPicker(null)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Titik ({selectedSpots.length}/3)
              </button>
            )}

            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Salin hasil perbandingan untuk klien / laporan"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Ringkasan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Spots Pill Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Titik Aktif:</span>
          {selectedSpots.map((spot, idx) => (
            <div
              key={spot.id}
              className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs hover:border-slate-300 transition-colors"
            >
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-[200px]" title={spot.name}>
                {spot.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                {spot.id}
              </span>
              <button
                type="button"
                onClick={() => handleOpenPicker(idx)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium px-1 hover:underline"
                title="Ganti titik ini"
              >
                Ganti
              </button>
              {selectedSpots.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSpot(spot.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                  title="Hapus dari perbandingan"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {selectedSpots.length < 3 && (
            <button
              type="button"
              onClick={() => handleOpenPicker(null)}
              className="inline-flex items-center gap-1 px-3 py-1 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-700 transition-colors"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>Pilih Titik ke-{selectedSpots.length + 1}</span>
            </button>
          )}
        </div>
      </div>

      {/* Comparison Content */}
      {selectedSpots.length < 2 ? (
        <div className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Scale className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-800">
            Pilih Minimal 2 Titik untuk Memulai Komparasi
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Silakan pilih setidaknya 2 titik billboard atau DOOH untuk menampilkan tabel perbandingan impresi, tarif harga, dan lokasi secara berdampingan.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={handlePresetTop2}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              Bandingkan Top 2 Titik Otomatis
            </button>
            <button
              type="button"
              onClick={() => handleOpenPicker(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
            >
              Pilih dari Daftar
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            {/* Table Header: Spot Profiles */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="p-4 w-48 sm:w-56 text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50/95 backdrop-blur-xs z-10 border-r border-slate-200">
                  Parameter Komparasi
                </th>
                {selectedSpots.map((spot, idx) => {
                  const photoUrl = spot.imageUrl || (spot.imageUrls && spot.imageUrls[0]);
                  const isDooh = spot.category === 'DOOH_DIGITAL';

                  return (
                    <th key={spot.id} className="p-4 text-left font-normal align-top border-r border-slate-100 last:border-r-0">
                      <div className="space-y-2.5">
                        {/* Spot Image Preview */}
                        <div className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs group">
                          {photoUrl ? (
                            <img
                              src={formatImageUrl(photoUrl)}
                              alt={spot.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-400 bg-gradient-to-br from-slate-800 to-slate-900">
                              <Building className="w-6 h-6 mb-1 text-slate-500" />
                              <span className="text-[10px] text-slate-400">Foto Titik</span>
                            </div>
                          )}

                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-xs text-[10px] font-bold text-white font-mono">
                              #{idx + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-xs ${
                              isDooh 
                                ? 'bg-purple-600/90 text-white' 
                                : 'bg-emerald-600/90 text-white'
                            }`}>
                              {isDooh ? 'DOOH' : 'OOH STATIC'}
                            </span>
                          </div>

                          <div className="absolute bottom-2 right-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              spot.isAvailable 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-rose-500 text-white'
                            }`}>
                              {spot.isAvailable ? 'Siap Tayang' : 'Tersewa'}
                            </span>
                          </div>
                        </div>

                        {/* Title and ID */}
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {spot.id}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenPicker(idx)}
                                className="text-[11px] text-slate-500 hover:text-emerald-700 hover:underline"
                              >
                                Ganti
                              </button>
                              {selectedSpots.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpot(spot.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                  title="Hapus"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-1 line-clamp-2 leading-snug" title={spot.name}>
                            {spot.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {spot.city} • {spot.district}
                          </p>
                        </div>

                        {/* Button Action */}
                        <button
                          type="button"
                          onClick={() => onSelectSpot(spot)}
                          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Detail Lengkap</span>
                        </button>
                      </div>
                    </th>
                  );
                })}

                {/* If only 2 spots selected, show Add 3rd Column placeholder */}
                {selectedSpots.length === 2 && (
                  <th className="p-4 text-left font-normal align-middle w-56 bg-slate-50/40 border-dashed border-r border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleOpenPicker(null)}
                      className="w-full h-full min-h-[200px] border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center mb-2 transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                        Tambah Titik ke-3
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Bandingkan hingga 3 titik sekaligus berdampingan
                      </span>
                    </button>
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body: Categorized Rows */}
            <tbody className="divide-y divide-slate-100 text-xs">
              
              {/* GROUP 1: PERFORMA & IMPRESI (SPATIAL REACH) */}
              <tr className="bg-emerald-50/60 font-bold text-emerald-950">
                <td colSpan={selectedSpots.length + (selectedSpots.length === 2 ? 2 : 1)} className="px-4 py-2 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  Kategori 1: Performa & Jangkauan Impresi (OTS Reach)
                </td>
              </tr>

              {/* Row: Estimasi Impresi Harian */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Impresi Harian (OTS)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Opportunity to See per hari</div>
                </td>
                {selectedSpots.map((spot) => {
                  const isWinner = spot.id === benchmarks.highestImpressionsId;
                  return (
                    <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold font-mono text-emerald-700">
                          {formatCompactNumber(spot.dailyImpressions)}
                        </span>
                        <span className="text-[11px] text-slate-500">views/hari</span>
                      </div>
                      {isWinner && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                            <Award className="w-3 h-3 text-amber-700" />
                            🏆 Jangkauan Tertinggi
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Estimasi Impresi Bulanan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Potensi Impresi Bulanan</div>
                  <div className="text-[10px] text-slate-400 font-normal">Akumulasi 30 hari tayang</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <span className="font-bold font-mono text-slate-900">
                      {formatCompactNumber(spot.dailyImpressions * 30)}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1">OTS/bulan</span>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Volume Arus Lalu Lintas */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Volume Traffic Kendaraan</div>
                  <div className="text-[10px] text-slate-400 font-normal">Motor, mobil & transportasi umum</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <span className="font-bold font-mono text-blue-700">
                      {formatCompactNumber(spot.dailyTraffic)}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1">kendaraan/hari</span>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Kepadatan Lalu Lintas */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Kepadatan Lalu Lintas</div>
                  <div className="text-[10px] text-slate-400 font-normal">Tingkat kemacetan koridor</div>
                </td>
                {selectedSpots.map((spot) => {
                  const isVeryDense = spot.trafficDensity === 'Sangat Padat';
                  return (
                    <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        isVeryDense
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {spot.trafficDensity}
                      </span>
                    </td>
                  );
                })}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Skor Visibilitas */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Skor Visibilitas</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sudut pandang & jarak bebas halangan</div>
                </td>
                {selectedSpots.map((spot) => {
                  const isBestVis = spot.id === benchmarks.highestVisibilityId;
                  return (
                    <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{spot.visibilityScore}/100</span>
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              spot.visibilityScore >= 90 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${spot.visibilityScore}%` }}
                          />
                        </div>
                      </div>
                      {isBestVis && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          ✓ Sudut Pandang Paling Optimal
                        </div>
                      )}
                    </td>
                  );
                })}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Estimasi CPM (Cost Per Mille) */}
              <tr className="hover:bg-slate-50/80 transition-colors bg-amber-50/20">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Efisiensi Biaya (CPM)
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">Biaya per 1.000 impresi tayang</div>
                </td>
                {selectedSpots.map((spot) => {
                  const monthlyImpressions = spot.dailyImpressions * 30;
                  const cpm = Math.round((spot.pricing.oneMonth / monthlyImpressions) * 1000);
                  const isBestCpm = spot.id === benchmarks.lowestCpmId;

                  return (
                    <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                      <div className="text-sm font-extrabold font-mono text-slate-900">
                        {formatIDR(cpm)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">per 1.000 views</div>
                      {isBestCpm && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                            🌟 Nilai Terbaik (Best Value)
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* GROUP 2: ANALISIS HARGA & PAKET SEWA */}
              <tr className="bg-blue-50/60 font-bold text-blue-950">
                <td colSpan={selectedSpots.length + (selectedSpots.length === 2 ? 2 : 1)} className="px-4 py-2 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-700" />
                  Kategori 2: Harga & Paket Durasi Sewa
                </td>
              </tr>

              {/* Row: Tarif 1 Bulan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Tarif 1 Bulan (Dasar)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Biaya sewa periode reguler</div>
                </td>
                {selectedSpots.map((spot) => {
                  const isLowestPrice = spot.id === benchmarks.lowestPriceId;
                  return (
                    <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                      <div className="text-sm font-extrabold font-mono text-slate-900">
                        {formatIDR(spot.pricing.oneMonth)}
                      </div>
                      <div className="text-[10px] text-slate-500">/ 1 bulan</div>
                      {isLowestPrice && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                          Biaya Terendah
                        </span>
                      )}
                    </td>
                  );
                })}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Tarif 3 Bulan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Paket 3 Bulan</div>
                  <div className="text-[10px] text-slate-400 font-normal">Kampanye kuartal</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-bold font-mono text-slate-900">
                      {formatIDR(spot.pricing.threeMonths)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ≈ {formatIDR(Math.round(spot.pricing.threeMonths / 3))}/bln
                    </div>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Tarif 6 Bulan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Paket 6 Bulan</div>
                  <div className="text-[10px] text-slate-400 font-normal">Kampanye semester</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-bold font-mono text-slate-900">
                      {formatIDR(spot.pricing.sixMonths)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ≈ {formatIDR(Math.round(spot.pricing.sixMonths / 6))}/bln
                    </div>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Tarif 1 Tahun */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Paket 1 Tahun (12 Bln)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Kontrak tahunan branding dominan</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-bold font-mono text-slate-900">
                      {formatIDR(spot.pricing.oneYear)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold">
                      ≈ {formatIDR(Math.round(spot.pricing.oneYear / 12))}/bln
                    </div>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Estimasi Biaya Harian */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Biaya Efektif / Hari</div>
                  <div className="text-[10px] text-slate-400 font-normal">Rasio sewa bulanan / 30 hari</div>
                </td>
                {selectedSpots.map((spot) => {
                  const dailyCost = Math.round(spot.pricing.oneMonth / 30);
                  return (
                    <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                      <div className="font-mono font-semibold text-slate-800">
                        {formatIDR(dailyCost)}
                      </div>
                      <div className="text-[10px] text-slate-400">/ hari tayang</div>
                    </td>
                  );
                })}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* GROUP 3: LOKASI & SPESIFIKASI TEKNIS */}
              <tr className="bg-purple-50/60 font-bold text-purple-950">
                <td colSpan={selectedSpots.length + (selectedSpots.length === 2 ? 2 : 1)} className="px-4 py-2 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-700" />
                  Kategori 3: Lokasi, Koridor & Spesifikasi Teknis
                </td>
              </tr>

              {/* Row: Kota & Kecamatan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Wilayah / Kota</div>
                  <div className="text-[10px] text-slate-400 font-normal">Cakupan administratif</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-bold text-slate-900">{spot.city}</div>
                    <div className="text-[11px] text-slate-500">Kec. {spot.district}</div>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Koridor Jalan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Koridor Jalan</div>
                  <div className="text-[10px] text-slate-400 font-normal">Alamat penempatan media</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-semibold text-slate-800">{spot.roadName}</div>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Karakteristik Zona Lokasi */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Tipe Zona Geografis</div>
                  <div className="text-[10px] text-slate-400 font-normal">Profil area penonton</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      {spot.locationType}
                    </span>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Ukuran & Orientasi */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Dimensi & Orientasi</div>
                  <div className="text-[10px] text-slate-400 font-normal">Ukuran fisik konstruksi</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-bold text-slate-900 font-mono">{spot.size}</div>
                    <div className="text-[11px] text-slate-500">Orientasi {spot.layout}</div>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Tipe Media & Penerangan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Format & Penerangan</div>
                  <div className="text-[10px] text-slate-400 font-normal">Spesifikasi visual malam hari</div>
                </td>
                {selectedSpots.map((spot) => (
                  <td key={spot.id} className="p-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-semibold text-slate-800">{spot.mediaType}</div>
                    <div className="text-[11px] text-slate-500">
                      Penerangan: <span className="font-medium text-slate-700">{spot.lighting || 'Standar Frontlite'}</span>
                    </div>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

              {/* Row: Posisi Geografis GPS */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-900">Koordinat GPS</div>
                  <div className="text-[10px] text-slate-400 font-normal">Latitude & Longitude peta</div>
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
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline mt-1 font-medium"
                    >
                      Buka di Google Maps
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                ))}
                {selectedSpots.length === 2 && <td className="p-4 bg-slate-50/30" />}
              </tr>

            </tbody>
          </table>
        </div>
      )}

      {/* Comparison Summary Card / Takeaways */}
      {selectedSpots.length >= 2 && (
        <div className="p-5 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Kesimpulan & Rekomendasi Alokasi Kampanye
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Award className="w-4 h-4 text-amber-500" />
                Jangkauan Traffic Terluas
              </div>
              {(() => {
                const winner = selectedSpots.find((s) => s.id === benchmarks.highestImpressionsId);
                if (!winner) return null;
                return (
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-900">{winner.name}</span> menghasilkan paparan terbesar dengan{' '}
                    <span className="font-bold text-emerald-700">{formatCompactNumber(winner.dailyImpressions)} OTS/hari</span>, ideal untuk penetrasi brand cepat.
                  </p>
                );
              })()}
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Efisiensi Investasi (Best Value)
              </div>
              {(() => {
                const winner = selectedSpots.find((s) => s.id === benchmarks.lowestCpmId);
                if (!winner) return null;
                const cpm = Math.round((winner.pricing.oneMonth / (winner.dailyImpressions * 30)) * 1000);
                return (
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-900">{winner.name}</span> menawarkan CPM terendah di kisaran{' '}
                    <span className="font-bold text-emerald-700">{formatIDR(cpm)}/1.000 tayang</span>, cocok untuk optimasi anggaran klien.
                  </p>
                );
              })()}
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Biaya Masuk Terjangkau
              </div>
              {(() => {
                const winner = selectedSpots.find((s) => s.id === benchmarks.lowestPriceId);
                if (!winner) return null;
                return (
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-900">{winner.name}</span> memiliki tarif masuk paling terjangkau yakni{' '}
                    <span className="font-bold text-blue-700">{formatIDR(winner.pricing.oneMonth)}/bln</span> untuk fleksibilitas uji coba materi.
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Spot Selector Modal / Dialog */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  {pickerSlotIndex !== null
                    ? `Pilih Titik Pengganti Slot #${pickerSlotIndex + 1}`
                    : `Pilih Titik ke-${selectedSpots.length + 1} untuk Dikomparasikan`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tersedia {pickerAvailableSpots.length} titik media yang siap dipilih
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama titik, jalan, kode..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city === 'ALL' ? 'Semua Kota' : city}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Spot List */}
            <div className="p-3 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
              {pickerAvailableSpots.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada titik media yang sesuai dengan pencarian.
                </div>
              ) : (
                pickerAvailableSpots.map((spot) => {
                  const isDooh = spot.category === 'DOOH_DIGITAL';
                  const photoUrl = spot.imageUrl || (spot.imageUrls && spot.imageUrls[0]);

                  return (
                    <div
                      key={spot.id}
                      onClick={() => handleSelectFromPicker(spot)}
                      className="pt-2 pb-2 first:pt-0 flex items-center justify-between gap-3 hover:bg-emerald-50/60 px-2 rounded-lg cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                          {photoUrl ? (
                            <img
                              src={formatImageUrl(photoUrl)}
                              alt={spot.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                              <Building className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {spot.id}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 truncate group-hover:text-emerald-700">
                              {spot.name}
                            </span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              isDooh ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isDooh ? 'DOOH' : spot.size}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {spot.city} • {spot.roadName} • {spot.locationType}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-extrabold text-emerald-700 font-mono">
                          {formatCompactNumber(spot.dailyImpressions)} OTS/hr
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {formatIDR(spot.pricing.oneMonth)}/bln
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Klik pada salah satu titik untuk memasukkannya ke dalam tabel komparasi.
              </span>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
