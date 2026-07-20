import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { PageHeader } from '../components/ClinicalFields';
import { Button, dateText, ErrorBanner, Field, Loading, Modal, SuccessBanner } from '../components/ui';
import { listAdminMembers, setAdminMember } from '../lib/api';
import type { AdminMember, AdminRole } from '../types';

const labels: Record<AdminRole, string> = { owner: 'Owner', clinical_editor: 'Clinical editor', clinical_reviewer: 'Clinical reviewer', auditor: 'Auditor' };

export function Admins({ role }: { role: AdminRole }) {
  const [rows, setRows] = useState<AdminMember[]>([]); const [editing, setEditing] = useState<{ handle: string; role: AdminRole; active: boolean } | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = useCallback(() => listAdminMembers().then(setRows).catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดทีมไม่สำเร็จ')).finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!editing?.handle) return; setSaving(true); setError(''); try { await setAdminMember(editing.handle, editing.role, editing.active); setEditing(null); setSuccess('อัปเดตสิทธิ์แอดมินแล้ว'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'อัปเดตสิทธิ์ไม่สำเร็จ'); } finally { setSaving(false); } };
  return <>
    <PageHeader eyebrow="Access control" title="ทีมแอดมิน" detail="กำหนดหน้าที่แบบแยกผู้แก้ไข ผู้ตรวจทาน ผู้ตรวจสอบ และเจ้าของระบบ" action={role === 'owner' ? <Button onClick={() => setEditing({ handle: '', role: 'clinical_editor', active: true })}>+ เพิ่มสมาชิก</Button> : undefined} />
    {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}{success ? <SuccessBanner message={success} /> : null}
    <section className="role-guide"><div><strong>Owner</strong><span>จัดการทุกอย่างและทีม</span></div><div><strong>Clinical editor</strong><span>สร้าง Draft และส่งตรวจ</span></div><div><strong>Clinical reviewer</strong><span>ตรวจทานและเผยแพร่</span></div><div><strong>Auditor</strong><span>อ่านข้อมูลและ Audit log</span></div></section>
    {loading ? <Loading /> : <div className="table-wrap"><table><thead><tr><th>Username</th><th>สิทธิ์</th><th>สถานะ</th><th>เพิ่มเมื่อ</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.user_id}><td><strong>@{row.handle}</strong></td><td>{labels[row.role]}</td><td><span className={row.active ? 'status-active' : 'status-inactive'}>{row.active ? 'Active' : 'Disabled'}</span></td><td>{dateText(row.created_at)}</td><td className="row-actions">{role === 'owner' ? <button onClick={() => setEditing({ handle: row.handle, role: row.role, active: row.active })}>จัดการสิทธิ์</button> : null}</td></tr>)}</tbody></table></div>}
    {editing ? <Modal title={rows.some((row) => row.handle === editing.handle) ? 'แก้ไขสิทธิ์แอดมิน' : 'เพิ่มแอดมิน'} onClose={() => setEditing(null)}><form onSubmit={submit} className="form-stack"><Field label="Username" hint="ต้องเป็นบัญชีที่สมัครใน YaCheck หรือ MaCheck แล้ว"><input value={editing.handle} disabled={rows.some((row) => row.handle === editing.handle)} onChange={(event) => setEditing({ ...editing, handle: event.target.value.toLowerCase() })} required /></Field><Field label="บทบาท"><select value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value as AdminRole })}><option value="owner">Owner</option><option value="clinical_editor">Clinical editor</option><option value="clinical_reviewer">Clinical reviewer</option><option value="auditor">Auditor</option></select></Field><Field label="สถานะ"><label className="check"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> เปิดใช้งานสิทธิ์นี้</label></Field><div className="form-actions"><Button tone="secondary" onClick={() => setEditing(null)}>ยกเลิก</Button><Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'ยืนยันสิทธิ์'}</Button></div></form></Modal> : null}
  </>;
}
