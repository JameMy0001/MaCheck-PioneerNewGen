import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
};

export const adminClient = () => createClient(
  requiredEnv('SUPABASE_URL'),
  requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const publicClient = () => createClient(
  requiredEnv('SUPABASE_URL'),
  requiredEnv('SUPABASE_ANON_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const normalizeHandle = (input: unknown) => String(input ?? '').trim().toLowerCase();

export const validateHandle = (handle: string) => {
  if (!/^[a-z][a-z0-9_]{5,23}$/.test(handle)) {
    return 'Username must be 6-24 characters, begin with a letter, and contain only a-z, 0-9, or underscore.';
  }
  if (handle.includes('phone') || handle.includes('email')) return 'Choose a username that does not contain contact information.';
  return null;
};

export const validatePassword = (password: unknown) => {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return 'Password must contain 10-128 characters.';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
};

export const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

export const createRecoveryCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return raw.match(/.{1,5}/g)?.join('-') ?? raw;
};

const requestIp = (request: Request) => request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export async function enforceRateLimit(
  admin: SupabaseClient,
  request: Request,
  action: string,
  handle: string,
  maxAttempts = 10,
) {
  const pepper = requiredEnv('AUTH_PEPPER');
  const keyHash = await sha256(`${action}|${handle}|${requestIp(request)}|${pepper}`);
  const { data: allowed, error } = await admin.rpc('server_auth_take_rate_limit', {
    p_key_hash: keyHash,
    p_max_attempts: maxAttempts,
  });
  if (error) throw error;
  if (!allowed) throw new RateLimitError();
  return keyHash;
}

export async function clearRateLimit(admin: SupabaseClient, keyHash: string) {
  await admin.rpc('server_auth_clear_rate_limit', { p_key_hash: keyHash });
}

export class RateLimitError extends Error {
  constructor() {
    super('Too many attempts. Try again in 15 minutes.');
    this.name = 'RateLimitError';
  }
}

export async function parseBody(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 4096) throw new Error('Request too large');
  return await request.json() as Record<string, unknown>;
}

export const sessionPayload = (session: { access_token: string; refresh_token: string; expires_in: number } | null) => {
  if (!session) throw new Error('Authentication session was not created');
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  };
};
