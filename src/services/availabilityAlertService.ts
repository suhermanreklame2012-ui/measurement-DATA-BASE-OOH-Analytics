import { MediaSpot } from '../types/ooh';
import { addNotification } from './storageService';

export interface AvailabilityAlertItem {
  id: string;
  spotId: string;
  spotName: string;
  roadName: string;
  city: string;
  mediaType: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  company?: string;
  targetDuration: string; // '1 Bulan' | '3 Bulan' | '6 Bulan' | '1 Tahun'
  preferredMonth: string; // e.g. "Segera saat kosong", "Bulan depan", dll.
  notes?: string;
  isCurrentlyBooked: boolean;
  status: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'ARCHIVED';
  createdAt: string; // ISO date string
}

const STORAGE_QUEUE_KEY = 'ooh_availability_alerts_mock_queue_v1';

// Initial seed data so admins immediately see demand metrics on key booked spots
const INITIAL_MOCK_QUEUE: AvailabilityAlertItem[] = [
  {
    id: 'alert_seed_1',
    spotId: 'BDG-01',
    spotName: 'Pasteur Gateway Billboard Frontlite',
    roadName: 'Jl. Dr. Djunjunan (Pasteur) No. 128',
    city: 'Kota Bandung',
    mediaType: 'Billboard Frontlite',
    userName: 'Bpk. Hendra Gunawan',
    userEmail: 'hendra.gunawan@fintechindonesia.co.id',
    userPhone: '081220988711',
    company: 'Fintech Maju Bersama',
    targetDuration: '6 Bulan',
    preferredMonth: 'Segera saat kontrak habis',
    notes: 'Prioritas utama untuk kampanye kuartal baru, tolong kontak pertama kali saat slot kosong.',
    isCurrentlyBooked: true,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'alert_seed_2',
    spotId: 'BDG-01',
    spotName: 'Pasteur Gateway Billboard Frontlite',
    roadName: 'Jl. Dr. Djunjunan (Pasteur) No. 128',
    city: 'Kota Bandung',
    mediaType: 'Billboard Frontlite',
    userName: 'Ibu Ratna Paramita',
    userEmail: 'ratna.p@djarumgroup.com',
    userPhone: '081399881244',
    company: 'Retail & Beverage Brand',
    targetDuration: '1 Tahun',
    preferredMonth: 'Mulai Q3 / Akhir Tahun',
    notes: 'Anggaran sudah disetujui, siap SPK langsung jika tersedia.',
    isCurrentlyBooked: true,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'alert_seed_3',
    spotId: 'BDG-03',
    spotName: 'Dago Flyover Pasupati DOOH Videotron',
    roadName: 'Jl. Ir. H. Juanda (Dago) Simpang Cikapayang',
    city: 'Kota Bandung',
    mediaType: 'LED Videotron',
    userName: 'Dimas Satria',
    userEmail: 'dimas.satria@automotive-jabar.id',
    userPhone: '081122334455',
    company: 'Dealer Otomotif Jawa Barat',
    targetDuration: '3 Bulan',
    preferredMonth: 'Segera saat tersedia',
    notes: 'Butuh slot tayang DOOH videotron Pasupati untuk peluncuran unit SUV baru.',
    isCurrentlyBooked: true,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'alert_seed_4',
    spotId: 'BDG-10',
    spotName: 'Paris Van Java Sukajadi Billboard',
    roadName: 'Jl. Sukajadi No. 137',
    city: 'Kota Bandung',
    mediaType: 'Billboard Frontlite',
    userName: 'dr. Melissa Santoso',
    userEmail: 'melissa@aestheticlinic.id',
    userPhone: '08170099881',
    company: 'Klinik Estetika & Skincare',
    targetDuration: '1 Tahun',
    preferredMonth: 'Bulan Depan',
    notes: 'Mencari titik strategis koridor PVJ Sukajadi untuk promosi klinik kecantikan cabang Bandung.',
    isCurrentlyBooked: true,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
  },
  {
    id: 'alert_seed_5',
    spotId: 'BDG-05',
    spotName: 'R.E. Martadinata (Riau) Premium Billboard',
    roadName: 'Jl. R.E. Martadinata No. 56',
    city: 'Kota Bandung',
    mediaType: 'Billboard Frontlite',
    userName: 'Budi Santoso',
    userEmail: 'budi.santoso@apparelretail.co.id',
    userPhone: '0818223311',
    company: 'Factory Outlet & Lifestyle Retail',
    targetDuration: '3 Bulan',
    preferredMonth: 'Segera',
    notes: 'Ingin promosi akhir tahun di Jalan Riau.',
    isCurrentlyBooked: false,
    status: 'CONTACTED',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
  }
];

export function getAvailabilityAlertsQueue(): AvailabilityAlertItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(INITIAL_MOCK_QUEUE));
      return INITIAL_MOCK_QUEUE;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(INITIAL_MOCK_QUEUE));
      return INITIAL_MOCK_QUEUE;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to parse availability alerts queue from localStorage:', err);
    return INITIAL_MOCK_QUEUE;
  }
}

export function saveAvailabilityAlertsQueue(queue: AvailabilityAlertItem[]): void {
  try {
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('ooh_availability_alert_updated', { detail: queue }));
  } catch (err) {
    console.error('Failed to save availability alerts queue:', err);
  }
}

export function getAlertsForSpot(spotId: string): AvailabilityAlertItem[] {
  const queue = getAvailabilityAlertsQueue();
  return queue.filter(item => item.spotId === spotId && item.status !== 'ARCHIVED');
}

export function getDemandCountForSpot(spotId: string): number {
  const alerts = getAlertsForSpot(spotId);
  return alerts.length;
}

export function addAvailabilityAlert(
  data: Omit<AvailabilityAlertItem, 'id' | 'createdAt' | 'status'>
): AvailabilityAlertItem {
  const queue = getAvailabilityAlertsQueue();
  const newItem: AvailabilityAlertItem = {
    ...data,
    id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
    status: 'PENDING'
  };

  const updatedQueue = [newItem, ...queue];
  saveAvailabilityAlertsQueue(updatedQueue);

  // Trigger system notification
  addNotification({
    title: 'Peminat Baru di Antrean Ketersediaan',
    message: `${newItem.userName}${newItem.company ? ` (${newItem.company})` : ''} mendaftar notifikasi ketersediaan untuk "${newItem.spotName}".`,
    type: 'create'
  });

  window.dispatchEvent(new CustomEvent('ooh_availability_alert_added', { detail: newItem }));

  return newItem;
}

export function updateAlertStatus(id: string, status: AvailabilityAlertItem['status']): void {
  const queue = getAvailabilityAlertsQueue();
  const updated = queue.map(item => item.id === id ? { ...item, status } : item);
  saveAvailabilityAlertsQueue(updated);
}

export function deleteAlert(id: string): void {
  const queue = getAvailabilityAlertsQueue();
  const updated = queue.filter(item => item.id !== id);
  saveAvailabilityAlertsQueue(updated);
}

export interface SpotDemandSummary {
  spot: MediaSpot;
  demandCount: number;
  activeAlerts: AvailabilityAlertItem[];
  isBooked: boolean;
  totalPotentialValue: number;
}

export interface HighDemandMetrics {
  totalQueueCount: number;
  pendingCount: number;
  contactedCount: number;
  convertedCount: number;
  totalBookedWithDemand: number;
  bookedDemandRanking: SpotDemandSummary[];
  allSpotsDemandRanking: SpotDemandSummary[];
  demandMapBySpotId: Record<string, number>;
}

export function calculateDemandMetrics(spots: MediaSpot[]): HighDemandMetrics {
  const queue = getAvailabilityAlertsQueue();
  const activeQueue = queue.filter(q => q.status !== 'ARCHIVED');

  const demandMap: Record<string, AvailabilityAlertItem[]> = {};
  const demandCountMap: Record<string, number> = {};

  activeQueue.forEach(item => {
    if (!demandMap[item.spotId]) {
      demandMap[item.spotId] = [];
    }
    demandMap[item.spotId].push(item);
    demandCountMap[item.spotId] = (demandCountMap[item.spotId] || 0) + 1;
  });

  const spotsSummary: SpotDemandSummary[] = spots.map(spot => {
    const alerts = demandMap[spot.id] || [];
    const isBooked = !spot.isAvailable;
    
    // Estimate potential value based on 1 month or stated duration
    const potentialValue = alerts.reduce((acc, curr) => {
      let months = 1;
      if (curr.targetDuration === '3 Bulan') months = 3;
      else if (curr.targetDuration === '6 Bulan') months = 6;
      else if (curr.targetDuration === '1 Tahun') months = 12;
      return acc + (spot.pricing.oneMonth * months);
    }, 0);

    return {
      spot,
      demandCount: alerts.length,
      activeAlerts: alerts,
      isBooked,
      totalPotentialValue: potentialValue
    };
  });

  const allSpotsDemandRanking = [...spotsSummary]
    .filter(s => s.demandCount > 0)
    .sort((a, b) => b.demandCount - a.demandCount || b.spot.dailyImpressions - a.spot.dailyImpressions);

  const bookedDemandRanking = allSpotsDemandRanking
    .filter(s => s.isBooked);

  return {
    totalQueueCount: activeQueue.length,
    pendingCount: activeQueue.filter(q => q.status === 'PENDING').length,
    contactedCount: activeQueue.filter(q => q.status === 'CONTACTED').length,
    convertedCount: activeQueue.filter(q => q.status === 'CONVERTED').length,
    totalBookedWithDemand: bookedDemandRanking.length,
    bookedDemandRanking,
    allSpotsDemandRanking,
    demandMapBySpotId: demandCountMap
  };
}
