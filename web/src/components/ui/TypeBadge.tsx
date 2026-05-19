import { TX_TYPES } from '@/lib/data';

interface Props {
  type: string;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'sm' }: Props) {
  const t = TX_TYPES[type] ?? TX_TYPES.expense;
  const sty =
    size === 'md'
      ? { padding: '3px 9px', fontSize: 11, height: 22 }
      : { padding: '2px 6px', fontSize: 10, height: 18 };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        borderRadius: 4,
        fontWeight: 600,
        lineHeight: 1,
        background: t.soft,
        color: t.color,
        ...sty,
      }}
    >
      {t.label}
    </span>
  );
}
