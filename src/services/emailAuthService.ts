import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User
} from 'firebase/auth';

export const loginWithEmail = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const registerAdmin = async (email: string, pass: string) => {
  return await createUserWithEmailAndPassword(auth, email, pass);
};

export const resetPassword = async (email: string) => {
  return await sendPasswordResetEmail(auth, email);
};

export const logoutAdmin = async () => {
  return await signOut(auth);
};

export const listenAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
