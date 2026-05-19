import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

function getFirebaseApp() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  // During static build / SSR the env vars may be absent — defer to client.
  if (!apiKey) {
    throw new Error('Firebase env vars not set. Copy .env.local.example to .env.local and fill in values.');
  }

  if (getApps().length) return getApp();

  return initializeApp({
    apiKey,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
