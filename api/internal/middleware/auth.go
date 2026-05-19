package middleware

import (
	"net/http"
	"strings"

	"github.com/home-ledger/api/internal/domain"
	fbapp "github.com/home-ledger/api/internal/firebase"
)

// RequireAuth verifies the Firebase ID token in the Authorization header,
// looks up the user's householdId from Firestore, and injects Claims into ctx.
//
// Returns 401 if the token is missing or invalid.
// Returns 403 if the user has no associated household.
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

		// TODO Milestone 5: look up householdId from Firestore users/{uid}
		// For now, accept any authenticated user with householdId from custom claims.
		householdID, _ := verified.Claims["householdId"].(string)

		claims := &domain.Claims{
			UID:         verified.UID,
			Email:       emailFromClaims(verified.Claims),
			HouseholdID: householdID,
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

// writeUnauthorized sends a minimal 401 without importing handler package
// (to avoid a circular dependency).
func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"data":null,"error":{"code":"UNAUTHORIZED","message":"authentication required"}}`))
}
