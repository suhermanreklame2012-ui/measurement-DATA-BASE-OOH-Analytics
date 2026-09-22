import { MediaSpot, LocationType } from '../types/ooh';
import { formatCompactNumber, formatIDR, formatCompactIDR } from '../utils/formatters';

export type PlannerDuration = 'oneMonth' | 'threeMonths' | 'sixMonths' | 'oneYear';

export type PlannerOptimizationGoal = 'MAX_OTS' | 'BEST_CPM' | 'BALANCED_CORRIDORS';

export interface PlannerFilterOptions {
  availableOnly: boolean;
  selectedCity: string; // 'ALL' or specific city
  selectedCategory: 'ALL' | 'OOH_STATIC' | 'DOOH_DIGITAL';
  minVisibilityScore: number;
  excludedSpotIds?: string[];
  forcedSpotIds?: string[];
}

export interface SpotPlanItem {
  spot: MediaSpot;
  costForDuration: number;
  periodImpressions: number;
  periodTraffic: number;
  cpm: number; // Cost per 1000 impressions for this duration
  otsSharePercent: number; // % of total package OTS
  budgetSharePercent: number; // % of total package cost
  strategicRole: string;
}

export interface MediaPlanPackage {
  id: string;
  goal: PlannerOptimizationGoal;
  goalTitle: string;
  goalTagline: string;
  goalDescription: string;
  duration: PlannerDuration;
  durationLabel: string;
  durationDays: number;
  budgetLimit: number;
  totalCost: number;
  remainingBudget: number;
  budgetUtilizationPercent: number;
  totalImpressionsOTS: number;
  totalPeriodTraffic: number;
  blendedCpm: number;
  averageVisibilityScore: number;
  corridorSpread: Record<string, number>;
  spots: SpotPlanItem[];
  executiveAssessment: string;
  keyHighlights: string[];
}

export const DURATION_LABELS: Record<PlannerDuration, { label: string; days: number }> = {
  oneMonth: { label: '1 Bulan (30 Hari)', days: 30 },
  threeMonths: { label: '3 Bulan (90 Hari)', days: 90 },
  sixMonths: { label: '6 Bulan (180 Hari)', days: 180 },
  oneYear: { label: '1 Tahun (365 Hari)', days: 365 }
};

/**
 * Returns the cost of a spot for the specified duration.
 */
export function getSpotCostForDuration(spot: MediaSpot, duration: PlannerDuration): number {
  if (!spot.pricing) return 0;
  const cost = spot.pricing[duration];
  if (cost && cost > 0) return cost;
  // Fallbacks if tier is missing
  if (duration === 'threeMonths') return (spot.pricing.oneMonth || 0) * 2.85;
  if (duration === 'sixMonths') return (spot.pricing.oneMonth || 0) * 5.4;
  if (duration === 'oneYear') return (spot.pricing.oneMonth || 0) * 10.2;
  return spot.pricing.oneMonth || 0;
}

/**
 * Computes estimated impressions for the duration.
 */
export function getSpotPeriodImpressions(spot: MediaSpot, duration: PlannerDuration): number {
  const days = DURATION_LABELS[duration].days;
  return spot.dailyImpressions * days;
}

/**
 * Computes estimated traffic for the duration.
 */
export function getSpotPeriodTraffic(spot: MediaSpot, duration: PlannerDuration): number {
  const days = DURATION_LABELS[duration].days;
  return spot.dailyTraffic * days;
}

/**
 * Assigns a contextual strategic role to a spot in the package.
 */
function determineStrategicRole(spot: MediaSpot, isTopTraffic: boolean, isTopVisibility: boolean): string {
  if (isTopTraffic) return 'Jangkar Arus Utama (Traffic Anchor)';
  if (spot.category === 'DOOH_DIGITAL') return 'Dinamis DOOH Flex (Dayparting & Motion)';
  if (spot.locationType === 'Jalur Tol & Arteri') return 'Gerbang Mobilitas Tol & Transit Arteri';
  if (spot.locationType === 'Komersial & Mall') return 'Pusat Retail & Gaya Hidup (Consumer Pull)';
  if (spot.locationType === 'Pusat Kota & Protokol') return 'Pusat Bisnis & Protokol (Prestige & SES A)';
  if (spot.locationType === 'Simpang & Flyover') return 'Persimpangan Lampu Merah (High Dwell Time)';
  if (isTopVisibility) return 'Visibilitas Sudut Pandang Prima (High Recall)';
  return 'Penguat Penetrasi Koridor (Frequency Booster)';
}

/**
 * 0-1 Knapsack branch & bound solver for maximizing value subject to weight <= budget.
 */
interface KnapsackCandidate {
  spot: MediaSpot;
  weight: number; // cost
  value: number; // impressions or efficiency
  periodTraffic: number;
  periodImpressions: number;
  efficiency: number; // value / weight
}

function solveKnapsackOptimal(
  candidates: KnapsackCandidate[],
  budget: number,
  forcedSpotIds: Set<string>
): KnapsackCandidate[] {
  if (candidates.length === 0 || budget <= 0) return [];

  // Separate forced spots first
  const forcedItems: KnapsackCandidate[] = [];
  const pool: KnapsackCandidate[] = [];
  let remainingBudget = budget;

  for (const item of candidates) {
    if (forcedSpotIds.has(item.spot.id)) {
      if (item.weight <= remainingBudget) {
        forcedItems.push(item);
        remainingBudget -= item.weight;
      }
    } else {
      pool.push(item);
    }
  }

  // Filter pool items that exceed remainingBudget
  const validPool = pool.filter((item) => item.weight <= remainingBudget);
  if (validPool.length === 0) {
    return forcedItems;
  }

  // Sort pool by efficiency descending
  validPool.sort((a, b) => b.efficiency - a.efficiency);

  let bestValue = 0;
  let bestSolution: KnapsackCandidate[] = [];
  let steps = 0;
  const MAX_STEPS = 40000;

  function branchAndBound(
    index: number,
    currentWeight: number,
    currentValue: number,
    currentItems: KnapsackCandidate[]
  ) {
    steps++;
    if (steps > MAX_STEPS) return;

    if (currentValue > bestValue) {
      bestValue = currentValue;
      bestSolution = [...currentItems];
    }

    if (index >= validPool.length) return;

    // Calculate upper bound using fractional knapsack
    let boundWeight = currentWeight;
    let boundValue = currentValue;
    for (let i = index; i < validPool.length; i++) {
      const next = validPool[i];
      if (boundWeight + next.weight <= remainingBudget) {
        boundWeight += next.weight;
        boundValue += next.value;
      } else {
        const fraction = (remainingBudget - boundWeight) / next.weight;
        boundValue += next.value * fraction;
        break;
      }
    }

    if (boundValue <= bestValue) return;

    const item = validPool[index];

    // Branch 1: Include item if fits
    if (currentWeight + item.weight <= remainingBudget) {
      currentItems.push(item);
      branchAndBound(index + 1, currentWeight + item.weight, currentValue + item.value, currentItems);
      currentItems.pop();
    }

    // Branch 2: Exclude item
    branchAndBound(index + 1, currentWeight, currentValue, currentItems);
  }

  branchAndBound(0, 0, 0, []);

  return [...forcedItems, ...bestSolution];
}

/**
 * Builds a full MediaPlanPackage from selected spots.
 */
function compilePlanPackage(
  selectedCandidates: KnapsackCandidate[],
  budgetLimit: number,
  duration: PlannerDuration,
  goal: PlannerOptimizationGoal
): MediaPlanPackage {
  const durationInfo = DURATION_LABELS[duration];
  const totalCost = selectedCandidates.reduce((acc, c) => acc + c.weight, 0);
  const remainingBudget = Math.max(0, budgetLimit - totalCost);
  const budgetUtilizationPercent = Number(((totalCost / (budgetLimit || 1)) * 100).toFixed(1));
  const totalImpressionsOTS = selectedCandidates.reduce((acc, c) => acc + c.periodImpressions, 0);
  const totalPeriodTraffic = selectedCandidates.reduce((acc, c) => acc + c.periodTraffic, 0);
  const blendedCpm = totalImpressionsOTS > 0 ? Number(((totalCost / totalImpressionsOTS) * 1000).toFixed(2)) : 0;

  const avgVisibility = selectedCandidates.length > 0
    ? Math.round(selectedCandidates.reduce((acc, c) => acc + c.spot.visibilityScore, 0) / selectedCandidates.length)
    : 0;

  // Corridor spread
  const corridorSpread: Record<string, number> = {};
  selectedCandidates.forEach((c) => {
    const loc = c.spot.locationType;
    corridorSpread[loc] = (corridorSpread[loc] || 0) + 1;
  });

  // Identify highest traffic & highest visibility
  let maxTraffic = 0;
  let maxVis = 0;
  selectedCandidates.forEach((c) => {
    if (c.spot.dailyTraffic > maxTraffic) maxTraffic = c.spot.dailyTraffic;
    if (c.spot.visibilityScore > maxVis) maxVis = c.spot.visibilityScore;
  });

  const spotPlanItems: SpotPlanItem[] = selectedCandidates.map((c) => {
    const otsShare = totalImpressionsOTS > 0 ? Number(((c.periodImpressions / totalImpressionsOTS) * 100).toFixed(1)) : 0;
    const costShare = totalCost > 0 ? Number(((c.weight / totalCost) * 100).toFixed(1)) : 0;
    const cpm = c.periodImpressions > 0 ? Number(((c.weight / c.periodImpressions) * 1000).toFixed(2)) : 0;
    const role = determineStrategicRole(c.spot, c.spot.dailyTraffic === maxTraffic, c.spot.visibilityScore === maxVis);

    return {
      spot: c.spot,
      costForDuration: c.weight,
      periodImpressions: c.periodImpressions,
      periodTraffic: c.periodTraffic,
      cpm,
      otsSharePercent: otsShare,
      budgetSharePercent: costShare,
      strategicRole: role
    };
  });

  // Sort spots by cost descending
  spotPlanItems.sort((a, b) => b.costForDuration - a.costForDuration);

  // Goal descriptive details
  let goalTitle = 'Paket Maksimal Impresi (Max Reach & OTS)';
  let goalTagline = 'Kombinasi Rekomendasi Terbanyak Dilihat';
  let goalDescription = 'Algoritma memaksimalkan akumulasi total OTS (Opportunities to See) agar setiap rupiah menghasilkan jangkauan audiens mata terbanyak.';

  if (goal === 'BEST_CPM') {
    goalTitle = 'Paket Efisiensi Biaya (Lowest Blended CPM)';
    goalTagline = 'Efisiensi Biaya per 1.000 Paparan Terbaik';
    goalDescription = 'Mengutamakan titik dengan rasio impresi per rupiah tertinggi untuk menekan ongkos CPM sekecil mungkin.';
  } else if (goal === 'BALANCED_CORRIDORS') {
    goalTitle = 'Paket Dominasi Multi-Koridor (Spatial Diversity)';
    goalTagline = 'Sebaran Seimbang Tol, Pusat Kota & Komersial';
    goalDescription = 'Memastikan materi iklan menjangkau beragam segmen (komuter tol, eksekutif perkantoran, dan pengunjung pusat perbelanjaan) secara merata.';
  }

  // Generate Executive Assessment & Highlights
  const count = selectedCandidates.length;
  const formatCost = formatIDR(totalCost);
  const formatBudget = formatIDR(budgetLimit);
  const formatOts = formatCompactNumber(totalImpressionsOTS);
  const formatTraffic = formatCompactNumber(totalPeriodTraffic);

  const topCorridorsList = Object.entries(corridorSpread)
    .sort((a, b) => b[1] - a[1])
    .map(([loc, cnt]) => `${loc} (${cnt} titik)`)
    .join(', ');

  const executiveAssessment = `Dengan pagu anggaran ${formatBudget} untuk durasi ${durationInfo.label}, algoritma menyusun kombinasi ${count} titik media terpilih dengan total serapan ${formatCost} (${budgetUtilizationPercent}% budget terpakai, sisa ${formatIDR(remainingBudget)}). Paket ini memproyeksikan ${formatOts} impresi OTS dengan paparan terhadap ${formatTraffic} arus kendaraan di koridor strategis ${topCorridorsList || 'Jawa Barat'}, menghasilkan blended CPM yang sangat kompetitif sebesar ${formatIDR(blendedCpm)} per 1.000 impresi.`;

  const keyHighlights = [
    `Pemanfaatan Anggaran ${budgetUtilizationPercent}% (${formatCost} dari plafon ${formatBudget})`,
    `Total Impresi Terproyeksi: ${formatOts} OTS selama ${durationInfo.label}`,
    `Blended CPM Efisien: ${formatIDR(blendedCpm)} / 1.000 views (Rata-rata Skor Visibilitas: ${avgVisibility}/100)`,
    `Sebaran Koridor: Menjangkau ${Object.keys(corridorSpread).length} tipe zona lalu lintas (${topCorridorsList})`
  ];

  return {
    id: `plan-${goal.toLowerCase()}-${duration}-${Date.now()}`,
    goal,
    goalTitle,
    goalTagline,
    goalDescription,
    duration,
    durationLabel: durationInfo.label,
    durationDays: durationInfo.days,
    budgetLimit,
    totalCost,
    remainingBudget,
    budgetUtilizationPercent,
    totalImpressionsOTS,
    totalPeriodTraffic,
    blendedCpm,
    averageVisibilityScore: avgVisibility,
    corridorSpread,
    spots: spotPlanItems,
    executiveAssessment,
    keyHighlights
  };
}

/**
 * Main Strategic Media Planner computation engine.
 * Generates 3 strategic plan packages for the given budget, duration, and constraints.
 */
export function generateStrategicMediaPlans(
  spots: MediaSpot[],
  budget: number,
  duration: PlannerDuration,
  options: PlannerFilterOptions
): {
  maxOtsPlan: MediaPlanPackage;
  bestCpmPlan: MediaPlanPackage;
  balancedPlan: MediaPlanPackage;
  allAvailableCandidatesCount: number;
} {
  const excludedSet = new Set(options.excludedSpotIds || []);
  const forcedSet = new Set(options.forcedSpotIds || []);

  // 1. Filter candidates
  const filtered = spots.filter((spot) => {
    if (excludedSet.has(spot.id)) return false;
    if (options.availableOnly && !spot.isAvailable && !forcedSet.has(spot.id)) return false;
    if (options.selectedCity !== 'ALL' && spot.city !== options.selectedCity) return false;
    if (options.selectedCategory !== 'ALL' && spot.category !== options.selectedCategory) return false;
    if (spot.visibilityScore < options.minVisibilityScore && !forcedSet.has(spot.id)) return false;
    return true;
  });

  // 2. Prepare candidates with costs and impressions for this duration
  const baseCandidates: KnapsackCandidate[] = filtered.map((spot) => {
    const cost = getSpotCostForDuration(spot, duration);
    const periodImpressions = getSpotPeriodImpressions(spot, duration);
    const periodTraffic = getSpotPeriodTraffic(spot, duration);
    const efficiency = cost > 0 ? periodImpressions / cost : 0;

    return {
      spot,
      weight: cost,
      value: periodImpressions,
      periodTraffic,
      periodImpressions,
      efficiency
    };
  }).filter((c) => c.weight > 0);

  // PLAN 1: MAX OTS (Value = periodImpressions)
  const maxOtsCandidates = solveKnapsackOptimal(baseCandidates, budget, forcedSet);
  const maxOtsPlan = compilePlanPackage(maxOtsCandidates, budget, duration, 'MAX_OTS');

  // PLAN 2: BEST CPM (Value adjusted with efficiency weight to favor lower CPM)
  const cpmCandidatesPool: KnapsackCandidate[] = baseCandidates.map((c) => {
    // CPM inverse bonus
    const cpm = (c.weight / (c.periodImpressions || 1)) * 1000;
    const efficiencyFactor = Math.max(1, 200 - cpm); // higher is better
    return {
      ...c,
      value: c.periodImpressions * (1 + efficiencyFactor / 100),
      efficiency: (c.periodImpressions * (1 + efficiencyFactor / 100)) / (c.weight || 1)
    };
  });
  const bestCpmCandidates = solveKnapsackOptimal(cpmCandidatesPool, budget, forcedSet);
  const bestCpmPlan = compilePlanPackage(bestCpmCandidates, budget, duration, 'BEST_CPM');

  // PLAN 3: BALANCED CORRIDORS (Diversified across location types)
  const corridorGroups: Record<string, KnapsackCandidate[]> = {};
  baseCandidates.forEach((c) => {
    const loc = c.spot.locationType;
    if (!corridorGroups[loc]) corridorGroups[loc] = [];
    corridorGroups[loc].push(c);
  });

  // Pick top OTS item from each distinct corridor first if budget allows
  const balancedSelection: KnapsackCandidate[] = [];
  const balancedPickedIds = new Set<string>();
  let balancedCurrentCost = 0;

  // Include forced spots first
  baseCandidates.forEach((c) => {
    if (forcedSet.has(c.spot.id) && balancedCurrentCost + c.weight <= budget) {
      balancedSelection.push(c);
      balancedPickedIds.add(c.spot.id);
      balancedCurrentCost += c.weight;
    }
  });

  // Sort each corridor group by OTS descending
  Object.values(corridorGroups).forEach((group) => {
    group.sort((a, b) => b.value - a.value);
  });

  // Round-robin pick from each corridor
  const corridorKeys = Object.keys(corridorGroups);
  let pickedInRound = true;
  let round = 0;
  while (pickedInRound && round < 3) {
    pickedInRound = false;
    for (const key of corridorKeys) {
      const group = corridorGroups[key];
      const candidate = group[round];
      if (candidate && !balancedPickedIds.has(candidate.spot.id)) {
        if (balancedCurrentCost + candidate.weight <= budget) {
          balancedSelection.push(candidate);
          balancedPickedIds.add(candidate.spot.id);
          balancedCurrentCost += candidate.weight;
          pickedInRound = true;
        }
      }
    }
    round++;
  }

  // Fill remaining budget with highest OTS candidates from remaining pool
  const remainingPool = baseCandidates.filter((c) => !balancedPickedIds.has(c.spot.id));
  const remainingBudgetForBalanced = budget - balancedCurrentCost;
  if (remainingBudgetForBalanced > 0 && remainingPool.length > 0) {
    const additional = solveKnapsackOptimal(remainingPool, remainingBudgetForBalanced, new Set());
    additional.forEach((item) => {
      balancedSelection.push(item);
    });
  }

  const balancedPlan = compilePlanPackage(balancedSelection, budget, duration, 'BALANCED_CORRIDORS');

  return {
    maxOtsPlan,
    bestCpmPlan,
    balancedPlan,
    allAvailableCandidatesCount: filtered.length
  };
}
