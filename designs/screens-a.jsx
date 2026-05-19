// screens-a.jsx — Dashboard, Manual Entry, Receipt Upload, Settings

// ─────────────────────────────────────────────────────────────
// 1) Dashboard
// ─────────────────────────────────────────────────────────────
function ScreenDashboard() {
  const m = monthTotals;
  const recent = TX.slice(0, 6);
  const topCats = catSummary.slice(0, 4);
  const catTotal = catSummary.reduce((a, b) => a + b.amount, 0);

  // Budget alerts
  const budgetAlerts = BUDGETS.filter((b) => b.enabled).map((b) => {
    const pct = b.used / b.limit;
    return { ...b, pct, status: pct >= 1 ? 'over' : pct >= b.threshold ? 'near' : 'ok' };
  });
  const overOrNear = budgetAlerts.filter((b) => b.status !== 'ok');

  return (
    <PhoneScreen>
      <AppBar
        title="家计簿"
        subtitle="2026 年 5 月"
        left={(
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: TOKENS.bgSubtle,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: TOKENS.textSoft, fontWeight: 600,
          }}>家</div>
        )}
        right={(
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: TOKENS.surface,
            border: `1px solid ${TOKENS.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: TOKENS.textSoft,
          }}>≡</div>
        )}
      />
      <div style={{ padding: '0 14px 6px' }}>
        <RoleSwitcher active="me" />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px 80px' }}>
        {/* Hero: month expense vs income */}
        <Card pad={14} style={{
          background: `linear-gradient(155deg, #FFFFFF 0%, ${TOKENS.surfaceAlt} 100%)`,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: TOKENS.textMute, letterSpacing: 0.4, marginBottom: 3 }}>本月总支出</div>
              <Amount value={m.expense} size={26} weight={600} color={TOKENS.ink} />
            </div>
            <div style={{ flex: 1, textAlign: 'right', borderLeft: `1px solid ${TOKENS.borderSoft}`, paddingLeft: 12 }}>
              <div style={{ fontSize: 10, color: TOKENS.textMute, letterSpacing: 0.4, marginBottom: 3 }}>本月入账</div>
              <Amount value={m.income} size={18} weight={600} color={TOKENS.income} sign="+" />
              <div style={{ fontSize: 10, color: TOKENS.textMute, marginTop: 4 }}>
                结余 <Amount value={m.income - m.expense} size={10} weight={600} color={TOKENS.income} sign="+" />
              </div>
            </div>
          </div>
          {/* Budget bar */}
          <div style={{ marginTop: 12, height: 5, background: TOKENS.bgSubtle, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(m.expense / m.budget * 100).toFixed(0)}%`, height: '100%', background: TOKENS.accent }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: TOKENS.textMute, display: 'flex', justifyContent: 'space-between' }}>
            <span>本月预算 {(m.expense / m.budget * 100).toFixed(0)}%</span>
            <span>剩余 <Amount value={m.budget - m.expense} size={10} color={TOKENS.textSoft} /></span>
          </div>
        </Card>

        {/* Per-role 3 cards (expense only) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[['me', m.exMe], ['her', m.exHer], ['family', m.exFamily]].map(([rid, v]) => {
            const r = roleById(rid);
            return (
              <div key={rid} style={{
                background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
                borderRadius: 12, padding: '10px 10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: r.color }} />
                  <span style={{ fontSize: 11, color: TOKENS.textSoft, fontWeight: 500 }}>{r.name}</span>
                </div>
                <Amount value={v} size={15} weight={600} color={TOKENS.ink} />
                <div style={{ fontSize: 9, color: TOKENS.textMute, marginTop: 2 }}>
                  {(v / m.expense * 100).toFixed(0)}% 占比
                </div>
              </div>
            );
          })}
        </div>

        {/* Four primary actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
          <ActionBtn label="支出"  glyph="−" color={TOKENS.ink}      filled />
          <ActionBtn label="入账"  glyph="+" color={TOKENS.income} />
          <ActionBtn label="转账"  glyph="⇄" color={TOKENS.transfer} />
          <ActionBtn label="小票"  glyph="↑" color={TOKENS.accent} />
        </div>

        {/* Account balances */}
        <SectionLabel right="管理 →">账户余额</SectionLabel>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '2px 0 10px', marginBottom: 4,
        }}>
          {ACCOUNTS.filter((a) => a.kind !== 'card').slice(0, 5).map((a) => (
            <div key={a.id} style={{
              flex: '0 0 auto', minWidth: 124,
              background: a.currency === 'CNY' ? '#FAF4EE' : TOKENS.surface,
              border: `1px solid ${a.currency === 'CNY' ? '#E8D9C5' : TOKENS.border}`,
              borderRadius: 12, padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: 1, background: ACCT_KIND[a.kind].color }} />
                <span style={{ fontSize: 10, color: TOKENS.textSoft, fontWeight: 500, whiteSpace: 'nowrap' }}>{a.name}</span>
                {a.currency !== 'JPY' && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 8, fontFamily: NUM_FONT,
                    background: TOKENS.warningSoft, color: TOKENS.warning,
                    padding: '1px 4px', borderRadius: 3, fontWeight: 700,
                  }}>{a.currency}</span>
                )}
              </div>
              <Amount value={a.balance} size={14} weight={600} currency={a.currency} showCurrency={false} />
            </div>
          ))}
        </div>

        {/* Budget alerts */}
        {overOrNear.length > 0 && (
          <>
            <SectionLabel right={`${overOrNear.length} 项需关注`}>预算预警</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {overOrNear.map((b) => <BudgetAlertRow key={b.id} b={b} />)}
            </div>
          </>
        )}

        {/* Category breakdown */}
        <SectionLabel right="本月">分类支出</SectionLabel>
        <Card pad={12} style={{ marginBottom: 14 }}>
          {topCats.map((row, i) => {
            const c = catById(row.cat);
            const pct = row.amount / catTotal * 100;
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.borderSoft}`,
              }}>
                <CatMark cat={c} size={26} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: TOKENS.ink }}>{c.name}</span>
                    <Amount value={row.amount} size={13} weight={500} />
                  </div>
                  <div style={{ marginTop: 4, height: 3, background: TOKENS.bgSubtle, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c.tint, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Recent transactions */}
        <SectionLabel right="查看全部 →">最近</SectionLabel>
        <Card pad={4}>
          {recent.map((tx, i) => (
            <div key={tx.id} style={{
              borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.borderSoft}`,
              padding: '0 8px',
            }}>
              <TxRow tx={tx} showDate />
            </div>
          ))}
        </Card>
      </div>
      <BottomNav active="home" />
    </PhoneScreen>
  );
}

function ActionBtn({ label, glyph, color, filled }) {
  return (
    <div style={{
      background: filled ? color : TOKENS.surface,
      border: filled ? 'none' : `1px solid ${TOKENS.border}`,
      borderRadius: 10, padding: '10px 4px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: filled ? 'rgba(255,255,255,0.18)' : `${color}15`,
        color: filled ? '#fff' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 600,
      }}>{glyph}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: filled ? '#fff' : TOKENS.ink }}>{label}</div>
    </div>
  );
}

function BudgetAlertRow({ b }) {
  const c = catById(b.cat);
  const over = b.status === 'over';
  const accent = over ? TOKENS.danger : TOKENS.warning;
  const accentSoft = over ? TOKENS.dangerSoft : TOKENS.warningSoft;
  return (
    <div style={{
      background: TOKENS.surface, border: `1px solid ${accent}30`,
      borderRadius: 10, padding: '8px 10px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <CatMark cat={c} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: TOKENS.ink, fontWeight: 500 }}>
            {c.name}
            {b.role !== 'all' && (
              <span style={{ fontSize: 10, color: TOKENS.textMute, marginLeft: 4 }}>· {roleById(b.role).name}</span>
            )}
          </span>
          <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>
            {over ? '超出 ' : '已用 '}
            <span style={{ fontFamily: NUM_FONT }}>{Math.round(b.pct * 100)}%</span>
          </span>
        </div>
        <div style={{ marginTop: 4, height: 4, background: accentSoft, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, b.pct * 100)}%`, height: '100%', background: accent }} />
        </div>
        <div style={{ marginTop: 4, fontSize: 10, color: TOKENS.textMute, display: 'flex', justifyContent: 'space-between' }}>
          <Amount value={b.used} size={10} color={TOKENS.textSoft} />
          <span>预算 <Amount value={b.limit} size={10} color={TOKENS.textSoft} /></span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2) Manual Entry — three modes: expense / income / transfer
// ─────────────────────────────────────────────────────────────
function ScreenManualEntry({ mode = 'expense' }) {
  return (
    <PhoneScreen>
      <AppBar
        title={mode === 'transfer' ? '账户转换' : mode === 'income' ? '入账' : '新增支出'}
        left={(<div style={{ fontSize: 20, color: TOKENS.textSoft, fontWeight: 300, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</div>)}
        right={(<div style={{ fontSize: 13, color: TOKENS.textMute, fontWeight: 500 }}>草稿</div>)}
      />

      {/* Mode segmented control */}
      <div style={{ padding: '0 16px 6px' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 3,
          background: TOKENS.bgSubtle, borderRadius: 10,
          border: `1px solid ${TOKENS.borderSoft}`,
        }}>
          {[
            { id: 'expense',  label: '支出', color: TOKENS.text },
            { id: 'income',   label: '入账', color: TOKENS.income },
            { id: 'transfer', label: '转账', color: TOKENS.transfer },
          ].map((m) => {
            const on = m.id === mode;
            return (
              <div key={m.id} style={{
                flex: 1, textAlign: 'center', padding: '7px 0',
                borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: on ? '#fff' : 'transparent',
                color: on ? m.color : TOKENS.textSoft,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}>{m.label}</div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 80px' }}>
        {mode === 'transfer'
          ? <TransferForm />
          : <ExpenseIncomeForm mode={mode} />}
      </div>

      {/* Sticky bottom save */}
      <div style={{
        padding: '10px 16px 18px',
        borderTop: `1px solid ${TOKENS.borderSoft}`,
        background: 'rgba(251,248,242,0.96)',
        display: 'flex', gap: 8,
      }}>
        <Button variant="secondary" size="lg" style={{ flex: 1 }}>再记一笔</Button>
        <Button
          variant={mode === 'income' ? 'success' : 'primary'}
          size="lg"
          style={{
            flex: 2,
            background: mode === 'transfer' ? TOKENS.transfer : undefined,
          }}
        >保存</Button>
      </div>
    </PhoneScreen>
  );
}

function ExpenseIncomeForm({ mode }) {
  const isIncome = mode === 'income';
  const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;
  const accentColor = isIncome ? TOKENS.income : TOKENS.accent;
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
      {/* Big amount + currency */}
      <div style={{
        padding: '18px 0 20px', textAlign: 'center',
        borderBottom: `1px solid ${TOKENS.borderSoft}`,
      }}>
        <div style={{ fontSize: 11, color: TOKENS.textMute, marginBottom: 4 }}>
          {isIncome ? '入账金额' : '支出金额'}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: NUM_FONT, fontSize: 22, color: TOKENS.textMute }}>¥</span>
          <span style={{ fontFamily: NUM_FONT, fontSize: 40, fontWeight: 600, color: TOKENS.ink, letterSpacing: -1, lineHeight: 1 }}>
            {sampleAmount}
          </span>
          <span style={{ width: 2, height: 32, background: accentColor, marginLeft: 4, animation: 'blink 1s infinite' }} />
        </div>
        {/* currency switch */}
        <div style={{ marginTop: 10, display: 'inline-flex', gap: 4, padding: 2, background: TOKENS.bgSubtle, borderRadius: 8 }}>
          {['JPY', 'CNY'].map((cc) => {
            const on = cc === 'JPY';
            return (
              <div key={cc} style={{
                padding: '4px 14px', borderRadius: 6,
                background: on ? '#fff' : 'transparent',
                color: on ? TOKENS.ink : TOKENS.textSoft,
                fontSize: 11, fontWeight: 600, fontFamily: NUM_FONT,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}>{cc}</div>
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
              <div key={cid} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 0', borderRadius: 8,
                background: on ? TOKENS.surface : 'transparent',
                border: on ? `1.5px solid ${accentColor}` : `1px solid transparent`,
              }}>
                <CatMark cat={c} size={28} />
                <span style={{ fontSize: 10, color: on ? TOKENS.ink : TOKENS.textSoft, fontWeight: on ? 600 : 400 }}>{c.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: TOKENS.textMute, textAlign: 'right' }}>更多分类 →</div>
      </Row>

      <Row label={isIncome ? '入账账户' : '支付方式 / 账户'}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickAccts.map((aid) => {
            const a = acctById(aid);
            const on = aid === sampleAcct;
            const k = ACCT_KIND[a.kind];
            return (
              <div key={aid} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 999,
                background: on ? TOKENS.ink : TOKENS.surface,
                border: `1px solid ${on ? TOKENS.ink : TOKENS.border}`,
                color: on ? '#fff' : TOKENS.text, fontSize: 12, fontWeight: 500,
              }}>
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
  const to   = acctById('bank_cn');
  return (
    <>
      {/* From → To cards */}
      <div style={{ padding: '14px 0' }}>
        <AcctCard label="转出账户" acct={from} amount={100000} editable />
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 15, background: TOKENS.surface,
            border: `1px solid ${TOKENS.border}`, color: TOKENS.transfer,
            fontSize: 14, fontWeight: 600,
          }}>↓</div>
        </div>
        <AcctCard label="转入账户" acct={to} amount={4820.55} editable highlight />
      </div>

      {/* Rate hint */}
      <div style={{
        padding: 12, background: TOKENS.transferSoft, borderRadius: 10,
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ fontSize: 11, color: TOKENS.transfer, fontWeight: 600 }}>实时汇率</div>
        <div style={{ flex: 1, fontFamily: NUM_FONT, fontSize: 12, color: TOKENS.ink }}>
          1 JPY = 0.04821 CNY
        </div>
        <div style={{ fontSize: 11, color: TOKENS.transfer, fontWeight: 500 }}>使用 ›</div>
      </div>

      <Row label="日期"><PickerField value="2026-05-17 (周日)" /></Row>
      <Row label="手续费（可选）"><PickerField value="¥0" placeholder /></Row>
      <Row label="备注"><PickerField value="汇款回国" /></Row>

      <div style={{
        marginTop: 12, padding: 10, background: TOKENS.bgSubtle, borderRadius: 8,
        fontSize: 11, color: TOKENS.textSoft, lineHeight: 1.5,
      }}>
        <strong style={{ color: TOKENS.ink }}>提示：</strong>
        账户转换不计入本月支出 / 入账，不消耗预算，只调整账户余额。
      </div>
    </>
  );
}

function AcctCard({ label, acct, amount, editable, highlight }) {
  const k = ACCT_KIND[acct.kind];
  return (
    <div style={{
      background: highlight ? TOKENS.transferSoft : TOKENS.surface,
      border: `1px solid ${highlight ? TOKENS.transfer + '40' : TOKENS.border}`,
      borderRadius: 12, padding: 12,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 38, height: 30, borderRadius: 4, background: k.color, color: '#fff',
        fontSize: 9, fontWeight: 700, letterSpacing: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{k.label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: TOKENS.textMute, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {acct.name}
          <span style={{ fontSize: 9, fontFamily: NUM_FONT, color: TOKENS.textMute, fontWeight: 600 }}>{acct.currency}</span>
        </div>
        <div style={{ fontSize: 10, color: TOKENS.textMute, marginTop: 2 }}>
          余额 <Amount value={acct.balance} size={10} weight={600} color={TOKENS.textSoft} currency={acct.currency} showCurrency={false} />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Amount value={amount} size={17} weight={600} currency={acct.currency} showCurrency={false} />
        {editable && <div style={{ fontSize: 10, color: TOKENS.transfer, marginTop: 2 }}>编辑 ›</div>}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${TOKENS.borderSoft}` }}>
      <div style={{ fontSize: 11, color: TOKENS.textSoft, fontWeight: 500, marginBottom: 8, letterSpacing: 0.3 }}>{label}</div>
      {children}
    </div>
  );
}

function PickerField({ value, placeholder }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px',
      background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
      borderRadius: 10,
      fontSize: 14, color: placeholder ? TOKENS.textMute : TOKENS.ink,
    }}>
      <span>{value}</span>
      <span style={{ color: TOKENS.textDim, fontSize: 12 }}>›</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3) Receipt Upload — with optional AI hint note
// ─────────────────────────────────────────────────────────────
function ScreenReceiptUpload() {
  return (
    <PhoneScreen>
      <AppBar
        title="上传小票"
        subtitle="AI 识别后需手动确认"
        left={(<div style={{ fontSize: 18, color: TOKENS.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>)}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Drop zone */}
        <div style={{
          border: `1.5px dashed ${TOKENS.border}`,
          borderRadius: 14, padding: '22px 16px 18px',
          background: TOKENS.surfaceAlt, textAlign: 'center',
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: 25, margin: '0 auto 8px',
            background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: TOKENS.accent, fontWeight: 300,
          }}>↑</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>
            拖入小票图片
          </div>
          <div style={{ fontSize: 11, color: TOKENS.textMute, marginTop: 4 }}>
            支持多张同时上传 · JPG / PNG / HEIC
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            <Button variant="primary" size="md">选择文件</Button>
            <Button variant="secondary" size="md" icon={(<span style={{ width: 12, height: 10, border: `1.4px solid ${TOKENS.ink}`, borderRadius: 1, display: 'inline-block', marginRight: 2 }} />)}>拍照</Button>
          </div>
        </div>

        {/* AI hint input */}
        <SectionLabel right={(<span style={{ color: TOKENS.textMute }}>可选</span>)}>
          给 AI 的提示
        </SectionLabel>
        <Card pad={12} style={{ marginBottom: 4 }}>
          <div style={{
            border: `1px solid ${TOKENS.border}`, borderRadius: 8,
            padding: '8px 10px', minHeight: 56,
            fontSize: 13, color: TOKENS.ink, lineHeight: 1.5,
            background: TOKENS.surfaceAlt,
          }}>
            本周食材采购，统一算共通账
            <span style={{ display: 'inline-block', width: 1.5, height: 14, background: TOKENS.accent, verticalAlign: -3, marginLeft: 2, animation: 'blink 1s infinite' }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {[
              '算共通账', '算我的', '算她的',
              '公司报销', '不要拆分', '人民币支付',
            ].map((s) => (
              <span key={s} style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 999,
                background: TOKENS.bgSubtle, color: TOKENS.textSoft,
                border: `1px solid ${TOKENS.borderSoft}`,
              }}>{s}</span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: TOKENS.textMute, lineHeight: 1.5 }}>
            AI 会用这段文字辅助分类（如归角色 / 标记报销 / 选币种）。
          </div>
        </Card>

        {/* Upload queue */}
        <SectionLabel right={`${UPLOADS.length} 项`} >上传队列</SectionLabel>
        <Card pad={4}>
          {UPLOADS.map((u, i) => (
            <UploadRow key={u.id} u={u} first={i === 0} />
          ))}
        </Card>

        {/* Confirm CTA */}
        <div style={{
          marginTop: 16, padding: 12,
          background: TOKENS.warningSoft, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11,
            background: TOKENS.warning, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>1</div>
          <div style={{ flex: 1, fontSize: 12, color: TOKENS.ink, lineHeight: 1.45 }}>
            <strong style={{ fontWeight: 600 }}>1 张</strong> 已识别，等待你确认后才会正式入账。
          </div>
          <Button variant="primary" size="sm">去确认</Button>
        </div>
      </div>
      <BottomNav active="add" />
    </PhoneScreen>
  );
}

function UploadRow({ u, first }) {
  const statusMeta = {
    'queued':        { label: '等待中',     color: TOKENS.textMute, bg: TOKENS.bgSubtle },
    'recognizing':   { label: '识别中',     color: TOKENS.accent,   bg: TOKENS.accentSoft },
    'needs-confirm': { label: '待确认',     color: TOKENS.warning,  bg: TOKENS.warningSoft },
    'failed':        { label: '识别失败',   color: TOKENS.danger,   bg: TOKENS.dangerSoft },
  }[u.status];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 8px',
      borderTop: first ? 'none' : `1px solid ${TOKENS.borderSoft}`,
    }}>
      <ReceiptThumb label="" w={38} h={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 500, fontFamily: NUM_FONT, letterSpacing: 0 }}>
            {u.name}
          </span>
        </div>
        <div style={{ fontSize: 10, color: TOKENS.textMute, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{u.size}</span>
          {u.status === 'recognizing' && (
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ flex: 1, height: 2, background: TOKENS.bgSubtle, borderRadius: 1, overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${u.progress}%`, height: '100%', background: TOKENS.accent }} />
              </span>
              {u.progress}%
            </span>
          )}
        </div>
        {u.hint && (
          <div style={{
            marginTop: 5, padding: '3px 7px', borderRadius: 5,
            background: TOKENS.accentSoft, color: TOKENS.accent,
            fontSize: 10, fontWeight: 500, display: 'inline-block',
          }}>
            💡 {u.hint}
          </div>
        )}
      </div>
      <div style={{
        padding: '3px 8px', borderRadius: 999, alignSelf: 'flex-start',
        background: statusMeta.bg, color: statusMeta.color,
        fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
      }}>{statusMeta.label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7) Settings
// ─────────────────────────────────────────────────────────────
function ScreenSettings() {
  return (
    <PhoneScreen>
      <AppBar title="设置" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Default role */}
        <SectionLabel>本浏览器默认角色</SectionLabel>
        <Card pad={12} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: TOKENS.textMute, marginBottom: 8 }}>
            新增支出 / 入账时默认填入此角色，可随时修改
          </div>
          <RoleSwitcher active="me" />
        </Card>

        {/* Roles */}
        <SectionLabel right="编辑">角色管理</SectionLabel>
        <Card pad={4} style={{ marginBottom: 16 }}>
          {ROLES.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 10px',
              borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.borderSoft}`,
            }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: r.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: r.color, fontWeight: 600 }}>{r.short}</div>
              <div style={{ flex: 1, fontSize: 14, color: TOKENS.ink }}>{r.name}</div>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: r.color }} />
              <span style={{ color: TOKENS.textDim, fontSize: 12 }}>›</span>
            </div>
          ))}
          <div style={{
            borderTop: `1px solid ${TOKENS.borderSoft}`,
            padding: '12px 10px', fontSize: 13, color: TOKENS.accent, fontWeight: 500,
          }}>+ 添加角色</div>
        </Card>

        {/* Accounts & Payments */}
        <SectionLabel right={`${ACCOUNTS.length} 项`}>账户 & 支付方式</SectionLabel>
        <Card pad={4} style={{ marginBottom: 16 }}>
          {ACCOUNTS.map((a, i) => {
            const k = ACCT_KIND[a.kind];
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 10px',
                borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.borderSoft}`,
              }}>
                <div style={{
                  width: 32, height: 24, borderRadius: 4,
                  background: k.color, color: '#fff', fontSize: 8, fontWeight: 700, letterSpacing: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{k.label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: TOKENS.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.name}
                    {a.currency !== 'JPY' && (
                      <span style={{
                        fontSize: 8, fontFamily: NUM_FONT,
                        background: TOKENS.warningSoft, color: TOKENS.warning,
                        padding: '1px 4px', borderRadius: 3, fontWeight: 700,
                      }}>{a.currency}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: TOKENS.textMute, marginTop: 2, fontFamily: NUM_FONT }}>
                    {a.tail ? `•••• ${a.tail}` : a.balance !== undefined
                      ? `余额 ${fmtAmount(a.balance, a.currency)}`
                      : ''}
                  </div>
                </div>
                <span style={{ color: TOKENS.textDim, fontSize: 12 }}>›</span>
              </div>
            );
          })}
          <div style={{
            borderTop: `1px solid ${TOKENS.borderSoft}`,
            padding: '12px 10px', fontSize: 13, color: TOKENS.accent, fontWeight: 500,
          }}>+ 添加账户 / 支付方式</div>
        </Card>

        {/* Categories — expense */}
        <SectionLabel right="支出">分类管理</SectionLabel>
        <Card pad={12} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXPENSE_CATS.map((c) => (
              <div key={c.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 8px 4px 4px', borderRadius: 999,
                background: TOKENS.bgSubtle, fontSize: 12, color: TOKENS.ink,
              }}>
                <CatMark cat={c} size={20} />
                {c.name}
              </div>
            ))}
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              border: `1px dashed ${TOKENS.border}`,
              fontSize: 12, color: TOKENS.textSoft,
            }}>+ 新分类</div>
          </div>
        </Card>
        {/* Categories — income */}
        <Card pad={12} style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
          }}>
            <TypeBadge type="income" />
            <span style={{ fontSize: 11, color: TOKENS.textSoft }}>入账分类</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {INCOME_CATS.map((c) => (
              <div key={c.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 8px 4px 4px', borderRadius: 999,
                background: TOKENS.incomeSoft, fontSize: 12, color: TOKENS.ink,
              }}>
                <CatMark cat={c} size={20} />
                {c.name}
              </div>
            ))}
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              border: `1px dashed ${TOKENS.border}`,
              fontSize: 12, color: TOKENS.textSoft,
            }}>+ 新分类</div>
          </div>
        </Card>

        {/* Data */}
        <SectionLabel>数据</SectionLabel>
        <Card pad={4} style={{ marginBottom: 16 }}>
          {[
            { t: '导出 CSV', sub: 'UTF-8 with BOM · Excel 可读', acc: TOKENS.success },
            { t: '导出 JSON', sub: 'UTF-8 · 完整结构备份', acc: TOKENS.accent },
            { t: '导入历史数据', sub: 'CSV / JSON', acc: TOKENS.warning },
          ].map((it, i) => (
            <div key={it.t} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 10px',
              borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.borderSoft}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: it.acc }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: TOKENS.ink }}>{it.t}</div>
                <div style={{ fontSize: 11, color: TOKENS.textMute, marginTop: 2 }}>{it.sub}</div>
              </div>
              <span style={{ color: TOKENS.textDim, fontSize: 12 }}>›</span>
            </div>
          ))}
        </Card>

        <div style={{
          textAlign: 'center', padding: '10px 0 6px',
          fontSize: 10, color: TOKENS.textDim,
        }}>家计簿 v0.1 · made with care</div>
      </div>
      <BottomNav active="me" />
    </PhoneScreen>
  );
}

Object.assign(window, { ScreenDashboard, ScreenManualEntry, ScreenReceiptUpload, ScreenSettings });
