import { MediaSpot } from '../types/ooh';
import { INITIAL_CRM_LEADS } from '../data/initialCrmLeads';
import { formatCompactIDR, formatIDR } from '../utils/formatters';

export type ForecastScenario = 'CONSERVATIVE' | 'REALISTIC' | 'AGGRESSIVE' | 'CUSTOM';

export interface MonthlyProjection {
  monthKey: string;
  monthLabel: string;
  monthIndex: number;
  seasonalityMultiplier: number;
  seasonalityNote: string;
  contractedRevenue: number;
  projectedPipelineRevenue: number;
  targetPotentialRevenue: number;
  totalProjectedRevenue: number;
  projectedOccupancyRate: number;
  opportunityGap: number;
}

export interface RevenueSummary {
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  currentOccupancyRate: number;
  contractedMonthlyRevenue: number;
  unrealizedPotentialMonthly: number;
  totalCapacityMonthly: number;
  averageRatePerSpot: number;
  historicalBlendedMonthlyRate: number;
  historicalDiscountFactor: number;
  annualizedContractedRunRate: number;
  annualizedTargetRunRate: number;
  nextQuarterProjectedRevenue: number;
}

export interface RevenueGrowthOpportunity {
  id: string;
  title: string;
  category: 'QUICK_WIN_VACANT' | 'PRICING_OPTIMIZATION' | 'TERM_UPSELL' | 'DOOH_DAYPARTING' | 'CORRIDOR_EXPANSION';
  potentialMonthlyUplift: number;
  annualizedUplift: number;
  confidence: 'HIGH' | 'MEDIUM' | 'VERY_HIGH';
  priority: 'CRITICAL' | 'HIGH' | 'STRATEGIC';
  description: string;
  actionRecommendation: string;
  relatedSpotIds: string[];
  badge: string;
  metricLabel: string;
}

export interface CorridorRevenueBreakdown {
  city: string;
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyPercent: number;
  currentContractedRevenue: number;
  untappedPotentialRevenue: number;
  totalGrossCapacity: number;
}

// 12-Month West Java OOH Seasonality Profile (Indexed to 1.0 baseline)
export const WEST_JAVA_OOH_SEASONALITY: { [month: number]: { multiplier: number; note: string } } = {
  0: { multiplier: 0.88, note: 'Reset Anggaran Pasca Liburan Q1' },
  1: { multiplier: 0.94, note: 'Pra-Kampanye Ramadhan Mulai Bergerak' },
  2: { multiplier: 1.22, note: 'Puncak Kampanye Ramadhan & FMCG' },
  3: { multiplier: 1.28, note: 'Hari Raya Idul Fitri & Liburan Mudik' },
  4: { multiplier: 1.05, note: 'Normalisasi Pasar Kuartal 2' },
  5: { multiplier: 1.10, note: 'Liburan Sekolah & Promosi Wisata Jabar' },
  6: { multiplier: 1.08, note: 'Pekan Promosi Pendidikan & Kuliah Baru' },
  7: { multiplier: 1.14, note: 'Semarak HUT RI & Festival Kemerdekaan' },
  8: { multiplier: 1.12, note: 'Penyerapan Budget Korporasi Akhir Q3' },
  9: { multiplier: 1.18, note: 'Awal Kampanye Q4 & Peluncuran Produk' },
  10: { multiplier: 1.30, note: 'Puncak Harbolnas 11.11 & Belanja Akhir Tahun' },
  11: { multiplier: 1.35, note: 'Puncak Libur Natal & Tahun Baru 12.12' },
};

/**
 * Calculates current baseline revenue metrics from spot inventory and pricing tiers.
 */
export function calculateRevenueSummary(spots: MediaSpot[]): RevenueSummary {
  const totalSpots = spots.length;
  if (totalSpots === 0) {
    return {
      totalSpots: 0,
      occupiedSpots: 0,
      availableSpots: 0,
      currentOccupancyRate: 0,
      contractedMonthlyRevenue: 0,
      unrealizedPotentialMonthly: 0,
      totalCapacityMonthly: 0,
      averageRatePerSpot: 0,
      historicalBlendedMonthlyRate: 0,
      historicalDiscountFactor: 0.92,
      annualizedContractedRunRate: 0,
      annualizedTargetRunRate: 0,
      nextQuarterProjectedRevenue: 0,
    };
  }

  const occupied = spots.filter((s) => !s.isAvailable);
  const available = spots.filter((s) => s.isAvailable);

  const contractedMonthly = occupied.reduce((acc, s) => acc + (s.pricing.oneMonth || 0), 0);
  const unrealizedMonthly = available.reduce((acc, s) => acc + (s.pricing.oneMonth || 0), 0);
  const totalCapacityMonthly = contractedMonthly + unrealizedMonthly;

  const currentOccupancyRate = Math.round((occupied.length / totalSpots) * 100);
  const averageRatePerSpot = Math.round(totalCapacityMonthly / totalSpots);

  // Historical discount factor derived from multi-month packages in spotsData
  // (Comparing 3-month/3, 6-month/6 to 1-month spot prices)
  let totalOneMonthSum = 0;
  let totalEffectiveLongTermMonthlySum = 0;

  spots.forEach((s) => {
    totalOneMonthSum += s.pricing.oneMonth;
    // Historical contract weighted mix: 25% 1-mo, 40% 3-mo, 25% 6-mo, 10% 1-yr
    const effectiveMonthly =
      0.25 * s.pricing.oneMonth +
      0.40 * (s.pricing.threeMonths / 3) +
      0.25 * (s.pricing.sixMonths / 6) +
      0.10 * (s.pricing.oneYear / 12);
    totalEffectiveLongTermMonthlySum += effectiveMonthly;
  });

  const historicalDiscountFactor = totalOneMonthSum > 0 
    ? Math.round((totalEffectiveLongTermMonthlySum / totalOneMonthSum) * 100) / 100 
    : 0.91;

  const historicalBlendedMonthlyRate = Math.round(averageRatePerSpot * historicalDiscountFactor);

  const annualizedContractedRunRate = contractedMonthly * 12;
  const annualizedTargetRunRate = totalCapacityMonthly * 12 * 0.85; // 85% optimal industry benchmark

  // Estimated next quarter (3 months) projected based on current occupancy + pipeline factor
  const nextQuarterProjectedRevenue = Math.round(contractedMonthly * 3 * 1.12);

  return {
    totalSpots,
    occupiedSpots: occupied.length,
    availableSpots: available.length,
    currentOccupancyRate,
    contractedMonthlyRevenue: contractedMonthly,
    unrealizedPotentialMonthly: unrealizedMonthly,
    totalCapacityMonthly,
    averageRatePerSpot,
    historicalBlendedMonthlyRate,
    historicalDiscountFactor,
    annualizedContractedRunRate,
    annualizedTargetRunRate,
    nextQuarterProjectedRevenue,
  };
}

/**
 * Projects monthly earnings for the next 6 to 12 months based on
 * spot availability, CRM pipeline weight, historical rates, and regional seasonality.
 */
export function generateMonthlyProjections(
  spots: MediaSpot[],
  scenario: ForecastScenario = 'REALISTIC',
  customSettings?: { targetOccupancy: number; rateMultiplier: number }
): MonthlyProjection[] {
  const summary = calculateRevenueSummary(spots);
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  // Active CRM pipeline qualified value
  const pipelineWonOrInNegotiation = INITIAL_CRM_LEADS.filter(
    (lead) => lead.stage === 'won' || lead.stage === 'negosiasi' || lead.stage === 'follow_up'
  ).reduce((acc, lead) => {
    const weight = lead.stage === 'won' ? 1.0 : lead.stage === 'negosiasi' ? 0.75 : 0.4;
    // convert total deal value into approximate monthly contribution
    const durationMonths = lead.duration === '1 Tahun' ? 12 : lead.duration === '6 Bulan' ? 6 : lead.duration === '3 Bulan' ? 3 : 1;
    return acc + (lead.dealValue / durationMonths) * weight;
  }, 0);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const projections: MonthlyProjection[] = [];

  for (let i = 0; i < 6; i++) {
    const targetDate = new Date(currentYear, currentMonthIdx + i, 1);
    const mIdx = targetDate.getMonth();
    const year = targetDate.getFullYear();
    const monthKey = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
    const monthLabel = `${monthNames[mIdx]} ${year}`;

    const seasonInfo = WEST_JAVA_OOH_SEASONALITY[mIdx] || { multiplier: 1.0, note: 'Normal' };
    const seasonMultiplier = seasonInfo.multiplier;

    // Base contracted revenue decays slightly over time as contracts expire,
    // but renewal rate in prime Bandung spots historically averages ~75-80%
    const contractPersistenceFactor = Math.max(0.65, 1 - i * 0.05);
    const contractedRev = Math.round(summary.contractedMonthlyRevenue * contractPersistenceFactor);

    // Calculate incremental pipeline & vacant fill rate based on scenario
    let vacantFillRate = 0.35; // Default realistic
    let rateModifier = 1.0;
    let targetOcc = 80;

    switch (scenario) {
      case 'CONSERVATIVE':
        vacantFillRate = 0.20; // slow sales, 20% of vacant filled
        rateModifier = 0.95; // 5% discount pressure
        targetOcc = 65;
        break;
      case 'REALISTIC':
        vacantFillRate = 0.45; // normal pipeline closing
        rateModifier = 1.0;
        targetOcc = 80;
        break;
      case 'AGGRESSIVE':
        vacantFillRate = 0.75; // high sales velocity, seasonal surge
        rateModifier = 1.08; // 8% dynamic premium
        targetOcc = 92;
        break;
      case 'CUSTOM':
        targetOcc = customSettings?.targetOccupancy ?? 80;
        rateModifier = customSettings?.rateMultiplier ?? 1.0;
        vacantFillRate = Math.min(1.0, Math.max(0.1, (targetOcc - summary.currentOccupancyRate) / 100 + 0.3));
        break;
    }

    // Historical blended rate accounts for term discounts
    const effectiveVacantPool = summary.unrealizedPotentialMonthly * summary.historicalDiscountFactor;

    // Projected new revenue from converted pipeline & seasonal demand
    const pipelineContribution = Math.round(
      (pipelineWonOrInNegotiation * 0.5 + effectiveVacantPool * vacantFillRate) * seasonMultiplier * rateModifier
    );

    const totalProjected = contractedRev + pipelineContribution;

    // Ideal target potential if target occupancy achieved
    const targetRev = Math.round(summary.totalCapacityMonthly * (targetOcc / 100) * seasonMultiplier * rateModifier);

    // Projected occupancy percentage for the month
    const projectedOcc = Math.min(
      98,
      Math.max(summary.currentOccupancyRate, Math.round((totalProjected / (summary.totalCapacityMonthly * seasonMultiplier)) * 100))
    );

    const gap = Math.max(0, targetRev - totalProjected);

    projections.push({
      monthKey,
      monthLabel,
      monthIndex: i,
      seasonalityMultiplier: seasonMultiplier,
      seasonalityNote: seasonInfo.note,
      contractedRevenue: contractedRev,
      projectedPipelineRevenue: pipelineContribution,
      targetPotentialRevenue: targetRev,
      totalProjectedRevenue: totalProjected,
      projectedOccupancyRate: projectedOcc,
      opportunityGap: gap,
    });
  }

  return projections;
}

/**
 * Identifies high-impact revenue growth opportunities for Suherman Reklame,
 * pointing directly to specific vacant spots, rate underpricing, and duration upsells.
 */
export function identifyGrowthOpportunities(spots: MediaSpot[]): RevenueGrowthOpportunity[] {
  const opportunities: RevenueGrowthOpportunity[] = [];
  const summary = calculateRevenueSummary(spots);

  // 1. High-Yield Vacant Spots (Immediate Cash Injection)
  const availableSpots = spots.filter((s) => s.isAvailable);
  const sortedVacantByYield = [...availableSpots].sort((a, b) => b.pricing.oneMonth - a.pricing.oneMonth);
  const topVacant = sortedVacantByYield.slice(0, 3);

  if (topVacant.length > 0) {
    const topVacantMonthly = topVacant.reduce((acc, s) => acc + s.pricing.oneMonth, 0);
    const spotNames = topVacant.map((s) => s.name).join(', ');

    opportunities.push({
      id: 'opp-quick-vacant-fill',
      title: `Monetisasi ${topVacant.length} Titik Prime Kosong Berpendapatan Tertinggi`,
      category: 'QUICK_WIN_VACANT',
      potentialMonthlyUplift: topVacantMonthly,
      annualizedUplift: topVacantMonthly * 12,
      confidence: 'VERY_HIGH',
      priority: 'CRITICAL',
      description: `Terdapat ${topVacant.length} titik reklame prime berkategori premium (${spotNames}) yang saat ini berstatus 'Available'. Mengisi titik ini memberikan akselerasi pendapatan tercepat tanpa biaya konstruksi tambahan.`,
      actionRecommendation: `Prioritaskan pengiriman draf proposal AI ke prospek korporat (otomotif, perbankan, FMCG) untuk mengunci kontrak kuartalan.`,
      relatedSpotIds: topVacant.map((s) => s.id),
      badge: 'Penambahan Instan Terbesar',
      metricLabel: `+${formatCompactIDR(topVacantMonthly)}/bln`,
    });
  }

  // 2. Prime Spot Yield Optimization (Dynamic Pricing on High Traffic & Visibility Spots)
  // Spots with Visibility >= 90 and Traffic >= 100,000 vehicles/day that are currently rented or available
  const primeHighTrafficSpots = spots.filter((s) => s.visibilityScore >= 90 && s.dailyTraffic >= 100000);
  if (primeHighTrafficSpots.length > 0) {
    // A modest 12% price optimization on prime high-traffic spots
    const totalPrimeMonthly = primeHighTrafficSpots.reduce((acc, s) => acc + s.pricing.oneMonth, 0);
    const yieldUplift = Math.round(totalPrimeMonthly * 0.12);

    opportunities.push({
      id: 'opp-yield-premium',
      title: 'Optimalisasi Dynamic Yield (+12%) pada Koridor Super Traffic',
      category: 'PRICING_OPTIMIZATION',
      potentialMonthlyUplift: yieldUplift,
      annualizedUplift: yieldUplift * 12,
      confidence: 'HIGH',
      priority: 'HIGH',
      description: `${primeHighTrafficSpots.length} titik media memiliki skor visibilitas >= 90 dan kepadatan lalu lintas di atas 100.000 kendaraan/hari (CPM efektif sangat kompetitif di bawah Rp 8.000/1k tayang). Kenaikan tarif moderat 12% saat perpanjangan SPK sangat dapat diterima pasar.`,
      actionRecommendation: `Terapkan rate card premium pada siklus renewal kontrak berikutnya dengan menyertakan bukti audit data impresi harian (OTS).`,
      relatedSpotIds: primeHighTrafficSpots.slice(0, 4).map((s) => s.id),
      badge: 'Margin Bertumbuh Tanpa Biaya',
      metricLabel: `+${formatCompactIDR(yieldUplift)}/bln`,
    });
  }

  // 3. Multi-Month Contract Locking (Upsell 1-Bulan ke SPK 6-Bulan / 1-Tahun)
  // Converting short-term single-month rentals into long-term SPK contracts eliminates vacancy downtime
  const monthlyLeaseCount = Math.round(summary.occupiedSpots * 0.5);
  // Average downtime between clients is ~18 days/year if rented monthly vs continuous 1-year contract (saves ~5% vacancy loss)
  const vacancyFrictionSavedMonthly = Math.round(summary.contractedMonthlyRevenue * 0.08);

  opportunities.push({
    id: 'opp-contract-term-upsell',
    title: 'Konversi Sewa Bulanan ke Kontrak Tahunan (Annual Recurring Revenue)',
    category: 'TERM_UPSELL',
    potentialMonthlyUplift: vacancyFrictionSavedMonthly,
    annualizedUplift: vacancyFrictionSavedMonthly * 12,
    confidence: 'HIGH',
    priority: 'HIGH',
    description: `Mengonversi klien sewa 1 bulan menjadi kontrak 6 bulan hingga 1 tahun menghilangkan risiko 'idle gap' (kekosongan visual saat pergantian materi selama 2-3 pekan). Ini menstabilkan arus kas operasional dan menaikkan Net Operating Income.`,
    actionRecommendation: `Berikan insentif pembebasan biaya cetak/pasang (printing & installation bonus) untuk komitmen kontrak minimal 6 bulan.`,
    relatedSpotIds: spots.filter((s) => !s.isAvailable).slice(0, 3).map((s) => s.id),
    badge: 'Stabilitas Arus Kas',
    metricLabel: `+${formatCompactIDR(vacancyFrictionSavedMonthly)}/bln (Efisiensi Kekosongan)`,
  });

  // 4. DOOH Digital Multi-Tenancy (Slot Sharing Monetization)
  const doohSpots = spots.filter((s) => s.category === 'DOOH_DIGITAL');
  if (doohSpots.length > 0) {
    // If DOOH slots are sold as multi-slot packages (e.g. 5 client loops @ 15-20 Jt vs single tenant 60 Jt)
    const doohUplift = Math.round(doohSpots.length * 25000000);

    opportunities.push({
      id: 'opp-dooh-multi-tenancy',
      title: `Monetisasi Multi-Slot DOOH (${doohSpots.length} Layar LED Digital)`,
      category: 'DOOH_DAYPARTING',
      potentialMonthlyUplift: doohUplift,
      annualizedUplift: doohUplift * 12,
      confidence: 'MEDIUM',
      priority: 'STRATEGIC',
      description: `Layar DOOH videotron dapat memuat hingga 8-10 rotasi pengiklan simultan (15 detik/loop). Menjual per-slot waktu (misal slot peak hour sore 16:30-20:00) dapat melipatgandakan penghasilan per layar dibandingkan sistem sewa eksklusif tunggal.`,
      actionRecommendation: `Buka paket 'DOOH Prime Rotation Share' untuk brand UMKM lokal dan event organizer dengan harga terjangkau per slot.`,
      relatedSpotIds: doohSpots.map((s) => s.id),
      badge: 'Inovasi Digital',
      metricLabel: `+${formatCompactIDR(doohUplift)}/bln`,
    });
  }

  // 5. Regional Corridor Expansion
  const regionalBreakdown = calculateCorridorBreakdown(spots);
  const highestUntappedCity = [...regionalBreakdown].sort(
    (a, b) => b.untappedPotentialRevenue - a.untappedPotentialRevenue
  )[0];

  if (highestUntappedCity && highestUntappedCity.untappedPotentialRevenue > 0) {
    opportunities.push({
      id: 'opp-corridor-expansion',
      title: `Penetrasi Maksimal Koridor ${highestUntappedCity.city} (${highestUntappedCity.availableSpots} Titik Kosong)`,
      category: 'CORRIDOR_EXPANSION',
      potentialMonthlyUplift: highestUntappedCity.untappedPotentialRevenue,
      annualizedUplift: highestUntappedCity.untappedPotentialRevenue * 12,
      confidence: 'HIGH',
      priority: 'STRATEGIC',
      description: `Wilayah ${highestUntappedCity.city} memiliki potensi pendapatan tertahan sebesar ${formatIDR(
        highestUntappedCity.untappedPotentialRevenue
      )}/bln dengan tingkat okupansi saat ini ${highestUntappedCity.occupancyPercent}%.`,
      actionRecommendation: `Luncurkan bundel kampanye 'Kuasai Arteri ${highestUntappedCity.city}' dengan potongan harga paket koridor komparatif.`,
      relatedSpotIds: spots.filter((s) => s.city === highestUntappedCity.city && s.isAvailable).map((s) => s.id),
      badge: 'Potensi Wilayah Tertinggi',
      metricLabel: `+${formatCompactIDR(highestUntappedCity.untappedPotentialRevenue)}/bln`,
    });
  }

  return opportunities;
}

/**
 * Calculates geographic revenue distribution by City / Corridor.
 */
export function calculateCorridorBreakdown(spots: MediaSpot[]): CorridorRevenueBreakdown[] {
  const cityMap: { [city: string]: { total: number; occupied: number; currentRev: number; totalCap: number } } = {};

  spots.forEach((s) => {
    const city = s.city || 'Lainnya';
    if (!cityMap[city]) {
      cityMap[city] = { total: 0, occupied: 0, currentRev: 0, totalCap: 0 };
    }
    cityMap[city].total += 1;
    cityMap[city].totalCap += s.pricing.oneMonth || 0;
    if (!s.isAvailable) {
      cityMap[city].occupied += 1;
      cityMap[city].currentRev += s.pricing.oneMonth || 0;
    }
  });

  return Object.entries(cityMap)
    .map(([city, data]) => {
      const available = data.total - data.occupied;
      const untapped = data.totalCap - data.currentRev;
      const occPercent = data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;
      return {
        city,
        totalSpots: data.total,
        occupiedSpots: data.occupied,
        availableSpots: available,
        occupancyPercent: occPercent,
        currentContractedRevenue: data.currentRev,
        untappedPotentialRevenue: untapped,
        totalGrossCapacity: data.totalCap,
      };
    })
    .sort((a, b) => b.totalGrossCapacity - a.totalGrossCapacity);
}

/**
 * Generates formatted WhatsApp text summary of the revenue forecast for executive meetings.
 */
export function generateRevenueForecastWhatsAppText(
  spots: MediaSpot[],
  scenario: ForecastScenario,
  projections: MonthlyProjection[],
  opportunities: RevenueGrowthOpportunity[]
): string {
  const summary = calculateRevenueSummary(spots);
  const topGrowthTotal = opportunities.slice(0, 3).reduce((acc, o) => acc + o.potentialMonthlyUplift, 0);

  const scenarioNames = {
    CONSERVATIVE: 'Konservatif (65% Target)',
    REALISTIC: 'Realistis / Tren Berjalan (80% Target)',
    AGGRESSIVE: 'Agresif / Pertumbuhan Cepat (92% Target)',
    CUSTOM: 'Kustom Terkonfigurasi',
  };

  const lines = [
    `📊 *PROYEKSI PENDAPATAN BULANAN & POTENSI PERTUMBUHAN OOH JABAR*`,
    `🏢 *Suherman Reklame Jawa Barat — Strategic Revenue Forecast*`,
    `📅 Periode: 6 Bulan Mendatang | Skenario: *${scenarioNames[scenario]}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📌 *KONDISI PORTOFOLIO INVENTARIS SAAT INI:*`,
    `• Total Titik Media: ${summary.totalSpots} Titik (${summary.occupiedSpots} Tersewa / ${summary.availableSpots} Tersedia)`,
    `• Rasio Okupansi Saat Ini: *${summary.currentOccupancyRate}%*`,
    `• Pendapatan Terkontrak (MRR): *${formatIDR(summary.contractedMonthlyRevenue)} / Bulan*`,
    `• Potensi Pendapatan Tersedia: *${formatIDR(summary.unrealizedPotentialMonthly)} / Bulan*`,
    `• Kapasitas Maksimal (100%): *${formatIDR(summary.totalCapacityMonthly)} / Bulan*`,
    `• Run-Rate Tahunan Terkontrak: *${formatCompactIDR(summary.annualizedContractedRunRate)} / Tahun*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📈 *PROYEKSI PENDAPATAN 6 BULAN KE DEPAN:*`,
    ...projections.map(
      (p) =>
        `• *${p.monthLabel}*: ${formatIDR(p.totalProjectedRevenue)} (${p.projectedOccupancyRate}% Okupansi) — _${p.seasonalityNote}_`
    ),
    `━━━━━━━━━━━━━━━━━━━━━`,
    `💡 *PELUANG PERTUMBUHAN PENDAPATAN UTAMA:*`,
    `Total Potensi Tambahan Bulanan: *+${formatCompactIDR(topGrowthTotal)} / Bulan*`,
    ...opportunities.slice(0, 3).map(
      (opp, idx) =>
        `${idx + 1}. *${opp.title}*\n   → Estimasi Uplift: *${opp.metricLabel}*\n   → Aksi: ${opp.actionRecommendation}`
    ),
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📲 _Dihasilkan otomatis oleh Revenue Intelligence Platform Suherman Reklame OOH Jawa Barat_`,
    `Kontak Manajemen: 0878-2224-8975 (Suherman)`
  ];

  return lines.join('\n');
}
