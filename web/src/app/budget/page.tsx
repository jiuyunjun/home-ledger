'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { CatMark } from '@/components/ui/CatMark';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useApp } from '@/context/AppContext';
import { Budget, catById, roleById } from '@/lib/data';
import { NUM_FONT, T } from '@/lib/tokens';

function SumChip({ color, bg, label, count }: { color: string; bg: string; label: string; count: number }) {
  return (
    <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: NUM_FONT, fontSize: 16, fontWeight: 700, color }}>{count}</span>
    </div>
  );
}

function BudgetRow({ b }: { b: Budget }) {
  const c = catById(b.cat);
  const pct = b.used / b.limit;
  const over = pct >= 1;
  const near = !over && pct >= b.threshold;
  const accent = over ? T.danger : near ? T.warning : T.success;
  const accentSoft = over ? T.dangerSoft : near ? T.warningSoft : T.successSoft;
  const roleName = b.role === 'all' ? '全部角色' : roleById(b.role).name;

  return (
    <Card pad={12} style={{ opacity: b.enabled ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <CatMark cat={c} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>
              {c.name}
              <span style={{ fontSize: 10, color: T.textMute, marginLeft: 6, fontWeight: 400 }}>· {roleName}</span>
            </span>
            <Amount value={b.limit} size={13} weight={600} color={T.textSoft} />
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: T.textMute }}>
            已用 <Amount value={b.used} size={11} weight={600} color={accent} sign={over ? '!' : ''} />
            {' · '}剩余 <Amount value={b.limit - b.used} size={11} color={T.textSoft} sign={b.limit - b.used < 0 ? '-' : ''} />
          </div>
        </div>
        {(over || near) && (
          <div style={{ padding: '3px 8px', borderRadius: 999, background: accentSoft, color: accent, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {over ? '超出' : '临近'}
          </div>
        )}
      </div>
      <div style={{ height: 6, background: T.bgSubtle, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', background: accent, borderRadius: 3 }} />
        {!over && (
          <div style={{ position: 'absolute', left: `${b.threshold * 100}%`, top: -1, bottom: -1, width: 1.5, background: T.textDim, opacity: 0.7 }} />
        )}
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMute, fontFamily: NUM_FONT }}>
        <span style={{ color: accent, fontWeight: 600 }}>{Math.round(pct * 100)}%</span>
        <span>提醒阈值 {Math.round(b.threshold * 100)}%</span>
      </div>
    </Card>
  );
}

export default function BudgetPage() {
  const { state } = useApp();
  const { budgets } = state;

  const enabled = budgets.filter((b) => b.enabled);
  const total = enabled.reduce((a, b) => a + b.limit, 0);
  const used  = enabled.reduce((a, b) => a + b.used, 0);
  const overall = used / total;

  const getStatus = (b: Budget) => {
    const p = b.used / b.limit;
    return p >= 1 ? 0 : p >= b.threshold ? 1 : 2;
  };
  const sorted = [...budgets].sort((a, b) => getStatus(a) - getStatus(b));

  const overCount = enabled.filter((b) => b.used / b.limit >= 1).length;
  const nearCount = enabled.filter((b) => { const p = b.used / b.limit; return p >= b.threshold && p < 1; }).length;
  const okCount   = enabled.filter((b) => b.used / b.limit < b.threshold).length;

  return (
    <PhoneScreen>
      <AppBar
        title="每月预算"
        subtitle="2026 年 5 月 · 只统计支出"
        right={
          <div style={{ width: 32, height: 32, borderRadius: 16, background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 300 }}>+</div>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Overall card */}
        <Card pad={14} style={{ marginBottom: 14, background: `linear-gradient(155deg, #FFFFFF 0%, ${T.surfaceAlt} 100%)` }}>
          <div style={{ fontSize: 11, color: T.textMute, marginBottom: 4 }}>总预算使用</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Amount value={used} size={26} weight={600} color={T.ink} />
            <span style={{ fontSize: 12, color: T.textSoft }}>/ <Amount value={total} size={12} weight={500} color={T.textSoft} /></span>
          </div>
          <div style={{ marginTop: 10, height: 8, background: T.bgSubtle, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${Math.min(100, overall * 100)}%`, height: '100%', background: overall >= 1 ? T.danger : overall >= 0.85 ? T.warning : T.accent }} />
            <div style={{ position: 'absolute', left: '80%', top: -2, bottom: -2, width: 1, background: T.textDim }} />
          </div>
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMute }}>
            <span>{(overall * 100).toFixed(0)}% 已用</span>
            <span>剩余 <Amount value={total - used} size={10} color={T.textSoft} /></span>
          </div>
        </Card>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <SumChip color={T.danger}  bg={T.dangerSoft}  label="超出" count={overCount} />
          <SumChip color={T.warning} bg={T.warningSoft} label="临近" count={nearCount} />
          <SumChip color={T.success} bg={T.successSoft} label="健康" count={okCount}   />
        </div>

        <SectionLabel right="按状态排序">所有分类</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((b) => <BudgetRow key={b.id} b={b} />)}
        </div>
      </div>
      <BottomNav active="budget" />
    </PhoneScreen>
  );
}
