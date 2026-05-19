package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func ListAccounts(ctx context.Context, householdID string) ([]*domain.Account, error) {
	docs, err := fs(ctx).Collection("accounts").
		Where("householdId", "==", householdID).
		OrderBy("createdAt", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	accounts := make([]*domain.Account, 0, len(docs))
	for _, d := range docs {
		var a domain.Account
		if err := d.DataTo(&a); err != nil {
			return nil, err
		}
		accounts = append(accounts, &a)
	}
	return accounts, nil
}

func CreateAccount(ctx context.Context, a *domain.Account) error {
	_, err := fs(ctx).Collection("accounts").Doc(a.ID).Set(ctx, a)
	return err
}

func GetAccount(ctx context.Context, id string) (*domain.Account, error) {
	doc, err := fs(ctx).Collection("accounts").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var a domain.Account
	if err := doc.DataTo(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func UpdateAccount(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("accounts").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}
