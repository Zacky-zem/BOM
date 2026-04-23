'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPage: 'assy' | 'part' | 'bom' | 'prodplan' | 'report';
  onPageChange: (page: 'assy' | 'part' | 'bom' | 'prodplan' | 'report') => void;
  isMobile: boolean;
  onMenuSelect?: () => void;
}

const tabs = [
  { key: 'assy', label: 'Master ASSY', icon: '🔩' },
  { key: 'part', label: 'Master Part', icon: '⚙️' },
  { key: 'bom', label: 'Master BOM', icon: '📋' },
  { key: 'prodplan', label: 'Prod Plan', icon: '📅' },
  { key: 'report', label: 'Report', icon: '📊' },
] as const;

const roleColor: Record<string, string> = {
  MPC: '#0f766e',
  PPC: '#166534',
  DESIGN: '#6b21a8',
  FINANCE: '#b45309',
};

const roleBg: Record<string, string> = {
  MPC: '#f0fdfa',
  PPC: '#f0fdf4',
  DESIGN: '#faf5ff',
  FINANCE: '#fffbeb',
};

export default function Sidebar({
  isOpen,
  onToggle,
  currentPage,
  onPageChange,
  isMobile,
}: SidebarProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? '';
  const userName = session?.user?.name ?? role;

  return (
    <>
      {/* Sidebar */}
      <aside
        style={{
          width: isOpen ? 260 : 80,
          minWidth: isOpen ? 260 : 80,
          maxWidth: isOpen ? 260 : 80,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          height: '100vh',
          overflow: 'hidden',
          transition: 'width .3s ease-out, min-width .3s ease-out',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        }}
      >
        {/* Sidebar Header with User Role and Toggle */}
        <div
          style={{
            padding: isOpen ? '20px 18px' : '20px 12px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'space-between' : 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {isOpen && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: roleColor[role] || '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}
                >
                  {userName}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: roleColor[role] || '#475569',
                    lineHeight: 1.3,
                    marginTop: 2,
                  }}
                >
                  {role}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              color: '#6b7280',
              fontSize: 18,
              transition: 'all .2s ease',
              flexShrink: 0,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#6b7280';
            }}
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? '‹' : '›'}
          </button>
        </div>

        {/* Sidebar Menu */}
        <nav
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
          }}
        >
          {tabs.map((t) => {
            const isActive = currentPage === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  onPageChange(t.key as any);
                  // Auto-close sidebar after menu selection
                  if (isOpen && isMobile) {
                    onToggle();
                  } else if (isOpen) {
                    // Desktop: close sidebar to icon-only view
                    onToggle();
                  }
                  onMenuSelect?.();
                }}
                style={{
                  width: '100%',
                  background: isActive
                    ? (roleBg[role] || '#f0fdfa')
                    : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: isOpen ? '12px 14px' : '12px 0',
                  textAlign: isOpen ? 'left' : 'center',
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? (roleColor[role] || '#0f766e') : '#6b7280',
                  borderLeft: isActive
                    ? `3px solid ${roleColor[role] || '#0f766e'}`
                    : '3px solid transparent',
                  borderRight: 'none',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  gap: isOpen ? 12 : 0,
                  transition: 'all .2s ease',
                  marginBottom: '2px',
                  minHeight: '44px',
                  flexShrink: 0,
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {t.icon}
                </span>
                {isOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer - Logout Button */}
        <div
          style={{
            padding: '14px',
            borderTop: '1px solid #e5e7eb',
            background: '#fff',
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isOpen ? 'flex-start' : 'center',
              gap: isOpen ? 10 : 0,
              padding: isOpen ? '10px 12px' : '10px 8px',
              borderRadius: 8,
              background: '#fee2e2',
              border: '1.5px solid #fecaca',
              color: '#dc2626',
              fontSize: isOpen ? 13.5 : 14,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              transition: 'all .2s ease',
              flexShrink: 0,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#fecaca';
              e.currentTarget.style.borderColor = '#f87171';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.borderColor = '#fecaca';
            }}
            title="Logout"
          >
            <span style={{ fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              🚪
            </span>
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,.5)',
            zIndex: 998,
            animation: 'fadeIn .2s ease',
          }}
        />
      )}
    </>
  );
}
