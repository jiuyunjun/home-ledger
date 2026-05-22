package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

// createTransactionRequest is the request body for POST /api/transactions.
type createTransactionRequest struct {
	TransactionType   domain.TransactionType `json:"transactionType"`
	TransactionDate   string                 `json:"transactionDate"` // YYYY-MM-DD
	Amount            int64                  `json:"amount"`
	Currency          domain.Currency        `json:"currency"`
	ActorID           string                 `json:"actorId"`
	CategoryID        string                 `json:"categoryId,omitempty"`
	PaymentMethodID   string                 `json:"paymentMethodId,omitempty"`
	FromAccountID     string                 `json:"fromAccountId,omitempty"`
	ToAccountID       string                 `json:"toAccountId,omitempty"`
	ConvertedAmount   int64                  `json:"convertedAmount,omitempty"`
	ConvertedCurrency domain.Currency        `json:"convertedCurrency,omitempty"`
	ExchangeRate      string                 `json:"exchangeRate,omitempty"`
	Title             string                 `json:"title,omitempty"`
	Memo              string                 `json:"memo,omitempty"`
}

func listTransactions(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.Transaction{})
		return
	}

	q := r.URL.Query()
	filter := repo.TxFilter{
		Month:   q.Get("month"),
		ActorID: q.Get("actorId"),
		Type:    q.Get("type"),
	}

	txs, err := repo.ListTransactions(r.Context(), claims.HouseholdID, filter)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, txs)
}

func createTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	var req createTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	if req.Amount <= 0 {
		writeAppError(w, domain.NewValidationError("amount must be positive", "amount"))
		return
	}
	if req.TransactionType == "" {
		writeAppError(w, domain.NewValidationError("transactionType is required", "transactionType"))
		return
	}
	if req.TransactionDate == "" {
		writeAppError(w, domain.NewValidationError("transactionDate is required", "transactionDate"))
		return
	}
	if req.Currency == "" {
		req.Currency = domain.CurrencyJPY
	}

	actorID := req.ActorID
	if actorID == "" {
		actorID = claims.ActorID
	}

	now := time.Now().UTC()
	tx := &domain.Transaction{
		ID:                uuid.NewString(),
		HouseholdID:       claims.HouseholdID,
		ActorID:           actorID,
		TransactionType:   req.TransactionType,
		TransactionDate:   req.TransactionDate,
		Amount:            req.Amount,
		Currency:          req.Currency,
		CategoryID:        req.CategoryID,
		PaymentMethodID:   req.PaymentMethodID,
		FromAccountID:     req.FromAccountID,
		ToAccountID:       req.ToAccountID,
		ConvertedAmount:   req.ConvertedAmount,
		ConvertedCurrency: req.ConvertedCurrency,
		ExchangeRate:      req.ExchangeRate,
		Title:             req.Title,
		Memo:              req.Memo,
		Source:            domain.SourceManual,
		CreatedBy:         claims.UID,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := repo.CreateTransaction(r.Context(), tx); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusCreated, tx)
}

func getTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	txID := chi.URLParam(r, "transactionId")
	tx, err := repo.GetTransaction(r.Context(), txID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if tx == nil || tx.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("transaction"))
		return
	}
	writeJSON(w, http.StatusOK, tx)
}

func patchTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	txID := chi.URLParam(r, "transactionId")
	tx, err := repo.GetTransaction(r.Context(), txID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if tx == nil || tx.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("transaction"))
		return
	}

	var req struct {
		TransactionDate   *string `json:"transactionDate"`
		Amount            *int64  `json:"amount"`
		Title             *string `json:"title"`
		MerchantName      *string `json:"merchantName"`
		Memo              *string `json:"memo"`
		CategoryID        *string `json:"categoryId"`
		PaymentMethodID   *string `json:"paymentMethodId"`
		FromAccountID     *string `json:"fromAccountId"`
		ToAccountID       *string `json:"toAccountId"`
		ConvertedAmount   *int64  `json:"convertedAmount"`
		ConvertedCurrency *string `json:"convertedCurrency"`
		ExchangeRate      *string `json:"exchangeRate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{"updatedAt": time.Now().UTC()}
	if req.TransactionDate != nil {
		updates["transactionDate"] = *req.TransactionDate
	}
	if req.Amount != nil {
		if *req.Amount <= 0 {
			writeAppError(w, domain.NewValidationError("amount must be positive", "amount"))
			return
		}
		updates["amount"] = *req.Amount
	}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.MerchantName != nil {
		updates["merchantName"] = *req.MerchantName
	}
	if req.Memo != nil {
		updates["memo"] = *req.Memo
	}
	if req.CategoryID != nil {
		updates["categoryId"] = *req.CategoryID
	}
	if req.PaymentMethodID != nil {
		updates["paymentMethodId"] = *req.PaymentMethodID
	}
	if req.FromAccountID != nil {
		updates["fromAccountId"] = *req.FromAccountID
	}
	if req.ToAccountID != nil {
		updates["toAccountId"] = *req.ToAccountID
	}
	if req.ConvertedAmount != nil {
		updates["convertedAmount"] = *req.ConvertedAmount
	}
	if req.ConvertedCurrency != nil {
		updates["convertedCurrency"] = *req.ConvertedCurrency
	}
	if req.ExchangeRate != nil {
		updates["exchangeRate"] = *req.ExchangeRate
	}

	if err := repo.UpdateTransaction(r.Context(), txID, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	updated, _ := repo.GetTransaction(r.Context(), txID)
	writeJSON(w, http.StatusOK, updated)
}

func deleteTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	txID := chi.URLParam(r, "transactionId")
	tx, err := repo.GetTransaction(r.Context(), txID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if tx == nil || tx.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("transaction"))
		return
	}

	if err := repo.DeleteTransaction(r.Context(), txID); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
