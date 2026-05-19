package handler

import (
	"net/http"

	"github.com/home-ledger/api/internal/domain"
)

type meResponse struct {
	UID         string `json:"uid"`
	Email       string `json:"email"`
	HouseholdID string `json:"householdId"`
}

func getMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	writeJSON(w, http.StatusOK, meResponse{
		UID:         claims.UID,
		Email:       claims.Email,
		HouseholdID: claims.HouseholdID,
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
	// TODO Milestone 5: fetch full Household doc from Firestore
	writeJSON(w, http.StatusOK, map[string]string{
		"id": claims.HouseholdID,
	})
}
