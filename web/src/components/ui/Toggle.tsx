import { T } from '@/lib/tokens';

export function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? T.success : T.bgSubtle,
        padding: 2,
        position: 'relative',
        border: on ? 'none' : `1px solid ${T.border}`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          background: '#fff',
          transform: on ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
}
