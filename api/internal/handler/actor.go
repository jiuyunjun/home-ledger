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

func listActors(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.Actor{})
		return
	}

	actors, err := repo.ListActors(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, actors)
}

func createActor(w http.ResponseWriter, r *http.Request) {
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
		DisplayName string           `json:"displayName"`
		Type        domain.ActorType `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.DisplayName == "" {
		writeAppError(w, domain.NewValidationError("displayName is required", "displayName"))
		return
	}
	if req.Type == "" {
		req.Type = domain.ActorPersonal
	}

	now := time.Now().UTC()
	actor := &domain.Actor{
		ID:          uuid.NewString(),
		HouseholdID: claims.HouseholdID,
		DisplayName: req.DisplayName,
		Type:        req.Type,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := repo.CreateActor(r.Context(), actor); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusCreated, actor)
}

func patchActor(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	actorID := chi.URLParam(r, "actorId")
	actor, err := repo.GetActor(r.Context(), actorID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if actor == nil || actor.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("actor"))
		return
	}

	var req struct {
		DisplayName *string `json:"displayName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{"updatedAt": time.Now().UTC()}
	if req.DisplayName != nil {
		updates["displayName"] = *req.DisplayName
	}

	if err := repo.UpdateActor(r.Context(), actorID, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	updated, _ := repo.GetActor(r.Context(), actorID)
	writeJSON(w, http.StatusOK, updated)
}
