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

func listPaymentMethods(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.PaymentMethod{})
		return
	}

	pms, err := repo.ListPaymentMethods(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, pms)
}

func createPaymentMethod(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	var req struct {
		Name          string             `json:"name"`
		Type          domain.AccountType `json:"type"`
		AccountID     string             `json:"accountId"`
		OwnerActorID  string             `json:"ownerActorId"`
		BillingDay    int                `json:"billingDay"`
		SettlementDay int                `json:"settlementDay"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		writeAppError(w, domain.NewValidationError("name is required", "name"))
		return
	}

	now := time.Now().UTC()
	pm := &domain.PaymentMethod{
		ID:            uuid.NewString(),
		HouseholdID:   claims.HouseholdID,
		Name:          req.Name,
		Type:          req.Type,
		AccountID:     req.AccountID,
		OwnerActorID:  req.OwnerActorID,
		BillingDay:    req.BillingDay,
		SettlementDay: req.SettlementDay,
		IsActive:      true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := repo.CreatePaymentMethod(r.Context(), pm); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusCreated, pm)
}

func patchPaymentMethod(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	pmID := chi.URLParam(r, "paymentMethodId")
	pm, err := repo.GetPaymentMethod(r.Context(), pmID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if pm == nil || pm.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("payment method"))
		return
	}

	var req struct {
		Name     *string `json:"name"`
		IsActive *bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{"updatedAt": time.Now().UTC()}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.IsActive != nil {
		updates["isActive"] = *req.IsActive
	}

	if err := repo.UpdatePaymentMethod(r.Context(), pmID, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	updated, _ := repo.GetPaymentMethod(r.Context(), pmID)
	writeJSON(w, http.StatusOK, updated)
}

func deletePaymentMethod(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	pmID := chi.URLParam(r, "paymentMethodId")
	pm, err := repo.GetPaymentMethod(r.Context(), pmID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if pm == nil || pm.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("payment method"))
		return
	}

	if err := repo.DeletePaymentMethod(r.Context(), pmID); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
