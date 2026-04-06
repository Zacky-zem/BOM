'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MasterAssyPage from '@/components/MasterAssyPage';
import MasterPartPage from '@/components/MasterPartPage';
import MasterBomPage  from '@/components/MasterBomPage';
import ProdPlanPage   from '@/components/ProdPlanPage';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState<'assy' | 'part' | 'bom' | 'prodplan'>('assy');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeIn  { from { opacity:0; transform:scale(.98) } to { opacity:1; transform:scale(1) } }
        @media (max-width: 767px) {
          nav { height: auto !important; }
          nav > div:nth-child(2) { display: none !important; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 max(20px, 5%)', 
        display: 'flex', 
        alignItems: 'center',
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        height: 'auto', 
        minHeight: 66,
        boxShadow: '0 1px 3px rgba(0,0,0,.08)',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        {/* Logo Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 18, 
            boxShadow: '0 4px 12px rgba(37,99,235,.25)', 
            flexShrink: 0 
          }}>📋</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.2, letterSpacing: -0.3 }}>BOM Database</div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, letterSpacing: 0.3 }}>Master Data System</div>
          </div>
        </div>

        {/* Tabs - Hidden on mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setPage(t.key)} style={{
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: '10px 18px', 
              fontSize: 13, 
              height: 'auto',
              fontWeight: page === t.key ? 600 : 500,
              color: page === t.key ? '#1d4ed8' : '#6b7280',
              borderBottom: page === t.key ? '3px solid #1d4ed8' : '3px solid transparent',
              fontFamily: 'inherit', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              transition: 'all .2s ease', 
              whiteSpace: 'nowrap',
              borderRadius: '8px 8px 0 0',
            }}
            onMouseOver={e => { if (page !== t.key) { e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.background = 'rgba(37,99,235,.05)'; } }}
            onMouseOut={e  => { if (page !== t.key) { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'none'; } }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <span style={{ display: 'none', '@media (min-width: 1024px)': { display: 'inline' } } as any}>{t.label}</span>
            </button>
          ))}
          <Link href="/report" style={{
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            padding: '10px 18px', 
            fontSize: 13, 
            height: 'auto',
            fontWeight: 500, 
            color: '#6b7280',
            borderBottom: '3px solid transparent',
            fontFamily: 'inherit', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            textDecoration: 'none', 
            transition: 'all .2s ease', 
            whiteSpace: 'nowrap',
            borderRadius: '8px 8px 0 0',
          }}
          onMouseOver={e => { e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.background = 'rgba(37,99,235,.05)'; }}
          onMouseOut={e  => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'none'; }}
          >
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ display: 'none', '@media (min-width: 1024px)': { display: 'inline' } } as any}>Report</span>
          </Link>
        </div>

        {/* Right Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto', flexShrink: 0 }}>
          {/* User Profile */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            padding: '8px 14px', 
            borderRadius: 10, 
            background: roleBg[role] || '#f8fafc', 
            border: `1.5px solid ${roleColor[role] || '#e2e8f0'}20` 
          }}>
            <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: 8, 
              background: roleColor[role] || '#6b7280', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff', 
              fontSize: 12, 
              fontWeight: 700, 
              flexShrink: 0 
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'none', '@media (min-width: 640px)': { display: 'block' } } as any}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{userName}</div>
              <div style={{ fontSize: 10.5, fontWeight: 500, color: roleColor[role] || '#6b7280', marginTop: 2 }}>{role}</div>
            </div>
          </div>

          {/* Logout Button */}
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
            background: '#fff', 
            border: '1.5px solid #e5e7eb', 
            borderRadius: 9,
            padding: '8px 16px', 
            fontSize: 12.5, 
            fontWeight: 600, 
            color: '#6b7280',
            cursor: 'pointer', 
            fontFamily: 'inherit', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            transition: 'all .2s ease', 
            whiteSpace: 'nowrap',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,.12)'; }}
          onMouseOut={e =>  { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span style={{ fontSize: 14 }}>🚪</span>
            <span style={{ display: 'none', '@media (min-width: 640px)': { display: 'inline' } } as any}>Logout</span>
          </button>
        </div>
      </nav>

      <main style={{ padding: 'max(20px, 5%)', maxWidth: 1600, margin: '0 auto' }}>
        {page === 'assy' && <MasterAssyPage showToast={showToast} role={role} />}
        {page === 'part' && <MasterPartPage showToast={showToast} role={role} />}
        {page === 'bom'  && <MasterBomPage  showToast={showToast} role={role} />}
        {page === 'prodplan' && <ProdPlanPage showToast={showToast} role={role} />}
      </main>

      {toast && (
        <div style={{
          position: 'fixed', 
          bottom: 'max(20px, 5%)', 
          right: 'max(20px, 5%)', 
          zIndex: 9999,
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: '#fff', 
          borderRadius: 10, 
          padding: '14px 18px',
          fontSize: 13.5, 
          fontWeight: 500, 
          boxShadow: '0 10px 28px rgba(0,0,0,.15)',
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          animation: 'slideUp .3s cubic-bezier(.34, 1.56, .64, 1)', 
          fontFamily: 'inherit',
          maxWidth: 'calc(100% - 40px)',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ 
            background: 'rgba(255,255,255,.25)', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer', 
            marginLeft: 8, 
            borderRadius: 6, 
            width: 24, 
            height: 24, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 15, 
            transition: 'background .15s', 
            flexShrink: 0 
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,.4)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,.25)'}
          >×</button>
        </div>
      )}
    </div>
  );
}
