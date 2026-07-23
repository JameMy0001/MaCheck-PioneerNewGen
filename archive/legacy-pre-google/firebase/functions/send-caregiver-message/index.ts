import { createClient } from 'npm:@supabase/supabase-js@2';

import { adminClient, corsHeaders, json } from '../_shared/auth.ts';

interface PushTicket {
  status?: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'กรุณาเข้าสู่ระบบอีกครั้ง' }, 401);

  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 4096) return json({ error: 'ข้อความมีขนาดใหญ่เกินไป' }, 413);
    const body = await request.json() as Record<string, unknown>;
    const patientUserId = String(body.patientUserId ?? '');
    const text = String(body.text ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(patientUserId)) return json({ error: 'ไม่พบบัญชีผู้รับ' }, 400);

    const userClient = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_ANON_KEY'),
      {
        global: { headers: { Authorization: authorization } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    const { data: userResult, error: userError } = await userClient.auth.getUser();
    if (userError || !userResult.user) return json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' }, 401);

    const { data: messageId, error: messageError } = await userClient.rpc('caregiver_send_message', {
      p_patient_user_id: patientUserId,
      p_text: text,
    });
    if (messageError || !messageId) return json({ error: messageError?.message || 'ส่งข้อความไม่สำเร็จ' }, 400);

    const admin = adminClient();
    const { data: tokenRows, error: tokenError } = await admin
      .from('user_push_tokens')
      .select('id,expo_push_token')
      .eq('user_id', patientUserId)
      .is('disabled_at', null)
      .limit(20);
    if (tokenError) throw tokenError;

    const tokens = tokenRows ?? [];
    if (!tokens.length) return json({ messageId, pushAttempted: 0, pushAccepted: 0 });

    let tickets: PushTicket[] = [];
    try {
      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokens.map((token) => ({
          to: token.expo_push_token,
          title: 'ข้อความใหม่จากผู้ดูแล',
          body: text.trim(),
          sound: 'default',
          priority: 'high',
          channelId: 'caregiver-messages',
          data: {
            type: 'caregiver_message',
            messageId,
            url: '/caregiver-messages',
          },
          ttl: 86400,
        }))),
      });
      if (!pushResponse.ok) throw new Error(`Expo Push Service returned ${pushResponse.status}`);
      const pushBody = await pushResponse.json() as { data?: PushTicket | PushTicket[] };
      tickets = Array.isArray(pushBody.data) ? pushBody.data : pushBody.data ? [pushBody.data] : [];

      const invalidTokenIds = tickets
        .map((ticket, index) => ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
          ? tokens[index]?.id
          : undefined)
        .filter((id): id is string => Boolean(id));
      if (invalidTokenIds.length) {
        await admin.from('user_push_tokens').update({ disabled_at: new Date().toISOString() }).in('id', invalidTokenIds);
      }
    } catch (pushError) {
      console.error('Caregiver push delivery deferred', pushError instanceof Error ? pushError.message : 'unknown');
    }

    return json({
      messageId,
      pushAttempted: tokens.length,
      pushAccepted: tickets.filter((ticket) => ticket.status === 'ok').length,
    });
  } catch (error) {
    console.error('send-caregiver-message failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'บันทึกข้อความไม่สำเร็จ กรุณาลองใหม่' }, 500);
  }
});
