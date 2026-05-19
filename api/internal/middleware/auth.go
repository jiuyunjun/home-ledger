package middleware

import (
	"net/http"
	"strings"

	"github.com/home-ledger/api/internal/domain"
	fbapp "github.com/home-ledger/api/internal/firebase"
	"github.com/home-ledger/api/internal/repo"
)

// RequireAuth verifies the Firebase ID token, looks up householdId from
// Firestore users/{uid}, and injects Claims into the request context.
//
// Returns 401 if the token is missing or invalid.
// A missing household is allowed — householdId will be empty, letting the
// /api/households/bootstrap endpoint work for first-time users.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearerToken(r)
		if !ok {
			writeUnauthorized(w)
			return
		}

		authClient := fbapp.AuthClient(r.Context())
		verified, err := authClient.VerifyIDToken(r.Context(), token)
		if err != nil {
			writeUnauthorized(w)
			return
		}

		householdID := ""
		actorID := ""
		if u, err := repo.GetUser(r.Context(), verified.UID); err == nil && u != nil {
			householdID = u.HouseholdID
			actorID = u.ActorID
		}

		claims := &domain.Claims{
			UID:         verified.UID,
			Email:       emailFromClaims(verified.Claims),
			HouseholdID: householdID,
			ActorID:     actorID,
		}

		next.ServeHTTP(w, r.WithContext(domain.WithClaims(r.Context(), claims)))
	})
}

func bearerToken(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return "", false
	}
	t := strings.TrimPrefix(h, "Bearer ")
	if t == "" {
		return "", false
	}
	return t, true
}

func emailFromClaims(c map[string]any) string {
	if e, ok := c["email"].(string); ok {
		return e
	}
	return ""
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"data":null,"error":{"code":"UNAUTHORIZED","message":"authentication required"}}`))
}
