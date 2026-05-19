// screens-b.jsx — AI Confirm, Transaction List, Fixed (expense + income), Budget

// ─────────────────────────────────────────────────────────────
// 4) AI Recognition Confirm — most important screen
// Shows user upload hint, transaction type + currency as first-class fields,
// per-item categorization (one receipt → N transactions on confirm).
// ─────────────────────────────────────────────────────────────
function ScreenAIConfirm() {
  const d = RECEIPT_DRAFTS[0];
  const r = roleById(d.fields.role.value);
  const a = acctById(d.fields.acct.value);
  const txType = d.fields.type.value;

  const includedItems = d.items.filter((it) => it.include);
  const total = includedItems.reduce((a, b) => a + b.price, 0);

  const byCat = {};
  includedItems.forEach((it) => { byCat[it.cat] = (byCat[it.cat] || 0) + it.price; });
  const catDist = Object.entries(byCat)
    .map(([cid, amt]) => ({ cat: catById(cid), amount: amt }))
    .sort((a, b) => b.amount - a.amount);

  const lowConfCount = includedItems.filter((it) => it.warn).length;
  const cc = d.fields.currency.value;

  return (
    <PhoneScreen>
      <AppBar
        title="确认入账"
        subtitle="1 / 1 · 每项 AI 已分类，请核对"
        left={(<div style={{ fontSize: 18, color: TOKENS.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>)}
        right={(<div style={{ fontSize: 12, color: TOKENS.textMute }}>1/1</div>)}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 80px' }}>
        {/* Receipt preview + overall summary */}
        <div style={{
          display: 'flex', gap: 12, padding: 12,
          background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
          borderRadius: 14, marginBottom: 10,
        }}>
          <ReceiptThumb w={72} h={100} label="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 999,
                background: TOKENS.warningSoft, color: TOKENS.warning,
                fontSize: 10, fontWeight: 600,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: 2, background: TOKENS.warning }} />
                待确认 · AI 草稿
              </span>
              <TypeBadge type={txType} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.fields.title.value}
            </div>
            <div style={{ fontSize: 10, color: TOKENS.textMute, marginBottom: 5 }}>
              {d.fields.date.value} · 共 {includedItems.length} 项
            </div>
            <Amount value={total} size={20} weight={600} color={TOKENS.ink} currency={cc} />
            <div style={{ marginTop: 4, fontSize: 10, color: TOKENS.textSoft }}>
              查看原图 <span style={{ color: TOKENS.textDim }}>›</span>
            </div>
          </div>
        </div>

        {/* User-provided AI hint */}
        {d.userHint && (
          <div style={{
            padding: 10, marginBottom: 12,
            background: TOKENS.accentSoft, borderRadius: 10,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, flexShrink: 0,
              background: TOKENS.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>i</div>
            <div style={{ flex: 1, fontSize: 11, color: TOKENS.ink, lineHeight: 1.5 }}>
              <div style={{ fontSize: 9, color: TOKENS.accent, fontWeight: 600, marginBottom: 2, letterSpacing: 0.3 }}>
                你上传时的提示
              </div>
              {d.userHint}
            </div>
            <div style={{ fontSize: 11, color: TOKENS.accent, fontWeight: 500, flexShrink: 0 }}>编辑</div>
          </div>
        )}

        {/* Shared fields */}
        <SectionLabel right="可逐项覆盖">所有项共用</SectionLabel>
        <Card pad={4} style={{ marginBottom: 12 }}>
          <ConfRow label="类型" conf={d.fields.type.conf} first>
            <TypeBadge type={txType} size="md" />
          </ConfRow>
          <ConfRow label="角色" warn={d.fields.role.warn} conf={d.fields.role.conf}>
            <RolePill role={r} size="md" />
          </ConfRow>
          <ConfRow label="账户" warn={d.fields.acct.warn} conf={d.fields.acct.conf}>
            <AccountChip acct={a} size="md" />
            <span style={{ fontSize: 10, color: TOKENS.warning, marginLeft: 6 }}>建议核对</span>
          </ConfRow>
          <ConfRow label="日期" conf={d.fields.date.conf}>
            <span style={{ fontSize: 14, color: TOKENS.ink }}>{d.fields.date.value}</span>
            <span style={{ fontSize: 11, color: TOKENS.textMute, marginLeft: 6 }}>周一</span>
          </ConfRow>
          <ConfRow label="币种" conf={d.fields.currency.conf}>
            <span style={{ fontFamily: NUM_FONT, fontSize: 13, fontWeight: 600, color: TOKENS.ink }}>
              {cc}
            </span>
            <span style={{ fontSize: 10, color: TOKENS.textMute, marginLeft: 6 }}>{CURRENCIES[cc].symbol}</span>
          </ConfRow>
          <ConfRow label="店铺" conf={d.fields.title.conf} last>
            <span style={{ fontSize: 14, color: TOKENS.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.fields.title.value}</span>
          </ConfRow>
        </Card>

        {/* Category distribution */}
        <SectionLabel right={(<Amount value={total} size={11} color={TOKENS.textSoft} weight={600} currency={cc} />)}>
          分类汇总 · 将生成 {includedItems.length} 笔交易
        </SectionLabel>
        <Card pad={12} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {catDist.map(({ cat, amount }) => (
              <div key={cat.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 9px 5px 5px', borderRadius: 999,
                background: TOKENS.bgSubtle, fontSize: 11, color: TOKENS.ink,
              }}>
                <CatMark cat={cat} size={20} />
                <span style={{ fontWeight: 500 }}>{cat.name}</span>
                <Amount value={amount} size={11} weight={600} color={TOKENS.textSoft} currency={cc} showCurrency={false} />
              </div>
            ))}
          </div>
        </Card>

        {/* Per-item list */}
        <SectionLabel right={(<span style={{ color: TOKENS.accent, fontWeight: 600 }}>批量改分类 →</span>)}>
          每项分类（AI）
        </SectionLabel>
        <Card pad={0} style={{ marginBottom: 12, overflow: 'hidden' }}>
          {d.items.map((it, i) => <ItemConfRow key={it.id} it={it} first={i === 0} currency={cc} />)}
        </Card>

        {lowConfCount > 0 && (
          <div style={{
            background: TOKENS.warningSoft, padding: 12, borderRadius: 10,
            display: 'flex', gap: 8, marginBottom: 8,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, flexShrink: 0,
              background: TOKENS.warning, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>!</div>
            <div style={{ fontSize: 11, color: TOKENS.ink, lineHeight: 1.5 }}>
              <strong>{lowConfCount} 个商品</strong>分类置信度较低。
              请点开核对，AI 不会自动入账。
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '10px 16px 18px',
        borderTop: `1px solid ${TOKENS.borderSoft}`,
        background: 'rgba(251,248,242,0.96)',
        display: 'flex', gap: 8, alignItems: 'stretch',
      }}>
        <Button variant="danger" size="lg" style={{ flex: 1 }}>拒绝</Button>
        <Button variant="success" size="lg" style={{ flex: 2, flexDirection: 'column', gap: 0, padding: '6px 10px', height: 48 }}>
          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>确认入账</span>
          <span style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.1, marginTop: 2 }}>
            {includedItems.length} 笔 · {fmtAmount(total, cc)}
          </span>
        </Button>
      </div>
    </PhoneScreen>
  );
}

function ConfBadge({ v }) {
  const color = v >= 0.9 ? TOKENS.success : v >= 0.7 ? TOKENS.warning : TOKENS.danger;
  const soft  = v >= 0.9 ? TOKENS.successSoft : v >= 0.7 ? TOKENS.warningSoft : TOKENS.dangerSoft;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 999,
      background: soft, color: color,
      fontSize: 10, fontWeight: 600, fontFamily: NUM_FONT,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: 2, background: color }} />
      {(v * 100).toFixed(0)}%
    </div>
  );
}

function ConfRow({ label, conf, warn, children, first, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 10px',
      borderTop: first ? 'none' : `1px solid ${TOKENS.borderSoft}`,
      background: warn ? `${TOKENS.warningSoft}66` : 'transparent',
    }}>
      <div style={{ width: 40, fontSize: 11, color: TOKENS.textSoft, fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>{children}</div>
      <ConfBadge v={conf} />
      <span style={{ color: TOKENS.textDim, fontSize: 12, marginLeft: 4 }}>›</span>
    </div>
  );
}

function ItemConfRow({ it, first, currency = 'JPY' }) {
  const c = catById(it.cat);
  const excluded = !it.include;
  const isAdjust = it.isAdjust;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      borderTop: first ? 'none' : `1px solid ${TOKENS.borderSoft}`,
      background: it.warn ? `${TOKENS.warningSoft}55` : 'transparent',
      opacity: excluded ? 0.4 : 1,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        position: 'relative', flexShrink: 0,
      }}>
        <CatMark cat={c} size={30} />
        <div style={{ fontSize: 9, color: TOKENS.textSoft, fontWeight: 500 }}>{c.name}</div>
        {it.warn && (
          <div style={{
            position: 'absolute', top: -3, right: -5,
            width: 14, height: 14, borderRadius: 7,
            background: TOKENS.warning, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, border: '1.5px solid #fff',
          }}>!</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: TOKENS.ink, fontWeight: 500,
          textDecoration: excluded ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontStyle: isAdjust ? 'italic' : 'normal',
        }}>{it.name}</div>
        <div style={{
          marginTop: 3, display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: TOKENS.textMute,
        }}>
          <ConfBadge v={it.conf} />
          {it.warn && <span style={{ color: TOKENS.warning, fontWeight: 500 }}>建议核对</span>}
          {isAdjust && <span>合并到上一项</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <Amount value={it.price} size={14} weight={600} currency={currency} showCurrency={false} color={it.price < 0 ? TOKENS.success : TOKENS.ink} />
        <div style={{ fontSize: 10, color: TOKENS.textMute, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {excluded ? (<span style={{ color: TOKENS.danger }}>已排除</span>) : (<span>编辑 ›</span>)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5) Transaction List — type / role / category / account filters
// ─────────────────────────────────────────────────────────────
function ScreenList() {
  const byDate = {};
  TX.forEach((t) => { (byDate[t.date] ||= []).push(t); });
  const dates = Object.keys(byDate).sort().reverse();
  const fmtDay = (d) => {
    const m = parseInt(d.slice(5, 7), 10);
    const day = parseInt(d.slice(8, 10), 10);
    const wd = ['周日','周一','周二','周三','周四','周五','周六'][new Date(d).getDay()];
    return { md: `${m}月${day}日`, wd };
  };
  const dayExpense = (d) => byDate[d]
    .filter((t) => t.type === 'expense')
    .reduce((a, b) => a + (b.currency === 'JPY' ? b.amount : 0), 0);

  return (
    <PhoneScreen>
      <AppBar
        title="明细"
        subtitle={`2026 年 5 月 · 共 ${TX.length} 笔`}
        right={(<div style={{ fontSize: 12, color: TOKENS.accent, fontWeight: 600 }}>导出</div>)}
      />

      {/* Search */}
      <div style={{ padding: '0 14px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
          borderRadius: 10,
        }}>
          <span style={{ color: TOKENS.textMute, fontSize: 13 }}>⌕</span>
          <span style={{ flex: 1, fontSize: 13, color: TOKENS.textMute }}>搜索店铺、来源或备注</span>
        </div>

        {/* Type filter row */}
        <div style={{
          display: 'flex', gap: 4, marginTop: 8, padding: 3,
          background: TOKENS.bgSubtle, borderRadius: 8,
        }}>
          {[
            { id: 'all', label: '全部' },
            { id: 'expense', label: '支出', color: TOKENS.text },
            { id: 'income', label: '入账', color: TOKENS.income },
            { id: 'transfer', label: '转账', color: TOKENS.transfer },
          ].map((t) => {
            const on = t.id === 'all';
            return (
              <div key={t.id} style={{
                flex: 1, textAlign: 'center', padding: '5px 0',
                borderRadius: 6, fontSize: 11, fontWeight: 500,
                background: on ? '#fff' : 'transparent',
                color: on ? TOKENS.ink : TOKENS.textSoft,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}>{t.label}</div>
            );
          })}
        </div>

        {/* Other filter chips */}
        <div style={{
          display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto',
          paddingBottom: 2,
        }}>
          <FilterChip label="5 月" active />
          <FilterChip label="全部角色" />
          <FilterChip label="食材" active soft />
          <FilterChip label="餐饮" active soft />
          <FilterChip label="全部账户" />
          <FilterChip label="+ 筛选" />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px 80px' }}>
        {dates.slice(0, 5).map((d) => {
          const { md, wd } = fmtDay(d);
          const dayEx = dayExpense(d);
          return (
            <div key={d} style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '0 4px 6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink }}>{md}</span>
                  <span style={{ fontSize: 11, color: TOKENS.textMute }}>{wd}</span>
                </div>
                {dayEx > 0 && <Amount value={dayEx} size={12} color={TOKENS.textSoft} weight={500} />}
              </div>
              <Card pad={4}>
                {byDate[d].map((tx, i) => (
                  <div key={tx.id} style={{
                    padding: '0 8px',
                    borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.borderSoft}`,
                    background: tx.type === 'transfer' ? `${TOKENS.transferSoft}40` : 'transparent',
                  }}>
                    <TxRow tx={tx} />
                  </div>
                ))}
              </Card>
            </div>
          );
        })}
      </div>
      <BottomNav active="list" />
    </PhoneScreen>
  );
}

function FilterChip({ label, active, soft }) {
  const bg = active ? (soft ? TOKENS.accentSoft : TOKENS.ink) : TOKENS.surface;
  const fg = active ? (soft ? TOKENS.accent : '#fff') : TOKENS.textSoft;
  return (
    <div style={{
      padding: '5px 11px', borderRadius: 999,
      background: bg, color: fg,
      border: active ? 'none' : `1px solid ${TOKENS.border}`,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {label}
      {active && !soft && <span style={{ opacity: 0.7 }}>×</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6) Fixed (recurring) — expense + income mixed
// ─────────────────────────────────────────────────────────────
function ScreenFixed() {
  const active = FIXED.filter((f) => f.enabled);
  const monthlyEx  = active.filter((f) => f.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const monthlyIn  = active.filter((f) => f.type === 'income').reduce((a, b) => a + b.amount, 0);

  return (
    <PhoneScreen>
      <AppBar
        title="固定收支"
        subtitle={`${active.length} 项启用 · 每月 ${ROLES.length > 0 ? '' : ''}`}
        right={(<div style={{
          width: 32, height: 32, borderRadius: 16,
          background: TOKENS.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 300,
        }}>+</div>)}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Summary card — split into 入 / 出 */}
        <Card pad={14} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: TOKENS.textMute, marginBottom: 3 }}>固定流入</div>
              <Amount value={monthlyIn} size={20} weight={600} color={TOKENS.income} sign="+" />
            </div>
            <div style={{ width: 1, background: TOKENS.borderSoft }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: TOKENS.textMute, marginBottom: 3 }}>固定流出</div>
              <Amount value={monthlyEx} size={20} weight={600} color={TOKENS.ink} />
            </div>
          </div>
          <div style={{
            marginTop: 12, paddingTop: 10, borderTop: `1px solid ${TOKENS.borderSoft}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, color: TOKENS.textMute,
          }}>
            <span>净额 <Amount value={monthlyIn - monthlyEx} size={12} weight={600} color={monthlyIn > monthlyEx ? TOKENS.income : TOKENS.danger} sign={monthlyIn > monthlyEx ? '+' : ''} /></span>
            <span>下次生成 <span style={{ color: TOKENS.ink, fontFamily: NUM_FONT, fontWeight: 600 }}>05-20</span></span>
          </div>
        </Card>

        {/* Type tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: 3, marginBottom: 10,
          background: TOKENS.bgSubtle, borderRadius: 8,
        }}>
          {[
            { id: 'all', label: '全部' },
            { id: 'expense', label: '固定支出' },
            { id: 'income', label: '固定入账' },
          ].map((t) => {
            const on = t.id === 'all';
            return (
              <div key={t.id} style={{
                flex: 1, textAlign: 'center', padding: '5px 0',
                borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: on ? '#fff' : 'transparent',
                color: on ? TOKENS.ink : TOKENS.textSoft,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}>{t.label}</div>
            );
          })}
        </div>

        <SectionLabel>所有规则</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FIXED.map((f) => <FixedRow key={f.id} f={f} />)}
        </div>
      </div>
      <BottomNav />
    </PhoneScreen>
  );
}

function FixedRow({ f }) {
  const c = catById(f.cat);
  const r = roleById(f.role);
  const a = acctById(f.acct);
  const isIncome = f.type === 'income';
  return (
    <Card pad={12} style={{ opacity: f.enabled ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CatMark cat={c} size={32} />
          <div style={{
            position: 'absolute', bottom: -3, right: -3,
            width: 14, height: 14, borderRadius: 7,
            background: isIncome ? TOKENS.income : TOKENS.text,
            color: '#fff', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
          }}>{isIncome ? '+' : '−'}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>{f.name}</div>
            <Amount value={f.amount} size={15} weight={600} currency={f.currency} color={isIncome ? TOKENS.income : TOKENS.ink} sign={isIncome ? '+' : ''} />
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6,
            fontSize: 11, color: TOKENS.textSoft,
          }}>
            <TypeBadge type={f.type} />
            <RolePill role={r} />
            <AccountChip acct={a} />
            <span style={{
              padding: '2px 7px', borderRadius: 999,
              background: TOKENS.bgSubtle, color: TOKENS.textSoft,
              fontSize: 10, fontWeight: 500,
            }}>每月 {f.day} 号</span>
          </div>
          <div style={{
            marginTop: 8, paddingTop: 8,
            borderTop: `1px dashed ${TOKENS.borderSoft}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, color: TOKENS.textMute,
          }}>
            <span>
              {f.enabled ? '下次生成 ' : '已暂停 · '}
              <span style={{ color: f.enabled ? TOKENS.ink : TOKENS.textMute, fontFamily: NUM_FONT, fontWeight: 600 }}>
                {f.next}
              </span>
            </span>
            <Toggle on={f.enabled} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 36, height: 20, borderRadius: 10,
      background: on ? TOKENS.success : TOKENS.bgSubtle,
      padding: 2, position: 'relative',
      border: on ? 'none' : `1px solid ${TOKENS.border}`,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 8, background: '#fff',
        transform: on ? 'translateX(16px)' : 'translateX(0)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8) Budget — monthly per-category limit, near/over warnings
// Only counts expenses; income & transfers never touch a budget.
// ─────────────────────────────────────────────────────────────
function ScreenBudget() {
  const enabled = BUDGETS.filter((b) => b.enabled);
  const total = enabled.reduce((a, b) => a + b.limit, 0);
  const used  = enabled.reduce((a, b) => a + b.used, 0);
  const overall = used / total;

  // Sort: over > near > ok
  const status = (b) => {
    const p = b.used / b.limit;
    return p >= 1 ? 0 : p >= b.threshold ? 1 : 2;
  };
  const sorted = [...BUDGETS].sort((a, b) => status(a) - status(b));

  return (
    <PhoneScreen>
      <AppBar
        title="每月预算"
        subtitle="2026 年 5 月 · 只统计支出"
        right={(<div style={{
          width: 32, height: 32, borderRadius: 16,
          background: TOKENS.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 300,
        }}>+</div>)}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Overall card */}
        <Card pad={14} style={{
          marginBottom: 14,
          background: `linear-gradient(155deg, #FFFFFF 0%, ${TOKENS.surfaceAlt} 100%)`,
        }}>
          <div style={{ fontSize: 11, color: TOKENS.textMute, marginBottom: 4 }}>总预算使用</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Amount value={used} size={26} weight={600} color={TOKENS.ink} />
            <span style={{ fontSize: 12, color: TOKENS.textSoft }}>
              / <Amount value={total} size={12} weight={500} color={TOKENS.textSoft} />
            </span>
          </div>
          <div style={{ marginTop: 10, height: 8, background: TOKENS.bgSubtle, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${Math.min(100, overall * 100)}%`, height: '100%',
              background: overall >= 1 ? TOKENS.danger : overall >= 0.85 ? TOKENS.warning : TOKENS.accent,
            }} />
            {/* threshold marker */}
            <div style={{
              position: 'absolute', left: '80%', top: -2, bottom: -2, width: 1,
              background: TOKENS.textDim,
            }} />
          </div>
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TOKENS.textMute }}>
            <span>{(overall * 100).toFixed(0)}% 已用</span>
            <span>剩余 <Amount value={total - used} size={10} color={TOKENS.textSoft} /></span>
          </div>
        </Card>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <SumChip color={TOKENS.danger} bg={TOKENS.dangerSoft} label="超出" count={enabled.filter((b) => b.used / b.limit >= 1).length} />
          <SumChip color={TOKENS.warning} bg={TOKENS.warningSoft} label="临近" count={enabled.filter((b) => { const p = b.used / b.limit; return p >= b.threshold && p < 1; }).length} />
          <SumChip color={TOKENS.success} bg={TOKENS.successSoft} label="健康" count={enabled.filter((b) => b.used / b.limit < b.threshold).length} />
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

function SumChip({ color, bg, label, count }) {
  return (
    <div style={{
      flex: 1, padding: '8px 10px', borderRadius: 10, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: NUM_FONT, fontSize: 16, fontWeight: 700, color: color }}>{count}</span>
    </div>
  );
}

function BudgetRow({ b }) {
  const c = catById(b.cat);
  const pct = b.used / b.limit;
  const over = pct >= 1;
  const near = !over && pct >= b.threshold;
  const accent = over ? TOKENS.danger : near ? TOKENS.warning : TOKENS.success;
  const accentSoft = over ? TOKENS.dangerSoft : near ? TOKENS.warningSoft : TOKENS.successSoft;
  const roleName = b.role === 'all' ? '全部角色' : roleById(b.role).name;

  return (
    <Card pad={12} style={{ opacity: b.enabled ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <CatMark cat={c} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14, color: TOKENS.ink, fontWeight: 600 }}>
              {c.name}
              <span style={{ fontSize: 10, color: TOKENS.textMute, marginLeft: 6, fontWeight: 400 }}>· {roleName}</span>
            </span>
            <Amount value={b.limit} size={13} weight={600} color={TOKENS.textSoft} />
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: TOKENS.textMute }}>
            已用 <Amount value={b.used} size={11} weight={600} color={accent} sign={over ? '!' : ''} />
            {' · '}剩余 <Amount value={b.limit - b.used} size={11} color={TOKENS.textSoft} sign={b.limit - b.used < 0 ? '-' : ''} />
          </div>
        </div>
        {(over || near) && (
          <div style={{
            padding: '3px 8px', borderRadius: 999,
            background: accentSoft, color: accent,
            fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
          }}>{over ? '超出' : '临近'}</div>
        )}
      </div>
      <div style={{ height: 6, background: TOKENS.bgSubtle, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: `${Math.min(100, pct * 100)}%`, height: '100%',
          background: accent, borderRadius: 3,
        }} />
        {/* threshold marker */}
        {!over && (
          <div style={{
            position: 'absolute', left: `${b.threshold * 100}%`, top: -1, bottom: -1, width: 1.5,
            background: TOKENS.textDim, opacity: 0.7,
          }} />
        )}
      </div>
      <div style={{
        marginTop: 6, display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: TOKENS.textMute, fontFamily: NUM_FONT,
      }}>
        <span style={{ color: accent, fontWeight: 600 }}>{Math.round(pct * 100)}%</span>
        <span>提醒阈值 {Math.round(b.threshold * 100)}%</span>
      </div>
    </Card>
  );
}

Object.assign(window, {
  ScreenAIConfirm, ScreenList, ScreenFixed, ScreenBudget,
});
