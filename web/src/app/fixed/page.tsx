'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Toggle } from '@/components/ui/Toggle';
import { useData } from '@/context/DataContext';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
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

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.32)' }} />;
}

interface RuleFormState {
  transactionType: 'expense' | 'income';
  title: string;
  amountStr: string;
  currency: 'JPY' | 'CNY';
  actorId: string;
  categoryId: string;
  paymentMethodId: string;
  dayOfMonth: string;
  memo: string;
}

function RuleSheet({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: RuleFormState;
  onSave: (form: RuleFormState) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const data = useData();
  const [form, setForm] = useState<RuleFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cats = form.transactionType === 'income' ? data.incomeCategories() : data.expenseCategories();
  const cat = data.category(form.categoryId);
  const pm = data.paymentMethod(form.paymentMethodId);
  const { mark, tint } = catDisplay(cat?.name ?? '');

  function set<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.amountStr) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  }

  const isIncome = form.transactionType === 'income';

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, zIndex: 99, background: T.surface, borderRadius: '16px 16px 0 0', padding: '16px 16px 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.14)', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, textAlign: 'center', marginBottom: 16 }}>
          {onDelete ? '编辑规则' : '新建规则'}
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 3, marginBottom: 14, background: T.bgSubtle, borderRadius: 8 }}>
          {(['expense', 'income'] as const).map((t) => {
            const on = form.transactionType === t;
            return (
              <div key={t} onClick={() => { set('transactionType', t); set('categoryId', ''); }}
                style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 6, fontSize: 13, fontWeight: 600, background: on ? '#fff' : 'transparent', color: on ? (t === 'income' ? T.income : T.ink) : T.textSoft, cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                {t === 'income' ? '固定入账' : '固定支出'}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>名称</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="例：房租、水电费、工资"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
          </div>

          {/* Amount + Currency */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>金额</label>
              <input type="number" min="0" value={form.amountStr} onChange={e => set('amountStr', e.target.value)}
                placeholder="0"
                style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>货币</label>
              <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bgSubtle, borderRadius: 8 }}>
                {(['JPY', 'CNY'] as const).map((c) => {
                  const on = form.currency === c;
                  return (
                    <div key={c} onClick={() => set('currency', c)}
                      style={{ padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                      {c}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actor */}
          {data.actors.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>使用人</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.actors.map((a) => {
                  const sel = a.id === form.actorId;
                  return (
                    <div key={a.id} onClick={() => set('actorId', sel ? '' : a.id)}
                      style={{ padding: '5px 10px', borderRadius: 20, border: sel ? `1.5px solid ${T.accent}` : `1px solid ${T.borderSoft}`, background: sel ? `${T.accent}14` : T.bgSubtle, cursor: 'pointer', fontSize: 12, color: sel ? T.accent : T.textSoft, fontWeight: sel ? 600 : 400 }}>
                      {a.displayName}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>分类</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cats.map((c) => {
                const { mark: m, tint: bg } = catDisplay(c.name);
                const sel = c.id === form.categoryId;
                return (
                  <div key={c.id} onClick={() => set('categoryId', c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: sel ? `1.5px solid ${T.accent}` : `1px solid ${T.borderSoft}`, background: sel ? `${T.accent}14` : T.bgSubtle, cursor: 'pointer' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: CN_FONT }}>{m}</span>
                    <span style={{ fontSize: 12, color: sel ? T.accent : T.textSoft, fontWeight: sel ? 600 : 400 }}>{c.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment method */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>支付方式</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.paymentMethods.filter((p) => p.isActive).map((p) => {
                const sel = p.id === form.paymentMethodId;
                return (
                  <div key={p.id} onClick={() => set('paymentMethodId', sel ? '' : p.id)}
                    style={{ padding: '5px 10px', borderRadius: 20, border: sel ? `1.5px solid ${T.accent}` : `1px solid ${T.borderSoft}`, background: sel ? `${T.accent}14` : T.bgSubtle, cursor: 'pointer', fontSize: 12, color: sel ? T.accent : T.textSoft, fontWeight: sel ? 600 : 400 }}>
                    {p.name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day of month */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>每月几号执行（留空则月初）</label>
            <input type="number" min="1" max="31" value={form.dayOfMonth} onChange={e => set('dayOfMonth', e.target.value)}
              placeholder="1–31"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
          </div>

          {/* Memo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>备注</label>
            <input value={form.memo} onChange={e => set('memo', e.target.value)}
              placeholder="可选"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {onDelete && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              style={{ padding: '12px 0', borderRadius: 10, border: `1px solid ${T.dangerSoft}`, background: T.dangerSoft, fontSize: 14, color: T.danger, cursor: 'pointer', fontWeight: 500, width: 52, flexShrink: 0 }}>
              删除
            </button>
          )}
          {onDelete && confirmDelete && (
            <button onClick={handleDelete} disabled={deleting}
              style={{ padding: '12px 0', borderRadius: 10, border: 'none', background: T.danger, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600, width: 72, flexShrink: 0 }}>
              {deleting ? '…' : '确认删除'}
            </button>
          )}
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, fontSize: 14, color: T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.amountStr}
            style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: T.accent, fontSize: 14, color: '#fff', cursor: saving ? 'default' : 'pointer', fontWeight: 600, opacity: (saving || !form.title.trim() || !form.amountStr) ? 0.6 : 1 }}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </>
  );
}

function RuleRow({ rule, onToggle, onClick }: { rule: RecurringRule; onToggle: () => void; onClick: () => void }) {
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
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
          <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: 7, background: isIncome ? T.income : T.ink, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>
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
            <div onClick={(e) => e.stopPropagation()}>
              <Toggle on={rule.isActive} onClick={onToggle} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function emptyForm(): RuleFormState {
  return { transactionType: 'expense', title: '', amountStr: '', currency: 'JPY', actorId: '', categoryId: '', paymentMethodId: '', dayOfMonth: '', memo: '' };
}

function ruleToForm(rule: RecurringRule): RuleFormState {
  return {
    transactionType: rule.transactionType as 'expense' | 'income',
    title: rule.title,
    amountStr: String(rule.amount),
    currency: rule.currency as 'JPY' | 'CNY',
    actorId: rule.actorId ?? '',
    categoryId: rule.categoryId ?? '',
    paymentMethodId: rule.paymentMethodId ?? '',
    dayOfMonth: rule.dayOfMonth > 0 ? String(rule.dayOfMonth) : '',
    memo: rule.memo ?? '',
  };
}

export default function FixedPage() {
  const data = useData();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);

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

  async function handleAdd(form: RuleFormState) {
    const amount = Math.round(parseFloat(form.amountStr) || 0);
    const dayOfMonth = parseInt(form.dayOfMonth, 10) || 1;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    // Use current month if the scheduled day hasn't passed yet, otherwise next month
    let targetYear = year, targetMonth = month;
    if (dayOfMonth < today.getDate()) {
      targetMonth = month === 12 ? 1 : month + 1;
      targetYear = month === 12 ? year + 1 : year;
    }
    // Clamp to the target month's length (matches backend advanceOneMonth).
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const runDay = Math.min(dayOfMonth, lastDay);
    const nextRunDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(runDay).padStart(2, '0')}`;
    await apiPost('/api/recurring-rules', {
      transactionType: form.transactionType,
      title: form.title.trim(),
      amount,
      currency: form.currency,
      categoryId: form.categoryId || undefined,
      paymentMethodId: form.paymentMethodId || undefined,
      frequency: 'monthly',
      dayOfMonth,
      nextRunDate,
      memo: form.memo || undefined,
      actorId: form.actorId || data.me?.actorId,
    });
    setShowAdd(false);
    await fetchRules();
  }

  async function handleEdit(form: RuleFormState) {
    if (!editingRule) return;
    const amount = Math.round(parseFloat(form.amountStr) || 0);
    const dayOfMonth = parseInt(form.dayOfMonth, 10) || editingRule.dayOfMonth || 1;
    await apiPatch(`/api/recurring-rules/${editingRule.id}`, {
      title: form.title.trim(),
      amount,
      currency: form.currency,
      actorId: form.actorId || data.me?.actorId,
      categoryId: form.categoryId || '',
      paymentMethodId: form.paymentMethodId || '',
      dayOfMonth,
      memo: form.memo || '',
    });
    setEditingRule(null);
    await fetchRules();
  }

  async function handleDelete() {
    if (!editingRule) return;
    await apiDelete(`/api/recurring-rules/${editingRule.id}`);
    setEditingRule(null);
    await fetchRules();
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
      {showAdd && (
        <RuleSheet
          initial={emptyForm()}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingRule && (
        <RuleSheet
          initial={ruleToForm(editingRule)}
          onSave={handleEdit}
          onDelete={handleDelete}
          onClose={() => setEditingRule(null)}
        />
      )}
      <AppBar
        title="固定收支"
        subtitle={`${active.length} 项启用`}
        right={
          <div onClick={() => setShowAdd(true)} style={{ width: 32, height: 32, borderRadius: 16, background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 300, cursor: 'pointer' }}>+</div>
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
          <div style={{ textAlign: 'center', padding: 32, color: T.textMute, fontSize: 13 }}>暂无固定规则，点击右上角 + 添加</div>
        ) : (
          <>
            <SectionLabel right={`${visible.length} 项`}>所有规则</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.map((rule) => (
                <RuleRow key={rule.id} rule={rule} onToggle={() => handleToggle(rule)} onClick={() => setEditingRule(rule)} />
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </PhoneScreen>
  );
}
