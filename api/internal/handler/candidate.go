package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

func listCandidates(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.TransactionCandidate{})
		return
	}

	candidates, err := repo.ListCandidates(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, candidates)
}

func patchCandidate(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	id := chi.URLParam(r, "candidateId")
	c, err := repo.GetCandidate(r.Context(), id)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if c == nil || c.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("candidate"))
		return
	}

	var req struct {
		SuggestedType            *string `json:"suggestedTransactionType"`
		SuggestedDate            *string `json:"suggestedTransactionDate"`
		SuggestedAmount          *int64  `json:"suggestedAmount"`
		SuggestedCurrency        *string `json:"suggestedCurrency"`
		SuggestedCategoryID      *string `json:"suggestedCategoryId"`
		SuggestedActorID         *string `json:"suggestedActorId"`
		SuggestedPaymentMethodID *string `json:"suggestedPaymentMethodId"`
		StoreName                *string `json:"storeName"`
		MerchantName             *string `json:"merchantName"`
		ConvertedAmount          *int64  `json:"convertedAmount"`
		ConvertedCurrency        *string `json:"convertedCurrency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{
		"status":    string(domain.CandidateEdited),
		"updatedAt": time.Now().UTC(),
	}
	if req.SuggestedType != nil            { updates["suggestedTransactionType"]    = *req.SuggestedType }
	if req.SuggestedDate != nil            { updates["suggestedTransactionDate"]    = *req.SuggestedDate }
	if req.SuggestedAmount != nil          { updates["suggestedAmount"]             = *req.SuggestedAmount }
	if req.SuggestedCurrency != nil        { updates["suggestedCurrency"]           = *req.SuggestedCurrency }
	if req.SuggestedCategoryID != nil      { updates["suggestedCategoryId"]         = *req.SuggestedCategoryID }
	if req.SuggestedActorID != nil         { updates["suggestedActorId"]            = *req.SuggestedActorID }
	if req.SuggestedPaymentMethodID != nil { updates["suggestedPaymentMethodId"]    = *req.SuggestedPaymentMethodID }
	if req.StoreName != nil                { updates["storeName"]                   = *req.StoreName }
	if req.MerchantName != nil             { updates["merchantName"]                = *req.MerchantName }
	if req.ConvertedAmount != nil          { updates["convertedAmount"]             = *req.ConvertedAmount }
	if req.ConvertedCurrency != nil        { updates["convertedCurrency"]           = *req.ConvertedCurrency }

	if err := repo.UpdateCandidate(r.Context(), id, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	updated, _ := repo.GetCandidate(r.Context(), id)
	writeJSON(w, http.StatusOK, updated)
}

func confirmCandidate(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	id := chi.URLParam(r, "candidateId")
	c, err := repo.GetCandidate(r.Context(), id)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if c == nil || c.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("candidate"))
		return
	}

	now := time.Now().UTC()
	actorID := c.SuggestedActorID
	if actorID == "" {
		actorID = claims.ActorID
	}

	tx := &domain.Transaction{
		ID:                uuid.NewString(),
		HouseholdID:       claims.HouseholdID,
		ActorID:           actorID,
		TransactionType:   c.SuggestedType,
		TransactionDate:   c.SuggestedDate,
		Amount:            c.SuggestedAmount,
		Currency:          c.SuggestedCurrency,
		ConvertedAmount:   c.ConvertedAmount,
		ConvertedCurrency: c.ConvertedCurrency,
		CategoryID:        c.SuggestedCategoryID,
		PaymentMethodID:   c.SuggestedPaymentMethodID,
		MerchantName:      c.StoreName,
		Title:             c.MerchantName,
		Source:            domain.SourceAIReceipt,
		ReceiptID:         c.ReceiptID,
		CreatedBy:         claims.UID,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateTransaction(r.Context(), tx); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	_ = repo.UpdateCandidate(r.Context(), id, map[string]any{
		"status":    string(domain.CandidateConfirmed),
		"updatedAt": now,
	})
	_ = repo.UpdateReceipt(r.Context(), c.ReceiptID, map[string]any{
		"aiStatus":  string(domain.ReceiptConfirmed),
		"updatedAt": now,
	})

	writeJSON(w, http.StatusCreated, tx)
}

func rejectCandidate(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	id := chi.URLParam(r, "candidateId")
	c, err := repo.GetCandidate(r.Context(), id)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if c == nil || c.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("candidate"))
		return
	}

	now := time.Now().UTC()
	_ = repo.UpdateCandidate(r.Context(), id, map[string]any{
		"status":    string(domain.CandidateRejected),
		"updatedAt": now,
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}
