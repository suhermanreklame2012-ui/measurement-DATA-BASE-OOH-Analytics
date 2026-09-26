/**
 * Analytics Data Sources & Calculation Accuracy Metadata
 * 
 * Provides official source attribution, calculation methodology, 
 * audit timestamp, and accuracy percentages for OOH / DOOH media analytics.
 */

export interface MetricSourceInfo {
  key: 'traffic' | 'impressions' | 'visibility' | 'demographics' | 'roi_cpm';
  name: string;
  shortName: string;
  source: string;
  accuracyPercentage: number; // e.g. 94.2
  marginOfError: string; // e.g. "±5.8%"
  methodology: string;
  auditPeriod: string;
  regulatoryStandard: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
}

export const ANALYTICS_METRICS_SOURCES: Record<MetricSourceInfo['key'], MetricSourceInfo> = {
  traffic: {
    key: 'traffic',
    name: 'Volume Trafik Kendaraan Harian (Daily Traffic)',
    shortName: 'Trafik Kendaraan',
    source: 'Dinas Perhubungan (Dishub) Jawa Barat & Pemkot Bandung + Google Traffic Flow & HERE Mobility Matrix API',
    accuracyPercentage: 94.2,
    marginOfError: '±5.8%',
    methodology: 'Data dikumpulkan melalui sensor pencacah lalu lintas otomatis (Automatic Traffic Counting Sensors) di koridor jalan arteri dan protokol utama, dikombinasikan dengan pemodelan kecepatan laju real-time GPS saat jam sibuk (07.00–09.30 & 16.30–19.30 WIB).',
    auditPeriod: 'Q1 2026 (Sinkronisasi Berkala Tiap Bulan)',
    regulatoryStandard: 'Pedoman Survei Pencacahan Lalu Lintas Ditjen Hubdat & SNI 19-6487-2000',
    badgeColor: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-400/40'
    }
  },
  impressions: {
    key: 'impressions',
    name: 'Estimasi Paparan Impresi (Opportunity to See - OTS)',
    shortName: 'Impresi (OTS)',
    source: 'Formula Standar ESOMAR & World Out of Home Organization (WOO) + Indeks Okupansi Kendaraan BPS Jawa Barat',
    accuracyPercentage: 91.8,
    marginOfError: '±8.2%',
    methodology: 'Dihitung dengan mengalikan volume kendaraan harian dengan rasio okupansi rata-rata penumpang Jawa Barat (1.4 penumpang/sepeda motor, 2.2 penumpang/mobil pribadi, 14.5 penumpang/angkutan umum & bus), disesuaikan dengan sudut kerucut pandang (viewing cone 45°) dan dwell-time perlambatan persimpangan.',
    auditPeriod: 'Maret 2026',
    regulatoryStandard: 'WOO Global OOH Audience Measurement Standard & ESOMAR OOH Best Practices',
    badgeColor: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-400/40'
    }
  },
  visibility: {
    key: 'visibility',
    name: 'Skor Kualitas Visibilitas (Visibility Score / 100)',
    shortName: 'Skor Visibilitas',
    source: 'Audit Lapangan Tim Geospasial Fisik & Pemetaan OpenStreetMap GIS',
    accuracyPercentage: 96.5,
    marginOfError: '±3.5%',
    methodology: 'Penilaian lapangan langsung mengevaluasi 5 parameter utama: Jarak bebas halangan pandang (Obstacle-Free Viewing Distance > 150m), orientasi terhadap jalur pandang kemudi (Tegak Lurus vs Paralel), elevasi konstruksi reklame, intensitas iluminasi lampu malam, dan waktu keterlihatan efektif pengendara.',
    auditPeriod: 'Februari 2026 (Verifikasi Fisik Berkala)',
    regulatoryStandard: 'Peraturan Daerah Bangunan Gedung & Reklame Komersial Jawa Barat',
    badgeColor: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-400/40'
    }
  },
  demographics: {
    key: 'demographics',
    name: 'Profil Demografi Audiens & Status Sosial Ekonomi (SES)',
    shortName: 'Profil Demografi & SES',
    source: 'Badan Pusat Statistik (BPS) Sensus Penduduk & Susenas Jawa Barat + Zonasi Rencana Tata Ruang Wilayah (RTRW)',
    accuracyPercentage: 89.5,
    marginOfError: '±10.5%',
    methodology: 'Pemodelan agregasi komuter berdasarkan karakter zona koridor (Pusat Perbelanjaan & Komersial, Kawasan Perkantoran & Protokol, Kampus & Pendidikan, Jalur Antarkota & Tol). Menghasilkan estimasi pembagian SES A, B, C, serta kelompok usia dominan.',
    auditPeriod: 'Tahunan 2025/2026',
    regulatoryStandard: 'BPS Susenas (Survei Sosial Ekonomi Nasional) Klasifikasi Pengeluaran Bulanan',
    badgeColor: {
      bg: 'bg-purple-500/15',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-400/40'
    }
  },
  roi_cpm: {
    key: 'roi_cpm',
    name: 'Efisiensi Biaya CPM (Cost Per Mille) & Kalkulasi ROI',
    shortName: 'Efisiensi Biaya (CPM / ROI)',
    source: 'Asosiasi Perusahaan Reklame Indonesia (AMRI/PPPI) & Indeks Tarif Riil Pasar OOH Jawa Barat',
    accuracyPercentage: 95.0,
    marginOfError: '±5.0%',
    methodology: 'Kalkulasi matematis langsung dari tarif sewa kontrak terhadap total akumulasi paparan OTS bulanan `(Tarif Sewa / Total OTS) × 1.000`, menghasilkan biaya riil pengiklan per 1.000 pasang mata audiens.',
    auditPeriod: 'Q1 2026',
    regulatoryStandard: 'Standar Transparansi Pembelian Media Periklanan Indonesia (P3I)',
    badgeColor: {
      bg: 'bg-teal-500/15',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-400/40'
    }
  }
};

/**
 * Returns overall average analytics confidence score across all metrics.
 */
export function getOverallAnalyticsAccuracy(): {
  overallAccuracy: number;
  averageMarginOfError: string;
  sourceCount: number;
} {
  const metrics = Object.values(ANALYTICS_METRICS_SOURCES);
  const total = metrics.reduce((sum, item) => sum + item.accuracyPercentage, 0);
  const overallAccuracy = Number((total / metrics.length).toFixed(1));

  return {
    overallAccuracy,
    averageMarginOfError: `±${(100 - overallAccuracy).toFixed(1)}%`,
    sourceCount: metrics.length
  };
}
