/**
 * Firebase Native Client SDK Initializer for MaCheck Mobile
 * Provides typed instances for Auth, Firestore, and Functions with emulator support
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import functions, { FirebaseFunctionsTypes } from '@react-native-firebase/functions';
import { USE_EMULATOR, EMULATOR_HOST } from '@/services/firebase';

let initialized = false;

export function initFirebase() {
  if (initialized) return;
  initialized = true;

  if (USE_EMULATOR) {
    try {
      // Connect emulators if in DEV mode and emulators enabled
      auth().useEmulator(`http://${EMULATOR_HOST}:9099`);
      firestore().useEmulator(EMULATOR_HOST, 8080);
      functions().useEmulator(EMULATOR_HOST, 5001);
      console.log('[Firebase] Connected to local emulators at host:', EMULATOR_HOST);
    } catch (e) {
      console.warn('[Firebase] Emulators already connected or failed to connect:', e);
    }
  }
}

export function getAppAuth(): FirebaseAuthTypes.Module {
  initFirebase();
  return auth();
}

export function getAppDb(): FirebaseFirestoreTypes.Module {
  initFirebase();
  return firestore();
}

export function getAppFunctions(): FirebaseFunctionsTypes.Module {
  initFirebase();
  return functions();
}

export async function callCallableFunction<TResp = unknown, TData = object>(
  name: string,
  data?: TData
): Promise<TResp> {
  const fns = getAppFunctions();
  const callable = fns.httpsCallable(name);
  const result = await callable(data);
  return result.data as TResp;
}
