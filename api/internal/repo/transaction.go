package repo

import (
	"context"
	"strings"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

// TxFilter holds optional filters for ListTransactions.
type TxFilter struct {
	Month   string // YYYY-MM, empty = no filter
	ActorID string // empty = all actors
	Type    string // "expense"|"income"|"transfer"|"" = all
}

func ListTransactions(ctx context.Context, householdID string, f TxFilter) ([]*domain.Transaction, error) {
	q := fs(ctx).Collection("transactions").
		Where("householdId", "==", householdID).
		OrderBy("transactionDate", firestore.Desc)

	if f.ActorID != "" {
		q = q.Where("actorId", "==", f.ActorID)
	}
	if f.Type != "" {
		q = q.Where("transactionType", "==", f.Type)
	}

	docs, err := q.Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}

	txs := make([]*domain.Transaction, 0, len(docs))
	for _, d := range docs {
		var tx domain.Transaction
		if err := d.DataTo(&tx); err != nil {
			return nil, err
		}
		// Filter by month client-side (Firestore can't do prefix match on a string field).
		if f.Month != "" && !strings.HasPrefix(tx.TransactionDate, f.Month) {
			continue
		}
		txs = append(txs, &tx)
	}
	return txs, nil
}

func CreateTransaction(ctx context.Context, tx *domain.Transaction) error {
	_, err := fs(ctx).Collection("transactions").Doc(tx.ID).Set(ctx, tx)
	return err
}

func GetTransaction(ctx context.Context, id string) (*domain.Transaction, error) {
	doc, err := fs(ctx).Collection("transactions").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var tx domain.Transaction
	if err := doc.DataTo(&tx); err != nil {
		return nil, err
	}
	return &tx, nil
}

func UpdateTransaction(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("transactions").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}

func DeleteTransaction(ctx context.Context, id string) error {
	_, err := fs(ctx).Collection("transactions").Doc(id).Delete(ctx)
	return err
}
