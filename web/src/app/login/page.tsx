'use client';

import { useAuth } from '@/context/AuthContext';
import { T } from '@/lib/tokens';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading, router]);

  async function handleSignIn() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e?.message ?? '登录失败，请重试');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e0e0e0', borderTopColor: '#4285F4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', fontWeight: 700 }}>家</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>家计簿</div>
          <div style={{ fontSize: 13, color: T.textMute }}>家庭记账，清晰可见</div>
        </div>

        {/* Sign in card */}
        <div style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: T.textSoft, textAlign: 'center', lineHeight: 1.6 }}>
            这是一个私人家庭记账工具。<br />请使用授权的 Google 账号登录。
          </div>

          <button
            onClick={handleSignIn}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 10, border: `1px solid ${T.border}`,
              background: busy ? T.bgSubtle : T.surface, cursor: busy ? 'default' : 'pointer',
              fontSize: 14, fontWeight: 600, color: T.ink, width: '100%',
              opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
          >
            <GoogleIcon />
            {busy ? '登录中…' : '使用 Google 账号登录'}
          </button>

          {error && (
            <div style={{ fontSize: 12, color: T.danger, textAlign: 'center', padding: '8px 12px', background: T.dangerSoft, borderRadius: 8 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: T.textDim, textAlign: 'center' }}>
          家计簿 · 私人使用
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
