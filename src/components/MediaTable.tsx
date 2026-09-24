import React, { useState, useMemo, useEffect } from 'react';
import { MediaSpot, ClientContact, ProposalDuration, FilterState } from '../types/ooh';
import { PerformanceOverview } from './PerformanceOverview';
import { SpotComparisonView } from './SpotComparisonView';
import { formatIDR, formatCompactNumber } from '../utils/formatters';
import { exportSpotsToCSV, addNotification } from '../services/storageService';
import { openSpotDirectWhatsApp, openMultipleSpotsDirectWhatsApp } from '../utils/whatsapp';
import { getStoredClients } from '../services/clientService';
import { calculateUnifiedProposalAnalytics } from '../utils/audienceDemographics';
import { generateExecutiveProposalPDF } from '../utils/proposalPdfExport';
import { 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
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
  TrendingUp,
  FileText,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Building,
  User,
  Phone,
  Calendar,
  Eye,
  DollarSign,
  LayoutGrid,
  List,
  MapPin,
  Car,
  Scale,
  GitCompare,
  Trash2,
  AlertTriangle,
  Plus
} from 'lucide-react';

interface MediaTableProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
  onEditSpot?: (spot: MediaSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
  onBulkDeleteSpots?: (spotIds: string[]) => void;
  onAddSpot?: () => void;
  onToggleAvailability: (spotId: string) => void;
  onBulkUpdateAvailability: (spotIds: string[], isAvailable: boolean) => void;
  onOpenAiProposal?: (spots: MediaSpot[]) => void;
  onOpenRoiCalculator?: (spot: MediaSpot) => void;
  filter?: FilterState;
  onSelectRegion?: (region: string) => void;
}

type SortField = 'no' | 'name' | 'city' | 'dailyImpressions' | 'dailyTraffic' | 'oneMonthPrice';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'card' | 'compare';

export const MediaTable: React.FC<MediaTableProps> = ({
  spots,
  onSelectSpot,
  onEditSpot,
  onDeleteSpot,
  onBulkDeleteSpots,
  onAddSpot,
  onToggleAvailability,
  onBulkUpdateAvailability,
  onOpenAiProposal,
  onOpenRoiCalculator,
  filter,
  onSelectRegion
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('dailyImpressions');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Bulk Selection State & Quick Compare State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparedSpotIds, setComparedSpotIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Deletion Confirmation States
  const [spotToDelete, setSpotToDelete] = useState<MediaSpot | null>(null);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState<boolean>(false);

  const handleOpenComparisonModal = () => {
    if (selectedIds.size >= 2) {
      setComparedSpotIds(Array.from(selectedIds).slice(0, 6));
    } else if (comparedSpotIds.length < 2) {
      const fallback = spots.slice(0, 3).map((s) => s.id);
      setComparedSpotIds(fallback);
    }
    setIsCompareModalOpen(true);
  };

  // Effective spots currently being compared in the Spot Comparison Radar View
  const effectiveComparedSpots = useMemo(() => {
    const spotMap = new Map(spots.map((s) => [s.id, s]));
    
    if (comparedSpotIds.length > 0) {
      const list = comparedSpotIds.map((id) => spotMap.get(id)).filter(Boolean) as MediaSpot[];
      if (list.length > 0) return list;
    }

    if (selectedIds.size >= 2) {
      const list = Array.from(selectedIds).map((id) => spotMap.get(id)).filter(Boolean) as MediaSpot[];
      if (list.length > 0) return list.slice(0, 6);
    }

    return spots.slice(0, 3);
  }, [comparedSpotIds, selectedIds, spots]);

  const handleAddSpotToCompare = (spotId: string) => {
    setComparedSpotIds((prev) => {
      const base = prev.length > 0 ? prev : effectiveComparedSpots.map((s) => s.id);
      if (base.includes(spotId)) return base;
      if (base.length >= 6) return base;
      return [...base, spotId];
    });
    setSelectedIds((prev) => new Set([...prev, spotId]));
  };

  const handleRemoveSpotFromCompare = (spotId: string) => {
    setComparedSpotIds((prev) => {
      const base = prev.length > 0 ? prev : effectiveComparedSpots.map((s) => s.id);
      return base.filter((id) => id !== spotId);
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(spotId);
      return next;
    });
  };

  const handleClearComparison = () => {
    setComparedSpotIds([]);
  };

  const handleSort = (field: SortField) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' || field === 'city' ? 'asc' : 'desc');
    }
  };

  const handleSelectCombinedSort = (combinedValue: string) => {
    const [field, order] = combinedValue.split('-') as [SortField, SortOrder];
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    if (!isActive) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0 animate-in fade-in" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0 animate-in fade-in" />
    );
  };

  const sortedSpots = useMemo(() => {
    return [...spots].sort((a, b) => {
      let aVal: any = a[sortField as keyof MediaSpot];
      let bVal: any = b[sortField as keyof MediaSpot];

      if (sortField === 'oneMonthPrice') {
        aVal = a.pricing?.oneMonth ?? 0;
        bVal = b.pricing?.oneMonth ?? 0;
      } else if (sortField === 'dailyImpressions') {
        aVal = a.dailyImpressions ?? 0;
        bVal = b.dailyImpressions ?? 0;
      } else if (sortField === 'dailyTraffic') {
        aVal = a.dailyTraffic ?? 0;
        bVal = b.dailyTraffic ?? 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? (aVal || '').localeCompare(bVal || '', 'id', { numeric: true, sensitivity: 'base' })
          : (bVal || '').localeCompare(aVal || '', 'id', { numeric: true, sensitivity: 'base' });
      }

      const numA = typeof aVal === 'number' ? aVal : 0;
      const numB = typeof bVal === 'number' ? bVal : 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
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

  // Toggle single item selection / Quick Compare
  const toggleSelectSpot = (id: string, e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
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

  // Export selected spots to Excel CSV
  const handleExportSelected = () => {
    if (selectedIds.size === 0) return;
    const selectedSpotsList = spots.filter((s) => selectedIds.has(s.id));
    const csvContent = exportSpotsToCSV(selectedSpotsList);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `OOH_Selected_Media_Report_Excel_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addNotification({
      title: 'Titik Terpilih Diekspor ke Excel',
      message: `${selectedSpotsList.length} titik media terpilih berhasil diekspor ke berkas Excel (CSV).`,
      type: 'create'
    });
  };

  // Export current filtered spots to Excel (CSV format for offline reporting)
  const handleExportToExcel = () => {
    if (spots.length === 0) return;
    const targetSpots = sortedSpots.length > 0 ? sortedSpots : spots;
    const csvContent = exportSpotsToCSV(targetSpots);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `OOH_Media_Report_Excel_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addNotification({
      title: 'Export to Excel Berhasil',
      message: `${targetSpots.length} titik media hasil filter saat ini berhasil diekspor ke berkas Excel (CSV) untuk pelaporan offline.`,
      type: 'create'
    });
  };

  const handleExportFilteredCSV = handleExportToExcel;

  // Compute stats of current selection
  const selectedSpotsList = useMemo(() => {
    return spots.filter((s) => selectedIds.has(s.id));
  }, [spots, selectedIds]);

  const selectedAvailableCount = selectedSpotsList.filter((s) => s.isAvailable).length;
  const selectedSoldOutCount = selectedSpotsList.length - selectedAvailableCount;

  // PDF Proposal Generation State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [pdfTargetSpots, setPdfTargetSpots] = useState<MediaSpot[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfClientName, setPdfClientName] = useState<string>('Bpk. Hendra Wijaya');
  const [pdfClientCompany, setPdfClientCompany] = useState<string>('PT Mitra Bisnis Indonesia');
  const [pdfClientRole, setPdfClientRole] = useState<string>('Brand & Marketing Director');
  const [pdfClientPhone, setPdfClientPhone] = useState<string>('0812-2002-390');
  const [pdfDuration, setPdfDuration] = useState<ProposalDuration>('1 Bulan');
  const [pdfCustomNote, setPdfCustomNote] = useState<string>('');
  const [savedClients, setSavedClients] = useState<ClientContact[]>([]);

  // Load saved clients for fast auto-fill
  useEffect(() => {
    try {
      const list = getStoredClients();
      if (list && list.length > 0) {
        setSavedClients(list);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleOpenPdfModal = (targets: MediaSpot[]) => {
    if (targets.length === 0) return;
    setPdfTargetSpots(targets);
    setIsPdfModalOpen(true);
  };

  const handleSelectSavedClient = (clientId: string) => {
    const found = savedClients.find((c) => c.id === clientId);
    if (found) {
      setPdfClientName(found.name);
      setPdfClientCompany(found.company);
      setPdfClientPhone(found.phone || '');
      setPdfClientRole(found.role || 'Brand & Marketing Director');
    }
  };

  const pdfAnalytics = useMemo(() => {
    if (pdfTargetSpots.length === 0) return null;
    return calculateUnifiedProposalAnalytics(pdfTargetSpots, pdfDuration);
  }, [pdfTargetSpots, pdfDuration]);

  const handleExecuteGeneratePdf = async () => {
    if (pdfTargetSpots.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const clientContact: ClientContact = {
        id: `client-${Date.now()}`,
        name: pdfClientName.trim() || 'Klien Eksekutif',
        company: pdfClientCompany.trim() || 'Perusahaan Mitra',
        role: pdfClientRole.trim() || 'Marketing Director',
        phone: pdfClientPhone.trim() || '0812-2002-390',
        email: 'klien@perusahaan.co.id',
        category: 'Korporat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const analytics = calculateUnifiedProposalAnalytics(pdfTargetSpots, pdfDuration);
      await generateExecutiveProposalPDF(
        clientContact,
        pdfTargetSpots,
        analytics,
        pdfDuration,
        pdfCustomNote.trim() || undefined
      );

      addNotification({
        title: 'PDF Proposal Eksekutif Dihasilkan',
        message: `Proposal resmi untuk ${clientContact.company} (${pdfTargetSpots.length} titik) berhasil diunduh via jsPDF.`,
        type: 'create'
      });
      setIsPdfModalOpen(false);
    } catch (err) {
      console.error('Failed to generate proposal PDF:', err);
      alert('Terjadi kesalahan saat menyusun dokumen PDF. Silakan coba kembali.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      
      {/* Real-time Performance Overview Component: Average OTS per Region & Occupancy Rate */}
      <PerformanceOverview
        spots={spots}
        filter={filter}
        onSelectRegion={onSelectRegion}
      />

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

          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            {/* View Mode Toggle: Compact List vs Detailed Card vs Spot Comparison */}
            <div 
              id="view-mode-toggle-group"
              className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs"
            >
              <button
                id="btn-view-mode-list"
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="Tampilan Compact List (Tabel data densitas tinggi)"
              >
                <List className="w-3.5 h-3.5" />
                <span>Compact List</span>
              </button>
              <button
                id="btn-view-mode-card"
                type="button"
                onClick={() => setViewMode('card')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="Tampilan Detailed Card (Kartu visual lengkap dengan foto dan metrik)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Detailed Card</span>
              </button>
              <button
                id="btn-view-mode-compare"
                data-testid="btn-view-mode-compare"
                type="button"
                onClick={() => {
                  if (selectedIds.size >= 2) {
                    setComparedSpotIds(Array.from(selectedIds).slice(0, 6));
                  } else if (comparedSpotIds.length < 2) {
                    const initial = spots.slice(0, 3).map((s) => s.id);
                    setComparedSpotIds(initial);
                    setSelectedIds(new Set(initial));
                  }
                  setViewMode('compare');
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'compare'
                    ? 'bg-emerald-600 text-white shadow-xs border border-emerald-500 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                title="Tampilan Spot Comparison (Radar Chart & Komparasi Side-by-Side)"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Spot Comparison</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  viewMode === 'compare' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedIds.size >= 2 ? selectedIds.size : 'Radar'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
              <span className="text-slate-500 font-medium px-1.5 text-xs flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
                Urutkan:
              </span>
              <select
                id="select-media-sort"
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => handleSelectCombinedSort(e.target.value)}
                className="bg-transparent border-0 py-1 pr-6 pl-1 text-xs text-slate-800 font-semibold focus:ring-0 focus:outline-none cursor-pointer"
              >
                <optgroup label="Tarif 1 Bulan (Monthly Price)">
                  <option value="oneMonthPrice-desc">Tarif 1 Bln: Tertinggi ke Terendah (↓)</option>
                  <option value="oneMonthPrice-asc">Tarif 1 Bln: Terendah ke Tertinggi (↑)</option>
                </optgroup>
                <optgroup label="Impresi & Traffic (OTS)">
                  <option value="dailyImpressions-desc">Impresi Harian (OTS): Terbanyak ke Terkecil (↓)</option>
                  <option value="dailyImpressions-asc">Impresi Harian (OTS): Terkecil ke Terbanyak (↑)</option>
                  <option value="dailyTraffic-desc">Volume Trafik: Terpadat ke Terlengang (↓)</option>
                  <option value="dailyTraffic-asc">Volume Trafik: Terlengang ke Terpadat (↑)</option>
                </optgroup>
                <optgroup label="Lokasi & Geografis">
                  <option value="name-asc">Nama Lokasi: A ke Z (↑)</option>
                  <option value="name-desc">Nama Lokasi: Z ke A (↓)</option>
                  <option value="city-asc">Wilayah / Kota: A ke Z (↑)</option>
                  <option value="city-desc">Wilayah / Kota: Z ke A (↓)</option>
                </optgroup>
              </select>

              <button
                id="btn-toggle-sort-order"
                type="button"
                onClick={toggleSortOrder}
                className="p-1 px-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-md transition-colors font-medium flex items-center gap-1 cursor-pointer border-l border-slate-200"
                title={`Balik arah urutan: Saat ini ${sortOrder === 'asc' ? 'Naik (Ascending / Terendah)' : 'Turun (Descending / Tertinggi)'}. Klik untuk ubah.`}
              >
                {sortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    <span className="text-[10px] text-emerald-700 font-bold">Asc (↑)</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    <span className="text-[10px] text-emerald-700 font-bold">Desc (↓)</span>
                  </>
                )}
              </button>
            </div>

            {/* Batch Share to WhatsApp (Quick Header Action) */}
            <button
              id="btn-batch-share-whatsapp-toolbar"
              type="button"
              onClick={() => {
                const targetSpots = selectedIds.size > 0 ? selectedSpotsList : paginatedSpots;
                openMultipleSpotsDirectWhatsApp(targetSpots, true);
              }}
              disabled={spots.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg border border-[#20bd5a] text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title="Kirim rincian paket titik terpilih ke Admin Suherman Reklame via WhatsApp Web (+62 87822248975)"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
              <span>
                Batch Share to WhatsApp {selectedIds.size > 0 ? `(${selectedIds.size})` : `(${paginatedSpots.length})`}
              </span>
            </button>

            {/* Export to Excel (Offline Reporting) */}
            <button
              id="btn-export-to-excel"
              data-testid="btn-export-to-excel"
              type="button"
              onClick={handleExportToExcel}
              disabled={spots.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-semibold rounded-lg border border-slate-700 shadow-2xs text-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title="Unduh seluruh data titik media hasil filter saat ini ke berkas CSV Excel untuk pelaporan offline"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export to Excel ({spots.length})</span>
            </button>

            {/* Add New Spot Action */}
            {onAddSpot && (
              <button
                id="btn-add-new-spot-table"
                type="button"
                onClick={onAddSpot}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-lg border border-emerald-500 shadow-sm text-xs transition-all cursor-pointer"
                title="Tambah Titik Media Baru ke Database"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Tambah Titik</span>
              </button>
            )}
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

              {/* Bandingkan Titik (Spot Comparison Radar View Modal) */}
              <button
                id="btn-bulk-compare-radar"
                data-testid="btn-compare-selected-top"
                type="button"
                onClick={handleOpenComparisonModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-xs border border-emerald-300 active:scale-95 cursor-pointer"
                title="Buka modal perbandingan Radar Chart multi-dimensi untuk titik terpilih"
              >
                <Scale className="w-3.5 h-3.5 text-slate-950 font-bold" />
                <span>Compare Selected ({selectedIds.size})</span>
              </button>

              {/* Batch Generate PDF Proposal */}
              <button
                type="button"
                onClick={() => handleOpenPdfModal(selectedSpotsList)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-lg text-xs transition-all shadow-xs border border-red-400/40 active:scale-95 cursor-pointer"
                title="Generate PDF Proposal resmi dengan jsPDF untuk titik media terpilih (Cover Klien, Spesifikasi Teknis, Audit Visual & Estimasi ROI/Reach)"
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>Batch Generate PDF ({selectedIds.size})</span>
              </button>

              {/* Batch Share to WhatsApp */}
              <button
                id="btn-batch-share-whatsapp-bulk"
                type="button"
                onClick={() => {
                  openMultipleSpotsDirectWhatsApp(selectedSpotsList, true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
                title="Buka WhatsApp Web (+62 87822248975) untuk membagikan rincian titik terpilih ke Admin Suherman Reklame"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
                <span>Batch Share to WhatsApp ({selectedIds.size})</span>
              </button>

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

              {/* Export Selected to Excel CSV */}
              <button
                id="btn-export-selected-excel"
                onClick={handleExportSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold rounded-lg text-xs transition-colors border border-slate-700 active:scale-95 cursor-pointer shadow-2xs"
                title="Unduh data titik terpilih ke berkas CSV Excel untuk pelaporan offline"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Terpilih to Excel ({selectedIds.size})</span>
              </button>

              {/* Bulk Delete Selected Spots */}
              {onBulkDeleteSpots && (
                <button
                  id="btn-bulk-delete-spots"
                  type="button"
                  onClick={() => setIsConfirmBulkDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors shadow-xs border border-rose-400/50 active:scale-95 cursor-pointer"
                  title={`Hapus ${selectedIds.size} titik media terpilih dari database`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>Hapus Terpilih ({selectedIds.size})</span>
                </button>
              )}

              {/* AI Proposal Outreach for selected */}
              {onOpenAiProposal && (
                <button
                  onClick={() => {
                    onOpenAiProposal(selectedSpotsList);
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

        {/* View Mode Switching: Spot Comparison vs Compact List Table vs Detailed Card Grid */}
        {viewMode === 'compare' ? (
          <div className="p-4 sm:p-5">
            <SpotComparisonView
              allSpots={spots}
              comparedSpots={effectiveComparedSpots}
              onAddSpotToCompare={handleAddSpotToCompare}
              onRemoveSpotFromCompare={handleRemoveSpotFromCompare}
              onClearComparison={handleClearComparison}
              onSelectSpot={onSelectSpot}
              onBackToTable={() => setViewMode('list')}
              onOpenPdfModal={handleOpenPdfModal}
              onOpenRoiCalculator={onOpenRoiCalculator}
            />
          </div>
        ) : viewMode === 'list' ? (
          /* Responsive Table (Compact List View) */
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-800 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                {/* Quick Compare Checkbox Column */}
                <th className="py-3 px-3 w-14 text-center">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <button
                      id="btn-toggle-select-all-page"
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
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Compare</span>
                  </div>
                </th>
                <th className="py-3 px-2 w-8 text-center">No</th>
                <th 
                  id="th-col-name"
                  onClick={() => handleSort('name')}
                  className={`py-3 px-4 cursor-pointer select-none transition-colors group ${
                    sortField === 'name' 
                      ? 'bg-emerald-50 text-emerald-950 font-bold border-b-2 border-emerald-600' 
                      : 'hover:bg-slate-200'
                  }`}
                  title={`Urutkan Nama Lokasi: Saat ini ${sortField === 'name' ? (sortOrder === 'asc' ? 'A ke Z' : 'Z ke A') : 'belum aktif'}. Klik untuk ubah.`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lokasi & Jalan</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>
                <th 
                  id="th-col-city"
                  onClick={() => handleSort('city')}
                  className={`py-3 px-3 cursor-pointer select-none transition-colors group ${
                    sortField === 'city' 
                      ? 'bg-emerald-50 text-emerald-950 font-bold border-b-2 border-emerald-600' 
                      : 'hover:bg-slate-200'
                  }`}
                  title={`Urutkan Wilayah: Saat ini ${sortField === 'city' ? (sortOrder === 'asc' ? 'A ke Z' : 'Z ke A') : 'belum aktif'}. Klik untuk ubah.`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Wilayah & Zona</span>
                    {renderSortIndicator('city')}
                  </div>
                </th>
                <th className="py-3 px-3">Format & Ukuran</th>
                <th 
                  id="th-col-traffic"
                  onClick={() => handleSort('dailyTraffic')}
                  className={`py-3 px-3 cursor-pointer select-none transition-colors group ${
                    sortField === 'dailyTraffic' 
                      ? 'bg-emerald-50 text-emerald-950 font-bold border-b-2 border-emerald-600' 
                      : 'hover:bg-slate-200'
                  }`}
                  title={`Urutkan Volume Traffic: Saat ini ${sortField === 'dailyTraffic' ? (sortOrder === 'desc' ? 'Terpadat ke Terlengang' : 'Terlengang ke Terpadat') : 'belum aktif'}. Klik untuk ubah.`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Traffic / Hari</span>
                    {renderSortIndicator('dailyTraffic')}
                  </div>
                </th>
                <th 
                  id="th-col-daily-impressions"
                  onClick={() => handleSort('dailyImpressions')}
                  className={`py-3 px-3 cursor-pointer select-none transition-colors text-right group ${
                    sortField === 'dailyImpressions' 
                      ? 'bg-emerald-50 text-emerald-950 font-bold border-b-2 border-emerald-600 shadow-2xs' 
                      : 'hover:bg-slate-200'
                  }`}
                  title={`Urutkan Impresi Harian (OTS): Saat ini ${
                    sortField === 'dailyImpressions' 
                      ? (sortOrder === 'desc' ? 'Tertinggi ke Terendah (↓)' : 'Terendah ke Tertinggi (↑)') 
                      : 'belum aktif'
                  }. Klik untuk ubah urutan.`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Est. Impresi (OTS)</span>
                    {renderSortIndicator('dailyImpressions')}
                  </div>
                </th>
                <th 
                  id="th-col-monthly-price"
                  onClick={() => handleSort('oneMonthPrice')}
                  className={`py-3 px-3 cursor-pointer select-none transition-colors text-right group ${
                    sortField === 'oneMonthPrice' 
                      ? 'bg-emerald-50 text-emerald-950 font-bold border-b-2 border-emerald-600 shadow-2xs' 
                      : 'hover:bg-slate-200'
                  }`}
                  title={`Urutkan Tarif 1 Bulan: Saat ini ${
                    sortField === 'oneMonthPrice' 
                      ? (sortOrder === 'desc' ? 'Tertinggi ke Terendah (↓)' : 'Terendah ke Tertinggi (↑)') 
                      : 'belum aktif'
                  }. Klik untuk ubah urutan.`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Tarif 1 Bln</span>
                    {renderSortIndicator('oneMonthPrice')}
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
                      className={`group transition-all duration-150 ${
                        isSelected 
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/60 shadow-xs' 
                          : 'hover:bg-slate-100/70 hover:shadow-xs'
                      }`}
                    >
                      {/* Quick Compare Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <label
                          className="inline-flex items-center justify-center cursor-pointer p-1 rounded-md hover:bg-emerald-100/60 transition-colors select-none"
                          title={`Quick Compare: Centang untuk membandingkan "${spot.name}"`}
                        >
                          <input
                            type="checkbox"
                            id={`quick-compare-${spot.id}`}
                            data-testid={`quick-compare-checkbox-${spot.id}`}
                            checked={isSelected}
                            onChange={(e) => toggleSelectSpot(spot.id, e)}
                            className="sr-only"
                          />
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </label>
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
                        <div className="relative inline-block group/status">
                          <button
                            type="button"
                            onClick={() => onToggleAvailability(spot.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs border ${
                              spot.isAvailable
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 hover:border-emerald-300'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200 hover:border-rose-300'
                            }`}
                          >
                            {spot.isAvailable ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Tersedia</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Tersewa</span>
                              </>
                            )}
                          </button>

                          {/* Action tooltip for quick interaction */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/status:flex items-center gap-1 z-30 px-2 py-1 bg-slate-900/95 text-white text-[10px] font-medium rounded-md shadow-lg whitespace-nowrap pointer-events-none">
                            <span>Aksi Cepat: Klik untuk ubah ke {spot.isAvailable ? 'Tersewa' : 'Tersedia'}</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900/95" />
                          </div>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onEditSpot && (
                            <button
                              onClick={() => onEditSpot(spot)}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Edit Data Titik Media"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteSpot && (
                            <button
                              type="button"
                              onClick={() => setSpotToDelete(spot)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Titik Media dari Database"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectSpot(spot)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Lihat Detail & Spesifikasi"
                          >
                            <Info className="w-4 h-4" />
                          </button>

                          {/* Spot Comparison Radar Quick Action */}
                          <button
                            type="button"
                            onClick={() => {
                              handleAddSpotToCompare(spot.id);
                              setViewMode('compare');
                            }}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              comparedSpotIds.includes(spot.id) || selectedIds.has(spot.id)
                                ? 'text-emerald-700 bg-emerald-100 font-bold'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title="Bandingkan titik ini di Spot Comparison (Radar Chart)"
                          >
                            <Scale className="w-4 h-4" />
                          </button>

                          {/* Generate Single-Spot PDF Proposal */}
                          <button
                            type="button"
                            onClick={() => handleOpenPdfModal([spot])}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Generate PDF Proposal Resmi untuk titik ini"
                          >
                            <FileDown className="w-4 h-4 text-rose-500" />
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
        ) : (
          /* Detailed Card View Grid */
          <div id="media-card-grid-container" className="p-4 sm:p-5 bg-slate-50/60 min-h-[400px]">
            {paginatedSpots.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Tidak ada titik media yang sesuai dengan kriteria filter saat ini.</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter wilayah, tipe media, atau pencarian Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {paginatedSpots.map((spot, idx) => {
                  const isDooh = spot.category === 'DOOH_DIGITAL';
                  const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isSelected = selectedIds.has(spot.id);

                  return (
                    <div
                      key={spot.id}
                      id={`spot-card-${spot.id}`}
                      className={`group bg-white rounded-xl border transition-all duration-200 flex flex-col overflow-hidden shadow-2xs hover:shadow-md ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/15'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Card Media Preview Header */}
                      <div className="relative aspect-16/9 bg-slate-900 overflow-hidden">
                        {spot.photoUrl ? (
                          <img
                            src={spot.photoUrl}
                            alt={spot.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-linear-to-br from-slate-800 to-slate-900 p-4 text-center">
                            <Layers className="w-8 h-8 mb-1.5 opacity-40 text-emerald-400" />
                            <span className="text-[11px] font-medium text-slate-300">{spot.name}</span>
                          </div>
                        )}

                        {/* Top Gradient for Badge Readability */}
                        <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-transparent to-slate-950/50 pointer-events-none" />

                        {/* Top-Left: Quick Compare Checkbox & Index Badge */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                          <label
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-xs transition-colors cursor-pointer border border-white/20 select-none text-[10px] font-semibold shadow-xs"
                            title={isSelected ? 'Hapus dari Quick Compare' : 'Centang untuk Quick Compare'}
                          >
                            <input
                              type="checkbox"
                              id={`quick-compare-card-${spot.id}`}
                              data-testid={`quick-compare-card-checkbox-${spot.id}`}
                              checked={isSelected}
                              onChange={(e) => toggleSelectSpot(spot.id, e)}
                              className="sr-only"
                            />
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-white/80" />
                            )}
                            <span>Compare</span>
                          </label>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-bold text-white border border-white/10">
                            #{rowNum}
                          </span>
                        </div>

                        {/* Top-Right: Interactive Availability Status Toggle */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <button
                            type="button"
                            onClick={() => onToggleAvailability(spot.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md transition-all active:scale-95 cursor-pointer border shadow-sm ${
                              spot.isAvailable
                                ? 'bg-emerald-500/90 text-white border-emerald-400 hover:bg-emerald-600'
                                : 'bg-rose-500/90 text-white border-rose-400 hover:bg-rose-600'
                            }`}
                            title={`Status: ${spot.isAvailable ? 'Tersedia' : 'Tersewa'}. Klik untuk mengubah status.`}
                          >
                            {spot.isAvailable ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-white" />
                                <span>Tersedia</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-white" />
                                <span>Tersewa</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Bottom Overlay: Type & Dimension Badges */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white z-10">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-xs backdrop-blur-xs ${
                            isDooh
                              ? 'bg-purple-600/90 text-white border border-purple-400'
                              : 'bg-slate-800/90 text-white border border-slate-600'
                          }`}>
                            {isDooh ? 'DOOH Megatron' : spot.mediaType}
                          </span>
                          <span className="text-[11px] font-semibold bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-xs border border-white/10">
                            {spot.size} {spot.layout ? `• ${spot.layout}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Card Content & Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          {/* Location Name */}
                          <h4
                            onClick={() => onSelectSpot(spot)}
                            className="font-bold text-sm text-slate-900 hover:text-emerald-700 cursor-pointer line-clamp-1 transition-colors"
                            title={spot.name}
                          >
                            {spot.name}
                          </h4>
                          
                          {/* Road & District */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{spot.roadName || spot.district}, {spot.city}</span>
                          </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                          <div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Car className="w-3 h-3 text-blue-500" />
                              Trafik / Hari
                            </div>
                            <div className="font-bold text-slate-800 mt-0.5">
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
                          </div>

                          <div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-emerald-500" />
                              Est. Impresi (OTS)
                            </div>
                            <div className="font-extrabold text-emerald-600 mt-0.5">
                              {formatCompactNumber(spot.dailyImpressions)} OTS
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Skor: {spot.visibilityScore}/100
                            </div>
                          </div>
                        </div>

                        {/* Pricing & Quick Action Buttons Footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase font-medium tracking-wider">Tarif 1 Bulan</div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {formatIDR(spot.pricing.oneMonth)}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onSelectSpot(spot)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Lihat Detail Lengkap Titik"
                            >
                              <Info className="w-4 h-4" />
                            </button>

                            {/* Spot Comparison Quick Action */}
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSpotToCompare(spot.id);
                                setViewMode('compare');
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                comparedSpotIds.includes(spot.id) || selectedIds.has(spot.id)
                                  ? 'text-emerald-700 bg-emerald-100 font-bold'
                                  : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title="Bandingkan titik ini di Spot Comparison (Radar Chart)"
                            >
                              <Scale className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenPdfModal([spot])}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Download PDF Proposal Resmi (jsPDF)"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>

                            {onOpenRoiCalculator && (
                              <button
                                type="button"
                                onClick={() => onOpenRoiCalculator(spot)}
                                className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Kalkulator ROI & Estimasi Konversi"
                              >
                                <TrendingUp className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openSpotDirectWhatsApp(spot, true)}
                              className="p-1.5 text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Bagikan ke WhatsApp Admin (+62 87822248975)"
                            >
                              <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]/20" />
                            </button>

                            {onEditSpot && (
                              <button
                                type="button"
                                onClick={() => onEditSpot(spot)}
                                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Data Titik"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {onDeleteSpot && (
                              <button
                                type="button"
                                onClick={() => setSpotToDelete(spot)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Titik Media dari Database"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer (Only for List & Card View) */}
        {viewMode !== 'compare' && (
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
        )}

      </div>

      {/* Executive PDF Proposal Generator Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-auto flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <FileText className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
                    Executive PDF Proposal Generator
                    <span className="text-[10px] font-semibold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                      jsPDF Engine
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Menghasilkan PDF penawaran resmi standar korporat ({pdfTargetSpots.length} titik media terpilih)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs text-slate-700">
              
              {/* Client Selection / Information */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Building className="w-3.5 h-3.5 text-emerald-600" />
                    Informasi Klien (Halaman Sampul / Cover Page)
                  </span>
                  {savedClients.length > 0 && (
                    <select
                      onChange={(e) => handleSelectSavedClient(e.target.value)}
                      className="text-[11px] bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Pilih dari Kontak Tersimpan --</option>
                      {savedClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company} ({c.name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nama Lengkap Klien
                    </label>
                    <input
                      type="text"
                      value={pdfClientName}
                      onChange={(e) => setPdfClientName(e.target.value)}
                      placeholder="e.g. Bpk. Hendra Wijaya"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nama Perusahaan / Brand
                    </label>
                    <input
                      type="text"
                      value={pdfClientCompany}
                      onChange={(e) => setPdfClientCompany(e.target.value)}
                      placeholder="e.g. PT Astra International Tbk"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Jabatan / Posisi
                    </label>
                    <input
                      type="text"
                      value={pdfClientRole}
                      onChange={(e) => setPdfClientRole(e.target.value)}
                      placeholder="e.g. Brand & Marketing Director"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nomor Kontak / WhatsApp Klien
                    </label>
                    <input
                      type="text"
                      value={pdfClientPhone}
                      onChange={(e) => setPdfClientPhone(e.target.value)}
                      placeholder="e.g. 0812-2002-390"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Campaign Duration Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Pilih Periode Sewa / Durasi Kampanye
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['1 Bulan', '3 Bulan', '6 Bulan', '1 Tahun'] as ProposalDuration[]).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setPdfDuration(dur)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer ${
                        pdfDuration === dur
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>{dur}</div>
                      <div className="text-[10px] font-normal opacity-80">
                        {dur === '1 Bulan' ? 'Tarif Dasar' : dur === '3 Bulan' ? 'Hemat 5%' : dur === '6 Bulan' ? 'Hemat 10%' : 'Hemat 15%'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Reach & ROI Summary */}
              {pdfAnalytics && (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Ringkasan Estimasi ROI & Jangkauan (Dihitung Sistem)
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="text-[10px] text-slate-500">Titik Terpilih</div>
                      <div className="text-sm font-bold text-slate-900">{pdfAnalytics.totalSpots} Lokasi</div>
                      <div className="text-[10px] text-emerald-600 font-medium">Jawa Barat Prime</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="text-[10px] text-slate-500">Estimasi Impresi (OTS)</div>
                      <div className="text-sm font-bold text-emerald-600">
                        {formatCompactNumber(pdfAnalytics.totalMonthlyImpressions)} OTS
                      </div>
                      <div className="text-[10px] text-slate-400">/ bulan kampanye</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="text-[10px] text-slate-500">Volume Trafik</div>
                      <div className="text-sm font-bold text-blue-600">
                        ~{formatCompactNumber(pdfAnalytics.totalDailyTraffic)}
                      </div>
                      <div className="text-[10px] text-slate-400">kendaraan / hari</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="text-[10px] text-slate-500">Efisiensi Biaya (CPM)</div>
                      <div className="text-sm font-bold text-indigo-600">
                        Rp {pdfAnalytics.financials.effectiveCPM.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400">per 1.000 OTS</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-xs">
                    <span className="font-medium text-slate-700">Total Investasi Paket ({pdfDuration}):</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      {formatIDR(pdfAnalytics.financials.packageTotalCost)}
                    </span>
                  </div>
                </div>
              )}

              {/* Selected Media Spots List Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>Daftar Titik Media Termasuk ({pdfTargetSpots.length} titik)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Disertai foto visual & spesifikasi teknis</span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {pdfTargetSpots.map((spot, idx) => (
                    <div key={spot.id} className="p-2 flex items-center justify-between text-[11px] hover:bg-slate-50">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-4 text-slate-400 text-[10px] text-center">{idx + 1}</span>
                        <div className="truncate">
                          <div className="font-semibold text-slate-900 truncate">{spot.name}</div>
                          <div className="text-[10px] text-slate-500">{spot.city} • {spot.mediaType} ({spot.size})</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-slate-800">{formatIDR(spot.pricing.oneMonth)}</div>
                        <div className="text-[10px] text-emerald-600">{formatCompactNumber(spot.dailyImpressions)} OTS/hari</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Sales Notes */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Catatan Khusus / Pesan Tambahan (Opsional di PDF)
                </label>
                <textarea
                  rows={2}
                  value={pdfCustomNote}
                  onChange={(e) => setPdfCustomNote(e.target.value)}
                  placeholder="e.g. Paket mencakup garansi penerangan lampu malam, cetak banner vinyl Flexi Korea 440gr, dan izin legalitas Pemda."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                disabled={isGeneratingPdf}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors text-xs cursor-pointer disabled:opacity-50"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handleExecuteGeneratePdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-lg text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyusun Dokumen & Memuat Foto...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-white" />
                    <span>Download PDF Proposal ({pdfTargetSpots.length} Titik)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Persistent Floating 'Compare Selected' Dock (Visible when 2 or more spots are checked) */}
      {selectedIds.size >= 2 && (
        <div
          id="persistent-compare-selected-dock"
          data-testid="persistent-compare-selected-dock"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 text-white rounded-2xl shadow-2xl backdrop-blur-md border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              <strong className="text-emerald-400 font-bold text-sm">{selectedIds.size}</strong> Titik Terpilih
            </span>
          </div>

          {/* Persistent Compare Selected Button */}
          <button
            id="btn-compare-selected"
            data-testid="btn-compare-selected"
            type="button"
            onClick={handleOpenComparisonModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            title="Buka modal perbandingan side-by-side radar chart untuk titik-titik terpilih"
          >
            <Scale className="w-4 h-4 fill-slate-950" />
            <span>Compare Selected ({selectedIds.size})</span>
          </button>

          {/* Quick Clear Selection */}
          <button
            id="btn-clear-persistent-compare"
            type="button"
            onClick={clearSelection}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            title="Batal pilih semua titik"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Side-by-Side Radar Chart Comparison Modal */}
      {isCompareModalOpen && (
        <div
          id="modal-side-by-side-comparison"
          data-testid="modal-side-by-side-comparison"
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-7xl max-h-[92vh] bg-slate-50 rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>Side-by-Side Radar Chart Comparison</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                      {effectiveComparedSpots.length} Titik Terpilih
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Analisis multi-dimensi perbandingan titik: Potensi Paparan OTS, Volume Lalu Lintas, Efisiensi CPM, Dimensi Media, dan Visibilitas
                  </p>
                </div>
              </div>

              <button
                id="btn-close-comparison-modal"
                data-testid="btn-close-comparison-modal"
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Tutup Modal Perbandingan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: SpotComparisonView */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <SpotComparisonView
                allSpots={spots}
                comparedSpots={effectiveComparedSpots}
                onAddSpotToCompare={handleAddSpotToCompare}
                onRemoveSpotFromCompare={handleRemoveSpotFromCompare}
                onClearComparison={handleClearComparison}
                onSelectSpot={(spot) => {
                  setIsCompareModalOpen(false);
                  onSelectSpot(spot);
                }}
                onBackToTable={() => setIsCompareModalOpen(false)}
                onOpenPdfModal={(targets) => {
                  setIsCompareModalOpen(false);
                  handleOpenPdfModal(targets);
                }}
                onOpenRoiCalculator={(spot) => {
                  setIsCompareModalOpen(false);
                  onOpenRoiCalculator?.(spot);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Spot */}
      {spotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-rose-900 to-rose-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/30 border border-rose-400/40 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-rose-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Hapus Titik Media</h3>
                  <p className="text-[11px] text-rose-200">Konfirmasi penghapusan dari database inventaris</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpotToDelete(null)}
                className="p-1 text-rose-300 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  Apakah Anda yakin ingin menghapus titik media ini dari database? Tindakan ini akan menghapus data titik dari penyimpanan lokal dan Cloud Firestore.
                </div>
              </div>

              {/* Spot Details Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                    {spotToDelete.id}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {spotToDelete.city}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {spotToDelete.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {spotToDelete.roadName || spotToDelete.district}
                </div>
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span>{spotToDelete.mediaType} ({spotToDelete.size})</span>
                  <span className="font-bold text-slate-900">{formatIDR(spotToDelete.pricing.oneMonth)}/bln</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSpotToDelete(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSpot && spotToDelete) {
                    onDeleteSpot(spotToDelete.id);
                    setSpotToDelete(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Titik</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Bulk Spots */}
      {isConfirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-rose-900 to-rose-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/30 border border-rose-400/40 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-rose-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Hapus {selectedIds.size} Titik Terpilih</h3>
                  <p className="text-[11px] text-rose-200">Konfirmasi penghapusan massal dari database inventaris</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmBulkDeleteOpen(false)}
                className="p-1 text-rose-300 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  Perhatian: Anda akan menghapus <strong>{selectedIds.size} titik media</strong> sekaligus dari inventaris. Tindakan ini akan menghapus data dari memori lokal dan sinkronisasi Cloud Firestore.
                </div>
              </div>

              {/* List of selected spots preview */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-700">Daftar Titik yang akan Dihapus:</div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {selectedSpotsList.map((s, idx) => (
                    <div key={s.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-[11px] truncate">
                          {idx + 1}. {s.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {s.city} • {s.size} • {s.id}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 shrink-0">
                        {formatIDR(s.pricing.oneMonth)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmBulkDeleteOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onBulkDeleteSpots && selectedIds.size > 0) {
                    onBulkDeleteSpots(Array.from(selectedIds));
                    clearSelection();
                    setIsConfirmBulkDeleteOpen(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus {selectedIds.size} Titik</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
