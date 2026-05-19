import { acctById, catById, roleById, Transaction } from '@/lib/data';
import { NUM_FONT, T } from '@/lib/tokens';
import { Amount } from './Amount';
import { CatMark } from './CatMark';
import { TypeBadge } from './TypeBadge';

interface Props {
  tx: Transaction;
  showDate?: boolean;
  dense?: boolean;
}

export function TxRow({ tx, showDate = false, dense = false }: Props) {
  const pad = dense ? '8px 4px' : '10px 4px';

  if (tx.type === 'transfer') {
    const from = acctById(tx.fromAcct ?? '');
    const to = acctById(tx.toAcct ?? '');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: pad }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: T.transferSoft, color: T.transfer,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 600, flexShrink: 0,
          }}
        >
          ⇄
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13, fontWeight: 500, color: T.ink,
              display: 'flex', alignItems: 'center', gap: 5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            <span>{from.name}</span>
            <span style={{ color: T.textMute, fontSize: 11 }}>→</span>
            <span>{to.name}</span>
          </div>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
              fontSize: 11, color: T.textMute,
            }}
          >
            <TypeBadge type="transfer" />
            {tx.rate && <span>汇率 {tx.rate}</span>}
            {showDate && (
              <>
                <span style={{ color: T.textDim }}>·</span>
                <span>{tx.date.slice(5)}</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <Amount
            value={tx.fromAmount ?? 0}
            size={13}
            weight={500}
            color={T.textSoft}
            currency={from.currency}
            showCurrency={from.currency !== 'JPY'}
          />
          {from.currency !== to.currency && (
            <Amount value={tx.toAmount ?? 0} size={11} weight={500} color={T.textMute} currency={to.currency} />
          )}
        </div>
      </div>
    );
  }

  const c = catById(tx.cat ?? '');
  const r = roleById(tx.role ?? '');
  const a = acctById(tx.acct ?? '');
  const isIncome = tx.type === 'income';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: pad }}>
      <CatMark cat={c} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14, fontWeight: 500, color: T.ink,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {tx.title}
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
            fontSize: 11, color: T.textMute,
          }}
        >
          {isIncome && <TypeBadge type="income" />}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: r.color }} />
            {r.name}
          </span>
          <span style={{ color: T.textDim }}>·</span>
          <span style={{ fontFamily: NUM_FONT }}>{a.name}</span>
          {showDate && (
            <>
              <span style={{ color: T.textDim }}>·</span>
              <span>{tx.date.slice(5)}</span>
            </>
          )}
        </div>
      </div>
      <Amount
        value={tx.amount ?? 0}
        size={14}
        weight={600}
        currency={tx.currency ?? 'JPY'}
        color={isIncome ? T.income : T.ink}
        sign={isIncome ? '+' : ''}
      />
    </div>
  );
}
