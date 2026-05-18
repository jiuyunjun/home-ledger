# DATA_MODEL.md

## Entity relationship summary

```text
Household 1 --- N Actor
Household 1 --- N Account
Household 1 --- N PaymentMethod
Household 1 --- N Category
Household 1 --- N Transaction
Household 1 --- N Receipt
Receipt   1 --- N TransactionCandidate
Household 1 --- N RecurringRule
Household 1 --- N MonthlyBudget

PaymentMethod N --- 1 Account

Transaction N --- 1 Actor
Transaction N --- 0..1 PaymentMethod
Transaction N --- 0..1 Category
Transaction N --- 0..1 Receipt
Transaction N --- 0..1 FromAccount
Transaction N --- 0..1 ToAccount
```

## Firestore MVP collection proposal

```text
households/{householdId}
households/{householdId}/actors/{actorId}
households/{householdId}/accounts/{accountId}
households/{householdId}/paymentMethods/{paymentMethodId}
households/{householdId}/categories/{categoryId}
households/{householdId}/transactions/{transactionId}
households/{householdId}/receipts/{receiptId}
households/{householdId}/transactionCandidates/{candidateId}
households/{householdId}/recurringRules/{ruleId}
households/{householdId}/monthlyBudgets/{budgetId}
users/{userId}
```

## Important indexes

- transactions by `transactionDate desc`
- transactions by `actorId, transactionDate desc`
- transactions by `transactionType, transactionDate desc`
- transactions by `paymentMethodId, transactionDate desc`
- transactions by `fromAccountId, transactionDate desc`
- transactions by `toAccountId, transactionDate desc`
- transactions by `categoryId, transactionDate desc`
- transactionCandidates by `status, createdAt desc`
- recurringRules by `isActive, nextRunDate`
- monthlyBudgets by `month, categoryId`
- monthlyBudgets by `month, actorId, categoryId`

## Amount storage

Store money as integer minor units.

For JPY, store integer yen.

```json
{
  "amount": 1280,
  "currency": "JPY"
}
```

For CNY/RMB, store integer fen.

```json
{
  "amount": 12345,
  "currency": "CNY",
  "displayAmount": "123.45"
}
```

Do not store money as floating point.

## Date storage

Use ISO date strings for financial dates:

```text
YYYY-MM-DD
```

Use RFC3339 timestamps for created/updated timestamps.

Default timezone:

```text
Asia/Tokyo
```

## Account model

```json
{
  "id": "acc_cny_1",
  "householdId": "household_1",
  "name": "人民币账户",
  "type": "cny_rmb",
  "currency": "CNY",
  "ownerActorId": "actor_a",
  "openingBalance": 0,
  "currentBalance": 0,
  "isActive": true
}
```

## Transaction examples

### Expense

```json
{
  "transactionType": "expense",
  "transactionDate": "2026-05-19",
  "amount": 1280,
  "currency": "JPY",
  "categoryId": "cat_food",
  "paymentMethodId": "pm_paypay",
  "fromAccountId": "acc_paypay",
  "title": "コンビニ"
}
```

### Income

```json
{
  "transactionType": "income",
  "transactionDate": "2026-05-25",
  "amount": 300000,
  "currency": "JPY",
  "categoryId": "cat_salary",
  "toAccountId": "acc_bank_jpy",
  "title": "工资"
}
```

### Transfer

```json
{
  "transactionType": "transfer",
  "transactionDate": "2026-05-19",
  "amount": 100000,
  "currency": "JPY",
  "fromAccountId": "acc_bank_jpy",
  "toAccountId": "acc_cny_1",
  "convertedAmount": 470000,
  "convertedCurrency": "CNY",
  "exchangeRate": "0.047",
  "title": "日元转人民币"
}
```

### Monthly budget

```json
{
  "month": "2026-05",
  "categoryId": "cat_food",
  "actorScope": "household",
  "limitAmount": 60000,
  "currency": "JPY",
  "alertThresholdPercent": 80,
  "rolloverEnabled": false,
  "isActive": true
}
```

## Budget usage rule

Budget usage includes:
- confirmed expense transactions
- matching month
- matching category
- matching actor scope

Budget usage excludes:
- income
- transfer
- rejected AI candidates
- draft AI candidates
