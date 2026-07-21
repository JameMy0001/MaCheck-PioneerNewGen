import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { PageHeader } from '../components/ClinicalFields';
import { Button, dateText, EmptyState, ErrorBanner, Loading } from '../components/ui';
import { listAccounts, updateUserSubscription } from '../lib/api';
import type { AccountSummary } from '../types';

export function Accounts() {
  const [rows, setRows] = useState<AccountSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Draft state for editing subscriptions
  const [editingTiers, setEditingTiers] = useState<Record<string, string>>({});
  const [editingQuotas, setEditingQuotas] = useState<Record<string, string>>({});

  const load = useCallback((search = '') => {
    setLoading(true);
    listAccounts(search)
      .then((data) => {
        setRows(data);
        const tiers: Record<string, string> = {};
        const quotas: Record<string, string> = {};
        data.forEach((r) => {
          const key = r.user_id || r.handle;
          tiers[key] = r.subscription_tier || 'free';
          quotas[key] = r.custom_quota_override ? String(r.custom_quota_override) : '';
        });
        setEditingTiers(tiers);
        setEditingQuotas(quotas);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'โหลดบัญชีไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    load(query.trim());
  };

  const handleSaveSubscription = async (account: AccountSummary) => {
    const identifier = account.user_id || account.handle;
    const newTier = editingTiers[identifier] || editingTiers[account.handle] || 'free';
    const quotaStr = editingQuotas[identifier] ?? editingQuotas[account.handle];
    const customQuota = quotaStr && !isNaN(Number(quotaStr)) ? Number(quotaStr) : null;

    setError('');
    setSuccessMsg('');
    try {
      await updateUserSubscription(identifier, newTier, customQuota);
      setSuccessMsg(`อัปเดตสิทธิ์ AI Care Agent ของ @${account.handle} เป็น "${newTier.toUpperCase()}" เรียบร้อยแล้ว!`);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถอัปเดตสิทธิ์ได้');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Privacy-aware operations"
        title="บัญชีผู้ใช้ & การจัดการสิทธิ์ AI Agent"
        detail="ควบคุมแพ็กเกจโควตาการใช้งาน AI Care Agent (Free, Pro, Family, Admin Unlimited) และกำหนดโควตาพิเศษให้ผู้ใช้งานรายบุคคล"
      />

      {error ? <ErrorBanner message={error} /> : null}
      {successMsg ? (
        <div className="alert alert-success" style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 14, backgroundColor: '#D1FADF', color: '#067647', fontWeight: 700 }}>
          ✅ {successMsg}
        </div>
      ) : null}

      <form className="toolbar" onSubmit={submit}>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหา username..."
        />
        <Button type="submit" tone="secondary">
          ค้นหา
        </Button>
        <span className="result-count">{rows.length} บัญชี</span>
      </form>

      {loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>บทบาทในแอป</th>
                <th>สิทธิ์ AI Agent Tier</th>
                <th>โควตาพิเศษ (ถ้ามี)</th>
                <th>จัดการสิทธิ์</th>
                <th>เข้าสู่ระบบล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = row.user_id || row.handle;
                const currentTier = editingTiers[key] || row.subscription_tier || 'free';
                const currentQuota = editingQuotas[key] ?? (row.custom_quota_override ? String(row.custom_quota_override) : '');

                return (
                  <tr key={key}>
                    <td>
                      <strong>@{row.handle}</strong>
                    </td>
                    <td>{row.profile_role ?? 'ผู้ป่วย'}</td>
                    <td>
                      <select
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 700 }}
                        value={currentTier}
                        onChange={(e) => setEditingTiers((prev) => ({ ...prev, [key]: e.target.value }))}
                      >
                        <option value="free">Free (7 ครั้ง/สัปดาห์)</option>
                        <option value="pro">Pro (50 ครั้ง/สัปดาห์)</option>
                        <option value="family">Family (200 ครั้ง/สัปดาห์)</option>
                        <option value="admin">👑 Admin (Unlimited ∞)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="อัตโนมัติ"
                        style={{ width: 90, padding: '5px 8px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                        value={currentQuota}
                        onChange={(e) => setEditingQuotas((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSaveSubscription(row)}
                        style={{ padding: '6px 12px', fontSize: 13, borderRadius: 8, cursor: 'pointer', backgroundColor: '#216E63', color: '#fff', border: 'none', fontWeight: 700 }}
                      >
                        บันทึกสิทธิ์ AI
                      </button>
                    </td>
                    <td>{dateText(row.last_login_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="ไม่พบบัญชี" detail="ไม่พบ username ที่ตรงกับคำค้นหา" />
      )}
    </>
  );
}
