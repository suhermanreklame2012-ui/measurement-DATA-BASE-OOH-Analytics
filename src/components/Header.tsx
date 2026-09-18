import React from 'react';
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
  LogOut
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
  onToggleNotif: () => void;
  isNotifOpen: boolean;
  activeTab: 'map' | 'analytics' | 'table';
  setActiveTab: (tab: 'map' | 'analytics' | 'table') => void;
  isFirestoreConnected?: boolean;
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
  onToggleNotif,
  isNotifOpen,
  activeTab,
  setActiveTab,
  isFirestoreConnected = true
}) => {
  const totalSpots = spots.length;
  const availableSpots = spots.filter(s => s.isAvailable).length;
  const totalDailyImpressions = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
  const doohSpots = spots.filter(s => s.category === 'DOOH_DIGITAL').length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shadow-inner flex-shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  OOH & DOOH Jabar Analytics
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Bandung & Jabar
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate">
                Database Pengukuran Spasial Media Luar Ruang Kota Bandung & Jawa Barat
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar on Large Screens */}
          <div className="hidden lg:flex items-center gap-5 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs">
            <div>
              <div className="text-slate-400 text-[10px]">Total Titik</div>
              <div className="font-semibold text-white">{totalSpots} Media ({doohSpots} DOOH)</div>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <div className="text-slate-400 text-[10px]">Ketersediaan</div>
              <div className="font-semibold text-emerald-400">{availableSpots} Tersedia</div>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <div className="text-slate-400 text-[10px]">Est. Impresi / Hari</div>
              <div className="font-semibold text-amber-300">{formatCompactNumber(totalDailyImpressions)} OTS</div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">

            {/* Sistem AI Keamanan & Integritas Button */}
            <button
              onClick={onOpenAiSecurity}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-950/80 to-teal-950/80 hover:from-emerald-900 hover:to-teal-900 text-emerald-300 border border-emerald-500/50 rounded-lg transition-all shadow-sm group"
              title="Sistem AI Keamanan & Pengawas Integritas Data OOH Jawa Barat"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">AI Keamanan</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                Aktif
              </span>
            </button>

            {/* Firebase Status Badge */}
            <div 
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-amber-300"
              title="Firebase Cloud Firestore Aktif (Project: sewa-billlboard--1741057119832)"
            >
              <Flame className={`w-3.5 h-3.5 ${isFirestoreConnected ? 'text-amber-400 fill-amber-400/20' : 'text-slate-500'}`} />
              <span className="text-[11px] font-medium text-slate-200">
                {isFirestoreConnected ? 'Firestore Cloud' : 'Menghubungkan...'}
              </span>
            </div>
            
            {/* Google Workspace (Sheets, Docs & Drive) Sync Button */}
            <button
              onClick={onOpenDriveSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/50 rounded-lg transition-colors shadow-sm"
              title="Sinkronisasi Google Sheets & Drive (suherman.reklame2012@gmail.com)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Google Workspace</span>
            </button>

            {/* CSV & URL Sync Button */}
            <button
              onClick={onOpenSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors shadow-sm"
              title="Impor / Ekspor CSV & Tautan Publik"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">CSV / Ekspor</span>
            </button>

            {/* AI Proposal & Outreach Button */}
            <button
              onClick={onOpenAiProposal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-colors shadow-sm cursor-pointer border border-emerald-400/30"
              title="Kirim penawaran personal via WhatsApp & Email dengan Gemini AI"
            >
              <Send className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Penawaran AI (WA/Email)</span>
              <span className="sm:hidden">Penawaran</span>
            </button>

            {/* Export Monthly PDF Report */}
            <button
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors shadow-sm"
              title="Ekspor Laporan PDF Bulanan"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Laporan PDF</span>
            </button>

            {/* Add Spot Button */}
            <button
              onClick={onOpenAddSpot}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Titik</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={onToggleNotif}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative"
                aria-label="Notifikasi Otomatis"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-rose-500 text-white flex items-center justify-center rounded-full ring-2 ring-slate-900 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Logout Admin Button */}
            <button
              onClick={() => logoutAdmin()}
              className="p-2 ml-1 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors relative"
              title="Keluar (Logout) sebagai Superadmin"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-1 pb-2">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('map')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Heatmap Spasial
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Tren Real-Time
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'table'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Database Media ({totalSpots})
            </button>
          </nav>

          <div className="text-[11px] text-slate-400 hidden md:block">
            Periode: <span className="text-slate-200 font-medium">Bulan Berjalan 2026</span>
          </div>
        </div>

      </div>
    </header>
  );
};
