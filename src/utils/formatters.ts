export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString('id-ID');
}

export function parseRupiahString(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

export function formatCompactIDR(amount: number): string {
  if (amount === 0) return 'Rp 0';
  if (amount >= 1_000_000_000) {
    const num = amount / 1_000_000_000;
    return `Rp ${num % 1 === 0 ? num : num.toFixed(1)} M`;
  }
  if (amount >= 1_000_000) {
    const num = amount / 1_000_000;
    return `Rp ${num % 1 === 0 ? num : num.toFixed(1)} Jt`;
  }
  return formatIDR(amount);
}
