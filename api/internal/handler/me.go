package handler

import (
	"net/http"

	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

func getMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	type meResponse struct {
		UID         string `json:"uid"`
		Email       string `json:"email"`
		HouseholdID string `json:"householdId"`
		ActorID     string `json:"actorId"`
		NeedsSetup  bool   `json:"needsSetup"`
	}
	writeJSON(w, http.StatusOK, meResponse{
		UID:         claims.UID,
		Email:       claims.Email,
		HouseholdID: claims.HouseholdID,
		ActorID:     claims.ActorID,
		NeedsSetup:  claims.HouseholdID == "",
	})
}

func getCurrentHousehold(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	household, err := repo.GetHousehold(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if household == nil {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}
	writeJSON(w, http.StatusOK, household)
}
