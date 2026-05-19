import { T } from '@/lib/tokens';
import { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  pad?: number;
  style?: CSSProperties;
}

export function Card({ children, pad = 14, style = {} }: Props) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
