import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = 4180;
const projectUrl = 'https://witsidzbewjkcnvnnapi.supabase.co';
const userId = process.env.RESET_USER_ID;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const nonce = randomBytes(24).toString('hex');

if (!userId || !serviceKey) {
  throw new Error('Missing reset credentials.');
}

const page = (content) => `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'">
<title>ตั้งรหัสผ่านใหม่ · dev_01</title><style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17211f;background:#f3f6f5}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(460px,100%);padding:34px;border:1px solid #dce4e1;border-radius:22px;background:#fff;box-shadow:0 24px 70px rgba(23,78,71,.12)}.mark{width:48px;height:48px;border-radius:14px;background:#216e63;color:#fff;display:grid;place-items:center;font-size:23px;font-weight:900}h1{margin:22px 0 8px;font-size:27px}p{color:#687570;line-height:1.6}.account{margin:20px 0;padding:12px 14px;border-radius:10px;background:#edf7f4;color:#174e47;font-weight:800}label{display:grid;gap:7px;margin:15px 0;font-size:13px;font-weight:800}input{width:100%;padding:11px 12px;border:1px solid #cfd8d5;border-radius:9px;font:inherit}input:focus{outline:0;border-color:#216e63;box-shadow:0 0 0 3px rgba(33,110,99,.1)}button{width:100%;margin-top:10px;padding:12px;border:0;border-radius:10px;background:#216e63;color:#fff;font:inherit;font-weight:800;cursor:pointer}.note{margin-bottom:0;font-size:12px}.success{color:#067647}.error{color:#b42318}
</style></head><body><main class="card"><div class="mark">✓</div>${content}</main></body></html>`;

const formPage = page(`<h1>ตั้งรหัสผ่านใหม่</h1>
<p>หน้านี้ทำงานเฉพาะในเครื่องของคุณและจะปิดอัตโนมัติหลังเปลี่ยนรหัสสำเร็จ</p>
<div class="account">บัญชี: dev_01 · Owner</div>
<form method="post" autocomplete="off">
  <input type="hidden" name="nonce" value="${nonce}">
  <label>รหัสผ่านใหม่<input name="password" type="password" minlength="10" required autocomplete="new-password"></label>
  <label>ยืนยันรหัสผ่านใหม่<input name="confirm" type="password" minlength="10" required autocomplete="new-password"></label>
  <button type="submit">เปลี่ยนรหัสผ่าน</button>
</form><p class="note">ใช้ตั้งแต่ 10 ตัวอักษรขึ้นไป และไม่ควรใช้รหัสเดียวกับบริการอื่น</p>`);

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');

  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(formPage);
    return;
  }

  if (request.method !== 'POST' || request.url !== '/') {
    response.writeHead(404).end();
    return;
  }

  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4096) {
      response.writeHead(413).end();
      return;
    }
  }

  const fields = new URLSearchParams(body);
  const submittedNonce = fields.get('nonce') ?? '';
  const password = fields.get('password') ?? '';
  const confirm = fields.get('confirm') ?? '';
  const nonceMatches = submittedNonce.length === nonce.length
    && timingSafeEqual(Buffer.from(submittedNonce), Buffer.from(nonce));

  if (!nonceMatches || password.length < 10 || password !== confirm) {
    response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page('<h1 class="error">เปลี่ยนรหัสไม่สำเร็จ</h1><p>รหัสผ่านต้องตรงกันและมีอย่างน้อย 10 ตัวอักษร กรุณาย้อนกลับแล้วลองใหม่</p>'));
    return;
  }

  const updateResponse = await fetch(`${projectUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  if (!updateResponse.ok) {
    response.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page('<h1 class="error">Supabase ปฏิเสธคำขอ</h1><p>ยังไม่มีการเปลี่ยนรหัสผ่าน กรุณาปิดหน้านี้และแจ้งให้ผู้ดูแลตรวจสอบ</p>'));
    return;
  }

  serviceKey = '';
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(page('<h1 class="success">เปลี่ยนรหัสผ่านแล้ว</h1><p>กลับไปหน้า Clinical Admin แล้วล็อกอินด้วย username <strong>dev_01</strong> และรหัสผ่านใหม่ได้ทันที</p>'));
  setTimeout(() => server.close(), 1500);
});

server.listen(port, host, () => {
  console.log(`RESET_READY=http://${host}:${port}/`);
});
