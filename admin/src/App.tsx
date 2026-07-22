import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { ErrorBanner, Loading } from './components/ui';
import { getAdminRole } from './lib/api';
import { supabase } from './lib/supabase';
import type { AdminRole, Section } from './types';

const Overview = lazy(() => import('./pages/Overview').then((module) => ({ default: module.Overview })));
const Medications = lazy(() => import('./pages/Medications').then((module) => ({ default: module.Medications })));
const Interactions = lazy(() => import('./pages/Interactions').then((module) => ({ default: module.Interactions })));
const FoodInteractions = lazy(() => import('./pages/FoodInteractions').then((module) => ({ default: module.FoodInteractions })));
const AgentSettings = lazy(() => import('./pages/AgentSettings').then((module) => ({ default: module.AgentSettings })));
const Accounts = lazy(() => import('./pages/Accounts').then((module) => ({ default: module.Accounts })));
const Admins = lazy(() => import('./pages/Admins').then((module) => ({ default: module.Admins })));
const Audit = lazy(() => import('./pages/Audit').then((module) => ({ default: module.Audit })));

export function App() {
  const [section, setSection] = useState<Section>('overview');
  const [role, setRole] = useState<AdminRole | null>(null);
  const [booting, setBooting] = useState(true);
  const [accessError, setAccessError] = useState('');

  const verifyAccess = useCallback(async () => {
    setAccessError('');
    try {
      const nextRole = await getAdminRole();
      setRole(nextRole);
    } catch {
      await supabase.auth.signOut({ scope: 'local' });
      setRole(null);
      setAccessError('บัญชีนี้ไม่มีสิทธิ์เข้าระบบ Clinical Admin กรุณาติดต่อ Owner');
      throw new Error('Admin access required');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await verifyAccess().catch(() => undefined);
      setBooting(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setRole(null);
    });
    return () => data.subscription.unsubscribe();
  }, [verifyAccess]);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setRole(null);
    setSection('overview');
  };

  if (booting) return <main className="center-page"><Loading /></main>;
  if (!role) return <>{accessError ? <div className="floating-alert"><ErrorBanner message={accessError} /></div> : null}<Login onSuccess={verifyAccess} /></>;

  return (
    <Shell section={section} role={role} onSection={setSection} onSignOut={() => void signOut()}>
      <Suspense fallback={<Loading />}>
        {section === 'overview' ? <Overview /> : null}
        {section === 'medications' ? <Medications role={role} /> : null}
        {section === 'interactions' ? <Interactions role={role} /> : null}
        {section === 'food' ? <FoodInteractions role={role} /> : null}
        {section === 'agent' ? <AgentSettings role={role} /> : null}
        {section === 'accounts' ? <Accounts /> : null}
        {section === 'admins' ? <Admins role={role} /> : null}
        {section === 'audit' ? <Audit /> : null}
      </Suspense>
    </Shell>
  );
}
