import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { ClinicalFields, PageHeader } from '../components/ClinicalFields';
import { BulkClinicalActions, type BulkClinicalAction } from '../components/BulkClinicalActions';
import { Badge, Button, EmptyState, ErrorBanner, Field, listText, Loading, Modal, SuccessBanner, toList } from '../components/ui';
import { bulkUpdateMedications, deleteClinicalRecord, listMedications, saveMedication } from '../lib/api';
import type { AdminRole, ClinicalStatus, Medication } from '../types';

const blank: Partial<Medication> = {
  code: '', name_en: '', name_th: '', category: '', common_dosages_mg: [], description_th: '', active: true,
  status: 'draft', source_references: [], review_notes: '', reviewed_at: null,
};

export function Medications({ role }: { role: AdminRole }) {
  const [rows, setRows] = useState<Medication[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ClinicalStatus>('all');
  const [editing, setEditing] = useState<Partial<Medication> | null>(null);
  const [originalCode, setOriginalCode] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const canEdit = role !== 'auditor';

  const load = useCallback(() => listMedications().then(setRows).catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ')).finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((row) => {
    const query = search.trim().toLowerCase();
    return (status === 'all' || row.status === status) && (!query || `${row.code} ${row.name_en} ${row.name_th} ${row.category}`.toLowerCase().includes(query));
  }), [rows, search, status]);
  const selectableRows = useMemo(() => filtered.filter((row) => row.status === 'draft' || row.status === 'in_review'), [filtered]);
  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);
  const allSelectableSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedSet.has(row.code));

  useEffect(() => { setSelectedCodes([]); }, [search, status]);

  const toggleSelected = (code: string) => {
    setSelectedCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  };

  const toggleAll = () => {
    setSelectedCodes(allSelectableSelected ? [] : selectableRows.map((row) => row.code));
  };

  const applyBulkAction = async (action: BulkClinicalAction, reviewedAt: string) => {
    setBulkSaving(true); setError(''); setSuccess('');
    try {
      const result = await bulkUpdateMedications(selectedCodes, action, reviewedAt);
      setSelectedCodes([]);
      setSuccess(action === 'published'
        ? `เผยแพร่และเปิดให้ทั้งสองแอปค้นหาแล้ว ${result.updated} รายการ`
        : `ส่งให้ตรวจทานแล้ว ${result.updated} รายการ`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'อัปเดตหลายรายการไม่สำเร็จ');
    } finally {
      setBulkSaving(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing?.code || !editing.name_en || !editing.name_th || !editing.category) return setError('กรุณากรอกข้อมูลยาที่จำเป็นให้ครบ');
    if (!/^[a-z][a-z0-9_-]*$/.test(editing.code)) return setError('รหัสยาต้องเป็นตัวอังกฤษเล็กและไม่มีช่องว่าง');
    setSaving(true); setError('');
    try {
      await saveMedication(editing, originalCode);
      setEditing(null); setOriginalCode(undefined); setSuccess('บันทึกรายการยาแล้ว'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const remove = async (row: Medication) => {
    if (!window.confirm(`ลบ ${row.name_th} ถาวรหรือไม่? หากมีข้อมูลอ้างอิงอยู่ ระบบจะปฏิเสธการลบ`)) return;
    try { await deleteClinicalRecord('medications', row.code); setSuccess('ลบรายการแล้ว'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'ลบไม่สำเร็จ'); }
  };

  return (
    <>
      <PageHeader eyebrow="Clinical catalogue" title="รายการยา" detail="แหล่งข้อมูลยากลางที่ YaCheck และ MaCheck ใช้ร่วมกัน" action={canEdit ? <Button onClick={() => { setEditing({ ...blank }); setOriginalCode(undefined); }}>+ เพิ่มยา</Button> : undefined} />
      {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}{success ? <SuccessBanner message={success} /> : null}
      <div className="toolbar"><input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารหัส ชื่อไทย ชื่ออังกฤษ หรือหมวดหมู่" /><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">ทุกสถานะ</option><option value="draft">ฉบับร่าง</option><option value="in_review">รอตรวจทาน</option><option value="published">เผยแพร่แล้ว</option><option value="archived">เก็บถาวร</option></select><span className="result-count">{filtered.length} รายการ</span></div>
      {canEdit ? <BulkClinicalActions selectedCount={selectedCodes.length} role={role} publishingLabel="เผยแพร่และเปิดให้ทั้งสองแอปค้นหา" busy={bulkSaving} onApply={applyBulkAction} /> : null}
      {loading ? <Loading /> : filtered.length ? (
        <div className="table-wrap"><table><thead><tr>{canEdit ? <th className="select-cell"><input type="checkbox" checked={allSelectableSelected} disabled={selectableRows.length === 0 || bulkSaving} onChange={toggleAll} aria-label="เลือกยาทั้งหมดในผลการค้นหา" /></th> : null}<th>ยา</th><th>หมวดหมู่</th><th>ขนาดที่พบบ่อย</th><th>สถานะ</th><th>เวอร์ชัน</th><th /></tr></thead><tbody>{filtered.map((row) => {
          const selectable = row.status === 'draft' || row.status === 'in_review';
          return <tr key={row.code}>{canEdit ? <td className="select-cell"><input type="checkbox" checked={selectedSet.has(row.code)} disabled={!selectable || bulkSaving} onChange={() => toggleSelected(row.code)} aria-label={`เลือก ${row.name_th}`} /></td> : null}<td><strong>{row.name_th}</strong><small>{row.name_en} · {row.code}</small></td><td>{row.category}</td><td>{row.common_dosages_mg.join(', ') || '—'}</td><td><Badge status={row.status} /></td><td>v{row.dataset_version}</td><td className="row-actions"><button onClick={() => { setEditing({ ...row }); setOriginalCode(row.code); }}>{canEdit ? 'แก้ไข' : 'ดู'}</button>{role === 'owner' ? <button className="danger-link" onClick={() => void remove(row)}>ลบ</button> : null}</td></tr>;
        })}</tbody></table></div>
      ) : <EmptyState title="ไม่พบรายการยา" detail="ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ" />}
      {editing ? <Modal title={originalCode ? `แก้ไข ${editing.name_th}` : 'เพิ่มรายการยา'} onClose={() => setEditing(null)} wide><form onSubmit={submit} className="form-grid"><Field label="รหัสยา" hint="ใช้เป็นกุญแจกลาง ห้ามเปลี่ยนหลังสร้าง"><input value={editing.code ?? ''} disabled={Boolean(originalCode) || !canEdit} onChange={(event) => setEditing({ ...editing, code: event.target.value.toLowerCase() })} required /></Field><Field label="หมวดหมู่"><input value={editing.category ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, category: event.target.value })} required /></Field><Field label="ชื่ออังกฤษ"><input value={editing.name_en ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, name_en: event.target.value })} required /></Field><Field label="ชื่อไทย"><input value={editing.name_th ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, name_th: event.target.value })} required /></Field><Field label="ขนาดยา (mg)" hint="คั่นด้วย comma"><input value={(editing.common_dosages_mg ?? []).join(', ')} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, common_dosages_mg: toList(event.target.value).map(Number).filter(Number.isFinite) })} /></Field><Field label="การใช้งาน"><label className="check"><input type="checkbox" checked={editing.active ?? true} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> เปิดให้แอปค้นหา</label></Field><Field label="คำอธิบาย" full><textarea rows={4} value={editing.description_th ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, description_th: event.target.value })} /></Field>{canEdit ? <ClinicalFields role={role} status={editing.status ?? 'draft'} sources={editing.source_references ?? []} notes={editing.review_notes ?? ''} reviewedAt={editing.reviewed_at ?? null} onChange={(change) => setEditing({ ...editing, ...change })} /> : <Field label="แหล่งอ้างอิง" full><textarea readOnly rows={3} value={listText(editing.source_references)} /></Field>}<div className="form-actions"><Button tone="secondary" onClick={() => setEditing(null)}>ยกเลิก</Button>{canEdit ? <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</Button> : null}</div></form></Modal> : null}
    </>
  );
}
