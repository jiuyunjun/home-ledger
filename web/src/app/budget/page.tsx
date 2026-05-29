'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useData } from '@/context/DataContext';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import type { BudgetUsageItem, MonthlyBudget } from '@/lib/types';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import { useCallback, useEffect, useState } from 'react';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return `${y} 年 ${parseInt(m)} 月`;
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Bottom-sheet primitives ──────────────────────────────────────────────────

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.32)' }} />;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99, background: T.surface, borderRadius: '16px 16px 0 0', padding: '16px 16px 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.14)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, textAlign: 'center', marginBottom: 14 }}>{title}</div>
        {children}
        <div onClick={onClose} style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: T.textMute, cursor: 'pointer' }}>取消</div>
      </div>
    </>
  );
}

// ─── Add-budget sheet ────────────────────────────────────────────────────────

function AddBudgetSheet({ month, onClose, onCreated }: {
  month: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const data = useData();
  const cats = data.expenseCategories();
  const [catId, setCatId] = useState('');
  const [limit, setLimit] = useState('');
  const [threshold, setThreshold] = useState('80');
  const [scope, setScope] = useState<'household' | 'actor'>('household');
  const [actorId, setActorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!catId || !limit || parseInt(limit) <= 0) { setError('请选择分类并填写限额'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/budgets', {
        month,
        categoryId: catId,
        limitAmount: parseInt(limit),
        currency: 'JPY',
        alertThresholdPercent: parseInt(threshold) || 80,
        actorScope: scope,
        actorId: scope === 'actor' ? actorId : '',
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={`新增预算 · ${fmtMonth(month)}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Category */}
        <div>
          <div style={{ fontSize: 11, color: T.textMute, marginBottom: 6 }}>分类</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((cat) => {
              const { mark, tint } = catDisplay(cat.name);
              const sel = cat.id === catId;
              return (
                <div key={cat.id} onClick={() => setCatId(cat.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', width: 44, opacity: sel ? 1 : 0.65 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontFamily: CN_FONT, border: sel ? `2px solid ${T.accent}` : '2px solid transparent' }}>{mark}</div>
                  <div style={{ fontSize: 9, color: T.textSoft, textAlign: 'center', whiteSpace: 'nowrap' }}>{cat.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Limit amount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 11, color: T.textSoft, width: 48 }}>限额 (¥)</span>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="例：30000"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontFamily: NUM_FONT, fontWeight: 600, color: T.ink, background: 'transparent', textAlign: 'right' }} />
        </div>

        {/* Alert threshold */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 11, color: T.textSoft, width: 64 }}>提醒阈值 (%)</span>
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="80"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: NUM_FONT, color: T.ink, background: 'transparent', textAlign: 'right' }} />
        </div>

        {/* Scope */}
        <div>
          <div style={{ fontSize: 11, color: T.textMute, marginBottom: 6 }}>统计范围</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['household', 'actor'] as const).map((s) => (
              <div key={s} onClick={() => setScope(s)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${scope === s ? T.accent : T.border}`, background: scope === s ? T.accentSoft : T.surface, textAlign: 'center', fontSize: 13, color: scope === s ? T.accent : T.textSoft, fontWeight: 500, cursor: 'pointer' }}>
                {s === 'household' ? '全家共用' : '个人单独'}
              </div>
            ))}
          </div>
          {scope === 'actor' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {data.actors.map((a) => (
                <div key={a.id} onClick={() => setActorId(a.id)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${actorId === a.id ? T.accent : T.border}`, background: actorId === a.id ? T.accentSoft : T.surface, textAlign: 'center', fontSize: 12, color: actorId === a.id ? T.accent : T.textSoft, cursor: 'pointer' }}>
                  {a.displayName}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: 12, color: T.danger, textAlign: 'center' }}>{error}</div>}

        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存预算'}
        </Button>
      </div>
    </Sheet>
  );
}

// ─── Edit-budget sheet ────────────────────────────────────────────────────────

function EditBudgetSheet({ budget, onClose, onSaved }: {
  budget: MonthlyBudget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [limit, setLimit] = useState(String(budget.limitAmount));
  const [threshold, setThreshold] = useState(String(budget.alertThresholdPercent));
  const [active, setActive] = useState(budget.isActive);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatch(`/api/budgets/${budget.id}`, {
        limitAmount: parseInt(limit),
        alertThresholdPercent: parseInt(threshold),
        isActive: active,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiDelete(`/api/budgets/${budget.id}`);
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet title="编辑预算" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 11, color: T.textSoft, width: 48 }}>限额 (¥)</span>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontFamily: NUM_FONT, fontWeight: 600, color: T.ink, background: 'transparent', textAlign: 'right' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 11, color: T.textSoft, width: 64 }}>提醒阈值 (%)</span>
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: NUM_FONT, color: T.ink, background: 'transparent', textAlign: 'right' }} />
        </div>
        <div onClick={() => setActive((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 13, color: T.ink }}>启用此预算</span>
          <div style={{ width: 36, height: 20, borderRadius: 10, background: active ? T.accent : T.bgSubtle, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: active ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving || deleting}>
          {saving ? '保存中…' : '保存'}
        </Button>
        {!confirmDel ? (
          <Button variant="danger" size="md" style={{ width: '100%' }} onClick={() => setConfirmDel(true)} disabled={saving || deleting}>
            删除此预算
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="md" style={{ flex: 1 }} onClick={() => setConfirmDel(false)} disabled={deleting}>取消</Button>
            <Button variant="danger" size="md" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中…' : '确认删除'}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ─── Budget row ───────────────────────────────────────────────────────────────

function BudgetRow({ budget, usage, onTap }: {
  budget: MonthlyBudget;
  usage: BudgetUsageItem | undefined;
  onTap: () => void;
}) {
  const data = useData();
  const cat = data.category(budget.categoryId);
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const actor = budget.actorScope === 'actor' ? data.actor(budget.actorId ?? '') : null;

  const used = usage?.usedAmount ?? 0;
  const limit = budget.limitAmount;
  const pct = limit > 0 ? used / limit : 0;
  const threshold = budget.alertThresholdPercent / 100;
  const over = pct >= 1;
  const near = !over && pct >= threshold;
  const accent = over ? T.danger : near ? T.warning : T.success;
  const accentSoft = over ? T.dangerSoft : near ? T.warningSoft : T.successSoft;

  return (
    <div onClick={onTap} style={{ cursor: 'pointer' }}>
    <Card pad={12} style={{ opacity: budget.isActive ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontFamily: CN_FONT, flexShrink: 0 }}>{mark}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>
              {cat?.name ?? '未知分类'}
              {actor && <span style={{ fontSize: 10, color: T.textMute, marginLeft: 6, fontWeight: 400 }}>· {actor.displayName}</span>}
            </span>
            <Amount value={limit} size={13} weight={600} color={T.textSoft} />
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: T.textMute }}>
            已用 <Amount value={used} size={11} weight={600} color={accent} />
            {' · '}剩余 <Amount value={limit - used} size={11} color={T.textSoft} />
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
          <div style={{ position: 'absolute', left: `${threshold * 100}%`, top: -1, bottom: -1, width: 1.5, background: T.textDim, opacity: 0.7 }} />
        )}
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMute, fontFamily: NUM_FONT }}>
        <span style={{ color: accent, fontWeight: 600 }}>{Math.round(pct * 100)}%</span>
        <span>提醒阈值 {budget.alertThresholdPercent}%</span>
      </div>
    </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [month, setMonth] = useState(todayMonth);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, BudgetUsageItem>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<MonthlyBudget | null>(null);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [bs, usageResp] = await Promise.all([
        apiGet<MonthlyBudget[]>(`/api/budgets?month=${m}`),
        apiGet<{ month: string; items: BudgetUsageItem[] }>(`/api/budgets/usage?month=${m}`),
      ]);
      setBudgets(bs);
      const map: Record<string, BudgetUsageItem> = {};
      for (const item of usageResp.items) {
        map[item.budgetId] = item;
      }
      setUsageMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const active = budgets.filter((b) => b.isActive);
  const totalLimit = active.reduce((s, b) => s + b.limitAmount, 0);
  const totalUsed = active.reduce((s, b) => s + (usageMap[b.id]?.usedAmount ?? 0), 0);
  const overall = totalLimit > 0 ? totalUsed / totalLimit : 0;
  // Average alert threshold across active budgets (fallback 80%) for the overall bar.
  const avgThreshold = active.length > 0
    ? Math.round(active.reduce((s, b) => s + b.alertThresholdPercent, 0) / active.length)
    : 80;

  const getStatus = (b: MonthlyBudget) => {
    const s = usageMap[b.id]?.status ?? 'ok';
    return s === 'over' ? 0 : s === 'warning' ? 1 : 2;
  };
  const sorted = [...budgets].sort((a, b) => getStatus(a) - getStatus(b));

  const overCount    = active.filter((b) => usageMap[b.id]?.status === 'over').length;
  const nearCount    = active.filter((b) => usageMap[b.id]?.status === 'warning').length;
  const okCount      = active.filter((b) => usageMap[b.id]?.status === 'ok').length;

  return (
    <PhoneScreen>
      {showAdd && (
        <AddBudgetSheet month={month} onClose={() => setShowAdd(false)} onCreated={() => load(month)} />
      )}
      {editTarget && (
        <EditBudgetSheet budget={editTarget} onClose={() => setEditTarget(null)} onSaved={() => load(month)} />
      )}

      <AppBar
        title="每月预算"
        subtitle={`${fmtMonth(month)} · 只统计支出`}
        left={
          <div onClick={() => setMonth((m) => addMonths(m, -1))}
            style={{ fontSize: 20, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</div>
        }
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {month !== todayMonth() && (
              <div onClick={() => setMonth(todayMonth())}
                style={{ fontSize: 11, color: T.accent, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: T.accentSoft, cursor: 'pointer' }}>本月</div>
            )}
            <div onClick={() => setMonth((m) => addMonths(m, 1))}
              style={{ fontSize: 20, color: T.textSoft, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</div>
            <div onClick={() => setShowAdd(true)}
              style={{ width: 32, height: 32, borderRadius: 16, background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 300, cursor: 'pointer' }}>+</div>
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textMute, fontSize: 13 }}>加载中…</div>
        ) : (
          <>
            {/* Overall card */}
            <Card pad={14} style={{ marginBottom: 14, background: `linear-gradient(155deg, #FFFFFF 0%, ${T.surfaceAlt} 100%)` }}>
              <div style={{ fontSize: 11, color: T.textMute, marginBottom: 4 }}>总预算使用</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Amount value={totalUsed} size={26} weight={600} color={T.ink} />
                <span style={{ fontSize: 12, color: T.textSoft }}>/ <Amount value={totalLimit} size={12} weight={500} color={T.textSoft} /></span>
              </div>
              <div style={{ marginTop: 10, height: 8, background: T.bgSubtle, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${Math.min(100, overall * 100)}%`, height: '100%', background: overall >= 1 ? T.danger : overall >= avgThreshold / 100 ? T.warning : T.accent }} />
                <div style={{ position: 'absolute', left: `${avgThreshold}%`, top: -2, bottom: -2, width: 1, background: T.textDim }} />
              </div>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMute }}>
                <span>{(overall * 100).toFixed(0)}% 已用</span>
                <span>剩余 <Amount value={totalLimit - totalUsed} size={10} color={T.textSoft} /></span>
              </div>
            </Card>

            {/* Summary chips */}
            {active.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { color: T.danger,  bg: T.dangerSoft,  label: '超出', count: overCount },
                  { color: T.warning, bg: T.warningSoft, label: '临近', count: nearCount },
                  { color: T.success, bg: T.successSoft, label: '健康', count: okCount },
                ].map(({ color, bg, label, count }) => (
                  <div key={label} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontFamily: NUM_FONT, fontSize: 16, fontWeight: 700, color }}>{count}</span>
                  </div>
                ))}
              </div>
            )}

            <SectionLabel right="点击编辑">所有分类</SectionLabel>
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: T.textMute, fontSize: 13 }}>
                暂无预算，点击右上角 + 添加
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.map((b) => (
                  <BudgetRow key={b.id} budget={b} usage={usageMap[b.id]} onTap={() => setEditTarget(b)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="budget" />
    </PhoneScreen>
  );
}
