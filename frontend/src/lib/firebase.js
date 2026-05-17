import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Email/password auth is handled entirely by the backend.
// Returning null here tells App.js to skip Firebase and call
// the backend /api/auth/login directly — no 400 errors.
export const firebaseLogin = async (email, password) => null;
export const firebaseRegister = async (email, password, displayName) => null;

export const firebaseGoogleLogin = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const firebaseLogout = async () => {
  try { await signOut(auth); } catch (e) {}
};

export { auth };