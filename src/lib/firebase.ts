/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export let isFirebaseConfigured = false;
export let firebaseConfigError: string | null = null;

// Initialize Firebase configuration strictly from Vite environment variables (PWA model)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Log warning if required variables are missing
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value || value === 'undefined' || value === 'REPLACE_WITH_VITE_FIREBASE_API_KEY' || value === 'your-project-id')
  .map(([key]) => key);

const databaseIdToUse = import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

let app: any;
let dbInstance: any;
let authInstance: any;

// Detect invalid/placeholder keys
if (missingKeys.length > 0 || !firebaseConfig.apiKey || firebaseConfig.apiKey === 'REPLACE_WITH_VITE_FIREBASE_API_KEY') {
  firebaseConfigError = `Missing or incomplete Vite environment variables: ${missingKeys.join(', ')}`;
  isFirebaseConfigured = false;
  
  console.warn(
    `[Firebase Security Architect] Missing or incomplete Vite environment variables: ${missingKeys.join(', ')}. ` +
    `Ensure GitHub Secrets are configured for production or local .env.local has complete variables.`
  );
} else {
  try {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app, databaseIdToUse);
    authInstance = getAuth(app);
    isFirebaseConfigured = true;
  } catch (err: any) {
    firebaseConfigError = err.message || 'Failed to initialize Firebase with the provided configuration.';
    isFirebaseConfigured = false;
    console.error('[Firebase Security Architect] Initialization error:', err);
  }
}

// Fallback stub objects to prevent React import and lifecycle crashes
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (cb: any) => {
    // Return a dummy unsubscribe function
    return () => {};
  },
  onIdTokenChanged: (cb: any) => {
    return () => {};
  },
} as any;

const mockDb = {} as any;

export const db = isFirebaseConfigured ? dbInstance : mockDb;
export const auth = isFirebaseConfigured ? authInstance : mockAuth;

