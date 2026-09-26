import React, { useState } from 'react';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';
import { ANALYTICS_METRICS_SOURCES, MetricSourceInfo } from '../utils/analyticsSourceData';

interface AnalyticsSourceBadgeProps {
  metricKey: MetricSourceInfo['key'];
  variant?: 'badge' | 'compact' | 'pill' | 'button';
  onClick?: () => void;
  className?: string;
  showTooltip?: boolean;
}

export const AnalyticsSourceBadge: React.FC<AnalyticsSourceBadgeProps> = ({
  metricKey,
  variant = 'compact',
  onClick,
  className = '',
  showTooltip = true
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const metric = ANALYTICS_METRICS_SOURCES[metricKey];

  if (!metric) return null;

  return (
    <div
      className={`relative inline-flex items-center group/src ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {variant === 'button' ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 transition-colors cursor-pointer"
          title={`Lihat sumber data & audit akurasi ${metric.shortName}`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Sumber: Dishub &amp; WOO (Akurasi {metric.accuracyPercentage}%)</span>
        </button>
      ) : variant === 'pill' ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30 hover:bg-blue-500/25 transition-colors cursor-pointer"
          title={`Akurasi ${metric.accuracyPercentage}% • Sumber: ${metric.source}`}
        >
          <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
          <span>Akurasi {metric.accuracyPercentage}%</span>
        </button>
      ) : variant === 'badge' ? (
        <div
          onClick={onClick}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] border border-slate-200 dark:border-slate-700 font-medium cursor-pointer hover:border-emerald-400 transition-colors"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Akurasi {metric.accuracyPercentage}%</span>
        </div>
      ) : (
        /* Compact icon trigger */
        <button
          type="button"
          onClick={onClick}
          className="p-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer inline-flex items-center"
          title={`Akurasi ${metric.accuracyPercentage}% • Sumber: ${metric.source}`}
          aria-label={`Informasi sumber data ${metric.name}`}
        >
          <Info className="w-3 h-3" />
        </button>
      )}

      {/* Floating Hover Tooltip if enabled */}
      {showTooltip && isHovered && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/src:flex flex-col w-64 p-2.5 bg-slate-900/95 text-white text-[10px] rounded-xl shadow-2xl border border-slate-700 pointer-events-none z-50 text-left animate-in fade-in duration-150 backdrop-blur-xs">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1 mb-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{metric.shortName}</span>
            </span>
            <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1 rounded border border-emerald-500/30">
              Akurasi: {metric.accuracyPercentage}%
            </span>
          </div>

          <p className="text-slate-200 text-[10px] leading-relaxed">
            <strong>Sumber:</strong> {metric.source}
          </p>

          <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
            <span>Toleransi Error: {metric.marginOfError}</span>
            <span>{metric.auditPeriod}</span>
          </div>
        </div>
      )}
    </div>
  );
};
