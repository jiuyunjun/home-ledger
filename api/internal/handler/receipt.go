package handler

import (
	"fmt"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/home-ledger/api/internal/ai"
	"github.com/home-ledger/api/internal/domain"
	"github.com/home-ledger/api/internal/repo"
	"github.com/home-ledger/api/internal/storage"
)

const maxUploadBytes = 10 << 20 // 10 MB after client-side compression

func uploadReceipt(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}
	if claims.HouseholdID == "" {
		writeAppError(w, domain.NewNotFoundError("household"))
		return
	}

	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeAppError(w, &domain.AppError{Code: domain.ErrUploadTooLarge, Message: "file too large (max 10 MB)"})
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		writeAppError(w, domain.NewValidationError("image file is required", "image"))
		return
	}
	defer file.Close()

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}
	if !strings.HasPrefix(mimeType, "image/") {
		writeAppError(w, &domain.AppError{Code: domain.ErrUnsupportedFileType, Message: "only image files are accepted"})
		return
	}

	userNote := r.FormValue("userNote")
	receiptID := uuid.NewString()
	ext := path.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	objectPath := fmt.Sprintf("receipts/%s/%s/original%s", claims.HouseholdID, receiptID, ext)

	gcsURI, err := storage.Upload(r.Context(), objectPath, file, mimeType)
	if err != nil {
		writeAppError(w, domain.NewInternalError(fmt.Errorf("upload to GCS: %w", err)))
		return
	}

	now := time.Now().UTC()
	receipt := &domain.Receipt{
		ID:                receiptID,
		HouseholdID:       claims.HouseholdID,
		UploadedBy:        claims.UID,
		StorageObjectPath: objectPath,
		OriginalFilename:  header.Filename,
		MIMEType:          mimeType,
		AIUserNote:        userNote,
		AIStatus:          domain.ReceiptPending,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateReceipt(r.Context(), receipt); err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}

	_ = gcsURI
	writeJSON(w, http.StatusCreated, receipt)
}

func getReceipt(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	receiptID := chi.URLParam(r, "receiptId")
	receipt, err := repo.GetReceipt(r.Context(), receiptID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if receipt == nil || receipt.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("receipt"))
		return
	}
	writeJSON(w, http.StatusOK, receipt)
}

func extractReceipt(w http.ResponseWriter, r *http.Request) {
	claims, ok := domain.ClaimsFromCtx(r.Context())
	if !ok {
		writeAppError(w, domain.NewUnauthorizedError())
		return
	}

	receiptID := chi.URLParam(r, "receiptId")
	receipt, err := repo.GetReceipt(r.Context(), receiptID)
	if err != nil {
		writeAppError(w, domain.NewInternalError(err))
		return
	}
	if receipt == nil || receipt.HouseholdID != claims.HouseholdID {
		writeAppError(w, domain.NewNotFoundError("receipt"))
		return
	}

	// Download image from GCS.
	imageData, err := storage.Download(r.Context(), receipt.StorageObjectPath)
	if err != nil {
		writeAppError(w, domain.NewInternalError(fmt.Errorf("download from GCS: %w", err)))
		return
	}

	// Call OpenAI.
	extracted, rawJSON, err := ai.ExtractFromImage(r.Context(), imageData, receipt.MIMEType, receipt.AIUserNote)

	now := time.Now().UTC()
	if err != nil {
		_ = repo.UpdateReceipt(r.Context(), receiptID, map[string]any{
			"aiStatus":  string(domain.ReceiptFailed),
			"aiRawJson": rawJSON,
			"updatedAt": now,
		})
		writeAppError(w, &domain.AppError{Code: domain.ErrAIExtractionFailed, Message: err.Error()})
		return
	}

	// Build category name → ID map.
	cats, _ := repo.ListCategories(r.Context(), claims.HouseholdID)
	catByName := make(map[string]string, len(cats))
	for _, c := range cats {
		catByName[c.Name] = c.ID
	}

	txDate := extracted.TransactionDate
	if txDate == "" {
		txDate = now.Format("2006-01-02")
	}
	currency := domain.Currency(extracted.Currency)
	if currency == "" {
		currency = domain.CurrencyJPY
	}

	// Group line items by category, sum amounts per group.
	// If no line items, fall back to one candidate with the total amount.
	type group struct {
		categoryName string
		amount       int64
	}
	groupOrder := []string{}
	groupMap := map[string]*group{}

	for _, item := range extracted.LineItems {
		if item.Amount <= 0 {
			continue
		}
		cat := item.CategoryName
		if cat == "" {
			cat = "其他支出"
		}
		if _, ok := groupMap[cat]; !ok {
			groupOrder = append(groupOrder, cat)
			groupMap[cat] = &group{categoryName: cat}
		}
		groupMap[cat].amount += item.Amount
	}

	// Fall back: one candidate for the total if no usable line items.
	if len(groupOrder) == 0 {
		groupOrder = []string{"其他支出"}
		groupMap["其他支出"] = &group{categoryName: "其他支出", amount: extracted.TotalAmount}
	}

	candidates := make([]*domain.TransactionCandidate, 0, len(groupOrder))
	for _, catName := range groupOrder {
		g := groupMap[catName]
		c := &domain.TransactionCandidate{
			ID:                  uuid.NewString(),
			ReceiptID:           receiptID,
			HouseholdID:         claims.HouseholdID,
			SuggestedActorID:    claims.ActorID,
			SuggestedType:       domain.TxExpense,
			SuggestedDate:       txDate,
			SuggestedAmount:     g.amount,
			SuggestedCurrency:   currency,
			SuggestedCategoryID: catByName[g.categoryName],
			MerchantName:        extracted.MerchantName,
			AIUserNote:          receipt.AIUserNote,
			Confidence:          extracted.Confidence,
			Warnings:            []domain.CandidateWarning{},
			Status:              domain.CandidateDraft,
			CreatedAt:           now,
			UpdatedAt:           now,
		}
		if err := repo.CreateCandidate(r.Context(), c); err != nil {
			writeAppError(w, domain.NewInternalError(err))
			return
		}
		candidates = append(candidates, c)
	}

	_ = repo.UpdateReceipt(r.Context(), receiptID, map[string]any{
		"aiStatus":  string(domain.ReceiptExtracted),
		"aiRawJson": rawJSON,
		"updatedAt": now,
	})

	writeJSON(w, http.StatusCreated, candidates)
}
