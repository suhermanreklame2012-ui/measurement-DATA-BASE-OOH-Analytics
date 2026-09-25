import React from 'react';
import { 
  MapPin, 
  Activity, 
  Layers, 
  Calculator, 
  TrendingUp, 
  Briefcase 
} from 'lucide-react';

export type TabKey = 'map' | 'analytics' | 'table' | 'planner' | 'roi' | 'crm';

interface MobileBottomNavProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  totalSpots?: number;
  availableSpots?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  totalSpots = 0
}) => {
  const navItems: Array<{
    id: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badge?: string | number;
  }> = [
    {
      id: 'map',
      label: 'Peta',
      icon: MapPin,
      accentColor: 'text-emerald-400'
    },
    {
      id: 'analytics',
      label: 'Tren',
      icon: Activity,
      accentColor: 'text-emerald-400'
    },
    {
      id: 'table',
      label: 'Media',
      icon: Layers,
      accentColor: 'text-emerald-400',
      badge: totalSpots > 0 ? totalSpots : undefined
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: Calculator,
      accentColor: 'text-indigo-400'
    },
    {
      id: 'roi',
      label: 'ROI',
      icon: TrendingUp,
      accentColor: 'text-emerald-400'
    },
    {
      id: 'crm',
      label: 'CRM',
      icon: Briefcase,
      accentColor: 'text-emerald-400'
    }
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navigasi Bawah Ponsel"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 shadow-2xl px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-6 items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all select-none cursor-pointer min-h-[44px] ${
                isActive
                  ? 'text-white bg-slate-800/80 font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? `${item.accentColor} scale-110` : 'text-slate-400'
                  }`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-950">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight leading-none ${
                  isActive ? 'text-white font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-4 h-0.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
