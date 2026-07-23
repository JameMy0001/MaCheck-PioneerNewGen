import {
  adminClient, clearRateLimit, corsHeaders, createRecoveryCode, enforceRateLimit, json,
  normalizeHandle, parseBody, publicClient, RateLimitError, sessionPayload, sha256,
  safeEqual, validateHandle, validatePassword,
} from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = adminClient();
  try {
    const body = await parseBody(request);
    const username = normalizeHandle(body.username);
    const recoveryCode = String(body.recovery_code ?? '').toUpperCase().trim();
    const newPassword = body.new_password;
    const validationError = validateHandle(username) ?? validatePassword(newPassword);
    if (validationError || recoveryCode.length < 20) return json({ error: validationError ?? 'Invalid recovery code.' }, 400);
    const rateKey = await enforceRateLimit(admin, request, 'recover', username, 5);

    const { data: account } = await admin.rpc('server_auth_lookup_handle', { p_handle: username }).maybeSingle();
    if (!account || !safeEqual(await sha256(recoveryCode), account.recovery_code_hash)) {
      return json({ error: 'Invalid username or recovery code.' }, 401);
    }

    const nextRecoveryCode = createRecoveryCode();
    const { error: updateError } = await admin.auth.admin.updateUserById(account.user_id, { password: String(newPassword) });
    if (updateError) throw updateError;
    const { data, error } = await publicClient().auth.signInWithPassword({ email: account.internal_email, password: String(newPassword) });
    if (error) throw error;
    const { error: mappingError } = await admin.rpc('server_auth_rotate_recovery', {
      p_user_id: account.user_id,
      p_recovery_code_hash: await sha256(nextRecoveryCode),
    });
    if (mappingError) throw mappingError;
    await clearRateLimit(admin, rateKey);
    return json({ ...sessionPayload(data.session), username, recovery_code: nextRecoveryCode });
  } catch (error) {
    if (error instanceof RateLimitError) return json({ error: error.message }, 429);
    console.error('recover-username failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Unable to recover account.' }, 500);
  }
});
