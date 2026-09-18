import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { 
  TrendingUp, 
  Activity, 
  Users, 
  Car, 
  DollarSign, 
  Zap, 
  Clock, 
  Building2,
  PieChart as PieIcon,
  ShieldCheck
} from 'lucide-react';

interface AnalyticsDashboardProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ spots, onSelectSpot }) => {
  // Live ticking OTS counter
  const [liveImpressionCounter, setLiveImpressionCounter] = useState<number>(() => {
    const totalDaily = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
    // Fraction of the day elapsed
    const now = new Date();
    const secPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const ratio = Math.min(1, Math.max(0.1, secPassed / 86400));
    return Math.floor(totalDaily * ratio);
  });

  useEffect(() => {
    const totalDaily = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
    const interval = setInterval(() => {
      // simulate realistic real-time viewer ticks
      const increment = Math.floor((totalDaily / 86400) * 2 + Math.random() * 8);
      setLiveImpressionCounter((prev) => prev + increment);
    }, 1500);

    return () => clearInterval(interval);
  }, [spots]);

  // Aggregate stats
  const totalSpots = spots.length;
  const availableSpots = spots.filter((s) => s.isAvailable).length;
  const soldOutSpots = totalSpots - availableSpots;
  const occupancyRate = totalSpots > 0 ? Math.round((soldOutSpots / totalSpots) * 100) : 0;
  const totalDailyTraffic = spots.reduce((acc, s) => acc + s.dailyTraffic, 0);
  const totalDailyImpressions = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);
  const totalMonthlyInventory = spots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);

  // Hourly Traffic simulation data
  const hourlyData = [
    { hour: '06:00', traffic: Math.round(totalDailyTraffic * 0.025), doohReach: Math.round(totalDailyImpressions * 0.022) },
    { hour: '07:00', traffic: Math.round(totalDailyTraffic * 0.075), doohReach: Math.round(totalDailyImpressions * 0.078) },
    { hour: '08:00', traffic: Math.round(totalDailyTraffic * 0.095), doohReach: Math.round(totalDailyImpressions * 0.102) }, // Morning Peak
    { hour: '09:00', traffic: Math.round(totalDailyTraffic * 0.065), doohReach: Math.round(totalDailyImpressions * 0.068) },
    { hour: '11:00', traffic: Math.round(totalDailyTraffic * 0.055), doohReach: Math.round(totalDailyImpressions * 0.052) },
    { hour: '12:00', traffic: Math.round(totalDailyTraffic * 0.070), doohReach: Math.round(totalDailyImpressions * 0.072) }, // Lunch
    { hour: '14:00', traffic: Math.round(totalDailyTraffic * 0.058), doohReach: Math.round(totalDailyImpressions * 0.055) },
    { hour: '16:00', traffic: Math.round(totalDailyTraffic * 0.082), doohReach: Math.round(totalDailyImpressions * 0.086) },
    { hour: '17:00', traffic: Math.round(totalDailyTraffic * 0.108), doohReach: Math.round(totalDailyImpressions * 0.118) }, // Evening Peak
    { hour: '18:30', traffic: Math.round(totalDailyTraffic * 0.098), doohReach: Math.round(totalDailyImpressions * 0.106) }, // Night Out
    { hour: '20:00', traffic: Math.round(totalDailyTraffic * 0.065), doohReach: Math.round(totalDailyImpressions * 0.070) },
    { hour: '21:30', traffic: Math.round(totalDailyTraffic * 0.040), doohReach: Math.round(totalDailyImpressions * 0.042) }
  ];

  // Distribution by Media Type
  const mediaTypeMap: Record<string, { count: number; totalTraffic: number; totalImpressions: number }> = {};
  spots.forEach((s) => {
    const key = s.category === 'DOOH_DIGITAL' ? 'DOOH Videotron' : s.mediaType.includes('JPO') ? 'JPO (Backlite/Front)' : s.mediaType.includes('Bando') ? 'Bando Jalan' : 'Billboard Frontlite';
    if (!mediaTypeMap[key]) {
      mediaTypeMap[key] = { count: 0, totalTraffic: 0, totalImpressions: 0 };
    }
    mediaTypeMap[key].count += 1;
    mediaTypeMap[key].totalTraffic += s.dailyTraffic;
    mediaTypeMap[key].totalImpressions += s.dailyImpressions;
  });

  const mediaTypeData = Object.entries(mediaTypeMap).map(([type, stats]) => ({
    name: type,
    titik: stats.count,
    impresi: Math.round(stats.totalImpressions / 1000)
  }));

  // Distribution by Location Type
  const locTypeMap: Record<string, number> = {};
  spots.forEach((s) => {
    locTypeMap[s.locationType] = (locTypeMap[s.locationType] || 0) + 1;
  });

  const locTypeData = Object.entries(locTypeMap).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  // Top 5 Spots Leaderboard
  const topSpots = [...spots].sort((a, b) => b.dailyImpressions - a.dailyImpressions).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Real-Time Impression Ticker Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-lg border border-slate-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                Live Telemetri Real-Time
              </span>
              <span className="text-xs text-slate-400">Akumulasi OTS Hari Ini (Jawa Barat)</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-emerald-400">
                {liveImpressionCounter.toLocaleString('id-ID')}
              </span>
              <span className="text-sm text-slate-300 font-medium">OTS Views Terukur</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-xs">
            <div>
              <div className="text-slate-400 text-[10px]">Traffic Harian</div>
              <div className="font-bold text-white text-sm">{formatCompactNumber(totalDailyTraffic)}</div>
              <div className="text-[10px] text-emerald-400">Kendaraan / Hari</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Potensi Bulanan</div>
              <div className="font-bold text-white text-sm">{formatCompactNumber(totalDailyImpressions * 30)}</div>
              <div className="text-[10px] text-amber-400">Impresi OTS / Bln</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Occupancy Rate</div>
              <div className="font-bold text-white text-sm">{occupancyRate}%</div>
              <div className="text-[10px] text-blue-400">{soldOutSpots} dari {totalSpots} Tersewa</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Nilai Portofolio</div>
              <div className="font-bold text-white text-sm">{formatCompactNumber(totalMonthlyInventory)}</div>
              <div className="text-[10px] text-purple-400">Tarif 1 Bln / Sisi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hourly Traffic & Commuter Peak Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Tren Arus Lalu Lintas & Paparan Impresi Harian (24 Jam)
              </h3>
              <p className="text-xs text-slate-500">
                Pola pergerakan komuter Kota Bandung & arteri Jawa Barat (Puncak Pagi 07:00-09:00 & Sore 16:30-19:00)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Traffic Kendaraan
              </span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Impresi OTS
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => formatCompactNumber(val)} />
                <Tooltip 
                  formatter={(val: any) => [Number(val).toLocaleString('id-ID'), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="traffic" name="Volume Kendaraan" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="doohReach" name="Estimasi Impresi OTS" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Location Type Distribution Pie Chart (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-1">
              <Building2 className="w-4 h-4 text-blue-600" />
              Karakteristik Koridor Lokasi
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Distribusi titik media berdasarkan profil zona geografis
            </p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={locTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {locTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-slate-100 text-[11px]">
            {locTypeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-600 truncate">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Secondary Grid: Format Breakdown & Top 5 Spots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Impresi & Titik Berdasarkan Format Media */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-1">
            <BarChart className="w-4 h-4 text-purple-600" />
            Performa per Format Media
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Total titik dan ribuan impresi harian (k OTS)
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mediaTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="titik" name="Jumlah Titik" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="impresi" name="Ribuan Impresi (k OTS)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 High-Impact Media Spots Leaderboard (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                Top 5 Titik Impresi Tertinggi (Highest Spatial Reach)
              </h3>
              <p className="text-xs text-slate-500">
                Lokasi dengan paparan traffic dan efisiensi CPM paling maksimal di Jawa Barat
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-1 rounded-md border border-amber-200">
              Prime Spots
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {topSpots.map((spot, idx) => {
              const isDooh = spot.category === 'DOOH_DIGITAL';
              return (
                <div
                  key={spot.id}
                  onClick={() => onSelectSpot(spot)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {spot.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          isDooh ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isDooh ? 'DOOH' : spot.size}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {spot.city} • {spot.locationType} • {spot.trafficDensity}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-emerald-600">
                      {formatCompactNumber(spot.dailyImpressions)} OTS/hr
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatIDR(spot.pricing.oneMonth)}/bln
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
