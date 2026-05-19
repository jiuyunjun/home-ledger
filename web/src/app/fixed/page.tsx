'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { AccountChip } from '@/components/ui/AccountChip';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { CatMark } from '@/components/ui/CatMark';
import { RolePill } from '@/components/ui/RolePill';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Toggle } from '@/components/ui/Toggle';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { useApp } from '@/context/AppContext';
import { FixedRule, acctById, catById, roleById } from '@/lib/data';
import { NUM_FONT, T } from '@/lib/tokens';
import { useState } from 'react';

type TabId = 'all' | 'expense' | 'income';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all',     label: '全部'   },
  { id: 'expense', label: '固定支出' },
  { id: 'income',  label: '固定入账' },
];

function FixedRow({ f, onToggle }: { f: FixedRule; onToggle: () => void }) {
  const c = catById(f.cat);
  const r = roleById(f.role);
  const a = acctById(f.acct);
  const isIncome = f.type === 'income';

  return (
    <Card pad={12} style={{ opacity: f.enabled ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CatMark cat={c} size={32} />
          <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: 7, background: isIncome ? T.income : T.text, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>
            {isIncome ? '+' : '−'}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{f.name}</div>
            <Amount value={f.amount} size={15} weight={600} currency={f.currency} color={isIncome ? T.income : T.ink} sign={isIncome ? '+' : ''} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, fontSize: 11, color: T.textSoft }}>
            <TypeBadge type={f.type} />
            <RolePill role={r} />
            <AccountChip acct={a} />
            <span style={{ padding: '2px 7px', borderRadius: 999, background: T.bgSubtle, color: T.textSoft, fontSize: 10, fontWeight: 500 }}>每月 {f.day} 号</span>
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: T.textMute }}>
            <span>
              {f.enabled ? '下次生成 ' : '已暂停 · '}
              <span style={{ color: f.enabled ? T.ink : T.textMute, fontFamily: NUM_FONT, fontWeight: 600 }}>{f.next}</span>
            </span>
            <Toggle on={f.enabled} onClick={onToggle} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function FixedPage() {
  const { state, dispatch } = useApp();
  const { fixedRules } = state;
  const [tab, setTab] = useState<TabId>('all');

  const visible = tab === 'all' ? fixedRules : fixedRules.filter((f) => f.type === tab);
  const active = fixedRules.filter((f) => f.enabled);
  const monthlyEx = active.filter((f) => f.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const monthlyIn = active.filter((f) => f.type === 'income').reduce((a, b) => a + b.amount, 0);

  const nextDate = fixedRules
    .filter((f) => f.enabled && f.next !== '—')
    .map((f) => f.next)
    .sort()[0] ?? '—';

  return (
    <PhoneScreen>
      <AppBar
        title="固定收支"
        subtitle={`${active.length} 项启用`}
        right={
          <div style={{ width: 32, height: 32, borderRadius: 16, background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 300 }}>+</div>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Summary */}
        <Card pad={14} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.textMute, marginBottom: 3 }}>固定流入</div>
              <Amount value={monthlyIn} size={20} weight={600} color={T.income} sign="+" />
            </div>
            <div style={{ width: 1, background: T.borderSoft }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.textMute, marginBottom: 3 }}>固定流出</div>
              <Amount value={monthlyEx} size={20} weight={600} color={T.ink} />
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: T.textMute }}>
            <span>
              净额{' '}
              <Amount
                value={monthlyIn - monthlyEx}
                size={12}
                weight={600}
                color={monthlyIn > monthlyEx ? T.income : T.danger}
                sign={monthlyIn > monthlyEx ? '+' : ''}
              />
            </span>
            <span>下次生成 <span style={{ color: T.ink, fontFamily: NUM_FONT, fontWeight: 600 }}>{nextDate.slice(5)}</span></span>
          </div>
        </Card>

        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 4, padding: 3, marginBottom: 10, background: T.bgSubtle, borderRadius: 8 }}>
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <div
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none', cursor: 'pointer' }}
              >
                {t.label}
              </div>
            );
          })}
        </div>

        <SectionLabel right={`${visible.length} 项`}>所有规则</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((f) => (
            <FixedRow
              key={f.id}
              f={f}
              onToggle={() => dispatch({ type: 'TOGGLE_FIXED_RULE', ruleId: f.id })}
            />
          ))}
        </div>
      </div>
      <BottomNav />
    </PhoneScreen>
  );
}
