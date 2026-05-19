import { NUM_FONT, T } from '@/lib/tokens';

interface Props {
  label?: string;
  w?: number;
  h?: number;
  tilt?: number;
}

export function ReceiptThumb({ label = '小票', w = 96, h = 128, tilt = 0 }: Props) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 8,
        background: 'repeating-linear-gradient(135deg, #F4EEDF 0 6px, #ECE3CE 6px 12px)',
        border: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8, left: 8, right: 8,
          height: 6,
          background: 'rgba(0,0,0,0.08)',
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 20, left: 8, right: 20,
          height: 3,
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 28, left: 8, right: 30,
          height: 3,
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 1,
        }}
      />
      <div
        style={{
          fontFamily: NUM_FONT,
          fontSize: 9,
          color: T.textMute,
          padding: '4px 0',
          background: 'rgba(255,255,255,0.6)',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
    </div>
  );
}
