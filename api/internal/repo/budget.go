package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func CreateBudget(ctx context.Context, b *domain.MonthlyBudget) error {
	_, err := fs(ctx).Collection("monthlyBudgets").Doc(b.ID).Set(ctx, b)
	return err
}

func GetBudget(ctx context.Context, id string) (*domain.MonthlyBudget, error) {
	doc, err := fs(ctx).Collection("monthlyBudgets").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var b domain.MonthlyBudget
	if err := doc.DataTo(&b); err != nil {
		return nil, err
	}
	return &b, nil
}

func ListBudgets(ctx context.Context, householdID, month string) ([]*domain.MonthlyBudget, error) {
	docs, err := fs(ctx).Collection("monthlyBudgets").
		Where("householdId", "==", householdID).
		Where("month", "==", month).
		OrderBy("createdAt", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	budgets := make([]*domain.MonthlyBudget, 0, len(docs))
	for _, d := range docs {
		var b domain.MonthlyBudget
		if err := d.DataTo(&b); err != nil {
			return nil, err
		}
		budgets = append(budgets, &b)
	}
	return budgets, nil
}

func UpdateBudget(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("monthlyBudgets").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}
