import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { MediaSpot, NotificationLog } from '../types/ooh';

const SPOTS_COLLECTION = 'spots';
const NOTIFICATIONS_COLLECTION = 'notifications';
export const APP_OWNER_EMAIL = 'suherman.reklame2012@gmail.com';

/**
 * Subscribe to real-time changes of media spots in Firestore.
 * Automatically handles permissions and connection errors.
 */
export function subscribeToSpots(
  onUpdate: (spots: MediaSpot[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, SPOTS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const spotsList: MediaSpot[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as MediaSpot;
        spotsList.push({
          ...data,
          id: docSnap.id
        });
      });

      // Sort by spot sequence number with ID fallback
      spotsList.sort((a, b) => (a.no || 0) - (b.no || 0) || String(a.id).localeCompare(String(b.id)));
      onUpdate(spotsList);
    },
    (error) => {
      console.warn('Firestore subscription error (continuing with local cache):', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a single spot in Firestore.
 */
export async function saveSpotToFirestore(spot: MediaSpot): Promise<void> {
  const docRef = doc(db, SPOTS_COLLECTION, spot.id);
  const dataToSave = {
    ...spot,
    ownerEmail: spot.ownerEmail || APP_OWNER_EMAIL,
    updatedAt: spot.updatedAt || new Date().toISOString()
  };

  try {
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    console.info('Spot saved locally, Firestore sync pending:', error);
  }
}

/**
 * Update availability of a single spot in Firestore.
 */
export async function updateSpotAvailabilityInFirestore(
  spotId: string,
  isAvailable: boolean
): Promise<void> {
  const docRef = doc(db, SPOTS_COLLECTION, spotId);
  try {
    await updateDoc(docRef, {
      isAvailable,
      availability: isAvailable ? 'Available' : 'Tersewa / Kontrak',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SPOTS_COLLECTION}/${spotId}`);
  }
}

/**
 * Bulk update availability of multiple spots using Firestore batch write.
 */
export async function bulkUpdateAvailabilityInFirestore(
  spotIds: string[],
  isAvailable: boolean
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const availabilityStr = isAvailable ? 'Available' : 'Tersewa / Kontrak';

    spotIds.forEach((id) => {
      const docRef = doc(db, SPOTS_COLLECTION, id);
      batch.update(docRef, {
        isAvailable,
        availability: availabilityStr,
        updatedAt: now
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SPOTS_COLLECTION);
  }
}

/**
 * Bulk update multiple spots attributes (availability and/or category/mediaType) using Firestore batch write.
 */
export async function bulkUpdateSpotsInFirestore(
  spotIds: string[],
  updates: Partial<MediaSpot>
): Promise<void> {
  if (!spotIds || spotIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const payload = {
      ...updates,
      updatedAt: now
    };

    spotIds.forEach((id) => {
      const docRef = doc(db, SPOTS_COLLECTION, id);
      batch.update(docRef, payload);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SPOTS_COLLECTION);
  }
}

/**
 * Delete a spot from Firestore.
 */
export async function deleteSpotFromFirestore(spotId: string): Promise<void> {
  const docRef = doc(db, SPOTS_COLLECTION, spotId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SPOTS_COLLECTION}/${spotId}`);
  }
}

/**
 * Bulk delete multiple spots from Firestore using batch write.
 */
export async function bulkDeleteSpotsFromFirestore(spotIds: string[]): Promise<void> {
  if (!spotIds || spotIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    spotIds.forEach((id) => {
      const docRef = doc(db, SPOTS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, SPOTS_COLLECTION);
  }
}

/**
 * Seed initial spots to Firestore if the collection is empty or missing spots.
 */
export async function seedInitialSpotsIfEmpty(initialSpots: MediaSpot[]): Promise<boolean> {
  const colRef = collection(db, SPOTS_COLLECTION);
  try {
    const snap = await getDocs(colRef);
    if (snap.empty && initialSpots.length > 0) {
      console.log(`Seeding Firestore with ${initialSpots.length} initial spots...`);
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const spot of initialSpots) {
        const docRef = doc(db, SPOTS_COLLECTION, spot.id);
        currentBatch.set(docRef, {
          ...spot,
          ownerEmail: spot.ownerEmail || APP_OWNER_EMAIL,
          updatedAt: spot.updatedAt || new Date().toISOString()
        });
        count++;

        if (count % 400 === 0) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
        }
      }

      if (count % 400 !== 0) {
        batches.push(currentBatch.commit());
      }

      await Promise.all(batches);
      console.log('Seeding completed successfully.');
      return true;
    } else if (!snap.empty) {
      // Check if any spots are missing in cloud firestore
      const existingIds = new Set<string>();
      snap.forEach(d => existingIds.add(d.id));
      const missingSpots = initialSpots.filter(s => !existingIds.has(s.id));
      if (missingSpots.length > 0) {
        console.log(`Syncing ${missingSpots.length} missing spots to Firestore...`);
        const batch = writeBatch(db);
        missingSpots.forEach(s => {
          const docRef = doc(db, SPOTS_COLLECTION, s.id);
          batch.set(docRef, {
            ...s,
            ownerEmail: s.ownerEmail || APP_OWNER_EMAIL,
            updatedAt: s.updatedAt || new Date().toISOString()
          });
        });
        await batch.commit();
        console.log('Missing spots synced successfully.');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.warn('Could not check or seed Firestore spots:', error);
    return false;
  }
}

/**
 * Bulk sync repaired/healed spots to Firestore.
 */
export async function syncRepairedSpotsToFirestore(spots: MediaSpot[]): Promise<void> {
  try {
    const batches = [];
    let currentBatch = writeBatch(db);
    let count = 0;

    for (const spot of spots) {
      const docRef = doc(db, SPOTS_COLLECTION, spot.id);
      currentBatch.set(docRef, {
        ...spot,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;

      if (count % 400 === 0) {
        batches.push(currentBatch.commit());
        currentBatch = writeBatch(db);
      }
    }

    if (count % 400 !== 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
  } catch (error) {
    console.warn('Could not sync repaired spots to Firestore:', error);
  }
}

/**
 * Subscribe to notifications collection in Firestore.
 */
export function subscribeToNotifications(
  onUpdate: (notifs: NotificationLog[]) => void
): () => void {
  const colRef = collection(db, NOTIFICATIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: NotificationLog[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as NotificationLog), id: d.id });
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(list.slice(0, 50));
    },
    (error) => {
      console.warn('Notifications onSnapshot error (continuing with local logs):', error);
    }
  );
}

/**
 * Add a notification to Firestore.
 */
export async function addNotificationToFirestore(
  notif: Omit<NotificationLog, 'id' | 'timestamp' | 'read'>
): Promise<void> {
  try {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newDocRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await setDoc(newDocRef, {
      ...notif,
      id,
      timestamp: new Date().toISOString(),
      read: false
    });
  } catch (err) {
    console.warn('Could not save notification to Firestore:', err);
  }
}
