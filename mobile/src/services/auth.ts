import { isSupabaseConfigured, supabase } from '@/services/supabase';

interface GatewayResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  username: string;
  recovery_code?: string;
  error?: string;
}

async function callGateway(functionName: string, payload: Record<string, string>) {
  if (!isSupabaseConfigured) throw new Error('ยังไม่ได้ตั้งค่า Supabase กรุณาคัดลอก .env.example เป็น .env แล้วใส่ URL และ publishable key');
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const response = await fetch(`${url}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({})) as GatewayResponse;
  if (!response.ok) throw new Error(body.error || 'เชื่อมต่อระบบบัญชีไม่สำเร็จ');
  const { error } = await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
  if (error) throw error;
  return body;
}

export const registerWithUsername = (username: string, password: string) => callGateway('register-username', { username, password });
export const loginWithUsername = (username: string, password: string) => callGateway('login-username', { username, password });
export const recoverWithCode = (username: string, recoveryCode: string, newPassword: string) => callGateway('recover-username', {
  username,
  recovery_code: recoveryCode,
  new_password: newPassword,
});
export const signOut = () => supabase.auth.signOut();
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
