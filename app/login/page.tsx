'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState<'username' | 'password' | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) { setError('Username dan password wajib diisi'); return; }
    setLoading(true); setError('');
    const res = await signIn('credentials', { username, password, redirect: false });
    if (res?.ok) {
      window.location.href = '/';
    } else {
      setError('Username atau password salah');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: '#fff',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeInLeft { from { opacity:0; transform:translateX(-40px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fadeInRight { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 0.6 } 50% { opacity: 0.8 } }
        @keyframes orbFloat1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4 } 25% { transform: translate(60px, -40px) scale(1.1); opacity: 0.5 } 50% { transform: translate(30px, 50px) scale(1); opacity: 0.4 } 75% { transform: translate(-40px, 30px) scale(0.95); opacity: 0.3 } }
        @keyframes orbFloat2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35 } 25% { transform: translate(-50px, 60px) scale(0.95); opacity: 0.45 } 50% { transform: translate(-20px, -40px) scale(1.05); opacity: 0.35 } 75% { transform: translate(50px, -20px) scale(1); opacity: 0.4 } }
        @keyframes orbFloat3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3 } 25% { transform: translate(40px, 50px) scale(1.05); opacity: 0.4 } 50% { transform: translate(-60px, 20px) scale(1); opacity: 0.3 } 75% { transform: translate(20px, -50px) scale(0.98); opacity: 0.35 } }
        input::placeholder { color: #94a3b8; }
        input::-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
          -webkit-text-fill-color: #1e293b !important;
        }
        @media (max-width: 900px) {
          .left-section { display: none !important; }
          .right-section { 
            flex: 1 !important; 
            background-image: url('/login-bg.jpg') !important;
            background-size: cover !important;
            background-position: center !important;
          }
          .right-section::before {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(255,255,255,0.85);
            backdrop-filter: blur(8px);
          }
        }
      `}</style>

      {/* LEFT SECTION — Branding */}
      <div
        className="left-section"
        style={{
          flex: 1,
          padding: '60px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #0d9488 100%)',
        }}>
        
        {/* Elegant gradient orbs */}
        <div style={{ 
          position: 'absolute',
          top: '-10%',
          right: '10%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), rgba(255,255,255,0.05))',
          filter: 'blur(40px)',
          animation: 'orbFloat1 15s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        
        <div style={{ 
          position: 'absolute',
          bottom: '5%',
          left: '-5%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(255,255,255,0.03))',
          filter: 'blur(50px)',
          animation: 'orbFloat2 18s ease-in-out infinite 2s',
          pointerEvents: 'none',
        }} />
        
        <div style={{ 
          position: 'absolute',
          top: '50%',
          right: '-10%',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(255,255,255,0.02))',
          filter: 'blur(45px)',
          animation: 'orbFloat3 20s ease-in-out infinite 4s',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, marginTop: -40 }}>
          {/* Logo */}
          <div style={{ 
            marginBottom: 40, 
            animation: 'fadeInLeft .6s ease .1s backwards',
          }}>
            <img
              src="/yazaki-logo.jpeg"
              alt="YAZAKI Logo"
              style={{ 
                height: 72, 
                width: 'auto', 
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
              }}
            />
          </div>

          <h1 style={{ 
            fontSize: 44, 
            fontWeight: 800, 
            color: '#ffffff', 
            marginBottom: 20, 
            letterSpacing: -1.5, 
            lineHeight: 1.1, 
            animation: 'fadeInLeft .6s ease .2s backwards' 
          }}>
            Bill of Materials Management
          </h1>

          <p style={{ 
            fontSize: 16, 
            color: 'rgba(255,255,255,0.85)', 
            lineHeight: 1.7, 
            maxWidth: 420, 
            animation: 'fadeInLeft .6s ease .3s backwards' 
          }}>
            Platform terpusat untuk manajemen data BOM, Prod Plan, dan kalkulasi Total Usage lintas departemen Yazaki.
          </p>
        </div>
      </div>

      {/* RIGHT SECTION — Login Form */}
      <div
        className="right-section"
        style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '40px 48px', 
          position: 'relative',
          background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)',
        }}>
        
        {/* Subtle accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(15, 118, 110, 0.2), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Login Card */}
        <div style={{ 
          width: '100%', 
          maxWidth: 400, 
          animation: 'fadeInRight .6s ease .2s backwards',
          position: 'relative',
          zIndex: 10,
          background: '#ffffff',
          borderRadius: 16,
          padding: '48px 40px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(15, 118, 110, 0.1)',
          border: '1px solid rgba(15, 118, 110, 0.08)',
        }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0f766e', marginBottom: 8, letterSpacing: -0.5 }}>Masuk</h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, fontWeight: 500 }}>
              Gunakan akun departemen Anda untuk mengakses sistem
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Username */}
            <div style={{ animation: 'slideUp .6s ease .3s backwards' }}>
              <label style={{ 
                display: 'block', 
                fontSize: 12, 
                fontWeight: 700, 
                color: focused === 'username' ? '#0f766e' : '#475569', 
                marginBottom: 8, 
                textTransform: 'uppercase', 
                letterSpacing: 0.5, 
                transition: 'color .2s ease' 
              }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ 
                  position: 'absolute', 
                  left: 16, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  fontSize: 15,
                  color: focused === 'username' ? '#0f766e' : '#94a3b8',
                  transition: 'color .2s ease',
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  placeholder="Masukkan username Anda"
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px 14px 48px', 
                    borderRadius: 10, 
                    border: focused === 'username' ? '2px solid #0f766e' : '1.5px solid #e2e8f0', 
                    fontSize: 14, 
                    fontFamily: "'DM Sans', system-ui", 
                    outline: 'none', 
                    color: '#1e293b', 
                    background: focused === 'username' ? '#f0fdfa' : '#fff', 
                    transition: 'all .2s ease', 
                    boxShadow: focused === 'username' ? '0 0 0 3px rgba(15, 118, 110, 0.08)' : '0 1px 2px rgba(0,0,0,0.04)' 
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ animation: 'slideUp .6s ease .35s backwards' }}>
              <label style={{ 
                display: 'block', 
                fontSize: 12, 
                fontWeight: 700, 
                color: focused === 'password' ? '#0f766e' : '#475569', 
                marginBottom: 8, 
                textTransform: 'uppercase', 
                letterSpacing: 0.5, 
                transition: 'color .2s ease' 
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ 
                  position: 'absolute', 
                  left: 16, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  fontSize: 15,
                  color: focused === 'password' ? '#0f766e' : '#94a3b8',
                  transition: 'color .2s ease',
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Masukkan password Anda"
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px 14px 48px', 
                    borderRadius: 10, 
                    border: focused === 'password' ? '2px solid #0f766e' : '1.5px solid #e2e8f0', 
                    fontSize: 14, 
                    fontFamily: "'DM Sans', system-ui", 
                    outline: 'none', 
                    color: '#1e293b', 
                    background: focused === 'password' ? '#f0fdfa' : '#fff', 
                    transition: 'all .2s ease', 
                    boxShadow: focused === 'password' ? '0 0 0 3px rgba(15, 118, 110, 0.08)' : '0 1px 2px rgba(0,0,0,0.04)' 
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '12px 16px', 
                background: '#fee2e2', 
                border: '1px solid #fca5a5', 
                borderRadius: 10, 
                color: '#7f1d1d', 
                fontSize: 13, 
                fontWeight: 500, 
                animation: 'slideUp .3s ease' 
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="12"/>
                  <line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', 
                padding: '14px 16px',
                background: loading ? '#c2e7e4' : '#0f766e',
                color: '#fff', 
                border: 'none', 
                borderRadius: 10, 
                fontSize: 15, 
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontFamily: "'DM Sans', system-ui",
                boxShadow: loading ? 'none' : '0 6px 20px rgba(15, 118, 110, 0.25)',
                transition: 'all .2s ease', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center', 
                gap: 8, 
                marginTop: 8,
                animation: 'slideUp .6s ease .4s backwards',
              }}
              onMouseOver={e => { 
                if (!loading) { 
                  e.currentTarget.style.background = '#0d6e68';
                  e.currentTarget.style.transform = 'translateY(-2px)'; 
                  e.currentTarget.style.boxShadow = '0 10px 28px rgba(15, 118, 110, 0.35)'; 
                }
              }}
              onMouseOut={e => { 
                if (!loading) { 
                  e.currentTarget.style.background = '#0f766e';
                  e.currentTarget.style.transform = 'translateY(0)';   
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 118, 110, 0.25)'; 
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  <span>Masuk...</span>
                </>
              ) : 'Masuk'}
            </button>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            <p style={{ fontWeight: 500 }}>YAZAKI BOM Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
}
