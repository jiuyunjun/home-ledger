# API_CONTRACT.md

## General rules

- All request and response bodies are UTF-8 JSON.
- All non-health endpoints require authentication.
- All writes require household membership validation.
- Server validates `actorId`, `accountId`, `paymentMethodId`, `categoryId`, and budget ownership.
- Server calculates persisted values where possible.
- Client-side values are treated as untrusted.
- Expense, income, and transfer records must be distinguished by `transactionType`.
- Transfers must not be counted as expenses.
- Budget usage must count confirmed expenses only.

## Response envelope

Success:

```json
{
  "data": {},
  "error": null
}
```

Failure:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid transaction amount",
    "details": {
      "field": "amount"
    }
  }
}
```

## Error code examples

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
UPLOAD_TOO_LARGE
UNSUPPORTED_FILE_TYPE
AI_EXTRACTION_FAILED
AI_RESULT_INVALID
BUDGET_LIMIT_EXCEEDED
ACCOUNT_CURRENCY_MISMATCH
TRANSFER_ACCOUNT_INVALID
CONFLICT
INTERNAL
```

## Accounts

`GET /api/accounts`

`POST /api/accounts`

Request:

```json
{
  "name": "人民币账户",
  "type": "cny_rmb",
  "currency": "CNY",
  "ownerActorId": "actor_a",
  "openingBalance": 0
}
```

## Create transaction

`POST /api/transactions`

Request for expense:

```json
{
  "transactionType": "expense",
  "actorId": "actor_a",
  "transactionDate": "2026-05-19",
  "amount": 1280,
  "currency": "JPY",
  "categoryId": "cat_food",
  "paymentMethodId": "pm_paypay",
  "fromAccountId": "acc_paypay",
  "merchantName": "コンビニ",
  "title": "コンビニ",
  "memo": ""
}
```

Request for income:

```json
{
  "transactionType": "income",
  "actorId": "actor_a",
  "transactionDate": "2026-05-25",
  "amount": 300000,
  "currency": "JPY",
  "categoryId": "cat_salary",
  "toAccountId": "acc_bank_jpy",
  "title": "工资",
  "memo": ""
}
```

Request for transfer:

```json
{
  "transactionType": "transfer",
  "actorId": "actor_a",
  "transactionDate": "2026-05-19",
  "amount": 100000,
  "currency": "JPY",
  "fromAccountId": "acc_bank_jpy",
  "toAccountId": "acc_cny",
  "convertedAmount": 470000,
  "convertedCurrency": "CNY",
  "exchangeRate": "0.047",
  "title": "日元转人民币",
  "memo": ""
}
```

## Receipt upload

`POST /api/receipts/upload`

Use multipart form data.

Fields:
- `files`: one or multiple image files.
- `actorId`: optional default actor for candidates.
- `paymentMethodId`: optional default payment method hint.
- `accountId`: optional default account hint.
- `memo`: optional user memo.
- `aiUserNote`: optional arbitrary user note for AI extraction and classification hints. Example: `这张算餐饮，不要拆商品`, `这是公司报销`, `这是人民币支付`.

Response:

```json
{
  "data": {
    "batchId": "batch_123",
    "receipts": [
      {
        "receiptId": "receipt_123",
        "aiStatus": "pending",
        "aiUserNote": "这张算餐饮"
      }
    ]
  },
  "error": null
}
```

## AI extraction

`POST /api/receipts/{receiptId}/extract`

Response:

```json
{
  "data": {
    "receiptId": "receipt_123",
    "candidates": [
      {
        "candidateId": "candidate_123",
        "status": "draft",
        "merchantName": "コンビニ",
        "suggestedTransactionType": "expense",
        "suggestedAmount": 1280,
        "suggestedCurrency": "JPY",
        "suggestedAccountId": "acc_paypay",
        "aiUserNote": "这张算餐饮",
        "confidence": 0.86,
        "warnings": []
      }
    ]
  },
  "error": null
}
```

## Confirm candidate

`POST /api/transaction-candidates/{candidateId}/confirm`

Request:

```json
{
  "transactionType": "expense",
  "actorId": "actor_a",
  "transactionDate": "2026-05-19",
  "amount": 1280,
  "currency": "JPY",
  "categoryId": "cat_food",
  "paymentMethodId": "pm_paypay",
  "fromAccountId": "acc_paypay",
  "merchantName": "コンビニ",
  "title": "コンビニ",
  "memo": ""
}
```

Response:

```json
{
  "data": {
    "transactionId": "txn_123"
  },
  "error": null
}
```

## Budgets

`GET /api/budgets?month=2026-05`

`POST /api/budgets`

Request:

```json
{
  "month": "2026-05",
  "actorScope": "household",
  "actorId": null,
  "categoryId": "cat_food",
  "limitAmount": 60000,
  "currency": "JPY",
  "alertThresholdPercent": 80,
  "rolloverEnabled": false,
  "isActive": true
}
```

`GET /api/budgets/usage?month=2026-05`

Response:

```json
{
  "data": {
    "month": "2026-05",
    "items": [
      {
        "budgetId": "budget_food_202605",
        "categoryId": "cat_food",
        "limitAmount": 60000,
        "usedAmount": 48200,
        "remainingAmount": 11800,
        "usagePercent": 80.33,
        "status": "warning"
      }
    ]
  },
  "error": null
}
```
