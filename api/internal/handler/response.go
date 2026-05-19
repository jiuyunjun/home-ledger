package handler

import (
	"encoding/json"
	"net/http"

	"github.com/home-ledger/api/internal/domain"
)

type envelope struct {
	Data  any            `json:"data"`
	Error *errorPayload  `json:"error"`
}

type errorPayload struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(envelope{Data: data, Error: nil})
}

func writeError(w http.ResponseWriter, status int, appErr *domain.AppError) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(envelope{
		Data: nil,
		Error: &errorPayload{
			Code:    appErr.Code,
			Message: appErr.Message,
			Details: appErr.Details,
		},
	})
}

func writeAppError(w http.ResponseWriter, appErr *domain.AppError) {
	status := appErrorStatus(appErr.Code)
	writeError(w, status, appErr)
}

func appErrorStatus(code string) int {
	switch code {
	case domain.ErrUnauthorized:
		return http.StatusUnauthorized
	case domain.ErrForbidden:
		return http.StatusForbidden
	case domain.ErrNotFound:
		return http.StatusNotFound
	case domain.ErrValidation:
		return http.StatusUnprocessableEntity
	case domain.ErrConflict:
		return http.StatusConflict
	case domain.ErrUploadTooLarge:
		return http.StatusRequestEntityTooLarge
	case domain.ErrUnsupportedFileType:
		return http.StatusUnsupportedMediaType
	default:
		return http.StatusInternalServerError
	}
}

// notImplemented returns a consistent 501 stub for unbuilt endpoints.
func notImplemented(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotImplemented, &domain.AppError{
		Code:    "NOT_IMPLEMENTED",
		Message: "this endpoint is not yet implemented",
	})
}
