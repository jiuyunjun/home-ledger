package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/home-ledger/api/internal/middleware"
)

// NewRouter builds and returns the application router with all routes registered.
func NewRouter(allowedOrigins []string) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(allowedOrigins))
	r.Use(chimw.Recoverer)

	r.Get("/healthz", healthz)

	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.RequireAuth)

		// Identity & household
		r.Get("/me", getMe)
		r.Get("/households/current", getCurrentHousehold)
		r.Post("/households/bootstrap", postBootstrap)
		r.Post("/households/join", postJoinHousehold)

		// Actors
		r.Get("/actors", listActors)
		r.Post("/actors", createActor)
		r.Patch("/actors/{actorId}", patchActor)

		// Accounts
		r.Get("/accounts", listAccounts)
		r.Get("/accounts/balances", getAccountBalances)
		r.Post("/accounts", createAccount)
		r.Patch("/accounts/{accountId}", patchAccount)

		// Payment methods
		r.Get("/payment-methods", listPaymentMethods)
		r.Get("/payment-methods/balances", getPaymentMethodBalances)
		r.Post("/payment-methods", createPaymentMethod)
		r.Patch("/payment-methods/{paymentMethodId}", patchPaymentMethod)
		r.Delete("/payment-methods/{paymentMethodId}", deletePaymentMethod)

		// Categories
		r.Get("/categories", listCategories)
		r.Post("/categories", createCategory)
		r.Patch("/categories/{categoryId}", patchCategory)
		r.Delete("/categories/{categoryId}", deleteCategory)

		// Transactions
		r.Get("/transactions", listTransactions)
		r.Post("/transactions", createTransaction)
		r.Get("/transactions/{transactionId}", getTransaction)
		r.Patch("/transactions/{transactionId}", patchTransaction)
		r.Delete("/transactions/{transactionId}", deleteTransaction)

		// Receipt upload + AI extraction
		r.Post("/receipts/upload", uploadReceipt)
		r.Get("/receipts/{receiptId}", getReceipt)
		r.Get("/receipts/{receiptId}/image", getReceiptImage)
		r.Post("/receipts/{receiptId}/extract", extractReceipt)

		// Transaction candidates (AI review)
		r.Get("/transaction-candidates", listCandidates)
		r.Patch("/transaction-candidates/{candidateId}", patchCandidate)
		r.Post("/transaction-candidates/{candidateId}/confirm", confirmCandidate)
		r.Post("/transaction-candidates/{candidateId}/reject", rejectCandidate)

		// Recurring rules (Milestone 10)
		r.Get("/recurring-rules", listRecurringRules)
		r.Post("/recurring-rules", createRecurringRule)
		r.Patch("/recurring-rules/{ruleId}", patchRecurringRule)
		r.Delete("/recurring-rules/{ruleId}", deleteRecurringRule)

		// Monthly budgets (Milestone 11)
		r.Get("/budgets", listBudgets)
		r.Post("/budgets", createBudget)
		r.Patch("/budgets/{budgetId}", patchBudget)
		r.Delete("/budgets/{budgetId}", deleteBudget)
		r.Get("/budgets/usage", getBudgetUsage)

		// Voice entry (AI transcription + parse)
		r.Post("/voice/entry", voiceEntry)

		// Scheduled jobs (Milestone 10)
		r.Post("/jobs/generate-recurring-transactions", generateRecurringTransactions)
	})

	return r
}

func healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
