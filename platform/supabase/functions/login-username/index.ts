import {
  adminClient, clearRateLimit, corsHeaders, enforceRateLimit, json, normalizeHandle,
  parseBody, publicClient, RateLimitError, sessionPayload, validateHandle,
} from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = adminClient();
  try {
    const body = await parseBody(request);
    const username = normalizeHandle(body.username);
    const password = String(body.password ?? '');
    if (validateHandle(username) || !password) return json({ error: 'Invalid username or password.' }, 401);
    const rateKey = await enforceRateLimit(admin, request, 'login', username);

    const { data: account } = await admin.rpc('server_auth_lookup_handle', { p_handle: username }).maybeSingle();
    if (!account) return json({ error: 'Invalid username or password.' }, 401);

    const { data, error } = await publicClient().auth.signInWithPassword({ email: account.internal_email, password });
    if (error) return json({ error: 'Invalid username or password.' }, 401);
    await admin.rpc('server_auth_mark_login', { p_user_id: account.user_id });
    await clearRateLimit(admin, rateKey);
    return json({ ...sessionPayload(data.session), username });
  } catch (error) {
    if (error instanceof RateLimitError) return json({ error: error.message }, 429);
    console.error('login-username failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Unable to sign in.' }, 500);
  }
});
