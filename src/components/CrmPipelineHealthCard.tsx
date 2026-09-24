import React, { useMemo } from 'react';
import {
  Users,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  DollarSign,
  Filter,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { CrmLead, CrmStage } from '../types/crm';
import { formatCompactIDR, formatIDR } from '../utils/formatters';

interface StatusGroupMeta {
  id: CrmStage;
  englishLabel: string;
  localLabel: string;
  sublabel: string;
  color: 'slate' | 'blue' | 'amber' | 'emerald' | 'rose';
  icon: React.ElementType;
  bgLight: string;
  borderClass: string;
  activeBorder: string;
  textClass: string;
  badgeBg: string;
  progressBarColor: string;
}

const STATUS_GROUPS: StatusGroupMeta[] = [
  {
    id: 'lead_baru',
    englishLabel: 'Prospecting',
    localLabel: 'Prospek Baru',
    sublabel: 'Lead masuk & kontak awal',
    color: 'slate',
    icon: Users,
    bgLight: 'bg-slate-800/80 hover:bg-slate-800',
    borderClass: 'border-slate-700/80',
    activeBorder: 'border-slate-300 ring-2 ring-slate-400/40 bg-slate-800',
    textClass: 'text-slate-300',
    badgeBg: 'bg-slate-700 text-slate-200 border-slate-600',
    progressBarColor: 'bg-slate-400',
  },
  {
    id: 'follow_up',
    englishLabel: 'Qualified',
    localLabel: 'Follow Up',
    sublabel: 'Evaluasi & survei titik',
    color: 'blue',
    icon: Clock,
    bgLight: 'bg-blue-950/30 hover:bg-blue-950/50',
    borderClass: 'border-blue-900/60',
    activeBorder: 'border-blue-400 ring-2 ring-blue-500/40 bg-blue-950/70',
    textClass: 'text-blue-300',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    progressBarColor: 'bg-blue-500',
  },
  {
    id: 'negosiasi',
    englishLabel: 'Negotiation',
    localLabel: 'Negosiasi',
    sublabel: 'Review penawaran & draf SPK',
    color: 'amber',
    icon: FileText,
    bgLight: 'bg-amber-950/30 hover:bg-amber-950/50',
    borderClass: 'border-amber-900/60',
    activeBorder: 'border-amber-400 ring-2 ring-amber-500/40 bg-amber-950/70',
    textClass: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    progressBarColor: 'bg-amber-500',
  },
  {
    id: 'won',
    englishLabel: 'Won',
    localLabel: 'Closing (Won)',
    sublabel: 'Kontrak diteken & sewa aktif',
    color: 'emerald',
    icon: CheckCircle2,
    bgLight: 'bg-emerald-950/30 hover:bg-emerald-950/50',
    borderClass: 'border-emerald-900/60',
    activeBorder: 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/70',
    textClass: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    progressBarColor: 'bg-emerald-500',
  },
  {
    id: 'lost',
    englishLabel: 'Lost',
    localLabel: 'Batal (Lost)',
    sublabel: 'Ditunda / batal periode ini',
    color: 'rose',
    icon: XCircle,
    bgLight: 'bg-rose-950/25 hover:bg-rose-950/45',
    borderClass: 'border-rose-900/50',
    activeBorder: 'border-rose-400 ring-2 ring-rose-500/40 bg-rose-950/60',
    textClass: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    progressBarColor: 'bg-rose-500',
  },
];

interface CrmPipelineHealthCardProps {
  leads: CrmLead[];
  activeFilterStage: string;
  onSelectStageFilter: (stage: string) => void;
}

export const CrmPipelineHealthCard: React.FC<CrmPipelineHealthCardProps> = ({
  leads,
  activeFilterStage,
  onSelectStageFilter,
}) => {
  // Aggregate stats per status
  const stageStats = useMemo(() => {
    const totalLeads = leads.length;
    const totalValue = leads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

    const counts: Record<CrmStage, number> = {
      lead_baru: 0,
      follow_up: 0,
      negosiasi: 0,
      won: 0,
      lost: 0,
    };

    const values: Record<CrmStage, number> = {
      lead_baru: 0,
      follow_up: 0,
      negosiasi: 0,
      won: 0,
      lost: 0,
    };

    leads.forEach((l) => {
      const stage = (l.stage || 'lead_baru') as CrmStage;
      if (counts[stage] !== undefined) {
        counts[stage] += 1;
        values[stage] += l.dealValue || 0;
      } else {
        counts.lead_baru += 1;
        values.lead_baru += l.dealValue || 0;
      }
    });

    const activeCount = counts.lead_baru + counts.follow_up + counts.negosiasi;
    const activeValue = values.lead_baru + values.follow_up + values.negosiasi;
    const finishedCount = counts.won + counts.lost;
    const winRate = finishedCount > 0
      ? Math.round((counts.won / finishedCount) * 100)
      : (totalLeads > 0 ? Math.round((counts.won / totalLeads) * 100) : 0);

    // Health Assessment
    let healthRating = 'Sehat';
    let healthDescription = 'Aktivitas negosiasi & follow-up seimbang';
    let healthBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

    if (activeCount === 0) {
      healthRating = 'Perlu Prospek';
      healthDescription = 'Tidak ada prospek aktif berjalan, butuh outreach baru';
      healthBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    } else if (counts.negosiasi >= 2 && winRate >= 50) {
      healthRating = 'Sangat Kuat (High Velocity)';
      healthDescription = 'Pipeline aktif dengan peluang closing SPK tinggi';
      healthBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    } else if (counts.lost > counts.won && finishedCount >= 3) {
      healthRating = 'Evaluasi Harga/Titik';
      healthDescription = 'Tingkat lost di atas rata-rata, periksa rate card & diskon';
      healthBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }

    return {
      totalLeads,
      totalValue,
      counts,
      values,
      activeCount,
      activeValue,
      winRate,
      healthRating,
      healthDescription,
      healthBadgeColor,
    };
  }, [leads]);

  const handleStageClick = (stageId: CrmStage) => {
    if (activeFilterStage === stageId) {
      onSelectStageFilter('ALL');
    } else {
      onSelectStageFilter(stageId);
    }
  };

  return (
    <div
      id="crm-pipeline-health-snapshot"
      data-testid="crm-pipeline-health-snapshot"
      className="bg-slate-900/95 rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-all"
    >
      {/* Top Banner / Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/50 shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Ringkasan Kesehatan Pipeline CRM (Pipeline Health Snapshot)</span>
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1.5 ${stageStats.healthBadgeColor}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{stageStats.healthRating}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Jumlah total prospek terkelompok berdasarkan status alur penjualan (Prospecting → Won) untuk visibilitas instan
              </p>
            </div>
          </div>

          {/* Quick Aggregate Stats on the Right */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-700/60 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Prospek</div>
              <div className="text-sm font-extrabold font-mono text-white">
                {stageStats.totalLeads} Lead
              </div>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Nilai Portofolio</div>
              <div className="text-sm font-extrabold font-mono text-emerald-400">
                {formatCompactIDR(stageStats.totalValue)}
              </div>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Win Rate</div>
              <div className="text-sm font-extrabold font-mono text-indigo-300">
                {stageStats.winRate}%
              </div>
            </div>
          </div>
        </div>

        {/* Multi-segmented Visual Pipeline Distribution Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Distribusi Alur Status Prospek:</span>
              {activeFilterStage !== 'ALL' && (
                <span className="text-emerald-400 text-[10px] font-mono font-bold">
                  (Filter aktif: {STATUS_GROUPS.find((s) => s.id === activeFilterStage)?.englishLabel})
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-400">
              Klik kartu di bawah untuk menyaring daftar prospek
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex p-0.5 gap-0.5 border border-slate-700/60">
            {STATUS_GROUPS.map((grp) => {
              const count = stageStats.counts[grp.id] || 0;
              const percent = stageStats.totalLeads > 0 ? (count / stageStats.totalLeads) * 100 : 0;
              if (percent <= 0) return null;
              return (
                <div
                  key={grp.id}
                  style={{ width: `${percent}%` }}
                  className={`${grp.progressBarColor} h-full rounded-xs transition-all hover:brightness-125 cursor-pointer relative group`}
                  onClick={() => handleStageClick(grp.id)}
                  title={`${grp.englishLabel} (${grp.localLabel}): ${count} Lead (${Math.round(percent)}%) - ${formatCompactIDR(stageStats.values[grp.id])}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Grouped Status Cards Strip (5 Columns: Prospecting, Qualified, Negotiation, Won, Lost) */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STATUS_GROUPS.map((grp) => {
            const Icon = grp.icon;
            const count = stageStats.counts[grp.id] || 0;
            const val = stageStats.values[grp.id] || 0;
            const percent = stageStats.totalLeads > 0
              ? Math.round((count / stageStats.totalLeads) * 100)
              : 0;
            const isFilterActive = activeFilterStage === grp.id;

            return (
              <div
                key={grp.id}
                onClick={() => handleStageClick(grp.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                  isFilterActive ? grp.activeBorder : `${grp.bgLight} ${grp.borderClass}`
                }`}
                title={`Klik untuk ${isFilterActive ? 'menghapus filter' : 'hanya menampilkan'} status ${grp.englishLabel}`}
              >
                <div>
                  {/* Status Card Header */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${grp.badgeBg}`}>
                      <Icon className="w-3 h-3" />
                      <span>{grp.englishLabel}</span>
                    </span>

                    {isFilterActive ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-slate-950 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Aktif</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {percent}%
                      </span>
                    )}
                  </div>

                  {/* Indonesian Status Subtitle */}
                  <div className="text-[11px] font-bold text-slate-200">
                    {grp.localLabel}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mb-2">
                    {grp.sublabel}
                  </div>
                </div>

                {/* Status Count and Deal Value */}
                <div className="pt-2 border-t border-slate-700/50 flex items-baseline justify-between">
                  <div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight group-hover:scale-105 transition-transform">
                      {count}
                      <span className="text-xs font-normal text-slate-400 ml-1">Lead</span>
                    </div>
                    <div className={`text-[11px] font-mono font-bold mt-0.5 ${grp.textClass}`}>
                      {formatCompactIDR(val)}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 group-hover:text-white transition-colors">
                    {isFilterActive ? 'Reset' : 'Saring →'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Diagnostic Helper */}
        {activeFilterStage !== 'ALL' && (
          <div className="mt-3.5 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Sedang menyaring tampilan Kanban untuk status:{' '}
                <strong className="text-white">
                  {STATUS_GROUPS.find((s) => s.id === activeFilterStage)?.englishLabel} (
                  {STATUS_GROUPS.find((s) => s.id === activeFilterStage)?.localLabel})
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectStageFilter('ALL')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
            >
              Tampilkan Semua Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
