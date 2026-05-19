'use client';

import { T } from '@/lib/tokens';
import Link from 'next/link';

type NavId = 'home' | 'list' | 'add' | 'fixed' | 'me';

interface Props {
  active?: NavId;
}

const items: { id: NavId; label: string; icon: string; href: string; primary?: boolean }[] = [
  { id: 'home',   label: '首页', icon: '⊞', href: '/' },
  { id: 'list',   label: '明细', icon: '≡', href: '/transactions' },
  { id: 'add',    label: '',    icon: '+', href: '/entry', primary: true },
  { id: 'fixed',  label: '固定', icon: '↻', href: '/fixed' },
  { id: 'me',     label: '设置', icon: '◉', href: '/settings' },
];

export function BottomNav({ active = 'home' }: Props) {
  return (
    <div
      style={{
        borderTop: `1px solid ${T.borderSoft}`,
        background: 'rgba(251, 248, 242, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 8px 14px',
        position: 'sticky',
        bottom: 0,
      }}
    >
      {items.map((it) => {
        if (it.primary) {
          return (
            <Link key={it.id} href={it.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: T.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 300,
                  marginTop: -16,
                  boxShadow: '0 4px 12px rgba(61, 90, 108, 0.3)',
                }}
              >
                {it.icon}
              </div>
            </Link>
          );
        }
        const on = active === it.id;
        return (
          <Link key={it.id} href={it.href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                color: on ? T.accent : T.textMute,
                width: 56,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: on ? T.accentSoft : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {it.icon}
              </div>
              <div style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{it.label}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
