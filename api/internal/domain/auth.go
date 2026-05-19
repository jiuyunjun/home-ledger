package domain

import "context"

type contextKey string

const claimsKey contextKey = "claims"

// Claims holds the verified Firebase token claims injected by auth middleware.
type Claims struct {
	UID         string
	Email       string
	HouseholdID string // populated after Firestore user-doc lookup
	ActorID     string // the actor this user maps to in the household
}

func WithClaims(ctx context.Context, c *Claims) context.Context {
	return context.WithValue(ctx, claimsKey, c)
}

func ClaimsFromCtx(ctx context.Context) (*Claims, bool) {
	c, ok := ctx.Value(claimsKey).(*Claims)
	return c, ok && c != nil
}
