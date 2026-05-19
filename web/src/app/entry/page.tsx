'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Amount } from '@/components/ui/Amount';
import { AccountChip } from '@/components/ui/AccountChip';
import { Button } from '@/components/ui/Button';
import { CatMark } from '@/components/ui/CatMark';
import { acctById, ACCOUNTS, ACCT_KIND, catById, EXPENSE_CATS, INCOME_CATS } from '@/lib/data';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Mode = 'expense' | 'income' | 'transfer';

const MODES: { id: Mode; label: string; color: string }[] = [
  { id: 'expense',  label: '支出', color: T.text     },
  { id: 'income',   label: '入账', color: T.income   },
  { id: 'transfer', label: '转账', color: T.transfer },
];

function PickerField({ value, placeholder }: { value: string; placeholder?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: placeholder ? T.textMute : T.ink }}>
      <span>{value}</span>
      <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
      <div style={{ fontSize: 11, color: T.textSoft, fontWeight: 500, marginBottom: 8, letterSpacing: 0.3 }}>{label}</div>
      {children}
    </div>
  );
}

function AcctCard({ label, acct, amount, editable, highlight }: { label: string; acct: ReturnType<typeof acctById>; amount: number; editable?: boolean; highlight?: boolean }) {
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
        {editable && <div style={{ fontSize: 10, color: T.transfer, marginTop: 2 }}>编辑 ›</div>}
      </div>
    </div>
  );
}

function ExpenseIncomeForm({ mode }: { mode: 'expense' | 'income' }) {
  const isIncome = mode === 'income';
  const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;
  const accentColor = isIncome ? T.income : T.accent;
  const quickCats = isIncome
    ? ['salary', 'bonus', 'refund', 'reimburse']
    : ['food', 'groceries', 'transport', 'daily', 'fun', 'cloth'];
  const quickAccts = isIncome
    ? ['bank_mufg', 'bank_smbc', 'paypay', 'cash_jpy']
    : ['paypay', 'cash_jpy', 'cc_rakuten', 'cc_smbc'];
  const sampleCat = isIncome ? 'salary' : 'groceries';
  const sampleAcct = isIncome ? 'bank_mufg' : 'cc_rakuten';
  const sampleTitle = isIncome ? '5月 給与' : 'OK ストア 西新宿店';
  const sampleAmount = isIncome ? '285,000' : '3,240';

  return (
    <>
      {/* Amount input area */}
      <div style={{ padding: '18px 0 20px', textAlign: 'center', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ fontSize: 11, color: T.textMute, marginBottom: 4 }}>{isIncome ? '入账金额' : '支出金额'}</div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: NUM_FONT, fontSize: 22, color: T.textMute }}>¥</span>
          <span style={{ fontFamily: NUM_FONT, fontSize: 40, fontWeight: 600, color: T.ink, letterSpacing: -1, lineHeight: 1 }}>{sampleAmount}</span>
          <span className="cursor-blink" style={{ width: 2, height: 32, background: accentColor, marginLeft: 4, display: 'inline-block' }} />
        </div>
        <div style={{ marginTop: 10, display: 'inline-flex', gap: 4, padding: 2, background: T.bgSubtle, borderRadius: 8 }}>
          {['JPY', 'CNY'].map((cc) => {
            const on = cc === 'JPY';
            return (
              <div key={cc} style={{ padding: '4px 14px', borderRadius: 6, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, fontSize: 11, fontWeight: 600, fontFamily: NUM_FONT, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none' }}>{cc}</div>
            );
          })}
        </div>
      </div>

      <Row label="角色"><RoleSwitcher active={isIncome ? 'me' : 'family'} /></Row>

      <Row label="日期"><PickerField value="2026-05-18 (周一)" /></Row>

      <Row label={isIncome ? '入账分类' : '分类'}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(6, quickCats.length)}, 1fr)`, gap: 6 }}>
          {quickCats.map((cid) => {
            const c = catById(cid);
            const on = cid === sampleCat;
            return (
              <div key={cid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0', borderRadius: 8, background: on ? T.surface : 'transparent', border: on ? `1.5px solid ${accentColor}` : '1px solid transparent' }}>
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
            const on = aid === sampleAcct;
            const k = ACCT_KIND[a.kind];
            return (
              <div key={aid} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: on ? T.ink : T.surface, border: `1px solid ${on ? T.ink : T.border}`, color: on ? '#fff' : T.text, fontSize: 12, fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: 1, background: on ? '#fff' : k.color }} />
                {a.name}
                {a.tail && <span style={{ opacity: 0.55, fontFamily: NUM_FONT, fontSize: 10 }}>·{a.tail}</span>}
              </div>
            );
          })}
        </div>
      </Row>

      <Row label={isIncome ? '来源 / 标题' : '店铺 / 标题'}>
        <PickerField value={sampleTitle} />
      </Row>

      <Row label="备注">
        <PickerField value={isIncome ? '' : '本周食材'} placeholder={isIncome} />
      </Row>
    </>
  );
}

function TransferForm() {
  const from = acctById('bank_mufg');
  const to = acctById('bank_cn');
  return (
    <>
      <div style={{ padding: '14px 0' }}>
        <AcctCard label="转出账户" acct={from} amount={100000} editable />
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 15, background: T.surface, border: `1px solid ${T.border}`, color: T.transfer, fontSize: 14, fontWeight: 600 }}>↓</div>
        </div>
        <AcctCard label="转入账户" acct={to} amount={4820.55} editable highlight />
      </div>

      <div style={{ padding: 12, background: T.transferSoft, borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, color: T.transfer, fontWeight: 600 }}>实时汇率</div>
        <div style={{ flex: 1, fontFamily: NUM_FONT, fontSize: 12, color: T.ink }}>1 JPY = 0.04821 CNY</div>
        <div style={{ fontSize: 11, color: T.transfer, fontWeight: 500 }}>使用 ›</div>
      </div>

      <Row label="日期"><PickerField value="2026-05-17 (周日)" /></Row>
      <Row label="手续费（可选）"><PickerField value="¥0" placeholder /></Row>
      <Row label="备注"><PickerField value="汇款回国" /></Row>

      <div style={{ marginTop: 12, padding: 10, background: T.bgSubtle, borderRadius: 8, fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>
        <strong style={{ color: T.ink }}>提示：</strong>
        账户转换不计入本月支出 / 入账，不消耗预算，只调整账户余额。
      </div>
    </>
  );
}

function EntryContent() {
  const params = useSearchParams();
  const mode = (params.get('mode') as Mode) ?? 'expense';

  const title = mode === 'transfer' ? '账户转换' : mode === 'income' ? '入账' : '新增支出';
  const saveVariant = mode === 'income' ? 'success' : 'primary';

  return (
    <PhoneScreen>
      <AppBar
        title={title}
        left={<div style={{ fontSize: 20, color: T.textSoft, fontWeight: 300, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</div>}
        right={<div style={{ fontSize: 13, color: T.textMute, fontWeight: 500 }}>草稿</div>}
      />

      <div style={{ padding: '0 16px 6px' }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bgSubtle, borderRadius: 10, border: `1px solid ${T.borderSoft}` }}>
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <a key={m.id} href={`/entry?mode=${m.id}`} style={{ textDecoration: 'none', flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? m.color : T.textSoft, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none', fontFamily: CN_FONT }}>
                {m.label}
              </a>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 80px' }}>
        {mode === 'transfer' ? <TransferForm /> : <ExpenseIncomeForm mode={mode} />}
      </div>

      <div style={{ padding: '10px 16px 18px', borderTop: `1px solid ${T.borderSoft}`, background: 'rgba(251,248,242,0.96)', display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="lg" style={{ flex: 1 }}>再记一笔</Button>
        <Button variant={saveVariant} size="lg" style={{ flex: 2, background: mode === 'transfer' ? T.transfer : undefined }}>保存</Button>
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
