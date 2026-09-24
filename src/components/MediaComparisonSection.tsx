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
  Building,
  Download,
  FileSpreadsheet,
  FileCode,
  ChevronDown,
  FileText,
  Printer
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { formatImageUrl } from '../utils/imageUtils';
import { addNotification } from '../services/storageService';
import { DirectComparisonSpecTable } from './DirectComparisonSpecTable';

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
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'SPEC_SHEET' | 'FULL_METRICS'>('SPEC_SHEET');

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

  // Calculations for benchmarks (winner highlights & Best Value evaluation)
  const benchmarks = useMemo(() => {
    if (selectedSpots.length < 2) {
      return {
        highestImpressionsId: '',
        lowestCpmId: '',
        lowestPriceId: '',
        highestVisibilityId: '',
        bestValueId: '',
        spotMetrics: {} as Record<string, {
          monthlyImpressions: number;
          price: number;
          cpm: number;
          ratioPerRupiah: number;
          ratioPerThousandRp: number;
          isBestValue: boolean;
          efficiencyAdvantagePercent: number;
        }>
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

    let maxRatio = -1;
    let bestValueId = '';

    const spotMetrics: Record<string, {
      monthlyImpressions: number;
      price: number;
      cpm: number;
      ratioPerRupiah: number;
      ratioPerThousandRp: number;
      isBestValue: boolean;
      efficiencyAdvantagePercent: number;
    }> = {};

    selectedSpots.forEach((s) => {
      // Monthly impressions and price basis
      const monthlyImpressions = s.dailyImpressions * 30;
      const price = s.pricing.oneMonth || 1;
      
      // CPM (Cost per 1,000 views) = (1 Month Price / (Daily Imp * 30)) * 1000
      const cpm = monthlyImpressions > 0 ? (price / monthlyImpressions) * 1000 : Infinity;
      
      // Value ratio: Impressions gained per 1 IDR and per Rp 1.000 spent
      const ratioPerRupiah = price > 0 ? monthlyImpressions / price : 0;
      const ratioPerThousandRp = ratioPerRupiah * 1000;

      spotMetrics[s.id] = {
        monthlyImpressions,
        price,
        cpm,
        ratioPerRupiah,
        ratioPerThousandRp,
        isBestValue: false,
        efficiencyAdvantagePercent: 0
      };

      // Impressions benchmark
      if (s.dailyImpressions > maxImp) {
        maxImp = s.dailyImpressions;
        highestImpressionsId = s.id;
      }

      // CPM benchmark
      if (cpm < minCpm) {
        minCpm = cpm;
        lowestCpmId = s.id;
      }

      // 1 Month Price benchmark
      if (s.pricing.oneMonth < minPrice) {
        minPrice = s.pricing.oneMonth;
        lowestPriceId = s.id;
      }

      // Visibility benchmark
      if (s.visibilityScore > maxVis) {
        maxVis = s.visibilityScore;
        highestVisibilityId = s.id;
      }

      // Best Value ratio benchmark (Highest impressions per Rupiah spent)
      if (ratioPerRupiah > maxRatio) {
        maxRatio = ratioPerRupiah;
        bestValueId = s.id;
      }
    });

    // Compute efficiency advantage of the Best Value winner compared to the average of other spots
    if (bestValueId && spotMetrics[bestValueId]) {
      spotMetrics[bestValueId].isBestValue = true;
      const otherSpots = selectedSpots.filter((s) => s.id !== bestValueId);
      if (otherSpots.length > 0) {
        const avgOtherRatio = otherSpots.reduce((acc, s) => acc + (spotMetrics[s.id]?.ratioPerRupiah || 0), 0) / otherSpots.length;
        if (avgOtherRatio > 0) {
          const advantage = Math.round(((spotMetrics[bestValueId].ratioPerRupiah - avgOtherRatio) / avgOtherRatio) * 100);
          spotMetrics[bestValueId].efficiencyAdvantagePercent = advantage > 0 ? advantage : 0;
        }
      }
    }

    return {
      highestImpressionsId,
      lowestCpmId,
      lowestPriceId,
      highestVisibilityId,
      bestValueId,
      spotMetrics
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
    // Sort by highest impression-to-price ratio (equivalent to lowest CPM)
    const sortedByRatio = [...spots].sort((a, b) => {
      const ratioA = (a.dailyImpressions * 30) / (a.pricing.oneMonth || 1);
      const ratioB = (b.dailyImpressions * 30) / (b.pricing.oneMonth || 1);
      return ratioB - ratioA;
    });

    if (sortedByRatio.length >= 3) {
      setSelectedSpotIds([sortedByRatio[0].id, sortedByRatio[1].id, sortedByRatio[2].id]);
    } else {
      setSelectedSpotIds(sortedByRatio.slice(0, 2).map((s) => s.id));
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
      const ratioPerThousand = ((monthlyImpressions / (s.pricing.oneMonth || 1)) * 1000).toFixed(1);
      const isBestValue = s.id === benchmarks.bestValueId;

      text += `[Titik ${idx + 1}] ${s.name} (${s.id})\n`;
      text += `• Lokasi: ${s.city}, ${s.roadName} (${s.locationType})\n`;
      text += `• Format: ${s.mediaType} (${s.size})\n`;
      text += `• Impresi Harian: ${formatCompactNumber(s.dailyImpressions)} OTS/hari\n`;
      text += `• Traffic Kendaraan: ${formatCompactNumber(s.dailyTraffic)} kendaraan/hari\n`;
      text += `• Tarif 1 Bulan: ${formatIDR(s.pricing.oneMonth)}\n`;
      text += `• Rasio Impresi/Harga: ${ratioPerThousand} views / Rp 1.000\n`;
      text += `• Estimasi CPM: ${formatIDR(cpm)} / 1.000 tayang\n`;
      if (isBestValue) {
        text += `• Rekomendasi: ⭐ BEST VALUE (Pilihan paling efisien rasio impresi per biaya)\n`;
      }
      text += `• Status: ${s.isAvailable ? 'AVAILABLE (Siap Pasang)' : 'TERSEWA (Booked)'}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Helper to trigger browser file download
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export proposal data to CSV (Excel / Spreadsheet compatible)
  const handleExportCSV = () => {
    if (selectedSpots.length === 0) return;

    const headers = [
      'No',
      'ID Titik',
      'Status Rekomendasi',
      'Nama Lokasi',
      'Kota/Kabupaten',
      'Kecamatan',
      'Nama Jalan',
      'Kategori Media',
      'Format Media',
      'Ukuran Fisik',
      'Orientasi Hadap',
      'Penerangan',
      'Tipe Lokasi/Zonasi',
      'Tingkat Kepadatan Traffic',
      'Trafik Kendaraan (kend/hari)',
      'Impresi Harian (OTS/hari)',
      'Impresi Bulanan (OTS/bln)',
      'Skor Visibilitas (%)',
      'Tarif Sewa 1 Bulan (IDR)',
      'Tarif Sewa 3 Bulan (IDR)',
      'Tarif Sewa 6 Bulan (IDR)',
      'Tarif Sewa 1 Tahun (IDR)',
      'Estimasi CPM (IDR / 1.000 views)',
      'Rasio Impresi per Rp 1.000 (views)',
      'Keunggulan Efisiensi Biaya',
      'Status Ketersediaan',
      'Koordinat Latitude',
      'Koordinat Longitude',
      'Link Peta Google Maps',
      'URL Foto Lokasi'
    ];

    const rows = selectedSpots.map((spot, idx) => {
      const isBestValue = spot.id === benchmarks.bestValueId;
      const isHighestImp = spot.id === benchmarks.highestImpressionsId;
      const isLowestPrice = spot.id === benchmarks.lowestPriceId;

      let recommendation = 'Opsi Alternatif';
      if (isBestValue) recommendation = '★ BEST VALUE (Paling Efisien Rasio Impresi/Harga)';
      else if (isHighestImp) recommendation = 'Jangkauan Audiens Terluas (OTS Tertinggi)';
      else if (isLowestPrice) recommendation = 'Tarif Masuk Paling Terjangkau';

      const metrics = benchmarks.spotMetrics[spot.id];
      const monthlyImpressions = spot.dailyImpressions * 30;
      const cpm = metrics ? Math.round(metrics.cpm) : Math.round((spot.pricing.oneMonth / (monthlyImpressions || 1)) * 1000);
      const ratioPerThousand = metrics ? metrics.ratioPerThousandRp.toFixed(1) : ((monthlyImpressions / (spot.pricing.oneMonth || 1)) * 1000).toFixed(1);
      const advantage = metrics && metrics.efficiencyAdvantagePercent > 0 ? `+${metrics.efficiencyAdvantagePercent}% vs opsi lain` : '-';
      const photoUrl = spot.imageUrl || (spot.imageUrls && spot.imageUrls[0]) || '';

      return [
        idx + 1,
        `"${spot.id}"`,
        `"${recommendation}"`,
        `"${spot.name.replace(/"/g, '""')}"`,
        `"${spot.city}"`,
        `"${spot.district}"`,
        `"${spot.roadName.replace(/"/g, '""')}"`,
        `"${spot.category === 'DOOH_DIGITAL' ? 'DOOH Digital' : 'OOH Statis'}"`,
        `"${spot.mediaType}"`,
        `"${spot.size}"`,
        `"${spot.orientation || 'Frontal'}"`,
        `"${spot.lighting || 'Standar Frontlite'}"`,
        `"${spot.locationType}"`,
        `"${spot.trafficDensity}"`,
        spot.dailyTraffic,
        spot.dailyImpressions,
        monthlyImpressions,
        `"${spot.visibilityScore}%"`,
        spot.pricing.oneMonth,
        spot.pricing.threeMonths,
        spot.pricing.sixMonths,
        spot.pricing.oneYear,
        cpm,
        ratioPerThousand,
        `"${advantage}"`,
        `"${spot.isAvailable ? 'AVAILABLE (Siap Pasang)' : 'TERSEWA (Booked)'}"`,
        spot.coordinates.lat,
        spot.coordinates.lng,
        `"https://maps.google.com/?q=${spot.coordinates.lat},${spot.coordinates.lng}"`,
        `"${photoUrl}"`
      ];
    });

    // UTF-8 BOM (\uFEFF) ensures proper Indonesian characters rendering in Microsoft Excel & Sheets
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `Proposal_Komparasi_Media_OOH_${dateStr}.csv`, 'text/csv;charset=utf-8;');

    setIsExportMenuOpen(false);
    setExportSuccessMsg('Proposal format CSV berhasil diunduh!');
    setTimeout(() => setExportSuccessMsg(null), 3000);

    addNotification({
      title: 'Proposal CSV Diunduh',
      message: `Data komparasi ${selectedSpots.length} titik media berhasil diunduh dalam format CSV sebagai lampiran proposal.`,
      type: 'system'
    });
  };

  // Export proposal data to structured JSON
  const handleExportJSON = () => {
    if (selectedSpots.length === 0) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const bestValueWinner = selectedSpots.find((s) => s.id === benchmarks.bestValueId);
    const highestImpWinner = selectedSpots.find((s) => s.id === benchmarks.highestImpressionsId);
    const lowestPriceWinner = selectedSpots.find((s) => s.id === benchmarks.lowestPriceId);

    const payload = {
      documentMetadata: {
        title: "Lampiran Data Pendukung Komparasi Media OOH/DOOH",
        provider: "Suherman Reklame",
        exportedAt: new Date().toISOString(),
        currency: "IDR",
        totalComparedSpots: selectedSpots.length,
        version: "1.0"
      },
      comparisonBenchmarks: {
        bestValueWinner: {
          id: benchmarks.bestValueId,
          name: bestValueWinner ? bestValueWinner.name : null,
          note: "Rasio impresi bulanan per biaya sewa tertinggi"
        },
        highestImpressionsWinner: {
          id: benchmarks.highestImpressionsId,
          name: highestImpWinner ? highestImpWinner.name : null
        },
        lowestPriceWinner: {
          id: benchmarks.lowestPriceId,
          name: lowestPriceWinner ? lowestPriceWinner.name : null
        },
        highestVisibilitySpotId: benchmarks.highestVisibilityId
      },
      comparedSpots: selectedSpots.map((spot, idx) => {
        const metrics = benchmarks.spotMetrics[spot.id];
        const monthlyImpressions = spot.dailyImpressions * 30;
        const cpm = metrics ? Math.round(metrics.cpm) : Math.round((spot.pricing.oneMonth / (monthlyImpressions || 1)) * 1000);
        const isBestValue = spot.id === benchmarks.bestValueId;
        const photoUrl = spot.imageUrl || (spot.imageUrls && spot.imageUrls[0]) || '';

        return {
          comparisonIndex: idx + 1,
          id: spot.id,
          name: spot.name,
          city: spot.city,
          district: spot.district,
          roadName: spot.roadName,
          category: spot.category,
          mediaType: spot.mediaType,
          size: spot.size,
          orientation: spot.orientation,
          lighting: spot.lighting,
          locationType: spot.locationType,
          trafficDensity: spot.trafficDensity,
          trafficMetrics: {
            dailyTrafficVehicles: spot.dailyTraffic,
            dailyImpressionsOTS: spot.dailyImpressions,
            monthlyImpressionsOTS: monthlyImpressions,
            visibilityScorePercent: spot.visibilityScore
          },
          pricing: {
            currency: "IDR",
            oneMonth: spot.pricing.oneMonth,
            threeMonths: spot.pricing.threeMonths,
            sixMonths: spot.pricing.sixMonths,
            oneYear: spot.pricing.oneYear
          },
          valueAnalytics: {
            estimatedCPM: cpm,
            impressionsPerThousandRupiah: metrics ? Number(metrics.ratioPerThousandRp.toFixed(1)) : null,
            isBestValueRecommendation: isBestValue,
            efficiencyAdvantagePercent: metrics?.efficiencyAdvantagePercent || 0
          },
          availability: {
            isAvailable: spot.isAvailable,
            statusText: spot.isAvailable ? 'Siap Pasang' : 'Tersewa'
          },
          location: {
            latitude: spot.coordinates.lat,
            longitude: spot.coordinates.lng,
            googleMapsUrl: `https://maps.google.com/?q=${spot.coordinates.lat},${spot.coordinates.lng}`
          },
          mediaAssets: {
            photoUrl: photoUrl
          }
        };
      })
    };

    const jsonContent = JSON.stringify(payload, null, 2);
    downloadFile(jsonContent, `Proposal_Komparasi_Media_OOH_${dateStr}.json`, 'application/json');

    setIsExportMenuOpen(false);
    setExportSuccessMsg('Proposal format JSON berhasil diunduh!');
    setTimeout(() => setExportSuccessMsg(null), 3000);

    addNotification({
      title: 'Proposal JSON Diunduh',
      message: `Data komparasi ${selectedSpots.length} titik media berhasil diunduh dalam format JSON sebagai lampiran proposal.`,
      type: 'system'
    });
  };

  return (
    <div id="media-comparison-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div id="direct-comparison-table-section" />
      <div id="direct-comparison-table" />
      {/* Section Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-700" />
                Fitur Komparasi Media Berdampingan
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {selectedSpots.length}/3 Titik Dipilih
              </span>
              {exportSuccessMsg && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-600 text-white animate-in fade-in duration-200 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {exportSuccessMsg}
                </span>
              )}
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

            {/* Export Proposal Button & Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs border border-emerald-500 cursor-pointer"
                title="Unduh daftar lokasi yang dibandingkan dalam format CSV atau JSON sebagai lampiran proposal penawaran"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Proposal</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-2 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span>Lampiran Data Proposal</span>
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono font-bold">
                        {selectedSpots.length} Titik
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="w-full text-left p-2 hover:bg-emerald-50/70 rounded-lg flex items-start gap-2.5 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 flex items-center gap-1.5">
                          <span>Unduh CSV</span>
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Excel / Sheets
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Spesifikasi lengkap, tarif sewa, estimasi CPM & rasio Best Value
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportJSON}
                      className="w-full text-left p-2 hover:bg-blue-50/70 rounded-lg flex items-start gap-2.5 transition-colors group cursor-pointer mt-1"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-800 flex items-center gap-1.5">
                          <span>Unduh JSON</span>
                          <span className="text-[9px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                            Data Digital
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Format objek JSON terstruktur lengkap dengan metadata & analitik
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
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

        {/* View Mode Tabs: Direct Comparison Table (Procurement Technical Spec Sheet) vs Comprehensive Marketing Analytics */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('SPEC_SHEET')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'SPEC_SHEET'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Direct Comparison Table (Spek Teknis Pengadaan)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('FULL_METRICS')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'FULL_METRICS'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analisis Performa Lengkap & ROI</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {viewMode === 'SPEC_SHEET' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Lembar Spek Teknis: Dimensi, Traffic & Unit Pricing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <Scale className="w-3.5 h-3.5 text-blue-600" />
                Analisis Komparatif Performa CPM & Audiens
              </span>
            )}
          </div>
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
      ) : viewMode === 'SPEC_SHEET' ? (
        <div className="p-4 sm:p-5">
          <DirectComparisonSpecTable
            selectedSpots={selectedSpots}
            benchmarks={benchmarks}
            onSelectSpot={onSelectSpot}
            onOpenPicker={handleOpenPicker}
            onRemoveSpot={handleRemoveSpot}
          />
        </div>
      ) : (
        <>
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
                  const isBestValue = spot.id === benchmarks.bestValueId;
                  const metrics = benchmarks.spotMetrics[spot.id];

                  return (
                    <th 
                      key={spot.id} 
                      className={`p-4 text-left font-normal align-top border-r border-slate-100 last:border-r-0 relative transition-all ${
                        isBestValue 
                          ? 'bg-gradient-to-b from-emerald-50/80 via-emerald-50/30 to-transparent border-t-2 border-t-emerald-500 shadow-inner' 
                          : ''
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Best Value Badge / Value Metric Banner on Column Header */}
                        {isBestValue ? (
                          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white p-2.5 rounded-xl shadow-xs border border-emerald-400/40 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1.5 font-extrabold text-[11px] tracking-wide uppercase">
                                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                BEST VALUE
                              </span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase font-mono shadow-2xs">
                                REKOMENDASI
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-100 font-medium mt-1 leading-tight flex items-center justify-between">
                              <span>Rasio Impresi/Harga:</span>
                              <span className="font-bold text-white font-mono">
                                {metrics ? metrics.ratioPerThousandRp.toFixed(1) : '0'} views / Rp 1k
                              </span>
                            </div>
                            {metrics && metrics.efficiencyAdvantagePercent > 0 && (
                              <div className="text-[9px] text-amber-200 font-bold mt-1 flex items-center gap-1 bg-emerald-800/60 px-1.5 py-0.5 rounded">
                                <span>⚡</span>
                                <span>+{metrics.efficiencyAdvantagePercent}% lebih hemat & efisien</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-100/80 p-2 rounded-xl border border-slate-200/80 text-[10px] text-slate-500">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-600">Rasio Impresi:</span>
                              <span className="font-mono font-bold text-slate-700">
                                {metrics ? metrics.ratioPerThousandRp.toFixed(1) : '0'} views / Rp 1k
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 flex items-center justify-between">
                              <span>Estimasi CPM:</span>
                              <span className="font-mono font-semibold text-slate-600">
                                {formatIDR(metrics ? Math.round(metrics.cpm) : 0)}
                              </span>
                            </div>
                          </div>
                        )}

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

                          {/* Floating Best Value Tag on Image */}
                          {isBestValue && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 border border-white/30">
                                <Award className="w-3 h-3 text-amber-200 fill-amber-200" />
                                Best Value
                              </span>
                            </div>
                          )}

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
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${
                            isBestValue
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
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

              {/* Row: Rasio Impresi per Harga (Best Value Evaluation) */}
              <tr className="hover:bg-slate-50/80 transition-colors bg-emerald-50/20">
                <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Rasio Impresi per Biaya (Best Value)
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Volume impresi bulanan per Rp 1.000 investasi sewa
                  </div>
                </td>
                {selectedSpots.map((spot) => {
                  const isBestValue = spot.id === benchmarks.bestValueId;
                  const metrics = benchmarks.spotMetrics[spot.id];
                  const ratio = metrics ? metrics.ratioPerThousandRp : 0;

                  return (
                    <td 
                      key={spot.id} 
                      className={`p-4 border-r border-slate-100 last:border-r-0 ${
                        isBestValue ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-extrabold font-mono ${
                          isBestValue ? 'text-emerald-700 font-black' : 'text-slate-800'
                        }`}>
                          {ratio.toFixed(1)}
                        </span>
                        <span className="text-[11px] text-slate-500">views / Rp 1.000</span>
                      </div>
                      {isBestValue && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                            <Award className="w-3 h-3 text-emerald-700" />
                            ★ Best Value
                          </span>
                          {metrics && metrics.efficiencyAdvantagePercent > 0 && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              +{metrics.efficiencyAdvantagePercent}% lebih banyak impresi per Rupiah
                            </div>
                          )}
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

        {/* Comparison Summary Card / Takeaways */}
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

            <div className="p-3 bg-white rounded-xl border-2 border-emerald-500/30 shadow-2xs bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40">
              <div className="font-bold text-slate-900 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
                  Pilihan Rekomendasi (Best Value)
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-600 text-white rounded">
                  Paling Efisien
                </span>
              </div>
              {(() => {
                const winner = selectedSpots.find((s) => s.id === benchmarks.bestValueId);
                if (!winner) return null;
                const metrics = benchmarks.spotMetrics[winner.id];
                const cpm = Math.round((winner.pricing.oneMonth / (winner.dailyImpressions * 30)) * 1000);
                return (
                  <div className="text-slate-600 space-y-1">
                    <p>
                      <span className="font-bold text-slate-900">{winner.name}</span> meraih predikat{' '}
                      <span className="font-bold text-emerald-700">Best Value</span> dengan rasio impresi tertinggi:{' '}
                      <span className="font-bold text-emerald-700 font-mono">
                        {metrics ? metrics.ratioPerThousandRp.toFixed(1) : ''} views / Rp 1.000
                      </span>{' '}
                      (CPM {formatIDR(cpm)}/1.000 tayang).
                    </p>
                    {metrics && metrics.efficiencyAdvantagePercent > 0 && (
                      <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                        ⚡ +{metrics.efficiencyAdvantagePercent}% lebih banyak impresi per Rupiah dibanding opsi lain.
                      </div>
                    )}
                  </div>
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

          {/* Quick Export Proposal Footer */}
          <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-700 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Unduh ringkasan data komparasi ini sebagai lampiran pendukung proposal penawaran:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 hover:text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Unduh format CSV untuk spreadsheet Excel / Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Proposal (CSV)</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Unduh format JSON data digital terstruktur"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Proposal (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      </>
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
