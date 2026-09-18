import { PriceTier } from '../types/ooh';

export interface CampaignDurationPricing {
  months: number;
  days: number;
  monthlyRate: number;
  totalPrice: number;
  undiscountedPrice: number;
  savingsAmount: number;
  discountPercentage: number;
  effectiveMonthlyRate: number;
  isDiscounted: boolean;
  tierBadge?: string;
}

/**
 * Calculates campaign price by multiplying the monthly rate by duration (1-12 months),
 * applying a 5% discount for durations over 6 months (> 6 months).
 */
export function calculateCampaignPricing(
  pricing: PriceTier,
  months: number
): CampaignDurationPricing {
  const m = Math.max(1, Math.min(12, Math.round(months)));
  const days = m === 12 ? 365 : m * 30;

  const monthlyRate = pricing.oneMonth || 0;
  const undiscountedPrice = monthlyRate * m;

  // 5% discount applies for durations strictly over 6 months (> 6 months: 7 to 12 months)
  const isDiscounted = m > 6;
  const discountPercentage = isDiscounted ? 5 : 0;
  const savingsAmount = isDiscounted ? Math.round(undiscountedPrice * 0.05) : 0;
  const totalPrice = undiscountedPrice - savingsAmount;
  const effectiveMonthlyRate = Math.round(totalPrice / m);

  let tierBadge: string | undefined = undefined;
  if (isDiscounted) {
    tierBadge = `Diskon 5% Hemat ${m} Bulan`;
  } else if (m === 1) {
    tierBadge = 'Tarif Standar Bulanan';
  } else if (m === 6) {
    tierBadge = 'Paket 6 Bulan';
  }

  return {
    months: m,
    days,
    monthlyRate,
    totalPrice,
    undiscountedPrice,
    savingsAmount,
    discountPercentage,
    effectiveMonthlyRate,
    isDiscounted,
    tierBadge
  };
}

/**
 * Helper to compute quick potential ROI metrics based on OTS and rental cost
 */
export function calculatePotentialRoi(
  dailyImpressions: number,
  days: number,
  totalCost: number,
  conversionRate: number = 0.05, // default 0.05%
  avgOrderValue: number = 350_000 // default Rp 350.000
) {
  const totalImpressions = Math.max(1, dailyImpressions * days);
  const cpm = (totalCost / totalImpressions) * 1_000;
  const costPerView = totalCost / totalImpressions;
  const estimatedConversions = Math.round(totalImpressions * (conversionRate / 100));
  const projectedRevenue = estimatedConversions * avgOrderValue;
  const netProfit = projectedRevenue - totalCost;
  const roiPercentage = totalCost > 0 ? ((projectedRevenue - totalCost) / totalCost) * 100 : 0;
  const breakEvenTransactions = avgOrderValue > 0 ? Math.ceil(totalCost / avgOrderValue) : 0;

  return {
    totalImpressions,
    cpm,
    costPerView,
    estimatedConversions,
    projectedRevenue,
    netProfit,
    roiPercentage,
    breakEvenTransactions
  };
}
