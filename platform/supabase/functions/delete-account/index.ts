import { adminClient, corsHeaders, json, publicClient } from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data, error } = await publicClient().auth.getUser(token);
    if (error || !data.user) return json({ error: 'Unauthorized' }, 401);
    const { error: deleteError } = await adminClient().auth.admin.deleteUser(data.user.id);
    if (deleteError) throw deleteError;
    return json({ deleted: true });
  } catch (error) {
    console.error('delete-account failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Unable to delete account.' }, 500);
  }
});

