import React, { useState, useRef } from 'react';
import { 
  X, 
  RefreshCw, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle, 
  ExternalLink,
  HelpCircle,
  FileText
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { parseCSVToSpots, exportSpotsToCSV, addNotification } from '../services/storageService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: MediaSpot[];
  onDataLoaded: (newSpots: MediaSpot[], sourceMessage: string) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  spots,
  onDataLoaded
}) => {
  const [sheetUrl, setSheetUrl] = useState<string>(
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_SAMPLE_OOH_BANDUNG/pub?output=csv'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Fetching from live Google Sheets CSV link
  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: '' });

    try {
      // If user inputs standard spreadsheet edit URL, convert it to CSV export URL
      let targetUrl = sheetUrl.trim();
      if (targetUrl.includes('/edit')) {
        targetUrl = targetUrl.replace(/\/edit.*$/, '/export?format=csv');
      }

      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal mengunduh data dari Google Sheets. Pastikan sheet disetel 'Public' atau 'Publish to web'.`);
      }
      const csvData = await res.text();
      const { spots: parsedSpots, errors } = parseCSVToSpots(csvData);

      if (parsedSpots.length === 0) {
        throw new Error('Tidak ada baris data valid yang ditemukan pada sheet ini.');
      }

      onDataLoaded(parsedSpots, `Sinkronisasi Google Sheets (${parsedSpots.length} titik dimuat)`);
      
      // Auto Notification trigger
      addNotification({
        title: 'Sinkronisasi Google Sheets Berhasil',
        message: `Berhasil menyinkronkan ${parsedSpots.length} titik media OOH/DOOH dari Google Sheets.`,
        type: 'sync',
        itemCount: parsedSpots.length
      });

      setSyncStatus({
        type: 'success',
        message: `Berhasil menyinkronkan ${parsedSpots.length} titik media dari Google Sheets!`
      });
    } catch (err: any) {
      console.error(err);
      // If direct fetch is blocked by CORS in sandbox, explain clearly and offer local sample or CSV upload
      setSyncStatus({
        type: 'error',
        message: err.message || 'Gagal menyinkronkan Google Sheets. Gunakan fitur upload file CSV di bawah jika URL belum dipublish ke web.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle local CSV File Upload (Drag & Drop or Click)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { spots: parsedSpots } = parseCSVToSpots(text);

        if (parsedSpots.length === 0) {
          setSyncStatus({
            type: 'error',
            message: 'Format file CSV tidak terbaca. Pastikan kolom sesuai format.'
          });
          return;
        }

        onDataLoaded(parsedSpots, `Unggah file CSV (${parsedSpots.length} titik baru dimuat)`);

        // Trigger Automated Notification immediately
        addNotification({
          title: 'Data CSV Berhasil Diunggah',
          message: `Berhasil mengunggah file "${file.name}" berisi ${parsedSpots.length} titik media OOH/DOOH.`,
          type: 'upload',
          itemCount: parsedSpots.length
        });

        setSyncStatus({
          type: 'success',
          message: `Sukses mengimpor ${parsedSpots.length} titik media dari file ${file.name}.`
        });
      } catch (err: any) {
        setSyncStatus({
          type: 'error',
          message: 'Terjadi kesalahan saat memproses file CSV: ' + err.message
        });
      }
    };
    reader.readAsText(file);
  };

  // Export current dataset to CSV
  const handleExportCSV = () => {
    const csvContent = exportSpotsToCSV(spots);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Database_OOH_DOOH_Bandung_Jabar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification({
      title: 'Database Diekspor ke CSV',
      message: `${spots.length} titik media berhasil diunduh dalam format CSV kompatibel Google Sheets.`,
      type: 'system'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Sinkronisasi Google Sheets & Impor CSV
              </h3>
              <p className="text-xs text-slate-500">
                Pembaruan data dua arah dengan notifikasi otomatis setiap kali data diunggah
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Status Alert */}
          {syncStatus.type !== 'idle' && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              syncStatus.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {syncStatus.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">{syncStatus.message}</div>
            </div>
          )}

          {/* Method 1: Direct Google Sheets URL Live Sync */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-900 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                Sinkronisasi Langsung Tautan Google Sheets:
              </label>
              <span className="text-[10px] text-slate-400">Otomatis / URL Live</span>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSyncGoogleSheets}
                disabled={isSyncing || !sheetUrl.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors flex-shrink-0 shadow-xs"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyinkronkan...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tarik Data
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[11px] text-slate-500">
              *Tips Google Sheets: Buka menu <em>File → Bagikan → Publikasikan ke web</em>, lalu pilih format <strong>Comma-separated values (.csv)</strong>.
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-semibold">
              <span className="bg-white px-2 text-slate-400">Atau Unggah Berkas Langsung</span>
            </div>
          </div>

          {/* Method 2: Drag & Drop / File Input CSV */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-xl p-5 text-center cursor-pointer transition-all space-y-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-xs">
                Klik untuk Memilih Berkas CSV atau Tarik & Lepas (Drag & Drop)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Mendukung berkas data inventaris iklan OOH & DOOH (.csv)
              </div>
            </div>
          </div>

          {/* Export & Download Section */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900 text-xs">Ekspor Data Saat Ini</div>
              <div className="text-[11px] text-slate-500">Unduh data terkini untuk dibuka langsung di Google Sheets atau Excel.</div>
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors text-xs flex-shrink-0 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Unduh CSV ({spots.length} Titik)
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
