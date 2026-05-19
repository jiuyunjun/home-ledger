import { Account, ACCT_KIND, acctById } from '@/lib/data';
import { NUM_FONT, T } from '@/lib/tokens';

interface Props {
  acct: Account | string;
  size?: 'sm' | 'md';
}

export function AccountChip({ acct, size = 'sm' }: Props) {
  const a = typeof acct === 'string' ? acctById(acct) : acct;
  const k = ACCT_KIND[a.kind];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'md' ? '4px 9px' : '2px 7px',
        borderRadius: 999,
        background: T.bgSubtle,
        fontSize: size === 'md' ? 12 : 10,
        color: T.textSoft,
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 1, background: k.color }} />
      {a.name}
      {a.tail && (
        <span style={{ opacity: 0.55, fontFamily: NUM_FONT, fontSize: size === 'md' ? 10 : 9 }}>
          ·{a.tail}
        </span>
      )}
      {a.currency !== 'JPY' && (
        <span style={{ fontFamily: NUM_FONT, fontSize: 9, opacity: 0.7, fontWeight: 600 }}>
          {a.currency}
        </span>
      )}
    </span>
  );
}
