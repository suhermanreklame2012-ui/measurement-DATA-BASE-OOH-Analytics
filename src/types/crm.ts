import { ProposalDuration } from './ooh';

export type CrmStage = 'lead_baru' | 'follow_up' | 'negosiasi' | 'won' | 'lost';

export type LeadPriority = 'hot' | 'attention' | 'warm' | 'cold';

export interface CrmTask {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  completed: boolean;
  type: 'call' | 'wa' | 'meeting' | 'survey' | 'proposal' | 'contract';
  assignedPic: string;
  createdAt: string;
}

export interface CrmDocument {
  id: string;
  name: string;
  type: 'proposal_pdf' | 'spk' | 'invoice' | 'presentation' | 'other';
  date: string;
  url?: string;
  size?: string;
}

export interface CrmLead {
  id: string;
  companyName: string; // e.g. "PT Maju Jaya"
  contactPerson: string; // e.g. "Bpk. Rudi Hartono"
  contactRole?: string; // e.g. "Marketing Head"
  contactPhone: string;
  contactEmail: string;
  picName: string; // PIC internal (e.g. "Suherman (Admin)", "Rian Saputra")
  picEmail?: string;
  
  // Posisi / Titik Media yang diminati
  targetSpotIds: string[];
  targetSpotNames: string[];
  targetLocationsSummary: string; // Ringkasan lokasi e.g. "Jl. Asia Afrika No. 120, Bandung"
  
  // Nilai Peluang & Durasi
  dealValue: number; // Nilai potensi dalam Rupiah
  duration: ProposalDuration;
  
  // Posisi Alur Pipeline
  stage: CrmStage;
  priority: LeadPriority;
  
  // Tindak Lanjut Berikutnya (Next Action yang Jelas)
  nextAction: string; // e.g. "Kirim revisi harga 3 bulan & jadwalkan cek titik"
  nextActionDate: string; // YYYY-MM-DD
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Riwayat & Aktivitas
  history: Array<{
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    fromStage?: CrmStage;
    toStage?: CrmStage;
  }>;
  
  tasks: CrmTask[];
  documents: CrmDocument[];
}

export interface CrmStageConfig {
  id: CrmStage;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const CRM_STAGES: CrmStageConfig[] = [
  {
    id: 'lead_baru',
    label: 'Prospek Baru',
    shortLabel: 'Baru',
    description: 'Lead masuk dari inquiry atau outreach awal',
    color: 'slate',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-300 dark:border-slate-700'
  },
  {
    id: 'follow_up',
    label: 'Follow Up',
    shortLabel: 'Follow Up',
    description: 'Proses komunikasi aktif, kirim data impresi & survei lokasi',
    color: 'blue',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700'
  },
  {
    id: 'negosiasi',
    label: 'Negosiasi',
    shortLabel: 'Negosiasi',
    description: 'Proposal terkirim, review harga sewa & penyesuaian durasi',
    color: 'amber',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700'
  },
  {
    id: 'won',
    label: 'Won (Closing)',
    shortLabel: 'Won',
    description: 'Kesepakatan tercapai, SPK ditandatangani & sewa aktif',
    color: 'emerald',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'lost',
    label: 'Lost (Batal/Tunda)',
    shortLabel: 'Lost',
    description: 'Prospek batal atau ditunda untuk periode mendatang',
    color: 'rose',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-300 dark:border-rose-700'
  }
];

export const SALES_TEAM_PICS = [
  { id: 'pic-1', name: 'Suherman (Superadmin)', email: 'suherman.reklame2012@gmail.com', role: 'Direktur / Senior Sales OOH' },
  { id: 'pic-2', name: 'Rian Saputra', email: 'rian.sales@suhermanreklame.com', role: 'Account Executive Bandung Raya' },
  { id: 'pic-3', name: 'Dewi Lestari', email: 'dewi.media@suhermanreklame.com', role: 'Media Planner & Client Relations' }
];
