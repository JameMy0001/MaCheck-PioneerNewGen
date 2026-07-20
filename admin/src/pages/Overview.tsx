import { useEffect, useState } from 'react';

import { PageHeader } from '../components/ClinicalFields';
import { Badge, dateText, ErrorBanner, Loading } from '../components/ui';
import { getDashboardStats, listAudit } from '../lib/api';
import type { AuditEntry, DashboardStats } from '../types';

const emptyStats: DashboardStats = {
  medications: 0,
  drug_interactions: 0,
  food_interactions: 0,
  awaiting_review: 0,
  needs_review: 0,
  missing_sources: 0,
  accounts: 0,
  patient_medications: 0,
  dose_events_30d: 0,
  active_admins: 0,
};

export function Overview() {
  const [stats, setStats] = useState(emptyStats);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getDashboardStats(), listAudit(8)])
      .then(([nextStats, nextAudit]) => { setStats(nextStats); setAudit(nextAudit); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader eyebrow="Dashboard" title="ภาพรวมระบบกลาง" detail="สถานะข้อมูลทางคลินิกและการใช้งานของ YaCheck กับ MaCheck โดยไม่เปิดเผยข้อมูลสุขภาพรายบุคคล" />
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <Loading /> : (
        <>
          <section className="metric-grid">
            <Metric label="รายการยา" value={stats.medications} caption="Clinical catalogue" tone="teal" />
            <Metric label="คู่ยาตีกัน" value={stats.drug_interactions} caption="Drug interactions" tone="orange" />
            <Metric label="อาหาร–ยา" value={stats.food_interactions} caption="Food interactions" tone="blue" />
            <Metric label="รอตรวจทาน" value={stats.awaiting_review} caption="ต้องดำเนินการ" tone={stats.awaiting_review ? 'red' : 'green'} />
          </section>
          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel__heading"><div><p className="eyebrow">Data quality</p><h2>สุขภาพของฐานข้อมูล</h2></div></div>
              <div className="quality-list">
                <Quality label="รายการที่ไม่มีวันตรวจทานหรือเกิน 1 ปี" value={stats.needs_review} warning={stats.needs_review > 0} />
                <Quality label="รายการที่ยังไม่มีแหล่งอ้างอิง" value={stats.missing_sources} warning={stats.missing_sources > 0} />
                <Quality label="บัญชีที่ใช้งานระบบ" value={stats.accounts} />
                <Quality label="รายการยาในตู้ของผู้ใช้" value={stats.patient_medications} />
                <Quality label="บันทึกการกินยา 30 วัน" value={stats.dose_events_30d} />
                <Quality label="ทีมแอดมินที่ active" value={stats.active_admins} />
              </div>
            </article>
            <article className="panel">
              <div className="panel__heading"><div><p className="eyebrow">Audit trail</p><h2>การแก้ไขล่าสุด</h2></div></div>
              <div className="timeline">
                {audit.length ? audit.map((entry) => (
                  <div className="timeline__item" key={entry.id}>
                    <span className={`action-dot action-dot--${entry.action.toLowerCase()}`} />
                    <div><strong>{entry.record_key}</strong><p>{entry.table_name} · {entry.action}</p><small>{dateText(entry.changed_at)}</small></div>
                  </div>
                )) : <p className="muted">ยังไม่มีประวัติหลังเปิดระบบแอดมิน</p>}
              </div>
            </article>
          </section>
          <section className="panel readiness">
            <div><p className="eyebrow">Publishing workflow</p><h2>หลักการเผยแพร่ที่ปลอดภัย</h2></div>
            <div className="workflow">
              <span><Badge status="draft" /> ผู้แก้ไขเตรียมข้อมูล</span><b>→</b>
              <span><Badge status="in_review" /> ผู้เชี่ยวชาญตรวจทาน</span><b>→</b>
              <span><Badge status="published" /> ทั้งสองแอปอ่านข้อมูล</span>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Metric({ label, value, caption, tone }: { label: string; value: number; caption: string; tone: string }) {
  return <article className={`metric metric--${tone}`}><p>{label}</p><strong>{value.toLocaleString('th-TH')}</strong><small>{caption}</small></article>;
}

function Quality({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className="quality-row"><span>{label}</span><strong className={warning ? 'text-danger' : ''}>{value.toLocaleString('th-TH')}</strong></div>;
}
