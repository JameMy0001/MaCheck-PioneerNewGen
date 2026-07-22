import type { ReactNode } from 'react';

import type { AdminRole, Section } from '../types';

const items: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'ภาพรวม', icon: '◫' },
  { id: 'medications', label: 'รายการยา', icon: '●' },
  { id: 'interactions', label: 'ยาตีกัน', icon: '⇄' },
  { id: 'food', label: 'อาหารและยา', icon: '◇' },
  { id: 'agent', label: 'AI Agent', icon: '✦' },
  { id: 'accounts', label: 'บัญชีผู้ใช้', icon: '○' },
  { id: 'admins', label: 'ทีมแอดมิน', icon: '♙' },
  { id: 'audit', label: 'ประวัติการแก้ไข', icon: '↺' },
];

const roleLabel: Record<AdminRole, string> = {
  owner: 'Owner',
  clinical_editor: 'Clinical editor',
  clinical_reviewer: 'Clinical reviewer',
  auditor: 'Auditor',
};

export function Shell({ section, role, onSection, onSignOut, children }: {
  section: Section;
  role: AdminRole;
  onSection: (section: Section) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-mark brand-mark--small" aria-hidden="true"><span>✓</span><i /></div>
          <div><strong>Clinical Admin</strong><small>YaCheck · MaCheck</small></div>
        </div>
        <nav aria-label="เมนูหลัก">
          {items.map((item) => (
            <button key={item.id} className={section === item.id ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => onSection(item.id)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className="role-chip">{roleLabel[role]}</span>
          <button onClick={onSignOut}>ออกจากระบบ</button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu" aria-label="เปิดเมนู">☰</button>
          <div><span className="live-dot" />เชื่อมต่อฐานข้อมูลกลาง</div>
          <a href="https://supabase.com/dashboard/project/witsidzbewjkcnvnnapi" target="_blank" rel="noreferrer">Supabase ↗</a>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
