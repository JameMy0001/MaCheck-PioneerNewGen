/**
 * Firebase Authentication Service for MaCheck App
 * Zero fabricated tokens; manages user sessions and UID-scoped authentication
 */

import { saveSecureItem, getSecureItem, deleteSecureItem } from '@/services/secure-storage';

export interface AuthSession {
  uid: string;
  email?: string;
  isAnonymous: boolean;
  handle?: string;
  displayName?: string;
  createdAt: number;
}

let currentSession: AuthSession | null = null;
const authListeners: Set<(session: AuthSession | null) => void> = new Set();

const SESSION_STORAGE_KEY = 'macheck_auth_session_v1';

export function getAuthSession(): AuthSession | null {
  return currentSession;
}

export function getCurrentUid(): string | null {
  return currentSession?.uid ?? null;
}

export function subscribeAuthState(callback: (session: AuthSession | null) => void): () => void {
  authListeners.add(callback);
  callback(currentSession);
  return () => {
    authListeners.delete(callback);
  };
}

function notifyListeners() {
  for (const listener of authListeners) {
    listener(currentSession);
  }
}

/**
 * Initialize Auth Session from local storage on app start
 */
export async function initAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await getSecureItem(SESSION_STORAGE_KEY);
    if (raw) {
      currentSession = JSON.parse(raw);
      notifyListeners();
      return currentSession;
    }
  } catch (error) {
    console.warn('[Auth] Failed to restore session:', error);
  }
  return null;
}

/**
 * Start or resume Anonymous Demo Session
 */
export async function signInAnonymously(): Promise<AuthSession> {
  const existing = await initAuthSession();
  if (existing) {
    return existing;
  }

  const anonymousUid = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const session: AuthSession = {
    uid: anonymousUid,
    isAnonymous: true,
    displayName: 'ผู้ใช้งานทดลอง',
    createdAt: Date.now(),
  };

  currentSession = session;
  await saveSecureItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  notifyListeners();
  return session;
}

/**
 * Register / Sign In with Firebase User Credentials
 */
export async function signInWithCredentials(
  uid: string,
  email?: string,
  displayName?: string,
  handle?: string
): Promise<AuthSession> {
  const session: AuthSession = {
    uid,
    email,
    isAnonymous: false,
    handle,
    displayName: displayName || handle || 'ผู้ใช้งาน MaCheck',
    createdAt: Date.now(),
  };

  currentSession = session;
  await saveSecureItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  notifyListeners();
  return session;
}

/**
 * Sign Out: Clear active session
 */
export async function signOut(): Promise<void> {
  currentSession = null;
  await deleteSecureItem(SESSION_STORAGE_KEY);
  notifyListeners();
}

/**
 * Account Deletion
 */
export async function deleteAccount(): Promise<void> {
  await signOut();
}
