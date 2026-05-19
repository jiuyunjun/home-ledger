package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

// bootstrapRequest is the body for POST /api/households/bootstrap.
type bootstrapRequest struct {
	HouseholdName string `json:"householdName"`
}

// postBootstrap creates a household for a first-time user.
// Idempotent: if the user already has a household, returns it.
func postBootstrap(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	// If user already has a household, just return current data.
	if claims.HouseholdID != "" {
		household, err := repo.GetHousehold(r.Context(), claims.HouseholdID)
		if err != nil {
			writeAppError(w, domain.NewInternalError(err))
			return
		}
		writeJSON(w, http.StatusOK, household)
		return
	}

	var req bootstrapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.HouseholdName = "我的家庭"
	}
	name := strings.TrimSpace(req.HouseholdName)
	if name == "" {
		name = "我的家庭"
	}

	result, err := repo.BootstrapHousehold(r.Context(), claims.UID, claims.Email, name)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	type bootstrapResponse struct {
		Household    *domain.Household `json:"household"`
		SelfActor    *domain.Actor     `json:"selfActor"`
		PartnerActor *domain.Actor     `json:"partnerActor"`
		SharedActor  *domain.Actor     `json:"sharedActor"`
	}
	writeJSON(w, http.StatusCreated, bootstrapResponse{
		Household:    result.Household,
		SelfActor:    result.SelfActor,
		PartnerActor: result.PartnerActor,
		SharedActor:  result.SharedActor,
	})
}

// postJoinHousehold lets a second user join an existing household.
// Body: { "householdId": "...", "actorId": "..." }
// The actorId must belong to the target household and not already be claimed.
func postJoinHousehold(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID != "" {
		writeAppError(w, &domain.AppError{Code: domain.ErrConflict, Message: "already in a household"})
		return
	}

	var req struct {
		HouseholdID string `json:"householdId"`
		ActorID     string `json:"actorId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.HouseholdID == "" || req.ActorID == "" {
		writeAppError(w, domain.NewValidationError("householdId and actorId are required", "householdId"))
		return
	}

	// Verify the household and actor exist.
	household, err := repo.GetHousehold(r.Context(), req.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if household == nil {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	actor, err := repo.GetActor(r.Context(), req.ActorID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if actor == nil || actor.HouseholdID != req.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("actor"))
		return
	}

	// Check actor is not already taken by another user.
	users, err := repo.GetUserByHousehold(r.Context(), req.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	for _, u := range users {
		if u.ActorID == req.ActorID {
			writeAppError(w, &domain.AppError{Code: domain.ErrConflict, Message: "actor already claimed"})
			return
		}
	}

	if err := repo.UpdateUserHousehold(r.Context(), claims.UID, req.HouseholdID, req.ActorID); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, household)
}
