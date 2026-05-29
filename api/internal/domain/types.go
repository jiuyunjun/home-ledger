// Package domain defines the core financial entities for the household ledger.
package domain

import "time"

// ── Enumerations ──────────────────────────────────────────────────────────────

type Currency string

const (
	CurrencyJPY Currency = "JPY"
	CurrencyCNY Currency = "CNY"
)

type TransactionType string

const (
	TxExpense  TransactionType = "expense"
	TxIncome   TransactionType = "income"
	TxTransfer TransactionType = "transfer"
)

type CandidateStatus string

const (
	CandidateDraft     CandidateStatus = "draft"
	CandidateEdited    CandidateStatus = "edited"
	CandidateConfirmed CandidateStatus = "confirmed"
	CandidateRejected  CandidateStatus = "rejected"
)

type ReceiptAIStatus string

const (
	ReceiptPending   ReceiptAIStatus = "pending"
	ReceiptExtracted ReceiptAIStatus = "extracted"
	ReceiptFailed    ReceiptAIStatus = "failed"
	ReceiptConfirmed ReceiptAIStatus = "confirmed"
)

type ActorType string

const (
	ActorPersonal        ActorType = "personal"
	ActorHouseholdShared ActorType = "household_shared"
)

type AccountType string

const (
	AccountCash        AccountType = "cash"
	AccountPayPay      AccountType = "paypay"
	AccountCreditCard  AccountType = "credit_card"
	AccountBankAccount AccountType = "bank_account"
	AccountCNYRMB      AccountType = "cny_rmb"
	AccountOther       AccountType = "other"
)

type CategoryType string

const (
	CatExpense  CategoryType = "expense"
	CatIncome   CategoryType = "income"
	CatTransfer CategoryType = "transfer"
)

type RecurringFrequency string

const (
	FreqMonthly RecurringFrequency = "monthly"
	FreqWeekly  RecurringFrequency = "weekly"
	FreqYearly  RecurringFrequency = "yearly"
)

type ActorScope string

const (
	ScopeActor     ActorScope = "actor"
	ScopeHousehold ActorScope = "household"
	ScopeAll       ActorScope = "all"
)

type TransactionSource string

const (
	SourceManual    TransactionSource = "manual"
	SourceAIReceipt TransactionSource = "ai_receipt"
	SourceRecurring TransactionSource = "recurring"
)

// ── Core entities ─────────────────────────────────────────────────────────────

// UserRecord links a Firebase UID to a household and actor.
type UserRecord struct {
	UID         string    `json:"uid" firestore:"uid"`
	HouseholdID string    `json:"householdId" firestore:"householdId"`
	ActorID     string    `json:"actorId" firestore:"actorId"`
	Email       string    `json:"email" firestore:"email"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
}

type Household struct {
	ID        string    `json:"id" firestore:"id"`
	Name      string    `json:"name" firestore:"name"`
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" firestore:"updatedAt"`
}

type Actor struct {
	ID          string    `json:"id" firestore:"id"`
	HouseholdID string    `json:"householdId" firestore:"householdId"`
	DisplayName string    `json:"displayName" firestore:"displayName"`
	Type        ActorType `json:"type" firestore:"type"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" firestore:"updatedAt"`
}

type Account struct {
	ID             string      `json:"id" firestore:"id"`
	HouseholdID    string      `json:"householdId" firestore:"householdId"`
	Name           string      `json:"name" firestore:"name"`
	Type           AccountType `json:"type" firestore:"type"`
	Currency       Currency    `json:"currency" firestore:"currency"`
	OwnerActorID   string      `json:"ownerActorId" firestore:"ownerActorId"`
	OpeningBalance int64       `json:"openingBalance" firestore:"openingBalance"`
	CurrentBalance int64       `json:"currentBalance" firestore:"currentBalance"`
	IsActive       bool        `json:"isActive" firestore:"isActive"`
	CreatedAt      time.Time   `json:"createdAt" firestore:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt" firestore:"updatedAt"`
}

type PaymentMethod struct {
	ID            string      `json:"id" firestore:"id"`
	HouseholdID   string      `json:"householdId" firestore:"householdId"`
	Name          string      `json:"name" firestore:"name"`
	Type          AccountType `json:"type" firestore:"type"`
	Currency      Currency    `json:"currency" firestore:"currency"`
	OwnerActorID  string      `json:"ownerActorId" firestore:"ownerActorId"`
	BillingDay    int         `json:"billingDay,omitempty" firestore:"billingDay,omitempty"`
	SettlementDay int         `json:"settlementDay,omitempty" firestore:"settlementDay,omitempty"`
	DebitPmID     string      `json:"debitPmId,omitempty" firestore:"debitPmId,omitempty"`
	IsActive      bool        `json:"isActive" firestore:"isActive"`
	CreatedAt     time.Time   `json:"createdAt" firestore:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt" firestore:"updatedAt"`
}

type Category struct {
	ID               string       `json:"id" firestore:"id"`
	HouseholdID      string       `json:"householdId" firestore:"householdId"`
	Name             string       `json:"name" firestore:"name"`
	Type             CategoryType `json:"type" firestore:"type"`
	ParentCategoryID string       `json:"parentCategoryId,omitempty" firestore:"parentCategoryId,omitempty"`
	SortOrder        int          `json:"sortOrder" firestore:"sortOrder"`
	IsDefault        bool         `json:"isDefault" firestore:"isDefault"`
	CreatedAt        time.Time    `json:"createdAt" firestore:"createdAt"`
	UpdatedAt        time.Time    `json:"updatedAt" firestore:"updatedAt"`
}

// Amount stores money as integer display units.
// JPY: integer yen. CNY: integer yuan.
type Amount struct {
	Value    int64    `json:"value" firestore:"value"`
	Currency Currency `json:"currency" firestore:"currency"`
}

type Transaction struct {
	ID                string            `json:"id" firestore:"id"`
	HouseholdID       string            `json:"householdId" firestore:"householdId"`
	ActorID           string            `json:"actorId" firestore:"actorId"`
	TransactionType   TransactionType   `json:"transactionType" firestore:"transactionType"`
	TransactionDate   string            `json:"transactionDate" firestore:"transactionDate"` // YYYY-MM-DD
	Amount            int64             `json:"amount" firestore:"amount"`
	Currency          Currency          `json:"currency" firestore:"currency"`
	CategoryID        string            `json:"categoryId,omitempty" firestore:"categoryId,omitempty"`
	PaymentMethodID   string            `json:"paymentMethodId,omitempty" firestore:"paymentMethodId,omitempty"`
	FromAccountID     string            `json:"fromAccountId,omitempty" firestore:"fromAccountId,omitempty"`
	ToAccountID       string            `json:"toAccountId,omitempty" firestore:"toAccountId,omitempty"`
	ExchangeRate      string            `json:"exchangeRate,omitempty" firestore:"exchangeRate,omitempty"`
	ConvertedAmount   int64             `json:"convertedAmount,omitempty" firestore:"convertedAmount,omitempty"`
	ConvertedCurrency Currency          `json:"convertedCurrency,omitempty" firestore:"convertedCurrency,omitempty"`
	MerchantName      string            `json:"merchantName,omitempty" firestore:"merchantName,omitempty"`
	Title             string            `json:"title,omitempty" firestore:"title,omitempty"`
	Memo              string            `json:"memo,omitempty" firestore:"memo,omitempty"`
	Source            TransactionSource `json:"source" firestore:"source"`
	ReceiptID         string            `json:"receiptId,omitempty" firestore:"receiptId,omitempty"`
	RecurringRuleID   string            `json:"recurringRuleId,omitempty" firestore:"recurringRuleId,omitempty"`
	CreatedBy         string            `json:"createdBy" firestore:"createdBy"`
	CreatedAt         time.Time         `json:"createdAt" firestore:"createdAt"`
	UpdatedAt         time.Time         `json:"updatedAt" firestore:"updatedAt"`
}

type Receipt struct {
	ID                string          `json:"id" firestore:"id"`
	HouseholdID       string          `json:"householdId" firestore:"householdId"`
	UploadedBy        string          `json:"uploadedBy" firestore:"uploadedBy"`
	StorageObjectPath string          `json:"storageObjectPath" firestore:"storageObjectPath"`
	OriginalFilename  string          `json:"originalFilename" firestore:"originalFilename"`
	MIMEType          string          `json:"mimeType" firestore:"mimeType"`
	AIUserNote        string          `json:"aiUserNote,omitempty" firestore:"aiUserNote,omitempty"`
	AIStatus          ReceiptAIStatus `json:"aiStatus" firestore:"aiStatus"`
	AIRawJSON         string          `json:"aiRawJson,omitempty" firestore:"aiRawJson,omitempty"`
	CreatedAt         time.Time       `json:"createdAt" firestore:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt" firestore:"updatedAt"`
}

type CandidateWarning struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type TransactionCandidate struct {
	ID                      string               `json:"id" firestore:"id"`
	ReceiptID               string               `json:"receiptId" firestore:"receiptId"`
	SubReceiptID            string               `json:"subReceiptId,omitempty" firestore:"subReceiptId,omitempty"`
	HouseholdID             string               `json:"householdId" firestore:"householdId"`
	SuggestedActorID        string               `json:"suggestedActorId,omitempty" firestore:"suggestedActorId,omitempty"`
	SuggestedType           TransactionType      `json:"suggestedTransactionType" firestore:"suggestedTransactionType"`
	SuggestedDate           string               `json:"suggestedTransactionDate" firestore:"suggestedTransactionDate"`
	SuggestedAmount         int64                `json:"suggestedAmount" firestore:"suggestedAmount"`
	SuggestedCurrency       Currency             `json:"suggestedCurrency" firestore:"suggestedCurrency"`
	SuggestedCategoryID     string               `json:"suggestedCategoryId,omitempty" firestore:"suggestedCategoryId,omitempty"`
	SuggestedPaymentMethodID string              `json:"suggestedPaymentMethodId,omitempty" firestore:"suggestedPaymentMethodId,omitempty"`
	SuggestedFromAccountID  string               `json:"suggestedFromAccountId,omitempty" firestore:"suggestedFromAccountId,omitempty"`
	SuggestedToAccountID    string               `json:"suggestedToAccountId,omitempty" firestore:"suggestedToAccountId,omitempty"`
	ConvertedAmount         int64                `json:"convertedAmount,omitempty" firestore:"convertedAmount,omitempty"`
	ConvertedCurrency       Currency             `json:"convertedCurrency,omitempty" firestore:"convertedCurrency,omitempty"`
	StoreName               string               `json:"storeName,omitempty" firestore:"storeName,omitempty"`
	MerchantName            string               `json:"merchantName,omitempty" firestore:"merchantName,omitempty"`
	AIUserNote              string               `json:"aiUserNote,omitempty" firestore:"aiUserNote,omitempty"`
	Confidence              float64              `json:"confidence" firestore:"confidence"`
	Warnings                []CandidateWarning   `json:"warnings" firestore:"warnings"`
	Status                  CandidateStatus      `json:"status" firestore:"status"`
	CreatedAt               time.Time            `json:"createdAt" firestore:"createdAt"`
	UpdatedAt               time.Time            `json:"updatedAt" firestore:"updatedAt"`
}

type RecurringRule struct {
	ID              string             `json:"id" firestore:"id"`
	HouseholdID     string             `json:"householdId" firestore:"householdId"`
	ActorID         string             `json:"actorId" firestore:"actorId"`
	TransactionType TransactionType    `json:"transactionType" firestore:"transactionType"`
	Title           string             `json:"title" firestore:"title"`
	Amount          int64              `json:"amount" firestore:"amount"`
	Currency        Currency           `json:"currency" firestore:"currency"`
	CategoryID      string             `json:"categoryId,omitempty" firestore:"categoryId,omitempty"`
	PaymentMethodID string             `json:"paymentMethodId,omitempty" firestore:"paymentMethodId,omitempty"`
	FromAccountID   string             `json:"fromAccountId,omitempty" firestore:"fromAccountId,omitempty"`
	ToAccountID     string             `json:"toAccountId,omitempty" firestore:"toAccountId,omitempty"`
	Frequency       RecurringFrequency `json:"frequency" firestore:"frequency"`
	DayOfMonth      int                `json:"dayOfMonth,omitempty" firestore:"dayOfMonth,omitempty"`
	NextRunDate     string             `json:"nextRunDate" firestore:"nextRunDate"` // YYYY-MM-DD
	IsActive        bool               `json:"isActive" firestore:"isActive"`
	Memo            string             `json:"memo,omitempty" firestore:"memo,omitempty"`
	CreatedAt       time.Time          `json:"createdAt" firestore:"createdAt"`
	UpdatedAt       time.Time          `json:"updatedAt" firestore:"updatedAt"`
}

type MonthlyBudget struct {
	ID                    string     `json:"id" firestore:"id"`
	HouseholdID           string     `json:"householdId" firestore:"householdId"`
	Month                 string     `json:"month" firestore:"month"` // YYYY-MM
	ActorScope            ActorScope `json:"actorScope" firestore:"actorScope"`
	ActorID               string     `json:"actorId,omitempty" firestore:"actorId,omitempty"`
	CategoryID            string     `json:"categoryId" firestore:"categoryId"`
	LimitAmount           int64      `json:"limitAmount" firestore:"limitAmount"`
	Currency              Currency   `json:"currency" firestore:"currency"`
	AlertThresholdPercent int        `json:"alertThresholdPercent" firestore:"alertThresholdPercent"`
	RolloverEnabled       bool       `json:"rolloverEnabled" firestore:"rolloverEnabled"`
	IsActive              bool       `json:"isActive" firestore:"isActive"`
	CreatedAt             time.Time  `json:"createdAt" firestore:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt" firestore:"updatedAt"`
}

type BudgetUsageItem struct {
	BudgetID        string  `json:"budgetId"`
	CategoryID      string  `json:"categoryId"`
	LimitAmount     int64   `json:"limitAmount"`
	UsedAmount      int64   `json:"usedAmount"`
	RemainingAmount int64   `json:"remainingAmount"`
	UsagePercent    float64 `json:"usagePercent"`
	Status          string  `json:"status"` // "ok" | "warning" | "over"
}
