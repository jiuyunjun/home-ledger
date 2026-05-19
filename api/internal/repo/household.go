package repo

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func GetHousehold(ctx context.Context, id string) (*domain.Household, error) {
	doc, err := fs(ctx).Collection("households").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var h domain.Household
	if err := doc.DataTo(&h); err != nil {
		return nil, err
	}
	return &h, nil
}

func CreateHousehold(ctx context.Context, h *domain.Household) error {
	_, err := fs(ctx).Collection("households").Doc(h.ID).Set(ctx, h)
	return err
}
