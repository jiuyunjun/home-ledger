# HANDOFF.md — Home Ledger 项目交接文档

> 写给下一个接手的 AI agent。最后更新 2026-05-19（M8 强化：按商品分项 + 中文名 + 可编辑审核 + 设计稿对齐）。

---

## 项目一句话

私人双人家庭记账 App。Go 后端 + Next.js 前端，Firebase Auth + Firestore，GCS 存图片，OpenAI gpt-4o 识别小票。

---

## 里程碑完成状态

| # | 里程碑 | 状态 | commit |
|---|--------|------|--------|
| 1 | 静态页面设计 | ✅ Done | `3f3936d` |
| 2 | 前端 mock（JSON fixtures） | ✅ Done | `94efada` |
| 3 | Go API 骨架 | ✅ Done | `efd5587` |
| 4 | Firebase Auth + 登录页 + 路由守卫 | ✅ Done | `8d4b153` |
| 5 | Actors / Accounts / PaymentMethods / Categories | ✅ Done | `0581622` |
| 6 | 手动记账 CRUD（expense / income / transfer） | ✅ Done | `520da33` |
| 7 | 小票上传（GCS 存储） | ✅ Done | `2ab7947` |
| 8 | OpenAI 识别 + AI 审核确认流 | ✅ Done | `4ef5419` |
| 9 | （并入 M8，已完成） | ✅ Done | — |
| 10 | 固定规则/循环支出 | ✅ Done | `787889f` |
| 11 | 月度分类预算 | ⏳ Not started |
| 12 | 月度 Dashboard（真实数据） | ⏳ Not started |
| 13 | Cloud Run 部署 | ⏳ Not started |

**现在应从 M11 开始。**

### 关于小票上传 501 错误

如果上传小票时看到"this endpoint is not yet implemented"，原因是 Go 服务器进程是旧的（M6 之前编译），需要重启：

```bash
cd api
go run ./cmd/api
```

M7+8 的代码（`POST /api/receipts/upload`、`POST /api/receipts/{id}/extract`）已经在 commit `2ab7947` 里正确实现了。

---

## 如何运行

### 后端

```bash
cd api
go run ./cmd/api          # 会自动 load api/.env
# 监听 :8080
```

**`api/.env` 需要包含：**

```
GOOGLE_APPLICATION_CREDENTIALS=<path-to-serviceAccount.json>
FIREBASE_PROJECT_ID=home-ledger-jiuyun
ALLOWED_ORIGINS=http://localhost:3000
PORT=8080
OPENAI_API_KEY=<key>
GCS_BUCKET=home-ledger-jiuyun-receipts
```

### 前端

```bash
cd web
npm run dev               # http://localhost:3000
```

**`web/.env.local` 需要包含：**

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=home-ledger-jiuyun
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 验证构建

```bash
cd api && go build ./...   # 必须零错误
cd web && npx next build   # 必须零 TypeScript 错误
```

---

## 技术架构

```
web/          Next.js 16 App Router, TypeScript, inline styles (no Tailwind)
api/          Go, Chi router, slog, graceful shutdown
              godotenv.Load() 用于本地开发
Firestore     Native mode, asia-northeast1 (Tokyo)
GCS           home-ledger-jiuyun-receipts, asia-northeast1
              lifecycle: Standard → Nearline@90d → Coldline@365d
Firebase Auth Google Sign-In only
OpenAI        gpt-4o vision, response_format: json_object
Cloud Run     还未部署（M13）
```

---

## 关键设计决策

- **金额存整数 minor units**：JPY = 日元整数，CNY = 分（×100）
- **月份过滤客户端做**：Firestore 不支持字符串前缀，Go 拿全量后按 `transactionDate[:7]` 过滤
- **图片压缩客户端做**：Canvas API，长边 ≤ 1600px，JPEG 85%（ADR-010）
- **AI 按商品分类**：gpt-4o 提取每个商品并分配 categoryName（咖啡→餐饮，洗发露→日用品）；
  handler 为每个 line item 创建一个独立的 TransactionCandidate（`MerchantName` = 中文商品名）。
  用户必须手动 confirm，AI 不自动入账。
- **日文→中文翻译**：系统提示要求 AI 将商品名翻译为简体中文（コーヒー→咖啡，ポケモンカード→宝可梦卡片）。
- **审核页设计对齐**：`ai-confirm/page.tsx` layout 与设计稿一致：
  - 每张小票一个 group，含：receipt summary card（thumbnail+date+count+total）→ user hint →
    shared fields card（类型/角色/日期/币种，日期可编辑）→ 分类汇总 chips → 逐项列表 → 低置信度警告
  - ItemConfRow：分类图标（含分类名、warn badge）→ 商品名（tap 编辑）→ 金额（tap 编辑）→ ConfBadge → 排除/恢复
  - 底部：拒绝全部 + 确认入账（N笔 · ¥total）
  - 编辑缓存在本地（itemEdits + receiptEdits），confirm 时先 PATCH 再 POST confirm
- **Bootstrap 幂等**：第一次登录调 `POST /api/households/bootstrap`，自动创 Household + 默认数据
- **API envelope**：所有响应 `{ data, error }`，前端用 `apiFetch<T>` 统一解包
- **中间件不导入 handler 包**：避免循环依赖，middleware/auth.go 直接 inline 写 401

---

## 代码结构（关键路径）

```
api/
  cmd/api/main.go                   入口，godotenv.Load()
  internal/
    firebase/app.go                 AuthClient() + FirestoreClient()
    middleware/auth.go              验证 Bearer token，注入 Claims（含 householdId+actorId）
    domain/                         类型：Claims, Transaction, TransactionCandidate, Receipt…
    repo/                           Firestore CRUD（user, household, actor, account,
                                    payment_method, category, transaction, receipt, candidate, bootstrap）
    handler/                        HTTP handlers，routes.go 注册路由
    storage/gcs.go                  Upload() / Download()
    ai/extract.go                   ExtractFromImage() → gpt-4o vision

web/src/
  app/                              Next.js App Router 页面
    layout.tsx                      AuthProvider > DataProvider > AppProvider > AuthGuard
    login/page.tsx                  Google Sign-In
    page.tsx (/)                    月度 Dashboard（目前用 mock 数据，M12 需接真实 API）
    entry/page.tsx                  手动记账
    transactions/page.tsx           交易列表
    upload/page.tsx                 小票上传
    ai-confirm/page.tsx             AI 审核
    fixed/page.tsx                  固定规则（M10 已接真实 API）
    budget/page.tsx                 预算（M11 需接真实 API）
    settings/page.tsx               设置
  context/
    AuthContext.tsx                 Firebase Auth 状态
    DataContext.tsx                 actors/categories/accounts/paymentMethods，auto-bootstrap
    AppContext.tsx                  currentRole（actorId string）、selectedMonth
  lib/
    api.ts                          apiGet/apiPost/apiPatch/apiDelete/apiUpload
    tokens.ts                       设计 token（颜色、字体）
    catDisplay.ts                   分类名 → mark + tint
  components/
    layout/                         AppBar, BottomNav, PhoneScreen, RoleSwitcher
    ui/                             Button, Card, Amount, SectionLabel, ReceiptThumb…
```

---

## 已实现的 API 路由

```
GET  /healthz

# Auth'd routes (/api/*)
GET  /api/me
GET  /api/households/current
POST /api/households/bootstrap
POST /api/households/join

GET    /api/actors
POST   /api/actors
PATCH  /api/actors/{actorId}

GET    /api/accounts
POST   /api/accounts
PATCH  /api/accounts/{accountId}

GET    /api/payment-methods
POST   /api/payment-methods
PATCH  /api/payment-methods/{paymentMethodId}

GET    /api/categories
POST   /api/categories
PATCH  /api/categories/{categoryId}

GET    /api/transactions           ?month=YYYY-MM&actorId=...&type=...
POST   /api/transactions
GET    /api/transactions/{id}
PATCH  /api/transactions/{id}
DELETE /api/transactions/{id}

POST   /api/receipts/upload
GET    /api/receipts/{receiptId}
POST   /api/receipts/{receiptId}/extract

GET    /api/transaction-candidates
PATCH  /api/transaction-candidates/{id}
POST   /api/transaction-candidates/{id}/confirm
POST   /api/transaction-candidates/{id}/reject

# M10 已实现：
GET    /api/recurring-rules
POST   /api/recurring-rules
PATCH  /api/recurring-rules/{ruleId}
POST   /api/jobs/generate-recurring-transactions

# 以下仍返回 501（M11 工作范围）：
GET    /api/budgets
POST   /api/budgets
PATCH  /api/budgets/{budgetId}
GET    /api/budgets/usage
```

---

## Firestore 集合

```
users/{uid}                    UserRecord（uid, householdId, actorId, email）
households/{householdId}       Household
actors/{actorId}               Actor（householdId, type: personal|household_shared）
accounts/{accountId}           Account（householdId, currency: JPY|CNY, type）
payment_methods/{id}           PaymentMethod（householdId, linkedAccountId）
categories/{categoryId}        Category（householdId, type: expense|income, sortOrder）
transactions/{id}              Transaction（householdId, transactionType, amount 整数）
receipts/{receiptId}           Receipt（householdId, gcsPath, aiStatus）
transactionCandidates/{id}     TransactionCandidate（householdId, status: draft|confirmed|rejected|edited）
                               索引：householdId ASC + status ASC + createdAt DESC
```

---

## M10：固定规则 / 循环支出 ✅ 已完成（commit `787889f`）

- `repo/recurring_rule.go`：Firestore CRUD
- `handler/recurring.go`：GET/POST/PATCH `/api/recurring-rules`
- `handler/jobs.go`：`POST /api/jobs/generate-recurring-transactions`（遍历 active rules，NextRunDate ≤ today → 创建 Transaction，自动推进 NextRunDate + 1 月）
- `fixed/page.tsx`：改为真实 API，toggle 调用 PATCH `{isActive}`

---

## M11：月度预算（下一步实现）

**需要实现**：

### 后端

1. `api/internal/domain/types.go` 增加 `MonthlyBudget`：
   ```go
   type MonthlyBudget struct {
       ID                   string    `firestore:"id"`
       HouseholdID          string    `firestore:"householdId"`
       Month                string    `firestore:"month"` // "2026-05"
       CategoryID           string    `firestore:"categoryId"`
       LimitAmount          int64     `firestore:"limitAmount"`
       Currency             string    `firestore:"currency"`
       AlertThresholdPct    int       `firestore:"alertThresholdPercent"`
       IsActive             bool      `firestore:"isActive"`
       CreatedAt            time.Time `firestore:"createdAt"`
       UpdatedAt            time.Time `firestore:"updatedAt"`
   }
   ```

2. `api/internal/repo/budget.go`
   - `CreateBudget`, `ListBudgets(householdId, month)`, `GetBudget`, `UpdateBudget`

3. `api/internal/handler/budget.go`
   - `listBudgets`, `createBudget`, `patchBudget`
   - `getBudgetUsage`：按 `categoryId` 聚合当月 expense transactions，与 budget limit 对比

4. `routes.go` 替换 notImplemented

### 前端

`web/src/app/budget/page.tsx` 接真实 API。

---

## M12：月度 Dashboard 接真实数据

**当前状态**：`web/src/app/page.tsx`（首页 Dashboard）使用 AppContext mock 数据。

**需要实现**：
- 新增 `GET /api/dashboard/summary?month=YYYY-MM`（或客户端从 transactions 聚合）
- 按 category 分组求和 expense
- 显示预算用量（需要 M11 完成）
- 月净额（income - expense）

---

## M13：Cloud Run 部署

**已有**：
- `api/Dockerfile`（需确认是否存在，否则新建）
- Firebase 项目：`home-ledger-jiuyun`，区域 `asia-northeast1`
- GCS bucket 已创建

**部署步骤**（到时候执行）：
```bash
# 构建并推送镜像
gcloud builds submit api/ --tag gcr.io/home-ledger-jiuyun/api

# 部署到 Cloud Run（asia-northeast1）
gcloud run deploy home-ledger-api \
  --image gcr.io/home-ledger-jiuyun/api \
  --region asia-northeast1 \
  --allow-unauthenticated=false \
  --set-env-vars FIREBASE_PROJECT_ID=home-ledger-jiuyun,GCS_BUCKET=home-ledger-jiuyun-receipts \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest
```

前端 `web/.env.local` 中 `NEXT_PUBLIC_API_URL` 改为 Cloud Run URL。  
前端部署到 Firebase Hosting 或 Vercel。

---

## 代码规范 & 注意事项

- **中文注释**：用户/产品是中文环境，错误提示/提示词用中文
- **提交规范**：每个有意义的变更必须立即 commit（`feat:` / `fix:` / `docs:`）
- **构建验证**：每次 commit 前必须 `go build ./...` + `npx next build` 都通过
- **不要自动入账**：AI 候选只能生成 draft candidate，必须用户 confirm
- **金额**：所有金额存整数 minor units（JPY=日元，CNY=分），绝不存小数
- **Token 来源**：颜色/字体全部从 `web/src/lib/tokens.ts` 的 `T` 对象取，不硬编码

---

## 已知问题 / TODO

- `fixed/page.tsx` 和 `budget/page.tsx` 还是静态 mock，等 M10/M11
- `page.tsx`（Dashboard）月度数据是 mock，等 M12
- `web/src/app/settings/page.tsx` 是静态页，设置功能未实现（低优先级）
- Cloud Run 部署未做（M13）
- `api/Dockerfile` 需要确认是否存在

---

*本文档由 Claude Sonnet 4.6 生成，2026-05-19。*
