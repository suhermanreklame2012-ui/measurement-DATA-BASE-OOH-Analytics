import React from 'react';
import {
  ShieldCheck,
  X,
  Database,
  BarChart3,
  Car,
  Eye,
  Sparkles,
  Users,
  CheckCircle2,
  ExternalLink,
  Award,
  AlertCircle
} from 'lucide-react';
import { ANALYTICS_METRICS_SOURCES, getOverallAnalyticsAccuracy } from '../utils/analyticsSourceData';

interface AnalyticsSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMetricKey?: 'traffic' | 'impressions' | 'visibility' | 'demographics' | 'roi_cpm';
}

export const AnalyticsSourceModal: React.FC<AnalyticsSourceModalProps> = ({
  isOpen,
  onClose,
  activeMetricKey
}) => {
  if (!isOpen) return null;

  const { overallAccuracy, averageMarginOfError } = getOverallAnalyticsAccuracy();

  const getMetricIcon = (key: string) => {
    switch (key) {
      case 'traffic':
        return <Car className="w-5 h-5 text-blue-500" />;
      case 'impressions':
        return <Eye className="w-5 h-5 text-emerald-500" />;
      case 'visibility':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'demographics':
        return <Users className="w-5 h-5 text-purple-500" />;
      case 'roi_cpm':
        return <BarChart3 className="w-5 h-5 text-teal-500" />;
      default:
        return <Database className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div
      id="modal-analytics-source-methodology"
      data-testid="modal-analytics-source-methodology"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>Sumber Pengambilan Data &amp; Akurasi Analisa</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold border border-emerald-400/30">
                  {overallAccuracy}% Rata-rata Akurasi
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Transparansi metodologi ilmiah, sumber audit resmi, dan tingkat presisi perhitungan kalkulasi media
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-source-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Overall Confidence Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-emerald-300 text-sm">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Indeks Keandalan Analisa Media (Media Reliability Index): {overallAccuracy}%</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Setiap angka trafik, impresi (OTS), dan visibilitas dihitung secara deterministik berstandar industri periklanan luar ruang (OOH/DOOH) dengan margin error rata-rata <strong>{averageMarginOfError}</strong>.
              </p>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 pl-3 border-t sm:border-t-0 sm:border-l border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Tingkat Presisi</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {overallAccuracy}%
              </span>
            </div>
          </div>

          {/* Detailed Metric Source Breakdown Cards */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Rincian Sumber Data &amp; Persentase Akurasi Tiap Metrik</span>
            </h4>

            <div className="grid grid-cols-1 gap-3.5">
              {Object.values(ANALYTICS_METRICS_SOURCES).map((metric) => {
                const isSelected = activeMetricKey === metric.key;

                return (
                  <div
                    key={metric.key}
                    id={`metric-source-card-${metric.key}`}
                    className={`rounded-xl p-4 border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-400/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-700/80">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5">
                          {getMetricIcon(metric.key)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {metric.name}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            Sumber: <strong className="text-slate-800 dark:text-slate-200 font-medium">{metric.source}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Accuracy Percentage Badge */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-400/50 shadow-2xs flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Akurasi:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                            {metric.accuracyPercentage}%
                          </span>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                          {metric.marginOfError}
                        </span>
                      </div>
                    </div>

                    {/* Methodology & Regulatory Standards */}
                    <div className="mt-2.5 pt-1 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                      <div className="md:col-span-2 space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block text-[10px] uppercase tracking-wider">
                          Metodologi Perhitungan:
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {metric.methodology}
                        </p>
                      </div>

                      <div className="space-y-1.5 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Standar Acuan:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                            {metric.regulatoryStandard}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold">Periode Audit:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                            {metric.auditPeriod}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Data diaudit dan dikalibrasi berkala bersama mitra dinas terkait dan asosiasi periklanan Jawa Barat.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0"
          >
            Tutup Informasi
          </button>
        </div>
      </div>
    </div>
  );
};
