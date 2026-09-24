import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit2,
  Sparkles,
  TrendingUp,
  FileText,
  Briefcase,
  Layers,
  ArrowRight,
  X,
  Flame,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { 
  CrmLead, 
  CrmStage, 
  LeadPriority, 
  CRM_STAGES, 
  SALES_TEAM_PICS, 
  CrmTask 
} from '../types/crm';
import { 
  getStoredCrmLeads, 
  subscribeToCrmLeads, 
  saveCrmLead, 
  updateLeadStage, 
  deleteCrmLead, 
  calculateCrmMetrics,
  addCrmTask,
  toggleCrmTask,
  deleteCrmTask
} from '../services/crmService';
import { formatIDR, formatCompactNumber } from '../utils/formatters';
import { MediaSpot, ClientContact } from '../types/ooh';
import { getStoredClients } from '../services/clientService';

interface CrmPipelineViewProps {
  allSpots?: MediaSpot[];
  initialLeads?: CrmLead[];
  onOpenProposalWithLead?: (lead: CrmLead) => void;
  isStandalone?: boolean;
  onCloseStandalone?: () => void;
}

export const CrmPipelineView: React.FC<CrmPipelineViewProps> = ({
  allSpots = [],
  onOpenProposalWithLead,
  isStandalone = false,
  onCloseStandalone
}) => {
  const [leads, setLeads] = useState<CrmLead[]>(() => getStoredCrmLeads());
  const [clients, setClients] = useState<ClientContact[]>(() => getStoredClients());
  const [activeTab, setActiveTab] = useState<'pipeline' | 'agenda' | 'clients' | 'reports' | 'documents' | 'team'>('pipeline');
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [filterPic, setFilterPic] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Lead modal state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<Partial<CrmLead> | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<CrmLead | null>(null);

  // New task inline state
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTaskType, setNewTaskType] = useState<CrmTask['type']>('wa');
  const [selectedLeadForTask, setSelectedLeadForTask] = useState<string>('');

  // Real-time listener for CRM
  useEffect(() => {
    const unsub = subscribeToCrmLeads((data) => {
      setLeads(data);
    });
    return () => unsub();
  }, []);

  // Update client contacts list
  useEffect(() => {
    setClients(getStoredClients());
  }, []);

  // Calculate high-level executive metrics
  const metrics = useMemo(() => {
    return calculateCrmMetrics(leads);
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filterStage !== 'ALL' && lead.stage !== filterStage) return false;
      if (filterPic !== 'ALL' && lead.picName !== filterPic) return false;
      if (filterPriority !== 'ALL' && lead.priority !== filterPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCompany = lead.companyName.toLowerCase().includes(q);
        const matchContact = lead.contactPerson.toLowerCase().includes(q);
        const matchLocation = lead.targetLocationsSummary.toLowerCase().includes(q);
        const matchNext = lead.nextAction.toLowerCase().includes(q);
        const matchPic = lead.picName.toLowerCase().includes(q);
        if (!matchCompany && !matchContact && !matchLocation && !matchNext && !matchPic) {
          return false;
        }
      }
      return true;
    });
  }, [leads, filterStage, filterPic, filterPriority, searchQuery]);

  // Group leads by stage for Kanban
  const leadsByStage = useMemo(() => {
    const grouped: Record<CrmStage, CrmLead[]> = {
      lead_baru: [],
      follow_up: [],
      negosiasi: [],
      won: [],
      lost: []
    };
    filteredLeads.forEach((lead) => {
      if (grouped[lead.stage]) {
        grouped[lead.stage].push(lead);
      } else {
        grouped.lead_baru.push(lead);
      }
    });
    return grouped;
  }, [filteredLeads]);

  // Quick WhatsApp Follow-up Trigger
  const handleQuickWhatsApp = (lead: CrmLead) => {
    if (!lead.contactPhone) {
      alert('Nomor telepon prospek belum terisi.');
      return;
    }
    let cleanPhone = lead.contactPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    const greeting = `Halo ${lead.contactPerson}, salam hangat dari Suherman Reklame OOH Bandung.`;
    const message = `${greeting}\n\nMenindaklanjuti ketertarikan ${lead.companyName} untuk penempatan media reklame di *${lead.targetLocationsSummary || 'Jawa Barat'}*.\n\n*Update Tindak Lanjut:* ${lead.nextAction}.\n\nApakah ada waktu luang untuk koordinasi singkat hari ini? Terima kasih!`;
    const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Open Edit or New Lead
  const handleOpenNewLead = (stage: CrmStage = 'lead_baru') => {
    setEditingLead({
      companyName: '',
      contactPerson: '',
      contactRole: '',
      contactPhone: '',
      contactEmail: '',
      picName: SALES_TEAM_PICS[0].name,
      picEmail: SALES_TEAM_PICS[0].email,
      targetSpotIds: [],
      targetSpotNames: [],
      targetLocationsSummary: 'Kota Bandung / Jalur Strategis Jabar',
      dealValue: 100000000,
      duration: '3 Bulan',
      stage,
      priority: 'warm',
      nextAction: 'Kirim penawaran proposal awal & diskusikan jadwal tayang',
      nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setIsLeadModalOpen(true);
  };

  const handleEditLead = (lead: CrmLead) => {
    setEditingLead({ ...lead });
    setIsLeadModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead?.companyName || !editingLead?.contactPerson) {
      alert('Nama perusahaan dan nama kontak wajib diisi.');
      return;
    }

    const leadToSave: CrmLead = {
      id: editingLead.id || `lead-${Date.now()}`,
      companyName: editingLead.companyName,
      contactPerson: editingLead.contactPerson,
      contactRole: editingLead.contactRole || 'Media Planner',
      contactPhone: editingLead.contactPhone || '',
      contactEmail: editingLead.contactEmail || '',
      picName: editingLead.picName || SALES_TEAM_PICS[0].name,
      picEmail: editingLead.picEmail || SALES_TEAM_PICS[0].email,
      targetSpotIds: editingLead.targetSpotIds || [],
      targetSpotNames: editingLead.targetSpotNames || [],
      targetLocationsSummary: editingLead.targetLocationsSummary || 'Kota Bandung',
      dealValue: Number(editingLead.dealValue) || 0,
      duration: editingLead.duration || '1 Bulan',
      stage: editingLead.stage || 'lead_baru',
      priority: editingLead.priority || 'warm',
      nextAction: editingLead.nextAction || 'Follow up penawaran',
      nextActionDate: editingLead.nextActionDate || new Date().toISOString().split('T')[0],
      notes: editingLead.notes || '',
      createdAt: editingLead.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: editingLead.history || [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Prospek dibuat dalam CRM',
          actor: editingLead.picName || 'Suherman (Admin)'
        }
      ],
      tasks: editingLead.tasks || [],
      documents: editingLead.documents || []
    };

    await saveCrmLead(leadToSave);
    setIsLeadModalOpen(false);
    setEditingLead(null);
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus prospek "${name}"?`)) {
      await deleteCrmLead(id);
      if (selectedLeadForDetail?.id === id) {
        setSelectedLeadForDetail(null);
      }
    }
  };

  // Add Task to Lead
  const handleAddNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForTask || !newTaskTitle.trim()) {
      alert('Pilih prospek dan masukkan judul tugas.');
      return;
    }
    await addCrmTask(selectedLeadForTask, {
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate,
      dueTime: '10:00',
      completed: false,
      type: newTaskType,
      assignedPic: SALES_TEAM_PICS[0].name
    });
    setNewTaskTitle('');
  };

  return (
    <div className={`flex flex-col bg-slate-900 text-slate-100 ${isStandalone ? 'fixed inset-0 z-50 overflow-y-auto' : 'w-full h-full'}`}>
      
      {/* Standalone Header Bar */}
      {isStandalone && (
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Pipeline CRM Penawaran Reklame OOH Jabar
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Standalone Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Setiap lead punya arah yang jelas: Posisi, PIC, nilai peluang, dan tindak lanjut berikutnya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenNewLead('lead_baru')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Prospek Baru</span>
            </button>
            {onCloseStandalone && (
              <button
                type="button"
                onClick={onCloseStandalone}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Tutup CRM"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 01. EXECUTIVE TOP GLANCE BAR ("Buka aplikasi dan langsung tahu apa yang perlu diperhatikan") */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/80 border-b border-slate-800 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* Card 1: Nilai Pipeline Aktif */}
          <div 
            onClick={() => {
              setFilterStage('ALL');
              setFilterPriority('ALL');
              setActiveTab('pipeline');
            }}
            className="bg-slate-800/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 hover:border-emerald-500/50 shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                1. Nilai Pipeline Aktif
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/30">
                {metrics.activeLeadsCount} Lead Berjalan
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {formatIDR(metrics.activePipelineValue)}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                <span>Lihat Alur</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Total potensi pendapatan sewa billboard &amp; DOOH yang sedang aktif
            </p>
          </div>

          {/* Card 2: Lead Panas dan Perlu Perhatian */}
          <div 
            onClick={() => {
              setFilterPriority(filterPriority === 'hot' ? 'ALL' : 'hot');
              setActiveTab('pipeline');
            }}
            className={`p-3.5 rounded-2xl border shadow-md transition-all cursor-pointer group ${
              metrics.hotLeadsCount > 0 
                ? 'bg-amber-950/40 hover:bg-amber-950/60 border-amber-500/40 hover:border-amber-400' 
                : 'bg-slate-800/90 border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
                2. Lead Panas &amp; Perhatian
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">
                {metrics.hotLeadsCount} Panas • {metrics.attentionLeadsCount} Perlu Dicek
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black text-amber-200 tracking-tight flex items-center gap-2">
                <span>{metrics.hotLeadsCount + metrics.attentionLeadsCount} Prospek</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-[11px] text-amber-300 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                <span>Filter Panas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] text-amber-200/80 mt-1 truncate">
              Prioritas tinggi penutupan deal sewa &amp; tindak lanjut yang jatuh tempo
            </p>
          </div>

          {/* Card 3: Tugas Hari Ini dan Besok */}
          <div 
            onClick={() => setActiveTab('agenda')}
            className={`p-3.5 rounded-2xl border shadow-md transition-all cursor-pointer group ${
              metrics.todayTasksCount > 0 
                ? 'bg-blue-950/40 hover:bg-blue-950/60 border-blue-500/40 hover:border-blue-400' 
                : 'bg-slate-800/90 border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                3. Tugas Hari Ini &amp; Besok
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px] border border-blue-500/30">
                {metrics.todayTasksCount} Hari Ini • {metrics.tomorrowTasksCount} Besok
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black text-blue-200 tracking-tight flex items-center gap-2">
                <span>{metrics.todayTasksCount + metrics.tomorrowTasksCount} Jadwal</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-[11px] text-blue-300 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                <span>Buka Agenda</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] text-blue-200/80 mt-1 truncate">
              Follow-up telepon, kirim draf SPK, jadwal pasang &amp; survei titik
            </p>
          </div>

        </div>
      </div>

      {/* Sub-Navigation Tabs & Controls (Matching Item 3 from user brief) */}
      <div className="px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pipeline Kanban</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
              {filteredLeads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'agenda'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agenda &amp; Tugas</span>
            {metrics.todayTasksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {metrics.todayTasksCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kontak &amp; Pelanggan</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
              {clients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Laporan &amp; Win-Rate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Dokumen &amp; SPK</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Organisasi &amp; PIC</span>
          </button>
        </div>

        {/* Action Controls & New Lead Trigger */}
        <div className="flex items-center gap-2">
          {!isStandalone && (
            <button
              type="button"
              onClick={() => handleOpenNewLead('lead_baru')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Prospek</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar (For Pipeline tab) */}
      {activeTab === 'pipeline' && (
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari perusahaan, PIC, atau lokasi titik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="hot">🔥 Lead Panas</option>
              <option value="attention">⚠️ Perlu Perhatian</option>
              <option value="warm">Kategori Hangat</option>
              <option value="cold">Kategori Dingin</option>
            </select>

            {/* PIC Filter */}
            <select
              value={filterPic}
              onChange={(e) => setFilterPic(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 hidden sm:block"
            >
              <option value="ALL">Semua PIC Sales</option>
              {SALES_TEAM_PICS.map((pic) => (
                <option key={pic.id} value={pic.name}>{pic.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Menampilkan <strong>{filteredLeads.length}</strong> dari {leads.length} prospek</span>
            {(searchQuery || filterPriority !== 'ALL' || filterPic !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterPriority('ALL');
                  setFilterPic('ALL');
                }}
                className="text-emerald-400 hover:text-emerald-300 underline font-semibold ml-1 cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        
        {/* VIEW 1: PIPELINE KANBAN (02 Pipeline lebih mudah dijalankan) */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start min-h-[500px]">
            {CRM_STAGES.map((stageConfig) => {
              const stageLeads = leadsByStage[stageConfig.id] || [];
              const stageTotalValue = stageLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

              return (
                <div 
                  key={stageConfig.id}
                  id={`pipeline-column-${stageConfig.id}`}
                  data-testid={`pipeline-column-${stageConfig.id}`}
                  className="bg-slate-850 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col max-h-[750px] shadow-lg overflow-hidden"
                >
                  {/* Column Header */}
                  <div className={`p-3.5 border-b ${stageConfig.borderColor} bg-slate-900/95 flex items-center justify-between`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          stageConfig.id === 'won' ? 'bg-emerald-400' :
                          stageConfig.id === 'lost' ? 'bg-rose-400' :
                          stageConfig.id === 'negosiasi' ? 'bg-amber-400' :
                          stageConfig.id === 'follow_up' ? 'bg-blue-400' : 'bg-slate-400'
                        }`} />
                        <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                          {stageConfig.label}
                        </h4>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                          {stageLeads.length}
                        </span>
                      </div>
                      <div className="text-[11px] font-extrabold text-emerald-400 font-mono mt-0.5">
                        {formatCompactNumber(stageTotalValue)} IDR
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenNewLead(stageConfig.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title={`Tambah prospek baru di tahap ${stageConfig.label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Leads Cards Container */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                    {stageLeads.map((lead) => {
                      const isHot = lead.priority === 'hot';
                      const isAttention = lead.priority === 'attention';

                      return (
                        <div
                          key={lead.id}
                          id={`lead-card-${lead.id}`}
                          data-testid={`lead-card-${lead.id}`}
                          className={`p-3.5 rounded-xl border bg-slate-800/90 hover:bg-slate-800 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-2.5 group relative ${
                            isHot 
                              ? 'border-amber-500/60 ring-1 ring-amber-500/20' 
                              : isAttention
                              ? 'border-rose-500/50'
                              : 'border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          {/* Card Top: Company & Priority */}
                          <div>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <h5 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                                {lead.companyName}
                              </h5>
                              {isHot && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] flex items-center gap-0.5 border border-amber-500/40 shrink-0">
                                  <Flame className="w-2.5 h-2.5 fill-amber-400" />
                                  Hot
                                </span>
                              )}
                              {isAttention && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px] flex items-center gap-0.5 border border-rose-500/40 shrink-0">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Perhatian
                                </span>
                              )}
                            </div>

                            {/* Contact Person & Role */}
                            <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                              <span className="font-medium text-slate-200">{lead.contactPerson}</span>
                              {lead.contactRole && (
                                <span className="text-slate-400 text-[10px]">({lead.contactRole})</span>
                              )}
                            </div>
                          </div>

                          {/* POSISI TITIK MEDIA (Alur yang jelas) */}
                          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/60 space-y-1">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                              <span>Posisi Titik Media</span>
                              <span className="font-mono text-emerald-400 font-bold">{lead.duration || '3 Bulan'}</span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="truncate">{lead.targetLocationsSummary}</span>
                            </div>
                          </div>

                          {/* PIC & NILAI PELUANG */}
                          <div className="flex items-center justify-between pt-0.5 text-xs">
                            <div>
                              <div className="text-[10px] text-slate-400">PIC Penanggung Jawab</div>
                              <div className="font-bold text-slate-200 text-[11px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span>{lead.picName}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400">Nilai Peluang</div>
                              <div className="font-black text-emerald-400 text-xs font-mono">
                                {formatIDR(lead.dealValue)}
                              </div>
                            </div>
                          </div>

                          {/* TINDAK LANJUT BERIKUTNYA (Direction & Due Date) */}
                          <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                            <div className="text-[10px] font-bold text-emerald-300 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                Tindak Lanjut Berikutnya:
                              </span>
                              <span className="font-mono text-[9px] text-slate-400">
                                {lead.nextActionDate}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-200 leading-snug line-clamp-2">
                              {lead.nextAction}
                            </p>
                          </div>

                          {/* Card Footer: Quick Actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                            
                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() => handleQuickWhatsApp(lead)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                              title="Kirim pesan tindak lanjut WhatsApp Web"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-400" />
                              <span>Hubungi WA</span>
                            </button>

                            {/* Move Stage Selector */}
                            <div className="flex items-center gap-1">
                              {stageConfig.id !== 'lead_baru' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const stageOrder: CrmStage[] = ['lead_baru', 'follow_up', 'negosiasi', 'won', 'lost'];
                                    const currentIdx = stageOrder.indexOf(lead.stage);
                                    if (currentIdx > 0) {
                                      updateLeadStage(lead.id, stageOrder[currentIdx - 1]);
                                    }
                                  }}
                                  className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white"
                                  title="Mundurkan tahap"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {stageConfig.id !== 'won' && stageConfig.id !== 'lost' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const stageOrder: CrmStage[] = ['lead_baru', 'follow_up', 'negosiasi', 'won', 'lost'];
                                    const currentIdx = stageOrder.indexOf(lead.stage);
                                    if (currentIdx < stageOrder.length - 2) {
                                      updateLeadStage(lead.id, stageOrder[currentIdx + 1]);
                                    } else {
                                      updateLeadStage(lead.id, 'won');
                                    }
                                  }}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                  title="Majukan ke tahap berikutnya"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleEditLead(lead)}
                                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white"
                                title="Edit prospek ini"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLead(lead.id, lead.companyName)}
                                className="p-1 rounded bg-slate-700 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                                title="Hapus prospek"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}

                    {stageLeads.length === 0 && (
                      <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        Tidak ada prospek di tahap ini
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: AGENDA & TUGAS (Task List, Follow-up Scheduler) */}
        {activeTab === 'agenda' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Task Creation Form (4 cols) */}
            <div className="lg:col-span-4 bg-slate-850 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Tambah Tugas / Agenda Follow-Up
              </h3>
              
              <form onSubmit={handleAddNewTask} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Target Prospek / Klien</label>
                  <select
                    value={selectedLeadForTask}
                    onChange={(e) => setSelectedLeadForTask(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih Prospek...</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.companyName} ({l.contactPerson}) - {l.stage}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Deskripsi Tugas / Follow Up</label>
                  <input
                    type="text"
                    placeholder="Contoh: Telepon Bpk. Hendra konfirmasi SPK"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Jenis Aktivitas</label>
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="wa">WhatsApp</option>
                      <option value="call">Telepon</option>
                      <option value="meeting">Meeting / Ketemu</option>
                      <option value="proposal">Kirim Proposal</option>
                      <option value="contract">Draft SPK</option>
                      <option value="survey">Survei Titik</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Jadwalkan Tugas
                </button>
              </form>
            </div>

            {/* Right: Task Checklist Board (8 cols) */}
            <div className="lg:col-span-8 bg-slate-850 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white">Daftar Agenda &amp; Tugas Penjualan OOH</h3>
                  <p className="text-xs text-slate-400">Pastikan seluruh komitmen follow-up selesai tepat waktu</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/30">
                  {metrics.todayTasksCount} Jatuh Tempo Hari Ini
                </span>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {leads.flatMap((lead) => (lead.tasks || []).map((t) => ({ ...t, leadId: lead.id, companyName: lead.companyName }))).length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Belum ada tugas atau jadwal follow-up. Buat jadwal baru di sebelah kiri.
                  </div>
                ) : (
                  leads.flatMap((lead) => (lead.tasks || []).map((t) => ({ ...t, leadId: lead.id, companyName: lead.companyName }))).map((task) => {
                    const isToday = task.dueDate === new Date().toISOString().split('T')[0];
                    const isOverdue = task.dueDate < new Date().toISOString().split('T')[0] && !task.completed;

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          task.completed
                            ? 'bg-slate-900/40 border-slate-800 opacity-60'
                            : isOverdue
                            ? 'bg-rose-950/30 border-rose-500/50'
                            : isToday
                            ? 'bg-blue-950/30 border-blue-500/40'
                            : 'bg-slate-800/80 border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleCrmTask(task.leadId, task.id)}
                            className="text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            {task.completed ? (
                              <CheckSquare className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold block truncate ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                              {task.title}
                            </span>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-emerald-400">{task.companyName}</span>
                              <span>•</span>
                              <span className={`font-mono ${isOverdue ? 'text-rose-400 font-bold' : isToday ? 'text-blue-300 font-bold' : 'text-slate-400'}`}>
                                {task.dueDate} {task.dueTime}
                              </span>
                              <span>•</span>
                              <span>PIC: {task.assignedPic}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {task.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteCrmTask(task.leadId, task.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400"
                            title="Hapus tugas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 3: KONTAK & PELANGGAN (Clients Directory) */}
        {activeTab === 'clients' && (
          <div className="bg-slate-850 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-sm text-white">Database Kontak Pelanggan &amp; Pengiklan</h3>
                <p className="text-xs text-slate-400">Terintegrasi dengan akun Google Contacts dan riwayat penawaran</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30">
                {clients.length} Kontak Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {clients.map((client) => {
                const leadMatches = leads.filter((l) => l.companyName.toLowerCase() === client.company.toLowerCase());

                return (
                  <div
                    key={client.id}
                    className="p-4 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-800 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm line-clamp-1">{client.company}</h4>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-medium shrink-0">
                          {client.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-semibold">{client.name}</div>
                      {client.role && <div className="text-[11px] text-slate-400">{client.role}</div>}
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-700/60">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{client.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{client.email || '-'}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-700/60">
                      <span className="text-[10px] text-slate-400">
                        {leadMatches.length > 0 ? (
                          <strong className="text-emerald-400">{leadMatches.length} Prospek Aktif</strong>
                        ) : (
                          'Belum ada deal'
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLead({
                            companyName: client.company,
                            contactPerson: client.name,
                            contactRole: client.role || client.category,
                            contactPhone: client.phone,
                            contactEmail: client.email,
                            picName: SALES_TEAM_PICS[0].name,
                            dealValue: 120000000,
                            duration: '3 Bulan',
                            stage: 'lead_baru',
                            priority: 'warm',
                            nextAction: 'Kirim proposal awal OOH',
                            nextActionDate: new Date().toISOString().split('T')[0]
                          });
                          setIsLeadModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        + Buat Prospek
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: LAPORAN & WIN-RATE (Reports & Analytics) */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                <span className="text-xs text-slate-400 block mb-1">Win Rate Closing</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">{metrics.winRatePercent}%</div>
                <span className="text-[11px] text-slate-400">{metrics.wonCount} Closing Won dari total {leads.length} prospek</span>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                <span className="text-xs text-slate-400 block mb-1">Total Nilai Closing (Won)</span>
                <div className="text-2xl font-black text-white font-mono">{formatIDR(metrics.wonValue)}</div>
                <span className="text-[11px] text-emerald-400">SPK Sewa Berhasil Diteken</span>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                <span className="text-xs text-slate-400 block mb-1">Potensi Pipeline Aktif</span>
                <div className="text-2xl font-black text-amber-300 font-mono">{formatIDR(metrics.activePipelineValue)}</div>
                <span className="text-[11px] text-slate-400">Dalam tahap negosiasi &amp; follow-up</span>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                <span className="text-xs text-slate-400 block mb-1">Rata-rata Nilai Deal</span>
                <div className="text-2xl font-black text-blue-300 font-mono">
                  {formatIDR(leads.length > 0 ? Math.round(leads.reduce((a, b) => a + b.dealValue, 0) / leads.length) : 0)}
                </div>
                <span className="text-[11px] text-slate-400">Per kontrak reklame</span>
              </div>
            </div>

            {/* Funnel Stage Breakdown */}
            <div className="bg-slate-850 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="font-bold text-sm text-white">Distribusi Konversi Tiap Tahap (Funnel Breakdown)</h4>
              <div className="space-y-3">
                {CRM_STAGES.map((st) => {
                  const count = leads.filter((l) => l.stage === st.id).length;
                  const value = leads.filter((l) => l.stage === st.id).reduce((a, b) => a + b.dealValue, 0);
                  const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;

                  return (
                    <div key={st.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{st.label} ({count} Prospek)</span>
                        <span className="font-mono text-emerald-400 font-bold">{formatIDR(value)} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            st.id === 'won' ? 'bg-emerald-500' :
                            st.id === 'lost' ? 'bg-rose-500' :
                            st.id === 'negosiasi' ? 'bg-amber-500' :
                            st.id === 'follow_up' ? 'bg-blue-500' : 'bg-slate-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: DOKUMEN & SPK (Documents) */}
        {activeTab === 'documents' && (
          <div className="bg-slate-850 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Arsip Berkas Penawaran, SPK &amp; Proposal OOH</h3>
              <p className="text-xs text-slate-400">Berkas dokumen resmi yang telah disusun untuk klien</p>
            </div>

            <div className="divide-y divide-slate-800">
              {leads.flatMap((lead) => (lead.documents || []).map((doc) => ({ ...doc, company: lead.companyName }))).length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Belum ada dokumen yang terlampir pada prospek.
                </div>
              ) : (
                leads.flatMap((lead) => (lead.documents || []).map((doc) => ({ ...doc, company: lead.companyName }))).map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{doc.name}</span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="text-emerald-400 font-semibold">{doc.company}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                          <span>•</span>
                          <span>{doc.size || '1.5 MB'}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono uppercase">
                      {doc.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 6: ORGANISASI & PIC (Sales Team) */}
        {activeTab === 'team' && (
          <div className="bg-slate-850 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Tim Penjualan &amp; Pembagian PIC Wilayah</h3>
              <p className="text-xs text-slate-400">Alokasi beban pipeline dan penanggung jawab klien reklame</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SALES_TEAM_PICS.map((pic) => {
                const picLeads = leads.filter((l) => l.picName === pic.name);
                const picValue = picLeads.reduce((a, b) => a + b.dealValue, 0);
                const wonCount = picLeads.filter((l) => l.stage === 'won').length;

                return (
                  <div key={pic.id} className="p-4 rounded-xl border border-slate-700/80 bg-slate-800/80 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                        {pic.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{pic.name}</h4>
                        <span className="text-[11px] text-slate-400 block">{pic.role}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">{pic.email}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-700/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Prospek Dipegang</span>
                        <span className="font-bold text-white text-sm">{picLeads.length} Lead</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Closing Berhasil</span>
                        <span className="font-bold text-emerald-400 text-sm">{wonCount} Won</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">Total Nilai Penjualan</span>
                      <span className="font-extrabold text-emerald-400 font-mono text-sm">{formatIDR(picValue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* LEAD CREATION / EDIT MODAL */}
      {isLeadModalOpen && editingLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>{editingLead.id ? 'Edit Data Prospek' : 'Tambah Prospek Pipeline Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLeadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3.5 text-xs">
              
              {/* Company & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nama Perusahaan / Klien *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Maju Jaya Retail"
                    value={editingLead.companyName || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, companyName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nama Kontak Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bpk. Rudi Hartono"
                    value={editingLead.contactPerson || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, contactPerson: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={editingLead.contactPhone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, contactPhone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Email Klien</label>
                  <input
                    type="email"
                    placeholder="rudi@majujaya.co.id"
                    value={editingLead.contactEmail || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, contactEmail: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Posisi Titik Media & PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Posisi / Titik Reklame Incaran</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jl. Asia Afrika No. 120 (Simpang Lima)"
                    value={editingLead.targetLocationsSummary || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, targetLocationsSummary: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">PIC Penanggung Jawab</label>
                  <select
                    value={editingLead.picName || SALES_TEAM_PICS[0].name}
                    onChange={(e) => setEditingLead({ ...editingLead, picName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {SALES_TEAM_PICS.map((pic) => (
                      <option key={pic.id} value={pic.name}>{pic.name} ({pic.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nilai Peluang, Durasi, Stage & Prioritas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nilai Peluang (IDR)</label>
                  <input
                    type="number"
                    value={editingLead.dealValue || 0}
                    onChange={(e) => setEditingLead({ ...editingLead, dealValue: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Durasi Sewa</label>
                  <select
                    value={editingLead.duration || '3 Bulan'}
                    onChange={(e) => setEditingLead({ ...editingLead, duration: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1 Bulan">1 Bulan</option>
                    <option value="3 Bulan">3 Bulan</option>
                    <option value="6 Bulan">6 Bulan</option>
                    <option value="1 Tahun">1 Tahun</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tahap Pipeline</label>
                  <select
                    value={editingLead.stage || 'lead_baru'}
                    onChange={(e) => setEditingLead({ ...editingLead, stage: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CRM_STAGES.map((st) => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Prioritas Lead</label>
                  <select
                    value={editingLead.priority || 'warm'}
                    onChange={(e) => setEditingLead({ ...editingLead, priority: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="hot">🔥 Lead Panas</option>
                    <option value="attention">⚠️ Perlu Perhatian</option>
                    <option value="warm">Hangat</option>
                    <option value="cold">Dingin</option>
                  </select>
                </div>
              </div>

              {/* Next Action & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/30">
                <div className="sm:col-span-2">
                  <label className="text-emerald-300 font-bold block mb-1">Tindak Lanjut Berikutnya (Arah Jelas)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kirim draf SPK & jadwalkan cek titik malam"
                    value={editingLead.nextAction || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, nextAction: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-emerald-300 font-bold block mb-1">Tanggal Tindak Lanjut</label>
                  <input
                    type="date"
                    required
                    value={editingLead.nextActionDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditingLead({ ...editingLead, nextActionDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Catatan Tambahan Sales</label>
                <textarea
                  rows={2}
                  placeholder="Catatan negosiasi, permintaan materi visual, dll..."
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg transition-colors cursor-pointer"
                >
                  Simpan Prospek
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
