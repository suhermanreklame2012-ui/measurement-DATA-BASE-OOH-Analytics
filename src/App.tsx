import React, { useState, useEffect, useMemo } from 'react';
import { MediaSpot, FilterState, NotificationLog } from './types/ooh';
import { 
  getStoredSpots, 
  saveStoredSpots, 
  getStoredNotifications, 
  addNotification, 
  markNotificationsAsRead,
  resetToInitialSpots,
  deleteSpotFromStorage,
  bulkDeleteSpotsFromStorage
} from './services/storageService';
import { INITIAL_SPOTS } from './data/spotsData';
import { testFirestoreConnection } from './services/firebase';
import { 
  subscribeToSpots, 
  saveSpotToFirestore, 
  updateSpotAvailabilityInFirestore, 
  bulkUpdateAvailabilityInFirestore, 
  seedInitialSpotsIfEmpty,
  subscribeToNotifications,
  deleteSpotFromFirestore,
  bulkDeleteSpotsFromFirestore
} from './services/firestoreService';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { SpatialHeatmapView } from './components/SpatialHeatmapView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { MediaTable } from './components/MediaTable';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { MediaDetailModal } from './components/MediaDetailModal';
import { AddEditSpotModal } from './components/AddEditSpotModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { AiSecurityModal } from './components/AiSecurityModal';
import { AiProposalOutreachModal } from './components/AiProposalOutreachModal';
import { TriLayerAiArchitectModal } from './components/TriLayerAiArchitectModal';
import { AvailabilityQueueModal } from './components/AvailabilityQueueModal';
import { StrategicMediaPlanner } from './components/StrategicMediaPlanner';
import { EstimatedRoiCalculator } from './components/EstimatedRoiCalculator';
import { NotificationCenter } from './components/NotificationCenter';
import { AdminLogin } from './components/AdminLogin';
import { DEFAULT_MIN_BOUND, DEFAULT_MAX_BOUND } from './components/PriceRangeFilter';
import { CheckCircle2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { listenAuthState, logoutAdmin } from './services/emailAuthService';
import { CrmPipelineView } from './components/CrmPipelineView';
import { MobileBottomNav } from './components/MobileBottomNav';

const SUPERADMIN_EMAIL = 'suherman.reklame2012@gmail.com';

export default function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('suherman.Reklame2012@gmail.com');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginReason, setLoginReason] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  
  const [spots, setSpots] = useState<MediaSpot[]>(() => getStoredSpots());
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => getStoredNotifications());
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'map' | 'analytics' | 'table' | 'planner' | 'roi' | 'crm'>('map');
  const [roiSpotId, setRoiSpotId] = useState<string | undefined>(undefined);

  // Modals state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAddSpotModalOpen, setIsAddSpotModalOpen] = useState<boolean>(false);
  const [spotToEdit, setSpotToEdit] = useState<MediaSpot | null>(null);
  const [isAiSecurityModalOpen, setIsAiSecurityModalOpen] = useState<boolean>(false);
  const [isAiProposalModalOpen, setIsAiProposalModalOpen] = useState<boolean>(false);
  const [isAiArchitectModalOpen, setIsAiArchitectModalOpen] = useState<boolean>(false);
  const [isAvailabilityQueueModalOpen, setIsAvailabilityQueueModalOpen] = useState<boolean>(false);
  const [isCrmStandaloneOpen, setIsCrmStandaloneOpen] = useState<boolean>(false);
  const [proposalSpots, setProposalSpots] = useState<MediaSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<MediaSpot | null>(null);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState<boolean>(false);

  // Floating Toast State for immediate automatic notification feedback
  const [activeToast, setActiveToast] = useState<NotificationLog | null>(null);

  // Authentication check
  useEffect(() => {
    const unsubscribe = listenAuthState((user) => {
      if (user && user.email) {
        setAdminEmail(user.email);
        const emailLower = user.email.toLowerCase();
        if (
          emailLower === SUPERADMIN_EMAIL.toLowerCase() ||
          emailLower.includes('reklame') ||
          emailLower.includes('admin')
        ) {
          setIsAdminAuthenticated(true);
        } else {
          setIsAdminAuthenticated(true);
        }
      } else {
        setIsAdminAuthenticated(false);
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRequestAdminLogin = (reason?: string) => {
    setLoginReason(reason || 'Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengelola, menambah, atau merubah data.');
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      setIsAdminAuthenticated(false);
      addNotification({
        title: 'Sesi Admin Berakhir',
        message: 'Anda telah keluar. Sistem kembali ke Mode Publik (Katalog Terbuka).',
        type: 'system'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddSpot = (spotToEditTarget?: MediaSpot | null) => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menambahkan atau mengedit data titik reklame.');
      return;
    }
    setSpotToEdit(spotToEditTarget || null);
    setIsAddSpotModalOpen(true);
  };

  const handleOpenSync = () => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengelola sinkronisasi dan impor data.');
      return;
    }
    setIsSyncModalOpen(true);
  };

  const handleOpenDriveSync = () => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengelola sinkronisasi Google Workspace.');
      return;
    }
    setIsDriveModalOpen(true);
  };

  // Filter state
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    city: 'All',
    category: 'ALL',
    locationTypes: [],
    trafficDensities: [],
    mediaTypes: [],
    availability: 'ALL',
    minTraffic: 0,
    minPrice: DEFAULT_MIN_BOUND,
    maxPrice: DEFAULT_MAX_BOUND
  });

  // Listen to custom notification events & Firebase Firestore real-time synchronization
  useEffect(() => {
    // 1. Validate Firestore server connection
    testFirestoreConnection().then((connected) => {
      setIsFirestoreConnected(connected);
    });

    // 2. Initialize Firestore data if empty
    seedInitialSpotsIfEmpty(INITIAL_SPOTS);

    // 3. Real-time Firestore spots listener
    const unsubscribeSpots = subscribeToSpots(
      (cloudSpots) => {
        if (cloudSpots && cloudSpots.length > 0) {
          setSpots(cloudSpots);
          saveStoredSpots(cloudSpots);
          setIsFirestoreConnected(true);
        }
      },
      (err) => {
        console.warn('Firestore subscription using local fallback:', err);
      }
    );

    // 4. Real-time Firestore notifications listener
    const unsubscribeNotifs = subscribeToNotifications((cloudNotifs) => {
      if (cloudNotifs && cloudNotifs.length > 0) {
        setNotifications(cloudNotifs);
      }
    });

    const handleNotifAdded = (e: any) => {
      const newNotif = e.detail as NotificationLog;
      setNotifications(getStoredNotifications());
      setActiveToast(newNotif);

      // Auto dismiss toast after 4.5 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?.id === newNotif.id ? null : current));
      }, 4500);
    };

    const handleNotifUpdated = () => {
      setNotifications(getStoredNotifications());
    };

    window.addEventListener('ooh_notification_added', handleNotifAdded);
    window.addEventListener('ooh_notification_updated', handleNotifUpdated);

    return () => {
      unsubscribeSpots();
      unsubscribeNotifs();
      window.removeEventListener('ooh_notification_added', handleNotifAdded);
      window.removeEventListener('ooh_notification_updated', handleNotifUpdated);
    };
  }, []);

  // Deep-linking: Automatically open spot details when '?spot=<id>' is present in URL query or hash
  useEffect(() => {
    const handleDeepLink = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        let spotParam = searchParams.get('spot');

        if (!spotParam && window.location.hash) {
          const match = window.location.hash.match(/[?&#]spot=([^&#]+)/);
          if (match) {
            spotParam = decodeURIComponent(match[1]);
          }
        }

        if (spotParam && spots.length > 0) {
          const found = spots.find(
            (s) => s.id.toLowerCase() === spotParam!.toLowerCase() || s.no.toString() === spotParam
          );
          if (found) {
            setSelectedSpot(found);
          }
        }
      } catch (err) {
        console.warn('Safe fallback for deep-link check:', err);
      }
    };

    handleDeepLink();
    window.addEventListener('popstate', handleDeepLink);
    window.addEventListener('hashchange', handleDeepLink);

    return () => {
      window.removeEventListener('popstate', handleDeepLink);
      window.removeEventListener('hashchange', handleDeepLink);
    };
  }, [spots]);

  // Save spots to local storage on modification
  const handleUpdateSpots = (newSpots: MediaSpot[], reasonMessage?: string) => {
    setSpots(newSpots);
    saveStoredSpots(newSpots);
  };

  // Toggle single spot availability
  const handleToggleAvailability = (spotId: string) => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk merubah status ketersediaan titik reklame.');
      return;
    }
    const target = spots.find((s) => s.id === spotId);
    if (!target) return;
    const nextAvail = !target.isAvailable;

    const updated = spots.map((s) => {
      if (s.id === spotId) {
        return {
          ...s,
          isAvailable: nextAvail,
          availability: nextAvail ? 'Available' : 'Tersewa / Kontrak'
        };
      }
      return s;
    });

    handleUpdateSpots(updated);

    // Persist to Cloud Firestore
    updateSpotAvailabilityInFirestore(spotId, nextAvail).catch((err) => {
      console.warn('Firestore availability update fallback:', err);
    });

    addNotification({
      title: 'Status Titik Diperbarui',
      message: `Status ketersediaan "${target.name}" diubah menjadi ${nextAvail ? 'Tersedia' : 'Tersewa'}.`,
      type: 'update'
    });
  };

  // Bulk update availability for multiple spots
  const handleBulkUpdateAvailability = (spotIds: string[], isAvailable: boolean) => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mengubah status ketersediaan titik reklame secara massal.');
      return;
    }
    const targetSet = new Set(spotIds);
    const updated = spots.map((s) => {
      if (targetSet.has(s.id)) {
        return {
          ...s,
          isAvailable: isAvailable,
          availability: isAvailable ? 'Available' : 'Tersewa / Kontrak'
        };
      }
      return s;
    });

    handleUpdateSpots(updated);

    // Batch persist to Cloud Firestore
    bulkUpdateAvailabilityInFirestore(spotIds, isAvailable).catch((err) => {
      console.warn('Firestore bulk update fallback:', err);
    });

    const statusLabel = isAvailable ? 'Tersedia (Available)' : 'Tersewa (Reserved)';
    addNotification({
      title: 'Pembaruan Status Massal Berhasil',
      message: `Berhasil mengubah ${spotIds.length} titik media menjadi status "${statusLabel}".`,
      type: 'update',
      itemCount: spotIds.length
    });
  };

  // Add new spot from modal
  const handleSaveSpot = (newSpot: MediaSpot) => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menyimpan atau merubah data titik reklame.');
      return;
    }
    const exists = spots.some((s) => s.id === newSpot.id);
    let updated: MediaSpot[];
    if (exists) {
      updated = spots.map((s) => (s.id === newSpot.id ? newSpot : s));
    } else {
      updated = [newSpot, ...spots];
    }
    handleUpdateSpots(updated);

    // Persist to Cloud Firestore
    saveSpotToFirestore(newSpot).catch((err) => {
      console.warn('Firestore save spot fallback:', err);
    });
  };

  // Delete single spot from database
  const handleDeleteSpot = (spotId: string) => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menghapus titik media dari database.');
      return;
    }
    const target = spots.find((s) => s.id === spotId);
    const targetName = target ? target.name : spotId;

    const updated = spots.filter((s) => s.id !== spotId);
    handleUpdateSpots(updated);
    deleteSpotFromStorage(spotId);

    // Persist deletion to Cloud Firestore
    deleteSpotFromFirestore(spotId).catch((err) => {
      console.warn('Firestore delete spot fallback:', err);
    });

    if (selectedSpot && selectedSpot.id === spotId) {
      setSelectedSpot(null);
    }

    addNotification({
      title: 'Titik Media Dihapus',
      message: `Titik media "${targetName}" (${spotId}) berhasil dihapus dari database.`,
      type: 'system'
    });
  };

  // Bulk delete spots from database
  const handleBulkDeleteSpots = (spotIds: string[]) => {
    if (!isAdminAuthenticated) {
      handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menghapus titik media secara massal.');
      return;
    }
    if (!spotIds || spotIds.length === 0) return;
    const idsSet = new Set(spotIds);

    const updated = spots.filter((s) => !idsSet.has(s.id));
    handleUpdateSpots(updated);
    bulkDeleteSpotsFromStorage(spotIds);

    // Persist bulk deletion to Cloud Firestore
    bulkDeleteSpotsFromFirestore(spotIds).catch((err) => {
      console.warn('Firestore bulk delete spots fallback:', err);
    });

    if (selectedSpot && idsSet.has(selectedSpot.id)) {
      setSelectedSpot(null);
    }

    addNotification({
      title: 'Penghapusan Massal Berhasil',
      message: `Sebanyak ${spotIds.length} titik media berhasil dihapus dari database inventaris.`,
      type: 'system',
      itemCount: spotIds.length
    });
  };

  // Extract all distinct cities in dataset
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    spots.forEach((s) => set.add(s.city));
    return Array.from(set).sort();
  }, [spots]);

  // Apply filters
  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      // Search
      if (filter.search.trim()) {
        const q = filter.search.toLowerCase();
        const matchName = spot.name.toLowerCase().includes(q);
        const matchRoad = spot.roadName.toLowerCase().includes(q);
        const matchDistrict = spot.district.toLowerCase().includes(q);
        const matchCity = spot.city.toLowerCase().includes(q);
        if (!matchName && !matchRoad && !matchDistrict && !matchCity) {
          return false;
        }
      }

      // City
      if (filter.city !== 'All' && spot.city !== filter.city) {
        return false;
      }

      // Category
      if (filter.category !== 'ALL' && spot.category !== filter.category) {
        return false;
      }

      // Location Types
      if (filter.locationTypes.length > 0 && !filter.locationTypes.includes(spot.locationType)) {
        return false;
      }

      // Traffic Densities
      if (filter.trafficDensities.length > 0 && !filter.trafficDensities.includes(spot.trafficDensity)) {
        return false;
      }

      // Availability
      if (filter.availability === 'AVAILABLE' && !spot.isAvailable) {
        return false;
      }
      if (filter.availability === 'SOLD_OUT' && spot.isAvailable) {
        return false;
      }

      // Monthly Pricing Filter (oneMonth)
      const monthlyRate = spot.pricing?.oneMonth ?? 0;
      if (monthlyRate > 0) {
        if (filter.minPrice !== undefined && filter.minPrice > DEFAULT_MIN_BOUND && monthlyRate < filter.minPrice) {
          return false;
        }
        if (filter.maxPrice !== undefined && filter.maxPrice < DEFAULT_MAX_BOUND && monthlyRate > filter.maxPrice) {
          return false;
        }
      }

      return true;
    });
  }, [spots, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenAiProposal = (targetSpots?: MediaSpot[]) => {
    if (targetSpots && targetSpots.length > 0) {
      setProposalSpots(targetSpots);
    } else if (selectedSpot) {
      setProposalSpots([selectedSpot]);
    } else {
      // Default to the first available spot or filtered spots
      const available = filteredSpots.filter((s) => s.isAvailable);
      setProposalSpots(available.slice(0, 3));
    }
    setIsAiProposalModalOpen(true);
  };

  const handleOpenRoi = (spot?: MediaSpot) => {
    if (spot) {
      setRoiSpotId(spot.id);
    }
    setActiveTab('roi');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Global Application Header */}
      <Header
        spots={spots}
        notifications={notifications}
        unreadCount={unreadCount}
        onOpenSync={handleOpenSync}
        onOpenDriveSync={handleOpenDriveSync}
        onOpenAddSpot={() => handleOpenAddSpot(null)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenAiSecurity={() => setIsAiSecurityModalOpen(true)}
        onOpenAiProposal={() => handleOpenAiProposal()}
        onOpenAiArchitect={() => setIsAiArchitectModalOpen(true)}
        onOpenAvailabilityQueue={() => setIsAvailabilityQueueModalOpen(true)}
        onOpenCrm={() => {
          setActiveTab('crm');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleNotif={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
        isNotifOpen={isNotifDropdownOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenEstimatedRoi={() => handleOpenRoi()}
        isFirestoreConnected={isFirestoreConnected}
        isAdmin={isAdminAuthenticated}
        onOpenLogin={handleRequestAdminLogin}
        adminEmail={adminEmail}
        onLogout={handleLogout}
      />

      {/* Notification Dropdown Panel */}
      <NotificationCenter
        isOpen={isNotifDropdownOpen}
        onClose={() => setIsNotifDropdownOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={markNotificationsAsRead}
      />

      {/* Interactive Filter Bar (Hidden when in Pipeline CRM view for clean workspace) */}
      {activeTab !== 'crm' && (
        <div className="no-print">
          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            availableCities={availableCities}
            totalMatches={filteredSpots.length}
            totalSpots={spots.length}
            spots={spots}
          />
        </div>
      )}

      {/* Main Content Body with responsive mobile padding */}
      <main id="main-content" role="main" className="flex-1 pb-28 md:pb-16">
        
        {/* TAB 1: Visualisasi Heatmap Spasial */}
        {activeTab === 'map' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Peta Sebaran & Heatmap Impresi Spasial
                </h2>
                <p className="text-xs text-slate-500">
                  Konsentrasi densitas lalu lintas dan paparan impresi (OTS) di koridor Kota Bandung dan Jawa Barat
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Google Maps Standar (Aktif)
                </span>
                <span className="text-slate-500">
                  Menampilkan <strong className="text-slate-800">{filteredSpots.length}</strong> titik
                </span>
              </div>
            </div>

            <SpatialHeatmapView
              spots={filteredSpots}
              onSelectSpot={(spot) => setSelectedSpot(spot)}
              selectedCity={filter.city !== 'All' ? filter.city : undefined}
            />
          </div>
        )}

        {/* TAB 2: Dashboard Analisis Tren Real-Time */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            spots={filteredSpots}
            onSelectSpot={(spot) => setSelectedSpot(spot)}
            onNavigateToPlanner={() => setActiveTab('planner')}
            onNavigateToRoi={() => handleOpenRoi()}
            selectedCity={filter.city !== 'All' ? filter.city : undefined}
          />
        )}

        {/* TAB 3: Database Media Table */}
        {activeTab === 'table' && (
          <MediaTable
            spots={filteredSpots}
            filter={filter}
            onSelectRegion={(reg) => setFilter((prev) => ({ ...prev, city: reg }))}
            onSelectSpot={(spot) => setSelectedSpot(spot)}
            onEditSpot={(spot) => handleOpenAddSpot(spot)}
            onDeleteSpot={handleDeleteSpot}
            onBulkDeleteSpots={handleBulkDeleteSpots}
            onAddSpot={() => handleOpenAddSpot(null)}
            onToggleAvailability={handleToggleAvailability}
            onBulkUpdateAvailability={handleBulkUpdateAvailability}
            onOpenAiProposal={(chosenSpots) => handleOpenAiProposal(chosenSpots)}
            onOpenRoiCalculator={(spot) => handleOpenRoi(spot)}
            onOpenAvailabilityQueue={() => setIsAvailabilityQueueModalOpen(true)}
            isAdmin={isAdminAuthenticated}
            onRequestAdminLogin={handleRequestAdminLogin}
          />
        )}

        {/* TAB 4: Strategic Media Planner */}
        {activeTab === 'planner' && (
          <StrategicMediaPlanner
            spots={spots}
            onSelectSpot={(spot) => setSelectedSpot(spot)}
            onOpenAiProposal={(chosenSpots) => handleOpenAiProposal(chosenSpots)}
            onOpenRoiCalculator={(spot) => handleOpenRoi(spot)}
            onNavigateToComparison={() => {
              setActiveTab('analytics');
              setTimeout(() => {
                const el = document.getElementById('media-comparison-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          />
        )}

        {/* TAB 5: Estimated ROI Calculator */}
        {activeTab === 'roi' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Kalkulator Estimasi ROI & Rasio Konversi (OOH CTR)
                </h2>
                <p className="text-xs text-slate-500">
                  Simulasi potensi konversi penjualan dan efisiensi biaya kampanye berbasis impresi harian (OTS) serta benchmark CTR 9 kategori industri periklanan OOH Indonesia.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Model CTR Dinamis Aktif
                </span>
                <span className="text-slate-500">
                  Tersedia untuk <strong className="text-slate-800">{spots.length}</strong> titik media
                </span>
              </div>
            </div>

            <EstimatedRoiCalculator
              spots={spots}
              initialSpotId={roiSpotId}
              standalone={true}
              onSelectSpot={(spot) => setSelectedSpot(spot)}
              onOpenAiProposal={(chosenSpot) => handleOpenAiProposal([chosenSpot])}
            />
          </div>
        )}

        {/* TAB 6: Pipeline CRM Penawaran OOH (Menu Utama Header) */}
        {activeTab === 'crm' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <CrmPipelineView
              allSpots={spots}
              isStandalone={false}
              onOpenProposalWithLead={() => {
                handleOpenAiProposal();
              }}
              isAdmin={isAdminAuthenticated}
              onRequestAdminLogin={handleRequestAdminLogin}
            />
          </div>
        )}

      </main>

      {/* Global Modals */}
      <GoogleWorkspaceModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        spots={spots}
      />

      <GoogleSheetsSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        spots={spots}
        onDataLoaded={(newSpots) => {
          handleUpdateSpots(newSpots);
        }}
      />

      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        spots={filteredSpots.length > 0 ? filteredSpots : spots}
      />

      <MediaDetailModal
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
        onToggleAvailability={handleToggleAvailability}
        onOpenAiProposal={(chosenSpot) => handleOpenAiProposal([chosenSpot])}
        onOpenRoiCalculator={(chosenSpot) => handleOpenRoi(chosenSpot)}
        onEditSpot={(chosenSpot) => handleOpenAddSpot(chosenSpot)}
        onDeleteSpot={handleDeleteSpot}
        isAdmin={isAdminAuthenticated}
        onRequestAdminLogin={handleRequestAdminLogin}
      />

      <AddEditSpotModal
        key={spotToEdit ? spotToEdit.id : 'new-spot'}
        isOpen={isAddSpotModalOpen}
        onClose={() => {
          setIsAddSpotModalOpen(false);
          setSpotToEdit(null);
        }}
        onSave={handleSaveSpot}
        existingSpot={spotToEdit}
        onDelete={(spotId) => {
          handleDeleteSpot(spotId);
          setIsAddSpotModalOpen(false);
          setSpotToEdit(null);
        }}
      />

      <AiSecurityModal
        isOpen={isAiSecurityModalOpen}
        onClose={() => setIsAiSecurityModalOpen(false)}
        spots={spots}
        onUpdateSpots={handleUpdateSpots}
        isFirestoreConnected={isFirestoreConnected}
        onDeleteSpot={(spotId) => {
          setSpots(prev => prev.filter(s => s.id !== spotId));
        }}
      />

      <AiProposalOutreachModal
        isOpen={isAiProposalModalOpen}
        onClose={() => setIsAiProposalModalOpen(false)}
        selectedSpots={proposalSpots}
        allSpots={spots}
        onUpdateSelectedSpots={(updated) => setProposalSpots(updated)}
        onOpenStandaloneCrm={() => setIsCrmStandaloneOpen(true)}
      />

      <TriLayerAiArchitectModal
        isOpen={isAiArchitectModalOpen}
        onClose={() => setIsAiArchitectModalOpen(false)}
        spots={spots}
        isAdmin={isAdminAuthenticated}
      />

      <AvailabilityQueueModal
        isOpen={isAvailabilityQueueModalOpen}
        onClose={() => setIsAvailabilityQueueModalOpen(false)}
        spots={spots}
        onSelectSpot={(spot) => setSelectedSpot(spot)}
        isAdmin={isAdminAuthenticated}
      />

      {/* Standalone CRM Pipeline View ("03 Bisa dipakai sendiri") */}
      {isCrmStandaloneOpen && (
        <CrmPipelineView
          allSpots={spots}
          isStandalone={true}
          onCloseStandalone={() => setIsCrmStandaloneOpen(false)}
          onOpenProposalWithLead={() => {
            setIsCrmStandaloneOpen(false);
            handleOpenAiProposal();
          }}
          isAdmin={isAdminAuthenticated}
          onRequestAdminLogin={handleRequestAdminLogin}
        />
      )}

      {/* Superadmin Authentication Modal */}
      {isLoginModalOpen && (
        <AdminLogin
          onLoginSuccess={() => {
            setIsAdminAuthenticated(true);
            setIsLoginModalOpen(false);
            setLoginReason(null);
            addNotification({
              title: 'Login Admin Berhasil',
              message: 'Selamat datang! Mode Pengelolaan & Edit Data kini aktif penuh.',
              type: 'system'
            });
          }}
          onClose={() => {
            setIsLoginModalOpen(false);
            setLoginReason(null);
          }}
          reason={loginReason}
        />
      )}

      {/* Floating Automated Notification Toast */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-emerald-500/40 max-w-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white mb-0.5 truncate">
              {activeToast.title}
            </div>
            <div className="text-[11px] text-slate-300 leading-snug">
              {activeToast.message}
            </div>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Application Minimal Footer */}
      <footer role="contentinfo" className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-4 text-center mb-16 md:mb-0 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Sistem Database Pengukuran Media OOH &amp; DOOH Jawa Barat · Powered by Spatial Heatmap &amp; Real-Time Telemetry
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>Bandung, Cimahi, KBB, Garut, Sukabumi, Tasikmalaya, Subang, Ciamis</span>
            <span>·</span>
            <button
              onClick={() => {
                if (!isAdminAuthenticated) {
                  handleRequestAdminLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk mereset database ke data awal.');
                  return;
                }
                if (confirm('Kembalikan database ke data awal?')) {
                  const resetSpots = resetToInitialSpots();
                  setSpots(resetSpots);
                }
              }}
              className="text-slate-400 hover:text-emerald-400 underline transition-colors cursor-pointer"
            >
              Reset Data Awal
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Responsive Bottom Dock Navigation for Handphones */}
      <div className="no-print">
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalSpots={spots.length}
        />
      </div>

    </div>
  );
}
