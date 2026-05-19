// data.jsx — Design system tokens + mock data
// All values are illustrative; localized for a Japanese-life context.
// Currencies: JPY (integer, default) + CNY (2 decimals, RMB account).
// Transaction types: expense (支出) · income (入账) · transfer (账户转换).

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────
const TOKENS = {
  // surfaces
  bg:        '#FBF8F2',   // warm paper
  bgSubtle:  '#F4F0E7',
  surface:   '#FFFFFF',
  surfaceAlt:'#FAF6EE',
  border:    '#EAE2D3',
  borderSoft:'#F1EADC',
  divider:   '#EFE9DC',

  // text
  ink:       '#1F1B14',
  text:      '#2C261D',
  textSoft:  '#6B6358',
  textMute:  '#A09684',
  textDim:   '#C2B9A6',

  // semantic
  accent:    '#3D5A6C',   // calm ink-blue, primary CTA
  accentSoft:'#E4ECF1',
  income:    '#5C8C6C',   // calm green for 入账
  incomeSoft:'#E3EDDE',
  transfer:  '#7E6C8A',   // muted plum for 转账
  transferSoft:'#EBE3EF',
  success:   '#6E8B5A',   // matcha (used for confirm-to-ledger)
  successSoft:'#E8EEDD',
  warning:   '#C68A4E',   // persimmon (low confidence, near-budget)
  warningSoft:'#F6E9D6',
  danger:    '#B05442',   // rust (reject / delete / over-budget)
  dangerSoft:'#F4DED7',

  // role colors — calm, paired with soft tint backgrounds
  roleMe:        '#4A6FA5',
  roleMeSoft:    '#DDE6F0',
  roleHer:       '#B36F7E',
  roleHerSoft:   '#F2E0E3',
  roleFamily:    '#7A8B5E',
  roleFamilySoft:'#E6EBDC',
};

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────
const ROLES = [
  { id: 'me',     name: '我',        short: '我', color: TOKENS.roleMe,     soft: TOKENS.roleMeSoft     },
  { id: 'her',    name: '女朋友',     short: '她', color: TOKENS.roleHer,    soft: TOKENS.roleHerSoft    },
  { id: 'family', name: '家庭共通',   short: '共', color: TOKENS.roleFamily, soft: TOKENS.roleFamilySoft },
];
const roleById = (id) => ROLES.find((r) => r.id === id) || ROLES[0];

// ─────────────────────────────────────────────────────────────
// Currencies
// ─────────────────────────────────────────────────────────────
const CURRENCIES = {
  JPY: { code: 'JPY', symbol: '¥',  decimals: 0, locale: 'en-US' },
  CNY: { code: 'CNY', symbol: '¥', decimals: 2, locale: 'zh-CN', suffix: 'CNY' },
};

// Format an amount with its currency
function fmtAmount(value, currency = 'JPY') {
  const c = CURRENCIES[currency] || CURRENCIES.JPY;
  if (c.decimals === 0) {
    return c.symbol + Math.round(value).toLocaleString('en-US');
  }
  return c.symbol + value.toLocaleString(c.locale, {
    minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals,
  });
}

// ─────────────────────────────────────────────────────────────
// Categories — split by transaction type
// ─────────────────────────────────────────────────────────────
const EXPENSE_CATS = [
  { id: 'food',      name: '餐饮',   mark: '食', tint: '#F0DDC2' },
  { id: 'groceries', name: '食材',   mark: '菜', tint: '#DCE7CB' },
  { id: 'transport', name: '交通',   mark: '交', tint: '#CFDDE9' },
  { id: 'utility',   name: '水电网', mark: '电', tint: '#E3D9EA' },
  { id: 'rent',      name: '房租',   mark: '住', tint: '#E8D7CC' },
  { id: 'daily',     name: '日用品', mark: '日', tint: '#E6E1CF' },
  { id: 'fun',       name: '娱乐',   mark: '娯', tint: '#F1D5D0' },
  { id: 'cloth',     name: '服饰',   mark: '服', tint: '#DDDAEA' },
  { id: 'medical',   name: '医疗',   mark: '医', tint: '#D9E6E3' },
  { id: 'travel',    name: '旅行',   mark: '旅', tint: '#E6DCC1' },
  { id: 'other',     name: '其他',   mark: '他', tint: '#E5E0D6' },
];
const INCOME_CATS = [
  { id: 'salary',    name: '工资',   mark: '給', tint: '#CFE0D0' },
  { id: 'bonus',     name: '奖金',   mark: '賞', tint: '#E9DAB4' },
  { id: 'refund',    name: '退款',   mark: '返', tint: '#D4DDE6' },
  { id: 'reimburse', name: '报销',   mark: '報', tint: '#DDD6E5' },
  { id: 'interest',  name: '利息',   mark: '利', tint: '#E6DBC8' },
  { id: 'gift',      name: '礼金',   mark: '贈', tint: '#EDD8D6' },
  { id: 'other_in',  name: '其他',   mark: '他', tint: '#E5E0D6' },
];
const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS];
const catById = (id) => ALL_CATS.find((c) => c.id === id) || EXPENSE_CATS[EXPENSE_CATS.length - 1];

// ─────────────────────────────────────────────────────────────
// Accounts (replaces "payments" — now includes bank + RMB accounts)
// kind: cash | wallet | card | bank
// balance is mock; cards typically don't carry a balance, they have a debt cycle
// ─────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { id: 'cash_jpy',  name: '現金',          kind: 'cash',   currency: 'JPY', balance: 28500 },
  { id: 'paypay',    name: 'PayPay',        kind: 'wallet', currency: 'JPY', balance: 12340 },
  { id: 'cc_rakuten',name: '楽天カード',     kind: 'card',   currency: 'JPY', tail: '4421', debt: 42800 },
  { id: 'cc_smbc',   name: '三井住友 VISA',  kind: 'card',   currency: 'JPY', tail: '7702', debt: 128400 },
  { id: 'cc_amex',   name: 'AMEX Gold',     kind: 'card',   currency: 'JPY', tail: '1009', debt: 18900 },
  { id: 'bank_mufg', name: '三菱UFJ 普通',   kind: 'bank',   currency: 'JPY', balance: 1284500 },
  { id: 'bank_smbc', name: '三井住友 普通',  kind: 'bank',   currency: 'JPY', balance: 320000 },
  { id: 'bank_cn',   name: '招商银行储蓄',   kind: 'bank',   currency: 'CNY', balance: 18420.55 },
  { id: 'alipay',    name: '支付宝',         kind: 'wallet', currency: 'CNY', balance: 1234.50 },
];
const acctById = (id) => ACCOUNTS.find((a) => a.id === id) || ACCOUNTS[0];

// Visual hint per account kind
const ACCT_KIND = {
  cash:   { label: '現',  color: TOKENS.success },
  wallet: { label: 'PAY', color: TOKENS.warning },
  card:   { label: 'VISA',color: TOKENS.accent  },
  bank:   { label: '銀',  color: TOKENS.transfer},
};

// ─────────────────────────────────────────────────────────────
// Mock transactions — all three types
// type: 'expense' | 'income' | 'transfer'
// transfer rows have fromAcct, toAcct, fromAmount, toAmount, rate?
// ─────────────────────────────────────────────────────────────
const TX = [
  { id: 't01', date: '2026-05-18', type: 'expense', role: 'me',     amount:   780, currency: 'JPY', cat: 'food',      acct: 'paypay',     title: 'すき家 牛丼',     note: '午饭' },
  { id: 't02', date: '2026-05-18', type: 'expense', role: 'family', amount:  3240, currency: 'JPY', cat: 'groceries', acct: 'cc_rakuten', title: 'OK ストア',       note: '本周食材' },
  { id: 't03', date: '2026-05-18', type: 'expense', role: 'her',    amount:  1680, currency: 'JPY', cat: 'fun',       acct: 'paypay',     title: 'スターバックス',  note: '' },
  { id: 't04', date: '2026-05-18', type: 'income',  role: 'her',    amount:  4500, currency: 'JPY', cat: 'reimburse', acct: 'bank_mufg',  title: '公司报销 4 月差旅', note: '' },
  { id: 't05', date: '2026-05-17', type: 'transfer', fromAcct: 'bank_mufg', toAcct: 'bank_cn', fromAmount: 100000, toAmount: 4820.55, currency: 'JPY', rate: 0.04821, note: '汇款回国' },
  { id: 't06', date: '2026-05-17', type: 'expense', role: 'me',     amount:   320, currency: 'JPY', cat: 'transport', acct: 'paypay',     title: 'JR 中央線',       note: '' },
  { id: 't07', date: '2026-05-17', type: 'expense', role: 'family', amount: 12800, currency: 'JPY', cat: 'utility',   acct: 'cc_smbc',    title: '東京電力',        note: '5月電気代' },
  { id: 't08', date: '2026-05-16', type: 'expense', role: 'her',    amount:  4980, currency: 'JPY', cat: 'cloth',     acct: 'cc_rakuten', title: 'ユニクロ',        note: '夏装' },
  { id: 't09', date: '2026-05-16', type: 'expense', role: 'me',     amount:    65.80, currency: 'CNY', cat: 'food',  acct: 'alipay',    title: '回国吃 兰州拉面',  note: '出差' },
  { id: 't10', date: '2026-05-15', type: 'income',  role: 'me',     amount:285000, currency: 'JPY', cat: 'salary',    acct: 'bank_mufg',  title: '5月 給与',        note: '' },
  { id: 't11', date: '2026-05-15', type: 'expense', role: 'family', amount: 95000, currency: 'JPY', cat: 'rent',      acct: 'cc_smbc',    title: '5月家賃',         note: '自动扣款' },
  { id: 't12', date: '2026-05-14', type: 'transfer', fromAcct: 'bank_mufg', toAcct: 'cc_smbc', fromAmount: 128400, toAmount: 128400, currency: 'JPY', note: '5月 信用卡还款' },
  { id: 't13', date: '2026-05-14', type: 'expense', role: 'me',     amount:   620, currency: 'JPY', cat: 'daily',     acct: 'paypay',     title: 'マツモトキヨシ',  note: '牙膏 洗发水' },
  { id: 't14', date: '2026-05-13', type: 'income',  role: 'family', amount:   800, currency: 'JPY', cat: 'refund',    acct: 'paypay',     title: 'Amazon 退款',      note: '' },
];

// ─────────────────────────────────────────────────────────────
// Aggregations for the dashboard (mock pre-computed)
// ─────────────────────────────────────────────────────────────
const monthTotals = {
  // expense
  expense: 142670,
  exMe:     28950,
  exHer:    22380,
  exFamily: 91340,
  // income
  income:  290300,
  incMe:   285000,
  incHer:    4500,
  incFamily:   800,
  // budget
  budget:  220000,
};

const catSummary = [
  { cat: 'rent',      amount: 95000 },
  { cat: 'groceries', amount: 18420 },
  { cat: 'utility',   amount: 12800 },
  { cat: 'fun',       amount: 10080 },
  { cat: 'food',      amount:  9650 },
  { cat: 'cloth',     amount:  4980 },
  { cat: 'transport', amount:  2940 },
  { cat: 'daily',     amount:  1620 },
];

// ─────────────────────────────────────────────────────────────
// Monthly budgets — only over expenses, never income/transfer
// ─────────────────────────────────────────────────────────────
const BUDGETS = [
  { id: 'b1', cat: 'food',      role: 'all',    limit: 15000, used:  9650,  threshold: 0.8, currency: 'JPY', enabled: true },
  { id: 'b2', cat: 'groceries', role: 'family', limit: 25000, used: 18420,  threshold: 0.8, currency: 'JPY', enabled: true },
  { id: 'b3', cat: 'fun',       role: 'all',    limit: 10000, used: 10080,  threshold: 0.8, currency: 'JPY', enabled: true }, // over
  { id: 'b4', cat: 'cloth',     role: 'her',    limit:  8000, used:  4980,  threshold: 0.8, currency: 'JPY', enabled: true },
  { id: 'b5', cat: 'transport', role: 'me',     limit:  4000, used:  2940,  threshold: 0.85, currency: 'JPY', enabled: true },
  { id: 'b6', cat: 'daily',     role: 'family', limit:  3000, used:  1620,  threshold: 0.8, currency: 'JPY', enabled: true },
  { id: 'b7', cat: 'utility',   role: 'family', limit: 14000, used: 12800,  threshold: 0.85, currency: 'JPY', enabled: true }, // near
  { id: 'b8', cat: 'travel',    role: 'all',    limit: 30000, used:     0,  threshold: 0.8, currency: 'JPY', enabled: false },
];

// ─────────────────────────────────────────────────────────────
// Fixed items — now include both expense AND income
// ─────────────────────────────────────────────────────────────
const FIXED = [
  { id: 'f1', type: 'expense', name: '房租',          amount: 95000, currency: 'JPY', role: 'family', cat: 'rent',    acct: 'cc_smbc',    day: 27, start: '2024-04-01', enabled: true,  next: '2026-05-27' },
  { id: 'f2', type: 'income',  name: '5月 給与',      amount:285000, currency: 'JPY', role: 'me',     cat: 'salary',  acct: 'bank_mufg',  day: 25, start: '2023-08-25', enabled: true,  next: '2026-05-25' },
  { id: 'f3', type: 'expense', name: '東京電力',      amount: 11800, currency: 'JPY', role: 'family', cat: 'utility', acct: 'cc_smbc',    day: 28, start: '2024-04-01', enabled: true,  next: '2026-05-28' },
  { id: 'f4', type: 'expense', name: '楽天モバイル',  amount:  2980, currency: 'JPY', role: 'me',     cat: 'utility', acct: 'cc_rakuten', day: 15, start: '2024-08-15', enabled: true,  next: '2026-06-15' },
  { id: 'f5', type: 'expense', name: 'Netflix',       amount:  1590, currency: 'JPY', role: 'family', cat: 'fun',     acct: 'cc_amex',    day:  3, start: '2025-02-03', enabled: true,  next: '2026-06-03' },
  { id: 'f6', type: 'income',  name: '她 アルバイト', amount: 78000, currency: 'JPY', role: 'her',    cat: 'salary',  acct: 'bank_mufg',  day: 20, start: '2025-01-20', enabled: true,  next: '2026-05-20' },
  { id: 'f7', type: 'expense', name: '健康保険',      amount: 18500, currency: 'JPY', role: 'her',    cat: 'medical', acct: 'cc_rakuten', day: 10, start: '2025-04-10', enabled: false, next: '—' },
];

// ─────────────────────────────────────────────────────────────
// AI receipt drafts — per-item categorization + user hint
// ─────────────────────────────────────────────────────────────
const RECEIPT_DRAFTS = [
  {
    id: 'd1',
    image: 'receipt-1',
    status: 'needs-confirm',
    confidence: 0.92,
    userHint: '本周食材采购，统一算共通账',   // 用户上传时输入的提示
    fields: {
      type:     { value: 'expense',    conf: 0.99, warn: false },
      date:     { value: '2026-05-18', conf: 0.98, warn: false },
      currency: { value: 'JPY',        conf: 0.99, warn: false },
      cat:      { value: 'groceries',  conf: 0.81, warn: false },
      acct:     { value: 'cc_rakuten', conf: 0.62, warn: true  },
      role:     { value: 'family',     conf: 0.88, warn: false }, // user hint helped
      title:    { value: 'OK ストア 西新宿店', conf: 0.94, warn: false },
      note:     { value: '本周食材',    conf: 0.85, warn: false },
    },
    items: [
      { id: 'i1', name: '玉ねぎ 3個',    price:  198, cat: 'groceries', conf: 0.95, include: true },
      { id: 'i2', name: '鶏もも肉 500g', price:  580, cat: 'groceries', conf: 0.97, include: true },
      { id: 'i3', name: '牛乳 1L',       price:  268, cat: 'groceries', conf: 0.96, include: true },
      { id: 'i4', name: '卵 10個',       price:  248, cat: 'groceries', conf: 0.94, include: true },
      { id: 'i5', name: '食パン',        price:  158, cat: 'groceries', conf: 0.92, include: true },
      { id: 'i6', name: 'トマト 4個',    price:  398, cat: 'groceries', conf: 0.93, include: true },
      { id: 'i7', name: 'お米 5kg',      price: 1890, cat: 'groceries', conf: 0.91, include: true },
      { id: 'i8', name: '台所用洗剤',    price:  298, cat: 'daily',     conf: 0.74, include: true, warn: true },
      { id: 'i9', name: 'コカ・コーラ 1.5L', price: 198, cat: 'groceries', conf: 0.58, include: true, warn: true },
      { id: 'i10',name: '— 値引 —',      price: -500, cat: 'groceries', conf: 0.99, include: true, isAdjust: true },
    ],
  },
];

// Upload queue
const UPLOADS = [
  { id: 'u1', name: 'IMG_4421.jpg', size: '2.4 MB', status: 'needs-confirm', progress: 100, hint: '本周食材' },
  { id: 'u2', name: 'IMG_4422.jpg', size: '1.8 MB', status: 'recognizing',   progress:  64, hint: '公司报销' },
  { id: 'u3', name: 'IMG_4423.jpg', size: '3.1 MB', status: 'queued',        progress:   0, hint: '' },
  { id: 'u4', name: 'IMG_4419.jpg', size: '2.1 MB', status: 'failed',        progress:   0, hint: '' },
];

Object.assign(window, {
  TOKENS, ROLES, roleById,
  CURRENCIES, fmtAmount,
  EXPENSE_CATS, INCOME_CATS, ALL_CATS, catById,
  ACCOUNTS, acctById, ACCT_KIND,
  TX, monthTotals, catSummary, BUDGETS, FIXED, RECEIPT_DRAFTS, UPLOADS,
  // Back-compat aliases (older screens still reference these names)
  CATEGORIES: EXPENSE_CATS, PAYMENTS: ACCOUNTS, payById: acctById,
});
