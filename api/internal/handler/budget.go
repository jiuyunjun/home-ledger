package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

func currentMonth() string {
	return time.Now().UTC().Format("2006-01")
}

func listBudgets(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.MonthlyBudget{})
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = currentMonth()
	}

	budgets, err := repo.ListBudgets(r.Context(), claims.HouseholdID, month)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, budgets)
}

func createBudget(w http.ResponseWriter, r *http.Request) {
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
		Month                 string `json:"month"`
		ActorScope            string `json:"actorScope"`
		ActorID               string `json:"actorId"`
		CategoryID            string `json:"categoryId"`
		LimitAmount           int64  `json:"limitAmount"`
		Currency              string `json:"currency"`
		AlertThresholdPercent int    `json:"alertThresholdPercent"`
		RolloverEnabled       bool   `json:"rolloverEnabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}
	if req.CategoryID == "" {
		writeAppError(w, domain.NewValidationError("categoryId is required", "categoryId"))
		return
	}
	if req.LimitAmount <= 0 {
		writeAppError(w, domain.NewValidationError("limitAmount must be positive", "limitAmount"))
		return
	}

	month := req.Month
	if month == "" {
		month = currentMonth()
	}
	actorScope := domain.ActorScope(req.ActorScope)
	if actorScope == "" {
		actorScope = domain.ScopeHousehold
	}
	currency := domain.Currency(req.Currency)
	if currency == "" {
		currency = domain.CurrencyJPY
	}
	threshold := req.AlertThresholdPercent
	if threshold == 0 {
		threshold = 80
	}

	now := time.Now().UTC()
	b := &domain.MonthlyBudget{
		ID:                    uuid.NewString(),
		HouseholdID:           claims.HouseholdID,
		Month:                 month,
		ActorScope:            actorScope,
		ActorID:               req.ActorID,
		CategoryID:            req.CategoryID,
		LimitAmount:           req.LimitAmount,
		Currency:              currency,
		AlertThresholdPercent: threshold,
		RolloverEnabled:       req.RolloverEnabled,
		IsActive:              true,
		CreatedAt:             now,
		UpdatedAt:             now,
	}
	if err := repo.CreateBudget(r.Context(), b); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusCreated, b)
}

func patchBudget(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	id := chi.URLParam(r, "budgetId")
	b, err := repo.GetBudget(r.Context(), id)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if b == nil || b.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("budget"))
		return
	}

	var req struct {
		LimitAmount           *int64  `json:"limitAmount"`
		AlertThresholdPercent *int    `json:"alertThresholdPercent"`
		RolloverEnabled       *bool   `json:"rolloverEnabled"`
		IsActive              *bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{"updatedAt": time.Now().UTC()}
	if req.LimitAmount != nil           { updates["limitAmount"]           = *req.LimitAmount }
	if req.AlertThresholdPercent != nil { updates["alertThresholdPercent"] = *req.AlertThresholdPercent }
	if req.RolloverEnabled != nil       { updates["rolloverEnabled"]       = *req.RolloverEnabled }
	if req.IsActive != nil              { updates["isActive"]              = *req.IsActive }

	if err := repo.UpdateBudget(r.Context(), id, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	updated, _ := repo.GetBudget(r.Context(), id)
	writeJSON(w, http.StatusOK, updated)
}

func deleteBudget(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	id := chi.URLParam(r, "budgetId")
	b, err := repo.GetBudget(r.Context(), id)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if b == nil || b.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("budget"))
		return
	}

	if err := repo.DeleteBudget(r.Context(), id); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func getBudgetUsage(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, map[string]any{"month": currentMonth(), "items": []any{}})
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = currentMonth()
	}

	budgets, err := repo.ListBudgets(r.Context(), claims.HouseholdID, month)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	// Fetch all transactions for the month and filter expenses in Go to avoid composite index.
	txs, err := repo.ListTransactions(r.Context(), claims.HouseholdID, repo.TxFilter{Month: month})
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	// Build per-category spend maps (expenses only).
	catTotals := map[string]int64{}      // household-wide, keyed by categoryId
	actorCatTotals := map[string]int64{} // keyed by "actorId:categoryId"
	for _, tx := range txs {
		if tx.TransactionType != domain.TxExpense {
			continue
		}
		catTotals[tx.CategoryID] += tx.Amount
		actorCatTotals[fmt.Sprintf("%s:%s", tx.ActorID, tx.CategoryID)] += tx.Amount
	}

	items := make([]domain.BudgetUsageItem, 0, len(budgets))
	for _, b := range budgets {
		if !b.IsActive {
			continue
		}
		var used int64
		switch b.ActorScope {
		case domain.ScopeActor:
			used = actorCatTotals[fmt.Sprintf("%s:%s", b.ActorID, b.CategoryID)]
		default: // household or all
			used = catTotals[b.CategoryID]
		}

		remaining := b.LimitAmount - used
		pct := 0.0
		if b.LimitAmount > 0 {
			pct = float64(used) / float64(b.LimitAmount) * 100
		}
		threshold := float64(b.AlertThresholdPercent)

		statusStr := "ok"
		if pct >= 100 {
			statusStr = "over"
		} else if pct >= threshold {
			statusStr = "warning"
		}

		items = append(items, domain.BudgetUsageItem{
			BudgetID:        b.ID,
			CategoryID:      b.CategoryID,
			LimitAmount:     b.LimitAmount,
			UsedAmount:      used,
			RemainingAmount: remaining,
			UsagePercent:    pct,
			Status:          statusStr,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"month": month, "items": items})
}
