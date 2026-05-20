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

func listRecurringRules(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.RecurringRule{})
		return
	}
	rules, err := repo.ListRecurringRules(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, rules)
}

func createRecurringRule(w http.ResponseWriter, r *http.Request) {
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
		TransactionType string `json:"transactionType"`
		Title           string `json:"title"`
		Amount          int64  `json:"amount"`
		Currency        string `json:"currency"`
		CategoryID      string `json:"categoryId"`
		PaymentMethodID string `json:"paymentMethodId"`
		FromAccountID   string `json:"fromAccountId"`
		ToAccountID     string `json:"toAccountId"`
		ActorID         string `json:"actorId"`
		Frequency       string `json:"frequency"`
		DayOfMonth      int    `json:"dayOfMonth"`
		NextRunDate     string `json:"nextRunDate"`
		Memo            string `json:"memo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}
	if req.Title == "" {
		writeAppError(w, domain.NewValidationError("title is required", "title"))
		return
	}
	if req.Amount <= 0 {
		writeAppError(w, domain.NewValidationError("amount must be positive", "amount"))
		return
	}

	actorID := req.ActorID
	if actorID == "" {
		actorID = claims.ActorID
	}
	freq := domain.RecurringFrequency(req.Frequency)
	if freq == "" {
		freq = domain.FreqMonthly
	}

	now := time.Now().UTC()
	rule := &domain.RecurringRule{
		ID:              uuid.NewString(),
		HouseholdID:     claims.HouseholdID,
		ActorID:         actorID,
		TransactionType: domain.TransactionType(req.TransactionType),
		Title:           req.Title,
		Amount:          req.Amount,
		Currency:        domain.Currency(req.Currency),
		CategoryID:      req.CategoryID,
		PaymentMethodID: req.PaymentMethodID,
		FromAccountID:   req.FromAccountID,
		ToAccountID:     req.ToAccountID,
		Frequency:       freq,
		DayOfMonth:      req.DayOfMonth,
		NextRunDate:     req.NextRunDate,
		IsActive:        true,
		Memo:            req.Memo,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := repo.CreateRecurringRule(r.Context(), rule); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusCreated, rule)
}

func patchRecurringRule(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	id := chi.URLParam(r, "ruleId")
	rule, err := repo.GetRecurringRule(r.Context(), id)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if rule == nil || rule.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("recurring-rule"))
		return
	}

	var req struct {
		Title           *string `json:"title"`
		Amount          *int64  `json:"amount"`
		Currency        *string `json:"currency"`
		ActorID         *string `json:"actorId"`
		CategoryID      *string `json:"categoryId"`
		PaymentMethodID *string `json:"paymentMethodId"`
		DayOfMonth      *int    `json:"dayOfMonth"`
		NextRunDate     *string `json:"nextRunDate"`
		IsActive        *bool   `json:"isActive"`
		Memo            *string `json:"memo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{"updatedAt": time.Now().UTC()}
	if req.Title != nil           { updates["title"] = *req.Title }
	if req.Amount != nil          { updates["amount"] = *req.Amount }
	if req.Currency != nil        { updates["currency"] = *req.Currency }
	if req.ActorID != nil         { updates["actorId"] = *req.ActorID }
	if req.CategoryID != nil      { updates["categoryId"] = *req.CategoryID }
	if req.PaymentMethodID != nil { updates["paymentMethodId"] = *req.PaymentMethodID }
	if req.DayOfMonth != nil      { updates["dayOfMonth"] = *req.DayOfMonth }
	if req.NextRunDate != nil     { updates["nextRunDate"] = *req.NextRunDate }
	if req.IsActive != nil        { updates["isActive"] = *req.IsActive }
	if req.Memo != nil            { updates["memo"] = *req.Memo }

	if err := repo.UpdateRecurringRule(r.Context(), id, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	updated, _ := repo.GetRecurringRule(r.Context(), id)
	writeJSON(w, http.StatusOK, updated)
}

func deleteRecurringRule(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	id := chi.URLParam(r, "ruleId")
	rule, err := repo.GetRecurringRule(r.Context(), id)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if rule == nil || rule.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("recurring-rule"))
		return
	}
	if err := repo.DeleteRecurringRule(r.Context(), id); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
