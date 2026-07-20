import type { ReactNode } from 'react';

import type { AdminRole, ClinicalStatus } from '../types';
import { Field, listText, toList } from './ui';

export function ClinicalFields({ role, status, sources, notes, reviewedAt, onChange }: {
  role: AdminRole;
  status: ClinicalStatus;
  sources: string[];
  notes: string;
  reviewedAt: string | null;
  onChange: (change: { status?: ClinicalStatus; source_references?: string[]; review_notes?: string; reviewed_at?: string | null }) => void;
}) {
  const mayPublish = role === 'owner' || role === 'clinical_reviewer';
  return (
    <fieldset className="review-panel">
      <legend>การตรวจทานและเผยแพร่</legend>
      <div className="form-grid">
        <Field label="สถานะ">
          <select value={status} onChange={(event) => onChange({ status: event.target.value as ClinicalStatus })}>
            <option value="draft">ฉบับร่าง</option>
            <option value="in_review">ส่งให้ตรวจทาน</option>
            {mayPublish ? <option value="published">เผยแพร่ให้ทั้งสองแอป</option> : null}
            {mayPublish ? <option value="archived">เก็บถาวร</option> : null}
          </select>
        </Field>
        <Field label="วันที่ตรวจทาน">
          <input type="date" value={reviewedAt ?? ''} onChange={(event) => onChange({ reviewed_at: event.target.value || null })} />
        </Field>
        <Field label="แหล่งอ้างอิง" hint="หนึ่ง URL / เอกสารต่อหนึ่งบรรทัด" full>
          <textarea rows={3} value={listText(sources)} onChange={(event) => onChange({ source_references: toList(event.target.value) })} placeholder="https://…" />
        </Field>
        <Field label="หมายเหตุผู้ตรวจทาน" full>
          <textarea rows={3} value={notes} onChange={(event) => onChange({ review_notes: event.target.value })} placeholder="เหตุผล ขอบเขต หรือเงื่อนไขสำคัญของข้อมูลนี้" />
        </Field>
      </div>
      {status === 'published' && sources.length === 0 ? <p className="inline-warning">รายการที่เผยแพร่ควรมีแหล่งอ้างอิงทางคลินิกอย่างน้อย 1 รายการ</p> : null}
    </fieldset>
  );
}

export function PageHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </header>
  );
}
