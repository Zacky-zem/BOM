'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import MasterAssyPage from '@/components/MasterAssyPage';
import MasterPartPage from '@/components/MasterPartPage';
import MasterBomPage  from '@/components/MasterBomPage';
import ProdPlanPage   from '@/components/ProdPlanPage';

export default function Home() {
  const { data: session, status } = useSession();
  const [page, setPage] = useState<'assy' | 'part' | 'bom' | 'prodplan'>('assy');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ DIHAPUS: useEffect redirect — sekarang middleware yang handle ini server-side
  // Tidak perlu lagi: if (status === 'unauthenticated') router.push('/login')

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ✅ Tampilkan loading HANYA saat status masih 'loading'
  // Kalau 'unauthenticated', middleware sudah redirect ke /login sebelum sampai sini
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #0f766e', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Memuat...</p>
        </div>
      </div>
    );
  }

  // ✅ Guard: kalau tidak ada session (seharusnya tidak pernah terjadi karena middleware)
  // tapi ini sebagai safety net
  if (!session) return null;

  const role = (session.user as { role?: string })?.role ?? '';
  const userName = session.user?.name ?? role;

  const roleColor: Record<string, string> = {
    MPC:     '#0f766e',
    PPC:     '#166534',
    DESIGN:  '#6b21a8',
    FINANCE: '#b45309',
  };
  const roleBg: Record<string, string> = {
    MPC:     '#f0fdfa',
    PPC:     '#f0fdf4',
    DESIGN:  '#faf5ff',
    FINANCE: '#fffbeb',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeIn  { from { opacity:0; transform:scale(.98) } to { opacity:1; transform:scale(1) } }
        @keyframes slideIn { from { transform: translateX(-100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1 } to { transform: translateX(-100%); opacity: 0 } }
      `}</style>

      {!isMobile && (
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentPage={page}
          onPageChange={(newPage) => {
            if (newPage === 'report') {
              window.location.href = '/report';
            } else {
              setPage(newPage);
            }
          }}
          isMobile={isMobile}
        />
      )}

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        width: '100%',
      }}>
        {/* Top Header */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '14px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', height: 60,
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 0 rgba(0,0,0,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 7,
                padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#dc2626',
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                alignItems: 'center', gap: 6, transition: 'all .2s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.background = '#fef2f2'; }}
              onMouseOut={e =>  { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'none'; }}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? '20px' : '28px 32px' }}>
          {page === 'assy'     && <MasterAssyPage showToast={showToast} role={role} />}
          {page === 'part'     && <MasterPartPage showToast={showToast} role={role} />}
          {page === 'bom'      && <MasterBomPage  showToast={showToast} role={role} />}
          {page === 'prodplan' && <ProdPlanPage   showToast={showToast} role={role} />}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
          background: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: '#fff', borderRadius: 10, padding: '12px 18px',
          fontSize: 13.5, fontWeight: 500,
          boxShadow: '0 10px 28px rgba(0,0,0,.2)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideUp .25s ease', fontFamily: 'inherit',
        }}>
          <span style={{ fontSize: 16 }}>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff',
              cursor: 'pointer', marginLeft: 6, borderRadius: 5,
              width: 20, height: 20, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14, padding: 0, transition: 'background .2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,.3)'}
            onMouseOut={e =>  e.currentTarget.style.background = 'rgba(255,255,255,.2)'}
          >×</button>
        </div>
      )}
    </div>
  );
}
