'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Amount } from '@/components/ui/Amount';
import { Button } from '@/components/ui/Button';
import { CatMark } from '@/components/ui/CatMark';
import { useApp } from '@/context/AppContext';
import { acctById, ACCOUNTS, ACCT_KIND, catById, EXPENSE_CATS, INCOME_CATS, Transaction } from '@/lib/data';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

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

function AcctCard({ label, acct, amount, highlight }: { label: string; acct: ReturnType<typeof acctById>; amount: number; highlight?: boolean }) {
  const k = ACCT_KIND[acct.kind];
  return (
    <div style={{ background: highlight ? T.transferSoft : T.surface, border: `1px solid ${highlight ? T.transfer + '40' : T.border}`, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 30, borderRadius: 4, background: k.color, color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: T.textMute, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {acct.name}
          <span style={{ fontSize: 9, fontFamily: NUM_FONT, color: T.textMute, fontWeight: 600 }}>{acct.currency}</span>
        </div>
        <div style={{ fontSize: 10, color: T.textMute, marginTop: 2 }}>
          余额 <Amount value={acct.balance ?? 0} size={10} weight={600} color={T.textSoft} currency={acct.currency} showCurrency={false} />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Amount value={amount} size={17} weight={600} currency={acct.currency} showCurrency={false} />
        <div style={{ fontSize: 10, color: T.transfer, marginTop: 2 }}>更改 ›</div>
      </div>
    </div>
  );
}

function ExpenseIncomeForm({ mode }: { mode: 'expense' | 'income' }) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const isIncome = mode === 'income';
  const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;
  const accentColor = isIncome ? T.income : T.accent;
  const quickCats = isIncome
    ? ['salary', 'bonus', 'refund', 'reimburse']
    : ['food', 'groceries', 'transport', 'daily', 'fun', 'cloth'];
  const quickAccts = isIncome
    ? ['bank_mufg', 'bank_smbc', 'paypay', 'cash_jpy']
    : ['paypay', 'cash_jpy', 'cc_rakuten', 'cc_smbc'];

  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState<'JPY' | 'CNY'>('JPY');
  const [cat, setCat] = useState(isIncome ? 'salary' : 'groceries');
  const [acct, setAcct] = useState(isIncome ? 'bank_mufg' : 'cc_rakuten');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const amount = currency === 'JPY' ? Math.round(parseFloat(amountStr) || 0) : parseFloat(amountStr) || 0;

  function handleSave() {
    if (amount <= 0) return;
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      date: '2026-05-19',
      type: mode,
      role: state.currentRole,
      amount,
      currency,
      cat,
      acct,
      title: title || catById(cat).name,
      note,
    };
    dispatch({ type: 'ADD_TRANSACTION', tx });
    router.push('/transactions');
  }

  function handleReset() {
    setAmountStr('');
    setTitle('');
    setNote('');
  }

  return (
    <>
      {/* Amount input area */}
      <div style={{ padding: '18px 0 20px', textAlign: 'center', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ fontSize: 11, color: T.textMute, marginBottom: 8 }}>{isIncome ? '入账金额' : '支出金额'}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontFamily: NUM_FONT, fontSize: 24, color: T.textMute, lineHeight: 1 }}>¥</span>
          <input
            type="text"
            inputMode="decimal"
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
              <div key={cc} onClick={() => setCurrency(cc)} style={{ padding: '4px 14px', borderRadius: 6, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, fontSize: 11, fontWeight: 600, fontFamily: NUM_FONT, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none', cursor: 'pointer' }}>{cc}</div>
            );
          })}
        </div>
      </div>

      <Row label="角色"><RoleSwitcher /></Row>

      <Row label="日期">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink }}>
          <span>2026-05-19 (周二)</span>
          <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
        </div>
      </Row>

      <Row label={isIncome ? '入账分类' : '分类'}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(6, quickCats.length)}, 1fr)`, gap: 6 }}>
          {quickCats.map((cid) => {
            const c = catById(cid);
            const on = cid === cat;
            return (
              <div key={cid} onClick={() => setCat(cid)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0', borderRadius: 8, background: on ? T.surface : 'transparent', border: on ? `1.5px solid ${accentColor}` : '1px solid transparent', cursor: 'pointer' }}>
                <CatMark cat={c} size={28} />
                <span style={{ fontSize: 10, color: on ? T.ink : T.textSoft, fontWeight: on ? 600 : 400 }}>{c.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: T.textMute, textAlign: 'right' }}>更多分类 →</div>
      </Row>

      <Row label={isIncome ? '入账账户' : '支付方式 / 账户'}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickAccts.map((aid) => {
            const a = acctById(aid);
            const on = aid === acct;
            const k = ACCT_KIND[a.kind];
            return (
              <div key={aid} onClick={() => setAcct(aid)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: on ? T.ink : T.surface, border: `1px solid ${on ? T.ink : T.border}`, color: on ? '#fff' : T.text, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <span style={{ width: 5, height: 5, borderRadius: 1, background: on ? '#fff' : k.color }} />
                {a.name}
                {a.tail && <span style={{ opacity: 0.55, fontFamily: NUM_FONT, fontSize: 10 }}>·{a.tail}</span>}
              </div>
            );
          })}
        </div>
      </Row>

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
        <Button variant={isIncome ? 'success' : 'primary'} size="lg" style={{ flex: 2 }} onClick={handleSave}>保存</Button>
      </div>
    </>
  );
}

function TransferForm() {
  const { dispatch } = useApp();
  const router = useRouter();
  const [fromAcctId, setFromAcctId] = useState('bank_mufg');
  const [toAcctId, setToAcctId] = useState('bank_cn');
  const [fromAmount, setFromAmount] = useState('');
  const [note, setNote] = useState('');

  const from = acctById(fromAcctId);
  const to = acctById(toAcctId);
  const fromAmt = Math.round(parseFloat(fromAmount) || 0);

  function handleSave() {
    if (fromAmt <= 0) return;
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      date: '2026-05-19',
      type: 'transfer',
      fromAcct: fromAcctId,
      toAcct: toAcctId,
      fromAmount: fromAmt,
      toAmount: fromAmt,
      currency: 'JPY',
      note,
    };
    dispatch({ type: 'ADD_TRANSACTION', tx });
    router.push('/transactions');
  }

  return (
    <>
      <div style={{ padding: '14px 0' }}>
        <AcctCard label="转出账户" acct={from} amount={fromAmt} />
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 15, background: T.surface, border: `1px solid ${T.border}`, color: T.transfer, fontSize: 14, fontWeight: 600 }}>↓</div>
        </div>
        <AcctCard label="转入账户" acct={to} amount={fromAmt} highlight />
      </div>

      <Row label="转账金额">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={fromAmount}
          onChange={(e) => setFromAmount(e.target.value)}
          placeholder="0"
          style={{ width: '100%', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 18, fontWeight: 600, color: T.ink, outline: 'none', boxSizing: 'border-box', fontFamily: NUM_FONT }}
        />
      </Row>

      <Row label="日期">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.ink }}>
          <span>2026-05-19 (周二)</span>
          <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
        </div>
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

      <div style={{ marginTop: 8, padding: 10, background: T.bgSubtle, borderRadius: 8, fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>
        <strong style={{ color: T.ink }}>提示：</strong>
        账户转换不计入本月支出 / 入账，不消耗预算，只调整账户余额。
      </div>

      <div style={{ padding: '10px 0 18px', display: 'flex', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => router.back()}>取消</Button>
        <Button variant="primary" size="lg" style={{ flex: 2, background: T.transfer }} onClick={handleSave}>保存转账</Button>
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
          <div
            onClick={() => router.back()}
            style={{ fontSize: 20, color: T.textSoft, fontWeight: 300, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >×</div>
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
