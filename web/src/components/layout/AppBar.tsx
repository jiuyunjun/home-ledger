import { T } from '@/lib/tokens';
import { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function AppBar({ title, subtitle, left, right }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 16px 10px',
        minHeight: 52,
      }}
    >
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, letterSpacing: 0.2 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11, color: T.textMute, marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}
