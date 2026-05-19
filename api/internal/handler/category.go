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

func listCategories(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeJSON(w, http.StatusOK, []*domain.Category{})
		return
	}

	cats, err := repo.ListCategories(r.Context(), claims.HouseholdID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusOK, cats)
}

func createCategory(w http.ResponseWriter, r *http.Request) {
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
		Name             string              `json:"name"`
		Type             domain.CategoryType `json:"type"`
		ParentCategoryID string              `json:"parentCategoryId"`
		SortOrder        int                 `json:"sortOrder"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		writeAppError(w, domain.NewValidationError("name is required", "name"))
		return
	}
	if req.Type == "" {
		writeAppError(w, domain.NewValidationError("type is required", "type"))
		return
	}

	now := time.Now().UTC()
	cat := &domain.Category{
		ID:               uuid.NewString(),
		HouseholdID:      claims.HouseholdID,
		Name:             req.Name,
		Type:             req.Type,
		ParentCategoryID: req.ParentCategoryID,
		SortOrder:        req.SortOrder,
		IsDefault:        false,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := repo.CreateCategory(r.Context(), cat); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	writeJSON(w, http.StatusCreated, cat)
}

func patchCategory(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	catID := chi.URLParam(r, "categoryId")
	cat, err := repo.GetCategory(r.Context(), catID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if cat == nil || cat.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("category"))
		return
	}

	var req struct {
		Name      *string `json:"name"`
		SortOrder *int    `json:"sortOrder"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAppError(w, domain.NewValidationError("invalid request body", ""))
		return
	}

	updates := map[string]any{"updatedAt": time.Now().UTC()}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.SortOrder != nil {
		updates["sortOrder"] = *req.SortOrder
	}

	if err := repo.UpdateCategory(r.Context(), catID, updates); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	updated, _ := repo.GetCategory(r.Context(), catID)
	writeJSON(w, http.StatusOK, updated)
}
