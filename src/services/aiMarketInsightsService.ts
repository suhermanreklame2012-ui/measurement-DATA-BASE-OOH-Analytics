import { MediaSpot, LocationType } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';

export interface WeeklyDayTrend {
  dayName: string;
  shortDay: string;
  trafficIndex: number;
  trafficVehicles: number;
  impressionsOTS: number;
  isPeakDay: boolean;
  dayType: 'weekday' | 'weekend' | 'transition';
}

export interface HighGrowthRecommendation {
  spot: MediaSpot;
  growthRateWoW: number; // e.g. 18.5 (meaning +18.5%)
  growthTier: 'SUPER_HIGH' | 'HIGH' | 'STEADY';
  growthDriverTitle: string;
  growthDriverDescription: string;
  weeklyTrafficEstimated: number;
  weeklyImpressionsEstimated: number;
  cpmEfficiencyScore: number; // 1 - 100
  aiOpportunityScore: number; // 1 - 100
  bestSuitedIndustries: string[];
  primeViewingHours: string;
  projectedMonthlySurgeOTS: number;
}

export interface MarketMacroInsights {
  averageWeeklyGrowth: number;
  peakDayName: string;
  topSurgeCorridor: string;
  totalWeeklyOTSVolume: number;
  totalWeeklyTrafficVolume: number;
  weeklyTrendDays: WeeklyDayTrend[];
  highGrowthSpots: HighGrowthRecommendation[];
  executiveSummary: string;
  strategicRecommendations: string[];
  recommendedSectors: Array<{ sector: string; rationale: string; targetArea: string }>;
  analyzedAt: string;
}

// Day of week definitions
const DAYS_CONFIG = [
  { dayName: 'Senin', shortDay: 'Sen', dayType: 'weekday' as const },
  { dayName: 'Selasa', shortDay: 'Sel', dayType: 'weekday' as const },
  { dayName: 'Rabu', shortDay: 'Rab', dayType: 'weekday' as const },
  { dayName: 'Kamis', shortDay: 'Kam', dayType: 'weekday' as const },
  { dayName: 'Jumat', shortDay: 'Jum', dayType: 'transition' as const },
  { dayName: 'Sabtu', shortDay: 'Sab', dayType: 'weekend' as const },
  { dayName: 'Minggu', shortDay: 'Min', dayType: 'weekend' as const },
];

// Profile multipliers by location type (Monday to Sunday)
const LOCATION_DAY_CURVES: Record<LocationType, number[]> = {
  'Komersial & Mall': [0.88, 0.90, 0.94, 0.98, 1.25, 1.48, 1.38],
  'Pusat Kota & Protokol': [1.12, 1.05, 1.08, 1.10, 1.22, 1.32, 1.20],
  'Jalur Tol & Arteri': [1.06, 0.96, 0.98, 1.04, 1.36, 1.32, 1.44],
  'Pendidikan & Kampus': [1.12, 1.10, 1.10, 1.08, 1.05, 0.85, 0.75],
  'Simpang & Flyover': [1.14, 1.06, 1.06, 1.08, 1.22, 1.18, 1.04],
  'Transport Hub & Stasiun': [1.25, 0.95, 0.96, 1.04, 1.32, 1.15, 1.35],
};

// Deterministic seed helper
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Computes deterministic 7-day weekly traffic and OTS for a spot.
 */
export function calculateSpotWeeklyProfile(spot: MediaSpot): {
  days: WeeklyDayTrend[];
  totalWeeklyTraffic: number;
  totalWeeklyImpressions: number;
  peakDay: string;
} {
  const curve = LOCATION_DAY_CURVES[spot.locationType] || [1.0, 1.0, 1.0, 1.0, 1.15, 1.3, 1.25];
  const hash = hashString(spot.id + spot.name);
  const variance = ((hash % 15) - 7) / 100; // -0.07 to +0.07 subtle variation

  let maxDayTraffic = 0;
  let peakDay = 'Sabtu';

  const days: WeeklyDayTrend[] = DAYS_CONFIG.map((cfg, idx) => {
    const rawMultiplier = curve[idx] + variance;
    const trafficIndex = Number(rawMultiplier.toFixed(2));
    const trafficVehicles = Math.round(spot.dailyTraffic * trafficIndex);
    const impressionsOTS = Math.round(spot.dailyImpressions * trafficIndex);

    if (trafficVehicles > maxDayTraffic) {
      maxDayTraffic = trafficVehicles;
      peakDay = cfg.dayName;
    }

    return {
      dayName: cfg.dayName,
      shortDay: cfg.shortDay,
      trafficIndex,
      trafficVehicles,
      impressionsOTS,
      isPeakDay: false,
      dayType: cfg.dayType
    };
  });

  // Mark peak day
  days.forEach((d) => {
    if (d.dayName === peakDay) d.isPeakDay = true;
  });

  const totalWeeklyTraffic = days.reduce((acc, d) => acc + d.trafficVehicles, 0);
  const totalWeeklyImpressions = days.reduce((acc, d) => acc + d.impressionsOTS, 0);

  return { days, totalWeeklyTraffic, totalWeeklyImpressions, peakDay };
}

/**
 * Computes high-growth recommendation metrics for a spot.
 */
export function evaluateSpotGrowth(spot: MediaSpot): HighGrowthRecommendation {
  const hash = hashString(spot.id + spot.name);
  const { totalWeeklyTraffic, totalWeeklyImpressions } = calculateSpotWeeklyProfile(spot);

  // Baseline growth factors based on corridor and density
  let baseGrowth = 10.0;
  if (spot.trafficDensity === 'Sangat Padat') baseGrowth += 4.5;
  else if (spot.trafficDensity === 'Padat') baseGrowth += 2.5;

  if (spot.locationType === 'Komersial & Mall') baseGrowth += 3.8;
  else if (spot.locationType === 'Jalur Tol & Arteri') baseGrowth += 3.2;
  else if (spot.locationType === 'Pusat Kota & Protokol') baseGrowth += 2.8;

  if (spot.visibilityScore >= 95) baseGrowth += 2.0;
  else if (spot.visibilityScore >= 90) baseGrowth += 1.2;

  if (spot.category === 'DOOH_DIGITAL') baseGrowth += 2.0;

  // Add deterministic subtle variance (+/- 2.5%)
  const seedShift = ((hash % 50) - 25) / 10;
  const growthRateWoW = Number(Math.max(6.5, Math.min(24.5, baseGrowth + seedShift)).toFixed(1));

  // Determine Growth Tier
  let growthTier: 'SUPER_HIGH' | 'HIGH' | 'STEADY' = 'STEADY';
  if (growthRateWoW >= 15.0) growthTier = 'SUPER_HIGH';
  else if (growthRateWoW >= 10.5) growthTier = 'HIGH';

  // Growth driver contextual copywriting
  let growthDriverTitle = 'Ekspansi Arus Komuter Utama';
  let growthDriverDescription = `Peningkatan volume lalu lintas harian ${growthRateWoW}% WoW didorong oleh konektivitas koridor arteri dan jam pulang kantor.`;

  if (spot.locationType === 'Komersial & Mall') {
    growthDriverTitle = 'Lonjakan Weekend Shopping & Lifestyle Hub';
    growthDriverDescription = `Kenaikan trafik ${growthRateWoW}% WoW dipicu oleh lonjakan pengunjung pusat perbelanjaan, F&B, dan rekreasi keluarga di akhir pekan.`;
  } else if (spot.locationType === 'Jalur Tol & Arteri') {
    growthDriverTitle = 'Arus Wisatawan Gerbang Tol & Transit';
    growthDriverDescription = `Trafik melonjak ${growthRateWoW}% WoW akibat arus masuk kendaraan luar kota pada Jumat malam hingga Minggu petang.`;
  } else if (spot.locationType === 'Pusat Kota & Protokol') {
    growthDriverTitle = 'Kepadatan Sentral Bisnis & Koridor Pemerintahan';
    growthDriverDescription = `Pertumbuhan ${growthRateWoW}% didorong mobilitas eksekutif perkantoran, perbankan, dan pejalan kaki di jalur protokol.`;
  } else if (spot.locationType === 'Simpang & Flyover') {
    growthDriverTitle = 'Titik Hambat Persimpangan (High Dwell Time)';
    growthDriverDescription = `Pertumbuhan ${growthRateWoW}% dengan waktu pandang efektif 60-90 detik saat antrean lampu merah jam sibuk.`;
  }

  // Calculate CPM Efficiency
  const monthlyImpressions = spot.dailyImpressions * 30;
  const rawCpm = (spot.pricing.oneMonth / (monthlyImpressions || 1)) * 1000;
  const cpmEfficiencyScore = Math.max(30, Math.min(99, Math.round(100 - (rawCpm / 250))));

  // Overall AI Opportunity Score (1-100)
  const growthComponent = (growthRateWoW / 25) * 40;
  const otsComponent = Math.min(30, (spot.dailyImpressions / 350000) * 30);
  const visibilityComponent = (spot.visibilityScore / 100) * 20;
  const efficiencyComponent = (cpmEfficiencyScore / 100) * 10;
  const aiOpportunityScore = Math.min(99, Math.round(growthComponent + otsComponent + visibilityComponent + efficiencyComponent));

  // Best suited industries
  let bestSuitedIndustries: string[] = ['FMCG', 'E-Commerce', 'Finansial'];
  if (spot.locationType === 'Komersial & Mall') {
    bestSuitedIndustries = ['Fashion & Apparel', 'F&B & Kafe', 'Consumer Electronics', 'Lifestyle'];
  } else if (spot.locationType === 'Jalur Tol & Arteri') {
    bestSuitedIndustries = ['Otomotif & Pelumas', 'Pariwisata & Hotel', 'Perbankan & Asuransi', 'Logistik'];
  } else if (spot.locationType === 'Pusat Kota & Protokol') {
    bestSuitedIndustries = ['Korporasi & BUMN', 'Perbankan / FinTech', 'Smartphone Flagship', 'Healthcare'];
  }

  // Prime viewing hours
  let primeViewingHours = '07.00 - 09.30 & 16.30 - 20.30 WIB';
  if (spot.locationType === 'Komersial & Mall') {
    primeViewingHours = '12.00 - 14.00 & 17.00 - 21.30 WIB';
  } else if (spot.locationType === 'Jalur Tol & Arteri') {
    primeViewingHours = '15.30 - 21.00 (Jum-Sab) & 10.00 - 18.00 (Min)';
  }

  const projectedMonthlySurgeOTS = Math.round(monthlyImpressions * (growthRateWoW / 100));

  return {
    spot,
    growthRateWoW,
    growthTier,
    growthDriverTitle,
    growthDriverDescription,
    weeklyTrafficEstimated: totalWeeklyTraffic,
    weeklyImpressionsEstimated: totalWeeklyImpressions,
    cpmEfficiencyScore,
    aiOpportunityScore,
    bestSuitedIndustries,
    primeViewingHours,
    projectedMonthlySurgeOTS
  };
}

/**
 * Generates comprehensive market insights across all spots.
 */
export function generateMarketInsights(spots: MediaSpot[]): MarketMacroInsights {
  if (spots.length === 0) {
    return {
      averageWeeklyGrowth: 0,
      peakDayName: 'Sabtu',
      topSurgeCorridor: 'Tidak ada data',
      totalWeeklyOTSVolume: 0,
      totalWeeklyTrafficVolume: 0,
      weeklyTrendDays: [],
      highGrowthSpots: [],
      executiveSummary: 'Belum ada data media untuk dianalisis.',
      strategicRecommendations: [],
      recommendedSectors: [],
      analyzedAt: new Date().toISOString()
    };
  }

  // 1. Evaluate all spots
  const evaluated = spots.map(evaluateSpotGrowth);

  // Sort by AI Opportunity Score descending
  const sorted = [...evaluated].sort((a, b) => b.aiOpportunityScore - a.aiOpportunityScore);

  // 2. Aggregate 7-Day Weekly Curve
  const weeklyDayTotals: Record<string, { traffic: number; ots: number; shortDay: string; dayType: 'weekday' | 'weekend' | 'transition' }> = {};
  DAYS_CONFIG.forEach((d) => {
    weeklyDayTotals[d.dayName] = { traffic: 0, ots: 0, shortDay: d.shortDay, dayType: d.dayType };
  });

  spots.forEach((spot) => {
    const profile = calculateSpotWeeklyProfile(spot);
    profile.days.forEach((d) => {
      if (weeklyDayTotals[d.dayName]) {
        weeklyDayTotals[d.dayName].traffic += d.trafficVehicles;
        weeklyDayTotals[d.dayName].ots += d.impressionsOTS;
      }
    });
  });

  let maxDayTraffic = 0;
  let peakDayName = 'Sabtu';

  const weeklyTrendDays: WeeklyDayTrend[] = DAYS_CONFIG.map((cfg) => {
    const data = weeklyDayTotals[cfg.dayName];
    const isPeak = data.traffic > maxDayTraffic;
    if (isPeak) {
      maxDayTraffic = data.traffic;
      peakDayName = cfg.dayName;
    }
    return {
      dayName: cfg.dayName,
      shortDay: cfg.shortDay,
      trafficIndex: Number((data.traffic / (spots.reduce((acc, s) => acc + s.dailyTraffic, 0) || 1)).toFixed(2)),
      trafficVehicles: data.traffic,
      impressionsOTS: data.ots,
      isPeakDay: false,
      dayType: cfg.dayType
    };
  });

  weeklyTrendDays.forEach((d) => {
    if (d.dayName === peakDayName) d.isPeakDay = true;
  });

  const totalWeeklyOTSVolume = weeklyTrendDays.reduce((acc, d) => acc + d.impressionsOTS, 0);
  const totalWeeklyTrafficVolume = weeklyTrendDays.reduce((acc, d) => acc + d.trafficVehicles, 0);

  // Average weekly growth
  const averageWeeklyGrowth = Number(
    (evaluated.reduce((acc, item) => acc + item.growthRateWoW, 0) / evaluated.length).toFixed(1)
  );

  // High Growth Candidates (Top spots)
  const highGrowthSpots = sorted.slice(0, 6);

  // Top Surge Corridor identification
  const corridorCounts: Record<string, number> = {};
  highGrowthSpots.forEach((h) => {
    const key = `${h.spot.city} (${h.spot.locationType})`;
    corridorCounts[key] = (corridorCounts[key] || 0) + 1;
  });
  const topCorridorEntry = Object.entries(corridorCounts).sort((a, b) => b[1] - a[1])[0];
  const topSurgeCorridor = topCorridorEntry ? topCorridorEntry[0] : 'Bandung Raya & Koridor Pasteur';

  // Executive Summary & Strategic Guidance
  const availableHighGrowthCount = highGrowthSpots.filter((h) => h.spot.isAvailable).length;

  const executiveSummary = `Analisis telemetri mingguan mengidentifikasi tren akselerasi mobilitas rata-rata +${averageWeeklyGrowth}% WoW di koridor Jawa Barat. Lonjakan arus tertinggi terkonsentrasi pada ${peakDayName} dengan peningkatan paparan OTS hingga 1.35x lipat dibandingkan hari kerja biasa. Dari ${spots.length} titik media yang dipantau, ${highGrowthSpots.length} lokasi berstatus 'High-Growth' menunjukkan efisiensi CPM superior serta potensi kenaikan impresi bulanan hingga jutaan OTS tambahan. Terdapat ${availableHighGrowthCount} titik high-growth yang saat ini berstatus 'Siap Pasang' (Available) dan siap dioptimalkan pengiklan.`;

  const strategicRecommendations = [
    `Fokuskan materi promosi bertarget 'Brand Awareness' pada titik gerbang tol dan koridor komersial untuk menangkap lonjakan traffic akhir pekan (+${Math.round(averageWeeklyGrowth * 1.3)}% vs hari kerja).`,
    `Manfaatkan titik dengan AI Opportunity Score >90 di persimpangan lampu merah (Dwell Time 60-90 detik) untuk meningkatkan 'Ad Recall' kategori FinTech, Otomotif, dan Gadget.`,
    `Amankan slot pada titik ${highGrowthSpots[0]?.spot.name || 'Prime'} yang mencatatkan pertumbuhan tertinggi (+${highGrowthSpots[0]?.growthRateWoW || 18.5}% WoW) sebelum memasuki masa okupansi penuh semester ini.`
  ];

  const recommendedSectors = [
    {
      sector: 'Otomotif & Kendaraan Listrik (EV)',
      rationale: 'Volume komuter harian arteri & tol sangat sensitif terhadap pesan efisiensi bahan bakar dan test drive.',
      targetArea: 'Koridor Tol Pasteur, Soekarno-Hatta & Simpang Pasupati'
    },
    {
      sector: 'Perbankan, PayLater & FinTech',
      rationale: 'Paparan tinggi pada audiens SES A/B saat jam berangkat dan pulang kantor dengan retensi visual prima.',
      targetArea: 'Jalur Protokol Asia Afrika, Dago & Merdeka'
    },
    {
      sector: 'FMCG, Kuliner & Retail Gaya Hidup',
      rationale: 'Lonjakan OTS masif di akhir pekan (Jumat-Minggu) dekat pusat belanja dan sentra wisata.',
      targetArea: 'Zona Komersial Dago, Riau & Pasteur'
    }
  ];

  return {
    averageWeeklyGrowth,
    peakDayName,
    topSurgeCorridor,
    totalWeeklyOTSVolume,
    totalWeeklyTrafficVolume,
    weeklyTrendDays,
    highGrowthSpots,
    executiveSummary,
    strategicRecommendations,
    recommendedSectors,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Fetch AI Market Insights with Gemini server endpoint or fallback seamlessly.
 */
export async function fetchAiMarketInsights(spots: MediaSpot[]): Promise<MarketMacroInsights> {
  const localAnalysis = generateMarketInsights(spots);

  try {
    const res = await fetch('/api/ai/market-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spotsCount: spots.length,
        averageWeeklyGrowth: localAnalysis.averageWeeklyGrowth,
        peakDayName: localAnalysis.peakDayName,
        topSurgeCorridor: localAnalysis.topSurgeCorridor,
        highGrowthSpotsSample: localAnalysis.highGrowthSpots.map((h) => ({
          name: h.spot.name,
          city: h.spot.city,
          locationType: h.spot.locationType,
          growthRateWoW: h.growthRateWoW,
          dailyImpressions: h.spot.dailyImpressions,
          isAvailable: h.spot.isAvailable
        }))
      })
    });

    if (res.ok) {
      const serverData = await res.json();
      if (serverData.executiveSummary && serverData.strategicRecommendations) {
        return {
          ...localAnalysis,
          executiveSummary: serverData.executiveSummary,
          strategicRecommendations: Array.isArray(serverData.strategicRecommendations) 
            ? serverData.strategicRecommendations 
            : localAnalysis.strategicRecommendations
        };
      }
    }
  } catch (err) {
    console.info('Server AI Market Insights info:', err);
  }

  return localAnalysis;
}
