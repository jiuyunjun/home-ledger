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

func getAccountBalances(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, map[string]int64{})
		return
	}

	accounts, err := repo.ListAccounts(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	pms, err := repo.ListPaymentMethods(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	txs, err := repo.ListTransactions(r.Context(), claims.HouseholdID, repo.TxFilter{})
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	pmToAcct := make(map[string]string, len(pms))
	for _, pm := range pms {
		pmToAcct[pm.ID] = pm.AccountID
	}

	delta := make(map[string]int64)
	for _, tx := range txs {
		switch tx.TransactionType {
		case domain.TxExpense:
			if acctID := pmToAcct[tx.PaymentMethodID]; acctID != "" {
				delta[acctID] -= tx.Amount
			}
		case domain.TxIncome:
			if acctID := pmToAcct[tx.PaymentMethodID]; acctID != "" {
				delta[acctID] += tx.Amount
			}
		case domain.TxTransfer:
			if tx.FromAccountID != "" {
				delta[tx.FromAccountID] -= tx.Amount
			}
			if tx.ToAccountID != "" {
				delta[tx.ToAccountID] += tx.Amount
			}
		}
	}

	result := make(map[string]int64, len(accounts))
	for _, a := range accounts {
		result[a.ID] = a.OpeningBalance + delta[a.ID]
	}
	writeJSON(w, http.StatusOK, result)
}

func listAccounts(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.Account{})
		return
	}

	accounts, err := repo.ListAccounts(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, accounts)
}

func createAccount(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	var req struct {
		Name           string             `json:"name"`
		Type           domain.AccountType `json:"type"`
		Currency       domain.Currency    `json:"currency"`
		OwnerActorID   string             `json:"ownerActorId"`
		OpeningBalance int64              `json:"openingBalance"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		writeAppError(w, domain.NewValidationError("name is required", "name"))
		return
	}

	now := time.Now().UTC()
	account := &domain.Account{
		ID:             uuid.NewString(),
		HouseholdID:    claims.HouseholdID,
		Name:           req.Name,
		Type:           req.Type,
		Currency:       req.Currency,
		OwnerActorID:   req.OwnerActorID,
		OpeningBalance: req.OpeningBalance,
		CurrentBalance: req.OpeningBalance,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := repo.CreateAccount(r.Context(), account); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusCreated, account)
}

func patchAccount(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	accountID := chi.URLParam(r, "accountId")
	account, err := repo.GetAccount(r.Context(), accountID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if account == nil || account.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("account"))
		return
	}

	var req struct {
		Name     *string `json:"name"`
		IsActive *bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{"updatedAt": time.Now().UTC()}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.IsActive != nil {
		updates["isActive"] = *req.IsActive
	}

	if err := repo.UpdateAccount(r.Context(), accountID, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	updated, _ := repo.GetAccount(r.Context(), accountID)
	writeJSON(w, http.StatusOK, updated)
}
