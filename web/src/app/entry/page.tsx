'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Amount } from '@/components/ui/Amount';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { useData } from '@/context/DataContext';
import { apiPost } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import { ACCT_KIND } from '@/lib/data';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import type { CreateTransactionRequest } from '@/lib/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type Mode = 'expense' | 'income' | 'transfer';

const MODES: { id: Mode; label: string; color: string }[] = [
  { id: 'expense',  label: '支出', color: T.text     },
  { id: 'income',   label: '入账', color: T.income   },
  { id: 'transfer', label: '转账', color: T.transfer },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
      <div style={{ fontSize: 11, color: T.textSoft, fontWeight: 500, marginBottom: 8, letterSpacing: 0.3 }}>{label}</div>
      {children}
    </div>
  );
}

function AcctCard({ label, name, currency, amount, highlight }: {
  label: string; name: string; currency: string; amount: number; highlight?: boolean;
}) {
  return (
    <div style={{ background: highlight ? T.transferSoft : T.surface, border: `1px solid ${highlight ? T.transfer + '40' : T.border}`, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: T.textMute, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>
          {name}
          <span style={{ fontSize: 9, fontFamily: NUM_FONT, color: T.textMute, fontWeight: 600, marginLeft: 6 }}>{currency}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Amount value={amount} size={17} weight={600} currency={currency as 'JPY' | 'CNY'} showCurrency={false} />
        <div style={{ fontSize: 10, color: T.transfer, marginTop: 2 }}>更改 ›</div>
      </div>
    </div>
  );
}

function CatChip({ name, selected, onSelect }: { name: string; selected: boolean; onSelect: () => void }) {
  const { mark, tint } = catDisplay(name);
  const accentColor = selected ? T.accent : 'transparent';
  return (
    <div onClick={onSelect} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0', borderRadius: 8, background: selected ? T.surface : 'transparent', border: `1.5px solid ${selected ? T.accent : 'transparent'}`, cursor: 'pointer' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
      <span style={{ fontSize: 10, color: selected ? T.ink : T.textSoft, fontWeight: selected ? 600 : 400 }}>{name}</span>
    </div>
  );
  void accentColor;
}

function PmChip({ name, type, selected, onSelect }: { name: string; type: string; selected: boolean; onSelect: () => void }) {
  const k = ACCT_KIND[type as keyof typeof ACCT_KIND] ?? { color: '#ccc', label: '?' };
  return (
    <div onClick={onSelect} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: selected ? T.ink : T.surface, border: `1px solid ${selected ? T.ink : T.border}`, color: selected ? '#fff' : T.text, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
      <span style={{ width: 5, height: 5, borderRadius: 1, background: selected ? '#fff' : k.color }} />
      {name}
    </div>
  );
}

function ExpenseIncomeForm({ mode }: { mode: 'expense' | 'income' }) {
  const { state } = useApp();
  const data = useData();
  const router = useRouter();
  const isIncome = mode === 'income';
  const accentColor = isIncome ? T.income : T.accent;

  const cats = isIncome ? data.incomeCategories() : data.expenseCategories();
  const pms = data.paymentMethods.filter((p) => p.isActive);

  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState<'JPY' | 'CNY'>('JPY');
  const [catId, setCatId] = useState('');
  const [pmId, setPmId] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Set defaults once data loads
  const defaultCatId = catId || cats[0]?.id || '';
  const defaultPmId = pmId || pms[0]?.id || '';

  const amount = Math.round(parseFloat(amountStr) || 0);
  const today = new Date().toISOString().slice(0, 10);

  async function handleSave() {
    if (amount <= 0 || saving) return;
    setSaving(true);
    try {
      const req: CreateTransactionRequest = {
        transactionType: mode,
        transactionDate: today,
        amount,
        currency,
        actorId: state.currentRole,
        categoryId: defaultCatId || undefined,
        paymentMethodId: defaultPmId || undefined,
        title: title || cats.find((c) => c.id === defaultCatId)?.name || '',
        memo: note,
      };
      await apiPost('/api/transactions', req);
      router.push('/transactions');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setAmountStr('');
    setTitle('');
    setNote('');
  }

  return (
    <>
      <div style={{ padding: '18px 0 20px', textAlign: 'center', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ fontSize: 11, color: T.textMute, marginBottom: 8 }}>{isIncome ? '入账金额' : '支出金额'}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontFamily: NUM_FONT, fontSize: 24, color: T.textMute, lineHeight: 1 }}>¥</span>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={amountStr}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.]/g, '');
              if ((v.match(/\./g) ?? []).length <= 1) setAmountStr(v);
            }}
            placeholder="0"
            style={{ fontFamily: NUM_FONT, fontSize: 44, fontWeight: 600, color: T.ink, letterSpacing: -1, lineHeight: 1, border: 'none', outline: 'none', background: 'transparent', width: '7ch', textAlign: 'center', padding: 0, caretColor: accentColor }}
          />
        </div>
        <div style={{ marginTop: 10, display: 'inline-flex', gap: 4, padding: 2, background: T.bgSubtle, borderRadius: 8 }}>
          {(['JPY', 'CNY'] as const).map((cc) => {
            const on = cc === currency;
            return (
              <div key={cc} onClick={() => setCurrency(cc)} style={{ padding: '4px 14px', borderRadius: 6, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, fontSize: 11, fontWeight: 600, fontFamily: NUM_FONT, cursor: 'pointer' }}>{cc}</div>
            );
          })}
        </div>
      </div>

      <Row label="角色"><RoleSwitcher /></Row>

      <Row label="日期">
        <div style={{ padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink }}>{today}</div>
      </Row>

      {cats.length > 0 && (
        <Row label={isIncome ? '入账分类' : '分类'}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(5, cats.length)}, 1fr)`, gap: 6 }}>
            {cats.slice(0, 10).map((c) => (
              <CatChip key={c.id} name={c.name} selected={(catId || defaultCatId) === c.id} onSelect={() => setCatId(c.id)} />
            ))}
          </div>
        </Row>
      )}

      {pms.length > 0 && (
        <Row label={isIncome ? '入账账户' : '支付方式'}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pms.map((pm) => (
              <PmChip key={pm.id} name={pm.name} type={pm.type} selected={(pmId || defaultPmId) === pm.id} onSelect={() => setPmId(pm.id)} />
            ))}
          </div>
        </Row>
      )}

      <Row label={isIncome ? '来源 / 标题' : '店铺 / 标题'}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isIncome ? '工资、奖金等' : '店铺名称'}
          style={{ width: '100%', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink, outline: 'none', boxSizing: 'border-box', fontFamily: CN_FONT }}
        />
      </Row>

      <Row label="备注">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="可选备注"
          style={{ width: '100%', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink, outline: 'none', boxSizing: 'border-box', fontFamily: CN_FONT }}
        />
      </Row>

      <div style={{ padding: '10px 0 18px', borderTop: `1px solid ${T.borderSoft}`, display: 'flex', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={handleReset}>再记一笔</Button>
        <Button variant={isIncome ? 'success' : 'primary'} size="lg" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>
    </>
  );
}

async function fetchExchangeRate(from: 'CNY' | 'JPY', to: 'CNY' | 'JPY'): Promise<number | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    const data = await res.json();
    return data?.rates?.[to] ?? null;
  } catch {
    return null;
  }
}

function TransferForm() {
  const data = useData();
  const router = useRouter();

  const pms = data.paymentMethods.filter((p) => p.isActive);
  const [fromPmId, setFromPmId] = useState('');
  const [toPmId, setToPmId] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [rateStr, setRateStr] = useState('');
  const [rateFetching, setRateFetching] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const defaultFrom = fromPmId || pms[0]?.id || '';
  const defaultTo = toPmId || pms[1]?.id || '';
  const fromPm = data.paymentMethod(defaultFrom);
  const toPm = data.paymentMethod(defaultTo);
  const fromCur = (fromPm?.currency || 'JPY') as 'JPY' | 'CNY';
  const toCur = (toPm?.currency || 'JPY') as 'JPY' | 'CNY';
  const isCross = fromCur !== toCur;
  const isSamePm = defaultFrom === defaultTo;
  const fromAmt = Math.round(parseFloat(fromAmount) || 0);
  const toAmt = Math.round(parseFloat(toAmount) || 0);

  // Auto-fetch rate when cross-currency pair changes
  useEffect(() => {
    if (!isCross) { setToAmount(''); setRateStr(''); return; }
    setRateFetching(true);
    fetchExchangeRate(fromCur, toCur).then((rate) => {
      setRateFetching(false);
      if (rate !== null) {
        setRateStr(String(rate));
        if (fromAmt > 0) {
          const converted = toCur === 'JPY' ? Math.round(fromAmt * rate) : parseFloat((fromAmt * rate).toFixed(2));
          setToAmount(String(converted));
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCur, toCur, isCross]);

  function handleFromAmountChange(v: string) {
    setFromAmount(v.replace(/[^\d.]/g, ''));
    if (isCross && rateStr) {
      const rate = parseFloat(rateStr);
      const amt = parseFloat(v) || 0;
      if (rate > 0 && amt > 0) {
        const converted = toCur === 'JPY' ? Math.round(amt * rate) : parseFloat((amt * rate).toFixed(2));
        setToAmount(String(converted));
      }
    }
  }

  function handleRateChange(v: string) {
    setRateStr(v.replace(/[^\d.]/g, ''));
    const rate = parseFloat(v) || 0;
    if (rate > 0 && fromAmt > 0) {
      const converted = toCur === 'JPY' ? Math.round(fromAmt * rate) : parseFloat((fromAmt * rate).toFixed(2));
      setToAmount(String(converted));
    }
  }

  async function handleSave() {
    if (fromAmt <= 0 || saving || isSamePm) return;
    setSaving(true);
    try {
      const req: CreateTransactionRequest = {
        transactionType: 'transfer',
        transactionDate: txDate,
        amount: fromAmt,
        currency: fromCur,
        fromAccountId: defaultFrom,
        toAccountId: defaultTo,
        memo: note || undefined,
      };
      if (isCross && toAmt > 0) {
        req.convertedAmount = toAmt;
        req.convertedCurrency = toCur;
        req.exchangeRate = rateStr || undefined;
      }
      await apiPost('/api/transactions', req);
      router.push('/transactions');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ padding: '14px 0' }}>
        <AcctCard label="转出账户" name={fromPm?.name ?? '—'} currency={fromCur} amount={fromAmt} />
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 15, background: T.surface, border: `1px solid ${T.border}`, color: T.transfer, fontSize: 14, fontWeight: 600 }}>↓</div>
        </div>
        <AcctCard label="转入账户" name={toPm?.name ?? '—'} currency={toCur} amount={isCross ? toAmt : fromAmt} highlight />
      </div>

      {pms.length > 1 && (
        <Row label="转出账户">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pms.map((p) => (
              <div key={p.id} onClick={() => setFromPmId(p.id)} style={{ padding: '6px 12px', borderRadius: 999, background: defaultFrom === p.id ? T.ink : T.surface, border: `1px solid ${defaultFrom === p.id ? T.ink : T.border}`, color: defaultFrom === p.id ? '#fff' : T.text, fontSize: 12, cursor: 'pointer' }}>
                {p.name}
              </div>
            ))}
          </div>
        </Row>
      )}

      {pms.length > 1 && (
        <Row label="转入账户">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pms.map((p) => (
              <div key={p.id} onClick={() => setToPmId(p.id)} style={{ padding: '6px 12px', borderRadius: 999, background: defaultTo === p.id ? T.transfer : T.surface, border: `1px solid ${defaultTo === p.id ? T.transfer : T.border}`, color: defaultTo === p.id ? '#fff' : T.text, fontSize: 12, cursor: 'pointer' }}>
                {p.name}
              </div>
            ))}
          </div>
        </Row>
      )}

      <Row label={`转出金额（${fromCur}）`}>
        <input
          type="text"
          inputMode="decimal"
          value={fromAmount}
          onChange={(e) => handleFromAmountChange(e.target.value)}
          placeholder="0"
          style={{ width: '100%', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 18, fontWeight: 600, color: T.ink, outline: 'none', boxSizing: 'border-box', fontFamily: NUM_FONT }}
        />
      </Row>

      {isCross && (
        <>
          <Row label={`今日汇率（1 ${fromCur} = ? ${toCur}）`}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                inputMode="decimal"
                value={rateStr}
                onChange={(e) => handleRateChange(e.target.value)}
                placeholder={rateFetching ? '获取中…' : '手动输入'}
                style={{ flex: 1, padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink, outline: 'none', fontFamily: NUM_FONT }}
              />
              {rateFetching && <span style={{ fontSize: 11, color: T.textMute }}>获取中…</span>}
            </div>
          </Row>
          <Row label={`转入金额（${toCur}）`}>
            <input
              type="text"
              inputMode="decimal"
              value={toAmount}
              onChange={(e) => setToAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              style={{ width: '100%', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 18, fontWeight: 600, color: T.transfer, outline: 'none', boxSizing: 'border-box', fontFamily: NUM_FONT }}
            />
          </Row>
        </>
      )}

      <Row label="日期">
        <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink, outline: 'none', boxSizing: 'border-box' }} />
      </Row>

      <Row label="备注">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="可选备注"
          style={{ width: '100%', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink, outline: 'none', boxSizing: 'border-box', fontFamily: CN_FONT }}
        />
      </Row>

      {isSamePm && (
        <div style={{ padding: 10, background: '#FEF3F2', borderRadius: 8, fontSize: 12, color: T.danger }}>
          转出和转入账户不能相同
        </div>
      )}

      <div style={{ marginTop: 8, padding: 10, background: T.bgSubtle, borderRadius: 8, fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>
        <strong style={{ color: T.ink }}>提示：</strong>账户转换不计入本月支出 / 入账，不消耗预算，只调整账户余额。
      </div>

      <div style={{ padding: '10px 0 18px', display: 'flex', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => router.back()}>取消</Button>
        <Button variant="primary" size="lg" style={{ flex: 2, background: T.transfer }} onClick={handleSave} disabled={saving || isSamePm}>
          {saving ? '保存中…' : '保存转账'}
        </Button>
      </div>
    </>
  );
}

function EntryContent() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = (params.get('mode') as Mode) ?? 'expense';
  const title = mode === 'transfer' ? '账户转换' : mode === 'income' ? '入账' : '新增支出';

  return (
    <PhoneScreen>
      <AppBar
        title={title}
        left={
          <div onClick={() => router.back()} style={{ fontSize: 20, color: T.textSoft, fontWeight: 300, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</div>
        }
        right={<div style={{ fontSize: 13, color: T.textMute, fontWeight: 500 }}>草稿</div>}
      />

      <div style={{ padding: '0 16px 6px' }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bgSubtle, borderRadius: 10, border: `1px solid ${T.borderSoft}` }}>
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <div
                key={m.id}
                onClick={() => !on && router.replace(`/entry?mode=${m.id}`)}
                style={{ flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? m.color : T.textSoft, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none', fontFamily: CN_FONT, cursor: on ? 'default' : 'pointer' }}
              >
                {m.label}
              </div>
            );
          })}
        </div>
      </div>

      {mode !== 'transfer' && (
        <div style={{ padding: '8px 16px 0' }}>
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: T.accentSoft, borderRadius: 10, border: `1px solid ${T.accent}20` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 300 }}>↑</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>拍照上传小票</div>
                <div style={{ fontSize: 10, color: T.textMute, marginTop: 1 }}>AI 自动识别，手动确认入账</div>
              </div>
              <span style={{ fontSize: 14, color: T.accent }}>›</span>
            </div>
          </Link>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 80px' }}>
        {mode === 'transfer' ? <TransferForm /> : <ExpenseIncomeForm mode={mode} />}
      </div>

      <BottomNav active="add" />
    </PhoneScreen>
  );
}

export default function EntryPage() {
  return (
    <Suspense>
      <EntryContent />
    </Suspense>
  );
}
