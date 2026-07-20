import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { ClinicalFields, PageHeader } from '../components/ClinicalFields';
import { BulkClinicalActions, type BulkClinicalAction } from '../components/BulkClinicalActions';
import { Badge, Button, EmptyState, ErrorBanner, Field, Loading, Modal, SuccessBanner } from '../components/ui';
import { bulkUpdateDrugInteractions, deleteClinicalRecord, listDrugInteractions, listMedications, saveDrugInteraction } from '../lib/api';
import { getInteractionSafetyCopy } from '../lib/interaction-safety';
import type { AdminRole, ClinicalStatus, DrugInteraction, Medication } from '../types';

const blank: Partial<DrugInteraction> = {
  drug_1: '',
  drug_2: '',
  severity: 'moderate',
  status: 'draft',
  source_references: [],
  review_notes: '',
  reviewed_at: null,
};

export function Interactions({ role }: { role: AdminRole }) {
  const [rows, setRows] = useState<DrugInteraction[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [editing, setEditing] = useState<Partial<DrugInteraction> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ClinicalStatus>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const canEdit = role !== 'auditor';

  const load = useCallback(() => Promise.all([listDrugInteractions(), listMedications()])
    .then(([nextRows, nextMeds]) => {
      setRows(nextRows);
      setMedications(nextMeds);
    })
    .catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ'))
    .finally(() => setLoading(false)), []);

  useEffect(() => { void load(); }, [load]);

  const medicationNames = useMemo(() => new Map(medications.map((item) => [item.code, item.name_th])), [medications]);
  const medName = (code: string) => medicationNames.get(code) ?? code;
  const filtered = useMemo(() => rows.filter((row) => {
    const query = search.trim().toLowerCase();
    return (status === 'all' || row.status === status)
      && (!query || `${row.drug_1} ${row.drug_2} ${medicationNames.get(row.drug_1) ?? row.drug_1} ${medicationNames.get(row.drug_2) ?? row.drug_2}`.toLowerCase().includes(query));
  }), [rows, search, status, medicationNames]);
  const selectableRows = useMemo(() => filtered.filter((row) => row.status === 'draft' || row.status === 'in_review'), [filtered]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelectableSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedSet.has(row.id));

  useEffect(() => { setSelectedIds([]); }, [search, status]);

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleAll = () => {
    setSelectedIds(allSelectableSelected ? [] : selectableRows.map((row) => row.id));
  };

  const applyBulkAction = async (action: BulkClinicalAction, reviewedAt: string) => {
    setBulkSaving(true); setError(''); setSuccess('');
    try {
      const result = await bulkUpdateDrugInteractions(selectedIds, action, reviewedAt);
      setSelectedIds([]);
      setSuccess(action === 'published'
        ? `เผยแพร่ให้ทั้งสองแอปแล้ว ${result.updated} คู่`
        : `ส่งให้ตรวจทานแล้ว ${result.updated} คู่`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'อัปเดตหลายรายการไม่สำเร็จ');
    } finally {
      setBulkSaving(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!editing?.drug_1 || !editing.drug_2 || editing.drug_1 === editing.drug_2) {
      setError('กรุณาเลือกยาคนละตัวให้ครบทั้งสองช่อง');
      return;
    }
    setSaving(true);
    try {
      await saveDrugInteraction(editing, editing.id);
      setEditing(null);
      setSuccess('บันทึกคู่ยาตีกันแล้ว');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: DrugInteraction) => {
    if (!window.confirm(`ลบคู่ ${medName(row.drug_1)} – ${medName(row.drug_2)} ถาวรหรือไม่?`)) return;
    try {
      await deleteClinicalRecord('drug_interactions', row.id);
      setSuccess('ลบรายการแล้ว');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ลบไม่สำเร็จ');
    }
  };

  const preview = getInteractionSafetyCopy(editing?.severity ?? 'moderate');

  return <>
    <PageHeader
      eyebrow="Safety rules"
      title="คู่ยาตีกัน"
      detail="จัดการเฉพาะคู่ยา ระดับคำเตือน และหลักฐานอ้างอิง ระบบไม่อนุญาตให้บันทึกกลไก อาการ หรือผลกระทบ"
      action={canEdit ? <Button onClick={() => setEditing({ ...blank })}>+ เพิ่มคู่ยา</Button> : undefined}
    />
    {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}
    {success ? <SuccessBanner message={success} /> : null}
    <div className="toolbar">
      <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อยาหรือรหัสยา" />
      <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
        <option value="all">ทุกสถานะ</option>
        <option value="draft">ฉบับร่าง</option>
        <option value="in_review">รอตรวจทาน</option>
        <option value="published">เผยแพร่แล้ว</option>
        <option value="archived">เก็บถาวร</option>
      </select>
      <span className="result-count">{filtered.length} คู่</span>
    </div>
    {canEdit ? <BulkClinicalActions selectedCount={selectedIds.length} role={role} publishingLabel="เผยแพร่ให้ทั้งสองแอป" busy={bulkSaving} onApply={applyBulkAction} /> : null}
    {loading ? <Loading /> : filtered.length ? <div className="table-wrap">
      <table>
        <thead><tr>{canEdit ? <th className="select-cell"><input type="checkbox" checked={allSelectableSelected} disabled={selectableRows.length === 0 || bulkSaving} onChange={toggleAll} aria-label="เลือกคู่ยาทั้งหมดในผลการค้นหา" /></th> : null}<th>คู่ยา</th><th>ระดับ</th><th>คำสั่งความปลอดภัย</th><th>สถานะ</th><th>เวอร์ชัน</th><th /></tr></thead>
        <tbody>{filtered.map((row) => {
          const safeCopy = getInteractionSafetyCopy(row.severity);
          const selectable = row.status === 'draft' || row.status === 'in_review';
          return <tr key={row.id}>
            {canEdit ? <td className="select-cell"><input type="checkbox" checked={selectedSet.has(row.id)} disabled={!selectable || bulkSaving} onChange={() => toggleSelected(row.id)} aria-label={`เลือกคู่ ${medName(row.drug_1)} และ ${medName(row.drug_2)}`} /></td> : null}
            <td><strong>{medName(row.drug_1)}</strong><small>{row.drug_1} ↔ {row.drug_2}</small><strong>{medName(row.drug_2)}</strong></td>
            <td><Badge severity={row.severity} /></td>
            <td className="cell-wide">{safeCopy.title_th}<small>{safeCopy.advice_th}</small></td>
            <td><Badge status={row.status} /></td>
            <td>v{row.dataset_version}</td>
            <td className="row-actions"><button onClick={() => setEditing({ ...row })}>{canEdit ? 'แก้ไข' : 'ดู'}</button>{role === 'owner' ? <button className="danger-link" onClick={() => void remove(row)}>ลบ</button> : null}</td>
          </tr>;
        })}</tbody>
      </table>
    </div> : <EmptyState title="ไม่พบคู่ยาตีกัน" detail="ลองเปลี่ยนคำค้นหาหรือตัวกรอง" />}
    {editing ? <Modal title={editing.id ? 'แก้ไขคู่ยาตีกัน' : 'เพิ่มคู่ยาตีกัน'} onClose={() => setEditing(null)} wide>
      <form onSubmit={submit} className="form-grid">
        <Field label="ยาตัวที่ 1"><select value={editing.drug_1 ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, drug_1: event.target.value })} required><option value="">เลือกยา</option>{medications.map((med) => <option key={med.code} value={med.code}>{med.name_th} ({med.code})</option>)}</select></Field>
        <Field label="ยาตัวที่ 2"><select value={editing.drug_2 ?? ''} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, drug_2: event.target.value })} required><option value="">เลือกยา</option>{medications.map((med) => <option key={med.code} value={med.code}>{med.name_th} ({med.code})</option>)}</select></Field>
        <Field label="ระดับคำสั่ง"><select value={editing.severity ?? 'moderate'} disabled={!canEdit} onChange={(event) => setEditing({ ...editing, severity: event.target.value as DrugInteraction['severity'] })}><option value="moderate">ต้องสอบถามแพทย์หรือเภสัชกรก่อน</option><option value="severe">ห้ามใช้ร่วมกัน</option></select></Field>
        <Field label="ข้อความที่ผู้ใช้จะเห็น" full><div className="notice"><strong>{preview.title_th}</strong><br />{preview.description_th}<br />{preview.advice_th}</div></Field>
        {canEdit ? <ClinicalFields role={role} status={editing.status ?? 'draft'} sources={editing.source_references ?? []} notes={editing.review_notes ?? ''} reviewedAt={editing.reviewed_at ?? null} onChange={(change) => setEditing({ ...editing, ...change })} /> : null}
        <div className="form-actions"><Button tone="secondary" onClick={() => setEditing(null)}>ยกเลิก</Button>{canEdit ? <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกคู่ยา'}</Button> : null}</div>
      </form>
    </Modal> : null}
  </>;
}
