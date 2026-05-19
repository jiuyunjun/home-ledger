package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/home-ledger/api/internal/middleware"
)

// NewRouter builds and returns the application router with all routes registered.
// Handlers that are not yet implemented return 501 Not Implemented.
func NewRouter(allowedOrigins []string) http.Handler {
	r := chi.NewRouter()

	// Global middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(allowedOrigins))
	r.Use(chimw.Recoverer)

	// Health check — no auth required
	r.Get("/healthz", healthz)

	// Authenticated API routes
	r.Route("/api", func(r chi.Router) {
		// TODO: mount auth middleware here once Firebase Auth is integrated
		// r.Use(authmw.RequireAuth)

		// Identity & household
		r.Get("/me", notImplemented)
		r.Get("/households/current", notImplemented)

		// Actors
		r.Get("/actors", notImplemented)
		r.Post("/actors", notImplemented)
		r.Patch("/actors/{actorId}", notImplemented)

		// Accounts
		r.Get("/accounts", notImplemented)
		r.Post("/accounts", notImplemented)
		r.Patch("/accounts/{accountId}", notImplemented)

		// Payment methods
		r.Get("/payment-methods", notImplemented)
		r.Post("/payment-methods", notImplemented)
		r.Patch("/payment-methods/{paymentMethodId}", notImplemented)

		// Categories
		r.Get("/categories", notImplemented)
		r.Post("/categories", notImplemented)
		r.Patch("/categories/{categoryId}", notImplemented)

		// Transactions
		r.Get("/transactions", notImplemented)
		r.Post("/transactions", notImplemented)
		r.Get("/transactions/{transactionId}", notImplemented)
		r.Patch("/transactions/{transactionId}", notImplemented)
		r.Delete("/transactions/{transactionId}", notImplemented)

		// Receipt upload + AI extraction
		r.Post("/receipts/upload", notImplemented)
		r.Get("/receipts/{receiptId}", notImplemented)
		r.Post("/receipts/{receiptId}/extract", notImplemented)

		// Transaction candidates (AI review)
		r.Get("/transaction-candidates", notImplemented)
		r.Patch("/transaction-candidates/{candidateId}", notImplemented)
		r.Post("/transaction-candidates/{candidateId}/confirm", notImplemented)
		r.Post("/transaction-candidates/{candidateId}/reject", notImplemented)

		// Recurring rules
		r.Get("/recurring-rules", notImplemented)
		r.Post("/recurring-rules", notImplemented)
		r.Patch("/recurring-rules/{ruleId}", notImplemented)

		// Monthly budgets
		r.Get("/budgets", notImplemented)
		r.Post("/budgets", notImplemented)
		r.Patch("/budgets/{budgetId}", notImplemented)
		r.Get("/budgets/usage", notImplemented)

		// Scheduled jobs (called by Cloud Scheduler)
		r.Post("/jobs/generate-recurring-transactions", notImplemented)
	})

	return r
}

func healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
