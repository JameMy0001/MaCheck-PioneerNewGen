import {
  adminClient, clearRateLimit, corsHeaders, createRecoveryCode, enforceRateLimit, json,
  normalizeHandle, parseBody, publicClient, RateLimitError, sessionPayload, sha256,
  validateHandle, validatePassword,
} from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = adminClient();
  let createdUserId: string | undefined;
  try {
    const body = await parseBody(request);
    const username = normalizeHandle(body.username);
    const password = body.password;
    const handleError = validateHandle(username);
    const passwordError = validatePassword(password);
    if (handleError || passwordError) return json({ error: handleError ?? passwordError }, 400);

    const rateKey = await enforceRateLimit(admin, request, 'register', username, 5);
    const { data: existing } = await admin.rpc('server_auth_lookup_handle', { p_handle: username }).maybeSingle();
    if (existing) return json({ error: 'Username is unavailable.' }, 409);

    const internalDomain = Deno.env.get('AUTH_INTERNAL_DOMAIN') || 'auth.macheck.invalid';
    const internalEmail = `${crypto.randomUUID()}@${internalDomain}`;
    const recoveryCode = createRecoveryCode();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: String(password),
      email_confirm: true,
    });
    if (createError || !created.user) throw createError ?? new Error('User creation failed');
    createdUserId = created.user.id;

    const { error: mappingError } = await admin.rpc('server_auth_insert_handle', {
      p_user_id: createdUserId,
      p_handle: username,
      p_internal_email: internalEmail,
      p_recovery_code_hash: await sha256(recoveryCode),
    });
    if (mappingError) throw mappingError;

    const { data: signedIn, error: signInError } = await publicClient().auth.signInWithPassword({
      email: internalEmail,
      password: String(password),
    });
    if (signInError) throw signInError;
    await clearRateLimit(admin, rateKey);
    return json({ ...sessionPayload(signedIn.session), username, recovery_code: recoveryCode }, 201);
  } catch (error) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    if (error instanceof RateLimitError) return json({ error: error.message }, 429);
    console.error('register-username failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Unable to create account.' }, 500);
  }
});
