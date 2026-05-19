package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func ListCategories(ctx context.Context, householdID string) ([]*domain.Category, error) {
	docs, err := fs(ctx).Collection("categories").
		Where("householdId", "==", householdID).
		OrderBy("sortOrder", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	cats := make([]*domain.Category, 0, len(docs))
	for _, d := range docs {
		var c domain.Category
		if err := d.DataTo(&c); err != nil {
			return nil, err
		}
		cats = append(cats, &c)
	}
	return cats, nil
}

func CreateCategory(ctx context.Context, c *domain.Category) error {
	_, err := fs(ctx).Collection("categories").Doc(c.ID).Set(ctx, c)
	return err
}

func GetCategory(ctx context.Context, id string) (*domain.Category, error) {
	doc, err := fs(ctx).Collection("categories").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var c domain.Category
	if err := doc.DataTo(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func UpdateCategory(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("categories").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}
