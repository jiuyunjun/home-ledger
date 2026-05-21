import { CN_FONT, T } from '@/lib/tokens';
import { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  bg?: string;
}

export function PhoneScreen({ children, bg = T.bg }: Props) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 390,
        minHeight: '100dvh',
        margin: '0 auto',
        background: bg,
        fontFamily: CN_FONT,
        color: T.text,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        WebkitFontSmoothing: 'antialiased',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as CSSProperties}
    >
      {children}
    </div>
  );
}
