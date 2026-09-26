import React, { useState, useMemo } from 'react';
import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';
import { openSpotDirectWhatsApp } from '../utils/whatsapp';
import {
  Scale,
  GitCompare,
  TrendingUp,
  Eye,
  Car,
  DollarSign,
  Maximize2,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  Plus,
  ArrowLeft,
  Share2,
  FileText,
  MessageCircle,
  Info,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Award,
  Zap,
  LayoutGrid,
  List,
  ShieldCheck
} from 'lucide-react';
import { AnalyticsSourceModal } from './AnalyticsSourceModal';

export interface SpotComparisonViewProps {
  allSpots: MediaSpot[];
  comparedSpots: MediaSpot[];
  onAddSpotToCompare: (spotId: string) => void;
  onRemoveSpotFromCompare: (spotId: string) => void;
  onClearComparison: () => void;
  onSelectSpot: (spot: MediaSpot) => void;
  onBackToTable: () => void;
  onOpenPdfModal?: (spots: MediaSpot[]) => void;
  onOpenRoiCalculator?: (spot: MediaSpot) => void;
}

// Color palettes for up to 6 spots in radar comparison
export const SPOT_PALETTES = [
  {
    name: 'Emerald Green',
    stroke: '#10b981',
    fill: 'rgba(16, 185, 129, 0.22)',
    pointFill: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotBg: 'bg-emerald-500',
    ringColor: 'ring-emerald-500/20',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700'
  },
  {
    name: 'Royal Indigo',
    stroke: '#6366f1',
    fill: 'rgba(99, 102, 241, 0.22)',
    pointFill: '#4f46e5',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    dotBg: 'bg-indigo-500',
    ringColor: 'ring-indigo-500/20',
    buttonColor: 'bg-indigo-600 hover:bg-indigo-700'
  },
  {
    name: 'Vibrant Amber',
    stroke: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.22)',
    pointFill: '#d97706',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
    dotBg: 'bg-amber-500',
    ringColor: 'ring-amber-500/20',
    buttonColor: 'bg-amber-600 hover:bg-amber-700'
  },
  {
    name: 'Crimson Rose',
    stroke: '#f43f5e',
    fill: 'rgba(244, 63, 94, 0.22)',
    pointFill: '#e11d48',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
    dotBg: 'bg-rose-500',
    ringColor: 'ring-rose-500/20',
    buttonColor: 'bg-rose-600 hover:bg-rose-700'
  },
  {
    name: 'Purple Violet',
    stroke: '#a855f7',
    fill: 'rgba(168, 85, 247, 0.22)',
    pointFill: '#9333ea',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-300',
    dotBg: 'bg-purple-500',
    ringColor: 'ring-purple-500/20',
    buttonColor: 'bg-purple-600 hover:bg-purple-700'
  },
  {
    name: 'Electric Cyan',
    stroke: '#06b6d4',
    fill: 'rgba(6, 182, 212, 0.22)',
    pointFill: '#0891b2',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-300',
    dotBg: 'bg-cyan-500',
    ringColor: 'ring-cyan-500/20',
    buttonColor: 'bg-cyan-600 hover:bg-cyan-700'
  }
];

// Radar Axes Definitions
interface RadarAxis {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const RADAR_AXES: RadarAxis[] = [
  { key: 'ots', label: 'OTS (Impresi)', sublabel: 'Paparan Harian', icon: <Eye className="w-3.5 h-3.5" /> },
  { key: 'traffic', label: 'Trafik Kendaraan', sublabel: 'Arus Harian', icon: <Car className="w-3.5 h-3.5" /> },
  { key: 'costEfficiency', label: 'Efisiensi CPM', sublabel: 'Cost per 1k OTS', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: 'area', label: 'Luas Display', sublabel: 'Dimensi m²', icon: <Maximize2 className="w-3.5 h-3.5" /> },
  { key: 'visibility', label: 'Skor Visibilitas', sublabel: 'Jarak & Sudut Pandang', icon: <Sparkles className="w-3.5 h-3.5" /> }
];

// Helper to parse dimensions area in m²
function parseAreaM2(sizeStr: string): number {
  if (!sizeStr) return 40;
  const matches = sizeStr.match(/([\d.]+)\s*(?:m|meter)?\s*[xX*]\s*([\d.]+)/);
  if (matches && matches[1] && matches[2]) {
    const w = parseFloat(matches[1]);
    const h = parseFloat(matches[2]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return Math.round(w * h);
    }
  }
  return 45;
}

// Helper to calculate CPM (Cost per Thousand Impressions for 30 days)
function calculateCPM(priceOneMonth: number, dailyOTS: number): number {
  if (!priceOneMonth || !dailyOTS || dailyOTS <= 0) return 0;
  const monthlyOTS = dailyOTS * 30;
  return Math.round((priceOneMonth / monthlyOTS) * 1000);
}

export const SpotComparisonView: React.FC<SpotComparisonViewProps> = ({
  allSpots,
  comparedSpots,
  onAddSpotToCompare,
  onRemoveSpotFromCompare,
  onClearComparison,
  onSelectSpot,
  onBackToTable,
  onOpenPdfModal,
  onOpenRoiCalculator
}) => {
  const [chartMode, setChartMode] = useState<'overlay' | 'side-by-side'>('overlay');
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);
  const [hoveredAxisIndex, setHoveredAxisIndex] = useState<number | null>(null);
  const [visibleSpotIds, setVisibleSpotIds] = useState<Set<string>>(
    () => new Set(comparedSpots.map((s) => s.id))
  );
  const [isAddPickerOpen, setIsAddPickerOpen] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [activeSourceMetricKey, setActiveSourceMetricKey] = useState<'traffic' | 'impressions' | 'visibility' | 'demographics' | 'roi_cpm'>('traffic');

  // Keep visibleSpotIds in sync when spots are added
  React.useEffect(() => {
    setVisibleSpotIds(new Set(comparedSpots.map((s) => s.id)));
  }, [comparedSpots]);

  // Compute Global Benchmarks across all spots for normalized radar scaling
  const benchmarks = useMemo(() => {
    if (allSpots.length === 0) {
      return { maxOTS: 450000, maxTraffic: 180000, maxArea: 120, minCPM: 5000, maxCPM: 50000 };
    }

    let maxOTS = 0;
    let maxTraffic = 0;
    let maxArea = 0;
    let minCPM = Infinity;
    let maxCPM = 0;

    allSpots.forEach((s) => {
      if (s.dailyImpressions > maxOTS) maxOTS = s.dailyImpressions;
      if (s.dailyTraffic > maxTraffic) maxTraffic = s.dailyTraffic;
      const area = parseAreaM2(s.size);
      if (area > maxArea) maxArea = area;
      const cpm = calculateCPM(s.pricing?.oneMonth || 0, s.dailyImpressions);
      if (cpm > 0) {
        if (cpm < minCPM) minCPM = cpm;
        if (cpm > maxCPM) maxCPM = cpm;
      }
    });

    return {
      maxOTS: Math.max(maxOTS, 350000),
      maxTraffic: Math.max(maxTraffic, 150000),
      maxArea: Math.max(maxArea, 100),
      minCPM: minCPM === Infinity ? 4000 : minCPM,
      maxCPM: maxCPM === 0 ? 40000 : maxCPM
    };
  }, [allSpots]);

  // Normalized Metrics for each compared spot (0 to 100)
  const spotMetrics = useMemo(() => {
    return comparedSpots.map((spot, index) => {
      const area = parseAreaM2(spot.size);
      const cpm = calculateCPM(spot.pricing?.oneMonth || 0, spot.dailyImpressions);

      // OTS Score (0 - 100)
      const otsScore = Math.min(100, Math.max(15, Math.round((spot.dailyImpressions / benchmarks.maxOTS) * 100)));

      // Traffic Score (0 - 100)
      const trafficScore = Math.min(100, Math.max(15, Math.round((spot.dailyTraffic / benchmarks.maxTraffic) * 100)));

      // Cost Efficiency Score (Inverse CPM: Lower CPM = Higher Score)
      // Linear interpolation between minCPM and maxCPM inverted
      let costEfficiencyScore = 65;
      if (cpm > 0 && benchmarks.maxCPM > benchmarks.minCPM) {
        const ratio = (cpm - benchmarks.minCPM) / (benchmarks.maxCPM - benchmarks.minCPM);
        // Inverse: lowest CPM gives 95 score, highest gives 25 score
        costEfficiencyScore = Math.round(95 - ratio * 70);
        costEfficiencyScore = Math.min(98, Math.max(20, costEfficiencyScore));
      }

      // Display Area Score (0 - 100)
      const areaScore = Math.min(100, Math.max(20, Math.round((area / benchmarks.maxArea) * 100)));

      // Visibility Score (Spot has 70 - 99 score)
      const visibilityScore = Math.min(100, Math.max(30, spot.visibilityScore || 85));

      const palette = SPOT_PALETTES[index % SPOT_PALETTES.length];

      return {
        spot,
        index,
        palette,
        area,
        cpm,
        values: [otsScore, trafficScore, costEfficiencyScore, areaScore, visibilityScore],
        rawValues: {
          ots: `${formatCompactNumber(spot.dailyImpressions)} OTS`,
          traffic: `${formatCompactNumber(spot.dailyTraffic)} kend.`,
          costEfficiency: `Rp ${cpm.toLocaleString('id-ID')}/1k OTS`,
          area: `${area} m² (${spot.size || '-'})`,
          visibility: `${spot.visibilityScore || 85}/100`
        }
      };
    });
  }, [comparedSpots, benchmarks]);

  // Identify Best Performers in the comparison for badges
  const winners = useMemo(() => {
    if (comparedSpots.length < 2) return null;

    let bestOTS = comparedSpots[0];
    let bestTraffic = comparedSpots[0];
    let bestPrice = comparedSpots[0];
    let bestCPM = { spot: comparedSpots[0], cpm: calculateCPM(comparedSpots[0].pricing?.oneMonth || 0, comparedSpots[0].dailyImpressions) };
    let bestArea = { spot: comparedSpots[0], area: parseAreaM2(comparedSpots[0].size) };

    comparedSpots.forEach((s) => {
      if (s.dailyImpressions > bestOTS.dailyImpressions) bestOTS = s;
      if (s.dailyTraffic > bestTraffic.dailyTraffic) bestTraffic = s;
      if ((s.pricing?.oneMonth || 0) < (bestPrice.pricing?.oneMonth || Infinity)) bestPrice = s;
      const cpm = calculateCPM(s.pricing?.oneMonth || 0, s.dailyImpressions);
      if (cpm > 0 && (bestCPM.cpm === 0 || cpm < bestCPM.cpm)) {
        bestCPM = { spot: s, cpm };
      }
      const a = parseAreaM2(s.size);
      if (a > bestArea.area) {
        bestArea = { spot: s, area: a };
      }
    });

    return { bestOTS, bestTraffic, bestPrice, bestCPM: bestCPM.spot, bestArea: bestArea.spot };
  }, [comparedSpots]);

  // Radar Polygon Coordinate Calculations
  // Center: (cx, cy) = (270, 240), Radius: R = 150
  const cx = 270;
  const cy = 240;
  const radius = 150;
  const numAxes = RADAR_AXES.length;

  const getAxisAngle = (i: number) => {
    // Start at top (-PI/2) and rotate clockwise
    return -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
  };

  const getCoordinates = (valueNormalized: number, axisIndex: number) => {
    const angle = getAxisAngle(axisIndex);
    const r = (valueNormalized / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y };
  };

  // Concentric Rings (20%, 40%, 60%, 80%, 100%)
  const rings = [20, 40, 60, 80, 100];

  // Candidates for "Add Spot" picker
  const candidateSpots = useMemo(() => {
    const comparedSet = new Set(comparedSpots.map((s) => s.id));
    return allSpots.filter((s) => {
      if (comparedSet.has(s.id)) return false;
      if (!pickerSearch.trim()) return true;
      const q = pickerSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.roadName.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      );
    });
  }, [allSpots, comparedSpots, pickerSearch]);

  const toggleSpotVisibility = (spotId: string) => {
    setVisibleSpotIds((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        if (next.size > 1) {
          next.delete(spotId);
        }
      } else {
        next.add(spotId);
      }
      return next;
    });
  };

  // Quick Preset Handlers
  const handleApplyPreset = (presetType: 'topOts' | 'doohOnly' | 'bandungPasteur') => {
    if (presetType === 'topOts') {
      const sorted = [...allSpots].sort((a, b) => b.dailyImpressions - a.dailyImpressions).slice(0, 3);
      onClearComparison();
      sorted.forEach((s) => onAddSpotToCompare(s.id));
    } else if (presetType === 'doohOnly') {
      const dooh = allSpots.filter((s) => s.category === 'DOOH_DIGITAL').slice(0, 3);
      onClearComparison();
      dooh.forEach((s) => onAddSpotToCompare(s.id));
    } else if (presetType === 'bandungPasteur') {
      const pasteurSukajadi = allSpots.filter(
        (s) => s.roadName.toLowerCase().includes('pasteur') || s.roadName.toLowerCase().includes('sukajadi') || s.roadName.toLowerCase().includes('merdeka')
      ).slice(0, 3);
      onClearComparison();
      pasteurSukajadi.forEach((s) => onAddSpotToCompare(s.id));
    }
  };

  return (
    <div
      id="spot-comparison-view"
      data-testid="spot-comparison-view"
      className="space-y-5"
    >
      {/* Top Breadcrumb & Control Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={onBackToTable}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Tabel Inventaris</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              Spot Comparison Radar
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Komparasi Multi-Titik Media OOH & DOOH</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {comparedSpots.length} Titik Dipilih
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis radar komparatif multi-dimensi mempertemukan metrik OTS (Impresi), Kepadatan Trafik, Efisiensi Biaya (CPM), Luas Display, dan Skor Visibilitas.
          </p>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Radar Presentation Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('overlay')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'overlay'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Overlay Radar Chart: Seluruh titik ditumpuk dalam satu radar untuk perbandingan kontur langsung"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Unified Overlay</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('side-by-side')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'side-by-side'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Side-by-Side Radar: Setiap titik memiliki radar mandiri berdampingan"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Data Source & Calculation Accuracy Audit Button */}
          <button
            type="button"
            id="btn-open-source-modal-radar"
            onClick={() => {
              setActiveSourceMetricKey('traffic');
              setIsSourceModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            title="Lihat sumber pengambilan data (Dishub, BPS, WOO) dan persentase akurasi perhitungan"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sumber Data &amp; Akurasi</span>
            <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-200/80 text-[10px]">
              94.2%
            </span>
          </button>

          {/* Quick PDF Proposal for Compared Spots */}
          {onOpenPdfModal && (
            <button
              type="button"
              onClick={() => onOpenPdfModal(comparedSpots)}
              disabled={comparedSpots.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Buat berkas proposal resmi jsPDF untuk seluruh titik yang sedang dibandingkan"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF Komparasi</span>
            </button>
          )}

          {/* Clear All */}
          <button
            type="button"
            onClick={onClearComparison}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
            title="Hapus seluruh titik dari komparasi"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Selected Spots Strip & Quick Presets */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <GitCompare className="w-3.5 h-3.5 text-emerald-600" />
              Titik Terpilih:
            </span>

            {spotMetrics.map((item) => {
              const isVisible = visibleSpotIds.has(item.spot.id);
              const isHovered = hoveredSpotId === item.spot.id;

              return (
                <div
                  key={item.spot.id}
                  onMouseEnter={() => setHoveredSpotId(item.spot.id)}
                  onMouseLeave={() => setHoveredSpotId(null)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                    item.palette.badgeBg
                  } ${isHovered ? 'ring-2 ring-emerald-500 shadow-xs' : ''} ${
                    !isVisible ? 'opacity-40 grayscale' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSpotVisibility(item.spot.id)}
                    className="flex items-center gap-1.5 cursor-pointer"
                    title={isVisible ? 'Sembunyikan dari radar' : 'Tampilkan di radar'}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.palette.stroke }}
                    />
                    <span className="font-bold max-w-[140px] truncate text-slate-900">
                      {item.spot.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({item.spot.city})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveSpotFromCompare(item.spot.id)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                    title="Hapus titik ini dari komparasi"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Add Spot Button */}
            {comparedSpots.length < 6 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAddPickerOpen(!isAddPickerOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Titik ({comparedSpots.length}/6)</span>
                </button>

                {/* Add Spot Dropdown Picker */}
                {isAddPickerOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 max-h-80 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-2 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-1 pb-2 border-b border-slate-100">
                      <input
                        type="text"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="Cari titik media untuk ditambah..."
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1 space-y-1 divide-y divide-slate-50">
                      {candidateSpots.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Tidak ada titik lain yang cocok.
                        </div>
                      ) : (
                        candidateSpots.slice(0, 12).map((spot) => (
                          <button
                            key={spot.id}
                            type="button"
                            onClick={() => {
                              onAddSpotToCompare(spot.id);
                              if (comparedSpots.length >= 5) {
                                setIsAddPickerOpen(false);
                              }
                            }}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-xs flex items-center justify-between group"
                          >
                            <div className="truncate pr-2">
                              <div className="font-semibold text-slate-800 truncate group-hover:text-emerald-700">
                                {spot.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {spot.roadName}, {spot.city} • {formatCompactNumber(spot.dailyImpressions)} OTS
                              </div>
                            </div>
                            <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                              + Pilih
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddPickerOpen(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 px-2 py-0.5"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('topOts')}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Top 3 Impresi (OTS)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('doohOnly')}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Top 3 DOOH Digital
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('bandungPasteur')}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Koridor Pasteur & PVJ
            </button>
          </div>
        </div>

        {/* Informational Callout when fewer than 2 spots */}
        {comparedSpots.length < 2 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Pilih minimal <strong>2 titik media</strong> untuk melakukan komparasi radar yang komprehensif. Klik tombol <strong>+ Tambah Titik</strong> di atas atau pilih preset otomatis.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleApplyPreset('topOts')}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition-colors shrink-0"
            >
              Terapkan Top 3 Otomatis
            </button>
          </div>
        )}
      </div>

      {/* Main Radar Chart Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left / Center: Radar Chart Canvas */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          
          {/* Chart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>Multi-Metric Radar Comparison</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Skala normalized 0 - 100% relatif terhadap benchmark seluruh inventaris OOH Jawa Barat
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>5 Dimensi Pengukuran</span>
            </div>
          </div>

          {/* SVG Radar Chart Canvas */}
          <div className="relative w-full flex items-center justify-center py-2">
            <svg
              viewBox="0 0 540 480"
              className="w-full max-w-[500px] h-auto overflow-visible select-none drop-shadow-xs"
            >
              <defs>
                {/* Dynamic Gradients for each spot */}
                {spotMetrics.map((item) => (
                  <radialGradient
                    key={`grad-${item.spot.id}`}
                    id={`radar-grad-${item.spot.id}`}
                    cx="50%"
                    cy="50%"
                    r="50%"
                  >
                    <stop offset="0%" stopColor={item.palette.stroke} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={item.palette.stroke} stopOpacity="0.08" />
                  </radialGradient>
                ))}
                {/* Background Radar Radial Glow */}
                <radialGradient id="radar-bg-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f8fafc" stopOpacity="1" />
                  <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.5" />
                </radialGradient>
              </defs>

              {/* Background Outer Circle */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="url(#radar-bg-glow)"
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />

              {/* Concentric Grid Polygons (20%, 40%, 60%, 80%, 100%) */}
              {rings.map((ringValue) => {
                const ringPoints = RADAR_AXES.map((_, i) => {
                  const { x, y } = getCoordinates(ringValue, i);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <g key={`ring-${ringValue}`}>
                    <polygon
                      points={ringPoints}
                      fill={ringValue === 100 ? 'none' : 'none'}
                      stroke={ringValue === 100 ? '#cbd5e1' : '#e2e8f0'}
                      strokeWidth={ringValue === 100 ? '1.5' : '1'}
                      strokeDasharray={ringValue === 100 ? 'none' : '3 3'}
                    />
                    {/* Ring Percentage Badge along the top axis */}
                    <text
                      x={cx + 4}
                      y={cy - (ringValue / 100) * radius + 11}
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                    >
                      {ringValue}%
                    </text>
                  </g>
                );
              })}

              {/* Axis Spokes (Connecting Center to Each Vertex) */}
              {RADAR_AXES.map((axis, i) => {
                const { x, y } = getCoordinates(100, i);
                const isHoveredAxis = hoveredAxisIndex === i;

                return (
                  <g key={`spoke-${axis.key}`}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={x}
                      y2={y}
                      stroke={isHoveredAxis ? '#10b981' : '#cbd5e1'}
                      strokeWidth={isHoveredAxis ? '2' : '1'}
                      strokeDasharray="none"
                    />
                  </g>
                );
              })}

              {/* Axis Labels positioned outside the outer perimeter */}
              {RADAR_AXES.map((axis, i) => {
                const angle = getAxisAngle(i);
                const labelRadius = radius + 32;
                const lx = cx + labelRadius * Math.cos(angle);
                const ly = cy + labelRadius * Math.sin(angle);
                const isHovered = hoveredAxisIndex === i;

                // Adjust text-anchor and vertical alignment based on angle
                let textAnchor = 'middle';
                if (Math.cos(angle) > 0.3) textAnchor = 'start';
                else if (Math.cos(angle) < -0.3) textAnchor = 'end';

                return (
                  <g
                    key={`label-${axis.key}`}
                    onMouseEnter={() => setHoveredAxisIndex(i)}
                    onMouseLeave={() => setHoveredAxisIndex(null)}
                    className="cursor-pointer transition-all"
                  >
                    <text
                      x={lx}
                      y={ly - 4}
                      textAnchor={textAnchor}
                      fill={isHovered ? '#047857' : '#1e293b'}
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                    >
                      {axis.label}
                    </text>
                    <text
                      x={lx}
                      y={ly + 9}
                      textAnchor={textAnchor}
                      fill={isHovered ? '#059669' : '#64748b'}
                      fontSize="9"
                      fontWeight="500"
                      fontFamily="system-ui, sans-serif"
                    >
                      {axis.sublabel}
                    </text>
                  </g>
                );
              })}

              {/* Render Polygons for Visible Spots */}
              {spotMetrics.map((item) => {
                const isVisible = visibleSpotIds.has(item.spot.id);
                if (!isVisible) return null;

                const isHovered = hoveredSpotId === item.spot.id;
                const polygonPoints = item.values
                  .map((val, i) => {
                    const { x, y } = getCoordinates(val, i);
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <g
                    key={`poly-group-${item.spot.id}`}
                    onMouseEnter={() => setHoveredSpotId(item.spot.id)}
                    onMouseLeave={() => setHoveredSpotId(null)}
                    className="transition-all duration-200 cursor-pointer"
                  >
                    {/* Filled Polygon */}
                    <polygon
                      points={polygonPoints}
                      fill={`url(#radar-grad-${item.spot.id})`}
                      stroke={item.palette.stroke}
                      strokeWidth={isHovered ? '3.5' : '2'}
                      strokeOpacity={isHovered ? 1 : 0.85}
                      strokeLinejoin="round"
                      style={{
                        filter: isHovered ? `drop-shadow(0 0 6px ${item.palette.stroke}88)` : 'none'
                      }}
                    />

                    {/* Nodes (Circles at vertices) */}
                    {item.values.map((val, i) => {
                      const { x, y } = getCoordinates(val, i);
                      return (
                        <circle
                          key={`node-${item.spot.id}-${i}`}
                          cx={x}
                          cy={y}
                          r={isHovered ? 5.5 : 4}
                          fill={item.palette.pointFill}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all"
                        >
                          <title>
                            {item.spot.name} - {RADAR_AXES[i].label}: {item.rawValues[RADAR_AXES[i].key as keyof typeof item.rawValues]} ({val}%)
                          </title>
                        </circle>
                      );
                    })}
                  </g>
                );
              })}

              {/* Center Dot */}
              <circle cx={cx} cy={cy} r="3" fill="#64748b" />
            </svg>
          </div>

          {/* Radar Interactive Legend Footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 text-xs">
            {spotMetrics.map((item) => {
              const isVisible = visibleSpotIds.has(item.spot.id);
              const isHovered = hoveredSpotId === item.spot.id;

              return (
                <div
                  key={`legend-${item.spot.id}`}
                  onMouseEnter={() => setHoveredSpotId(item.spot.id)}
                  onMouseLeave={() => setHoveredSpotId(null)}
                  onClick={() => toggleSpotVisibility(item.spot.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
                    isHovered ? 'ring-2 ring-emerald-500 bg-slate-50' : 'bg-white border-slate-200'
                  } ${!isVisible ? 'opacity-40' : ''}`}
                >
                  <span
                    className="w-3 h-3 rounded-full border shadow-2xs shrink-0"
                    style={{ backgroundColor: item.palette.stroke, borderColor: item.palette.pointFill }}
                  />
                  <span className="font-bold text-slate-800 truncate max-w-[150px]">
                    {item.spot.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    ({item.spot.city})
                  </span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right: Key Performance Takeaways & Winners Panel */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          
          {/* Executive Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Executive Comparison Summary
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                Multi-Spot Audit
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
              Berdasarkan analisis kontur radar di atas, setiap titik memiliki keunggulan spesifik dalam menjangkau audiens target dan efisiensi belanja media brand.
            </p>

            {/* Metric Winners Grid */}
            {winners && (
              <div className="space-y-2 text-xs">
                {/* Best OTS */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-amber-500/20 text-amber-400">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Impresi Tertinggi (OTS)</div>
                      <div className="font-bold text-white truncate max-w-[160px]">{winners.bestOTS.name}</div>
                    </div>
                  </div>
                  <span className="text-amber-400 font-extrabold text-xs">
                    {formatCompactNumber(winners.bestOTS.dailyImpressions)} OTS/hari
                  </span>
                </div>

                {/* Best CPM */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Efisiensi Biaya (Lowest CPM)</div>
                      <div className="font-bold text-white truncate max-w-[160px]">{winners.bestCPM.name}</div>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-extrabold text-xs">
                    Rp {calculateCPM(winners.bestCPM.pricing?.oneMonth || 0, winners.bestCPM.dailyImpressions).toLocaleString('id-ID')}/1k
                  </span>
                </div>

                {/* Best Traffic */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Volume Trafik Terpadat</div>
                      <div className="font-bold text-white truncate max-w-[160px]">{winners.bestTraffic.name}</div>
                    </div>
                  </div>
                  <span className="text-blue-400 font-extrabold text-xs">
                    {formatCompactNumber(winners.bestTraffic.dailyTraffic)} kend./hari
                  </span>
                </div>

                {/* Largest Display */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-500/20 text-purple-400">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Display Terbesar</div>
                      <div className="font-bold text-white truncate max-w-[160px]">{winners.bestArea.name}</div>
                    </div>
                  </div>
                  <span className="text-purple-400 font-extrabold text-xs">
                    {parseAreaM2(winners.bestArea.size)} m² ({winners.bestArea.size})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Recommendation Card */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 text-xs text-emerald-950">
            <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-emerald-700" />
              <span>Rekomendasi Alokasi Kampanye</span>
            </h4>
            <p className="text-[11.5px] text-emerald-800 leading-relaxed">
              Untuk peluncuran produk masif (*brand awareness*), prioritaskan titik dengan kontur radar condong ke kanan atas (OTS & Trafik tinggi). Untuk efisiensi budget jangka panjang, pilih titik dengan skor efisiensi CPM tertinggi.
            </p>
          </div>

        </div>

      </div>

      {/* Side-by-Side Detailed Comparative Breakdown Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Matriks Komparasi Rinci Titik Media (Side-by-Side Table)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan langsung data teknis, tarif sewa, dan konversi impresi titik yang dipilih
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-600">
            {comparedSpots.length} Kolom Terpilih
          </span>
        </div>

        {/* Horizontal Scrollable Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70">
                <th className="py-3 px-4 w-48 font-bold text-slate-700 uppercase tracking-wider text-[11px] sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                  Parameter Komparasi
                </th>
                {spotMetrics.map((item) => (
                  <th
                    key={`th-${item.spot.id}`}
                    className="py-3 px-4 min-w-[240px] max-w-[280px] font-bold text-slate-800 text-xs border-r border-slate-200/80 last:border-r-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs mt-0.5"
                          style={{ backgroundColor: item.palette.stroke }}
                        />
                        <div>
                          <div className="font-black text-slate-900 text-xs truncate max-w-[180px]">
                            {item.spot.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            No. {item.spot.no} • {item.spot.city}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveSpotFromCompare(item.spot.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Hapus dari tabel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              
              {/* Row: Visual Preview Photo */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  Foto Lokasi & Konstruksi
                </td>
                {spotMetrics.map((item) => (
                  <td key={`photo-${item.spot.id}`} className="py-3 px-4 border-r border-slate-100 last:border-r-0">
                    <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative group">
                      <img
                        src={item.spot.imageUrl || item.spot.imageUrls?.[0] || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'}
                        alt={item.spot.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9.5px] font-bold shadow-xs ${
                        item.spot.category === 'DOOH_DIGITAL' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {item.spot.category === 'DOOH_DIGITAL' ? 'DOOH LED' : 'OOH Static'}
                      </span>
                      <span className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        item.spot.isAvailable ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {item.spot.isAvailable ? 'Tersedia' : 'Tersewa'}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row: Format & Media Type */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  Tipe & Konstruksi
                </td>
                {spotMetrics.map((item) => (
                  <td key={`type-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0 font-medium text-slate-800">
                    <div className="font-bold text-slate-900">{item.spot.mediaType}</div>
                    <div className="text-[10px] text-slate-400">{item.spot.layout} • {item.spot.lighting || 'Penerangan Aktif'}</div>
                  </td>
                ))}
              </tr>

              {/* Row: OTS Daily Impressions */}
              <tr className="hover:bg-slate-50/50 bg-amber-50/30">
                <td className="py-2.5 px-4 font-bold text-amber-950 sticky left-0 bg-amber-50/80 z-10 border-r border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>OTS (Impresi/Hari)</span>
                  </div>
                </td>
                {spotMetrics.map((item) => {
                  const isWinner = winners?.bestOTS.id === item.spot.id;
                  return (
                    <td key={`ots-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-amber-900">
                          {formatCompactNumber(item.spot.dailyImpressions)} OTS
                        </span>
                        {isWinner && (
                          <span className="text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                            Top 1
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.spot.dailyImpressions.toLocaleString('id-ID')} paparan/hari
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row: Daily Traffic */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-500" />
                    <span>Trafik Kendaraan</span>
                  </div>
                </td>
                {spotMetrics.map((item) => (
                  <td key={`traffic-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-bold text-slate-900">
                      {formatCompactNumber(item.spot.dailyTraffic)} kendaraan/hari
                    </div>
                    <span className={`inline-block mt-0.5 text-[9.5px] px-1.5 py-0.2 rounded font-semibold ${
                      item.spot.trafficDensity === 'Sangat Padat'
                        ? 'bg-rose-100 text-rose-800'
                        : item.spot.trafficDensity === 'Padat'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.spot.trafficDensity}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row: Rental Price (1 Month) */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tarif Sewa 1 Bulan</span>
                  </div>
                </td>
                {spotMetrics.map((item) => (
                  <td key={`price-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0">
                    <div className="font-black text-slate-900 text-xs">
                      {formatIDR(item.spot.pricing?.oneMonth || 0)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatCompactIDR(item.spot.pricing?.oneMonth || 0)} / bulan
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row: CPM Efficiency */}
              <tr className="hover:bg-slate-50/50 bg-emerald-50/30">
                <td className="py-2.5 px-4 font-bold text-emerald-950 sticky left-0 bg-emerald-50/80 z-10 border-r border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Estimasi CPM (Cost/1k OTS)</span>
                  </div>
                </td>
                {spotMetrics.map((item) => {
                  const isWinner = winners?.bestCPM.id === item.spot.id;
                  return (
                    <td key={`cpm-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-emerald-800">
                          Rp {item.cpm.toLocaleString('id-ID')}
                        </span>
                        {isWinner && (
                          <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                            Paling Efisien
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">per 1.000 paparan audiens</div>
                    </td>
                  );
                })}
              </tr>

              {/* Row: Display Area & Dimensions */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Dimensi & Luas (m²)</span>
                  </div>
                </td>
                {spotMetrics.map((item) => (
                  <td key={`dim-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0 font-medium text-slate-800">
                    <div className="font-bold text-slate-900">{item.spot.size || '-'}</div>
                    <div className="text-[10px] text-slate-400">Total Luas: ~{item.area} m²</div>
                  </td>
                ))}
              </tr>

              {/* Row: Visibility Score */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                    <span>Skor Visibilitas</span>
                  </div>
                </td>
                {spotMetrics.map((item) => (
                  <td key={`vis-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.spot.visibilityScore || 85}/100</span>
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${item.spot.visibilityScore || 85}%` }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row: Location Context */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  Alamat & Tipe Zona
                </td>
                {spotMetrics.map((item) => (
                  <td key={`addr-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0 text-slate-700">
                    <div className="font-medium text-[11px] leading-tight text-slate-800">
                      {item.spot.roadName}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {item.spot.locationType} • {item.spot.district}, {item.spot.city}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row: Multi-Period Pricing */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-200">
                  Tarif Periode Lainnya
                </td>
                {spotMetrics.map((item) => (
                  <td key={`period-${item.spot.id}`} className="py-2.5 px-4 border-r border-slate-100 last:border-r-0 text-[10.5px] space-y-0.5 text-slate-600">
                    <div>3 Bln: <strong className="text-slate-800">{formatCompactIDR(item.spot.pricing?.threeMonths || 0)}</strong></div>
                    <div>6 Bln: <strong className="text-slate-800">{formatCompactIDR(item.spot.pricing?.sixMonths || 0)}</strong></div>
                    <div>1 Thn: <strong className="text-slate-800">{formatCompactIDR(item.spot.pricing?.oneYear || 0)}</strong></div>
                  </td>
                ))}
              </tr>

              {/* Row: Action Buttons */}
              <tr className="bg-slate-50/80">
                <td className="py-3 px-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  Aksi Titik Media
                </td>
                {spotMetrics.map((item) => (
                  <td key={`actions-${item.spot.id}`} className="py-3 px-4 border-r border-slate-200/80 last:border-r-0">
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectSpot(item.spot)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Buka Detail Lengkap</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openSpotDirectWhatsApp(item.spot, true)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-md text-[11px] transition-colors"
                          title="Chat Admin via WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3 fill-slate-950 text-[#25D366]" />
                          <span>WhatsApp</span>
                        </button>

                        {onOpenRoiCalculator && (
                          <button
                            type="button"
                            onClick={() => onOpenRoiCalculator(item.spot)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors"
                            title="Kalkulator ROI"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>

      </div>

      {/* Analytics Data Sources & Calculation Accuracy Modal */}
      <AnalyticsSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        activeMetricKey={activeSourceMetricKey}
      />

    </div>
  );
};
