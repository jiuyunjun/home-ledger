// components.jsx — shared UI primitives for the home-ledger design
// Style approach: inline styles using TOKENS from data.jsx so the canvas
// can host many isolated mobile screens without CSS leaking between them.

const CN_FONT = '"Noto Sans SC", "Noto Sans JP", -apple-system, system-ui, "PingFang SC", sans-serif';
const NUM_FONT = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// Format JPY as ¥12,345 (legacy helper — prefer fmtAmount(value, currency))
function fmtY(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('en-US');
}

// Transaction-type metadata: color, label, sign prefix, light tint
const TX_TYPES = {
  expense:  { label: '支出', short: '支', color: TOKENS.text,     soft: TOKENS.bgSubtle,    sign: ''  },
  income:   { label: '入账', short: '入', color: TOKENS.income,   soft: TOKENS.incomeSoft,  sign: '+' },
  transfer: { label: '转账', short: '转', color: TOKENS.transfer, soft: TOKENS.transferSoft,sign: '⇄' },
};

// ─────────────────────────────────────────────────────────────
// Mobile screen shell — wraps a 390-wide column with paper bg.
// ─────────────────────────────────────────────────────────────
function PhoneScreen({ children, bg = TOKENS.bg }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      fontFamily: CN_FONT, color: TOKENS.text,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      WebkitFontSmoothing: 'antialiased',
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top App Bar — title + optional left/right slots
// ─────────────────────────────────────────────────────────────
function AppBar({ title, left, right, subtitle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '14px 16px 10px', minHeight: 52,
    }}>
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: TOKENS.ink, letterSpacing: 0.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: TOKENS.textMute, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Role pill — small colored chip with role name
// ─────────────────────────────────────────────────────────────
function RolePill({ role, size = 'sm', filled = true }) {
  const r = typeof role === 'string' ? roleById(role) : role;
  const styleSm = { padding: '2px 8px', fontSize: 11, height: 20 };
  const styleMd = { padding: '4px 10px', fontSize: 12, height: 24 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      borderRadius: 999, fontWeight: 500, lineHeight: 1,
      background: filled ? r.soft : 'transparent',
      color: r.color,
      border: filled ? 'none' : `1px solid ${r.color}40`,
      ...(size === 'md' ? styleMd : styleSm),
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: r.color }} />
      {r.name}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Category mark — colored square with single character
// ─────────────────────────────────────────────────────────────
function CatMark({ cat, size = 32 }) {
  const c = typeof cat === 'string' ? catById(cat) : cat;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: c.tint, color: TOKENS.ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, letterSpacing: 0,
      flexShrink: 0, fontFamily: CN_FONT,
    }}>{c.mark}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Amount text — tabular-nums monospace, currency-aware
// CNY gets a subtle "CNY" suffix badge so it can't be confused with JPY ¥.
// ─────────────────────────────────────────────────────────────
function Amount({ value, size = 14, weight = 500, color, currency = 'JPY', sign = '', plain = false, showCurrency = true }) {
  const c = CURRENCIES[currency] || CURRENCIES.JPY;
  const abs = Math.abs(value);
  const num = c.decimals === 0
    ? Math.round(abs).toLocaleString('en-US')
    : abs.toLocaleString(c.locale, { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  const realSign = sign || (value < 0 ? '-' : '');
  return (
    <span style={{
      fontFamily: NUM_FONT, fontVariantNumeric: 'tabular-nums',
      fontSize: size, fontWeight: weight, color: color || TOKENS.ink,
      letterSpacing: -0.2, whiteSpace: 'nowrap',
    }}>
      {realSign && <span>{realSign}</span>}
      {plain ? num : (
        <>
          <span style={{ opacity: 0.6, marginRight: 1, fontSize: size * 0.78 }}>{c.symbol}</span>
          {num}
        </>
      )}
      {showCurrency && currency !== 'JPY' && (
        <span style={{
          fontSize: Math.max(8, size * 0.5), marginLeft: 4,
          color: TOKENS.textMute, fontWeight: 600, letterSpacing: 0.3,
          fontFamily: NUM_FONT,
        }}>{c.suffix || currency}</span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Transaction type badge (small)
// ─────────────────────────────────────────────────────────────
function TypeBadge({ type, size = 'sm' }) {
  const t = TX_TYPES[type] || TX_TYPES.expense;
  const sty = size === 'md'
    ? { padding: '3px 9px', fontSize: 11, height: 22 }
    : { padding: '2px 6px', fontSize: 10, height: 18 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      borderRadius: 4, fontWeight: 600, lineHeight: 1,
      background: t.soft, color: t.color, ...sty,
    }}>{t.label}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// Account chip — name + tail + kind dot
// ─────────────────────────────────────────────────────────────
function AccountChip({ acct, size = 'sm' }) {
  const a = typeof acct === 'string' ? acctById(acct) : acct;
  const k = ACCT_KIND[a.kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'md' ? '4px 9px' : '2px 7px',
      borderRadius: 999, background: TOKENS.bgSubtle,
      fontSize: size === 'md' ? 12 : 10, color: TOKENS.textSoft,
      fontWeight: 500, lineHeight: 1,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 1, background: k.color }} />
      {a.name}
      {a.tail && <span style={{ opacity: 0.55, fontFamily: NUM_FONT, fontSize: size === 'md' ? 10 : 9 }}>·{a.tail}</span>}
      {a.currency !== 'JPY' && (
        <span style={{ fontFamily: NUM_FONT, fontSize: 9, opacity: 0.7, fontWeight: 600 }}>
          {a.currency}
        </span>
      )}
    </span>
  );
}
function Card({ children, style = {}, pad = 14 }) {
  return (
    <div style={{
      background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
      borderRadius: 14, padding: pad, ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section header (small)
// ─────────────────────────────────────────────────────────────
function SectionLabel({ children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '0 4px', marginBottom: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: TOKENS.textSoft, letterSpacing: 0.3 }}>{children}</div>
      {right && <div style={{ fontSize: 12, color: TOKENS.textMute }}>{right}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Button — primary / secondary / ghost / danger
// ─────────────────────────────────────────────────────────────
function Button({ children, variant = 'primary', size = 'md', icon, full, style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, fontFamily: CN_FONT, fontWeight: 500, borderRadius: 10,
    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
    width: full ? '100%' : undefined,
  };
  const variants = {
    primary:   { background: TOKENS.accent, color: '#fff' },
    secondary: { background: TOKENS.bgSubtle, color: TOKENS.ink, border: `1px solid ${TOKENS.border}` },
    ghost:     { background: 'transparent', color: TOKENS.textSoft },
    danger:    { background: TOKENS.dangerSoft, color: TOKENS.danger },
    success:   { background: TOKENS.success, color: '#fff' },
  };
  const sizes = {
    sm: { padding: '6px 10px', fontSize: 12, height: 28 },
    md: { padding: '8px 14px', fontSize: 13, height: 36 },
    lg: { padding: '12px 18px', fontSize: 15, height: 48, borderRadius: 12 },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...sizes[size], ...style }}>
      {icon}{children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom navigation bar
// ─────────────────────────────────────────────────────────────
function BottomNav({ active = 'home' }) {
  const items = [
    { id: 'home',   label: '首页',   icon: 'H' },
    { id: 'list',   label: '明细',   icon: 'L' },
    { id: 'add',    label: '',     icon: '+' , primary: true },
    { id: 'budget', label: '预算',   icon: 'B' },
    { id: 'me',     label: '设置',   icon: 'S' },
  ];
  return (
    <div style={{
      borderTop: `1px solid ${TOKENS.borderSoft}`,
      background: 'rgba(251, 248, 242, 0.92)',
      backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 8px 14px',
    }}>
      {items.map((it) => {
        if (it.primary) {
          return (
            <div key={it.id} style={{
              width: 48, height: 48, borderRadius: 24, background: TOKENS.accent,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 300, marginTop: -16,
              boxShadow: '0 4px 12px rgba(61, 90, 108, 0.3)',
            }}>{it.icon}</div>
          );
        }
        const on = active === it.id;
        return (
          <div key={it.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            color: on ? TOKENS.accent : TOKENS.textMute,
            width: 56,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: on ? TOKENS.accentSoft : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
            }}>{it.icon}</div>
            <div style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Role switcher — full bar at top with 3 roles
// ─────────────────────────────────────────────────────────────
function RoleSwitcher({ active = 'me' }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 3,
      background: TOKENS.bgSubtle, borderRadius: 10,
      border: `1px solid ${TOKENS.borderSoft}`,
    }}>
      {ROLES.map((r) => {
        const on = r.id === active;
        return (
          <div key={r.id} style={{
            flex: 1, textAlign: 'center', padding: '6px 0',
            borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: on ? '#fff' : 'transparent',
            color: on ? r.color : TOKENS.textSoft,
            boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 3, background: r.color,
              opacity: on ? 1 : 0.5,
            }} />
            {r.name}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Transaction row — handles expense / income / transfer
// ─────────────────────────────────────────────────────────────
function TxRow({ tx, showDate = false, dense = false }) {
  // Transfer has a totally different shape (no role/category/single account)
  if (tx.type === 'transfer') {
    const from = acctById(tx.fromAcct);
    const to   = acctById(tx.toAcct);
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: dense ? '8px 4px' : '10px 4px',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: TOKENS.transferSoft, color: TOKENS.transfer,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 600, flexShrink: 0,
        }}>⇄</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: TOKENS.ink,
            display: 'flex', alignItems: 'center', gap: 5,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            <span>{from.name}</span>
            <span style={{ color: TOKENS.textMute, fontSize: 11 }}>→</span>
            <span>{to.name}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
            fontSize: 11, color: TOKENS.textMute,
          }}>
            <TypeBadge type="transfer" />
            {tx.rate && <span>汇率 {tx.rate}</span>}
            {showDate && (<><span style={{ color: TOKENS.textDim }}>·</span><span>{tx.date.slice(5)}</span></>)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <Amount value={tx.fromAmount} size={13} weight={500} color={TOKENS.textSoft} currency={from.currency} showCurrency={from.currency !== 'JPY'} />
          {from.currency !== to.currency && (
            <Amount value={tx.toAmount} size={11} weight={500} color={TOKENS.textMute} currency={to.currency} />
          )}
        </div>
      </div>
    );
  }

  // expense / income
  const c = catById(tx.cat);
  const r = roleById(tx.role);
  const a = acctById(tx.acct);
  const isIncome = tx.type === 'income';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: dense ? '8px 4px' : '10px 4px',
    }}>
      <CatMark cat={c} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: TOKENS.ink,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{tx.title}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
          fontSize: 11, color: TOKENS.textMute,
        }}>
          {isIncome && <TypeBadge type="income" />}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: r.color }} />
            {r.name}
          </span>
          <span style={{ color: TOKENS.textDim }}>·</span>
          <span>{a.name}</span>
          {showDate && (<><span style={{ color: TOKENS.textDim }}>·</span><span>{tx.date.slice(5)}</span></>)}
        </div>
      </div>
      <Amount
        value={tx.amount}
        size={14}
        weight={600}
        currency={tx.currency || 'JPY'}
        color={isIncome ? TOKENS.income : TOKENS.ink}
        sign={isIncome ? '+' : ''}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Receipt placeholder (striped image stand-in)
// ─────────────────────────────────────────────────────────────
function ReceiptThumb({ label = '小票', w = 96, h = 128, tilt = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 8,
      background: `repeating-linear-gradient(135deg, #F4EEDF 0 6px, #ECE3CE 6px 12px)`,
      border: `1px solid ${TOKENS.border}`,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      transform: tilt ? `rotate(${tilt}deg)` : undefined,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 8, right: 8,
        height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 1,
      }} />
      <div style={{
        position: 'absolute', top: 20, left: 8, right: 20,
        height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 1,
      }} />
      <div style={{
        position: 'absolute', top: 28, left: 8, right: 30,
        height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 1,
      }} />
      <div style={{
        fontFamily: NUM_FONT, fontSize: 9, color: TOKENS.textMute,
        padding: '4px 0', background: 'rgba(255,255,255,0.6)',
        width: '100%', textAlign: 'center',
      }}>{label}</div>
    </div>
  );
}

Object.assign(window, {
  CN_FONT, NUM_FONT, fmtY, TX_TYPES,
  PhoneScreen, AppBar, RolePill, CatMark, Amount, TypeBadge, AccountChip,
  Card, SectionLabel, Button, BottomNav, RoleSwitcher, TxRow, ReceiptThumb,
});
