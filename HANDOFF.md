# HANDOFF.md — Home Ledger 项目交接文档

> 写给下一个接手的 AI agent。最后更新 2026-05-22。

---

## 项目一句话

私人双人家庭记账 App（中文 UI，日本场景）。Go 后端 + Next.js 16 静态导出前端 + Firebase Hosting，Firebase Auth + Firestore，GCS 存图，OpenAI 识别小票/语音。已上线 https://home-ledger-jiuyun.web.app。

---

## 当前状态：全部里程碑完成 ✅

| # | 里程碑 | 状态 |
|---|--------|------|
| 1–10 | 静态页 → 前端 mock → API → Auth → 域模型 → 手动记账 → 小票上传 → AI 识别 → 审核流 → 固定规则 | ✅ |
| 11 | 月度分类预算（含按币种隔离） | ✅ |
| 12 | 月度 Dashboard（接真实数据 + 分类支出下钻） | ✅ |
| 13 | Cloud Run 部署（asia-east1）+ Firebase Hosting | ✅ |

**线上功能补充清单**（M13 之后增量）：
- 语音入账（Whisper → ParseVoiceEntry）含多商品流程
- 跨币种支出：CNY-PM + JPY 交易存 `convertedAmount`（CNY yuan）
- AI 模型切换（精准 GPT-5.5 / 快速 GPT-5.4-mini，`localStorage('ai_model')`）
- AI 确认页：置信度高亮 + 每张小票"↻ 重新生成"按钮（删旧 draft 重跑）
- PaymentMethod 所属人编辑（settings），AI 利用 ownerName 优先匹配上传人/说话人名下账户
- 信用卡还款倒计时 pill（设置页 CC 行）
- PWA：manifest + apple-icon + 矢量 ¥ 主图标，"添加到主屏幕"独立窗口
- 触觉反馈（`navigator.vibrate`，iOS Safari 静默忽略）
- 首页分类支出 tap → /transactions?cat=... 下钻
- 跨币种 transfer / expense / edit sheet 全链路一致

---

## 如何运行

### 后端

```bash
cd api
go run ./cmd/api          # 自动 load api/.env，监听 :8080
```

**`api/.env` 必备：**

```
GOOGLE_APPLICATION_CREDENTIALS=<path-to-serviceAccount.json>
FIREBASE_PROJECT_ID=home-ledger-jiuyun
ALLOWED_ORIGINS=http://localhost:3000,https://home-ledger-jiuyun.web.app
PORT=8080
OPENAI_API_KEY=<key>
GCS_BUCKET=home-ledger-jiuyun-receipts
```

### 前端

```bash
cd web
npm run dev               # http://localhost:3000
```

**`web/.env.local` 必备：**

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=home-ledger-jiuyun
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=https://api-<hash>-an.a.run.app   # Cloud Run URL
```

### 验证构建

```bash
cd api && go build ./...   # 必须零错误
cd web && npm run build    # 必须零 TypeScript 错误（next build 已带 tsc）
```

### 部署

```bash
# 后端（asia-east1，不是 northeast1！）
cd api
gcloud run deploy api --source . --region asia-east1 --project home-ledger-jiuyun

# 前端
cd web
npm run build && firebase deploy --only hosting
```

> ⚠️ Cloud Run service 名是 `api`，region `asia-east1`，project `home-ledger-jiuyun`。前端打的就是 asia-east1 那个，别部到别的 region。

---

## 技术架构

```
web/          Next.js 16 App Router, TypeScript, output: 'export'（静态导出）
              内联样式 + Tailwind（极少用），颜色从 lib/tokens.ts 的 T 取
api/          Go, Chi router, slog, graceful shutdown
              godotenv.Load() 用于本地开发
Firestore     Native mode, asia-northeast1 (Tokyo)
GCS           home-ledger-jiuyun-receipts, asia-northeast1
              lifecycle: Standard → Nearline@90d → Coldline@365d
Firebase Auth Google Sign-In only，每个请求带 ID token，后端验签
OpenAI        GPT-5.5 (accurate) / GPT-5.4-mini (fast)，response_format: json_object
              Whisper for voice transcription
Cloud Run     asia-east1，无认证（auth 走前端 token），1 service：api
Hosting       Firebase Hosting，rewrites api/** → Cloud Run（见 firebase.json）
```

---

## 关键设计决策与不变量

### 金额
- **整数显示单位存储**：JPY = 日元整数；CNY = **元整数（NOT 分）**。绝不存浮点。
- CNY 小数精度刻意丢失（个人记账容忍 ¥0.5 误差）。
- 跨币种支出（Alipay/WeChat 日本扣 RMB）：`currency='JPY', amount=1500, convertedAmount=75, convertedCurrency='CNY'`。balance 算 PM 余额时用 `convertedAmount`，category/budget 统计仍用 `amount`（JPY）。

### 时区
- 所有日期数学用 **JST (Asia/Tokyo)**，不是 UTC。
- 后端：`time.FixedZone("JST", +9h)`，见 `budget.go currentMonth()`、`jobs.go today`。
- 前端：`new Date().getFullYear()/getMonth()/getDate()` 拼，**不要**用 `toISOString().slice(0,10)`（UTC，JST 凌晨会错日期）。

### AI 流程
- AI 永远不自动入账。识别结果存 `TransactionCandidate(status='draft')`，用户在 `/ai-confirm` 逐项 confirm/reject。
- `extract` handler 在创建新候选前会 **删掉同 receiptId 的旧 draft 候选**（重新生成的语义）。confirmed/rejected 不动。
- AI 返回的 `suggestedPaymentMethodId` 会校验是否在 household PM 集合里，不在就清空。
- 多商品的 voice 候选会校验 `sum(lineItems) == result.Amount`，差额加到最大项。
- 一张照片可含多张物理小票，每张一个 `subReceiptId`；/ai-confirm 按 `subReceiptId ?? receiptId` 分组。
- AI 收到的 `PaymentMethodHint` 带 `OwnerName`，配合 prompt 里的"上传人/说话人"提示，AI 优先选该人名下的 PM。

### 月份过滤
Firestore 不支持字符串前缀查询，Go 拿全量后按 `transactionDate[:7]` 过滤。

### 图片
客户端用 Canvas API 压到 1600px 长边 + JPEG 85%（ADR-010），降低带宽和 OpenAI 输入。

### 信用卡周期
- `billingDay`（締め日）+ `settlementDay`（支払日）+ `debitPmId`
- balance < 0 表示欠款，UI 显示 `Math.abs()` 为"待还"
- 还款流：用户在 `/transactions` 看到"待还"行，tap 执行 → 创建一笔 `transfer(fromAccountId=debitPmId, toAccountId=cc.id)`
- 下次还款日计算：`lib/ccBilling.ts` `nextCCSettlement(billingDay, settlementDay)`，已 clamp 到月末，处理 12→1 月跨年

### 循环规则
- 无后端 scheduler。`/transactions` 显示 `dayOfMonth >= today.getDate()` 的待执行行
- `nextRunDate` 创建时就设为下次执行月份；**不要按 nextRunDate 过滤**，按 `dayOfMonth` 过滤
- 提前执行（`handleExecuteRule`）必须按 `transactionType` 分支：transfer 发 `fromAccountId`/`toAccountId`，否则发 `paymentMethodId`/`categoryId`
- `jobs.go advanceOneMonth` 已 clamp dayOfMonth 到目标月末（31 号不会溢出到下月）

### 预算
- 月度按 category。`getBudgetUsage` 聚合 key 是 `(categoryId, currency)`，JPY 预算不会被 CNY 交易污染
- 只算 confirmed expense；income/transfer 不进
- 超额警告不阻断

### Actor / 当前角色
- `state.currentRole`（actor UUID）存 `localStorage('currentRole')`
- 首页按 currentRole 过滤显示；entry 表单 PM 列表按是否归属当前角色排序，归属者在前
- 后端写入仍以请求里的 actorId 为准，但每个写入会验证 household 归属

### 其他不变量
- Bootstrap 幂等：首次登录 `POST /api/households/bootstrap` 自动建 Household + 默认 actors/categories/PMs
- API envelope：`{ data, error }`，前端 `apiFetch<T>` 统一解包
- middleware 不引 handler 包，避免循环依赖
- 文件全 UTF-8，绝不生成 Shift_JIS / CP932
- 所有秘钥（OpenAI key、Firebase service account、GCS creds）**只能服务端**

---

## 代码结构（关键路径）

```
api/
  cmd/api/main.go                   入口，godotenv.Load()
  internal/
    firebase/app.go                 AuthClient() + FirestoreClient()
    middleware/auth.go              验证 Bearer token，注入 Claims
    domain/types.go                 类型：Claims, Transaction (含 ConvertedAmount/Currency),
                                    TransactionCandidate, Receipt, MonthlyBudget, RecurringRule…
    repo/                           Firestore CRUD（每个聚合一个文件）
                                    candidate.go 含 DeleteDraftCandidatesByReceipt
    handler/                        HTTP handlers
                                    receipt.go: extract 调用前述 delete
                                    voice.go: PM 校验 + line item 重平衡
                                    payment_method.go: PATCH 支持 ownerActorId
                                    recurring.go: PATCH 支持 fromAccountId/toAccountId
                                    budget.go: 用 jstZone + 按 (cat, currency) 聚合
                                    jobs.go: 用 jstZone + clamp advanceOneMonth
                                    routes.go 注册路由
    storage/gcs.go                  Upload() / Download()
    ai/extract.go                   ExtractFromImage()，prompt 要求 CNY 为 yuan
    ai/voice.go                     TranscribeAudio + ParseVoiceEntry（含 callerName 参数）

web/src/
  app/
    icon.svg                        应用图标（SVG, accent 底 + ¥ 字符）
    apple-icon.svg                  iOS 主屏图标（在 public/ 通过 metadata.icons.apple 引用）
    layout.tsx                      manifest + appleWebApp + themeColor + Providers
    login/page.tsx                  Google Sign-In
    page.tsx (/)                    Dashboard：本月汇总 + 账户余额 + 分类支出（tap 下钻）+ 待办
    entry/page.tsx                  手动记账（expense/income/transfer），含跨币种字段
                                    PM 列表按 currentRole 排序
                                    日期默认本地拼接，不用 toISOString
                                    保存触发 hapticSuccess
    transactions/page.tsx           明细：月切、类型 tab、排序、PM/actor/分类筛选、搜索
                                    待还 CC + 待执行规则展示与提前执行
                                    Edit sheet 含 amount/PM/CNY 字段，PM 切回非 CNY 时清 convertedAmount
                                    URL ?cat=...&month=... 支持下钻，re-apply on searchParams change
                                    handleExecuteRule 按 transactionType 发字段
                                    删除触发 hapticWarn
    upload/page.tsx                 上传：压缩 + 选模型 + 调 extract
    ai-confirm/page.tsx             审核：分组按 subReceiptId
                                    每组带 ↻ 重新生成（内联 fast/accurate 选择）
                                    avgConf<0.7 时小票卡边框+按钮变橙
                                    低置信度警告 banner 移到 items 之上
                                    跨币种 CNY 字段，PM 改非 CNY 时不附 convertedAmount
                                    确认/拒绝/重生成各自触发 haptic
    fixed/page.tsx                  规则 CRUD（含 actor selector）
    budget/page.tsx                 预算
    settings/page.tsx               设置：actors / PMs / categories / AI 模型
                                    EditPaymentMethodSheet 含 ownerActorId chips
                                    CC 行显示 nextCCSettlement pill
  context/
    AuthContext.tsx                 Firebase Auth 状态
    DataContext.tsx                 actors/categories/PMs，auto-bootstrap
    AppContext.tsx                  currentRole, selectedMonth
  lib/
    api.ts                          apiGet/apiPost/apiPatch/apiDelete/apiUpload
    tokens.ts                       设计 token（颜色、字体）
    catDisplay.ts                   分类名 → mark + tint
    ccBilling.ts                    nextCCSettlement(billingDay, settlementDay)
    haptic.ts                       haptic / hapticSuccess / hapticWarn / hapticTap
    types.ts                        前端类型
  components/
    layout/                         AppBar, BottomNav, PhoneScreen, RoleSwitcher, AuthGuard
    ui/                             Button, Card, Amount, SectionLabel, ReceiptThumb, TypeBadge
```

---

## 已实现的 API 路由（全部）

```
GET  /healthz

# Auth'd routes (/api/*)
GET  /api/me
GET  /api/households/current
POST /api/households/bootstrap
POST /api/households/join

GET/POST              /api/actors
PATCH                 /api/actors/{actorId}

GET/POST              /api/accounts           （legacy；新代码用 payment-methods）
PATCH                 /api/accounts/{accountId}

GET/POST              /api/payment-methods
PATCH/DELETE          /api/payment-methods/{paymentMethodId}   含 ownerActorId
GET                   /api/payment-methods/balances            余额计算用 convertedAmount

GET/POST              /api/categories
PATCH/DELETE          /api/categories/{categoryId}

GET                   /api/transactions       ?month=YYYY-MM&actorId=...&type=...
POST                  /api/transactions
GET/PATCH/DELETE      /api/transactions/{id}                    PATCH 支持 convertedAmount/Currency

POST                  /api/receipts/upload
GET                   /api/receipts/{receiptId}
GET                   /api/receipts/{receiptId}/image
POST                  /api/receipts/{receiptId}/extract         body: { model: "fast"|"accurate" }

POST                  /api/voice/entry                          multipart audio

GET                   /api/transaction-candidates
PATCH                 /api/transaction-candidates/{id}
POST                  /api/transaction-candidates/{id}/confirm
POST                  /api/transaction-candidates/{id}/reject

GET/POST              /api/recurring-rules
PATCH/DELETE          /api/recurring-rules/{ruleId}             PATCH 支持 from/toAccountId
POST                  /api/jobs/generate-recurring-transactions （未接 scheduler，手动 trigger）

GET/POST              /api/monthly-budgets
PATCH/DELETE          /api/monthly-budgets/{budgetId}
GET                   /api/monthly-budgets/usage?month=YYYY-MM
```

---

## Firestore 集合

```
users/{uid}                    UserRecord
households/{householdId}       Household
actors/{actorId}               Actor
accounts/{accountId}           Account (legacy)
payment_methods/{id}           PaymentMethod（含 ownerActorId, billingDay, settlementDay, debitPmId）
categories/{categoryId}        Category
transactions/{id}              Transaction（含 convertedAmount, convertedCurrency）
receipts/{receiptId}           Receipt
transactionCandidates/{id}     TransactionCandidate
                               索引：householdId + status + createdAt(desc)
                               + householdId + receiptId + status (for delete by receipt)
recurringRules/{id}            RecurringRule
monthlyBudgets/{id}            MonthlyBudget
```

---

## 已修 + 注意事项（"踩过的坑"）

- **CNY 单位**：曾经 extract.go prompt 用 fen，voice.go 用 yuan，导致 CNY 小票金额放大 100 倍。现在全统一 yuan 整数。
- **convertedAmount 残留**：edit sheet 改 PM 从 CNY 到非 CNY 时必须显式发 `convertedAmount: 0, convertedCurrency: ''` 清掉 Firestore 里的旧值（`omitempty` 不会清）。
- **JST vs UTC**：曾经 `currentMonth()` 用 UTC，月末几小时会错月。所有时间数学现在统一 JST。
- **advanceOneMonth**：曾经 `time.Date(year, month+1, 31, ...)` 在 2 月会变 3 月 3 日。现在 clamp 到月末。
- **预算混币**：曾经 `catTotals[catId] += amount` 把 CNY 加到 JPY 上。现在 key 含 currency。
- **handleExecuteRule 丢字段**：曾经 transfer 规则提前执行只发 paymentMethodId，转账变孤儿。现在按 type 分支。
- **AI 返回 PM ID 不校验**：曾经 AI 幻觉的 ID 直接入库，余额定位丢失。现在 receipt/voice 都校验。
- **`.history/` 不能 commit**：VSCode Local History 扩展会存 `.env` 副本，含密钥。已加 `.gitignore`，但若再发现请立即重写历史 + 轮换密钥。

---

## 代码规范

- **中文**：UI/错误提示/AI prompt 全中文（日文 AI 自动翻译为简体）。代码注释看场合，复杂业务用中文 OK。
- **提交**：每个有意义变更立即 commit（`feat:` / `fix:` / `docs:` / `chore:`），不要囤积
- **构建验证**：commit 前必须 `go build ./...` + `npm run build` 都通过
- **不要自动入账**：AI 候选只能 draft，必须用户 confirm
- **金额**：display 单位整数（JPY 元 / CNY 元），绝不浮点
- **Token 取色**：颜色/字体全部从 `lib/tokens.ts` 的 `T` 取，不硬编码
- **不要装大型库**：保持 bundle 小（当前无 Tailwind 实质使用、无图表库、无 UI 库）

---

## 还能做的（如果接手想加功能）

按"价值/工作量"排序：

1. **快速复用上一笔 / 最近常用模板** — entry 页顶部"最近"卡片，tap 预填
2. **金额快捷按钮** — entry 数字输入下方 ¥500/¥1000/¥2000 chip
3. **全高置信度时一键入账** — AI confirm 页 conf>0.9 时跳过逐项
4. **拆分一笔（split）** — A 付的钱里 B 占一半（重要，但需新 `shares` 字段，scope 较大）
5. **首页本月对比/趋势** — 数据已有，加横向条形图（无需图表库）
6. **CSV 导出** — 月度 / 分类
7. **Service Worker** — 离线壳，启动更快
8. **Dark mode** — 跟随系统

---

*本文档由 Claude Opus 4.7 维护，2026-05-22。*
