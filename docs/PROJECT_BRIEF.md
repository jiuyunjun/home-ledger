# PROJECT_BRIEF.md

## Product name

家庭记账工具 / Home Ledger

## Purpose

A private household accounting tool for two people. It records personal and shared expenses, income, and account transfers. It supports receipt image extraction with AI and provides monthly visibility into spending and budgets.

## MVP scope

### Included

- Web app first.
- Two personal roles plus one household shared role.
- Browser remembers the current role.
- Manual transaction entry for:
  - expense
  - income, such as salary
  - account transfer
- JPY and CNY/RMB accounts.
- Receipt upload, single or multiple images.
- Optional user note during receipt upload to guide AI classification.
- AI extraction from receipts.
- User review, edit, confirm, or reject AI transaction candidates.
- Accounts and payment methods:
  - JPY cash
  - PayPay
  - multiple credit cards
  - Japanese bank account
  - CNY/RMB account
- Categories for expenses and income.
- Monthly category budgets.
- Fixed recurring expenses:
  - rent
  - insurance
  - other monthly payments
- Recurring income, such as salary.
- Monthly dashboard.
- Transaction search and filtering.
- UTF-8 file I/O.
- Cloud Run deployment.

### Deferred

- Android native app.
- Bank/card statement import.
- Automatic exchange-rate sync.
- Full double-entry accounting.
- Multi-household support.
- Advanced budgeting beyond monthly category limits.
- OCR provider abstraction beyond OpenAI.
- Shared real-time editing.
- Public user registration.

## Product principles

- Confirmation before persistence.
- Manual entry must be faster than AI for simple expenses.
- AI should reduce typing, not hide uncertainty.
- Income is not negative expense.
- Transfer is not expense.
- Monthly budget should warn clearly but not block by default.
- The app is private, small, and optimized for reliability over scale.
- Data export should be possible later, so keep records clean and structured.

## Recommended MVP milestones

1. Static web design
2. Frontend mock using local JSON fixtures
3. Go API skeleton
4. Auth and household membership
5. Actors, accounts, payment methods, and categories
6. Manual expense, income, and transfer transactions
7. Receipt upload with optional user note
8. OpenAI extraction using receipt image plus user note
9. AI review and confirm flow
10. Recurring expenses and recurring income
11. Monthly category budgets
12. Monthly dashboard
13. Cloud Run deployment
