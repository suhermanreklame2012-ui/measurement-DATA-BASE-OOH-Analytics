export type MediaCategory = 'OOH_STATIC' | 'DOOH_DIGITAL';

export type MediaType = 
  | 'Billboard Frontlite'
  | 'Billboard Backlite'
  | 'Bando Frontlite'
  | 'JPO Frontlite'
  | 'JPO Backlite'
  | 'LED Videotron'
  | 'LED BANDO'
  | 'LED Pylon Berbaris'
  | 'LED Single Pole';

export type LocationType =
  | 'Komersial & Mall'
  | 'Pusat Kota & Protokol'
  | 'Jalur Tol & Arteri'
  | 'Pendidikan & Kampus'
  | 'Simpang & Flyover'
  | 'Transport Hub & Stasiun';

export type TrafficDensity = 'Sangat Padat' | 'Padat' | 'Sedang' | 'Lancar';

export type OrientationLayout = 'Horizontal' | 'Vertical';

export interface PriceTier {
  oneMonth: number;
  threeMonths: number;
  sixMonths: number;
  oneYear: number;
}

export interface MediaSpot {
  id: string;
  no: number;
  name: string;
  roadName: string;
  city: string; // Kota Bandung, Cimahi, Kab. Bandung Barat, Garut, etc.
  district: string; // Kecamatan
  category: MediaCategory;
  mediaType: MediaType;
  size: string; // e.g. "5 m x 10 m"
  layout: OrientationLayout;
  availability: string; // Available, SOLD OUT, Available Maret 2026, etc.
  isAvailable: boolean;
  pricing: PriceTier;
  locationType: LocationType;
  trafficDensity: TrafficDensity;
  dailyTraffic: number; // estimated vehicles / day (motorcycles + cars + buses)
  dailyImpressions: number; // calculated OTS (Opportunity to See) impressions
  visibilityScore: number; // 70 - 99 score based on angle, speed, distance
  coordinates: {
    lat: number;
    lng: number;
  };
  lighting?: 'Frontlite' | 'Backlite' | 'LED Digital';
  loopDurationSec?: number; // for DOOH e.g. 15 sec per slot
  spotsPerDay?: number; // for DOOH e.g. 540 spots / day
  updatedAt: string;
  notes?: string;
  ownerEmail?: string; // e.g. suherman.reklame2012@gmail.com
  imageUrl?: string; // Foto lokasi/konstruksi
}

export interface NotificationLog {
  id: string;
  title: string;
  message: string;
  type: 'upload' | 'sync' | 'create' | 'update' | 'system' | 'delete';
  timestamp: string;
  read: boolean;
  itemCount?: number;
}

export interface FilterState {
  search: string;
  city: string; // 'All' or specific city
  category: 'ALL' | 'OOH_STATIC' | 'DOOH_DIGITAL';
  locationTypes: LocationType[];
  trafficDensities: TrafficDensity[];
  mediaTypes: string[];
  availability: 'ALL' | 'AVAILABLE' | 'SOLD_OUT';
  minTraffic: number;
  minPrice: number;
  maxPrice: number;
}

export interface GoogleSheetsSyncConfig {
  sheetUrl: string;
  autoSyncIntervalMinutes: number;
  lastSyncTime: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

export interface ClientContact {
  id: string;
  name: string; // e.g. "Bpk. Hendra Wijaya"
  company: string; // e.g. "PT Daya Adicipta Motora (Honda Jabar)"
  role?: string; // e.g. "Marketing Director"
  phone: string; // e.g. "08122001928"
  email: string; // e.g. "hendra.wijaya@dam.co.id"
  category: string; // Otomotif, FMCG, Finansial & Perbankan, Properti, Retail & F&B, dll.
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastProposalAt?: string;
  proposalsSentCount?: number;
  ownerEmail?: string; // e.g. suherman.reklame2012@gmail.com
}

export type ProposalDuration = '1 Bulan' | '3 Bulan' | '6 Bulan' | '1 Tahun';
export type ProposalTone = 'formal' | 'persuasive' | 'direct';

export interface ProposalDraft {
  emailSubject: string;
  emailBody: string;
  whatsappText: string;
  keyHighlights: string[];
  estimatedReachSummary: string;
  totalMonthlyPrice: number;
  totalSpotsCount: number;
  generatedAt: string;
}
