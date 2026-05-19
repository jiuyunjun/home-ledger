import { CURRENCIES } from '@/lib/data';
import { NUM_FONT } from '@/lib/tokens';
import { T } from '@/lib/tokens';

interface Props {
  value: number;
  size?: number;
  weight?: number;
  color?: string;
  currency?: string;
  sign?: string;
  plain?: boolean;
  showCurrency?: boolean;
}

export function Amount({
  value,
  size = 14,
  weight = 500,
  color,
  currency = 'JPY',
  sign = '',
  plain = false,
  showCurrency = true,
}: Props) {
  const c = CURRENCIES[currency] ?? CURRENCIES.JPY;
  const abs = Math.abs(value);
  const num =
    c.decimals === 0
      ? Math.round(abs).toLocaleString('en-US')
      : abs.toLocaleString(c.locale, {
          minimumFractionDigits: c.decimals,
          maximumFractionDigits: c.decimals,
        });
  const realSign = sign || (value < 0 ? '-' : '');

  return (
    <span
      style={{
        fontFamily: NUM_FONT,
        fontVariantNumeric: 'tabular-nums',
        fontSize: size,
        fontWeight: weight,
        color: color ?? T.ink,
        letterSpacing: -0.2,
        whiteSpace: 'nowrap',
      }}
    >
      {realSign && <span>{realSign}</span>}
      {plain ? (
        num
      ) : (
        <>
          <span style={{ opacity: 0.6, marginRight: 1, fontSize: size * 0.78 }}>{c.symbol}</span>
          {num}
        </>
      )}
      {showCurrency && currency !== 'JPY' && (
        <span
          style={{
            fontSize: Math.max(8, size * 0.5),
            marginLeft: 4,
            color: T.textMute,
            fontWeight: 600,
            letterSpacing: 0.3,
            fontFamily: NUM_FONT,
          }}
        >
          {c.suffix ?? currency}
        </span>
      )}
    </span>
  );
}
