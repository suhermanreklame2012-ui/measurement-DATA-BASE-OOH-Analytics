import { MediaSpot, ProposalDuration } from '../types/ooh';
import { formatIDR, formatCompactNumber } from './formatters';

export interface DemographicsBreakdown {
  sesA: number; // percentage
  sesB: number;
  sesC: number;
  dominantAgeGroup: string;
  ageDistribution: { range: string; percentage: number }[];
  genderSplit: { male: number; female: number };
  personas: string[];
  peakTrafficHours: string;
  trafficModalSplit: { motorcycles: number; privateCars: number; publicAndCommercial: number };
  averageDwellTimeSec: number;
  averageVisibilityScore: number;
  mobilityInsights: string;
}

export interface ProposalFinancialSummary {
  duration: ProposalDuration;
  durationMonths: number;
  totalMonthlyStandardRate: number;
  grossUndiscountedTotal: number;
  packageTotalCost: number;
  clientSavingsAmount: number;
  discountPercentage: number;
  effectiveMonthlyRate: number;
  costPerDay: number;
  effectiveCPM: number; // Cost per 1,000 OTS
}

export interface UnifiedProposalAnalytics {
  totalSpots: number;
  spots: MediaSpot[];
  totalDailyTraffic: number;
  totalMonthlyTraffic: number;
  totalDailyImpressions: number;
  totalMonthlyImpressions: number;
  averageDailyOTSPerSpot: number;
  demographics: DemographicsBreakdown;
  financials: ProposalFinancialSummary;
  citiesCovered: string[];
  dominantLocationTypes: string[];
  mediaTypesSummary: string[];
}

/**
 * Calculates unified traffic, demographic, and financial analytics
 * for any set of marked/selected MediaSpot items.
 */
export function calculateUnifiedProposalAnalytics(
  spots: MediaSpot[],
  duration: ProposalDuration = '1 Bulan'
): UnifiedProposalAnalytics {
  const totalSpots = spots.length;

  if (totalSpots === 0) {
    return {
      totalSpots: 0,
      spots: [],
      totalDailyTraffic: 0,
      totalMonthlyTraffic: 0,
      totalDailyImpressions: 0,
      totalMonthlyImpressions: 0,
      averageDailyOTSPerSpot: 0,
      citiesCovered: [],
      dominantLocationTypes: [],
      mediaTypesSummary: [],
      demographics: {
        sesA: 0,
        sesB: 0,
        sesC: 0,
        dominantAgeGroup: '-',
        ageDistribution: [],
        genderSplit: { male: 50, female: 50 },
        personas: [],
        peakTrafficHours: '-',
        trafficModalSplit: { motorcycles: 65, privateCars: 25, publicAndCommercial: 10 },
        averageDwellTimeSec: 0,
        averageVisibilityScore: 0,
        mobilityInsights: 'Belum ada data lokasi yang dipilih.'
      },
      financials: {
        duration,
        durationMonths: 1,
        totalMonthlyStandardRate: 0,
        grossUndiscountedTotal: 0,
        packageTotalCost: 0,
        clientSavingsAmount: 0,
        discountPercentage: 0,
        effectiveMonthlyRate: 0,
        costPerDay: 0,
        effectiveCPM: 0
      }
    };
  }

  // Duration in months
  let durationMonths = 1;
  let discountPercentage = 0;
  if (duration === '3 Bulan') {
    durationMonths = 3;
    discountPercentage = 5;
  } else if (duration === '6 Bulan') {
    durationMonths = 6;
    discountPercentage = 10;
  } else if (duration === '1 Tahun') {
    durationMonths = 12;
    discountPercentage = 15;
  }

  // Aggregate Traffic Metrics
  const totalDailyTraffic = spots.reduce((acc, s) => acc + (s.dailyTraffic || 0), 0);
  const totalMonthlyTraffic = totalDailyTraffic * 30;
  const totalDailyImpressions = spots.reduce((acc, s) => acc + (s.dailyImpressions || 0), 0);
  const totalMonthlyImpressions = totalDailyImpressions * 30 * durationMonths;
  const averageDailyOTSPerSpot = Math.round(totalDailyImpressions / totalSpots);

  // Financial calculations
  const totalMonthlyStandardRate = spots.reduce((acc, s) => acc + (s.pricing?.oneMonth || 0), 0);
  const grossUndiscountedTotal = totalMonthlyStandardRate * durationMonths;

  const packageTotalCost = spots.reduce((acc, s) => {
    if (duration === '3 Bulan') return acc + (s.pricing?.threeMonths || (s.pricing?.oneMonth || 0) * 3 * 0.95);
    if (duration === '6 Bulan') return acc + (s.pricing?.sixMonths || (s.pricing?.oneMonth || 0) * 6 * 0.90);
    if (duration === '1 Tahun') return acc + (s.pricing?.oneYear || (s.pricing?.oneMonth || 0) * 12 * 0.85);
    return acc + (s.pricing?.oneMonth || 0);
  }, 0);

  const clientSavingsAmount = Math.max(0, grossUndiscountedTotal - packageTotalCost);
  const effectiveMonthlyRate = Math.round(packageTotalCost / durationMonths);
  const totalDays = durationMonths * 30;
  const costPerDay = Math.round(packageTotalCost / totalDays);
  const effectiveCPM = totalMonthlyImpressions > 0 
    ? Number(((packageTotalCost / totalMonthlyImpressions) * 1000).toFixed(1))
    : 0;

  // Metadata grouping
  const citiesCovered = Array.from(new Set(spots.map(s => s.city)));
  const dominantLocationTypes = Array.from(new Set(spots.map(s => s.locationType)));
  const mediaTypesSummary = Array.from(new Set(spots.map(s => `${s.mediaType} (${s.category === 'DOOH_DIGITAL' ? 'DOOH' : 'OOH'})`)));

  // Demographics intelligence synthesis
  let sesAWeight = 0;
  let sesBWeight = 0;
  let sesCWeight = 0;

  spots.forEach((s) => {
    if (s.locationType === 'Komersial & Mall' || s.city.includes('Bandung')) {
      sesAWeight += 35;
      sesBWeight += 45;
      sesCWeight += 20;
    } else if (s.locationType === 'Pusat Kota & Protokol') {
      sesAWeight += 30;
      sesBWeight += 50;
      sesCWeight += 20;
    } else if (s.locationType === 'Pendidikan & Kampus') {
      sesAWeight += 15;
      sesBWeight += 55;
      sesCWeight += 30;
    } else if (s.locationType === 'Jalur Tol & Arteri') {
      sesAWeight += 25;
      sesBWeight += 45;
      sesCWeight += 30;
    } else {
      sesAWeight += 20;
      sesBWeight += 50;
      sesCWeight += 30;
    }
  });

  const totalWeight = sesAWeight + sesBWeight + sesCWeight;
  const sesA = Math.round((sesAWeight / totalWeight) * 100);
  const sesB = Math.round((sesBWeight / totalWeight) * 100);
  const sesC = 100 - sesA - sesB;

  // Age distribution
  const ageDistribution = [
    { range: '18 - 24 thn (Gen Z & Mahasiswa)', percentage: 24 },
    { range: '25 - 39 thn (Profesional Muda & Family)', percentage: 48 },
    { range: '40 - 54 thn (Eksekutif & Pengusaha)', percentage: 21 },
    { range: '55+ thn (Mature Audience)', percentage: 7 }
  ];

  // Personas
  const personas = [
    'Komuter Eksekutif & Profesional Koridor Perkantoran',
    'Pengambil Keputusan Belanja Rumah Tangga (Keluarga Muda)',
    'Civitas Akademika & Generasi Digital Aktif (Gen Z)',
    'Wisatawan Domestik & Komuter Antarkota (Jabodetabek - Bandung)'
  ];

  // Visibility & Dwell Time
  const averageVisibilityScore = Math.round(
    spots.reduce((acc, s) => acc + (s.visibilityScore || 85), 0) / totalSpots
  );

  const averageDwellTimeSec = spots.some(s => s.locationType === 'Simpang & Flyover') ? 65 : 35;

  const mobilityInsights = `Jalur lintasan strategis koridor ${citiesCovered.join(', ')} dengan arus mobilitas padat dua arah. Paparan optimal pada titik persimpangan dan arteri utama dengan rata-rata visibilitas ${averageVisibilityScore}/100 dan dwell time ${averageDwellTimeSec} detik.`;

  return {
    totalSpots,
    spots,
    totalDailyTraffic,
    totalMonthlyTraffic,
    totalDailyImpressions,
    totalMonthlyImpressions,
    averageDailyOTSPerSpot,
    citiesCovered,
    dominantLocationTypes,
    mediaTypesSummary,
    demographics: {
      sesA,
      sesB,
      sesC,
      dominantAgeGroup: '25 - 39 Tahun (Millennials & Profesional Aktif)',
      ageDistribution,
      genderSplit: { male: 54, female: 46 },
      personas,
      peakTrafficHours: 'Pagi: 06.30 - 09.30 WIB | Sore-Malam: 16.30 - 20.30 WIB',
      trafficModalSplit: { motorcycles: 67, privateCars: 25, publicAndCommercial: 8 },
      averageDwellTimeSec,
      averageVisibilityScore,
      mobilityInsights
    },
    financials: {
      duration,
      durationMonths,
      totalMonthlyStandardRate,
      grossUndiscountedTotal,
      packageTotalCost,
      clientSavingsAmount,
      discountPercentage,
      effectiveMonthlyRate,
      costPerDay,
      effectiveCPM
    }
  };
}
