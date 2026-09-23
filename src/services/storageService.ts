import { MediaSpot, NotificationLog } from '../types/ooh';
import { INITIAL_SPOTS } from '../data/spotsData';
import { parseRupiahString } from '../utils/formatters';

const STORAGE_KEY = 'ooh_dooh_spots_v1';
const NOTIFICATIONS_KEY = 'ooh_dooh_notifications_v1';
export const APP_OWNER_EMAIL = 'suherman.reklame2012@gmail.com';

export function getStoredSpots(): MediaSpot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const seeded = INITIAL_SPOTS.map(s => ({ ...s, ownerEmail: APP_OWNER_EMAIL }));
      saveStoredSpots(seeded);
      return seeded;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = INITIAL_SPOTS.map(s => ({ ...s, ownerEmail: APP_OWNER_EMAIL }));
      saveStoredSpots(seeded);
      return seeded;
    }

    // Auto-heal: check if BDG-02 is missing from old cached data
    let currentList = parsed as MediaSpot[];
    const hasBdg02 = currentList.some(s => s.id === 'BDG-02');
    if (!hasBdg02) {
      const bdg02Initial = INITIAL_SPOTS.find(s => s.id === 'BDG-02');
      if (bdg02Initial) {
        currentList = [bdg02Initial, ...currentList];
      }
    }

    // Auto-heal sequence numbers if duplicate 'no' exists
    const seenNos = new Set<number>();
    let hasDuplicateNo = false;
    currentList.forEach(s => {
      if (typeof s.no === 'number') {
        if (seenNos.has(s.no)) hasDuplicateNo = true;
        seenNos.add(s.no);
      } else {
        hasDuplicateNo = true;
      }
    });

    if (hasDuplicateNo || !hasBdg02) {
      // Sort and re-sequence 1..N
      currentList.sort((a, b) => (a.no || 0) - (b.no || 0) || String(a.id).localeCompare(String(b.id)));
      currentList = currentList.map((spot, idx) => ({
        ...spot,
        no: idx + 1,
        ownerEmail: spot.ownerEmail || APP_OWNER_EMAIL
      }));
      saveStoredSpots(currentList);
    }

    return currentList.map(s => ({
      ...s,
      ownerEmail: s.ownerEmail || APP_OWNER_EMAIL
    }));
  } catch (err) {
    console.warn('Using initial fallback spots as storage read was unavailable');
    return INITIAL_SPOTS.map(s => ({ ...s, ownerEmail: APP_OWNER_EMAIL }));
  }
}

export function saveStoredSpots(spots: MediaSpot[]): void {
  try {
    const enriched = spots.map(s => ({
      ...s,
      ownerEmail: s.ownerEmail || APP_OWNER_EMAIL
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  } catch (err) {
    console.warn('LocalStorage save skipped or unavailable:', err);
  }
}

export function deleteSpotFromStorage(spotId: string): MediaSpot[] {
  const current = getStoredSpots();
  const filtered = current.filter(s => s.id !== spotId);
  saveStoredSpots(filtered);
  return filtered;
}

export function resetToInitialSpots(): MediaSpot[] {
  saveStoredSpots(INITIAL_SPOTS);
  addNotification({
    title: 'Database Direset',
    message: `Database berhasil dikembalikan ke dataset awal (${INITIAL_SPOTS.length} titik).`,
    type: 'system'
  });
  return INITIAL_SPOTS;
}

export function getStoredNotifications(): NotificationLog[] {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) {
      const initialLogs: NotificationLog[] = [
        {
          id: 'notif-1',
          title: 'Database Siap Digunakan',
          message: 'Basis data OOH & DOOH Kota Bandung dan Jawa Barat aktif dengan 70+ titik inventaris.',
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(data);
  } catch (err) {
    console.warn('Notification storage load fallback triggered');
    return [];
  }
}

export function addNotification(notif: Omit<NotificationLog, 'id' | 'timestamp' | 'read'>): NotificationLog {
  const newNotif: NotificationLog = {
    ...notif,
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    read: false
  };

  try {
    const current = getStoredNotifications();
    const updated = [newNotif, ...current].slice(0, 50); // keep last 50
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ooh_notification_added', { detail: newNotif }));
  } catch (e) {
    console.warn('Failed to dispatch notification event:', e);
  }

  return newNotif;
}

export function markNotificationsAsRead(): void {
  try {
    const current = getStoredNotifications();
    const updated = current.map((n) => ({ ...n, read: true }));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ooh_notification_updated'));
  } catch (e) {
    console.warn('Failed to mark notifications read:', e);
  }
}

// Convert spots into CSV format compatible with Google Sheets & Microsoft Excel for offline reporting
export function exportSpotsToCSV(spots: MediaSpot[]): string {
  const headers = [
    'NO',
    'ID TITIK',
    'NAMA LOKASI',
    'NAMA JALAN',
    'KOTA / KABUPATEN',
    'KECAMATAN',
    'KATEGORI',
    'JENIS MEDIA',
    'UKURAN',
    'LAYOUT',
    'PENCAHAYAAN',
    'STATUS KETERSEDIAAN',
    'TARIF 1 BULAN (IDR)',
    'TARIF 3 BULAN (IDR)',
    'TARIF 6 BULAN (IDR)',
    'TARIF 1 TAHUN (IDR)',
    'JENIS LOKASI',
    'KEPADATAN TRAFFIC',
    'TRAFFIC HARIAN (KENDARAAN)',
    'EST. IMPRESI HARIAN (OTS)',
    'SKOR VISIBILITAS (1-100)',
    'LATITUDE',
    'LONGITUDE',
    'GOOGLE MAPS URL',
    'URL FOTO DOKUMENTASI',
    'TERAKHIR DIPERBARUI'
  ];

  const rows = spots.map((s, idx) => [
    idx + 1,
    `"${s.id}"`,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    `"${(s.roadName || '').replace(/"/g, '""')}"`,
    `"${(s.city || '').replace(/"/g, '""')}"`,
    `"${(s.district || '').replace(/"/g, '""')}"`,
    `"${s.category === 'DOOH_DIGITAL' ? 'DOOH Digital' : 'OOH Statis'}"`,
    `"${(s.mediaType || '').replace(/"/g, '""')}"`,
    `"${(s.size || '').replace(/"/g, '""')}"`,
    `"${(s.layout || '').replace(/"/g, '""')}"`,
    `"${(s.lighting || '').replace(/"/g, '""')}"`,
    `"${s.isAvailable ? 'Tersedia' : 'Tersewa'}"`,
    s.pricing?.oneMonth ?? 0,
    s.pricing?.threeMonths ?? 0,
    s.pricing?.sixMonths ?? 0,
    s.pricing?.oneYear ?? 0,
    `"${(s.locationType || '').replace(/"/g, '""')}"`,
    `"${(s.trafficDensity || '').replace(/"/g, '""')}"`,
    s.dailyTraffic ?? 0,
    s.dailyImpressions ?? 0,
    s.visibilityScore ?? 0,
    s.coordinates?.lat ?? 0,
    s.coordinates?.lng ?? 0,
    `"https://maps.google.com/?q=${s.coordinates?.lat},${s.coordinates?.lng}"`,
    `"${(s.imageUrl || s.imageUrls?.[0] || '').replace(/"/g, '""')}"`,
    `"${s.updatedAt || new Date().toISOString().split('T')[0]}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

// Intelligent CSV Parser that can parse both standard formats and the user's raw pasted CSV
export function parseCSVToSpots(csvText: string): { spots: MediaSpot[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const spots: MediaSpot[] = [];
  const errors: string[] = [];

  let currentCity = 'Kota Bandung';
  let isVideotron = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    
    // Check section headers
    if (rawLine.includes('KOTA BANDUNG')) {
      currentCity = 'Kota Bandung';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('VIDEOTRON')) {
      isVideotron = true;
      continue;
    }
    if (rawLine.includes('CIMAHI')) {
      currentCity = 'Cimahi';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('KAB.BANDUNG BARAT') || rawLine.includes('KAB. BANDUNG BARAT')) {
      currentCity = 'Kab. Bandung Barat';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('KAB.BANDUNG') || rawLine.includes('KAB. BANDUNG')) {
      currentCity = 'Kab. Bandung';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('GARUT')) {
      currentCity = 'Garut';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('SUKABUMI')) {
      currentCity = 'Sukabumi';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('TASIKMALAYA KOTA')) {
      currentCity = 'Tasikmalaya';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('KAB. TASIKMALAYA')) {
      currentCity = 'Kab. Tasikmalaya';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('SUBANG')) {
      currentCity = 'Subang';
      isVideotron = false;
      continue;
    }
    if (rawLine.includes('CIAMIS')) {
      currentCity = 'Ciamis';
      isVideotron = false;
      continue;
    }
    if (rawLine.startsWith('NO,') || rawLine.includes('LOKASI,Status Kecamatan') || rawLine.includes('Catatan :')) {
      continue;
    }

    // Split CSV columns while respecting quoted values
    const cols = splitCSVRow(rawLine);
    if (cols.length < 3 || !cols[1]?.trim()) continue;

    const noVal = parseInt(cols[0]?.replace(/[^0-9]/g, '') || '0', 10);
    const locationName = cols[1]?.trim();
    if (!locationName || locationName.toLowerCase() === 'lokasi') continue;

    const district = cols[2]?.trim() || 'Pusat Kota';
    const mediaTypeStr = cols[3]?.trim() || (isVideotron ? 'LED Videotron' : 'Billboard Frontlite');
    const size = cols[4]?.trim() || '5 m x 10 m';
    const layout = cols[5]?.trim().toLowerCase().includes('hor') ? 'Horizontal' : 'Vertical';
    const availability = cols[6]?.trim() || 'Available';
    const isAvailable = !availability.toUpperCase().includes('SOLD') && !availability.toUpperCase().includes('TERSEWA');

    const price1Mo = parseRupiahString(cols[7] || '');
    const price3Mo = parseRupiahString(cols[8] || '');
    const price6Mo = parseRupiahString(cols[9] || '');
    const price1Yr = parseRupiahString(cols[10] || '');

    // Determine category
    const isDooh = isVideotron || mediaTypeStr.toLowerCase().includes('led') || mediaTypeStr.toLowerCase().includes('videotron');
    
    // Estimate traffic & location type based on road and district
    const locType = detectLocationType(locationName, district);
    const trafficDensity = detectTrafficDensity(locationName, locType);
    const dailyTraffic = calculateDailyTraffic(trafficDensity);
    const dailyImpressions = Math.round(dailyTraffic * (isDooh ? 2.3 : 1.55));

    // Determine coordinate jitter around known central nodes
    const coords = resolveCoordinates(locationName, currentCity);

    const spot: MediaSpot = {
      id: `SPOT-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 899 + 100)}`,
      no: noVal || spots.length + 1,
      name: locationName,
      roadName: locationName.split('(')[0].split('Dpn')[0].split('Dekat')[0].trim(),
      city: currentCity,
      district: district,
      category: isDooh ? 'DOOH_DIGITAL' : 'OOH_STATIC',
      mediaType: normalizeMediaType(mediaTypeStr, isDooh),
      size: size,
      layout: layout,
      availability: availability,
      isAvailable: isAvailable,
      pricing: {
        oneMonth: price1Mo || 30000000,
        threeMonths: price3Mo || (price1Mo ? price1Mo * 3 * 0.95 : 85000000),
        sixMonths: price6Mo || (price1Mo ? price1Mo * 6 * 0.9 : 170000000),
        oneYear: price1Yr || (price1Mo ? price1Mo * 12 * 0.8 : 280000000)
      },
      locationType: locType,
      trafficDensity: trafficDensity,
      dailyTraffic: dailyTraffic,
      dailyImpressions: dailyImpressions,
      visibilityScore: isDooh ? 98 : Math.floor(Math.random() * 8 + 89),
      coordinates: coords,
      lighting: isDooh ? 'LED Digital' : mediaTypeStr.toLowerCase().includes('backlite') ? 'Backlite' : 'Frontlite',
      updatedAt: new Date().toISOString().split('T')[0]
    };

    spots.push(spot);
  }

  return { spots, errors };
}

function splitCSVRow(row: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function normalizeMediaType(raw: string, isDooh: boolean): any {
  const lower = raw.toLowerCase();
  if (isDooh) {
    if (lower.includes('pylon')) return 'LED Pylon Berbaris';
    if (lower.includes('bando')) return 'LED BANDO';
    if (lower.includes('pole')) return 'LED Single Pole';
    return 'LED Videotron';
  }
  if (lower.includes('jpo') && lower.includes('backlite')) return 'JPO Backlite';
  if (lower.includes('jpo')) return 'JPO Frontlite';
  if (lower.includes('bando')) return 'Bando Frontlite';
  if (lower.includes('backlite')) return 'Billboard Backlite';
  return 'Billboard Frontlite';
}

function detectLocationType(loc: string, district: string): any {
  const lower = (loc + ' ' + district).toLowerCase();
  if (lower.includes('mall') || lower.includes('pvj') || lower.includes('bip') || lower.includes('tsm') || lower.includes('plaza') || lower.includes('miko') || lower.includes('pasar')) {
    return 'Komersial & Mall';
  }
  if (lower.includes('tol') || lower.includes('arteri') || lower.includes('soekarno') || lower.includes('cileunyi') || lower.includes('padalarang')) {
    return 'Jalur Tol & Arteri';
  }
  if (lower.includes('unikom') || lower.includes('kampus') || lower.includes('gerlong') || lower.includes('dago') || lower.includes('sekolah') || lower.includes('hikam')) {
    return 'Pendidikan & Kampus';
  }
  if (lower.includes('fly over') || lower.includes('flyover') || lower.includes('simpang') || lower.includes('perempatan') || lower.includes('bundaran')) {
    return 'Simpang & Flyover';
  }
  if (lower.includes('bandara') || lower.includes('terminal') || lower.includes('stasiun') || lower.includes('ledeng')) {
    return 'Transport Hub & Stasiun';
  }
  return 'Pusat Kota & Protokol';
}

function detectTrafficDensity(loc: string, locType: string): any {
  const lower = loc.toLowerCase();
  if (lower.includes('tol') || lower.includes('pasteur') || lower.includes('merdeka') || lower.includes('pvj') || lower.includes('soekarno hatta') || lower.includes('dago')) {
    return 'Sangat Padat';
  }
  if (locType === 'Jalur Tol & Arteri' || locType === 'Simpang & Flyover') {
    return 'Sangat Padat';
  }
  if (locType === 'Komersial & Mall' || locType === 'Pusat Kota & Protokol') {
    return 'Padat';
  }
  return 'Sedang';
}

function calculateDailyTraffic(density: string): number {
  if (density === 'Sangat Padat') return Math.floor(Math.random() * 45000 + 125000);
  if (density === 'Padat') return Math.floor(Math.random() * 30000 + 80000);
  if (density === 'Sedang') return Math.floor(Math.random() * 25000 + 45000);
  return Math.floor(Math.random() * 20000 + 20000);
}

function resolveCoordinates(name: string, city: string): { lat: number; lng: number } {
  // Center anchors with small deterministic jitter
  const anchors: Record<string, { lat: number; lng: number }> = {
    'Kota Bandung': { lat: -6.9175, lng: 107.6191 },
    'Cimahi': { lat: -6.8924, lng: 107.5458 },
    'Kab. Bandung Barat': { lat: -6.8402, lng: 107.4789 },
    'Kab. Bandung': { lat: -7.0275, lng: 107.5258 },
    'Garut': { lat: -7.2152, lng: 107.9042 },
    'Sukabumi': { lat: -6.9212, lng: 106.9298 },
    'Tasikmalaya': { lat: -7.3392, lng: 108.2145 },
    'Kab. Tasikmalaya': { lat: -7.1654, lng: 108.1482 },
    'Subang': { lat: -6.5684, lng: 107.7592 },
    'Ciamis': { lat: -7.3245, lng: 108.3498 }
  };

  const base = anchors[city] || anchors['Kota Bandung'];
  // hash string for repeatable offset
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((hash % 100) / 100) * 0.03;
  const offsetLng = (((hash >> 3) % 100) / 100) * 0.03;

  return {
    lat: Number((base.lat + offsetLat).toFixed(4)),
    lng: Number((base.lng + offsetLng).toFixed(4))
  };
}
