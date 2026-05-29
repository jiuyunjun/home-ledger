package repo

import (
	"context"
	"sort"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func ListRecurringRules(ctx context.Context, householdID string) ([]*domain.RecurringRule, error) {
	docs, err := fs(ctx).Collection("recurring_rules").
		Where("householdId", "==", householdID).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	rules := make([]*domain.RecurringRule, 0, len(docs))
	for _, doc := range docs {
		var r domain.RecurringRule
		if err := doc.DataTo(&r); err != nil {
			return nil, err
		}
		rules = append(rules, &r)
	}
	sort.Slice(rules, func(i, j int) bool {
		return rules[i].CreatedAt.Before(rules[j].CreatedAt)
	})
	return rules, nil
}

func CreateRecurringRule(ctx context.Context, r *domain.RecurringRule) error {
	_, err := fs(ctx).Collection("recurring_rules").Doc(r.ID).Set(ctx, r)
	return err
}

func GetRecurringRule(ctx context.Context, id string) (*domain.RecurringRule, error) {
	doc, err := fs(ctx).Collection("recurring_rules").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var r domain.RecurringRule
	if err := doc.DataTo(&r); err != nil {
		return nil, err
	}
	return &r, nil
}

func UpdateRecurringRule(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("recurring_rules").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}

func DeleteRecurringRule(ctx context.Context, id string) error {
	_, err := fs(ctx).Collection("recurring_rules").Doc(id).Delete(ctx)
	return err
}

// ExecuteRecurringRule atomically creates tx and advances the rule's nextRunDate
// to newNextRunDate, but only if the rule is still active and its nextRunDate
// still equals expectedNextRunDate. It returns false (without error) when the
// guard fails — i.e. another writer already advanced the rule or it was paused —
// so callers stop instead of creating a duplicate. Firestore retries the closure
// on contention, and on retry the guard sees the advanced date and skips.
func ExecuteRecurringRule(ctx context.Context, ruleID, expectedNextRunDate, newNextRunDate string, tx *domain.Transaction) (bool, error) {
	client := fs(ctx)
	committed := false
	err := client.RunTransaction(ctx, func(ctx context.Context, t *firestore.Transaction) error {
		committed = false
		ruleRef := client.Collection("recurring_rules").Doc(ruleID)
		snap, err := t.Get(ruleRef)
		if err != nil {
			return err
		}
		var rule domain.RecurringRule
		if err := snap.DataTo(&rule); err != nil {
			return err
		}
		if !rule.IsActive || rule.NextRunDate != expectedNextRunDate {
			return nil
		}
		txRef := client.Collection("transactions").Doc(tx.ID)
		if err := t.Set(txRef, tx); err != nil {
			return err
		}
		if err := t.Update(ruleRef, []firestore.Update{
			{Path: "nextRunDate", Value: newNextRunDate},
			{Path: "updatedAt", Value: tx.CreatedAt},
		}); err != nil {
			return err
		}
		committed = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return committed, nil
}
