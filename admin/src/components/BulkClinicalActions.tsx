import { useState } from 'react';

import type { AdminRole } from '../types';
import { Button } from './ui';

export type BulkClinicalAction = 'in_review' | 'published';

const bangkokToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

export function BulkClinicalActions({
  selectedCount,
  role,
  publishingLabel,
  busy,
  onApply,
}: {
  selectedCount: number;
  role: AdminRole;
  publishingLabel: string;
  busy: boolean;
  onApply: (action: BulkClinicalAction, reviewedAt: string) => Promise<void>;
}) {
  const canPublish = role === 'owner' || role === 'clinical_reviewer';
  const [action, setAction] = useState<BulkClinicalAction>('in_review');
  const [reviewedAt, setReviewedAt] = useState(bangkokToday);

  const apply = () => {
    const message = action === 'published'
      ? `ยืนยันเผยแพร่ ${selectedCount} รายการไปยัง YaCheck และ MaCheck ทันทีหรือไม่?\n\nระบบจะบันทึกผู้ตรวจ วันที่ตรวจ และ Audit log ทุกระเบียน`
      : `ยืนยันส่ง ${selectedCount} รายการให้ตรวจทานหรือไม่?`;
    if (!window.confirm(message)) return;
    void onApply(action, reviewedAt);
  };

  return (
    <section className="bulk-actions" aria-label="จัดการหลายรายการ">
      <div>
        <strong>เลือกแล้ว {selectedCount} รายการ</strong>
        <small>เลือกได้สูงสุด 500 รายการต่อครั้ง</small>
      </div>
      <label>
        <span>คำสั่ง</span>
        <select
          value={action}
          disabled={busy}
          onChange={(event) => setAction(event.target.value as BulkClinicalAction)}
        >
          <option value="in_review">ส่งให้ตรวจทาน</option>
          {canPublish ? <option value="published">{publishingLabel}</option> : null}
        </select>
      </label>
      {action === 'published' ? (
        <label>
          <span>วันที่ตรวจทาน</span>
          <input
            type="date"
            value={reviewedAt}
            max={bangkokToday()}
            disabled={busy}
            onChange={(event) => setReviewedAt(event.target.value)}
          />
        </label>
      ) : null}
      <Button disabled={selectedCount === 0 || busy || (action === 'published' && !reviewedAt)} onClick={apply}>
        {busy ? 'กำลังอัปเดต…' : 'ดำเนินการกับรายการที่เลือก'}
      </Button>
    </section>
  );
}
