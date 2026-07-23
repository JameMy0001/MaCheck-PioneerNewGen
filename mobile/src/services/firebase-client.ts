/**
 * Firebase Client SDK Initializer for MaCheck Mobile
 * Provides typed instances for Auth, Firestore, and Functions with emulator support
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable, Functions } from 'firebase/functions';
import { FIREBASE_CONFIG, USE_EMULATOR, EMULATOR_HOST } from '@/services/firebase';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

export function initFirebase() {
  if (!getApps().length) {
    app = initializeApp(FIREBASE_CONFIG);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app, 'asia-southeast1');

  if (USE_EMULATOR) {
    try {
      // Connect emulators if in DEV mode and emulators enabled
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
      connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
      console.log('[Firebase] Connected to local emulators at host:', EMULATOR_HOST);
    } catch (e) {
      console.warn('[Firebase] Emulators already connected or failed to connect:', e);
    }
  }

  return { app, auth, db, functions };
}

export function getAppAuth(): Auth {
  if (!auth) initFirebase();
  return auth;
}

export function getAppDb(): Firestore {
  if (!db) initFirebase();
  return db;
}

export function getAppFunctions(): Functions {
  if (!functions) initFirebase();
  return functions;
}

export async function callCallableFunction<TResp = unknown, TData = object>(
  name: string,
  data?: TData
): Promise<TResp> {
  const fns = getAppFunctions();
  const callable = httpsCallable<TData, TResp>(fns, name);
  const result = await callable(data);
  return result.data;
}
