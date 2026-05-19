'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import { useData } from '@/context/DataContext';
import { apiGet } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import { T, NUM_FONT, CN_FONT } from '@/lib/tokens';
import type { ApiTransaction } from '@/lib/types';
import { useEffect, useState } from 'react';

const TYPE_FILTERS = [
  { id: 'all',      label: '全部' },
  { id: 'expense',  label: '支出' },
  { id: 'income',   label: '入账' },
  { id: 'transfer', label: '转账' },
];

type TxTypeFilter = 'all' | 'expense' | 'income' | 'transfer';

function fmtDay(dateStr: string) {
  const m = parseInt(dateStr.slice(5, 7), 10);
  const day = parseInt(dateStr.slice(8, 10), 10);
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(dateStr).getDay()];
  return { md: `${m}月${day}日`, wd };
}

function ApiTxRow({ tx }: { tx: ApiTransaction }) {
  const data = useData();
  const { state } = useApp();
  const pad = '10px 4px';

  if (tx.transactionType === 'transfer') {
    const from = data.account(tx.fromAccountId ?? '');
    const to = data.account(tx.toAccountId ?? '');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: pad }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.transferSoft, color: T.transfer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>⇄</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {from?.name ?? '—'} → {to?.name ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: T.textMute, marginTop: 2, fontFamily: NUM_FONT }}>转账</div>
        </div>
        <Amount value={tx.amount} size={13} weight={500} color={T.textSoft} currency={tx.currency} showCurrency={tx.currency !== 'JPY'} />
      </div>
    );
  }

  const cat = data.category(tx.categoryId ?? '');
  const actor = data.actor(tx.actorId);
  const pm = data.paymentMethod(tx.paymentMethodId ?? '');
  const isIncome = tx.transactionType === 'income';
  const { mark, tint } = catDisplay(cat?.name ?? '');

  // Find actor color from AppContext mock roles for display
  const actorColors: Record<string, string> = {};
  const actors = data.actors;
  const colorPalette = [T.roleMe, T.roleHer, T.roleFamily];
  actors.forEach((a, i) => { actorColors[a.id] = colorPalette[i % colorPalette.length]; });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: pad }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, fontFamily: CN_FONT, flexShrink: 0, color: T.ink }}>{mark}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.title || cat?.name || '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 11, color: T.textMute }}>
          {isIncome && <span style={{ background: T.incomeSoft, color: T.income, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>入账</span>}
          {actor && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: actorColors[actor.id] }} />
              {actor.displayName}
            </span>
          )}
          {pm && (
            <>
              <span style={{ color: T.textDim }}>·</span>
              <span style={{ fontFamily: NUM_FONT }}>{pm.name}</span>
            </>
          )}
        </div>
      </div>
      <Amount
        value={tx.amount}
        size={14}
        weight={600}
        currency={tx.currency}
        color={isIncome ? T.income : T.ink}
        sign={isIncome ? '+' : ''}
      />
    </div>
  );
  void state;
}

export default function TransactionsPage() {
  const { state } = useApp();
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [txs, setTxs] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (state.currentRole) params.set('actorId', state.currentRole);
    apiGet<ApiTransaction[]>(`/api/transactions?${params}`)
      .then((data) => {
        // transfers always show regardless of actorId filter
        setTxs(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [state.currentRole, month]);

  const filtered = txs.filter((t) => {
    const typeMatch = typeFilter === 'all' || t.transactionType === typeFilter;
    return typeMatch;
  });

  const byDate: Record<string, ApiTransaction[]> = {};
  filtered.forEach((t) => { (byDate[t.transactionDate] ??= []).push(t); });
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <PhoneScreen>
      <AppBar
        title="明细"
        subtitle={`${month.replace('-', ' 年 ')} 月 · 共 ${filtered.length} 笔`}
        right={<div style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>导出</div>}
      />

      <div style={{ padding: '0 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ color: T.textMute, fontSize: 13 }}>⌕</span>
          <span style={{ flex: 1, fontSize: 13, color: T.textMute }}>搜索店铺、来源或备注</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8, padding: 3, background: T.bgSubtle, borderRadius: 8 }}>
          {TYPE_FILTERS.map((f) => {
            const on = f.id === typeFilter;
            return (
              <div key={f.id} onClick={() => setTypeFilter(f.id as TxTypeFilter)} style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: 11, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, cursor: 'pointer' }}>
                {f.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px 80px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMute, fontSize: 13 }}>加载中…</div>}
        {!loading && dates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMute, fontSize: 13 }}>暂无记录</div>
        )}
        {dates.map((d) => {
          const { md, wd } = fmtDay(d);
          const dayEx = byDate[d]
            .filter((t) => t.transactionType === 'expense')
            .reduce((acc, t) => acc + (t.currency === 'JPY' ? t.amount : 0), 0);
          return (
            <div key={d} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{md}</span>
                  <span style={{ fontSize: 11, color: T.textMute }}>{wd}</span>
                </div>
                {dayEx > 0 && <Amount value={dayEx} size={12} color={T.textSoft} weight={500} />}
              </div>
              <Card pad={4}>
                {byDate[d].map((tx, i) => (
                  <div key={tx.id} style={{ padding: '0 8px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, background: tx.transactionType === 'transfer' ? `${T.transferSoft}40` : 'transparent' }}>
                    <ApiTxRow tx={tx} />
                  </div>
                ))}
              </Card>
            </div>
          );
        })}
      </div>

      <BottomNav active="list" />
    </PhoneScreen>
  );
}
