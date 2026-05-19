import { catById, Category } from '@/lib/data';
import { CN_FONT, T } from '@/lib/tokens';

interface Props {
  cat: Category | string;
  size?: number;
}

export function CatMark({ cat, size = 32 }: Props) {
  const c = typeof cat === 'string' ? catById(cat) : cat;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: c.tint,
        color: T.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 600,
        flexShrink: 0,
        fontFamily: CN_FONT,
      }}
    >
      {c.mark}
    </div>
  );
}
