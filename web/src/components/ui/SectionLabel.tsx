import { T } from '@/lib/tokens';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  right?: ReactNode;
}

export function SectionLabel({ children, right }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '0 4px',
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: T.textSoft, letterSpacing: 0.3 }}>
        {children}
      </div>
      {right && <div style={{ fontSize: 12, color: T.textMute }}>{right}</div>}
    </div>
  );
}
