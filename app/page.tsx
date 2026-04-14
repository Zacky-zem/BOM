'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MasterAssyPage from '@/components/MasterAssyPage';
import MasterPartPage from '@/components/MasterPartPage';
import MasterBomPage  from '@/components/MasterBomPage';
import ProdPlanPage   from '@/components/ProdPlanPage';
import { Sidebar, SidebarHeader, SidebarNav, SidebarItem, SidebarUserCard, MobileMenuButton } from '@/components/ui';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState<'assy' | 'part' | 'bom' | 'prodplan'>('assy');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (status === 'loading' || !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 14px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Memuat...
        </div>
      </div>
    );
  }

  const role     = (session.user as { role?: string })?.role ?? '';
  const userName = session.user?.name ?? role;

  const roleColor: Record<string, string> = {
    MPC:     '#2563eb',
    PPC:     '#16a34a',
    DESIGN:  '#9333ea',
    FINANCE: '#d97706',
  };
  const roleBg: Record<string, string> = {
    MPC:     '#eff6ff',
    PPC:     '#f0fdf4',
    DESIGN:  '#faf5ff',
    FINANCE: '#fffbeb',
  };

  const tabs = [
    { key: 'assy',     label: 'Master ASSY', icon: '🔩' },
    { key: 'part',     label: 'Master Part',  icon: '⚙️' },
    { key: 'bom',      label: 'Master BOM',   icon: '📋' },
    { key: 'prodplan', label: 'Prod Plan',     icon: '💰' },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeIn  { from { opacity:0; transform:scale(.98) } to { opacity:1; transform:scale(1) } }
        
        @media (max-width: 768px) {
          aside { display: none; }
          aside.sidebar-open { display: flex !important; }
        }
        @media (min-width: 1024px) {
          aside { display: flex !important; transform: translateX(0) !important; position: relative !important; height: auto !important; }
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <SidebarHeader />
        <SidebarNav>
          {tabs.map(t => (
            <SidebarItem
              key={t.key}
              label={t.label}
              icon={t.icon}
              active={page === t.key}
              onClick={() => {
                setPage(t.key);
                setSidebarOpen(false);
              }}
            />
          ))}
          <div style={{ height: 8 }} />
          <SidebarItem
            label="Report"
            icon="📊"
            active={false}
            onClick={() => {
              router.push('/report');
              setSidebarOpen(false);
            }}
          />
        </SidebarNav>
        <SidebarUserCard
          userName={userName}
          role={role}
          onLogout={() => signOut({ callbackUrl: '/login' })}
        />
      </Sidebar>

      {/* Header for mobile */}
      <header style={{
        display: 'none', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', borderBottom: '1px solid #e8eaed',
        padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 0 #e8eaed, 0 2px 8px rgba(0,0,0,.04)',
        '@media (maxWidth: 1024px)': { display: 'flex' }
      }}
      >
        <img src="/yazaki-logo.png" alt="YAZAKI Logo" style={{ height: 32, objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <main style={{
          flex: 1, padding: '28px 24px', overflowY: 'auto',
          maxWidth: '100%', margin: '0 auto',
          background: '#f8f9fa',
        }}>
          {page === 'assy' && <MasterAssyPage showToast={showToast} role={role} />}
          {page === 'part' && <MasterPartPage showToast={showToast} role={role} />}
          {page === 'bom'  && <MasterBomPage  showToast={showToast} role={role} />}
          {page === 'prodplan' && <ProdPlanPage showToast={showToast} role={role} />}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: '#fff', borderRadius: 12, padding: '13px 20px',
          fontSize: 13.5, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideUp .25s ease', fontFamily: 'inherit',
        }}>
          <span style={{ fontSize: 15 }}>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 6, borderRadius: 6, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
        </div>
      )}
    </div>
  );
}
