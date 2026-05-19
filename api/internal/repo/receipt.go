package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func CreateReceipt(ctx context.Context, r *domain.Receipt) error {
	_, err := fs(ctx).Collection("receipts").Doc(r.ID).Set(ctx, r)
	return err
}

func GetReceipt(ctx context.Context, id string) (*domain.Receipt, error) {
	doc, err := fs(ctx).Collection("receipts").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var r domain.Receipt
	if err := doc.DataTo(&r); err != nil {
		return nil, err
	}
	return &r, nil
}

func UpdateReceipt(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("receipts").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}
