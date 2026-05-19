// Package repo provides Firestore-backed data access.
package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	fbapp "github.com/home-ledger/api/internal/firebase"
)

func fs(ctx context.Context) *firestore.Client {
	return fbapp.FirestoreClient(ctx)
}
