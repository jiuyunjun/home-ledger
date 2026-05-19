// app.jsx — assemble all artboards into a DesignCanvas

function App() {
  return (
    <DesignCanvas>
      {/* ── Intro & system ───────────────────────────────────── */}
      <DCSection id="intro" title="家计簿 · 设计稿"
        subtitle="家庭记账 Web MVP · Mobile-first · 8 页面 · 多币种 · 三交易类型">
        <DCArtboard id="readme" label="README · 设计意图" width={520} height={780}>
          <DocIntro />
        </DCArtboard>
        <DCArtboard id="tokens" label="设计令牌" width={520} height={780}>
          <DocTokens />
        </DCArtboard>
        <DCArtboard id="components" label="组件清单 & 命名" width={520} height={780}>
          <DocComponents />
        </DCArtboard>
        <DCArtboard id="interactions" label="关键交互 + Responsive" width={520} height={780}>
          <DocInteractions />
        </DCArtboard>
      </DCSection>

      {/* ── Dashboard ────────────────────────────────────────── */}
      <DCSection id="dashboard" title="① Dashboard 首页"
        subtitle="本月支出 / 入账 · 账户余额 · 预算预警 · 4 个主行动按钮">
        <DCArtboard id="dash-main" label="主视图" width={390} height={820}>
          <ScreenDashboard />
        </DCArtboard>
        <DCPostIt top={120} left={460} width={220} rotate={-1.5}>
          顶部 RoleSwitcher 全局保留；左收右支两栏 hero 一眼看本月是否盈余。
        </DCPostIt>
        <DCPostIt top={360} left={460} width={220} rotate={1.2}>
          账户余额横向滚动卡片，CNY 卡用米色底色加 CNY 徽标，避免和 JPY 混淆。
        </DCPostIt>
        <DCPostIt top={580} left={460} width={220} rotate={-1.2}>
          预算预警直接挂 Dashboard，超出红、临近黄；不需要去预算页才发现。
        </DCPostIt>
      </DCSection>

      {/* ── Manual entry (3 modes) ───────────────────────────── */}
      <DCSection id="manual" title="② 手动记账 · 三种模式"
        subtitle="支出 / 入账 / 账户转换三模式同入口，分段切换；货种 JPY ↔ CNY 一秒切换">
        <DCArtboard id="manual-expense" label="支出" width={390} height={820}>
          <ScreenManualEntry mode="expense" />
        </DCArtboard>
        <DCArtboard id="manual-income" label="入账" width={390} height={820}>
          <ScreenManualEntry mode="income" />
        </DCArtboard>
        <DCArtboard id="manual-transfer" label="账户转换" width={390} height={820}>
          <ScreenManualEntry mode="transfer" />
        </DCArtboard>
        <DCPostIt top={120} left={1320} width={230} rotate={1.5}>
          三模式共享键盘 / 金额输入区，避免重复学习；
          顶部分段控件颜色暗示当前模式（黑/绿/紫）。
        </DCPostIt>
        <DCPostIt top={380} left={1320} width={230} rotate={-1.2}>
          转账完全独立：from → to 卡片堆叠，多币种自动显汇率，
          且转账明确"不计入支出 / 入账，不消耗预算"。
        </DCPostIt>
      </DCSection>

      {/* ── Receipt upload ───────────────────────────────────── */}
      <DCSection id="upload" title="③ 小票上传 + AI 提示"
        subtitle="多张并行 · 拍照 / 拖拽 · 上传时可加自然语言提示帮助 AI 分类">
        <DCArtboard id="upload-main" label="上传 + 提示" width={390} height={820}>
          <ScreenReceiptUpload />
        </DCArtboard>
        <DCPostIt top={120} left={460} width={230} rotate={1.3}>
          提示框给 6 个常用快捷 chip：算共通/算我的/公司报销/不要拆分/人民币支付 …
          点一下追加到文本框。
        </DCPostIt>
        <DCPostIt top={340} left={460} width={230} rotate={-1.2}>
          每个上传项独立显示提示气泡 + 状态徽章四态。
          失败可重试；提示文字会传给 AI 影响识别。
        </DCPostIt>
      </DCSection>

      {/* ── AI confirm (重点) ────────────────────────────────── */}
      <DCSection id="ai" title="④ AI 识别确认  ★ 核心页面"
        subtitle="顶部显示用户上传提示 · 类型/币种为一等字段 · 每商品独立分类">
        <DCArtboard id="ai-main" label="逐项分类确认" width={390} height={880}>
          <ScreenAIConfirm />
        </DCArtboard>
        <DCPostIt top={120} left={460} width={240} rotate={1.5}>
          顶部蓝色卡片复述用户上传时的提示，让 AI 决策可解释，
          也方便用户当场改提示重跑（"编辑"按钮）。
        </DCPostIt>
        <DCPostIt top={360} left={460} width={240} rotate={-1.5}>
          类型 / 币种 / 账户都是字段：转账小票也走同一确认页，
          AI 直接判别 type 字段。低置信字段加 warning 色。
        </DCPostIt>
        <DCPostIt top={600} left={460} width={240} rotate={1.2}>
          确认后生成 N 笔交易，每项继承共用字段但保留各自分类。
          负数行 AI 自动建议合并。
        </DCPostIt>
      </DCSection>

      {/* ── List ─────────────────────────────────────────────── */}
      <DCSection id="list" title="⑤ 明细"
        subtitle="按日期分组 · 类型 / 角色 / 分类 / 账户 多维筛选 · 转账行有自己的样式">
        <DCArtboard id="list-main" label="月明细 + 筛选" width={390} height={820}>
          <ScreenList />
        </DCArtboard>
        <DCPostIt top={120} left={460} width={230} rotate={1.2}>
          类型分段在最显眼位置，因为这是最常用的筛选。
          转账行有浅紫底色，入账金额显绿且带 + 号。
        </DCPostIt>
      </DCSection>

      {/* ── Budget (NEW) ─────────────────────────────────────── */}
      <DCSection id="budget" title="⑥ 每月预算  ★ 新增"
        subtitle="只统计支出 · 临近阈值黄色 / 超出红色 · 阈值标线可视">
        <DCArtboard id="budget-main" label="预算总览" width={390} height={820}>
          <ScreenBudget />
        </DCArtboard>
        <DCPostIt top={120} left={460} width={230} rotate={-1.3}>
          总预算 + 3 个状态计数（超出 / 临近 / 健康）一目了然。
          按状态排序：先看到红色，再看黄色，最后健康项。
        </DCPostIt>
        <DCPostIt top={360} left={460} width={230} rotate={1.2}>
          每条预算下方有阈值标线（默认 80%），到线变黄、到顶变红。
          入账和转账永远不会被算进任何预算。
        </DCPostIt>
      </DCSection>

      {/* ── Fixed (expense + income) ─────────────────────────── */}
      <DCSection id="fixed" title="⑦ 固定收支"
        subtitle="固定支出 + 固定入账（工资）混排 · 净额 · 下次生成日期">
        <DCArtboard id="fixed-main" label="规则列表" width={390} height={820}>
          <ScreenFixed />
        </DCArtboard>
        <DCPostIt top={120} left={460} width={230} rotate={1.3}>
          顶部把流入 / 流出 / 净额 一起展示，净额绿色或红色直观。
          每个规则的 CatMark 右下角加 +/− 角标区分入账还是支出。
        </DCPostIt>
      </DCSection>

      {/* ── Settings ─────────────────────────────────────────── */}
      <DCSection id="settings" title="⑧ 设置"
        subtitle="角色 / 账户（含 CNY）/ 分类（支出 + 入账）/ 默认角色 / UTF-8 导出">
        <DCArtboard id="settings-main" label="设置主页" width={390} height={820}>
          <ScreenSettings />
        </DCArtboard>
        <DCPostIt top={120} left={460} width={230} rotate={-1.3}>
          账户卡显示余额，CNY 账户带显眼徽标。
          分类拆成"支出"和"入账"两个 group，互不干扰。
        </DCPostIt>
      </DCSection>

    </DesignCanvas>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
