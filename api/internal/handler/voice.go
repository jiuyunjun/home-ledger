package handler

import (
	"fmt"
	"io"
	"net/http"
	"path"
	"time"

	"github.com/google/uuid"
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
		catHints = append(catHints, ai.CategoryHint{ID: c.ID, Name: c.Name, Type: string(c.Type)})
	}

	pms, _ := repo.ListPaymentMethods(r.Context(), claims.HouseholdID)
	actors, _ := repo.ListActors(r.Context(), claims.HouseholdID)
	actorNameVoice := make(map[string]string, len(actors))
	for _, a := range actors {
		actorNameVoice[a.ID] = a.DisplayName
	}
	pmHints := make([]ai.PaymentMethodHint, 0, len(pms))
	validPmIDs := make(map[string]struct{}, len(pms))
	for _, pm := range pms {
		if pm.IsActive {
			pmHints = append(pmHints, ai.PaymentMethodHint{
				ID:        pm.ID,
				Name:      pm.Name,
				Type:      string(pm.Type),
				OwnerName: actorNameVoice[pm.OwnerActorID],
			})
			validPmIDs[pm.ID] = struct{}{}
		}
	}

	callerName := actorNameVoice[claims.ActorID]
	result, err := ai.ParseVoiceEntry(r.Context(), transcript, callerName, catHints, pmHints)
	if err != nil {
		writeAppError(w, &domain.AppError{Code: "AI_PARSE_FAILED", Message: err.Error()})
		return
	}

	// Drop hallucinated PM IDs so the confirm UI shows an empty picker instead.
	if _, ok := validPmIDs[result.PaymentMethodID]; !ok {
		result.PaymentMethodID = ""
	}

	// Multi-item expense: create candidates and send to confirmation flow
	if result.TransactionType == "expense" && len(result.LineItems) > 1 {
		now := time.Now().UTC()
		today := now.In(jstZone).Format("2006-01-02")
		subReceiptID := uuid.NewString()
		currency := domain.Currency(result.Currency)
		if currency == "" {
			currency = domain.CurrencyJPY
		}

		// AI sometimes returns line items whose amounts don't sum to result.Amount.
		// Rebalance the gap onto the largest line so totals stay consistent.
		if result.Amount > 0 {
			var sum int64
			largestIdx := 0
			for i, it := range result.LineItems {
				sum += it.Amount
				if it.Amount > result.LineItems[largestIdx].Amount {
					largestIdx = i
				}
			}
			diff := result.Amount - sum
			if diff != 0 {
				adjusted := result.LineItems[largestIdx].Amount + diff
				if adjusted < 1 {
					adjusted = 1
				}
				result.LineItems[largestIdx].Amount = adjusted
			}
		}

		candidates := make([]*domain.TransactionCandidate, 0, len(result.LineItems))
		for _, item := range result.LineItems {
			c := &domain.TransactionCandidate{
				ID:                       uuid.NewString(),
				ReceiptID:                "",
				SubReceiptID:             subReceiptID,
				HouseholdID:              claims.HouseholdID,
				SuggestedActorID:         claims.ActorID,
				SuggestedType:            domain.TxExpense,
				SuggestedDate:            today,
				SuggestedAmount:          item.Amount,
				SuggestedCurrency:        currency,
				SuggestedCategoryID:      item.CategoryID,
				SuggestedPaymentMethodID: result.PaymentMethodID,
				StoreName:                result.MerchantName,
				MerchantName:             item.Title,
				AIUserNote:               transcript,
				Confidence:               0.85,
				Warnings:                 []domain.CandidateWarning{},
				Status:                   domain.CandidateDraft,
				CreatedAt:                now,
				UpdatedAt:                now,
			}
			if err := repo.CreateCandidate(r.Context(), c); err != nil {
				writeAppError(w, domain.NewInternalError(err))
				return
			}
			candidates = append(candidates, c)
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"mode":       "candidates",
			"candidates": candidates,
			"transcript": transcript,
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}
