import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle, 
  Eye, 
  Building,
  TrendingUp,
  ShieldCheck,
  Printer
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { generateMonthlyPDFReport } from '../utils/pdfExport';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { addNotification } from '../services/storageService';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: MediaSpot[];
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  spots
}) => {
  const [reportPeriod, setReportPeriod] = useState<string>('September 2026');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalSpots = spots.length;
  const availableSpots = spots.filter((s) => s.isAvailable).length;
  const soldOutSpots = totalSpots - availableSpots;
  const occupancyRate = totalSpots > 0 ? Math.round((soldOutSpots / totalSpots) * 100) : 0;
  const totalDailyTraffic = spots.reduce((acc, s) => acc + s.dailyTraffic, 0);
  const totalDailyImpressions = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
  const totalMonthlyImpressions = totalDailyImpressions * 30;
  const totalMonthlyPortfolio = spots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const filename = generateMonthlyPDFReport(spots, reportPeriod);
        
        addNotification({
          title: 'Laporan PDF Bulanan Dibuat',
          message: `Laporan resmi ${reportPeriod} berhasil diunduh (${totalSpots} titik inventaris).`,
          type: 'system'
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Ekspor Laporan Kinerja & Inventaris Bulanan (PDF)
              </h3>
              <p className="text-xs text-slate-300">
                Dokumen resmi pengukuran media OOH & DOOH Kota Bandung dan Jawa Barat
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Period Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-900">Periode Laporan:</span>
            </div>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="September 2026">September 2026 (Bulan Berjalan)</option>
              <option value="Agustus 2026">Agustus 2026</option>
              <option value="Juli 2026">Juli 2026</option>
              <option value="Kuartal III 2026">Kuartal III 2026</option>
            </select>
          </div>

          {/* Executive Summary Metrics Preview */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5">
              Ringkasan Data yang Akan Diekspor:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Total Titik</div>
                <div className="text-base font-bold text-slate-900">{totalSpots} Media</div>
                <div className="text-[10px] text-emerald-600 font-medium">{availableSpots} Tersedia</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Occupancy Rate</div>
                <div className="text-base font-bold text-slate-900">{occupancyRate}%</div>
                <div className="text-[10px] text-rose-600 font-medium">{soldOutSpots} Tersewa</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Est. Impresi / Bln</div>
                <div className="text-base font-bold text-amber-600 font-mono">{formatCompactNumber(totalMonthlyImpressions)}</div>
                <div className="text-[10px] text-slate-500">OTS Views</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Nilai Portofolio (1 Bln)</div>
                <div className="text-base font-bold text-blue-600">{formatCompactNumber(totalMonthlyPortfolio)}</div>
                <div className="text-[10px] text-slate-500">Gross Inventory</div>
              </div>
            </div>
          </div>

          {/* Document Section Overview */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Kelengkapan Laporan Resmi:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
              <li>Header dan stempel legalitas pengukuran media luar ruang Jawa Barat.</li>
              <li>Ringkasan eksekutif inventaris, traffic harian, dan impresi bulanan.</li>
              <li>Distribusi per wilayah (Bandung, Cimahi, Sukabumi, Garut, Tasikmalaya, Ciamis, Subang).</li>
              <li>Tabel titik media unggulan dengan rincian ukuran, layout, dan tarif sewa.</li>
              <li>Ketentuan teknis standar produksi reklame, listrik, asuransi, dan PPN.</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Printer className="w-4 h-4 animate-spin" />
                Menyiapkan PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Unduh PDF Laporan Bulanan
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
