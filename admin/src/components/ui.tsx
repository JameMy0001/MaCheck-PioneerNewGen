import type { ReactNode } from 'react';

import type { ClinicalStatus, Severity } from '../types';

export function Button({ children, tone = 'primary', type = 'button', disabled, onClick, className = '' }: {
  children: ReactNode;
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`button button--${tone} ${className}`}>{children}</button>;
}

export function Badge({ status, severity }: { status?: ClinicalStatus; severity?: Severity }) {
  const value = status ?? severity ?? 'draft';
  const labels: Record<string, string> = {
    draft: 'ฉบับร่าง',
    in_review: 'รอตรวจทาน',
    published: 'เผยแพร่แล้ว',
    archived: 'เก็บถาวร',
    moderate: 'เฝ้าระวัง',
    severe: 'รุนแรง',
  };
  return <span className={`badge badge--${value}`}>{labels[value]}</span>;
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <div>
            <p className="eyebrow">Clinical record</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="ปิด">×</button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}

export function Field({ label, hint, children, full = false }: { label: string; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`field ${full ? 'field--full' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty"><div className="empty__mark">✓</div><h3>{title}</h3><p>{detail}</p></div>;
}

export function Loading() {
  return <div className="loading"><span className="spinner" />กำลังโหลดข้อมูล…</div>;
}

export function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return <div className="alert alert--error"><span>{message}</span>{onClose ? <button onClick={onClose}>ปิด</button> : null}</div>;
}

export function SuccessBanner({ message }: { message: string }) {
  return <div className="alert alert--success">{message}</div>;
}

export const toList = (value: string) => value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
export const listText = (value?: string[]) => (value ?? []).join('\n');
export const dateText = (value?: string | null) => value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(new Date(value)) : '—';
