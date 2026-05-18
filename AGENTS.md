# AGENTS.md

## Project overview

This repository implements a private household accounting tool for two people.

Primary goals:
- Web first, Android app later.
- Upload one or multiple receipt images and use the OpenAI API to extract transaction candidates.
- Let the user review, edit, and explicitly confirm AI results before writing them into the ledger.
- Allow the user to add arbitrary text notes during receipt upload to guide AI classification.
- Support two personal actors and one shared household scope.
- Support expense, income, and transfer transaction types.
- Support JPY accounts and CNY/RMB accounts.
- Track accounts and payment methods such as cash, PayPay, Japanese bank accounts, CNY/RMB accounts, and multiple credit cards.
- Support recurring fixed expenses such as rent and monthly insurance payments.
- Support recurring income such as salary.
- Support monthly category budgets.
- Deploy the backend to Google Cloud Run.
- All file read/write operations must use UTF-8.

Primary users:
- User A
- User B
- Household shared account

The UI language should default to Chinese unless a task explicitly asks otherwise. Financial dates, time zones, and examples should assume Japan usage unless the task says otherwise.

## Non-negotiable product rules

1. Never auto-post AI-extracted data directly into the ledger.
   - AI extraction must create draft transaction candidates only.
   - User confirmation is required before ledger insertion.
   - User edits must be preserved.

2. The current browser role must be remembered.
   - Store `currentActorId` locally in the browser.
   - Role choices are: actor A, actor B, household shared.
   - Backend authorization must not rely only on local storage. Every write must be validated against authenticated household membership.

3. Cloud Run service must be stateless.
   - Do not depend on local filesystem persistence.
   - Uploaded receipt images must be stored in Cloud Storage or equivalent persistent storage.
   - Temporary files must be deleted after use.

4. Accounts and payment methods are separate concepts.
   - Account means where money is held or owed: JPY cash, PayPay balance, bank account, credit card payable, CNY/RMB account, etc.
   - Payment method means how a purchase was paid.
   - A payment method may point to an account.

5. Transfers between own accounts must not be counted as spending.
   - Moving money from a JPY account to a CNY/RMB account is a transfer.
   - Paying a credit card bill from a bank account is a transfer/payment, not a second expense.
   - Currency conversion metadata may be stored, but MVP reporting can start with original-currency totals plus optional JPY-normalized fields.

6. Income is not a negative expense.
   - Salary, bonus, refund, reimbursement, cashback, interest, and similar inflows must use `transactionType = income`.
   - Income increases the target account balance.

7. Budgets are monthly category limits.
   - Budget usage should count confirmed expenses only.
   - Income and transfers must not consume expense budgets.
   - Budgets should warn when close to or over the limit. They should not block posting by default.

8. User-provided AI notes must be passed as extraction hints.
   - Receipt upload may include arbitrary user notes such as `这张算餐饮`, `这是公司报销`, `不要按商品拆分`, or `这是人民币支付`.
   - The AI may use the note as a classification hint, but the final output still requires user confirmation.
   - The note must be saved with the receipt and candidate audit trail.

9. Secrets must never be exposed to the frontend.
   - OpenAI API keys, GCP credentials, database credentials, and signing secrets must stay server-side.
   - Use environment variables or Secret Manager.

10. All text files, CSV exports, JSON, logs, import/export files, and generated files must use UTF-8.
   - Do not generate Shift_JIS, CP932, or platform-default encoded files unless explicitly requested.
   - In Go, use UTF-8 strings and explicit readers/writers.
   - In JavaScript/TypeScript, use UTF-8 browser APIs and avoid legacy encodings.

## Recommended architecture

Use a simple modular monolith first.

Suggested stack:
- Frontend: React or Next.js, TypeScript, Tailwind CSS.
- Backend: Go HTTP API.
- Database MVP: Firestore.
- Object storage: Cloud Storage for receipt images.
- AI extraction: OpenAI API called only from backend.
- Deployment: Cloud Run.
- Authentication: Firebase Auth or Google Identity Platform.
- Scheduled jobs: Cloud Scheduler calling authenticated backend endpoints for recurring expense/income generation.

Reasoning:
- The project is small and private, so a modular monolith is faster than microservices.
- Firestore is easy for a low-traffic two-person app.
- If SQL-style reporting, account ledgers, or multi-currency reporting becomes important, migrate the ledger storage to Cloud SQL PostgreSQL later.

## Directory layout

```text
.
├── AGENTS.md
├── README.md
├── CLAUDE_DESIGN_PROMPT.md
├── docs/
│   ├── PROJECT_BRIEF.md
│   ├── DATA_MODEL.md
│   ├── API_CONTRACT.md
│   ├── AI_RECEIPT_EXTRACTION.md
│   └── DECISIONS.md
├── web/
├── api/
├── infra/
└── scripts/
```

## Domain model

Core entities:

```text
Household
- id
- name
- members

Actor
- id
- householdId
- displayName
- type: personal | household_shared
- createdAt
- updatedAt

Account
- id
- householdId
- name
- type: cash | paypay | credit_card | bank_account | cny_rmb | other
- currency: JPY | CNY
- ownerActorId
- openingBalance
- currentBalance
- isActive

PaymentMethod
- id
- householdId
- name
- type: cash | paypay | credit_card | bank_account | cny_rmb | other
- accountId
- ownerActorId
- billingDay
- settlementDay
- isActive

Category
- id
- householdId
- name
- type: expense | income | transfer
- parentCategoryId
- sortOrder
- isDefault

Transaction
- id
- householdId
- actorId
- transactionType: expense | income | transfer
- transactionDate
- amount
- currency: JPY | CNY
- categoryId
- paymentMethodId
- fromAccountId
- toAccountId
- exchangeRate
- convertedAmount
- convertedCurrency
- merchantName
- title
- memo
- source: manual | ai_receipt | recurring
- receiptId
- status: confirmed
- createdBy
- createdAt
- updatedAt

Receipt
- id
- householdId
- uploadedBy
- storageObjectPath
- originalFilename
- mimeType
- aiUserNote
- aiStatus: pending | extracted | failed | confirmed
- aiRawJson
- createdAt
- updatedAt

TransactionCandidate
- id
- receiptId
- householdId
- suggestedActorId
- suggestedTransactionType: expense | income | transfer
- suggestedTransactionDate
- suggestedAmount
- suggestedCurrency
- suggestedCategoryId
- suggestedPaymentMethodId
- suggestedFromAccountId
- suggestedToAccountId
- merchantName
- lineItems
- aiUserNote
- confidence
- warnings
- status: draft | edited | confirmed | rejected
- createdAt
- updatedAt

RecurringRule
- id
- householdId
- actorId
- transactionType: expense | income | transfer
- title
- amount
- currency: JPY | CNY
- categoryId
- paymentMethodId
- fromAccountId
- toAccountId
- frequency: monthly | weekly | yearly
- dayOfMonth
- nextRunDate
- isActive
- memo

MonthlyBudget
- id
- householdId
- month: YYYY-MM
- actorScope: actor | household | all
- actorId
- categoryId
- limitAmount
- currency: JPY | CNY
- alertThresholdPercent
- rolloverEnabled
- isActive
```

## Transaction semantics

- Expense: money spent.
- Income: money received, such as salary, bonus, refund, reimbursement, cashback, or interest.
- Transfer: movement between own accounts or payment methods. Transfers must not affect net expense totals.
- Account: where money is held or owed, such as cash, PayPay, credit card, bank account, or CNY/RMB account.
- Actor: who the transaction belongs to.
- Household shared: transaction is common to the household, not an individual.
- Payment method: how the transaction was paid.
- Category: what the transaction is for.

For credit card purchases:
- `transactionDate` is the purchase date.
- Card settlement should be modeled as transfer/payment, not as a second expense.

For income:
- Salary should use `transactionType = income`.
- Income categories may include salary, bonus, refund, reimbursement, interest, and other income.
- Income should increase the target account balance.

For account transfers:
- Transfers require `fromAccountId` and `toAccountId`.
- Transfers may include currency conversion fields.
- Transfers should not be included in expense totals.
- Example: JPY bank account -> CNY/RMB account.

For budgets:
- Monthly budgets are defined by category and optional actor scope.
- Budget usage should count confirmed expense transactions only.
- Income and transfer records should not consume expense budgets.

## API conventions

Use REST-style JSON APIs for MVP.

Suggested endpoints:

```text
GET    /healthz

GET    /api/me
GET    /api/households/current

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

GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/{transactionId}
PATCH  /api/transactions/{transactionId}
DELETE /api/transactions/{transactionId}

POST   /api/receipts/upload
GET    /api/receipts/{receiptId}
POST   /api/receipts/{receiptId}/extract
GET    /api/transaction-candidates
PATCH  /api/transaction-candidates/{candidateId}
POST   /api/transaction-candidates/{candidateId}/confirm
POST   /api/transaction-candidates/{candidateId}/reject

GET    /api/recurring-rules
POST   /api/recurring-rules
PATCH  /api/recurring-rules/{ruleId}

GET    /api/budgets
POST   /api/budgets
PATCH  /api/budgets/{budgetId}
GET    /api/budgets/usage

POST   /api/jobs/generate-recurring-transactions
```

## Backend coding rules

Use Go idioms:
- Keep handlers thin.
- Put business rules in services or domain functions.
- Keep repository interfaces small.
- Pass `context.Context` as the first parameter for I/O operations.
- Return typed errors where useful.
- Validate request payloads before calling service logic.
- Sanitize filenames.
- Limit upload size.
- Use structured logging with request IDs.
- Use table-driven tests for domain and service logic.

Do not:
- Put business rules directly in HTTP handlers.
- Make OpenAI calls from repositories.
- Store raw secrets in logs.
- Ignore errors.
- Swallow context cancellation.
- Use local time without explicit timezone handling.
- Count transfers as spending.
- Model income as negative expense.

## Frontend coding rules

Use TypeScript strictly.

UI principles:
- Mobile-first responsive layout.
- Fast manual entry must be possible without AI.
- AI review screen must make uncertainty visible.
- Role switcher must always be visible or one tap away.
- Confirmed ledger entries and AI candidates must be visually distinct.
- Expense, income, and transfer entries must be visually distinguishable.
- Monthly budget warnings must be visible from the dashboard.
- The default currency display is Japanese yen, but CNY/RMB accounts must be supported.
- Use accessible labels for all controls.

State rules:
- Store `currentActorId` in local storage.
- Fetch authoritative user, household, actor, account, category, and payment method data from backend.
- Never trust client-side totals for persistence.
- Keep form state local until submit.
- Use optimistic UI only for low-risk edits; rollback on error.

Suggested main screens:
- Dashboard
- Manual entry: expense, income, transfer
- Receipt upload with AI user note
- AI review
- Transactions
- Monthly report
- Monthly budgets
- Recurring expenses/income
- Settings

## Testing expectations

Minimum backend tests:
- Domain validation tests.
- Transaction confirmation tests.
- Income transaction tests.
- Account transfer tests.
- Currency conversion metadata validation tests.
- Recurring rule generation tests.
- Monthly budget usage tests.
- Receipt candidate validation tests.
- AI user-note hint persistence tests.
- Payment method, account, and actor ownership tests.
- API handler tests for validation and authorization.

Minimum frontend tests:
- Role switching behavior.
- Manual transaction form validation.
- Income entry form validation.
- Transfer form validation.
- AI upload note and review flow.
- AI review edit and confirm flow.
- Transaction list filtering.
- Recurring expense form validation.
- Monthly budget form and warning display.

Before marking a task done, run the relevant checks. If a check cannot be run, state why.

## Security and privacy

This is a private financial application. Treat data as sensitive.

Required:
- Authentication on all non-health endpoints.
- Household-level access control.
- No OpenAI key in frontend.
- No receipt image public URLs unless signed and short-lived.
- Do not log full receipt OCR text by default.
- Do not log full request bodies for financial endpoints.
- Consider encrypting sensitive configuration with Secret Manager.

## Agent workflow

When working on this repository:

1. Read this file first.
2. Inspect existing code before changing architecture.
3. Prefer small, cohesive changes.
4. Preserve UTF-8.
5. Update docs when behavior changes.
6. Add or update tests for business logic.
7. Never silently change financial semantics.
8. Never auto-confirm AI candidates.
9. If requirements conflict, choose the safer financial behavior and document the assumption.
10. Do not introduce unnecessary infrastructure or microservices.
