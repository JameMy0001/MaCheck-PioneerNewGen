import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { ClinicalFields, PageHeader } from '../components/ClinicalFields';
import { BulkClinicalActions, type BulkClinicalAction } from '../components/BulkClinicalActions';
import { Badge, Button, EmptyState, ErrorBanner, Field, listText, Loading, Modal, SuccessBanner, toList } from '../components/ui';
import { bulkUpdateFoodInteractions, deleteClinicalRecord, listFoodInteractions, listMedications, saveFoodInteraction } from '../lib/api';
import type { AdminRole, ClinicalStatus, FoodInteraction, Medication } from '../types';

const blank: Partial<FoodInteraction> = { code: '', food_th: '', keywords: [], medicine_codes: [], disease_codes: [], severity: 'moderate', description_th: '', status: 'draft', source_references: [], review_notes: '', reviewed_at: null };

export function FoodInteractions({ role }: { role: AdminRole }) {
  const [rows, setRows] = useState<FoodInteraction[]>([]); const [medications, setMedications] = useState<Medication[]>([]); const [editing, setEditing] = useState<Partial<FoodInteraction> | null>(null); const [originalCode, setOriginalCode] = useState<string>();
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<'all' | ClinicalStatus>('all'); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]); const [bulkSaving, setBulkSaving] = useState(false);
  const canEdit = role !== 'auditor';
  const load = useCallback(() => Promise.all([listFoodInteractions(), listMedications()]).then(([nextRows, nextMeds]) => { setRows(nextRows); setMedications(nextMeds); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ')).finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => rows.filter((row) => { const query = search.trim().toLowerCase(); return (status === 'all' || row.status === status) && (!query || `${row.code} ${row.food_th} ${row.keywords.join(' ')}`.toLowerCase().includes(query)); }), [rows, search, status]);
  const selectableRows = useMemo(() => filtered.filter((row) => row.status === 'draft' || row.status === 'in_review'), [filtered]);
  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);
  const allSelectableSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedSet.has(row.code));
  useEffect(() => { setSelectedCodes([]); }, [search, status]);
  const toggleSelected = (code: string) => setSelectedCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  const toggleAll = () => setSelectedCodes(allSelectableSelected ? [] : selectableRows.map((row) => row.code));
  const applyBulkAction = async (action: BulkClinicalAction, reviewedAt: string) => {
    setBulkSaving(true); setError(''); setSuccess('');
    try {
      const result = await bulkUpdateFoodInteractions(selectedCodes, action, reviewedAt);
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
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); if (!editing?.code || !editing.food_th || !editing.description_th) return setError('กรุณากรอกรหัส ชื่อ และคำอธิบายให้ครบ'); setSaving(true); try { await saveFoodInteraction(editing, originalCode); setEditing(null); setOriginalCode(undefined); setSuccess('บันทึกข้อมูลอาหารและยาแล้ว'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); } };
  const remove = async (row: FoodInteraction) => { if (!window.confirm(`ลบ ${row.food_th} ถาวรหรือไม่?`)) return; try { await deleteClinicalRecord('food_interactions', row.code); setSuccess('ลบรายการแล้ว'); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'ลบไม่สำเร็จ'); } };

  return <>
    <PageHeader eyebrow="Safety rules" title="อาหาร สมุนไพร และยา" detail="จัดการความเสี่ยงจากอาหาร เครื่องดื่ม สมุนไพร ยา และโรคประจำตัว" action={canEdit ? <Button onClick={() => { setEditing({ ...blank }); setOriginalCode(undefined); }}>+ เพิ่มรายการ</Button> : undefined} />
    {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}{success ? <SuccessBanner message={success} /> : null}
    <div className="toolbar"><input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาอาหาร สมุนไพร หรือ keyword" /><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">ทุกสถานะ</option><option value="draft">ฉบับร่าง</option><option value="in_review">รอตรวจทาน</option><option value="published">เผยแพร่แล้ว</option><option value="archived">เก็บถาวร</option></select><span className="result-count">{filtered.length} รายการ</span></div>
    {canEdit ? <BulkClinicalActions selectedCount={selectedCodes.length} role={role} publishingLabel="เผยแพร่และเปิดให้ทั้งสองแอปค้นหา" busy={bulkSaving} onApply={applyBulkAction} /> : null}
    {loading ? <Loading /> : filtered.length ? <div className="table-wrap"><table><thead><tr>{canEdit ? <th className="select-cell"><input type="checkbox" checked={allSelectableSelected} disabled={selectableRows.length === 0 || bulkSaving} onChange={toggleAll} aria-label="เลือกข้อมูลอาหารทั้งหมดในผลการค้นหา" /></th> : null}<th>รายการ</th><th>Keyword</th><th>เกี่ยวข้องกับ</th><th>ระดับ</th><th>สถานะ</th><th /></tr></thead><tbody>{filtered.map((row) => {
      const selectable = row.status === 'draft' || row.status === 'in_review';
      return <tr key={row.code}>{canEdit ? <td className="select-cell"><input type="checkbox" checked={selectedSet.has(row.code)} disabled={!selectable || bulkSaving} onChange={() => toggleSelected(row.code)} aria-label={`เลือก ${row.food_th}`} /></td> : null}<td><strong>{row.food_th}</strong><small>{row.code}</small></td><td className="chips-cell">{row.keywords.slice(0, 4).map((item) => <span className="mini-chip" key={item}>{item}</span>)}</td><td>{row.medicine_codes.length} ยา · {row.disease_codes.length} โรค</td><td><Badge severity={row.severity} /></td><td><Badge status={row.status} /></td><td className="row-actions"><button onClick={() => { setEditing({ ...row }); setOriginalCode(row.code); }}>{canEdit ? 'แก้ไข' : 'ดู'}</button>{role === 'owner' ? <button className="danger-link" onClick={() => void remove(row)}>ลบ</button> : null}</td></tr>;
    })}</tbody></table></div> : <EmptyState title="ไม่พบข้อมูลอาหาร" detail="ลองเปลี่ยนคำค้นหาหรือตัวกรอง" />}
    {editing ? <Modal title={originalCode ? `แก้ไข ${editing.food_th}` : 'เพิ่มอาหารหรือสมุนไพร'} onClose={() => setEditing(null)} wide><form onSubmit={submit} className="form-grid"><Field label="รหัสรายการ"><input value={editing.code ?? ''} disabled={Boolean(originalCode) || !canEdit} onChange={(event) => setEditing({ ...editing, code: event.target.value.toLowerCase().replace(/\s+/g, '-') })} required /></Field><Field label="ชื่อที่แสดง"><input value={editing.food_th ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, food_th: event.target.value })} required /></Field><Field label="ระดับความเสี่ยง"><select value={editing.severity ?? 'moderate'} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, severity: event.target.value as FoodInteraction['severity'] })}><option value="moderate">เฝ้าระวัง</option><option value="severe">รุนแรง</option></select></Field><Field label="Keywords" hint="คั่นด้วย comma หรือขึ้นบรรทัดใหม่"><textarea rows={3} value={listText(editing.keywords)} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, keywords: toList(event.target.value) })} /></Field><Field label="รหัสยาที่เกี่ยวข้อง" hint="เลือกได้หลายรายการ" full><select multiple size={6} value={editing.medicine_codes ?? []} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, medicine_codes: Array.from(event.target.selectedOptions, (option) => option.value) })}>{medications.map((med) => <option value={med.code} key={med.code}>{med.name_th} ({med.code})</option>)}</select></Field><Field label="รหัสโรค" hint="เช่น diabetes, kidney, heart" full><input value={(editing.disease_codes ?? []).join(', ')} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, disease_codes: toList(event.target.value) })} /></Field><Field label="คำอธิบายความเสี่ยง" full><textarea rows={4} value={editing.description_th ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, description_th: event.target.value })} required /></Field>{canEdit ? <ClinicalFields role={role} status={editing.status ?? 'draft'} sources={editing.source_references ?? []} notes={editing.review_notes ?? ''} reviewedAt={editing.reviewed_at ?? null} onChange={(change) => setEditing({ ...editing, ...change })} /> : null}<div className="form-actions"><Button tone="secondary" onClick={() => setEditing(null)}>ยกเลิก</Button>{canEdit ? <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกรายการ'}</Button> : null}</div></form></Modal> : null}
  </>;
}
