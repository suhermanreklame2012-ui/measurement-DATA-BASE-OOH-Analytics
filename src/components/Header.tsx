import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  RefreshCw, 
  Bell, 
  Plus, 
  MapPin, 
  Activity,
  Layers,
  HardDrive,
  FileSpreadsheet,
  Flame,
  ShieldCheck,
  Send,
  LogOut,
  FolderArchive,
  ChevronDown,
  Calculator,
  Sparkles,
  TrendingUp,
  Briefcase,
  Cpu
} from 'lucide-react';
import { MediaSpot, NotificationLog } from '../types/ooh';
import { formatCompactNumber } from '../utils/formatters';
import { logoutAdmin } from '../services/emailAuthService';

interface HeaderProps {
  spots: MediaSpot[];
  notifications: NotificationLog[];
  unreadCount: number;
  onOpenSync: () => void;
  onOpenDriveSync: () => void;
  onOpenAddSpot: () => void;
  onOpenReport: () => void;
  onOpenAiSecurity: () => void;
  onOpenAiProposal: () => void;
  onOpenAiArchitect?: () => void;
  onOpenAvailabilityQueue?: () => void;
  onOpenCrm?: () => void;
  onOpenEstimatedRoi?: () => void;
  onToggleNotif: () => void;
  isNotifOpen: boolean;
  activeTab: 'map' | 'analytics' | 'table' | 'planner' | 'roi' | 'crm';
  setActiveTab: (tab: 'map' | 'analytics' | 'table' | 'planner' | 'roi' | 'crm') => void;
  isFirestoreConnected?: boolean;
  isAdmin?: boolean;
  onOpenLogin?: (reason?: string) => void;
  adminEmail?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  spots,
  unreadCount,
  onOpenSync,
  onOpenDriveSync,
  onOpenAddSpot,
  onOpenReport,
  onOpenAiSecurity,
  onOpenAiProposal,
  onOpenAiArchitect,
  onOpenAvailabilityQueue,
  onOpenCrm,
  onOpenEstimatedRoi,
  onToggleNotif,
  isNotifOpen,
  activeTab,
  setActiveTab,
  isFirestoreConnected = true,
  isAdmin = false,
  onOpenLogin,
  adminEmail,
  onLogout
}) => {
  const totalSpots = spots.length;
  const availableSpots = spots.filter(s => s.isAvailable).length;
  const totalDailyImpressions = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
  const doohSpots = spots.filter(s => s.category === 'DOOH_DIGITAL').length;

  // Master Data Base folder menu state & ref
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState<boolean>(false);
  const masterMenuRef = useRef<HTMLDivElement>(null);

  // Close Master Data Base folder menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (masterMenuRef.current && !masterMenuRef.current.contains(event.target as Node)) {
        setIsMasterMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMasterMenuOpen(false);
      }
    };

    if (isMasterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMasterMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Flex Container: Logo, Navigation Links, and Administrative Controls properly aligned with flex-wrap and gap-x-4 */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 py-2.5 sm:py-3">
          
          {/* 1. Logo & App Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 order-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/40 flex-shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
                  OOH &amp; DOOH Jabar Analytics
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                  Bandung &amp; Jabar
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden 2xl:block truncate mt-0.5">
                Database Pengukuran Spasial Media Luar Ruang Kota Bandung &amp; Jawa Barat
              </p>
            </div>
          </div>

          {/* 2. Navigation Links: Flex-wrap with gap-x-2 and clean stacking */}
          <nav 
            className="flex flex-wrap items-center gap-1 sm:gap-x-2 gap-y-1.5 order-3 lg:order-2 w-full lg:w-auto" 
            aria-label="Navigasi Fitur Utama"
          >
            <button
              onClick={() => setActiveTab('map')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors select-none cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Heatmap Spasial</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors select-none cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Activity className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Tren Real-Time</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors select-none cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Database Media</span>
              <span className="text-[11px] opacity-80 font-mono">({totalSpots})</span>
            </button>
            <button
              onClick={() => setActiveTab('planner')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors select-none cursor-pointer ${
                activeTab === 'planner'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span>Strategic Planner</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                activeTab === 'planner' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}>
                AI
              </span>
            </button>
            <button
              onClick={() => setActiveTab('roi')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors select-none cursor-pointer ${
                activeTab === 'roi'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Estimated ROI</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                activeTab === 'roi' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                CTR
              </span>
            </button>
            <button
              onClick={() => setActiveTab('crm')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors select-none cursor-pointer ${
                activeTab === 'crm'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Pipeline CRM</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                activeTab === 'crm' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                Sales
              </span>
            </button>
          </nav>

          {/* 3. Administrative Controls: Proper alignment with flex-wrap and gap-x-4 */}
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 shrink-0 order-2 lg:order-3">

            {/* AI ARCHITECT HUB BUTTON */}
            <button
              type="button"
              id="main-header-ai-architect-btn"
              onClick={() => {
                if (onOpenAiArchitect) onOpenAiArchitect();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-xs cursor-pointer select-none bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-200 hover:text-white border-indigo-500/40 whitespace-nowrap"
              title="Tri-Layer AI Architecture Center (CTO + Business Agent + Automation Engineer)"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="hidden sm:inline">AI Architect</span>
              <span className="sm:hidden">AI</span>
            </button>

            {/* MASTER DATA BASE FOLDER MENU */}
            <div className="relative" ref={masterMenuRef}>
              <button
                type="button"
                id="master-database-menu-btn"
                onClick={() => setIsMasterMenuOpen(!isMasterMenuOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-xs cursor-pointer select-none whitespace-nowrap ${
                  isMasterMenuOpen 
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/40' 
                    : 'bg-slate-800 hover:bg-slate-700/90 text-slate-200 hover:text-white border-slate-700 hover:border-emerald-500/40'
                }`}
                aria-expanded={isMasterMenuOpen}
                title="Folder Menu Master Data Base (Tambah Titik, Integrasi, Ekspor, AI & Keamanan)"
              >
                <FolderArchive className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="hidden sm:inline">Master Data</span>
                <span className="sm:hidden">Master</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isMasterMenuOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
              </button>

              {/* Master Data Base Dropdown Menu */}
              {isMasterMenuOpen && (
                <div 
                  id="master-database-dropdown"
                  className="absolute right-0 mt-2 w-80 sm:w-88 bg-slate-900/98 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-800"
                >
                  {/* Menu Header */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-950/90 to-slate-900 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                          <FolderArchive className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                            Master Data Base
                          </h3>
                          <p className="text-[10px] text-slate-400">
                            Pusat inventaris, sinkronisasi, pelaporan &amp; AI
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                        9 Menu
                      </span>
                    </div>
                  </div>

                  {/* 1. Entri Titik Media Baru */}
                  <div className="p-2">
                    <button
                      type="button"
                      id="menu-add-spot-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        if (!isAdmin && onOpenLogin) {
                          onOpenLogin('Akses Khusus Admin: Silakan masuk sebagai Admin untuk menambahkan titik reklame baru.');
                          return;
                        }
                        onOpenAddSpot();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 hover:border-emerald-500/60 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                            Tambah Titik Media
                          </span>
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/30 px-1.5 py-0.2 rounded border border-emerald-500/40">
                            {isAdmin ? '+ Baru' : 'Kunci Admin'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate">
                          Input data billboard / DOOH baru ke database
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* 2. Integrasi Cloud & Pertukaran Data */}
                  <div className="p-2 space-y-1">
                    <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sinkronisasi & Impor/Ekspor
                    </div>

                    {/* Google Workspace */}
                    <button
                      type="button"
                      id="menu-google-workspace-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenDriveSync();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            Google Workspace
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">Sheets & Drive</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Sinkronisasi otomatis Google Sheets & Drive
                        </p>
                      </div>
                    </button>

                    {/* CSV / Ekspor */}
                    <button
                      type="button"
                      id="menu-csv-sync-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenSync();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            CSV / Ekspor
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Data Ekspor</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Impor CSV file & tautan publik database
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* 3. Otomasi AI & Dokumen Laporan */}
                  <div className="p-2 space-y-1">
                    <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Otomasi & Pemasaran
                    </div>

                    {/* Strategic Media Planner */}
                    <button
                      type="button"
                      id="menu-strategic-planner-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        setActiveTab('planner');
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            Strategic Media Planner
                          </span>
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">
                            AI Knapsack
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Optimasi anggaran & maksimalkan jangkauan OTS
                        </p>
                      </div>
                    </button>

                    {/* Estimated ROI Calculator */}
                    <button
                      type="button"
                      id="menu-estimated-roi-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        if (onOpenEstimatedRoi) {
                          onOpenEstimatedRoi();
                        } else {
                          setActiveTab('roi');
                        }
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            Estimated ROI Calculator
                          </span>
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            OOH CTR
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Kalkulasi konversi dari impresi harian & CTR industri
                        </p>
                      </div>
                    </button>

                    {/* Penawaran AI */}
                    <button
                      type="button"
                      id="menu-ai-proposal-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenAiProposal();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-950/80 text-teal-300 border border-teal-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Send className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            Penawaran AI (WA/Email)
                          </span>
                          <span className="text-[10px] font-bold text-teal-300 bg-teal-500/20 px-1.5 py-0.2 rounded border border-teal-500/30">
                            Gemini AI
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Generator penawaran personal WhatsApp & Email
                        </p>
                      </div>
                    </button>

                    {/* Laporan PDF */}
                    <button
                      type="button"
                      id="menu-pdf-report-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenReport();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            Laporan PDF Bulanan
                          </span>
                          <span className="text-[10px] text-blue-300 font-mono">PDF Bulanan</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Ekspor laporan performa & cetak PDF media
                        </p>
                      </div>
                    </button>
                  </div>

                    {/* 4. Sistem Keamanan & Integritas Data */}
                  <div className="p-2 space-y-1">
                    <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Arsitektur & Pengawasan
                    </div>

                    {/* Tri-Layer AI Architect Center */}
                    <button
                      type="button"
                      id="menu-tri-layer-architect-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        if (onOpenAiArchitect) onOpenAiArchitect();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            AI Architect 3-Lapis
                          </span>
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">
                            CTO+n8n
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Arsitektur sistem, blueprint 15 bagian & n8n JSON
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="menu-ai-security-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenAiSecurity();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            AI Keamanan
                          </span>
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            Aktif
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Sistem pengawas integritas data OOH Jawa Barat
                        </p>
                      </div>
                    </button>

                    {/* Antrean Ketersediaan & Demand (Mock-Queue) */}
                    <button
                      type="button"
                      id="menu-availability-queue-btn"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        if (onOpenAvailabilityQueue) onOpenAvailabilityQueue();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Flame className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            Antrean Ketersediaan & Demand
                          </span>
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                            Mock-Queue
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Pantau titik tersewa ber-demand tinggi & antrean prospek
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative shrink-0">
              <button
                onClick={onToggleNotif}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative cursor-pointer"
                aria-label="Notifikasi Otomatis"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[9px] font-bold bg-rose-500 text-white flex items-center justify-center rounded-full ring-2 ring-slate-900 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Auth Controls: Masuk Admin vs Logout Superadmin */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 pl-0.5 shrink-0">
                <div 
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                  title={`Login sebagai Superadmin: ${adminEmail || 'suherman.Reklame2012@gmail.com'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="text-[11px] font-bold text-emerald-400">Admin</span>
                  <span className="hidden lg:inline text-[11px] text-slate-300 max-w-[95px] truncate font-mono">
                    {adminEmail ? adminEmail.split('@')[0] : 'suherman'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onLogout) {
                      onLogout();
                    } else {
                      logoutAdmin();
                    }
                  }}
                  className="px-2 py-1 text-xs text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold whitespace-nowrap"
                  title="Keluar (Logout) sebagai Superadmin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">Keluar</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenLogin && onOpenLogin('Silakan masuk sebagai Admin untuk mengelola, menambah, dan mengedit data inventaris reklame.')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer select-none whitespace-nowrap active:scale-95"
                  title="Masuk sebagai Administrator untuk mengedit & merubah data"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-200 flex-shrink-0" />
                  <span>Masuk Admin</span>
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </header>
  );
};
