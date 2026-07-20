import { useState, type FormEvent } from 'react';

import { loginWithUsername } from '../lib/supabase';
import { Button, ErrorBanner, Field } from './ui';

export function Login({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithUsername(username, password);
      await onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark" aria-hidden="true"><span>✓</span><i /></div>
        <p className="eyebrow">YaCheck · MaCheck</p>
        <h1>Clinical Data Admin</h1>
        <p className="login-card__intro">ศูนย์จัดการข้อมูลยา การตรวจทาน และความปลอดภัยของทั้งสองแอป</p>
        {error ? <ErrorBanner message={error} /> : null}
        <form onSubmit={submit} className="form-stack">
          <Field label="Username">
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="username ของ YaCheck / MaCheck" required />
          </Field>
          <Field label="รหัสผ่าน">
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <Button type="submit" disabled={loading || !username || !password}>{loading ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบแอดมิน'}</Button>
        </form>
        <p className="security-note">บัญชีทั่วไปจะไม่สามารถเปิดหน้านี้ได้ แม้ทราบ URL</p>
      </section>
    </main>
  );
}
