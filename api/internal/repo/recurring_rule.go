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
