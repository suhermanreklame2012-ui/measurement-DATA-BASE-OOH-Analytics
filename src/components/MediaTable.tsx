import React, { useState, useMemo, useEffect } from 'react';
import { MediaSpot, ClientContact, ProposalDuration, FilterState, MediaCategory, MediaType } from '../types/ooh';
import { PerformanceOverview } from './PerformanceOverview';
import { SpotComparisonView } from './SpotComparisonView';
import { VisibleSpotsReachLineChart } from './VisibleSpotsReachLineChart';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';
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
  Plus,
  SlidersHorizontal,
  Flame,
  Bell,
  Sliders,
  Tag,
  CheckCheck,
  RefreshCw,
  Award,
  ShieldCheck,
  Printer
} from 'lucide-react';
import { calculateDemandMetrics } from '../services/availabilityAlertService';
import { parseSpotDimensions } from './DirectComparisonSpecTable';
import { AnalyticsSourceModal } from './AnalyticsSourceModal';

interface MediaTableProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
  onEditSpot?: (spot: MediaSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
  onBulkDeleteSpots?: (spotIds: string[]) => void;
  onAddSpot?: () => void;
  onToggleAvailability: (spotId: string) => void;
  onBulkUpdateAvailability: (spotIds: string[], isAvailable: boolean) => void;
  onBulkUpdateSpots?: (
    spotIds: string[], 
    updates: { isAvailable?: boolean; category?: MediaCategory; mediaType?: MediaType }
  ) => void;
  onOpenAiProposal?: (spots: MediaSpot[]) => void;
  onOpenRoiCalculator?: (spot: MediaSpot) => void;
  onOpenAvailabilityQueue?: () => void;
  filter?: FilterState;
  onSelectRegion?: (region: string) => void;
  isAdmin?: boolean;
  onRequestAdminLogin?: (reason?: string) => void;
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
  onBulkUpdateSpots,
  onOpenAiProposal,
  onOpenRoiCalculator,
  onOpenAvailabilityQueue,
  filter,
  onSelectRegion,
  isAdmin = false,
  onRequestAdminLogin
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('dailyImpressions');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Demand Queue Update Tick & Metrics
  const [demandUpdateTick, setDemandUpdateTick] = useState<number>(0);

  useEffect(() => {
    const handleAlertChange = () => setDemandUpdateTick(t => t + 1);
    window.addEventListener('ooh_availability_alert_updated', handleAlertChange);
    window.addEventListener('ooh_availability_alert_added', handleAlertChange);
    return () => {
      window.removeEventListener('ooh_availability_alert_updated', handleAlertChange);
      window.removeEventListener('ooh_availability_alert_added', handleAlertChange);
    };
  }, []);

  const demandMetrics = useMemo(() => {
    return calculateDemandMetrics(spots);
  }, [spots, demandUpdateTick]);

  // Bulk Selection State & Quick Compare State (Max 3 spots for Compare)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparedSpotIds, setComparedSpotIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [compareModalTab, setCompareModalTab] = useState<'matrix' | 'radar'>('matrix');

  // Bulk Edit Modal State (Ubah Status Ketersediaan & Kategori Massal)
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState<boolean>(false);
  const [bulkAvailabilityChoice, setBulkAvailabilityChoice] = useState<'UNCHANGED' | 'AVAILABLE' | 'BOOKED'>('UNCHANGED');
  const [bulkCategoryChoice, setBulkCategoryChoice] = useState<string>('UNCHANGED');
  const [isExecutingBulkEdit, setIsExecutingBulkEdit] = useState<boolean>(false);

  // Line Chart State (Total Monthly Impressions Trend & Cumulative Reach Potential in Table Header)
  const [showReachLineChart, setShowReachLineChart] = useState<boolean>(true);

  // Analytics Data Source & Accuracy Audit Modal State
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [activeSourceMetricKey, setActiveSourceMetricKey] = useState<'traffic' | 'impressions' | 'visibility' | 'demographics' | 'roi_cpm'>('traffic');

  // Deletion Confirmation States
  const [spotToDelete, setSpotToDelete] = useState<MediaSpot | null>(null);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState<boolean>(false);

  // Print Mode State: ensures complete table content is rendered in print-friendly format
  const [isPrintingAll, setIsPrintingAll] = useState<boolean>(false);

  const handlePrintReport = () => {
    // If in card or compare view mode, ensure list view is active for full tabular layout
    if (viewMode !== 'list') {
      setViewMode('list');
    }
    setIsPrintingAll(true);
    // Allow DOM to re-render all rows in list view, then open native browser print dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrintingAll(true);
      setViewMode('list');
    };
    const handleAfterPrint = () => {
      setIsPrintingAll(false);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handleOpenComparisonModal = () => {
    if (selectedIds.size >= 1) {
      setComparedSpotIds(Array.from(selectedIds).slice(0, 3));
    } else if (comparedSpotIds.length < 2) {
      const fallback = spots.slice(0, 3).map((s) => s.id);
      setComparedSpotIds(fallback);
    }
    setIsCompareModalOpen(true);
  };

  // Effective spots currently being compared in the Side-by-Side Comparison (Max 3 spots)
  const effectiveComparedSpots = useMemo(() => {
    const spotMap = new Map(spots.map((s) => [s.id, s]));
    
    if (comparedSpotIds.length > 0) {
      const list = comparedSpotIds.map((id) => spotMap.get(id)).filter(Boolean) as MediaSpot[];
      if (list.length > 0) return list.slice(0, 3);
    }

    if (selectedIds.size >= 1) {
      const list = Array.from(selectedIds).map((id) => spotMap.get(id)).filter(Boolean) as MediaSpot[];
      if (list.length > 0) return list.slice(0, 3);
    }

    return spots.slice(0, 3);
  }, [comparedSpotIds, selectedIds, spots]);

  // Computed highlights & benchmarks for side-by-side comparison
  const comparisonBenchmarks = useMemo(() => {
    if (effectiveComparedSpots.length === 0) {
      return { highestTrafficId: '', lowestPriceId: '', highestImpressionsId: '', highestVisibilityId: '' };
    }

    let highestTraffic = -1;
    let highestTrafficId = '';
    let lowestPrice = Infinity;
    let lowestPriceId = '';
    let highestImpressions = -1;
    let highestImpressionsId = '';
    let highestVisibility = -1;
    let highestVisibilityId = '';

    effectiveComparedSpots.forEach((spot) => {
      const traffic = spot.dailyTraffic || 0;
      if (traffic > highestTraffic) {
        highestTraffic = traffic;
        highestTrafficId = spot.id;
      }

      const price = spot.pricing?.oneMonth || 0;
      if (price > 0 && price < lowestPrice) {
        lowestPrice = price;
        lowestPriceId = spot.id;
      }

      const impressions = spot.dailyImpressions || 0;
      if (impressions > highestImpressions) {
        highestImpressions = impressions;
        highestImpressionsId = spot.id;
      }

      const vis = spot.visibilityScore || 0;
      if (vis > highestVisibility) {
        highestVisibility = vis;
        highestVisibilityId = spot.id;
      }
    });

    return {
      highestTrafficId,
      lowestPriceId,
      highestImpressionsId,
      highestVisibilityId
    };
  }, [effectiveComparedSpots]);

  const handleAddSpotToCompare = (spotId: string) => {
    setComparedSpotIds((prev) => {
      const base = prev.length > 0 ? prev : effectiveComparedSpots.map((s) => s.id);
      if (base.includes(spotId)) return base;
      if (base.length >= 3) {
        addNotification({
          title: 'Maksimal 3 Titik',
          message: 'Fitur Compare mendukung perbandingan maksimal 3 titik media secara berdampingan.',
          type: 'system'
        });
        return base;
      }
      return [...base, spotId];
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.size < 3) next.add(spotId);
      return next;
    });
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
    setSelectedIds(new Set());
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

  // Displayed spots: when printing, render all sorted spots for a complete document; otherwise current page
  const displayTableSpots = useMemo(() => {
    return isPrintingAll ? sortedSpots : paginatedSpots;
  }, [isPrintingAll, sortedSpots, paginatedSpots]);

  // Page selection helpers
  const pageSpotIds = useMemo(() => paginatedSpots.map((s) => s.id), [paginatedSpots]);
  const allSpotsIds = useMemo(() => sortedSpots.map((s) => s.id), [sortedSpots]);

  const isAllPageSelected = pageSpotIds.length > 0 && pageSpotIds.every((id) => selectedIds.has(id));
  const isSomePageSelected = pageSpotIds.some((id) => selectedIds.has(id)) && !isAllPageSelected;
  const isAllTotalSelected = allSpotsIds.length > 0 && allSpotsIds.every((id) => selectedIds.has(id));

  // Toggle single item selection / Compare (Max 3 spots)
  const toggleSelectSpot = (id: string, e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) {
          addNotification({
            title: 'Maksimal 3 Titik untuk Compare',
            message: 'Fitur Compare mendukung perbandingan maksimal 3 titik reklame secara bersamaan. Hapus salah satu pilihan terlebih dahulu untuk memilih titik lain.',
            type: 'system'
          });
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  // Toggle page selection checkbox (Select up to 3 spots on current page)
  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected || next.size >= 3) {
        // Uncheck all on current page
        pageSpotIds.forEach((id) => next.delete(id));
      } else {
        // Check up to 3 on current page for comparison
        pageSpotIds.slice(0, 3).forEach((id) => next.add(id));
        if (pageSpotIds.length > 3) {
          addNotification({
            title: '3 Titik Dipilih untuk Compare',
            message: 'Maksimal 3 titik pada halaman dipilih untuk perbandingan side-by-side.',
            type: 'system'
          });
        }
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
    if (!isAdmin) {
      if (onRequestAdminLogin) {
        onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengubah status ketersediaan titik reklame secara massal.');
      }
      return;
    }
    const idsArray = Array.from(selectedIds);
    if (onBulkUpdateSpots) {
      onBulkUpdateSpots(idsArray, { isAvailable });
    } else {
      onBulkUpdateAvailability(idsArray, isAvailable);
    }
  };

  // Bulk update category handler (Quick inline select)
  const handleQuickBulkCategory = (rawChoice: string) => {
    if (!rawChoice || rawChoice === 'UNCHANGED' || !rawChoice.includes('|')) return;
    if (!isAdmin) {
      if (onRequestAdminLogin) {
        onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengubah kategori beberapa titik reklame sekaligus.');
      }
      return;
    }
    const [c, m] = rawChoice.split('|');
    const spotIds = Array.from(selectedIds);
    if (onBulkUpdateSpots) {
      onBulkUpdateSpots(spotIds, {
        category: c as MediaCategory,
        mediaType: m as MediaType
      });
    }
  };

  // Comprehensive bulk execute handler (from modal)
  const handleExecuteBulkEdit = () => {
    if (selectedIds.size === 0) return;
    if (!isAdmin) {
      if (onRequestAdminLogin) {
        onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengubah status atau kategori titik reklame secara massal.');
      }
      return;
    }

    const spotIds = Array.from(selectedIds);
    let isAvailableVal: boolean | undefined = undefined;
    if (bulkAvailabilityChoice === 'AVAILABLE') isAvailableVal = true;
    if (bulkAvailabilityChoice === 'BOOKED') isAvailableVal = false;

    let catVal: MediaCategory | undefined = undefined;
    let mediaTypeVal: MediaType | undefined = undefined;

    if (bulkCategoryChoice !== 'UNCHANGED' && bulkCategoryChoice.includes('|')) {
      const [c, m] = bulkCategoryChoice.split('|');
      catVal = c as MediaCategory;
      mediaTypeVal = m as MediaType;
    }

    if (isAvailableVal === undefined && !catVal) {
      setIsBulkEditModalOpen(false);
      return;
    }

    setIsExecutingBulkEdit(true);

    if (onBulkUpdateSpots) {
      onBulkUpdateSpots(spotIds, {
        isAvailable: isAvailableVal,
        category: catVal,
        mediaType: mediaTypeVal
      });
    } else if (isAvailableVal !== undefined) {
      onBulkUpdateAvailability(spotIds, isAvailableVal);
    }

    setIsExecutingBulkEdit(false);
    setIsBulkEditModalOpen(false);
    // Reset selection & choices
    setBulkAvailabilityChoice('UNCHANGED');
    setBulkCategoryChoice('UNCHANGED');
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

  // Export spots to JSON for local backup or data migration
  const handleExportToJSON = (targetCustomSpots?: MediaSpot[]) => {
    const rawTarget = targetCustomSpots || (sortedSpots.length > 0 ? sortedSpots : spots);
    if (!rawTarget || rawTarget.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const availableCount = rawTarget.filter((s) => s.isAvailable).length;
    const bookedCount = rawTarget.length - availableCount;
    const totalMonthlyValue = rawTarget.reduce((acc, s) => acc + (s.pricing?.oneMonth || 0), 0);
    const totalDailyImpressions = rawTarget.reduce((acc, s) => acc + (s.dailyImpressions || 0), 0);
    const totalDailyTraffic = rawTarget.reduce((acc, s) => acc + (s.dailyTraffic || 0), 0);

    const backupPayload = {
      system: 'OOH & DOOH Jabar Analytics',
      exportType: targetCustomSpots ? 'selected_spots_backup' : 'full_inventory_backup',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: isAdmin ? 'Administrator' : 'Pengguna Publik',
      totalSpots: rawTarget.length,
      metricsSummary: {
        totalMonthlyInventoryValue: totalMonthlyValue,
        totalDailyImpressions,
        totalDailyTraffic,
        availableSpots: availableCount,
        bookedSpots: bookedCount
      },
      spots: rawTarget
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = targetCustomSpots 
      ? `OOH_Jabar_Selected_Spots_Backup_${timestamp}.json`
      : `OOH_Jabar_Inventory_Backup_${timestamp}.json`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addNotification({
      title: 'Export to JSON Berhasil',
      message: `${rawTarget.length} data inventaris media berhasil diunduh ke berkas "${filename}" untuk backup lokal & migrasi.`,
      type: 'create'
    });
  };

  const handleExportSelectedJSON = () => {
    if (selectedIds.size === 0) return;
    const selectedSpots = spots.filter((s) => selectedIds.has(s.id));
    handleExportToJSON(selectedSpots);
  };

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
  const [pdfClientPhone, setPdfClientPhone] = useState<string>('0878-2224-8975');
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
        phone: pdfClientPhone.trim() || '0878-2224-8975',
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

            {/* Compare Spots Button (Visible when spots selected) */}
            {selectedIds.size >= 1 && (
              <button
                id="btn-compare-spots-toolbar"
                data-testid="btn-compare-spots-toolbar"
                type="button"
                onClick={handleOpenComparisonModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-lg border border-emerald-300 text-xs transition-all shadow-sm active:scale-95 cursor-pointer animate-in fade-in"
                title="Compare Spots: Buka perbandingan side-by-side untuk traffic, price, dan media type titik terpilih (Maks. 3 titik)"
              >
                <Scale className="w-4 h-4 fill-slate-950" />
                <span>Compare Spots ({Math.min(selectedIds.size, 3)}/3)</span>
              </button>
            )}

            {/* Availability Demand Queue Button */}
            {onOpenAvailabilityQueue && (
              <button
                id="btn-open-demand-queue-toolbar"
                data-testid="btn-open-demand-queue-toolbar"
                type="button"
                onClick={onOpenAvailabilityQueue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 via-slate-800 to-slate-800 hover:from-amber-500/30 hover:to-slate-700 text-amber-300 font-bold rounded-lg border border-amber-500/40 text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Buka Antrean Ketersediaan & Analisis Demand Titik Tersewa"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Demand Queue ({demandMetrics.totalQueueCount})</span>
                {demandMetrics.totalBookedWithDemand > 0 && (
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 text-[10px] font-mono">
                    {demandMetrics.totalBookedWithDemand} Tersewa
                  </span>
                )}
              </button>
            )}

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
              title="Kirim rincian paket titik terpilih via WhatsApp ke 0878-2224-8975 atas nama Suherman"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
              <span>
                Batch Share to WhatsApp {selectedIds.size > 0 ? `(${selectedIds.size})` : `(${paginatedSpots.length})`}
              </span>
            </button>

            {/* Toggle Total Monthly Impressions Trend Line Chart */}
            <button
              id="btn-toggle-impressions-trend-chart"
              data-testid="btn-toggle-impressions-trend-chart"
              type="button"
              onClick={() => setShowReachLineChart(!showReachLineChart)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 active:scale-95 font-semibold rounded-lg border shadow-2xs text-xs transition-all cursor-pointer ${
                showReachLineChart
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Tampilkan / Sembunyikan grafik Recharts tren Total Monthly Impressions (OTS) dan potensi jangkauan kumulatif titik terlihat"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tren Impresi (OTS)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                showReachLineChart ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-900 text-slate-400'
              }`}>
                {paginatedSpots.length}
              </span>
            </button>

            {/* Audit Data Sources & Calculation Accuracy Button */}
            <button
              id="btn-open-analytics-source-modal-table"
              data-testid="btn-open-analytics-source-modal-table"
              type="button"
              onClick={() => {
                setActiveSourceMetricKey('traffic');
                setIsSourceModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 active:scale-95 font-semibold rounded-lg border shadow-2xs text-xs transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
              title="Buka rincian transparansi sumber pengambilan data (Dishub Jabar, BPS, WOO) dan persentase akurasi perhitungan"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sumber Data &amp; Akurasi</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                94.2%
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

            {/* Export to JSON (Local Backup & Migration) */}
            <button
              id="btn-export-to-json"
              data-testid="btn-export-to-json"
              type="button"
              onClick={() => {
                if (!isAdmin && onRequestAdminLogin) {
                  onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengunduh berkas backup JSON inventaris media.');
                  return;
                }
                handleExportToJSON();
              }}
              disabled={spots.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 active:scale-95 font-semibold rounded-lg border shadow-2xs text-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                isAdmin
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border-slate-700 hover:border-amber-400/50'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isAdmin ? `Unduh seluruh ${spots.length} data inventaris media ke format .json untuk backup lokal atau migrasi data` : "Unduh data inventaris ke format .json (Perlu Akses Admin)"}
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Export to JSON ({spots.length})</span>
              {!isAdmin && <span className="text-[10px] bg-slate-900/80 px-1 py-0.2 rounded text-slate-400 font-normal">Admin</span>}
            </button>

            {/* Add New Spot Action */}
            {onAddSpot && (
              <button
                id="btn-add-new-spot-table"
                type="button"
                onClick={() => {
                  if (!isAdmin && onRequestAdminLogin) {
                    onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menambahkan titik reklame baru.');
                    return;
                  }
                  onAddSpot();
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 active:scale-95 text-white font-bold rounded-lg border shadow-sm text-xs transition-all cursor-pointer ${
                  isAdmin 
                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500' 
                    : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
                }`}
                title={isAdmin ? "Tambah Titik Media Baru ke Database" : "Tambah Titik Media (Perlu Akses Admin)"}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Tambah Titik</span>
                {!isAdmin && <span className="text-[10px] bg-slate-800 px-1 py-0.2 rounded text-slate-300 font-normal">Admin</span>}
              </button>
            )}
          </div>
        </div>

        {/* Line Chart in MediaTable Header: displays trend of Total Monthly Impressions (OTS) and cumulative reach potential */}
        {showReachLineChart && paginatedSpots.length > 0 && (
          <VisibleSpotsReachLineChart
            visibleSpots={paginatedSpots}
            allFilteredSpots={spots}
            onSelectSpot={onSelectSpot}
            defaultExpanded={true}
          />
        )}

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

              {/* Bandingkan Titik (Compare Spots) */}
              <button
                id="btn-compare-spots-bulk"
                data-testid="btn-compare-spots"
                type="button"
                onClick={handleOpenComparisonModal}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 font-bold rounded-lg text-xs transition-all shadow-xs active:scale-95 cursor-pointer ${
                  selectedIds.size >= 1
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 border border-emerald-200 ring-2 ring-emerald-300/40'
                    : 'bg-emerald-700/80 text-white hover:bg-emerald-600 border border-emerald-500/50'
                }`}
                title="Compare Spots: Buka perbandingan side-by-side untuk traffic, price, dan media type titik terpilih"
              >
                <Scale className="w-3.5 h-3.5 fill-slate-950 font-bold" />
                <span>Compare Spots ({Math.min(selectedIds.size, 3)}/3)</span>
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
                title="Buka WhatsApp Web (0878-2224-8975 atas nama Suherman) untuk membagikan rincian titik terpilih"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
                <span>Batch Share to WhatsApp ({selectedIds.size})</span>
              </button>

              {/* MODAL AKSI MASSAL: UBAH STATUS KETERSEDIAAN & KATEGORI SEKALIGUS */}
              <button
                id="btn-open-bulk-edit-modal"
                data-testid="btn-open-bulk-edit-modal"
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    if (onRequestAdminLogin) {
                      onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengubah status ketersediaan atau kategori beberapa titik reklame sekaligus.');
                    }
                    return;
                  }
                  setIsBulkEditModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-lg text-xs transition-colors shadow-xs border border-indigo-400/40 active:scale-95 cursor-pointer"
                title={`Ubah status ketersediaan atau kategori untuk ${selectedIds.size} titik reklame sekaligus dalam satu aksi`}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-200" />
                <span>Ubah Status &amp; Kategori ({selectedIds.size})</span>
              </button>

              {/* Set to Available */}
              <button
                onClick={() => handleBulkSetStatus(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs border border-emerald-400/40 active:scale-95 cursor-pointer"
                title="Ubah semua titik terpilih menjadi Tersedia"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Set Tersedia ({selectedIds.size})
              </button>

              {/* Set to Reserved / Sold Out */}
              <button
                onClick={() => handleBulkSetStatus(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs border border-rose-400/40 active:scale-95 cursor-pointer"
                title="Ubah semua titik terpilih menjadi Tersewa / Reserved"
              >
                <XCircle className="w-3.5 h-3.5" />
                Set Tersewa / Reserved ({selectedIds.size})
              </button>

              {/* Quick Inline Bulk Category Switcher */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-xs border border-slate-700 shadow-2xs">
                <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-semibold text-[11px] text-slate-300 hidden sm:inline">Kategori Massal:</span>
                <select
                  aria-label="Pilih kategori massal untuk titik terpilih"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleQuickBulkCategory(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="bg-slate-900 text-slate-100 text-[11px] font-medium rounded px-2 py-1 border border-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Ganti Kategori ({selectedIds.size} Titik) --</option>
                  <optgroup label="DOOH Digital (Videotron)">
                    <option value="DOOH_DIGITAL|LED Videotron">DOOH - LED Videotron</option>
                    <option value="DOOH_DIGITAL|LED BANDO">DOOH - LED BANDO</option>
                    <option value="DOOH_DIGITAL|LED Pylon Berbaris">DOOH - LED Pylon Berbaris</option>
                    <option value="DOOH_DIGITAL|LED Single Pole">DOOH - LED Single Pole</option>
                  </optgroup>
                  <optgroup label="OOH Statis">
                    <option value="OOH_STATIC|Billboard Frontlite">OOH - Billboard Frontlite</option>
                    <option value="OOH_STATIC|Billboard Backlite">OOH - Billboard Backlite</option>
                    <option value="OOH_STATIC|Bando Frontlite">OOH - Bando Frontlite</option>
                    <option value="OOH_STATIC|JPO Frontlite">OOH - JPO Frontlite</option>
                    <option value="OOH_STATIC|JPO Backlite">OOH - JPO Backlite</option>
                  </optgroup>
                </select>
              </div>

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

              {/* Export Selected to JSON */}
              <button
                id="btn-export-selected-json"
                data-testid="btn-export-selected-json"
                onClick={handleExportSelectedJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-xs transition-colors border border-slate-700 active:scale-95 cursor-pointer shadow-2xs"
                title="Unduh data titik terpilih ke format berkas .json untuk backup lokal & migrasi data"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Terpilih to JSON ({selectedIds.size})</span>
              </button>

              {/* Bulk Delete Selected Spots */}
              {onBulkDeleteSpots && (
                <button
                  id="btn-bulk-delete-spots"
                  type="button"
                  onClick={() => {
                    if (!isAdmin) {
                      if (onRequestAdminLogin) {
                        onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menghapus data titik reklame.');
                      }
                      return;
                    }
                    setIsConfirmBulkDeleteOpen(true);
                  }}
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
                {/* Bulk Select & Quick Compare Checkbox Column */}
                <th className="py-3 px-3 w-16 text-center">
                  <div className="relative group/hdr flex flex-col items-center justify-center gap-0.5">
                    <button
                      id="btn-toggle-select-all-page"
                      data-testid="btn-toggle-select-all-page"
                      type="button"
                      onClick={toggleSelectPage}
                      className="text-slate-600 hover:text-emerald-700 transition-colors focus:outline-hidden cursor-pointer"
                      title={isAllPageSelected ? 'Batal pilih semua' : 'Pilih hingga maksimal 3 titik untuk dibandingkan secara side-by-side'}
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : isSomePageSelected ? (
                        <MinusSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-tight whitespace-nowrap">
                      Compare
                    </span>
                    {selectedIds.size > 0 && (
                      <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded-full">
                        {Math.min(selectedIds.size, 3)}/3
                      </span>
                    )}

                    {/* Descriptive Tooltip on Header explaining maximum 3 spots limit */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover/hdr:flex flex-col w-60 p-2.5 bg-slate-900/95 text-white text-[10px] rounded-xl shadow-2xl border border-slate-700 pointer-events-none z-50 text-left animate-in fade-in duration-150 backdrop-blur-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                        <Scale className="w-3.5 h-3.5 shrink-0" />
                        <span>Fitur Compare (Side-by-Side)</span>
                      </div>
                      <p className="text-slate-200 text-[10px] leading-relaxed">
                        Centang kotak untuk memilih hingga <strong>maksimal 3 titik reklame</strong> untuk melihat perbandingan berdampingan atas metrik Traffic, Tarif Sewa (Price), dan Tipe Media.
                      </p>
                      <div className="mt-1.5 pt-1 border-t border-slate-700/80 flex items-center justify-between text-[9px]">
                        <span className="text-slate-400">Status Pilihan:</span>
                        <span className="font-bold text-emerald-300">
                          {Math.min(selectedIds.size, 3)} dari maks. 3 titik
                        </span>
                      </div>
                    </div>
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
                  title={`Urutkan Volume Traffic: Saat ini ${sortField === 'dailyTraffic' ? (sortOrder === 'desc' ? 'Terpadat ke Terlengang' : 'Terlengang ke Terpadat') : 'belum aktif'}. Akurasi data: 94.2% (Sumber: Dishub Jawa Barat & Google Flow). Klik untuk ubah.`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Traffic / Hari</span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSourceMetricKey('traffic');
                        setIsSourceModalOpen(true);
                      }}
                      className="px-1 py-0.2 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-mono font-bold border border-blue-200" 
                      title="Akurasi 94.2% • Sumber: Dishub Jabar & Google Flow. Klik untuk audit metodologi."
                    >
                      94.2%
                    </span>
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
                  }. Akurasi perhitungan: 91.8% (Formula Standar WOO / ESOMAR & BPS Jabar). Klik untuk ubah urutan.`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSourceMetricKey('impressions');
                        setIsSourceModalOpen(true);
                      }}
                      className="px-1 py-0.2 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-mono font-bold border border-emerald-200"
                      title="Akurasi 91.8% • Sumber: Standar WOO & BPS Jabar. Klik untuk audit metodologi."
                    >
                      91.8%
                    </span>
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
                      {/* Compare Checkbox with Descriptive Hover Tooltip */}
                      <td className="py-3 px-3 text-center">
                        <div className="relative inline-flex group/chk">
                          <label
                            htmlFor={`quick-compare-${spot.id}`}
                            className={`inline-flex flex-col items-center justify-center cursor-pointer p-1.5 rounded-lg transition-all select-none ${
                              isSelected 
                                ? 'bg-emerald-100/90 text-emerald-800 ring-1 ring-emerald-400/60 shadow-2xs' 
                                : selectedIds.size >= 3 
                                  ? 'opacity-60 cursor-not-allowed hover:bg-rose-50/60' 
                                  : 'hover:bg-emerald-100/60'
                            }`}
                            title={
                              isSelected 
                                ? `Batal pilih "${spot.name}". (Batas maksimal: 3 titik)` 
                                : selectedIds.size >= 3 
                                  ? `Batas maksimal 3 titik tercapai (${selectedIds.size}/3). Hapus centang salah satu titik untuk memilih "${spot.name}".` 
                                  : `Pilih "${spot.name}" untuk Compare (Maksimal 3 titik dapat dibandingkan secara berdampingan)`
                            }
                          >
                            <input
                              type="checkbox"
                              id={`quick-compare-${spot.id}`}
                              data-testid={`quick-compare-checkbox-${spot.id}`}
                              checked={isSelected}
                              onChange={(e) => toggleSelectSpot(spot.id, e)}
                              className="sr-only"
                              aria-label={`Compare ${spot.name}`}
                            />
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 group-hover/chk:text-emerald-600" />
                            )}
                            <span className={`text-[8.5px] font-bold mt-0.5 leading-none ${
                              isSelected ? 'text-emerald-700 font-extrabold' : 'text-slate-400 group-hover/chk:text-emerald-700'
                            }`}>
                              Compare
                            </span>
                          </label>

                          {/* Descriptive Hover Tooltip explaining maximum 3 spots limit */}
                          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover/chk:flex flex-col w-56 p-2.5 bg-slate-900/95 text-white text-[10px] rounded-xl shadow-2xl border border-slate-700 pointer-events-none z-50 text-left animate-in fade-in duration-150 backdrop-blur-xs">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                              <Scale className="w-3.5 h-3.5 shrink-0" />
                              <span>Fitur Compare (Side-by-Side)</span>
                            </div>
                            <p className="text-slate-200 text-[10px] leading-relaxed">
                              Pilih hingga <strong>maksimal 3 titik reklame</strong> untuk melihat perbandingan berdampingan atas metrik utama: <strong>Traffic Kendaraan</strong>, <strong>Tarif Sewa (Price)</strong>, dan <strong>Tipe Media</strong>.
                            </p>
                            <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[9px]">
                              <span className="text-slate-400">Pilihan saat ini:</span>
                              <span className={`font-bold ${selectedIds.size >= 3 ? 'text-amber-400' : 'text-emerald-300'}`}>
                                {Math.min(selectedIds.size, 3)} dari maks. 3 titik
                              </span>
                            </div>
                            {selectedIds.size >= 3 && !isSelected && (
                              <div className="mt-1 p-1 bg-amber-500/20 rounded border border-amber-400/40 text-[9px] text-amber-200 font-medium">
                                ⚠️ Batas maksimal 3 titik tercapai. Hapus pilihan lain terlebih dahulu.
                              </div>
                            )}
                          </div>
                        </div>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-medium ${
                            spot.trafficDensity === 'Sangat Padat' 
                              ? 'text-rose-600' 
                              : spot.trafficDensity === 'Padat' 
                              ? 'text-amber-600' 
                              : 'text-emerald-600'
                          }`}>
                            {spot.trafficDensity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSourceMetricKey('traffic');
                              setIsSourceModalOpen(true);
                            }}
                            className="text-[9px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1 py-0.2 rounded font-mono font-bold transition-colors cursor-pointer"
                            title="Akurasi 94.2% • Sumber: Dishub Jabar & Google Flow. Klik untuk rincian audit."
                          >
                            94.2%
                          </button>
                        </div>
                      </td>

                      {/* Impresi */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-600 text-xs">
                          {formatCompactNumber(spot.dailyImpressions)} OTS
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                          <span>Score: {spot.visibilityScore}/100</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSourceMetricKey('impressions');
                              setIsSourceModalOpen(true);
                            }}
                            className="text-[9px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1 py-0.2 rounded font-mono font-bold transition-colors cursor-pointer"
                            title="Akurasi 91.8% • Sumber: Standar WOO / ESOMAR & BPS Jabar. Klik untuk rincian audit."
                          >
                            91.8%
                          </button>
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
                            onClick={() => {
                              if (!isAdmin) {
                                if (onRequestAdminLogin) {
                                  onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk merubah status ketersediaan titik reklame.');
                                }
                                return;
                              }
                              onToggleAvailability(spot.id);
                            }}
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
                            <span>{isAdmin ? `Aksi Cepat: Klik untuk ubah ke ${spot.isAvailable ? 'Tersewa' : 'Tersedia'}` : `Status: ${spot.isAvailable ? 'Tersedia' : 'Tersewa'} (Klik untuk login Admin)`}</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900/95" />
                          </div>
                        </div>

                        {/* Availability Alerts Demand Badge in Table Row */}
                        {(demandMetrics.demandMapBySpotId[spot.id] || 0) > 0 && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => onSelectSpot(spot)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-800 hover:bg-amber-500/30 border border-amber-300 transition-colors cursor-pointer"
                              title={`${demandMetrics.demandMapBySpotId[spot.id]} calon klien mendaftar antrean ketersediaan (Availability Alert) untuk titik ini`}
                            >
                              <Flame className="w-2.5 h-2.5 text-amber-600 fill-amber-500/20" />
                              <span>{demandMetrics.demandMapBySpotId[spot.id]} Peminat</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onEditSpot && (
                            <button
                              onClick={() => {
                                if (!isAdmin) {
                                  if (onRequestAdminLogin) {
                                    onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengedit data titik reklame ini.');
                                  }
                                  return;
                                }
                                onEditSpot(spot);
                              }}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                isAdmin 
                                  ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' 
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                              title={isAdmin ? "Edit Data Titik Media" : "Edit Data Titik Media (Perlu Login Admin)"}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteSpot && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isAdmin) {
                                  if (onRequestAdminLogin) {
                                    onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menghapus data titik reklame ini.');
                                  }
                                  return;
                                }
                                setSpotToDelete(spot);
                              }}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                isAdmin 
                                  ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50' 
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isAdmin ? "Hapus Titik Media dari Database" : "Hapus Titik Media (Perlu Login Admin)"}
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
                            title="Buka Chat WhatsApp Web (0878-2224-8975 a.n. Suherman) dengan rincian titik ini"
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
                          <div className="relative group/chk">
                            <label
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-xs transition-colors cursor-pointer border border-white/20 select-none text-[10px] font-semibold shadow-xs ${
                                selectedIds.size >= 3 && !isSelected ? 'opacity-70' : ''
                              }`}
                              title={
                                isSelected 
                                  ? `Batal pilih "${spot.name}". (Batas maksimal: 3 titik)` 
                                  : selectedIds.size >= 3 
                                    ? `Batas maksimal 3 titik tercapai (${selectedIds.size}/3). Hapus centang salah satu titik untuk memilih "${spot.name}".` 
                                    : `Pilih "${spot.name}" untuk Compare (Maksimal 3 titik)`
                              }
                            >
                              <input
                                type="checkbox"
                                id={`quick-compare-card-${spot.id}`}
                                data-testid={`quick-compare-card-checkbox-${spot.id}`}
                                checked={isSelected}
                                onChange={(e) => toggleSelectSpot(spot.id, e)}
                                className="sr-only"
                                aria-label={`Compare ${spot.name}`}
                              />
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-white/80" />
                              )}
                              <span className="font-semibold">Compare</span>
                              {isSelected && (
                                <span className="text-[9px] bg-emerald-500 text-slate-950 font-bold px-1 rounded">
                                  ✓
                                </span>
                              )}
                            </label>

                            {/* Descriptive Tooltip for Card View */}
                            <div className="absolute left-0 top-full mt-2 hidden group-hover/chk:flex flex-col w-56 p-2.5 bg-slate-900/95 text-white text-[10px] rounded-xl shadow-2xl border border-slate-700 pointer-events-none z-50 text-left animate-in fade-in duration-150 backdrop-blur-xs">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                                <Scale className="w-3.5 h-3.5 shrink-0" />
                                <span>Bandingkan Titik (Compare)</span>
                              </div>
                              <p className="text-slate-200 text-[10px] leading-relaxed">
                                Pilih hingga <strong>maksimal 3 titik reklame</strong> untuk melihat komparasi metrik utama berdampingan: <strong>Traffic Kendaraan</strong>, <strong>Tarif Sewa (Price)</strong>, dan <strong>Tipe Media</strong>.
                              </p>
                              <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[9px]">
                                <span className="text-slate-400">Pilihan saat ini:</span>
                                <span className={`font-bold ${selectedIds.size >= 3 ? 'text-amber-400' : 'text-emerald-300'}`}>
                                  {Math.min(selectedIds.size, 3)} dari maks. 3 titik
                                </span>
                              </div>
                              {selectedIds.size >= 3 && !isSelected && (
                                <div className="mt-1 p-1 bg-amber-500/20 rounded border border-amber-400/40 text-[9px] text-amber-200 font-medium">
                                  ⚠️ Batas maksimal 3 titik tercapai. Hapus pilihan lain terlebih dahulu.
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-bold text-white border border-white/10">
                            #{rowNum}
                          </span>
                        </div>

                        {/* Top-Right: Interactive Availability Status Toggle & Demand Queue Badge */}
                        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                          {(demandMetrics.demandMapBySpotId[spot.id] || 0) > 0 && (
                            <span 
                              onClick={() => onSelectSpot(spot)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold bg-amber-500/95 text-slate-950 backdrop-blur-md border border-amber-300 shadow-xs cursor-pointer hover:bg-amber-400"
                              title={`${demandMetrics.demandMapBySpotId[spot.id]} peminat mengantre di Availability Alert`}
                            >
                              <Flame className="w-2.5 h-2.5 fill-slate-950" />
                              <span>{demandMetrics.demandMapBySpotId[spot.id]} Antre</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (!isAdmin) {
                                if (onRequestAdminLogin) {
                                  onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk merubah status ketersediaan titik reklame.');
                                }
                                return;
                              }
                              onToggleAvailability(spot.id);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md transition-all active:scale-95 cursor-pointer border shadow-sm ${
                              spot.isAvailable
                                ? 'bg-emerald-500/90 text-white border-emerald-400 hover:bg-emerald-600'
                                : 'bg-rose-500/90 text-white border-rose-400 hover:bg-rose-600'
                            }`}
                            title={isAdmin ? `Status: ${spot.isAvailable ? 'Tersedia' : 'Tersewa'}. Klik untuk mengubah status.` : `Status: ${spot.isAvailable ? 'Tersedia' : 'Tersewa'} (Klik untuk login Admin)`}
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
                              title="Bagikan ke WhatsApp 0878-2224-8975 atas nama Suherman"
                            >
                              <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]/20" />
                            </button>

                            {onEditSpot && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isAdmin) {
                                    if (onRequestAdminLogin) {
                                      onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengedit data titik reklame ini.');
                                    }
                                    return;
                                  }
                                  onEditSpot(spot);
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isAdmin
                                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                title={isAdmin ? "Edit Data Titik" : "Edit Data Titik (Perlu Login Admin)"}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {onDeleteSpot && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isAdmin) {
                                    if (onRequestAdminLogin) {
                                      onRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menghapus data titik reklame ini.');
                                    }
                                    return;
                                  }
                                  setSpotToDelete(spot);
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isAdmin
                                    ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={isAdmin ? "Hapus Titik Media dari Database" : "Hapus Titik Media (Perlu Login Admin)"}
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
                      placeholder="e.g. 0878-2224-8975"
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

      {/* Persistent Floating 'Compare Selected' Dock (Visible when 1 or more spots are checked) */}
      {selectedIds.size > 0 && (
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
              <strong className="text-emerald-400 font-bold text-sm">{Math.min(selectedIds.size, 3)}</strong>/3 Titik Dipilih
            </span>
          </div>

          {/* Persistent Compare Spots Button */}
          <button
            id="btn-compare-spots"
            data-testid="btn-compare-spots"
            type="button"
            onClick={handleOpenComparisonModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            title="Compare Spots: Buka tampilan side-by-side untuk traffic, price, dan media type titik terpilih"
          >
            <Scale className="w-4 h-4 fill-slate-950" />
            <span>
              {selectedIds.size === 1 ? 'Buka Compare (1/3)' : `Compare Spots (${Math.min(selectedIds.size, 3)}/3)`}
            </span>
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

      {/* Side-by-Side Comparison Modal (Up to 3 Spots) */}
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
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>Perbandingan Titik Reklame (Side-by-Side Comparison)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 font-mono">
                      {effectiveComparedSpots.length}/3 Titik Dipilih
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Bandingkan metrik kunci secara berdampingan: <strong>Traffic Kendaraan</strong>, <strong>Tarif Sewa (Price)</strong>, dan <strong>Tipe Media (Media Type)</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Data Source & Accuracy Audit Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSourceMetricKey('traffic');
                    setIsSourceModalOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-xs font-semibold transition-colors cursor-pointer"
                  title="Lihat audit sumber data resmi dan persentase akurasi perhitungan"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sumber &amp; Akurasi (94.2%)</span>
                </button>

                {/* View Mode Toggle: Matrix Table vs Radar Chart */}
                <div className="hidden sm:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCompareModalTab('matrix')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      compareModalTab === 'matrix'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Metrik &amp; Matriks Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareModalTab('radar')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      compareModalTab === 'radar'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Radar Chart Multi-Dimensi
                  </button>
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
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {compareModalTab === 'matrix' ? (
                <>
                  {/* 1. Quick Benchmark Highlights Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Highlight 1: Highest Traffic */}
                    <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Car className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                          Trafik Kendaraan Tertinggi
                        </div>
                        {(() => {
                          const best = effectiveComparedSpots.find((s) => s.id === comparisonBenchmarks.highestTrafficId);
                          return best ? (
                            <>
                              <div className="font-extrabold text-sm text-slate-900 truncate">{best.name}</div>
                              <div className="text-[11px] font-semibold text-blue-600">
                                {best.dailyTraffic.toLocaleString('id-ID')} unit/hari ({best.trafficDensity})
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400">-</div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Highlight 2: Lowest Price (Best Value) */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                          Tarif Sewa Paling Ekonomis
                        </div>
                        {(() => {
                          const best = effectiveComparedSpots.find((s) => s.id === comparisonBenchmarks.lowestPriceId);
                          return best ? (
                            <>
                              <div className="font-extrabold text-sm text-slate-900 truncate">{best.name}</div>
                              <div className="text-[11px] font-semibold text-emerald-600">
                                {formatIDR(best.pricing.oneMonth)}/bln (~{formatIDR(Math.round(best.pricing.oneMonth / 30))}/hari)
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400">-</div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Highlight 3: Highest Impressions */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                          Paparan Impresi (OTS) Terbanyak
                        </div>
                        {(() => {
                          const best = effectiveComparedSpots.find((s) => s.id === comparisonBenchmarks.highestImpressionsId);
                          return best ? (
                            <>
                              <div className="font-extrabold text-sm text-slate-900 truncate">{best.name}</div>
                              <div className="text-[11px] font-semibold text-amber-600">
                                {formatCompactNumber(best.dailyImpressions)} OTS/hari (Skor {best.visibilityScore || 85}/100)
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400">-</div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* 2. Side-by-Side Spot Cards (Up to 3 Spots) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {effectiveComparedSpots.map((spot, idx) => {
                      const isHighestTraffic = spot.id === comparisonBenchmarks.highestTrafficId;
                      const isLowestPrice = spot.id === comparisonBenchmarks.lowestPriceId;
                      const isHighestImpressions = spot.id === comparisonBenchmarks.highestImpressionsId;
                      const isHighestVisibility = spot.id === comparisonBenchmarks.highestVisibilityId;
                      const isDooh = spot.category === 'DOOH_DIGITAL';

                      return (
                        <div
                          key={`compare-col-${spot.id}`}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-emerald-300 transition-all"
                        >
                          {/* Card Photo Header */}
                          <div className="relative aspect-16/9 bg-slate-900 overflow-hidden">
                            {spot.photoUrl ? (
                              <img
                                src={spot.photoUrl}
                                alt={spot.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-slate-800">
                                <Layers className="w-8 h-8 mb-1.5 opacity-40 text-emerald-400" />
                                <span className="text-[11px] font-medium text-slate-300">{spot.name}</span>
                              </div>
                            )}

                            {/* Top Badges */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-bold border border-white/20">
                                Spot #{idx + 1}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isDooh
                                  ? 'bg-purple-900/90 text-purple-200 border-purple-400/40'
                                  : 'bg-blue-900/90 text-blue-200 border-blue-400/40'
                              }`}>
                                {isDooh ? 'DOOH Digital' : 'OOH Statis'}
                              </span>
                            </div>

                            <div className="absolute top-2.5 right-2.5 z-10">
                              <button
                                type="button"
                                onClick={() => handleRemoveSpotFromCompare(spot.id)}
                                className="p-1 rounded-md bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Hapus titik ini dari perbandingan"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />

                            <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                              <h4 className="font-bold text-xs sm:text-sm truncate drop-shadow-sm">
                                {spot.name}
                              </h4>
                              <div className="text-[10px] text-slate-200 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{spot.roadName || spot.district}, {spot.city}</span>
                              </div>
                            </div>
                          </div>

                          {/* Card Content: 3 Key Metrics Blocks */}
                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            {/* Block 1: Media Type & Format */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 text-indigo-700">
                                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                  Tipe Media (Media Type)
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">{spot.id}</span>
                              </div>
                              <div className="font-bold text-slate-900 text-sm">
                                {spot.mediaType}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600 border-t border-slate-200/80">
                                <div>
                                  <span className="text-slate-400 text-[10px]">Dimensi:</span>{' '}
                                  <strong className="text-slate-800">{spot.size}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px]">Luas:</span>{' '}
                                  <strong className="text-slate-800">{parseSpotDimensions(spot.size).area} m²</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px]">Penerangan:</span>{' '}
                                  <strong className="text-slate-800 truncate block">{spot.lighting || 'Standar Frontlite'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px]">Orientasi:</span>{' '}
                                  <strong className="text-slate-800">{spot.layout}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Block 2: Traffic & Jangkauan (Traffic Key Metric) */}
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                                <span className="flex items-center gap-1.5">
                                  <Car className="w-3.5 h-3.5 text-blue-600" />
                                  Traffic Kendaraan (Traffic)
                                </span>
                                <div className="flex items-center gap-1">
                                  <span 
                                    onClick={() => {
                                      setActiveSourceMetricKey('traffic');
                                      setIsSourceModalOpen(true);
                                    }}
                                    className="px-1.5 py-0.2 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-mono font-bold cursor-pointer"
                                    title="Akurasi 94.2% • Sumber: Dishub Jabar & Google Flow"
                                  >
                                    Akurasi 94.2%
                                  </span>
                                  {isHighestTraffic && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold animate-pulse">
                                      ★ Tertinggi
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <div>
                                  <div className="text-base font-extrabold text-blue-900">
                                    {spot.dailyTraffic.toLocaleString('id-ID')}
                                  </div>
                                  <div className="text-[10px] text-slate-500">unit kendaraan / hari (Dishub)</div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    spot.trafficDensity === 'Sangat Padat'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : spot.trafficDensity === 'Padat'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {spot.trafficDensity}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-blue-200/80 text-[11px]">
                                <div>
                                  <div className="text-[10px] text-slate-400">Est. Impresi (Akurasi 91.8%):</div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1">
                                    <span>{formatCompactNumber(spot.dailyImpressions)} OTS</span>
                                    {isHighestImpressions && <span className="text-[9px] text-amber-600 font-bold">★ Top</span>}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400">Skor Visibilitas (Akurasi 96.5%):</div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1">
                                    <span>{spot.visibilityScore || 85}/100</span>
                                    {isHighestVisibility && <span className="text-[9px] text-emerald-600 font-bold">★ Max</span>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Block 3: Price (Tarif Komersial) */}
                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                                <span className="flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                  Tarif Sewa (Price)
                                </span>
                                {isLowestPrice && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                                    ★ Termurah
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline justify-between">
                                <div>
                                  <div className="text-base font-extrabold text-emerald-700">
                                    {formatIDR(spot.pricing.oneMonth)}
                                  </div>
                                  <div className="text-[10px] text-slate-500">per 1 bulan / sisi</div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    spot.isAvailable
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}>
                                    {spot.isAvailable ? 'Tersedia' : 'Tersewa'}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-emerald-200/80 text-[11px]">
                                <div>
                                  <div className="text-[10px] text-slate-400">Tarif 3 Bulan:</div>
                                  <div className="font-semibold text-slate-800">
                                    {formatCompactIDR(spot.pricing.threeMonths)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400">Est. Biaya/Hari:</div>
                                  <div className="font-semibold text-slate-800">
                                    ~{formatCompactIDR(Math.round(spot.pricing.oneMonth / 30))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCompareModalOpen(false);
                                  onSelectSpot(spot);
                                }}
                                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openSpotDirectWhatsApp(spot, true)}
                                className="flex-1 py-1.5 px-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
                                <span>Chat WA</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Placeholder Slot if only 1 or 2 spots are compared */}
                    {effectiveComparedSpots.length < 3 && (
                      <div className="bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[360px]">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-400">
                          <Plus className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">
                            Slot Kosong (#{effectiveComparedSpots.length + 1} dari 3)
                          </div>
                          <div className="text-xs text-slate-500 max-w-xs mt-1">
                            Pilih titik reklame lain untuk melengkapi perbandingan side-by-side hingga 3 titik.
                          </div>
                        </div>

                        {/* Quick Spot Picker Dropdown */}
                        <div className="w-full max-w-xs">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddSpotToCompare(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 shadow-2xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="" disabled>
                              + Pilih Titik ke-{effectiveComparedSpots.length + 1} dari Tabel...
                            </option>
                            {spots
                              .filter((s) => !effectiveComparedSpots.some((c) => c.id === s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.city} • {s.mediaType})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Side-by-Side Direct Comparison Matrix Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-xs sm:text-sm">
                          Tabel Matriks Spesifikasi Teknis &amp; Komersial
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {effectiveComparedSpots.length} Titik Diperbandingkan
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                            <th className="p-3 w-56 bg-slate-100/90 font-bold text-slate-800">Parameter Komparasi</th>
                            {effectiveComparedSpots.map((spot, idx) => (
                              <th key={`th-${spot.id}`} className="p-3 font-bold text-slate-900 min-w-[200px]">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="truncate">{spot.name}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {/* SECTION: TIPE MEDIA (Media Type) */}
                          <tr className="bg-indigo-50/40 text-indigo-900 font-bold text-[11px]">
                            <td colSpan={effectiveComparedSpots.length + 1} className="py-2 px-3 flex items-center gap-1.5 uppercase tracking-wide">
                              <Tag className="w-3.5 h-3.5 text-indigo-600" />
                              1. Tipe &amp; Format Media (Media Type)
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Tipe Media (Format)</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`cat-${s.id}`} className="p-3 font-bold text-slate-900">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.category === 'DOOH_DIGITAL'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                  {s.mediaType}
                                </span>
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Kategori Media</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`ctg-${s.id}`} className="p-3 font-semibold text-slate-800">
                                {s.category === 'DOOH_DIGITAL' ? 'DOOH Digital (Videotron)' : 'OOH Statis Fisik'}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Dimensi &amp; Luas Efektif</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`size-${s.id}`} className="p-3 text-slate-800">
                                <span className="font-semibold">{s.size}</span>
                                <span className="text-slate-400 ml-1">({parseSpotDimensions(s.size).area} m²)</span>
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Sistem Pencahayaan</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`light-${s.id}`} className="p-3 text-slate-700">
                                {s.lighting || 'Standar Frontlite'}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Orientasi Konstruksi</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`orient-${s.id}`} className="p-3 text-slate-700">
                                {s.layout}
                              </td>
                            ))}
                          </tr>

                          {/* SECTION: TRAFFIC (Traffic Key Metric) */}
                          <tr className="bg-blue-50/40 text-blue-900 font-bold text-[11px]">
                            <td colSpan={effectiveComparedSpots.length + 1} className="py-2 px-3 flex items-center gap-1.5 uppercase tracking-wide">
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                              2. Trafik Kendaraan &amp; Impresi (Traffic)
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Volume Kendaraan / Hari</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`traf-${s.id}`} className="p-3 font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{s.dailyTraffic.toLocaleString('id-ID')} unit/hari</span>
                                  {s.id === comparisonBenchmarks.highestTrafficId && (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                                      ★ Tertinggi
                                    </span>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Kepadatan Lalu Lintas</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`dens-${s.id}`} className="p-3 font-semibold">
                                <span className={
                                  s.trafficDensity === 'Sangat Padat'
                                    ? 'text-rose-600 font-bold'
                                    : s.trafficDensity === 'Padat'
                                    ? 'text-amber-600 font-bold'
                                    : 'text-emerald-600 font-semibold'
                                }>
                                  {s.trafficDensity}
                                </span>
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Estimasi Impresi Harian (OTS)</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`ots-${s.id}`} className="p-3 font-bold text-emerald-700">
                                <div className="flex items-center gap-1.5">
                                  <span>{formatCompactNumber(s.dailyImpressions)} OTS/hari</span>
                                  {s.id === comparisonBenchmarks.highestImpressionsId && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-bold">
                                      ★ Top OTS
                                    </span>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Skor Visibilitas Lokasi</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`vis-${s.id}`} className="p-3 font-semibold text-slate-800">
                                {s.visibilityScore || 85} / 100
                              </td>
                            ))}
                          </tr>

                          {/* SECTION: PRICE (Price Key Metric) */}
                          <tr className="bg-emerald-50/40 text-emerald-900 font-bold text-[11px]">
                            <td colSpan={effectiveComparedSpots.length + 1} className="py-2 px-3 flex items-center gap-1.5 uppercase tracking-wide">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              3. Tarif Sewa Komersial (Price)
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Tarif 1 Bulan (Dasar)</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`p1-${s.id}`} className="p-3 font-extrabold text-emerald-700 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <span>{formatIDR(s.pricing.oneMonth)}</span>
                                  {s.id === comparisonBenchmarks.lowestPriceId && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">
                                      ★ Termurah
                                    </span>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Tarif 3 Bulan (Kuartal)</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`p3-${s.id}`} className="p-3 font-semibold text-slate-800">
                                {formatIDR(s.pricing.threeMonths)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Tarif 1 Tahun (Tahunan)</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`p12-${s.id}`} className="p-3 font-semibold text-slate-800">
                                {formatIDR(s.pricing.oneYear)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Estimasi Biaya per Hari</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`pday-${s.id}`} className="p-3 text-slate-700 font-medium">
                                ~{formatIDR(Math.round(s.pricing.oneMonth / 30))}/hari
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Efisiensi Biaya CPM</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`cpm-${s.id}`} className="p-3 font-semibold text-indigo-700">
                                {formatIDR(Math.round((s.pricing.oneMonth / (s.dailyImpressions * 30)) * 1000))}/1k OTS
                              </td>
                            ))}
                          </tr>

                          {/* SECTION: LOKASI & STATUS */}
                          <tr className="bg-slate-100 text-slate-800 font-bold text-[11px]">
                            <td colSpan={effectiveComparedSpots.length + 1} className="py-2 px-3 uppercase tracking-wide">
                              4. Status &amp; Lokasi Geografis
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Status Ketersediaan</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`av-${s.id}`} className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.isAvailable
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {s.isAvailable ? 'Tersedia' : 'Tersewa / Kontrak'}
                                </span>
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Wilayah / Kota</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`city-${s.id}`} className="p-3 font-semibold text-slate-800">
                                {s.city} ({s.district})
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="p-3 font-medium text-slate-600">Nama Jalan</td>
                            {effectiveComparedSpots.map((s) => (
                              <td key={`road-${s.id}`} className="p-3 text-slate-700">
                                {s.roadName}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* Tab 2: Radar Chart Multi-Dimensi */
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
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-900 px-5 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-semibold">{effectiveComparedSpots.length} dari maks. 3 titik</span>
                <span>dipilih untuk perbandingan komparatif</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleClearComparison}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs cursor-pointer"
                >
                  Bersihkan Pilihan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openMultipleSpotsDirectWhatsApp(effectiveComparedSpots, true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  title="Kirim ringkasan perbandingan titik ini via WhatsApp ke 0878-2224-8975"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-[#25D366]" />
                  <span>Kirim Perbandingan via WhatsApp ({effectiveComparedSpots.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCompareModalOpen(false);
                    handleOpenPdfModal(effectiveComparedSpots);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  <span>Download PDF Proposal ({effectiveComparedSpots.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-700"
                >
                  Tutup
                </button>
              </div>
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

      {/* Modal Aksi Massal: Ubah Status Ketersediaan & Kategori Sekaligus */}
      {isBulkEditModalOpen && (
        <div 
          id="modal-bulk-edit-status-category"
          data-testid="modal-bulk-edit-status-category"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <span>Ubah Status &amp; Kategori Massal</span>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 font-mono">
                      {selectedIds.size} Titik Terpilih
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Perbarui status ketersediaan atau kategori untuk semua titik reklame yang dipilih sekaligus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Opsi 1: Status Ketersediaan */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  1. Ubah Status Ketersediaan
                </label>
                <p className="text-[11px] text-slate-500">
                  Pilih status ketersediaan baru untuk {selectedIds.size} titik reklame terpilih:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setBulkAvailabilityChoice('UNCHANGED')}
                    className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all cursor-pointer ${
                      bulkAvailabilityChoice === 'UNCHANGED'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-semibold text-slate-800">Tidak Berubah</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Biarkan status saat ini</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkAvailabilityChoice('AVAILABLE')}
                    className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all cursor-pointer ${
                      bulkAvailabilityChoice === 'AVAILABLE'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Set Tersedia</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Siap disewa / Ready</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkAvailabilityChoice('BOOKED')}
                    className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all cursor-pointer ${
                      bulkAvailabilityChoice === 'BOOKED'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-rose-700 font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Set Tersewa</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Sedang kontrak / Reserved</div>
                  </button>
                </div>
              </div>

              {/* Opsi 2: Kategori & Tipe Media */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  2. Ubah Kategori &amp; Format Media
                </label>
                <p className="text-[11px] text-slate-500">
                  Ubah klasifikasi format dan tipe media untuk {selectedIds.size} titik terpilih:
                </p>
                <select
                  value={bulkCategoryChoice}
                  onChange={(e) => setBulkCategoryChoice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="UNCHANGED">-- Tidak Berubah (Pertahankan Kategori Masing-masing) --</option>
                  <optgroup label="DOOH Digital (Videotron &amp; Digital Signage)">
                    <option value="DOOH_DIGITAL|LED Videotron">DOOH - LED Videotron</option>
                    <option value="DOOH_DIGITAL|LED BANDO">DOOH - LED BANDO</option>
                    <option value="DOOH_DIGITAL|LED Pylon Berbaris">DOOH - LED Pylon Berbaris</option>
                    <option value="DOOH_DIGITAL|LED Single Pole">DOOH - LED Single Pole</option>
                  </optgroup>
                  <optgroup label="OOH Statis (Billboard &amp; JPO Fisik)">
                    <option value="OOH_STATIC|Billboard Frontlite">OOH - Billboard Frontlite</option>
                    <option value="OOH_STATIC|Billboard Backlite">OOH - Billboard Backlite</option>
                    <option value="OOH_STATIC|Bando Frontlite">OOH - Bando Frontlite</option>
                    <option value="OOH_STATIC|JPO Frontlite">OOH - JPO Frontlite</option>
                    <option value="OOH_STATIC|JPO Backlite">OOH - JPO Backlite</option>
                  </optgroup>
                </select>
              </div>

              {/* Daftar Ringkas Titik yang Terpilih */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>Daftar Titik Reklame yang Terdampak ({selectedSpotsList.length} titik):</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedAvailableCount} Tersedia, {selectedSoldOutCount} Tersewa
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white p-1">
                  {selectedSpotsList.map((s, idx) => (
                    <div key={s.id} className="p-2 flex items-center justify-between text-[11px] hover:bg-slate-50 rounded-lg">
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 truncate">
                          {idx + 1}. {s.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {s.city} • {s.roadName || s.district} • {s.mediaType}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          s.isAvailable 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {s.isAvailable ? 'Tersedia' : 'Tersewa'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBulkEditModalOpen(false);
                  setBulkAvailabilityChoice('UNCHANGED');
                  setBulkCategoryChoice('UNCHANGED');
                }}
                disabled={isExecutingBulkEdit}
                className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleExecuteBulkEdit}
                disabled={
                  isExecutingBulkEdit ||
                  (bulkAvailabilityChoice === 'UNCHANGED' && bulkCategoryChoice === 'UNCHANGED')
                }
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecutingBulkEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Pembaruan Massal...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Terapkan Perubahan ({selectedIds.size} Titik)</span>
                  </>
                )}
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

      {/* Analytics Data Sources & Calculation Accuracy Audit Modal */}
      <AnalyticsSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        activeMetricKey={activeSourceMetricKey}
      />

    </div>
  );
};
