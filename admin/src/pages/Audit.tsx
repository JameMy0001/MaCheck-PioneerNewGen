import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '../components/ClinicalFields';
import { Button, dateText, EmptyState, ErrorBanner, Loading, Modal } from '../components/ui';
import { listAudit } from '../lib/api';
import type { AuditEntry } from '../types';

export function Audit() {
  const [rows, setRows] = useState<AuditEntry[]>([]); const [table, setTable] = useState('all'); const [selected, setSelected] = useState<AuditEntry | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { listAudit().then(setRows).catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดประวัติไม่สำเร็จ')).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => table === 'all' ? rows : rows.filter((row) => row.table_name === table), [rows, table]);
  return <>
    <PageHeader eyebrow="Accountability" title="ประวัติการแก้ไข" detail="บันทึกก่อนและหลังแก้ไขโดยอัตโนมัติ ทุกการเพิ่ม แก้ และลบข้อมูลทางคลินิก" />
    {error ? <ErrorBanner message={error} /> : null}
    <div className="toolbar"><select value={table} onChange={(event) => setTable(event.target.value)}><option value="all">ทุกตาราง</option><option value="medications">รายการยา</option><option value="drug_interactions">ยาตีกัน</option><option value="food_interactions">อาหารและยา</option></select><span className="result-count">{filtered.length} เหตุการณ์ล่าสุด</span></div>
    {loading ? <Loading /> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>เวลา</th><th>การกระทำ</th><th>ตาราง</th><th>รายการ</th><th>ผู้แก้ไข</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td>{dateText(row.changed_at)}</td><td><span className={`action-label action-label--${row.action.toLowerCase()}`}>{row.action}</span></td><td>{row.table_name}</td><td><strong>{row.record_key}</strong></td><td><strong>{row.changed_by_handle ? `@${row.changed_by_handle}` : 'system'}</strong></td><td><Button tone="ghost" onClick={() => setSelected(row)}>ดูรายละเอียด</Button></td></tr>)}</tbody></table></div> : <EmptyState title="ยังไม่มีประวัติ" detail="การแก้ไขข้อมูลครั้งถัดไปจะถูกบันทึกอัตโนมัติ" />}
    {selected ? <Modal title={`${selected.action} · ${selected.record_key}`} onClose={() => setSelected(null)} wide><div className="diff-grid"><div><h3>ก่อนแก้ไข</h3><pre>{JSON.stringify(selected.old_data, null, 2) || '—'}</pre></div><div><h3>หลังแก้ไข</h3><pre>{JSON.stringify(selected.new_data, null, 2) || '—'}</pre></div></div></Modal> : null}
  </>;
}
