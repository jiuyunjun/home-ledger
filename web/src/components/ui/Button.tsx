import { CN_FONT, T } from '@/lib/tokens';
import { CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  full?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary:   { background: T.accent,      color: '#fff' },
  secondary: { background: T.bgSubtle,    color: T.ink, border: `1px solid ${T.border}` },
  ghost:     { background: 'transparent', color: T.textSoft },
  danger:    { background: T.dangerSoft,  color: T.danger },
  success:   { background: T.success,     color: '#fff' },
};

const SIZES: Record<Size, CSSProperties> = {
  sm: { padding: '6px 10px',  fontSize: 12, height: 28 },
  md: { padding: '8px 14px',  fontSize: 13, height: 36 },
  lg: { padding: '12px 18px', fontSize: 15, height: 48, borderRadius: 12 },
};

export function Button({ children, variant = 'primary', size = 'md', icon, full, style = {}, onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: CN_FONT,
        fontWeight: 500,
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        width: full ? '100%' : undefined,
        ...VARIANTS[variant],
        ...SIZES[size],
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
