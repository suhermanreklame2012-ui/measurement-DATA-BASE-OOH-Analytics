import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Bell, 
  Flame, 
  Users, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ExternalLink, 
  MessageCircle, 
  Trash2, 
  RefreshCw, 
  Filter, 
  Plus, 
  Sparkles,
  TrendingUp,
  MapPin,
  Building2,
  DollarSign
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { 
  AvailabilityAlertItem, 
  getAvailabilityAlertsQueue, 
  updateAlertStatus, 
  deleteAlert, 
  addAvailabilityAlert,
  calculateDemandMetrics,
  SpotDemandSummary
} from '../services/availabilityAlertService';
import { formatIDR, formatCompactNumber, formatCompactIDR } from '../utils/formatters';

interface AvailabilityQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: MediaSpot[];
  onSelectSpot?: (spot: MediaSpot) => void;
  isAdmin?: boolean;
}

export const AvailabilityQueueModal: React.FC<AvailabilityQueueModalProps> = ({
  isOpen,
  onClose,
  spots,
  onSelectSpot,
  isAdmin = false
}) => {
  const [queue, setQueue] = useState<AvailabilityAlertItem[]>([]);
  const [activeTab, setActiveTab] = useState<'booked_demand' | 'all_queue' | 'add_manual'>('booked_demand');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONTACTED' | 'CONVERTED'>('ALL');
  
  // Manual Lead Form state
  const [manualSpotId, setManualSpotId] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualEmail, setManualEmail] = useState<string>('');
  const [manualCompany, setManualCompany] = useState<string>('');
  const [manualDuration, setManualDuration] = useState<string>('3 Bulan');
  const [manualPreferredMonth, setManualPreferredMonth] = useState<string>('Segera saat kosong');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  const refreshQueue = () => {
    setQueue(getAvailabilityAlertsQueue());
  };

  useEffect(() => {
    if (isOpen) {
      refreshQueue();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => refreshQueue();
    window.addEventListener('ooh_availability_alert_updated', handleUpdate);
    window.addEventListener('ooh_availability_alert_added', handleUpdate);
    return () => {
      window.removeEventListener('ooh_availability_alert_updated', handleUpdate);
      window.removeEventListener('ooh_availability_alert_added', handleUpdate);
    };
  }, []);

  const metrics = useMemo(() => {
    return calculateDemandMetrics(spots);
  }, [spots, queue]);

  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      const matchesSearch = 
        item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.spotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.company && item.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.userPhone.includes(searchQuery);

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [queue, searchQuery, statusFilter]);

  const handleStatusChange = (id: string, newStatus: AvailabilityAlertItem['status']) => {
    updateAlertStatus(id, newStatus);
    refreshQueue();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus peminat ini dari antrean ketersediaan?')) {
      deleteAlert(id);
      refreshQueue();
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID Antrean',
      'ID Titik',
      'Nama Titik',
      'Lokasi',
      'Kota',
      'Nama Kontak',
      'Perusahaan/Brand',
      'WhatsApp / Telepon',
      'Email',
      'Target Durasi',
      'Rencana Bulan',
      'Catatan',
      'Status Titik Saat Daftar',
      'Status Antrean',
      'Waktu Pendaftaran'
    ];

    const rows = queue.map(item => [
      `"${item.id}"`,
      `"${item.spotId}"`,
      `"${item.spotName.replace(/"/g, '""')}"`,
      `"${item.roadName.replace(/"/g, '""')}"`,
      `"${item.city.replace(/"/g, '""')}"`,
      `"${item.userName.replace(/"/g, '""')}"`,
      `"${(item.company || '').replace(/"/g, '""')}"`,
      `"${item.userPhone}"`,
      `"${item.userEmail}"`,
      `"${item.targetDuration}"`,
      `"${item.preferredMonth}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      `"${item.isCurrentlyBooked ? 'Tersewa (Booked)' : 'Tersedia'}"`,
      `"${item.status}"`,
      `"${item.createdAt}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OOH_Antrean_Ketersediaan_Demand_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSpotId || !manualName || !manualPhone || !manualEmail) {
      alert('Mohon isi semua field wajib (Titik, Nama, WhatsApp, Email).');
      return;
    }

    const selectedSpot = spots.find(s => s.id === manualSpotId);
    if (!selectedSpot) return;

    addAvailabilityAlert({
      spotId: selectedSpot.id,
      spotName: selectedSpot.name,
      roadName: selectedSpot.roadName,
      city: selectedSpot.city,
      mediaType: selectedSpot.mediaType,
      userName: manualName,
      userPhone: manualPhone,
      userEmail: manualEmail,
      company: manualCompany,
      targetDuration: manualDuration,
      preferredMonth: manualPreferredMonth,
      notes: manualNotes,
      isCurrentlyBooked: !selectedSpot.isAvailable
    });

    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setManualName('');
      setManualPhone('');
      setManualEmail('');
      setManualCompany('');
      setManualNotes('');
      setActiveTab('all_queue');
    }, 1200);
  };

  const openWhatsAppToProspect = (item: AvailabilityAlertItem) => {
    let cleanPhone = item.userPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(
      `Halo ${item.userName}, kami dari Tim Media OOH/DOOH Bandung. ` +
      `Menindaklanjuti antrean 'Availability Alert' Anda untuk titik reklame *${item.spotName}* (${item.city}). ` +
      `Kami ingin menginformasikan perkembangan status ketersediaan dan opsi jadwal penayangan untuk Anda. Apakah ada waktu luang untuk berdiskusi? Terima kasih.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      id="availability-queue-modal-overlay"
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        id="availability-queue-modal-container"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Antrean Ketersediaan & Analisis Demand Titik
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {metrics.totalQueueCount} Peminat
                </span>
                {metrics.totalBookedWithDemand > 0 && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    🔥 {metrics.totalBookedWithDemand} Titik Tersewa Ber-Demand Tinggi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Memantau minat calon pengiklan yang mengantre pada titik spesifik, terutama saat unit sedang berstatus <span className="text-rose-400 font-semibold">Tersewa (Booked)</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Ekspor seluruh antrean ketersediaan ke format CSV (Excel)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Key Demand Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total di Antrean</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white">
              {metrics.totalQueueCount} <span className="text-xs font-normal text-slate-400">calon klien</span>
            </div>
            <div className="text-[10px] text-amber-400 font-medium mt-0.5">
              {metrics.pendingCount} Menunggu follow-up
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-rose-900/40 bg-gradient-to-br from-slate-900 to-rose-950/30">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Titik Tersewa High Demand</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-300">
              {metrics.totalBookedWithDemand} <span className="text-xs font-normal text-slate-400">titik tersewa</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Diminati pengiklan saat ini
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Sudah Dihubungi</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400">
              {metrics.contactedCount + metrics.convertedCount} <span className="text-xs font-normal text-slate-400">prospek</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.convertedCount} Berhasil deal/konversi
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Titik Terfavorit (#1)</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-sm font-bold text-white truncate" title={metrics.allSpotsDemandRanking[0]?.spot.name || 'Belum ada'}>
              {metrics.allSpotsDemandRanking[0]?.spot.name ? metrics.allSpotsDemandRanking[0].spot.name.split(' ')[0] + ' ' + (metrics.allSpotsDemandRanking[0].spot.name.split(' ')[1] || '') : 'Belum Ada'}
            </div>
            <div className="text-[10px] text-indigo-300 font-mono mt-0.5">
              {metrics.allSpotsDemandRanking[0] ? `${metrics.allSpotsDemandRanking[0].demandCount} peminat mengantre` : '-'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('booked_demand')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'booked_demand'
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Titik Tersewa Paling Diminati ({metrics.bookedDemandRanking.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('all_queue')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'all_queue'
                  ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Semua Antrean Peminat ({queue.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('add_manual')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'add_manual'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Tambah Peminat Manual</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: TITIK TERSEWA PALING DIMINATI */}
          {activeTab === 'booked_demand' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Ranking Titik Tersewa dengan Demand Tertinggi</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-normal">
                      High Occupancy Demand
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Titik-titik ini sedang dipakai pengiklan lain (Sold Out), namun banyak calon klien siap menyewa begitu kontrak berakhir.
                  </p>
                </div>
              </div>

              {metrics.bookedDemandRanking.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400">
                  <Flame className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Belum ada titik berstatus Tersewa yang memiliki antrean peminat.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Calon klien dapat mendaftar antrean melalui tombol 'Availability Alert' di modal rincian titik media.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metrics.bookedDemandRanking.map((item, idx) => (
                    <div 
                      key={item.spot.id}
                      className="p-4 bg-slate-950 border border-rose-900/50 hover:border-rose-500/60 rounded-xl space-y-3 transition-all shadow-md group relative overflow-hidden"
                    >
                      {/* Top ribbon rank */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center border border-rose-500/40">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-rose-300 transition-colors">
                              {item.spot.name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>{item.spot.roadName}, {item.spot.city}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/40 animate-pulse">
                            <Flame className="w-3.5 h-3.5" />
                            <span>{item.demandCount} Mengantre</span>
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Status: <span className="text-rose-400 font-bold">Tersewa</span>
                          </div>
                        </div>
                      </div>

                      {/* Metrics bar */}
                      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-900/90 rounded-lg text-center text-xs border border-slate-800/80 font-mono">
                        <div>
                          <div className="text-[10px] text-slate-400">Traffic</div>
                          <div className="font-bold text-slate-200">{formatCompactNumber(item.spot.dailyTraffic)}/hr</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Impresi (OTS)</div>
                          <div className="font-bold text-emerald-400">{formatCompactNumber(item.spot.dailyImpressions)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Tarif 1 Bln</div>
                          <div className="font-bold text-amber-300">{formatCompactIDR(item.spot.pricing.oneMonth)}</div>
                        </div>
                      </div>

                      {/* Waiting list prospects preview */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                          <span>Daftar Calon Klien Mengantre:</span>
                          <span className="text-[10px] text-slate-500">Estimasi pipeline: {formatIDR(item.totalPotentialValue)}</span>
                        </div>
                        
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {item.activeAlerts.map(alert => (
                            <div 
                              key={alert.id}
                              className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                  <span>{alert.userName}</span>
                                  {alert.company && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                                      {alert.company}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Durasi: <span className="text-slate-200">{alert.targetDuration}</span> • Rencana: <span className="text-slate-200">{alert.preferredMonth}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppToProspect(alert)}
                                  className="p-1.5 rounded-md bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold transition-transform active:scale-95 cursor-pointer"
                                  title="Chat WhatsApp calon klien"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
                                </button>
                                <select
                                  value={alert.status}
                                  onChange={(e) => handleStatusChange(alert.id, e.target.value as any)}
                                  className="bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-1 cursor-pointer"
                                >
                                  <option value="PENDING">Menunggu</option>
                                  <option value="CONTACTED">Dihubungi</option>
                                  <option value="CONVERTED">Deal/Sewa</option>
                                  <option value="ARCHIVED">Arsipkan</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-1 flex items-center justify-between border-t border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-500 font-mono">ID: {item.spot.id}</span>
                        {onSelectSpot && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectSpot(item.spot);
                            }}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                          >
                            <span>Buka Rincian Titik</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEMUA ANTREAN PEMINAT */}
          {activeTab === 'all_queue' && (
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama peminat, brand, titik, atau telepon..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-2 py-1.5 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="PENDING">Menunggu (Pending)</option>
                    <option value="CONTACTED">Sudah Dihubungi</option>
                    <option value="CONVERTED">Selesai / Deal</option>
                  </select>
                </div>
              </div>

              {filteredQueue.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400">
                  <p className="text-xs">Tidak ada data antrean yang sesuai pencarian atau filter saat ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Kontak & Perusahaan</th>
                        <th className="py-2.5 px-3">Titik Diminati</th>
                        <th className="py-2.5 px-3">Target Durasi & Waktu</th>
                        <th className="py-2.5 px-3">Status Titik</th>
                        <th className="py-2.5 px-3">Status Follow-up</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-sans">
                      {filteredQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-xs">{item.userName}</div>
                            {item.company && (
                              <div className="text-[11px] text-indigo-300 font-medium">{item.company}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span className="font-mono">{item.userPhone}</span>
                              <span>•</span>
                              <span className="truncate max-w-[140px]">{item.userEmail}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-white text-xs">{item.spotName}</div>
                            <div className="text-[10px] text-slate-400">{item.roadName}, {item.city}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {item.spotId}</div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-200">{item.targetDuration}</div>
                            <div className="text-[10px] text-emerald-400">{item.preferredMonth}</div>
                            {item.notes && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate" title={item.notes}>
                                "{item.notes}"
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {item.isCurrentlyBooked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <Flame className="w-3 h-3" />
                                Tersewa (Booked)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Tersedia
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                              className={`text-[10px] font-bold rounded px-2 py-1 border cursor-pointer ${
                                item.status === 'PENDING'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                                  : item.status === 'CONTACTED'
                                  ? 'bg-blue-950/60 text-blue-300 border-blue-600/40'
                                  : item.status === 'CONVERTED'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              <option value="PENDING">Menunggu (Pending)</option>
                              <option value="CONTACTED">Sudah Dihubungi</option>
                              <option value="CONVERTED">Berhasil Sewa (Deal)</option>
                              <option value="ARCHIVED">Arsipkan</option>
                            </select>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openWhatsAppToProspect(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                                title="Kirim pesan WhatsApp penawaran ketersediaan"
                              >
                                <MessageCircle className="w-3 h-3 fill-slate-950" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Hapus dari antrean"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TAMBAH PEMINAT MANUAL */}
          {activeTab === 'add_manual' && (
            <div className="max-w-2xl mx-auto p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Input Manual Peminat Masuk (Walk-in / Telepon)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tambahkan calon klien yang menghubungi Anda lewat telepon atau kantor untuk dimasukkan ke antrean ketersediaan.
                </p>
              </div>

              {formSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Data peminat berhasil disimpan ke antrean ketersediaan!</span>
                </div>
              )}

              <form onSubmit={handleAddManualLead} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pilih Titik Media yang Diminati <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={manualSpotId}
                    onChange={(e) => setManualSpotId(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs cursor-pointer focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Titik Reklame --</option>
                    {spots.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {s.city} ({s.isAvailable ? 'Tersedia' : 'Tersewa / Sold Out'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Nama Calon Klien / PIC <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bpk. Budi Darmawan"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Nomor WhatsApp <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Email Bisnis <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Contoh: budi@perusahaan.co.id"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Nama Brand / Perusahaan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: PT Sumber Rezeki / Brand X"
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Target Durasi Sewa
                    </label>
                    <select
                      value={manualDuration}
                      onChange={(e) => setManualDuration(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs cursor-pointer focus:border-emerald-500"
                    >
                      <option value="1 Bulan">1 Bulan</option>
                      <option value="3 Bulan">3 Bulan</option>
                      <option value="6 Bulan">6 Bulan</option>
                      <option value="1 Tahun">1 Tahun</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Rencana Bulan Pemasangan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Segera saat kosong / Bulan Depan"
                      value={manualPreferredMonth}
                      onChange={(e) => setManualPreferredMonth(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Catatan Khusus
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Preferensi materi iklan, anggaran yang diajukan, catatan penawaran..."
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Simpan ke Antrean Ketersediaan
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Mock-Queue Aktif (Penyimpanan Lokal & Sinkronisasi Event)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
