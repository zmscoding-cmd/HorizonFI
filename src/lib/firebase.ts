/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
  .filter(([_, value]) => !value || value === 'undefined')
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(
    `[Firebase Security Architect] Missing Vite environment variables: ${missingKeys.join(', ')}. ` +
    `Ensure .env.local contains complete VITE_FIREBASE_* variables for secure local development.`
  );
}

const databaseIdToUse = import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, databaseIdToUse);
export const auth = getAuth(app);
