package handler

import (
	"fmt"
	"io"
	"net/http"
	"path"

	"github.com/home-ledger/api/internal/ai"
	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
)

const maxAudioBytes = 25 << 20 // 25 MB (Whisper limit)

func voiceEntry(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	if err := r.ParseMultipartForm(maxAudioBytes); err != nil {
		writeAppError(w, domain.NewValidationError("audio file too large or invalid", "audio"))
		return
	}

	file, header, err := r.FormFile("audio")
	if err != nil {
		writeAppError(w, domain.NewValidationError("audio file is required", "audio"))
		return
	}
	defer file.Close()

	audioData, err := io.ReadAll(file)
	if err != nil {
		writeAppError(w, domain.NewInternalError(fmt.Errorf("read audio: %w", err)))
		return
	}

	filename := header.Filename
	if filename == "" || path.Ext(filename) == "" {
		filename = "audio.webm"
	}

	transcript, err := ai.TranscribeAudio(r.Context(), audioData, filename)
	if err != nil {
		writeAppError(w, &domain.AppError{Code: "AI_TRANSCRIPTION_FAILED", Message: err.Error()})
		return
	}
	if transcript == "" {
		writeAppError(w, domain.NewValidationError("could not transcribe audio — try speaking more clearly", "audio"))
		return
	}

	cats, _ := repo.ListCategories(r.Context(), claims.HouseholdID)
	catHints := make([]ai.CategoryHint, 0, len(cats))
	for _, c := range cats {
		catHints = append(catHints, ai.CategoryHint{
			ID:   c.ID,
			Name: c.Name,
			Type: string(c.Type),
		})
	}

	pms, _ := repo.ListPaymentMethods(r.Context(), claims.HouseholdID)
	pmHints := make([]ai.PaymentMethodHint, 0, len(pms))
	for _, pm := range pms {
		if pm.IsActive {
			pmHints = append(pmHints, ai.PaymentMethodHint{
				ID:   pm.ID,
				Name: pm.Name,
				Type: string(pm.Type),
			})
		}
	}

	result, err := ai.ParseVoiceEntry(r.Context(), transcript, catHints, pmHints)
	if err != nil {
		writeAppError(w, &domain.AppError{Code: "AI_PARSE_FAILED", Message: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, result)
}
