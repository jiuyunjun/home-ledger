package domain

import "fmt"

// Error codes returned in the JSON envelope.
const (
	ErrUnauthorized           = "UNAUTHORIZED"
	ErrForbidden              = "FORBIDDEN"
	ErrNotFound               = "NOT_FOUND"
	ErrValidation             = "VALIDATION_ERROR"
	ErrUploadTooLarge         = "UPLOAD_TOO_LARGE"
	ErrUnsupportedFileType    = "UNSUPPORTED_FILE_TYPE"
	ErrAIExtractionFailed     = "AI_EXTRACTION_FAILED"
	ErrAIResultInvalid        = "AI_RESULT_INVALID"
	ErrBudgetLimitExceeded    = "BUDGET_LIMIT_EXCEEDED"
	ErrAccountCurrencyMismatch = "ACCOUNT_CURRENCY_MISMATCH"
	ErrTransferAccountInvalid = "TRANSFER_ACCOUNT_INVALID"
	ErrConflict               = "CONFLICT"
	ErrInternal               = "INTERNAL"
)

// AppError is a typed domain error that maps to a specific error code.
type AppError struct {
	Code    string
	Message string
	Details map[string]any
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func NewValidationError(message string, field string) *AppError {
	return &AppError{
		Code:    ErrValidation,
		Message: message,
		Details: map[string]any{"field": field},
	}
}

func NewNotFoundError(resource string) *AppError {
	return &AppError{
		Code:    ErrNotFound,
		Message: resource + " not found",
	}
}

func NewForbiddenError() *AppError {
	return &AppError{Code: ErrForbidden, Message: "access denied"}
}

func NewUnauthorizedError() *AppError {
	return &AppError{Code: ErrUnauthorized, Message: "authentication required"}
}

func NewInternalError(err error) *AppError {
	return &AppError{Code: ErrInternal, Message: err.Error()}
}
