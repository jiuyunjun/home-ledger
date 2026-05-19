package repo

import (
	"context"
	"errors"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func GetUser(ctx context.Context, uid string) (*domain.UserRecord, error) {
	doc, err := fs(ctx).Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var u domain.UserRecord
	if err := doc.DataTo(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func CreateUser(ctx context.Context, u *domain.UserRecord) error {
	_, err := fs(ctx).Collection("users").Doc(u.UID).Set(ctx, u)
	return err
}

// GetUserByHousehold returns all users in a household (for invite lookup).
func GetUserByHousehold(ctx context.Context, householdID string) ([]*domain.UserRecord, error) {
	docs, err := fs(ctx).Collection("users").
		Where("householdId", "==", householdID).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	users := make([]*domain.UserRecord, 0, len(docs))
	for _, d := range docs {
		var u domain.UserRecord
		if err := d.DataTo(&u); err != nil {
			return nil, err
		}
		users = append(users, &u)
	}
	return users, nil
}

// UpdateUserHousehold sets the householdId and actorId on an existing user record.
func UpdateUserHousehold(ctx context.Context, uid, householdID, actorID string) error {
	_, err := fs(ctx).Collection("users").Doc(uid).Set(ctx, map[string]any{
		"householdId": householdID,
		"actorId":     actorID,
	}, firestore.MergeAll)
	return err
}

// ErrUserNotFound is a sentinel so callers can distinguish "not found" from errors.
var ErrUserNotFound = errors.New("user not found")
