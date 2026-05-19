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

## ADR-010: Client-side image compression before upload

Decision:
- The frontend compresses receipt images in the browser before sending to the API.
- Target: longest edge ≤ 1600 px, JPEG quality 85%.
- Implementation: browser Canvas API, no external library.

Reason:
- Phone photos are typically 10–50 MB. OpenAI Vision does not need original resolution to read receipt text.
- Compressing to ~300–800 KB reduces upload time and OpenAI token cost while preserving readability.

## ADR-011: Cloud Storage lifecycle — Standard 90 days → Archive

Decision:
- Receipt images are stored in Cloud Storage Standard class for 90 days, then automatically transitioned to Archive class.
- Images are not deleted automatically.

Reason:
- Standard class covers the active review window. Archive class significantly reduces storage cost for infrequently accessed historical receipts.
- Archive retrieval cost is acceptable for a two-person app where post-90-day access is rare (mainly AI re-extraction on failure).
- Archive has a 365-day minimum storage duration; that cost is acceptable at this scale.

## ADR-009: Receipt upload accepts AI user notes

Decision:
- Receipt upload accepts `aiUserNote`.

Reason:
- Users often know contextual information not visible on the receipt, such as category, reimbursement, who paid, or whether to split items.
- The note improves AI classification while preserving human confirmation.
