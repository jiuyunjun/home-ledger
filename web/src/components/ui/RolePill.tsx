import { Role, roleById } from '@/lib/data';

interface Props {
  role: Role | string;
  size?: 'sm' | 'md';
  filled?: boolean;
}

export function RolePill({ role, size = 'sm', filled = true }: Props) {
  const r = typeof role === 'string' ? roleById(role) : role;
  const sty =
    size === 'md'
      ? { padding: '4px 10px', fontSize: 12, height: 24 }
      : { padding: '2px 8px', fontSize: 11, height: 20 };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        fontWeight: 500,
        lineHeight: 1,
        background: filled ? r.soft : 'transparent',
        color: r.color,
        border: filled ? 'none' : `1px solid ${r.color}40`,
        ...sty,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: r.color }} />
      {r.name}
    </span>
  );
}
