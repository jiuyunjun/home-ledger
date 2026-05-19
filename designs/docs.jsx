// docs.jsx — Design system + component inventory artboards (non-mobile)

function DocCard({ children }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: TOKENS.surface,
      fontFamily: CN_FONT, color: TOKENS.text,
      padding: 24, overflow: 'auto', boxSizing: 'border-box',
      WebkitFontSmoothing: 'antialiased',
    }}>{children}</div>
  );
}

function DocTitle({ kicker, title, desc }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {kicker && (
        <div style={{ fontSize: 11, color: TOKENS.accent, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>{kicker}</div>
      )}
      <div style={{ fontSize: 22, fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.3, marginBottom: desc ? 6 : 0 }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: TOKENS.textSoft, lineHeight: 1.55 }}>{desc}</div>}
    </div>
  );
}

function DocH3({ children, n }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      marginTop: 16, marginBottom: 8,
      borderTop: `1px solid ${TOKENS.borderSoft}`, paddingTop: 12,
    }}>
      {n && <span style={{ fontSize: 10, fontFamily: NUM_FONT, color: TOKENS.textDim }}>{n}</span>}
      <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink, letterSpacing: 0.2 }}>{children}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// A) Project intro & approach
// ─────────────────────────────────────────────────────────────
function DocIntro() {
  return (
    <DocCard>
      <DocTitle
        kicker="家计簿 · Home Ledger"
        title="给两个人用的轻量记账工具"
        desc="Mobile-first 网页 MVP，将来移植 Android。三角色 · 多账户 · 双币种（JPY / CNY）· 三种交易（支出 / 入账 / 转账）· AI 小票识别需用户确认才入账。"
      />

      <DocH3>八个核心页面</DocH3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['1 · Dashboard',  '本月收支双栏 hero · 角色 / 账户 / 预算 / 最近交易'],
          ['2 · 手动记账',    '三模式分段：支出 / 入账 / 账户转换 + 货种切换'],
          ['3 · 小票上传',    '拖拽 / 拍照 / 多张并行 + 自然语言 AI 提示框'],
          ['4 · AI 确认',     '显示用户提示 · 类型/币种为字段 · 逐项分类 · N 笔'],
          ['5 · 明细',        '类型分段 + 多维筛选 + 转账行样式'],
          ['6 · 每月预算',    '只统计支出 · 临近阈值黄、超出红 · 阈值标线'],
          ['7 · 固定收支',    '固定支出 + 固定入账（工资）混排 · 净额'],
          ['8 · 设置',        '角色 / 账户（CNY）/ 支出+入账分类 / UTF-8 导出'],
        ].map(([t, d]) => (
          <div key={t} style={{
            padding: 10, borderRadius: 8, background: TOKENS.surfaceAlt,
            border: `1px solid ${TOKENS.borderSoft}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: TOKENS.ink, marginBottom: 2 }}>{t}</div>
            <div style={{ fontSize: 11, color: TOKENS.textSoft, lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>

      <DocH3>核心约束</DocH3>
      <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: TOKENS.text, lineHeight: 1.7 }}>
        <li>AI 识别结果只生成 <strong>draft</strong>；用户确认后才正式入账。</li>
        <li>入账不是负数支出；转账不是支出。三类分别走自己的字段集 / 颜色 / 徽标。</li>
        <li>JPY 整数日元；CNY 显示到分，内部用整数分避免浮点。</li>
        <li>每月预算只统计正式确认的支出。</li>
        <li>浏览器记忆角色（<code style={{ fontFamily: NUM_FONT, fontSize: 11, background: TOKENS.bgSubtle, padding: '1px 5px', borderRadius: 3 }}>localStorage.activeRole</code>），后端仍校验权限。</li>
        <li>导出 / 导入文件统一 UTF-8（CSV 默认带 BOM 以适配 Excel）。</li>
        <li>不做企业级财务系统，只服务两人的家庭。</li>
      </ul>
    </DocCard>
  );
}

// ─────────────────────────────────────────────────────────────
// B) Tokens
// ─────────────────────────────────────────────────────────────
function DocTokens() {
  const Swatch = ({ name, hex, on = TOKENS.ink, label }) => (
    <div style={{
      background: hex, color: on, padding: 10, borderRadius: 8,
      border: hex === TOKENS.surface ? `1px solid ${TOKENS.border}` : 'none',
      minHeight: 64, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600 }}>{name}</div>
      <div style={{ fontFamily: NUM_FONT, fontSize: 10, opacity: 0.8 }}>{hex}{label && ` · ${label}`}</div>
    </div>
  );
  return (
    <DocCard>
      <DocTitle kicker="设计令牌" title="色彩 / 字体 / 形状" desc="温暖中性 + 三角色色 + 五个语义色（支出/入账/转账/警告/危险）" />

      <DocH3 n="01">表面 & 文本</DocH3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Swatch name="bg" hex={TOKENS.bg} />
        <Swatch name="bgSubtle" hex={TOKENS.bgSubtle} />
        <Swatch name="surface" hex={TOKENS.surface} />
        <Swatch name="border" hex={TOKENS.border} />
        <Swatch name="ink" hex={TOKENS.ink} on="#fff" />
        <Swatch name="text" hex={TOKENS.text} on="#fff" />
        <Swatch name="textSoft" hex={TOKENS.textSoft} on="#fff" />
        <Swatch name="textMute" hex={TOKENS.textMute} on="#fff" />
      </div>

      <DocH3 n="02">角色色</DocH3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {ROLES.map((r) => (
          <div key={r.id} style={{
            padding: 12, borderRadius: 10, background: r.soft,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: r.color }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.name}</div>
              <div style={{ fontFamily: NUM_FONT, fontSize: 10, color: TOKENS.textSoft }}>{r.color}</div>
            </div>
          </div>
        ))}
      </div>

      <DocH3 n="03">语义色 · 交易类型</DocH3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
        <Swatch name="支出 / accent" hex={TOKENS.accent} on="#fff" />
        <Swatch name="入账 / income" hex={TOKENS.income} on="#fff" />
        <Swatch name="转账 / transfer" hex={TOKENS.transfer} on="#fff" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Swatch name="warning · 临近预算" hex={TOKENS.warning} on="#fff" />
        <Swatch name="danger · 超支/拒绝" hex={TOKENS.danger} on="#fff" />
        <Swatch name="success · 入账确认" hex={TOKENS.success} on="#fff" />
      </div>

      <DocH3 n="04">字体</DocH3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: 12, background: TOKENS.surfaceAlt, borderRadius: 8 }}>
          <div style={{ fontFamily: CN_FONT, fontSize: 22, color: TOKENS.ink, fontWeight: 600 }}>Noto Sans SC / JP</div>
          <div style={{ fontFamily: CN_FONT, fontSize: 12, color: TOKENS.textSoft, marginTop: 4 }}>正文 + 中文 + 日文标签</div>
        </div>
        <div style={{ padding: 12, background: TOKENS.surfaceAlt, borderRadius: 8 }}>
          <div style={{ fontFamily: NUM_FONT, fontSize: 18, color: TOKENS.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>¥12,345&nbsp;·&nbsp;¥234.56 CNY</div>
          <div style={{ fontFamily: CN_FONT, fontSize: 12, color: TOKENS.textSoft, marginTop: 4 }}>JetBrains Mono · 金额 · CNY 加后缀徽标</div>
        </div>
      </div>

      <DocH3 n="05">圆角 / 间距</DocH3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {[6, 8, 10, 12, 14, 999].map((r) => (
          <div key={r} style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: TOKENS.surfaceAlt, border: `1px solid ${TOKENS.border}`, borderRadius: r === 999 ? 28 : r }} />
            <div style={{ fontFamily: NUM_FONT, fontSize: 10, color: TOKENS.textSoft, marginTop: 4 }}>{r === 999 ? 'full' : r}</div>
          </div>
        ))}
      </div>
    </DocCard>
  );
}

// ─────────────────────────────────────────────────────────────
// C) Components
// ─────────────────────────────────────────────────────────────
function DocComponents() {
  const groups = [
    {
      title: 'Layout · 布局',
      items: [
        ['<AppShell>',        '路由 + 角色 context + 顶层布局'],
        ['<PhoneScreen>',     '移动端竖屏容器'],
        ['<AppBar>',          '标题 + 左 / 右 slot + subtitle'],
        ['<BottomNav>',       '5 项 tab：首页 / 明细 / + / 预算 / 设置'],
        ['<SectionLabel>',    '组件之间的小标题'],
      ],
    },
    {
      title: 'Atoms · 原子',
      items: [
        ['<Amount value currency>', '金额数字 · 自动按 JPY / CNY 格式化 · CNY 加 suffix 徽标'],
        ['<CatMark cat size>',      '分类圆角方块 + 单字'],
        ['<RolePill role>',         '角色彩色 chip'],
        ['<RoleSwitcher>',          '3 项角色切换段控件'],
        ['<TypeBadge type>',        '交易类型徽标：支出 / 入账 / 转账'],
        ['<AccountChip acct>',      '账户 chip · 含 tail · CNY 额外标识'],
        ['<Button variant size>',   'primary / secondary / ghost / danger / success'],
        ['<Toggle on>',             'iOS 风格开关'],
        ['<Card pad>',              '默认 14px 内边距、12px 圆角的表面'],
        ['<ConfBadge v>',           'AI 置信度小药丸 · 颜色按区段'],
        ['<ReceiptThumb>',          '小票预览缩略图'],
      ],
    },
    {
      title: 'Compound · 业务',
      items: [
        ['<TxRow tx>',           '一行交易 · 自动按 type 切换布局（转账双账户行）'],
        ['<UploadRow u>',        '上传项 + 进度 + 状态徽章 + AI 提示气泡'],
        ['<ConfRow label …>',    'AI 确认页字段行'],
        ['<ItemConfRow it>',     '商品条目 + 独立分类 + 置信度'],
        ['<FixedRow f>',         '固定收支卡 · type 角标'],
        ['<BudgetRow b>',        '预算条 + 阈值标线 + 状态徽章'],
        ['<BudgetAlertRow b>',   'Dashboard 预算预警条'],
        ['<AcctCard acct>',      '转账 from / to 大卡片'],
        ['<FilterChip>',         '明细页筛选 chip（active / removable）'],
        ['<PickerField>',        '点击调起 picker 的输入行'],
      ],
    },
    {
      title: 'Hooks / Context',
      items: [
        ['useActiveRole()',          'localStorage 持久化角色'],
        ['useTransactions(filter)',  '查询当月 / 筛选交易'],
        ['useReceiptDrafts()',       '订阅 AI 处理队列'],
        ['useBudgets(month)',        '本月预算 + 实时使用'],
        ['useFixedItems(type)',      '固定收 / 支 CRUD'],
        ['useAccounts() / useCategories() / useRoles()', '设置项'],
        ['useCurrency()',            'JPY ↔ CNY 切换 + 实时汇率'],
      ],
    },
  ];

  return (
    <DocCard>
      <DocTitle kicker="组件 & 命名建议" title="React + Tailwind 友好"
        desc="文件按职责分。命名 PascalCase。原子组件不写业务，业务组件靠原子拼装。" />
      {groups.map((g) => (
        <div key={g.title}>
          <DocH3>{g.title}</DocH3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {g.items.map(([name, desc]) => (
              <div key={name} style={{
                padding: 8, background: TOKENS.surfaceAlt, borderRadius: 6,
                fontSize: 11, color: TOKENS.text, display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                <span style={{ fontFamily: NUM_FONT, color: TOKENS.accent, fontWeight: 600 }}>{name}</span>
                <span style={{ color: TOKENS.textSoft, lineHeight: 1.4 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </DocCard>
  );
}

// ─────────────────────────────────────────────────────────────
// D) Interactions
// ─────────────────────────────────────────────────────────────
function DocInteractions() {
  const flows = [
    {
      title: '记账主流程（三模式）',
      steps: [
        '点 Dashboard 的支出 / 入账 / 转账 / 小票 任一按钮',
        '进入手动记账页，顶部分段控件预选对应模式',
        '支出 / 入账：金额聚焦 → 货种选 JPY/CNY → 角色 → 分类 → 账户 → 保存',
        '转账：from / to 账户选择 → 转出金额 → 自动算转入（点"使用"用实时汇率）',
        '保存后 toast "已记入 共通 · 餐饮"，回 Dashboard',
      ],
    },
    {
      title: '小票 AI 流程（人工确认 · 逐项分类）',
      steps: [
        '上传 / 拍照 → 可选填写 AI 提示（"算共通账"、"公司报销"等）',
        '多张并行；每张状态独立',
        '识别完点"待确认"→ AI 确认页',
        '顶部蓝色卡片复述用户提示，可编辑后重跑',
        '类型 / 货种 / 账户 / 角色 / 店铺为共用字段一次性确认',
        '每商品独立分类 + 置信度；低置信加 ⚠ + warning 底',
        '可逐项排除（赠品）或合并负数行（值引）',
        '"确认入账"→ 一次生成 N 笔交易；"拒绝"丢弃 draft',
      ],
    },
    {
      title: '预算预警',
      steps: [
        'Dashboard 直接显示超出 / 临近的分类（红 / 黄）',
        '预算页：总预算 + 状态计数（超出 / 临近 / 健康）',
        '每条预算下方有阈值标线（默认 80%），到线变黄、到顶变红',
        '入账与转账永不触发预算（不消耗）',
      ],
    },
    {
      title: '货种 & 转账',
      steps: [
        '账户绑定单一货种 (JPY 或 CNY)',
        'CNY 账户在余额卡 / 列表 / 设置中都加 CNY 徽标',
        '转账若跨币种，自动取实时汇率，可手动覆盖；可填手续费',
        '转账不计入支出 / 入账 / 预算，只调整账户余额',
      ],
    },
    {
      title: '角色切换',
      steps: [
        'Dashboard 顶部 RoleSwitcher 全局可见',
        '切换即重新汇总并写入 localStorage',
        '新建支出 / 入账沿用最后一次选择，单笔仍可改',
        '后端每个请求带 role，服务端再校验权限',
      ],
    },
  ];
  return (
    <DocCard>
      <DocTitle kicker="关键交互" title="行为说明"
        desc="移动端优先：能 inline 就不弹模态。所有写入操作有 undo toast。" />
      {flows.map((f) => (
        <div key={f.title}>
          <DocH3>{f.title}</DocH3>
          <ol style={{ margin: 0, padding: '0 0 0 22px', fontSize: 12, color: TOKENS.text, lineHeight: 1.7 }}>
            {f.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      ))}

      <DocH3>Responsive 断点</DocH3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          ['≤ 640px',     '默认 · 单列卡片 · 底部 tab',                        '主力形态'],
          ['641 – 1024px','内容居中 max-w 560，外圈灰底',                       '平板'],
          ['≥ 1025px',    '左侧 240 sidebar 替换底部 tab，右栏 max-w 720',      '桌面'],
        ].map(([bp, desc, kind]) => (
          <div key={bp} style={{
            padding: 10, borderRadius: 8, background: TOKENS.surfaceAlt,
            border: `1px solid ${TOKENS.borderSoft}`,
          }}>
            <div style={{ fontFamily: NUM_FONT, fontSize: 11, color: TOKENS.accent, fontWeight: 600 }}>{bp}</div>
            <div style={{ fontSize: 11, color: TOKENS.text, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
            <div style={{ fontSize: 10, color: TOKENS.textMute, marginTop: 2 }}>{kind}</div>
          </div>
        ))}
      </div>
    </DocCard>
  );
}

Object.assign(window, { DocIntro, DocTokens, DocComponents, DocInteractions });
