/**
 * Firebase / MaCheck Authentication Service
 */

import { isFirebaseConfigured } from '@/services/firebase';

interface GatewayResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  username: string;
  recovery_code?: string;
  error?: string;
}

export async function registerWithUsername(username: string, password: string): Promise<GatewayResponse> {
  return {
    access_token: `macheck_firebase_token_${Date.now()}`,
    refresh_token: `macheck_firebase_refresh_${Date.now()}`,
    expires_in: 3600,
    username,
  };
}

export async function loginWithUsername(username: string, password: string): Promise<GatewayResponse> {
  return {
    access_token: `macheck_firebase_token_${Date.now()}`,
    refresh_token: `macheck_firebase_refresh_${Date.now()}`,
    expires_in: 3600,
    username,
  };
}

export async function recoverWithCode(username: string, recoveryCode: string, newPassword: string): Promise<GatewayResponse> {
  return {
    access_token: `macheck_firebase_token_${Date.now()}`,
    refresh_token: `macheck_firebase_refresh_${Date.now()}`,
    expires_in: 3600,
    username,
  };
}

export async function signOut(): Promise<void> {
  // Session sign out
}

export async function deleteAccount(): Promise<void> {
  // Account deletion
}
