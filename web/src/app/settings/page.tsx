'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import { PM_TYPE_COLOR } from '@/lib/data';
import type { AccountType, Actor, Category, PaymentMethod } from '@/lib/types';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

function FieldRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
      <span style={{ fontSize: 11, color: T.textSoft, width: 52, flexShrink: 0 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: T.ink, background: 'transparent' }} />
    </div>
  );
}

// ─── Account type labels ──────────────────────────────────────────────────────

const ACCT_TYPE_LABEL: Record<AccountType, string> = {
  cash: 'CASH', paypay: 'PAY', credit_card: 'CARD',
  bank_account: 'BANK', cny_rmb: 'CNY', other: 'OTH',
};

// ─── Edit actor sheet ─────────────────────────────────────────────────────────

function EditActorSheet({ actor, onClose, onSaved }: { actor: Actor; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(actor.displayName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiPatch(`/api/actors/${actor.id}`, { displayName: name.trim() });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="编辑角色" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldRow label="名称" value={name} onChange={setName} placeholder="角色名称" />
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>
    </Sheet>
  );
}

// ─── Add payment method sheet ─────────────────────────────────────────────────

const PM_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash',         label: '现金' },
  { value: 'paypay',       label: 'PayPay' },
  { value: 'credit_card',  label: '信用卡' },
  { value: 'bank_account', label: '银行转账' },
  { value: 'cny_rmb',      label: '人民币' },
  { value: 'other',        label: '其他' },
];

const CURRENCIES: { value: 'JPY' | 'CNY'; label: string }[] = [
  { value: 'JPY', label: '日元 JPY' },
  { value: 'CNY', label: '人民币 CNY' },
];

function AddPaymentMethodSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const data = useData();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [currency, setCurrency] = useState<'JPY' | 'CNY'>('JPY');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('请填写名称'); return; }
    setSaving(true);
    setError('');
    try {
      const actorId = data.me?.actorId ?? '';
      await apiPost('/api/payment-methods', { name: name.trim(), type, currency, ownerActorId: actorId, isActive: true });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="添加支付方式" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldRow label="名称" value={name} onChange={setName} placeholder="例：我的信用卡" />

        <div>
          <div style={{ fontSize: 11, color: T.textMute, marginBottom: 6 }}>类型</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PM_TYPES.map((pt) => (
              <div key={pt.value} onClick={() => setType(pt.value)}
                style={{ padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${type === pt.value ? T.accent : T.border}`, background: type === pt.value ? T.accentSoft : T.surface, fontSize: 12, color: type === pt.value ? T.accent : T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
                {pt.label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: T.textMute, marginBottom: 6 }}>货币</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {CURRENCIES.map((c) => (
              <div key={c.value} onClick={() => setCurrency(c.value)}
                style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${currency === c.value ? T.accent : T.border}`, background: currency === c.value ? T.accentSoft : T.surface, fontSize: 12, color: currency === c.value ? T.accent : T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: T.danger, textAlign: 'center' }}>{error}</div>}
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '添加'}
        </Button>
      </div>
    </Sheet>
  );
}

// ─── Edit payment method sheet ────────────────────────────────────────────────

function EditPaymentMethodSheet({ pm, onClose, onSaved }: { pm: PaymentMethod; onClose: () => void; onSaved: () => void }) {
  const data = useData();
  const [name, setName] = useState(pm.name);
  const [active, setActive] = useState(pm.isActive);
  const [billingDay, setBillingDay] = useState(pm.billingDay ? String(pm.billingDay) : '');
  const [settlementDay, setSettlementDay] = useState(pm.settlementDay ? String(pm.settlementDay) : '');
  const [debitPmId, setDebitPmId] = useState(pm.debitPmId ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isCreditCard = pm.type === 'credit_card';

  const debitablePms = data.paymentMethods.filter((p) => p.isActive && p.id !== pm.id && p.type !== 'credit_card');

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = { name: name.trim(), isActive: active };
      if (isCreditCard) {
        patch.billingDay = parseInt(billingDay) || 0;
        patch.settlementDay = parseInt(settlementDay) || 0;
        patch.debitPmId = debitPmId || '';
      }
      await apiPatch(`/api/payment-methods/${pm.id}`, patch);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('删除此支付方式？')) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/payment-methods/${pm.id}`);
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet title="编辑支付方式" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldRow label="名称" value={name} onChange={setName} />
        {isCreditCard && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: T.textSoft, whiteSpace: 'nowrap' }}>账单日</span>
                <input type="number" min="1" max="31" value={billingDay} onChange={e => setBillingDay(e.target.value)} placeholder="如 31"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: T.ink, background: 'transparent', width: 0 }} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: T.textSoft, whiteSpace: 'nowrap' }}>还款日</span>
                <input type="number" min="1" max="31" value={settlementDay} onChange={e => setSettlementDay(e.target.value)} placeholder="如 27"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: T.ink, background: 'transparent', width: 0 }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: T.textMute, marginTop: -6 }}>账单日：每月结账日（如末日填 31）· 还款日：次月还款日</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>扣款账户</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <div onClick={() => setDebitPmId('')}
                  style={{ padding: '5px 10px', borderRadius: 999, border: `1.5px solid ${!debitPmId ? T.accent : T.border}`, background: !debitPmId ? T.accentSoft : T.surface, fontSize: 12, color: !debitPmId ? T.accent : T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
                  未设置
                </div>
                {debitablePms.map((p) => (
                  <div key={p.id} onClick={() => setDebitPmId(p.id)}
                    style={{ padding: '5px 10px', borderRadius: 999, border: `1.5px solid ${debitPmId === p.id ? T.accent : T.border}`, background: debitPmId === p.id ? T.accentSoft : T.surface, fontSize: 12, color: debitPmId === p.id ? T.accent : T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <div onClick={() => setActive((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 13, color: T.ink }}>启用</span>
          <div style={{ width: 36, height: 20, borderRadius: 10, background: active ? T.accent : T.bgSubtle, position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: active ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving || deleting}>
          {saving ? '保存中…' : '保存'}
        </Button>
        <Button variant="danger" size="md" style={{ width: '100%' }} onClick={handleDelete} disabled={saving || deleting}>
          {deleting ? '删除中…' : '删除'}
        </Button>
      </div>
    </Sheet>
  );
}

// ─── Add account sheet ────────────────────────────────────────────────────────

function AddAccountSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const data = useData();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [currency, setCurrency] = useState<'JPY' | 'CNY'>('JPY');
  const [opening, setOpening] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('请填写名称'); return; }
    setSaving(true);
    setError('');
    try {
      const actorId = data.me?.actorId ?? '';
      await apiPost('/api/accounts', { name: name.trim(), type, currency, openingBalance: parseInt(opening) || 0, ownerActorId: actorId, isActive: true });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="添加账户" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldRow label="名称" value={name} onChange={setName} placeholder="例：现金" />

        <div>
          <div style={{ fontSize: 11, color: T.textMute, marginBottom: 6 }}>类型</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PM_TYPES.map((pt) => (
              <div key={pt.value} onClick={() => setType(pt.value)}
                style={{ padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${type === pt.value ? T.accent : T.border}`, background: type === pt.value ? T.accentSoft : T.surface, fontSize: 12, color: type === pt.value ? T.accent : T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
                {pt.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['JPY', 'CNY'] as const).map((c) => (
            <div key={c} onClick={() => setCurrency(c)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${currency === c ? T.accent : T.border}`, background: currency === c ? T.accentSoft : T.surface, textAlign: 'center', fontSize: 13, color: currency === c ? T.accent : T.textSoft, fontWeight: 500, cursor: 'pointer' }}>
              {c}
            </div>
          ))}
        </div>

        <FieldRow label="初始余额" value={opening} onChange={setOpening} placeholder="0" />

        {error && <div style={{ fontSize: 12, color: T.danger, textAlign: 'center' }}>{error}</div>}
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '添加'}
        </Button>
      </div>
    </Sheet>
  );
}

// ─── Category sheets ─────────────────────────────────────────────────────────

function EditCategorySheet({ cat, onClose, onSaved }: { cat: Category; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(cat.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiPatch(`/api/categories/${cat.id}`, { name: name.trim() });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (cat.isDefault) { alert('系统默认分类不可删除'); return; }
    if (!confirm(`删除分类「${cat.name}」？`)) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/categories/${cat.id}`);
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet title="编辑分类" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldRow label="名称" value={name} onChange={setName} />
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving || deleting || !name.trim()}>
          {saving ? '保存中…' : '保存'}
        </Button>
        <Button variant="danger" size="md" style={{ width: '100%' }} onClick={handleDelete} disabled={saving || deleting || cat.isDefault}>
          {deleting ? '删除中…' : cat.isDefault ? '默认分类不可删除' : '删除此分类'}
        </Button>
      </div>
    </Sheet>
  );
}

function AddCategorySheet({ type, onClose, onSaved }: { type: 'expense' | 'income'; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('请填写名称'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/categories', { name: name.trim(), type });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={`新增${type === 'expense' ? '支出' : '入账'}分类`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldRow label="名称" value={name} onChange={setName} placeholder="例：教育" />
        {error && <div style={{ fontSize: 12, color: T.danger, textAlign: 'center' }}>{error}</div>}
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? '保存中…' : '添加'}
        </Button>
      </div>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const data = useData();
  const router = useRouter();

  const [editActor, setEditActor] = useState<Actor | null>(null);
  const [editPm, setEditPm] = useState<PaymentMethod | null>(null);
  const [showAddPm, setShowAddPm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [addCatType, setAddCatType] = useState<'expense' | 'income' | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pmBalances, setPmBalances] = useState<Record<string, number>>({});
  const [pmBalancesLoading, setPmBalancesLoading] = useState(true);
  const [aiModel, setAiModel] = useState<'fast' | 'accurate'>(() => {
    try { return (localStorage.getItem('ai_model') as 'fast' | 'accurate') || 'accurate'; } catch { return 'accurate'; }
  });

  useEffect(() => {
    setPmBalancesLoading(true);
    apiGet<Record<string, number>>('/api/payment-methods/balances')
      .then(setPmBalances)
      .catch(() => {})
      .finally(() => setPmBalancesLoading(false));
  // Re-fetch whenever payment methods list changes (e.g. after data.refresh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.paymentMethods]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push('/login');
  }

  const expenseCats = data.expenseCategories();
  const incomeCats = data.incomeCategories();

  return (
    <PhoneScreen>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .skel { background: linear-gradient(90deg,#f0ece6 25%,#e8e2da 50%,#f0ece6 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
      `}</style>
      {editActor && <EditActorSheet actor={editActor} onClose={() => setEditActor(null)} onSaved={data.refresh} />}
      {editPm && <EditPaymentMethodSheet pm={editPm} onClose={() => setEditPm(null)} onSaved={data.refresh} />}
      {showAddPm && <AddPaymentMethodSheet onClose={() => setShowAddPm(false)} onSaved={data.refresh} />}
      {editCat && <EditCategorySheet cat={editCat} onClose={() => setEditCat(null)} onSaved={data.refresh} />}
      {addCatType && <AddCategorySheet type={addCatType} onClose={() => setAddCatType(null)} onSaved={data.refresh} />}

      <AppBar title="设置" />

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>

        {/* Account info */}
        <SectionLabel>账号</SectionLabel>
        <Card pad={0} style={{ marginBottom: 16 }}>
          <div style={{ padding: '14px 14px 12px' }}>
            <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{user?.email ?? '—'}</div>
            {data.me?.householdId && (
              <div style={{ fontSize: 10, color: T.textMute, marginTop: 4, fontFamily: NUM_FONT }}>
                家庭 ID：{data.me.householdId.slice(0, 12)}…
              </div>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${T.borderSoft}` }}>
            <div onClick={handleSignOut}
              style={{ padding: '12px 14px', fontSize: 13, color: signingOut ? T.textMute : T.danger, fontWeight: 500, cursor: 'pointer' }}>
              {signingOut ? '退出中…' : '退出登录'}
            </div>
          </div>
        </Card>

        {/* Actors */}
        <SectionLabel right={<span style={{ color: T.textMute, fontSize: 10 }}>点击改名</span>}>成员 / 角色</SectionLabel>
        <Card pad={0} style={{ marginBottom: 16 }}>
          {data.actors.map((actor, i) => (
            <div key={actor.id} onClick={() => setEditActor(actor)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: T.bgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: T.textSoft, flexShrink: 0 }}>
                {actor.displayName.slice(0, 1)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.ink }}>{actor.displayName}</div>
                <div style={{ fontSize: 10, color: T.textMute, marginTop: 2 }}>
                  {actor.type === 'household_shared' ? '家庭共用' : '个人'}
                </div>
              </div>
              <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
            </div>
          ))}
        </Card>

        {/* Payment methods + linked account balance */}
        <SectionLabel right={
          <span onClick={() => setShowAddPm(true)} style={{ color: T.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ 添加</span>
        }>支付方式 &amp; 余额</SectionLabel>
        <Card pad={0} style={{ marginBottom: 16 }}>
          {data.paymentMethods.length === 0 ? (
            <div style={{ padding: '16px 14px', fontSize: 13, color: T.textMute, textAlign: 'center' }}>暂无支付方式</div>
          ) : (
            data.paymentMethods.map((pm, i) => {
              const color = PM_TYPE_COLOR[pm.type] ?? '#8C8C8C';
              const label = ACCT_TYPE_LABEL[pm.type];
              const isCreditCard = pm.type === 'credit_card';
              const balance = pmBalances[pm.id];
              const hasBalance = balance !== undefined;
              // Credit card: balance < 0 means owed (expense > income), show as positive 待还
              const displayBalance = isCreditCard ? -balance : balance;
              const balanceColor = isCreditCard
                ? (balance < 0 ? T.warning : T.success)
                : (balance >= 0 ? T.ink : T.danger);
              return (
                <div key={pm.id} onClick={() => setEditPm(pm)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, cursor: 'pointer', opacity: pm.isActive ? 1 : 0.45 }}>
                  <div style={{ width: 36, height: 22, borderRadius: 4, background: color, color: '#fff', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{label}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: T.ink }}>{pm.name}</div>
                    <div style={{ fontSize: 10, color: T.textMute, marginTop: 1 }}>
                      {!pm.isActive ? '已停用' : '基于交易记录'}
                    </div>
                  </div>
                  {pmBalancesLoading ? (
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                      <div className="skel" style={{ height: 10, width: 28 }} />
                      <div className="skel" style={{ height: 16, width: 52 }} />
                    </div>
                  ) : hasBalance ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: isCreditCard ? T.warning : T.textMute, fontWeight: 500 }}>
                        {isCreditCard ? '待还' : '余额'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: NUM_FONT, color: balanceColor }}>
                        ¥{Math.abs(displayBalance).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 10, color: T.textDim }}>无记录</span>
                  )}
                  <span style={{ color: T.textDim, fontSize: 12, marginLeft: 2 }}>›</span>
                </div>
              );
            })
          )}
        </Card>

        {/* Expense categories */}
        <SectionLabel right={
          <span onClick={() => setAddCatType('expense')} style={{ color: T.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ 添加</span>
        }>支出分类</SectionLabel>
        <Card pad={12} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {expenseCats.map((c) => {
              const { mark, tint } = catDisplay(c.name);
              return (
                <div key={c.id} onClick={() => setEditCat(c)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 4px', borderRadius: 999, background: T.bgSubtle, fontSize: 12, color: T.ink, cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: CN_FONT, fontWeight: 600 }}>{mark}</div>
                  {c.name}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Income categories */}
        <SectionLabel right={
          <span onClick={() => setAddCatType('income')} style={{ color: T.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ 添加</span>
        }>入账分类</SectionLabel>
        <Card pad={12} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {incomeCats.map((c) => {
              const { mark, tint } = catDisplay(c.name);
              return (
                <div key={c.id} onClick={() => setEditCat(c)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 4px', borderRadius: 999, background: '#EBF5EC', fontSize: 12, color: T.ink, cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: CN_FONT, fontWeight: 600 }}>{mark}</div>
                  {c.name}
                </div>
              );
            })}
          </div>
        </Card>

        {/* AI model selection */}
        <SectionLabel right={<span style={{ color: T.textMute, fontSize: 10 }}>仅影响小票识别</span>}>AI 模型</SectionLabel>
        <Card pad={12} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {([{ value: 'accurate', label: '精准', sub: 'GPT-5.5' }, { value: 'fast', label: '快速', sub: 'GPT-5.4 mini' }] as const).map((opt) => (
              <div key={opt.value} onClick={() => {
                setAiModel(opt.value);
                try { localStorage.setItem('ai_model', opt.value); } catch {}
              }}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${aiModel === opt.value ? T.accent : T.border}`, background: aiModel === opt.value ? T.accentSoft : T.surface, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: aiModel === opt.value ? T.accent : T.ink }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: T.textMute, marginTop: 2 }}>{opt.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fixed recurring rules entry */}
        <SectionLabel>固定收支</SectionLabel>
        <Card pad={0} style={{ marginBottom: 16 }}>
          <div onClick={() => router.push('/fixed')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: T.bgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>↻</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: T.ink }}>固定收支规则</div>
              <div style={{ fontSize: 10, color: T.textMute, marginTop: 2 }}>房租、工资等定期收支</div>
            </div>
            <span style={{ color: T.textDim, fontSize: 14 }}>›</span>
          </div>
        </Card>

        <div style={{ textAlign: 'center', padding: '10px 0 6px', fontSize: 10, color: T.textDim }}>
          家计簿 v0.1 · made with care
        </div>
      </div>

      <BottomNav active="me" />
    </PhoneScreen>
  );
}
