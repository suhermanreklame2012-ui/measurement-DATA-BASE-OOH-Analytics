import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  X,
  Search,
  CheckCircle2,
  Database,
  ExternalLink,
  Car,
  Users,
  MapPin,
  ClipboardCheck,
  Globe2,
  DollarSign,
  Award,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Sparkles,
  BarChart3,
  Layers
} from 'lucide-react';
import { EXTERNAL_DATA_SOURCES, ExternalDataSource, getSourcesSummary } from '../data/externalDataSources';

export interface ExternalDataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialSourceId?: string;
}

export const ExternalDataSourcesModal: React.FC<ExternalDataSourcesModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'all',
  initialSourceId
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const summary = useMemo(() => getSourcesSummary(), []);

  // Filter sources based on category and search query
  const filteredSources = useMemo(() => {
    return EXTERNAL_DATA_SOURCES.filter((source) => {
      const matchesCategory =
        selectedCategory === 'all' || source.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        source.name.toLowerCase().includes(q) ||
        source.organization.toLowerCase().includes(q) ||
        source.dataType.toLowerCase().includes(q) ||
        source.collectionMethodology.toLowerCase().includes(q) ||
        source.standardReference.toLowerCase().includes(q) ||
        source.producedMetrics.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleCopyMethodology = (source: ExternalDataSource) => {
    const textToCopy = `[Sumber Data Terverifikasi OOH Analytics]\nNama Sumber: ${source.name}\nOrganisasi: ${source.organization}\nTipe Data: ${source.dataType}\nPersentase Akurasi: ${source.accuracyPercentage}% (${source.marginOfError})\nStatus: Terverifikasi (${source.verificationBadgeText})\nMetodologi: ${source.collectionMethodology}\nStandar Acuan: ${source.standardReference}\nPeriode Audit: ${source.verifiedDate}`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(source.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const getCategoryIcon = (category: ExternalDataSource['category']) => {
    switch (category) {
      case 'traffic':
        return <Car className="w-4 h-4 text-blue-500" />;
      case 'demographics':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'geospatial':
        return <MapPin className="w-4 h-4 text-rose-500" />;
      case 'survey_logs':
        return <ClipboardCheck className="w-4 h-4 text-amber-500" />;
      case 'standards':
        return <Globe2 className="w-4 h-4 text-emerald-500" />;
      case 'pricing':
        return <DollarSign className="w-4 h-4 text-teal-500" />;
      default:
        return <Database className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      id="modal-external-data-sources"
      data-testid="modal-external-data-sources"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/40 shrink-0 border border-emerald-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Sumber Pengambilan Data Eksternal &amp; Audit Akurasi Analisa
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold">
                  {summary.verifiedCount}/{summary.total} Sumber Terverifikasi
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Inventaris resmi penyedia data (Traffic API, BPS, Google Maps, Internal Survey Logs) dengan transparansi metodologi &amp; tingkat akurasi
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-external-sources-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 p-4 sm:px-6 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* KPI 1: Overall Accuracy */}
            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Rata-rata Akurasi Platform
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {summary.avgAccuracy}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">({summary.avgMarginOfError})</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Tingkat Keandalan Sangat Tinggi
              </div>
            </div>

            {/* KPI 2: Verified Sources Ratio */}
            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status Sumber Resmi
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  100%
                </span>
                <span className="text-[10px] text-slate-400">Tersertifikasi</span>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-300 font-medium mt-0.5 flex items-center gap-1">
                <Award className="w-3 h-3" />
                6 dari 6 Memiliki Audit Terverifikasi
              </div>
            </div>

            {/* KPI 3: Key Authorities & Providers */}
            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mitra &amp; Penyedia Data
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                Dishub, BPS, Google &amp; WOO
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Pemerintah, Global &amp; Tim Lapangan
              </div>
            </div>

            {/* KPI 4: Audit Cycle */}
            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Periode Sinkronisasi
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                Q1 2026 (Aktif)
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                Real-Time &amp; Bulanan
              </div>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-data-sources"
                placeholder="Cari sumber (Dishub, BPS, Google, dll)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua Sumber ({EXTERNAL_DATA_SOURCES.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('traffic')}
                className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'traffic'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Traffic API
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('demographics')}
                className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'demographics'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                BPS
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('geospatial')}
                className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'geospatial'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Google Maps
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('survey_logs')}
                className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'survey_logs'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Survey Logs Fisik
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: List of Sources by Data Type */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {filteredSources.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Tidak ada sumber data yang cocok
              </div>
              <p className="text-[11px] mt-1">Coba sesuaikan kata kunci pencarian atau ganti kategori filter.</p>
            </div>
          ) : (
            filteredSources.map((source, idx) => {
              const isHighlighted = initialSourceId === source.id;

              return (
                <div
                  key={source.id}
                  id={`source-card-${source.id}`}
                  className={`bg-white dark:bg-slate-800/70 rounded-2xl border p-4 sm:p-5 transition-all shadow-sm ${
                    isHighlighted
                      ? 'border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500/50'
                  }`}
                >
                  {/* Top Bar: Source Name, Entity & Verified Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 mt-0.5">
                        {getCategoryIcon(source.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {source.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-semibold">
                            {source.categoryLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Penyedia: <strong className="text-slate-800 dark:text-slate-200 font-medium">{source.organization}</strong>
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Tipe Data: {source.dataType}
                        </div>
                      </div>
                    </div>

                    {/* Verified Badge & Accuracy Meter */}
                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between gap-2 shrink-0">
                      {/* VERIFIED BADGE */}
                      {source.isVerified && (
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 text-[11px] font-bold shadow-2xs"
                          title={`Terkonfirmasi dan terverifikasi resmi oleh ${source.verifiedBy}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{source.verificationBadgeText}</span>
                        </div>
                      )}

                      {/* Accuracy Score Tag */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Tingkat Akurasi:</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-emerald-400 dark:bg-slate-950 text-xs font-extrabold font-mono border border-emerald-500/30">
                          {source.accuracyPercentage}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({source.marginOfError})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Accuracy Bar Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      <span>Tingkat Presisi / Confidence Level: <strong>{source.confidenceLevel}</strong></span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{source.accuracyPercentage}% presisi</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${source.accuracyPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Collection Methodology Section */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-200 text-[11px] uppercase tracking-wider block mb-1">
                        Metodologi Pengambilan &amp; Perhitungan Data:
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px] bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        {source.collectionMethodology}
                      </p>
                    </div>

                    {/* Produced Metrics Pills */}
                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider block mb-1.5">
                        Metrik Analisa yang Dihasilkan:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {source.producedMetrics.map((metric, mIdx) => (
                          <span
                            key={mIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10.5px] border border-slate-200 dark:border-slate-600 flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {metric}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Metadata Badges: Integration, Standard & Audit Frequency */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[10px]">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block font-semibold">Tipe Integrasi:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{source.integrationType}</strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block font-semibold">Standar &amp; Regulasi:</span>
                        <strong className="text-slate-800 dark:text-slate-200 truncate block" title={source.standardReference}>
                          {source.standardReference}
                        </strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block font-semibold">Siklus Audit:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{source.auditFrequency}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyMethodology(source)}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Salin referensi metodologi untuk lampiran proposal klien"
                        >
                          {copiedId === source.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600">Disalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              Seluruh data dievaluasi secara berkala sesuai standar periklanan luar ruang SNI &amp; World Out of Home Organization (WOO).
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              id="btn-close-source-modal-bottom"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Tutup Modal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
