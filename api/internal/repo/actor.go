package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func ListActors(ctx context.Context, householdID string) ([]*domain.Actor, error) {
	docs, err := fs(ctx).Collection("actors").
		Where("householdId", "==", householdID).
		OrderBy("createdAt", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	actors := make([]*domain.Actor, 0, len(docs))
	for _, d := range docs {
		var a domain.Actor
		if err := d.DataTo(&a); err != nil {
			return nil, err
		}
		actors = append(actors, &a)
	}
	return actors, nil
}

func CreateActor(ctx context.Context, a *domain.Actor) error {
	_, err := fs(ctx).Collection("actors").Doc(a.ID).Set(ctx, a)
	return err
}

func GetActor(ctx context.Context, id string) (*domain.Actor, error) {
	doc, err := fs(ctx).Collection("actors").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var a domain.Actor
	if err := doc.DataTo(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func UpdateActor(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("actors").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}
