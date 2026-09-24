import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Download, 
  X, 
  Check, 
  Clock, 
  PieChart as PieIcon, 
  BarChart3, 
  Trophy, 
  Zap, 
  Presentation, 
  Loader2, 
  Sparkles,
  FileImage,
  Layers
} from 'lucide-react';
import { exportChartElementAsPng } from '../utils/chartExport';

export interface ChartExportItem {
  id: string;
  elementId: string;
  filename: string;
  title: string;
  subtitle: string;
  type: 'presentation' | 'line' | 'pie' | 'bar' | 'table' | 'kpi';
  badge?: string;
}

interface ChartExportFloatingMenuProps {
  activeRegion: string;
}

export const ChartExportFloatingMenu: React.FC<ChartExportFloatingMenuProps> = ({ activeRegion }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const exportOptions: ChartExportItem[] = [
    {
      id: 'full-suite',
      elementId: 'charts-presentation-suite',
      filename: `OOH-Jabar-Presentation-Suite-${activeRegion}`,
      title: 'Full Presentation Slide (Semua Grafik)',
      subtitle: 'Komprehensif: Traffic 24 Jam, Koridor, Format & Top 5',
      type: 'presentation',
      badge: 'Rekomendasi Slide Deck'
    },
    {
      id: 'hourly-traffic',
      elementId: 'chart-card-hourly-traffic',
      filename: `OOH-Jabar-Traffic-24Jam-${activeRegion}`,
      title: 'Tren Arus Lalu Lintas & OTS (24 Jam)',
      subtitle: 'Line Chart pola komuter puncak pagi & sore',
      type: 'line'
    },
    {
      id: 'location-type',
      elementId: 'chart-card-location-type',
      filename: `OOH-Jabar-Karakteristik-Koridor-${activeRegion}`,
      title: 'Karakteristik Koridor Lokasi',
      subtitle: 'Donut Chart sebaran titik per zona geografis',
      type: 'pie'
    },
    {
      id: 'media-format',
      elementId: 'chart-card-media-format',
      filename: `OOH-Jabar-Performa-Format-Media-${activeRegion}`,
      title: 'Performa per Format Media',
      subtitle: 'Bar Chart jumlah titik & ribuan impresi (k OTS)',
      type: 'bar'
    },
    {
      id: 'top-spots',
      elementId: 'chart-card-top-spots',
      filename: `OOH-Jabar-Top-5-Prime-Spots-${activeRegion}`,
      title: 'Top 5 Titik Impresi Tertinggi',
      subtitle: 'Leaderboard lokasi prime spatial reach & tarif',
      type: 'table'
    },
    {
      id: 'kpi-banner',
      elementId: 'chart-card-kpi-banner',
      filename: `OOH-Jabar-KPI-Telemetry-Banner-${activeRegion}`,
      title: 'Banner Telemetri OTS & Portofolio',
      subtitle: 'Statistik live impresi, okupansi & nilai aset',
      type: 'kpi'
    }
  ];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleExport = async (item: ChartExportItem) => {
    setExportingId(item.id);
    try {
      const savedName = await exportChartElementAsPng(item.elementId, item.filename, {
        scale: 2,
        backgroundColor: '#ffffff',
        regionName: activeRegion
      });

      setToastMessage(`Grafik "${item.title}" berhasil diunduh sebagai PNG!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal mengekspor grafik ke PNG. Pastikan elemen terlihat di layar.');
    } finally {
      setExportingId(null);
    }
  };

  const getItemIcon = (type: ChartExportItem['type']) => {
    switch (type) {
      case 'presentation':
        return <Presentation className="w-4 h-4 text-emerald-600" />;
      case 'line':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pie':
        return <PieIcon className="w-4 h-4 text-amber-600" />;
      case 'bar':
        return <BarChart3 className="w-4 h-4 text-purple-600" />;
      case 'table':
        return <Trophy className="w-4 h-4 text-amber-500" />;
      case 'kpi':
        return <Zap className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileImage className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <>
      {/* Floating Action Menu Container */}
      <div 
        ref={menuRef} 
        id="analytics-chart-export-fab-container"
        data-testid="analytics-chart-export-fab-container"
        className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8 flex flex-col items-end"
      >
        {/* Expanded Popup Menu */}
        {isOpen && (
          <div 
            id="chart-export-floating-menu"
            data-testid="chart-export-floating-menu"
            className="mb-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                    <span>Export Charts as PNG</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono font-bold">
                      2x HD
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Format gambar siap pakai untuk slide presentasi &amp; proposal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Region Target Bar */}
            <div className="bg-emerald-50/80 px-4 py-2 border-b border-emerald-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Wilayah Aktif:</span>
              <strong className="text-emerald-800 font-bold truncate max-w-[180px]">{activeRegion}</strong>
            </div>

            {/* List of Exportable Charts */}
            <div className="p-2 space-y-1 max-h-[380px] overflow-y-auto">
              {exportOptions.map((item) => {
                const isCurrentExporting = exportingId === item.id;
                const isPresentationSuite = item.id === 'full-suite';

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={exportingId !== null}
                    onClick={() => handleExport(item)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                      isPresentationSuite
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 hover:from-emerald-100 hover:to-teal-100 hover:shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                    } ${exportingId !== null && !isCurrentExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isPresentationSuite 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-700 group-hover:bg-white group-hover:shadow-2xs'
                      }`}>
                        {isCurrentExporting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          getItemIcon(item.type)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-xs truncate ${isPresentationSuite ? 'text-emerald-950 font-extrabold' : 'text-slate-900'}`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-semibold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <span className={`p-1.5 rounded-lg transition-colors ${
                        isPresentationSuite 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}>
                        {isCurrentExporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Tip */}
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Gambar PNG berkualitas tinggi langsung tersimpan di folder unduhan</span>
            </div>
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          id="btn-chart-export-fab"
          data-testid="btn-chart-export-fab"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Export Charts as PNG Images"
          className={`group flex items-center gap-2.5 px-4 py-3 sm:px-4.5 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
            isOpen
              ? 'bg-slate-900 text-white border border-slate-700 ring-4 ring-slate-800/30'
              : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 border border-emerald-300 ring-4 ring-emerald-500/20 shadow-emerald-600/30'
          }`}
          title="Ekspor Grafik Analisis OOH sebagai Gambar PNG Presentasi"
        >
          {isOpen ? (
            <>
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="text-white font-bold">Tutup Menu</span>
            </>
          ) : (
            <>
              <div className="relative">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950/20" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              </div>
              <span className="font-extrabold tracking-tight">Export Chart PNG</span>
            </>
          )}
        </button>
      </div>

      {/* Floating Success Toast */}
      {toastMessage && (
        <div 
          id="toast-chart-export-success"
          data-testid="toast-chart-export-success"
          className="fixed bottom-22 right-6 z-50 max-w-sm bg-slate-950/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <span className="font-bold text-emerald-400 block text-[11px] uppercase tracking-wider">Berhasil Diunduh</span>
            <span className="text-slate-200 font-medium line-clamp-1">{toastMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
