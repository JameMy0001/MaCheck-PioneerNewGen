import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT_REF'));

export const supabase = createClient(
  url || 'https://not-configured.invalid',
  anonKey || 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'yacheck-clinical-admin-session',
    },
  },
);

export async function loginWithUsername(username: string, password: string) {
  if (!isConfigured) throw new Error('ยังไม่ได้ตั้งค่า Supabase ในไฟล์ .env');
  const response = await fetch(`${url}/functions/v1/login-username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json().catch(() => ({})) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };
  if (!response.ok || !body.access_token || !body.refresh_token) {
    throw new Error(body.error || 'เข้าสู่ระบบไม่สำเร็จ');
  }
  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) throw error;
}
