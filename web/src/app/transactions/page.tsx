'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { TxRow } from '@/components/ui/TxRow';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/lib/data';
import { T } from '@/lib/tokens';
import { useState } from 'react';

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

export default function TransactionsPage() {
  const { state } = useApp();
  const { transactions, currentRole } = state;
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');

  const filtered = transactions.filter((t) => {
    const roleMatch = t.type === 'transfer' || t.role === currentRole;
    const typeMatch = typeFilter === 'all' || t.type === typeFilter;
    return roleMatch && typeMatch;
  });

  const byDate: Record<string, Transaction[]> = {};
  filtered.forEach((t) => { (byDate[t.date] ??= []).push(t); });
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <PhoneScreen>
      <AppBar
        title="明细"
        subtitle={`2026 年 5 月 · 共 ${filtered.length} 笔`}
        right={<div style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>导出</div>}
      />

      {/* Search + filters */}
      <div style={{ padding: '0 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ color: T.textMute, fontSize: 13 }}>⌕</span>
          <span style={{ flex: 1, fontSize: 13, color: T.textMute }}>搜索店铺、来源或备注</span>
        </div>

        {/* Type segmented */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8, padding: 3, background: T.bgSubtle, borderRadius: 8 }}>
          {TYPE_FILTERS.map((f) => {
            const on = f.id === typeFilter;
            return (
              <div
                key={f.id}
                onClick={() => setTypeFilter(f.id as TxTypeFilter)}
                style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: 11, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none', cursor: 'pointer' }}
              >
                {f.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px 80px' }}>
        {dates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMute, fontSize: 13 }}>暂无记录</div>
        )}
        {dates.map((d) => {
          const { md, wd } = fmtDay(d);
          const dayEx = byDate[d]
            .filter((t) => t.type === 'expense')
            .reduce((acc, t) => acc + (t.currency === 'JPY' ? (t.amount ?? 0) : 0), 0);

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
                  <div key={tx.id} style={{ padding: '0 8px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, background: tx.type === 'transfer' ? `${T.transferSoft}40` : 'transparent' }}>
                    <TxRow tx={tx} />
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
