# DECISIONS.md

## ADR-001: Web first, Android later

Decision:
- Build the web app first.
- Keep API and domain model reusable for a future Android app.

Reason:
- Web is faster to design and iterate.
- Android can later consume the same backend APIs.

## ADR-002: Go backend on Cloud Run

Decision:
- Use Go for the backend API.

Reason:
- Small binary, simple deployment, good startup characteristics, and strong type safety.
- Suitable for Cloud Run.

Caveat:
- Startup speed depends on image size, initialization work, dependencies, and Cloud Run configuration. Language alone does not solve cold starts.

## ADR-003: Firestore for MVP

Decision:
- Use Firestore for MVP persistence.

Reason:
- Low operational overhead.
- Good enough for a small private household app.
- Works naturally with Cloud Run and Firebase Auth.

Caveat:
- If reporting becomes SQL-heavy, migrate ledger tables to PostgreSQL.

## ADR-004: AI creates candidates, not transactions

Decision:
- AI extraction creates `TransactionCandidate`.
- User confirmation creates `Transaction`.

Reason:
- Financial records must not depend on unreviewed AI output.

## ADR-005: UTF-8 only

Decision:
- All file I/O uses UTF-8.

Reason:
- Prevents Japanese/Chinese text corruption across Windows, macOS, Linux, browser, Go backend, and Cloud Run.

## ADR-006: Add accounts separate from payment methods

Decision:
- Introduce `Account` as a first-class entity.
- Payment methods may point to accounts.

Reason:
- This supports JPY cash, PayPay, credit cards, bank accounts, and CNY/RMB accounts.
- It also enables account-to-account transfers without overloading payment method semantics.

## ADR-007: Support expense, income, and transfer

Decision:
- `Transaction.transactionType` must be one of `expense`, `income`, or `transfer`.

Reason:
- Salary and other incoming money should not be modeled as negative expenses.
- Account transfers should not affect net spending.

## ADR-008: Add monthly category budgets

Decision:
- Add `MonthlyBudget` with category, month, actor scope, limit amount, and alert threshold.

Reason:
- The MVP needs simple household spending control.
- Budget usage should count confirmed expenses only.

## ADR-009: Receipt upload accepts AI user notes

Decision:
- Receipt upload accepts `aiUserNote`.

Reason:
- Users often know contextual information not visible on the receipt, such as category, reimbursement, who paid, or whether to split items.
- The note improves AI classification while preserving human confirmation.
