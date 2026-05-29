package handler

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

// maxCatchUpMonths caps the fast-forward loop, guarding against runaway loops on
// malformed dates.
const maxCatchUpMonths = 600

// generateRecurringTransactions auto-posts a rule's occurrence only when its
// stored NextRunDate falls in the current month and its day has arrived
// (monthStart <= NextRunDate <= today, JST), then advances NextRunDate to next
// month. A rule whose NextRunDate is in a PRIOR month (stale, or a month the app
// wasn't opened) is fast-forwarded to the current month WITHOUT posting — we
// never back-fill or surprise-create history, which also makes the very first
// run after deploy safe (every legacy rule's date is normalized, nothing posted).
// The create+advance is atomic (see repo.ExecuteRecurringRule), so repeated or
// concurrent calls never double-post. The frontend triggers it on load.
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

	now := time.Now().In(jstZone)
	today := now.Format("2006-01-02")
	monthStart := now.Format("2006-01") + "-01"
	created := 0

	for _, rule := range rules {
		if !rule.IsActive || rule.NextRunDate == "" {
			continue
		}
		nrd := rule.NextRunDate

		switch {
		case nrd >= monthStart && nrd <= today:
			// Stored occurrence is in the current month and its day has arrived →
			// post it once and advance to next month.
			newNext := advanceOneMonth(nrd, rule.DayOfMonth)
			tx := buildRecurringTx(rule, nrd, claims.HouseholdID, claims.UID)
			ok, err := repo.ExecuteRecurringRule(r.Context(), rule.ID, nrd, newNext, tx)
			if err == nil && ok {
				created++
			}
		case nrd < monthStart:
			// Prior-month / stale → fast-forward to the current month WITHOUT
			// posting (never back-fill); the normalized date then surfaces as
			// pending so the user can decide.
			ff := nrd
			for i := 0; i < maxCatchUpMonths && ff < monthStart; i++ {
				ff = advanceOneMonth(ff, rule.DayOfMonth)
			}
			if ff != nrd {
				_ = repo.UpdateRecurringRule(r.Context(), rule.ID, map[string]any{
					"nextRunDate": ff,
					"updatedAt":   now.UTC(),
				})
			}
		// default: nrd > today (upcoming this month or later) → nothing to do.
		}
	}

	writeJSON(w, http.StatusOK, map[string]int{"created": created})
}

// buildRecurringTx constructs the transaction a rule produces on the given date.
func buildRecurringTx(rule *domain.RecurringRule, date, householdID, uid string) *domain.Transaction {
	now := time.Now().UTC()
	return &domain.Transaction{
		ID:              uuid.NewString(),
		HouseholdID:     householdID,
		ActorID:         rule.ActorID,
		TransactionType: rule.TransactionType,
		TransactionDate: date,
		Amount:          rule.Amount,
		Currency:        rule.Currency,
		CategoryID:      rule.CategoryID,
		PaymentMethodID: rule.PaymentMethodID,
		FromAccountID:   rule.FromAccountID,
		ToAccountID:     rule.ToAccountID,
		Title:           rule.Title,
		Memo:            rule.Memo,
		Source:          domain.SourceRecurring,
		RecurringRuleID: rule.ID,
		CreatedBy:       uid,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

// advanceOneMonth returns the target dayOfMonth in the following month, clamped
// to that month's last day so day 31 doesn't overflow into the next month.
func advanceOneMonth(dateStr string, dayOfMonth int) string {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return dateStr
	}
	year, month := t.Year(), t.Month()+1
	if month > 12 {
		year++
		month = 1
	}
	if dayOfMonth < 1 {
		dayOfMonth = t.Day()
	}
	// Last day of target month = day 0 of the month after.
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if dayOfMonth > lastDay {
		dayOfMonth = lastDay
	}
	next := time.Date(year, month, dayOfMonth, 0, 0, 0, 0, time.UTC)
	return next.Format("2006-01-02")
}
