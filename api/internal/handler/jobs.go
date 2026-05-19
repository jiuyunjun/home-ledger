package handler

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

// generateRecurringTransactions creates transactions for all active rules whose
// NextRunDate <= today, then advances NextRunDate by one month.
// Called manually or by Cloud Scheduler.
func generateRecurringTransactions(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	rules, err := repo.ListRecurringRules(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	today := time.Now().UTC().Format("2006-01-02")
	now := time.Now().UTC()
	created := 0

	for _, rule := range rules {
		if !rule.IsActive || rule.NextRunDate == "" || rule.NextRunDate > today {
			continue
		}

		tx := &domain.Transaction{
			ID:              uuid.NewString(),
			HouseholdID:     claims.HouseholdID,
			ActorID:         rule.ActorID,
			TransactionType: rule.TransactionType,
			TransactionDate: rule.NextRunDate,
			Amount:          rule.Amount,
			Currency:        rule.Currency,
			CategoryID:      rule.CategoryID,
			PaymentMethodID: rule.PaymentMethodID,
			FromAccountID:   rule.FromAccountID,
			ToAccountID:     rule.ToAccountID,
			Title:           rule.Title,
			Memo:            rule.Memo,
			Source:          domain.SourceRecurring,
			CreatedBy:       claims.UID,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		if err := repo.CreateTransaction(r.Context(), tx); err != nil {
			continue
		}

		nextDate := advanceOneMonth(rule.NextRunDate, rule.DayOfMonth)
		_ = repo.UpdateRecurringRule(r.Context(), rule.ID, map[string]any{
			"nextRunDate": nextDate,
			"updatedAt":   now,
		})
		created++
	}

	writeJSON(w, http.StatusOK, map[string]int{"created": created})
}

// advanceOneMonth returns the target dayOfMonth in the following month.
func advanceOneMonth(dateStr string, dayOfMonth int) string {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return dateStr
	}
	next := time.Date(t.Year(), t.Month()+1, dayOfMonth, 0, 0, 0, 0, time.UTC)
	return next.Format("2006-01-02")
}
