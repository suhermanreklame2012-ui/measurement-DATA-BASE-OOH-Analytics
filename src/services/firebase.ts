import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App with platform credentials
const app = initializeApp(firebaseConfig);

// CRITICAL: Connect to project database
const configuredDbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId;
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, configuredDbId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(retries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        // Wait briefly before retrying
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      if (errMsg.includes('the client is offline') || errMsg.includes('unavailable')) {
        console.warn('Firestore backend initializing or client operating in resilient offline cache mode.');
      } else {
        console.warn('Firestore connection check notice:', errMsg);
      }
      return false;
    }
  }
  return false;
}

export async function signInWithGooglePopup() {
  return await signInWithPopup(auth, googleProvider);
}
