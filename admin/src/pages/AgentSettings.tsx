import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { PageHeader } from '../components/ClinicalFields';
import { Button, dateText, ErrorBanner, Field, Loading, SuccessBanner } from '../components/ui';
import {
  getAgentRuntimeConfig,
  rotateAgentApiKey,
  testAgentConnection,
  updateAgentRuntimeConfig,
} from '../lib/api';
import type { AdminRole, AgentRuntimeConfig } from '../types';

const modelOptions = [
  { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B · คุณภาพสูง' },
  { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B · ตอบเร็ว' },
  { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B · วิเคราะห์ละเอียด' },
] as const;

export function AgentSettings({ role }: { role: AdminRole }) {
  const [config, setConfig] = useState<AgentRuntimeConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [rotationConfirmation, setRotationConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = role === 'owner';
  const load = useCallback(async () => {
    setError('');
    try {
      setConfig(await getAgentRuntimeConfig());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'โหลดการตั้งค่า AI Agent ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveConfig = async (event: FormEvent) => {
    event.preventDefault();
    if (!config || !isOwner) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      setConfig(await updateAgentRuntimeConfig(config));
      setSuccess('บันทึก Runtime configuration แล้ว การวิเคราะห์ครั้งถัดไปจะใช้ค่าใหม่นี้');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const rotateKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!isOwner || rotationConfirmation !== 'ROTATE') return;
    setRotating(true);
    setError('');
    setSuccess('');
    try {
      const result = await rotateAgentApiKey(apiKey);
      setApiKey('');
      setRotationConfirmation('');
      setConfig((current) => current ? { ...current, keyConfigured: true } : current);
      setSuccess(`หมุน NVIDIA API key สำเร็จ · fingerprint ${result.fingerprint}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'หมุน API key ไม่สำเร็จ');
    } finally {
      setRotating(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      const result = await testAgentConnection();
      setSuccess(`เชื่อมต่อ NVIDIA สำเร็จ · ${result.latencyMs} ms · ${result.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ทดสอบการเชื่อมต่อไม่สำเร็จ');
    } finally {
      setTesting(false);
    }
  };

  return <>
    <PageHeader
      eyebrow="Agent operations"
      title="จัดการ AI Agent"
      detail="ควบคุมโมเดล การเปิดใช้งาน และการเชื่อมต่อผู้ให้บริการ โดยไม่เปิดเผย API key ใน browser หรือฐานข้อมูลทั่วไป"
      action={<Button tone="secondary" onClick={() => void testConnection()} disabled={testing || !config}>{testing ? 'กำลังทดสอบ…' : 'ทดสอบการเชื่อมต่อ'}</Button>}
    />
    {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}
    {success ? <SuccessBanner message={success} /> : null}
    {loading ? <Loading /> : config ? <div className="agent-admin-grid">
      <section className="panel agent-status-panel">
        <div className="panel__heading"><h2>สถานะระบบ</h2><span className={config.aiEnabled ? 'status-active' : 'status-inactive'}>{config.aiEnabled ? 'AI Live เปิดอยู่' : 'Rules-only mode'}</span></div>
        <div className="agent-status-list">
          <div><span>Provider</span><strong>NVIDIA NIM</strong></div>
          <div><span>API key</span><strong className={config.keyConfigured ? 'text-success' : 'text-danger'}>{config.keyConfigured ? 'เข้ารหัสใน Supabase Vault แล้ว' : 'ยังไม่ได้ตั้งค่า'}</strong></div>
          <div><span>Safety policy</span><strong>ล็อกในโค้ด · แอดมินแก้ผ่านหน้าเว็บไม่ได้</strong></div>
          <div><span>อัปเดตล่าสุด</span><strong>{dateText(config.updatedAt)}</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__heading"><h2>Runtime configuration</h2><span className="role-chip role-chip--light">{isOwner ? 'Owner edit' : 'Read only'}</span></div>
        <form className="form-stack" onSubmit={saveConfig}>
          <Field label="เปิดใช้ Generative AI" hint="เมื่อปิด ระบบยังคงทำ deterministic safety screening และแสดง Rules-only mode">
            <span className="check"><input type="checkbox" checked={config.aiEnabled} disabled={!isOwner} onChange={(event) => setConfig({ ...config, aiEnabled: event.target.checked })} /> อนุญาตให้ Agent เรียกโมเดลภาษา</span>
          </Field>
          <div className="form-grid">
            <Field label="Primary model"><select value={config.primaryModel} disabled={!isOwner} onChange={(event) => setConfig({ ...config, primaryModel: event.target.value })}>{modelOptions.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}</select></Field>
            <Field label="Fallback model"><select value={config.fallbackModel} disabled={!isOwner} onChange={(event) => setConfig({ ...config, fallbackModel: event.target.value })}>{modelOptions.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}</select></Field>
            <Field label="Temperature" hint="จำกัดไว้ที่ 0.00–0.30"><input type="number" min="0" max="0.3" step="0.05" value={config.temperature} disabled={!isOwner} onChange={(event) => setConfig({ ...config, temperature: Number(event.target.value) })} /></Field>
            <Field label="Max output tokens" hint="128–800 tokens"><input type="number" min="128" max="800" step="1" value={config.maxTokens} disabled={!isOwner} onChange={(event) => setConfig({ ...config, maxTokens: Number(event.target.value) })} /></Field>
            <Field label="Request timeout" hint="3,000–30,000 milliseconds"><input type="number" min="3000" max="30000" step="1000" value={config.requestTimeoutMs} disabled={!isOwner} onChange={(event) => setConfig({ ...config, requestTimeoutMs: Number(event.target.value) })} /></Field>
            <Field label="Prompt version" hint="เป็นเลขเวอร์ชันสำหรับ Audit ไม่ใช่ช่องแก้ safety prompt"><input value={config.promptVersion} maxLength={80} disabled={!isOwner} onChange={(event) => setConfig({ ...config, promptVersion: event.target.value })} /></Field>
          </div>
          {isOwner ? <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก Runtime config'}</Button></div> : null}
        </form>
      </section>

      <section className="panel agent-key-panel">
        <div className="panel__heading"><h2>หมุน NVIDIA API key</h2><span className="secret-badge">Write only</span></div>
        <p className="muted">ระบบไม่แสดงคีย์ปัจจุบันและไม่บันทึก plaintext ในตาราง ค่าใหม่จะถูกเข้ารหัสใน Supabase Vault ผ่าน Edge Function ที่ตรวจสิทธิ์ Owner</p>
        {isOwner ? <form className="form-stack" onSubmit={rotateKey} autoComplete="off">
          <Field label="API key ใหม่" hint="ค่าจะอยู่ในหน่วยความจำของฟอร์มชั่วคราวและถูกล้างหลังบันทึก"><input type="password" value={apiKey} autoComplete="new-password" placeholder="nvapi-••••••••••••••••" onChange={(event) => setApiKey(event.target.value)} required /></Field>
          <Field label="ยืนยันการหมุนคีย์" hint="พิมพ์ ROTATE เพื่อป้องกันการเปลี่ยนโดยไม่ตั้งใจ"><input value={rotationConfirmation} autoCapitalize="characters" onChange={(event) => setRotationConfirmation(event.target.value.toUpperCase())} placeholder="ROTATE" required /></Field>
          <div className="form-actions"><Button type="submit" tone="danger" disabled={rotating || !apiKey || rotationConfirmation !== 'ROTATE'}>{rotating ? 'กำลังหมุนคีย์…' : 'Rotate API key'}</Button></div>
        </form> : <div className="inline-warning">เฉพาะ Owner เท่านั้นที่หมุน API key ได้</div>}
      </section>

      <section className="panel agent-safety-panel">
        <div className="panel__heading"><h2>ส่วนที่ล็อกเพื่อความปลอดภัย</h2></div>
        <ul>
          <li>ห้าม AI กำหนด เพิ่ม ลด หยุด หรือเปลี่ยนยา</li>
          <li>ตรวจคำตอบที่มีตัวเลขขนาดยาและคำสั่งรักษาก่อนส่งให้ผู้ใช้</li>
          <li>ใช้ Clinical Rules ก่อน LLM และกลับสู่ Rules-only mode เมื่อผู้ให้บริการล้มเหลว</li>
          <li>API key อ่านกลับไม่ได้และจะไม่ปรากฏใน Audit log</li>
        </ul>
      </section>
    </div> : null}
  </>;
}
