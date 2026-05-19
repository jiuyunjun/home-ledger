'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Toggle } from '@/components/ui/Toggle';
import { useData } from '@/context/DataContext';
import { apiGet, apiPatch } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import { useCallback, useEffect, useState } from 'react';

interface RecurringRule {
  id: string;
  householdId: string;
  actorId: string;
  transactionType: string;
  title: string;
  amount: number;
  currency: string;
  categoryId: string;
  paymentMethodId: string;
  frequency: string;
  dayOfMonth: number;
  nextRunDate: string;
  isActive: boolean;
  memo: string;
}

type TabId = 'all' | 'expense' | 'income';
const TABS: { id: TabId; label: string }[] = [
  { id: 'all',     label: '全部'   },
  { id: 'expense', label: '固定支出' },
  { id: 'income',  label: '固定入账' },
];

function RuleRow({ rule, onToggle }: { rule: RecurringRule; onToggle: () => void }) {
  const data = useData();
  const cat = data.category(rule.categoryId);
  const actor = data.actor(rule.actorId);
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const isIncome = rule.transactionType === 'income';

  const nextLabel = rule.nextRunDate
    ? rule.nextRunDate.slice(5).replace('-', '/')
    : '—';

  return (
    <Card pad={12} style={{ opacity: rule.isActive ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
          <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: 7, background: isIncome ? T.income : T.text, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>
            {isIncome ? '+' : '−'}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{rule.title}</div>
            <Amount value={rule.amount} size={15} weight={600} currency={rule.currency as 'JPY' | 'CNY'} color={isIncome ? T.income : T.ink} sign={isIncome ? '+' : ''} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, fontSize: 11, color: T.textSoft }}>
            <span style={{ padding: '2px 7px', borderRadius: 999, background: isIncome ? T.incomeSoft : T.bgSubtle, color: isIncome ? T.income : T.textSoft, fontSize: 10, fontWeight: 600 }}>{isIncome ? '入账' : '支出'}</span>
            {actor && <span style={{ padding: '2px 7px', borderRadius: 999, background: T.bgSubtle, color: T.textSoft, fontSize: 10, fontWeight: 500 }}>{actor.displayName}</span>}
            {cat && <span style={{ padding: '2px 7px', borderRadius: 999, background: T.bgSubtle, color: T.textSoft, fontSize: 10, fontWeight: 500 }}>{cat.name}</span>}
            {rule.dayOfMonth > 0 && <span style={{ padding: '2px 7px', borderRadius: 999, background: T.bgSubtle, color: T.textSoft, fontSize: 10, fontWeight: 500 }}>每月 {rule.dayOfMonth} 号</span>}
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: T.textMute }}>
            <span>
              {rule.isActive ? '下次生成 ' : '已暂停 · '}
              <span style={{ color: rule.isActive ? T.ink : T.textMute, fontFamily: NUM_FONT, fontWeight: 600 }}>{rule.isActive ? nextLabel : '—'}</span>
            </span>
            <Toggle on={rule.isActive} onClick={onToggle} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function FixedPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('all');

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<RecurringRule[]>('/api/recurring-rules');
      setRules(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  async function handleToggle(rule: RecurringRule) {
    try {
      await apiPatch(`/api/recurring-rules/${rule.id}`, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
    } catch (e) {
      console.error(e);
    }
  }

  const visible = tab === 'all' ? rules : rules.filter((r) => r.transactionType === tab);
  const active = rules.filter((r) => r.isActive);
  const monthlyEx = active.filter((r) => r.transactionType === 'expense' && r.currency === 'JPY').reduce((s, r) => s + r.amount, 0);
  const monthlyIn = active.filter((r) => r.transactionType === 'income'  && r.currency === 'JPY').reduce((s, r) => s + r.amount, 0);

  const nextDate = active
    .filter((r) => r.nextRunDate && r.nextRunDate !== '')
    .map((r) => r.nextRunDate)
    .sort()[0] ?? '';

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
              <Amount value={monthlyIn - monthlyEx} size={12} weight={600} color={monthlyIn > monthlyEx ? T.income : T.danger} sign={monthlyIn > monthlyEx ? '+' : ''} />
            </span>
            <span>
              下次生成{' '}
              <span style={{ color: T.ink, fontFamily: NUM_FONT, fontWeight: 600 }}>
                {nextDate ? nextDate.slice(5).replace('-', '/') : '—'}
              </span>
            </span>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 4, padding: 3, marginBottom: 10, background: T.bgSubtle, borderRadius: 8 }}>
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none', cursor: 'pointer' }}>
                {t.label}
              </div>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: T.textMute, fontSize: 13 }}>加载中…</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: T.textMute, fontSize: 13 }}>暂无固定规则</div>
        ) : (
          <>
            <SectionLabel right={`${visible.length} 项`}>所有规则</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.map((rule) => (
                <RuleRow key={rule.id} rule={rule} onToggle={() => handleToggle(rule)} />
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </PhoneScreen>
  );
}
