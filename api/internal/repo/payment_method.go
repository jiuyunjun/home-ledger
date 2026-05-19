package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func ListPaymentMethods(ctx context.Context, householdID string) ([]*domain.PaymentMethod, error) {
	docs, err := fs(ctx).Collection("paymentMethods").
		Where("householdId", "==", householdID).
		OrderBy("createdAt", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	pms := make([]*domain.PaymentMethod, 0, len(docs))
	for _, d := range docs {
		var pm domain.PaymentMethod
		if err := d.DataTo(&pm); err != nil {
			return nil, err
		}
		pms = append(pms, &pm)
	}
	return pms, nil
}

func CreatePaymentMethod(ctx context.Context, pm *domain.PaymentMethod) error {
	_, err := fs(ctx).Collection("paymentMethods").Doc(pm.ID).Set(ctx, pm)
	return err
}

func GetPaymentMethod(ctx context.Context, id string) (*domain.PaymentMethod, error) {
	doc, err := fs(ctx).Collection("paymentMethods").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var pm domain.PaymentMethod
	if err := doc.DataTo(&pm); err != nil {
		return nil, err
	}
	return &pm, nil
}

func UpdatePaymentMethod(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("paymentMethods").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}

func DeletePaymentMethod(ctx context.Context, id string) error {
	_, err := fs(ctx).Collection("paymentMethods").Doc(id).Delete(ctx)
	return err
}
