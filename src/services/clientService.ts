import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ClientContact } from '../types/ooh';
import { INITIAL_CLIENTS } from '../data/initialClients';

const CLIENTS_COLLECTION = 'clients';
const CLIENTS_STORAGE_KEY = 'ooh_client_contacts_v1';
export const APP_OWNER_EMAIL = 'suherman.reklame2012@gmail.com';

/**
 * Read local cached clients with INITIAL_CLIENTS seed.
 */
export function getStoredClients(): ClientContact[] {
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) {
      const seeded = INITIAL_CLIENTS.map(c => ({ ...c, ownerEmail: APP_OWNER_EMAIL }));
      saveStoredClients(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = INITIAL_CLIENTS.map(c => ({ ...c, ownerEmail: APP_OWNER_EMAIL }));
      saveStoredClients(seeded);
      return seeded;
    }
    return parsed.map(c => ({
      ...c,
      ownerEmail: c.ownerEmail || APP_OWNER_EMAIL
    }));
  } catch (err) {
    console.warn('Failed to read clients from local storage, returning defaults:', err);
    return INITIAL_CLIENTS.map(c => ({ ...c, ownerEmail: APP_OWNER_EMAIL }));
  }
}

/**
 * Save clients array to local storage cache.
 */
export function saveStoredClients(clients: ClientContact[]): void {
  try {
    const enriched = clients.map(c => ({
      ...c,
      ownerEmail: c.ownerEmail || APP_OWNER_EMAIL
    }));
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(enriched));
  } catch (err) {
    console.warn('Client local storage caching skipped:', err);
  }
}

/**
 * Subscribe to clients collection in Firestore with local fallback.
 */
export function subscribeToClients(
  onUpdate: (clients: ClientContact[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          // If Firestore collection is empty, seed from local storage / defaults into Firestore
          const current = getStoredClients();
          onUpdate(current);
          
          // Seed to Firestore in background for suherman.reklame2012@gmail.com
          current.forEach(async (c) => {
            try {
              const docRef = doc(db, CLIENTS_COLLECTION, c.id);
              await setDoc(docRef, { ...c, ownerEmail: APP_OWNER_EMAIL }, { merge: true });
            } catch (seedErr) {
              // Silently ignore background seed error
            }
          });
          return;
        }

        const clients: ClientContact[] = [];
        snapshot.forEach((docSnap) => {
          clients.push({
            ...(docSnap.data() as ClientContact),
            id: docSnap.id,
            ownerEmail: (docSnap.data() as any).ownerEmail || APP_OWNER_EMAIL
          });
        });

        // Sort by company/name
        clients.sort((a, b) => a.company.localeCompare(b.company));
        saveStoredClients(clients);
        onUpdate(clients);
      },
      (error) => {
        console.info('Firestore clients syncing with local cache:', error.message || error);
        onUpdate(getStoredClients());
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.info('Firestore clients listener initializing with local cache:', err);
    onUpdate(getStoredClients());
    return () => {};
  }
}

/**
 * Save or update a single client in Firestore and local storage.
 */
export async function saveClientContact(client: ClientContact): Promise<void> {
  const currentList = getStoredClients();
  const index = currentList.findIndex((c) => c.id === client.id);
  let updatedList: ClientContact[];

  const clientToSave: ClientContact = {
    ...client,
    ownerEmail: APP_OWNER_EMAIL,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    updatedList = [...currentList];
    updatedList[index] = clientToSave;
  } else {
    updatedList = [{ ...clientToSave, createdAt: new Date().toISOString() }, ...currentList];
  }
  saveStoredClients(updatedList);

  try {
    const docRef = doc(db, CLIENTS_COLLECTION, client.id);
    await setDoc(docRef, clientToSave, { merge: true });
  } catch (err) {
    console.info('Client contact saved locally, background sync pending:', err);
  }
}

/**
 * Delete a client contact from Firestore and local storage.
 */
export async function deleteClientContact(clientId: string): Promise<void> {
  const currentList = getStoredClients();
  const updatedList = currentList.filter((c) => c.id !== clientId);
  saveStoredClients(updatedList);

  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Cloud Firestore delete client error, deleted locally:', err);
  }
}

/**
 * Record a proposal sent event for this client.
 */
export async function recordProposalSent(clientId: string): Promise<void> {
  const currentList = getStoredClients();
  const client = currentList.find((c) => c.id === clientId);
  if (!client) return;

  const updatedClient: ClientContact = {
    ...client,
    lastProposalAt: new Date().toISOString(),
    proposalsSentCount: (client.proposalsSentCount || 0) + 1,
    updatedAt: new Date().toISOString()
  };

  await saveClientContact(updatedClient);
}
