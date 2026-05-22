package repo

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/home-ledger/api/internal/domain"
)

func CreateCandidate(ctx context.Context, c *domain.TransactionCandidate) error {
	_, err := fs(ctx).Collection("transactionCandidates").Doc(c.ID).Set(ctx, c)
	return err
}

func GetCandidate(ctx context.Context, id string) (*domain.TransactionCandidate, error) {
	doc, err := fs(ctx).Collection("transactionCandidates").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var c domain.TransactionCandidate
	if err := doc.DataTo(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func ListCandidates(ctx context.Context, householdID string) ([]*domain.TransactionCandidate, error) {
	docs, err := fs(ctx).Collection("transactionCandidates").
		Where("householdId", "==", householdID).
		Where("status", "==", string(domain.CandidateDraft)).
		OrderBy("createdAt", firestore.Desc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	candidates := make([]*domain.TransactionCandidate, 0, len(docs))
	for _, d := range docs {
		var c domain.TransactionCandidate
		if err := d.DataTo(&c); err != nil {
			return nil, err
		}
		candidates = append(candidates, &c)
	}
	return candidates, nil
}

func UpdateCandidate(ctx context.Context, id string, updates map[string]any) error {
	_, err := fs(ctx).Collection("transactionCandidates").Doc(id).Set(ctx, updates, firestore.MergeAll)
	return err
}

// DeleteDraftCandidatesByReceipt removes every draft candidate tied to the given
// receipt — used when the user re-runs extraction on a receipt that already has
// AI-generated drafts. Confirmed/rejected candidates are left alone.
func DeleteDraftCandidatesByReceipt(ctx context.Context, householdID, receiptID string) error {
	docs, err := fs(ctx).Collection("transactionCandidates").
		Where("householdId", "==", householdID).
		Where("receiptId", "==", receiptID).
		Where("status", "==", string(domain.CandidateDraft)).
		Documents(ctx).GetAll()
	if err != nil {
		return err
	}
	if len(docs) == 0 {
		return nil
	}
	batch := fs(ctx).Batch()
	for _, d := range docs {
		batch.Delete(d.Ref)
	}
	_, err = batch.Commit(ctx)
	return err
}
