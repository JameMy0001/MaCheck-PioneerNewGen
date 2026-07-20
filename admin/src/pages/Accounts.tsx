import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { PageHeader } from '../components/ClinicalFields';
import { Button, dateText, EmptyState, ErrorBanner, Loading } from '../components/ui';
import { listAccounts } from '../lib/api';
import type { AccountSummary } from '../types';

export function Accounts() {
  const [rows, setRows] = useState<AccountSummary[]>([]); const [query, setQuery] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback((search = '') => { setLoading(true); listAccounts(search).then(setRows).catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดบัญชีไม่สำเร็จ')).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const submit = (event: FormEvent) => { event.preventDefault(); load(query.trim()); };
  return <>
    <PageHeader eyebrow="Privacy-aware operations" title="บัญชีผู้ใช้" detail="แสดงเฉพาะ username และข้อมูลระบบที่จำเป็น ไม่เปิดยา โรค หรือประวัติสุขภาพรายบุคคล" />
    {error ? <ErrorBanner message={error} /> : null}
    <form className="toolbar" onSubmit={submit}><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา username" /><Button type="submit" tone="secondary">ค้นหา</Button><span className="result-count">{rows.length} บัญชี</span></form>
    {loading ? <Loading /> : rows.length ? <div className="table-wrap"><table><thead><tr><th>Username</th><th>บทบาทในแอป</th><th>แอปต้นทาง</th><th>สร้างเมื่อ</th><th>เข้าสู่ระบบล่าสุด</th></tr></thead><tbody>{rows.map((row) => <tr key={row.handle}><td><strong>@{row.handle}</strong></td><td>{row.profile_role ?? 'ยังไม่มีโปรไฟล์'}</td><td><span className="mini-chip">{row.source_app ?? '—'}</span></td><td>{dateText(row.created_at)}</td><td>{dateText(row.last_login_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="ไม่พบบัญชี" detail="ไม่พบ username ที่ตรงกับคำค้นหา" />}
  </>;
}
