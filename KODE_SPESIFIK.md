# 🔧 KODE SPESIFIK UNTUK COPY-PASTE

Gunakan dokumen ini untuk copy-paste kode yang tepat ke file Anda.

---

## 1️⃣ app/login/page.tsx

**Buka file: `app/login/page.tsx`**

**Aksi: HAPUS SEMUA → PASTE KODE INI:**

```tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) { setError('Username dan password wajib diisi'); return; }
    setLoading(true); setError('');
    const res = await signIn('credentials', { username, password, redirect: false });
    if (res?.ok) {
      router.push('/');
    } else {
      setError('Username atau password salah');
    }
    setLoading(false);
  };

  const roles = [
    { role: 'MPC',     color: '#2563eb', bg: '#eff6ff', desc: 'Master Part' },
    { role: 'PPC',     color: '#16a34a', bg: '#f0fdf4', desc: 'Master ASSY' },
    { role: 'DESIGN',  color: '#7c3aed', bg: '#faf5ff', desc: 'Upload BOM'  },
    { role: 'FINANCE', color: '#d97706', bg: '#fffbeb', desc: 'Prod Plan'   },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: '#f8fafc',
      flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: #9ca3af; }
      `}</style>

      {/* Top Header with Logo */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#6b7280' }}>
          Bill of Materials System
        </div>
        <div style={{ position: 'relative', width: 120, height: 40 }}>
          <Image
            src="/yazaki-logo.png"
            alt="Yazaki Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
      }}>
        {/* Left panel — branding */}
        <div style={{
          flex: 1,
          display: 'none',
          background: 'linear-gradient(145deg, #1e3a5f 0%, #1d4ed8 50%, #2563eb 100%)',
          padding: '60px 48px',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }} className="left-panel">
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
          <div style={{ position: 'absolute', top: '40%', right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 60 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(255,255,255,.2)' }}>📋</div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>BOM Database</span>
            </div>

            <h1 style={{ color: '#fff', fontSize: 38, fontWeight: 800, lineHeight: 1.2, letterSpacing: -1, marginBottom: 16 }}>
              Bill of Materials<br />Management
            </h1>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>
              Platform terpusat untuk manajemen data BOM, Prod Plan, dan kalkulasi Total Usage lintas departemen.
            </p>
          </div>

          <div>
            <div style={{ marginBottom: 24, color: 'rgba(255,255,255,.5)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Akses per Departemen</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {roles.map(r => (
                <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>{r.role[0]}</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, letterSpacing: 0.2 }}>{r.role}</div>
                    <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 11.5 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — login form */}
        <div style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          margin: '0 auto',
        }}>
          <div style={{ width: '100%', animation: 'fadeUp .4s ease' }}>
            {/* Logo mobile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40, justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 140, height: 50 }}>
                <Image
                  src="/yazaki-logo.png"
                  alt="Yazaki Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' }}>Selamat Datang</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32, lineHeight: 1.5, textAlign: 'center' }}>Masuk dengan akun departemen Anda</p>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.7 }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9ca3af' }}>👤</span>
                  <input
                    value={username} onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Masukkan username"
                    style={{
                      width: '100%', padding: '11px 12px 11px 38px',
                      borderRadius: 9, border: '1.5px solid #e2e8f0',
                      fontSize: 14, fontFamily: "'DM Sans', system-ui", outline: 'none',
                      color: '#111827', background: '#fff',
                      transition: 'border-color .15s, box-shadow .15s',
                      boxShadow: '0 1px 2px rgba(0,0,0,.05)',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; }}
                    onBlur={e =>  { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,.05)'; }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.7 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9ca3af' }}>🔒</span>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Masukkan password"
                    style={{
                      width: '100%', padding: '11px 12px 11px 38px',
                      borderRadius: 9, border: '1.5px solid #e2e8f0',
                      fontSize: 14, fontFamily: "'DM Sans', system-ui", outline: 'none',
                      color: '#111827', background: '#fff',
                      transition: 'border-color .15s, box-shadow .15s',
                      boxShadow: '0 1px 2px rgba(0,0,0,.05)',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; }}
                    onBlur={e =>  { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,.05)'; }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
                  <span>⚠</span> {error}
                </div>
              )}

              <button onClick={handleLogin} disabled={loading} style={{
                width: '100%', padding: '12px',
                background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                color: '#fff', border: 'none', borderRadius: 9,
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', system-ui",
                boxShadow: '0 4px 14px rgba(37,99,235,.3)',
                transition: 'opacity .15s, transform .1s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4,
              }}
              onMouseOver={e => { if (!loading) { e.currentTarget.style.opacity = '.93'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseOut={e =>  { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    Masuk...
                  </>
                ) : 'Masuk'}
              </button>
            </div>

            {/* Role Info Grid - Responsive */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.7 }}>Akses Tersedia</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                {roles.map(r => (
                  <div key={r.role} style={{ padding: '10px', borderRadius: 8, background: r.bg, border: `1px solid ${r.color}40`, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: r.color, marginBottom: 2 }}>{r.role}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          header { padding: 12px 16px; }
          .left-panel { display: none !important; }
          div[style*="maxWidth: 480"] { padding: 24px 16px; }
        }
      `}</style>
    </div>
  );
}
```

---

## 2️⃣ app/page.tsx - Header Section

**Buka file: `app/page.tsx`**

**Cari baris yang punya:** `{/* Header for mobile */}`

**Ganti section header dengan:**

```tsx
      {/* Header for mobile */}
      <header style={{
        display: 'none', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', borderBottom: '1px solid #e8eaed',
        padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.03)',
        '@media (maxWidth: 1024px)': { display: 'flex' }
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
          BOM Database
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/yazaki-logo.png"
            alt="Yazaki"
            style={{ height: 28, width: 'auto', objectFit: 'contain' }}
          />
          <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
      </header>
```

**Kemudian, di dalam `<style>{` tag, tambahkan:**

```css
        @media (max-width: 768px) {
          header { padding: 10px 12px; }
          main { padding: 16px 12px !important; }
        }
        @media (min-width: 1024px) {
          main { padding: 24px 20px !important; }
        }
```

---

## 3️⃣ components/ui.tsx - Sidebar Header

**Buka file: `components/ui.tsx`**

**Cari fungsi:** `export function SidebarHeader()`

**Ganti dengan:**

```tsx
export function SidebarHeader() {
  return (
    <div style={{
      padding: '16px 18px',
      borderBottom: `1px solid ${tokens.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: '#fff',
    }}>
      <img
        src="/yazaki-logo.png"
        alt="Yazaki"
        style={{
          height: 32,
          width: 'auto',
          objectFit: 'contain',
          maxWidth: '100%',
        }}
      />
      <div>
        <div style={{ fontWeight: 800, fontSize: 13, color: tokens.gray900, lineHeight: 1 }}>
          BOM
        </div>
        <div style={{ fontSize: 9, color: tokens.gray400, fontWeight: 600 }}>
          Database
        </div>
      </div>
    </div>
  );
}
```

---

## 4️⃣ app/globals.css - Seluruh File

**Buka file: `app/globals.css`**

**HAPUS SEMUA → PASTE:**

```css
@import "tailwindcss";

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #__next {
  width: 100%;
  height: 100%;
}

html {
  background-color: #f8f9fa;
}

body {
  background-color: #f8f9fa;
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  color: #111827;
  line-height: 1.5;
}

/* Responsive Sidebar Styles */
@media (max-width: 1023px) {
  aside {
    display: none;
    width: 260px;
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 40;
    box-shadow: 0 20px 40px rgba(0,0,0,.15);
  }
  
  aside[style*="translateX(0)"] {
    display: flex;
  }
}

@media (min-width: 1024px) {
  aside {
    display: flex !important;
    position: relative !important;
    transform: translateX(0) !important;
    width: 260px;
    height: auto;
    box-shadow: 1px 0 3px rgba(0,0,0,.05);
  }
  
  header {
    display: none !important;
  }
  
  main {
    margin-left: 0 !important;
  }
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  transition: background 0.15s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Input placeholder styling */
input::placeholder,
select::placeholder,
textarea::placeholder {
  color: #9ca3af;
  font-weight: 500;
}

/* Selection styling */
::selection {
  background-color: #bfdbfe;
  color: #1e3a8a;
}

/* Responsive Text Sizes */
@media (max-width: 640px) {
  body {
    font-size: 13px;
  }
  h1 {
    font-size: 24px;
  }
  h2 {
    font-size: 20px;
  }
}

/* Smooth transitions */
button, input, select, textarea {
  transition: all 0.15s ease;
}

/* Better form input appearance */
input[type="text"],
input[type="password"],
input[type="email"],
input[type="number"],
select,
textarea {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

/* Focus visible styles */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Print styles */
@media print {
  body {
    background-color: white;
  }
}
```

---

## 5️⃣ app/layout.tsx - Metadata

**Buka file: `app/layout.tsx`**

**GANTI dengan:**

```tsx
import type { Metadata, Viewport } from 'next';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOM Database - Yazaki',
  description: 'Bill of Materials Database System',
  keywords: 'BOM, Database, Materials, Manufacturing',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" style={{ background: '#f8f9fa' }}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

## ✅ Semua File Sudah Siap!

| File | Status | Aksi |
|------|--------|------|
| `app/login/page.tsx` | ✅ Kode ready | Copy-paste semua |
| `app/page.tsx` | ✅ Kode ready | Update header section |
| `components/ui.tsx` | ✅ Kode ready | Update SidebarHeader |
| `app/globals.css` | ✅ Kode ready | Copy-paste semua |
| `app/layout.tsx` | ✅ Kode ready | Copy-paste semua |
| `public/yazaki-logo.png` | ✅ Sudah ada | Tidak perlu action |

---

**🚀 Siap? Mulai dari file pertama dan ikuti urutan!**
