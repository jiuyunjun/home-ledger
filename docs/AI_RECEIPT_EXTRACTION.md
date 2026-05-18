# AI_RECEIPT_EXTRACTION.md

## Goal

Use the OpenAI API to extract structured transaction candidates from receipt images.

The AI must not directly create confirmed transactions. It only creates drafts for user review.

## Backend-only API usage

OpenAI API calls must happen only in the Go backend.

Never call OpenAI directly from the browser.

## User note support

Receipt upload may include an optional free-text field:

```text
aiUserNote
```

Examples:
- `这张算餐饮`
- `这是公司报销`
- `不要按商品拆分`
- `这是人民币支付`
- `这张小票里只有饮料算我的，其他算家庭共通`

Rules:
- The note is a hint, not authoritative accounting data.
- The note can guide category, actor, payment method, currency, or splitting suggestion.
- The note must be saved with the receipt and candidate record.
- The user must still confirm or edit the final candidate.

## Suggested model behavior

The extraction prompt should ask the model to:

- Read Japanese, Chinese, and English receipts.
- Extract merchant, date, time, total paid amount, currency, payment method hint, account hint, line items, and warnings.
- Use the optional user note as a hint for classification, splitting, reimbursement treatment, or currency interpretation.
- Prefer final paid amount.
- Preserve uncertainty.
- Return structured JSON only.
- Avoid guessing invisible values.

## Suggested system prompt

```text
You are a receipt data extraction engine for a private household accounting app.

Extract information from the receipt image and use the optional user note only as a hint.
Do not invent missing fields.
If a field is uncertain, set it to null and add a warning.
Prefer the final paid amount as total_amount.
If the receipt is from Japan and currency is not explicitly shown, use JPY.
If the receipt or user note clearly indicates RMB/CNY, use CNY.
Classify the transaction based on visible data and the user note, but mark uncertainty with warnings.
Return JSON that matches the provided schema.
The output is a draft for human review, not a final accounting record.
```

## Suggested JSON schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "receipt_language",
    "merchant_name",
    "transaction_date",
    "transaction_time",
    "currency",
    "total_amount",
    "payment_method_hint",
    "account_hint",
    "category_hint",
    "user_note_interpretation",
    "line_items",
    "confidence",
    "warnings"
  ],
  "properties": {
    "receipt_language": {
      "type": ["string", "null"],
      "enum": ["ja", "zh", "en", "mixed", null]
    },
    "merchant_name": {
      "type": ["string", "null"]
    },
    "transaction_date": {
      "type": ["string", "null"],
      "description": "YYYY-MM-DD"
    },
    "transaction_time": {
      "type": ["string", "null"],
      "description": "HH:mm"
    },
    "currency": {
      "type": "string",
      "enum": ["JPY", "CNY"]
    },
    "total_amount": {
      "type": ["integer", "null"]
    },
    "payment_method_hint": {
      "type": "string",
      "enum": ["cash", "paypay", "credit_card", "bank_account", "cny_rmb", "unknown"]
    },
    "account_hint": {
      "type": ["string", "null"]
    },
    "category_hint": {
      "type": ["string", "null"]
    },
    "user_note_interpretation": {
      "type": ["string", "null"],
      "description": "Brief explanation of how the optional user note affected classification, or null if not used."
    },
    "line_items": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "quantity", "unit_price", "amount", "category_hint"],
        "properties": {
          "name": { "type": ["string", "null"] },
          "quantity": { "type": ["number", "null"] },
          "unit_price": { "type": ["integer", "null"] },
          "amount": { "type": ["integer", "null"] },
          "category_hint": { "type": ["string", "null"] }
        }
      }
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "warnings": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

## Validation rules after AI response

Server must validate:

- JSON schema compliance.
- Amount uses integer minor units or null.
- JPY amount is integer yen.
- CNY amount is integer fen.
- Date format is valid if present.
- Confidence is between 0 and 1.
- Category, account, and payment method are only hints until mapped to real IDs.
- User note is persisted, but never treated as automatically confirmed accounting data.
- Candidate status starts as `draft`.
