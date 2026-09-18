import { ClientContact } from '../types/ooh';
import { getStoredClients, saveStoredClients, saveClientContact } from './clientService';
import { addNotification } from './storageService';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface GoogleContactPerson {
  resourceName: string;
  etag?: string;
  names?: Array<{
    displayName?: string;
    familyName?: string;
    givenName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    department?: string;
  }>;
  biographies?: Array<{
    value?: string;
  }>;
}

export interface GoogleOtherContactItem {
  resourceName: string;
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value: string }>;
  phoneNumbers?: Array<{ value: string }>;
}

export interface ContactsSyncResult {
  totalGoogleFetched: number;
  newCount: number;
  updatedCount: number;
  totalClientsNow: number;
  syncedAt: string;
  accountEmail: string;
  contacts: ClientContact[];
}

const GOOGLE_CONTACTS_LAST_SYNC_KEY = 'ooh_google_contacts_last_sync_v1';

export function getLastContactsSyncInfo(): { timestamp: string; totalSynced: number } | null {
  try {
    const raw = localStorage.getItem(GOOGLE_CONTACTS_LAST_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function saveLastContactsSyncInfo(totalSynced: number): void {
  try {
    const info = {
      timestamp: new Date().toISOString(),
      totalSynced
    };
    localStorage.setItem(GOOGLE_CONTACTS_LAST_SYNC_KEY, JSON.stringify(info));
  } catch (err) {
    console.error('Failed to save last contact sync info', err);
  }
}

/**
 * Standardize phone number for clean matching & WhatsApp outreach
 */
function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '');
}

/**
 * Infer business category based on company name or notes
 */
function inferClientCategory(company: string, notes: string): string {
  const text = (company + ' ' + notes).toLowerCase();
  if (text.includes('motor') || text.includes('honda') || text.includes('yamaha') || text.includes('toyota') || text.includes('mobil') || text.includes('otomotif') || text.includes('bengkel')) {
    return 'Otomotif';
  }
  if (text.includes('bank') || text.includes('bca') || text.includes('mandiri') || text.includes('brio') || text.includes('fintech') || text.includes('asuransi') || text.includes('finance')) {
    return 'Finansial & Perbankan';
  }
  if (text.includes('fmcg') || text.includes('indofood') || text.includes('wings') || text.includes('mayora') || text.includes('danone') || text.includes('pariwara') || text.includes('kopi') || text.includes('resto') || text.includes('cafe') || text.includes('kuliner') || text.includes('food')) {
    return 'Retail & F&B';
  }
  if (text.includes('property') || text.includes('properti') || text.includes('apartemen') || text.includes('residence') || text.includes('land') || text.includes('developer') || text.includes('agung')) {
    return 'Properti & Real Estate';
  }
  if (text.includes('telco') || text.includes('telkom') || text.includes('indosat') || text.includes('xl') || text.includes('smartfren') || text.includes('tech') || text.includes('digital') || text.includes('app')) {
    return 'Teknologi & Telekomunikasi';
  }
  if (text.includes('agency') || text.includes('adv') || text.includes('reklame') || text.includes('media') || text.includes('advertising') || text.includes('kreasindo')) {
    return 'Media & Brand Agency';
  }
  return 'Korporat / Bisnis Umum';
}

/**
 * Fetch Main Contacts from Google People API
 */
export async function fetchGooglePeopleConnections(accessToken: string): Promise<GoogleContactPerson[]> {
  try {
    const url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,biographies&pageSize=1000';
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Sesi Google OAuth telah kedaluwarsa. Silakan login kembali.');
      }
      const errText = await res.text();
      console.warn('Google People API connections error:', res.status, errText);
      return [];
    }

    const data = await res.json();
    return (data.connections || []) as GoogleContactPerson[];
  } catch (err) {
    console.error('Error fetching Google People Connections:', err);
    throw err;
  }
}

/**
 * Fetch "Other Contacts" (e.g. contacts automatically saved from Gmail suherman.reklame2012@gmail.com)
 */
export async function fetchGoogleOtherContacts(accessToken: string): Promise<GoogleOtherContactItem[]> {
  try {
    const url = 'https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses,phoneNumbers&pageSize=500';
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      // Other contacts might not have entries or need explicit permission; fail gracefully
      console.warn('Google otherContacts error (non-fatal):', res.status);
      return [];
    }

    const data = await res.json();
    return (data.otherContacts || []) as GoogleOtherContactItem[];
  } catch (err) {
    console.warn('Could not fetch otherContacts (ignorable):', err);
    return [];
  }
}

/**
 * Convert Google contacts data into our unified ClientContact structure
 */
export function convertGoogleDataToClientContacts(
  connections: GoogleContactPerson[],
  otherContacts: GoogleOtherContactItem[]
): ClientContact[] {
  const results: ClientContact[] = [];
  const seenKeys = new Set<string>();

  // Process Primary Contacts first
  for (const person of connections) {
    const name = person.names?.[0]?.displayName || 
      [person.names?.[0]?.givenName, person.names?.[0]?.familyName].filter(Boolean).join(' ') || 
      '';
    const email = person.emailAddresses?.[0]?.value || '';
    const phone = person.phoneNumbers?.[0]?.value || '';
    const org = person.organizations?.[0];
    const company = org?.name || (name ? `Klien: ${name}` : 'Perusahaan Klien');
    const role = org?.title || '';
    const bio = person.biographies?.[0]?.value || '';

    // If contact has neither name, email, nor phone, skip
    if (!name && !email && !phone) continue;

    const dedupKey = (email || phone || name).toLowerCase().trim();
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    const idSuffix = person.resourceName ? person.resourceName.replace(/[^a-zA-Z0-9]/g, '_') : Math.random().toString(36).substring(2, 9);
    
    results.push({
      id: `gc_${idSuffix}`,
      name: name || (email ? email.split('@')[0] : 'Kontak Google'),
      company: company,
      role: role || 'PIC / Client Representative',
      phone: cleanPhone(phone),
      email: email,
      category: inferClientCategory(company, bio),
      notes: bio || 'Disinkronkan dari Google Contacts suherman.reklame2012@gmail.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      proposalsSentCount: 0
    });
  }

  // Process Other Contacts from Gmail correspondence
  for (const other of otherContacts) {
    const name = other.names?.[0]?.displayName || '';
    const email = other.emailAddresses?.[0]?.value || '';
    const phone = other.phoneNumbers?.[0]?.value || '';

    if (!email && !phone) continue;

    const dedupKey = (email || phone || name).toLowerCase().trim();
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    const idSuffix = other.resourceName ? other.resourceName.replace(/[^a-zA-Z0-9]/g, '_') : Math.random().toString(36).substring(2, 9);
    const displayName = name || (email ? email.split('@')[0] : 'Relasi Email');

    results.push({
      id: `gc_other_${idSuffix}`,
      name: displayName,
      company: `Mitra / Relasi (${email ? email.split('@')[1] || 'Gmail' : 'Klien'})`,
      role: 'Media Partner / Client',
      phone: cleanPhone(phone),
      email: email,
      category: 'Korporat / Bisnis Umum',
      notes: 'Disinkronkan dari Google Contacts (Riwayat Email suherman.reklame2012@gmail.com)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      proposalsSentCount: 0
    });
  }

  return results;
}

/**
 * Perform complete synchronization of Google Contacts into App and Firestore
 */
export async function syncGoogleContactsToApp(accessToken: string): Promise<ContactsSyncResult> {
  const [connections, otherContacts] = await Promise.all([
    fetchGooglePeopleConnections(accessToken),
    fetchGoogleOtherContacts(accessToken)
  ]);

  const convertedGoogleContacts = convertGoogleDataToClientContacts(connections, otherContacts);
  const currentClients = getStoredClients();

  let newCount = 0;
  let updatedCount = 0;

  const mergedClients: ClientContact[] = [...currentClients];

  for (const gc of convertedGoogleContacts) {
    // Match by email or normalized phone
    const existingIndex = mergedClients.findIndex((c) => {
      if (gc.email && c.email && gc.email.toLowerCase().trim() === c.email.toLowerCase().trim()) {
        return true;
      }
      if (gc.phone && c.phone && cleanPhone(gc.phone) === cleanPhone(c.phone)) {
        return true;
      }
      if (gc.name && c.name && gc.name.toLowerCase().trim() === c.name.toLowerCase().trim() && gc.company && c.company && gc.company.toLowerCase().trim() === c.company.toLowerCase().trim()) {
        return true;
      }
      return false;
    });

    if (existingIndex >= 0) {
      // Update existing record with any missing info
      const existing = mergedClients[existingIndex];
      const updated: ClientContact = {
        ...existing,
        name: existing.name || gc.name,
        phone: existing.phone || gc.phone,
        email: existing.email || gc.email,
        company: existing.company !== 'Perusahaan Klien' ? existing.company : gc.company,
        role: existing.role || gc.role,
        notes: existing.notes ? `${existing.notes} | Sync Google Contacts: ${new Date().toLocaleDateString('id-ID')}` : gc.notes,
        updatedAt: new Date().toISOString()
      };
      mergedClients[existingIndex] = updated;
      updatedCount++;

      // Save to Firestore in background
      try {
        const docRef = doc(db, 'clients', updated.id);
        setDoc(docRef, updated, { merge: true }).catch(() => {});
      } catch (e) {}
    } else {
      // Add as new client
      mergedClients.push(gc);
      newCount++;

      // Save to Firestore in background
      try {
        const docRef = doc(db, 'clients', gc.id);
        setDoc(docRef, gc, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  }

  // Sort by company name
  mergedClients.sort((a, b) => a.company.localeCompare(b.company));

  // Save merged result to local storage cache
  saveStoredClients(mergedClients);
  saveLastContactsSyncInfo(convertedGoogleContacts.length);

  // Trigger system notification
  addNotification({
    title: 'Google Contacts Tersinkronisasi',
    message: `Berhasil menyinkronkan ${convertedGoogleContacts.length} kontak dari suherman.reklame2012@gmail.com (${newCount} baru, ${updatedCount} diperbarui).`,
    type: 'sync'
  });

  return {
    totalGoogleFetched: convertedGoogleContacts.length,
    newCount,
    updatedCount,
    totalClientsNow: mergedClients.length,
    syncedAt: new Date().toISOString(),
    accountEmail: 'suherman.reklame2012@gmail.com',
    contacts: mergedClients
  };
}
