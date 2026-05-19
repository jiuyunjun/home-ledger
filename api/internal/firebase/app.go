// Package firebase initialises the Firebase Admin SDK app singleton.
package firebase

import (
	"context"
	"log/slog"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

var (
	once   sync.Once
	client *auth.Client
)

// AuthClient returns the Firebase Auth client, initialising it on first call.
//
// Credentials are resolved in order:
//  1. GOOGLE_APPLICATION_CREDENTIALS env var (path to service-account JSON)
//  2. Application Default Credentials (Cloud Run, gcloud auth)
func AuthClient(ctx context.Context) *auth.Client {
	once.Do(func() {
		var opts []option.ClientOption

		if cred := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); cred != "" {
			opts = append(opts, option.WithCredentialsFile(cred))
			slog.Info("firebase: using service account file", "path", cred)
		} else {
			slog.Info("firebase: using application default credentials")
		}

		projectID := os.Getenv("FIREBASE_PROJECT_ID")
		cfg := &firebase.Config{ProjectID: projectID}

		app, err := firebase.NewApp(ctx, cfg, opts...)
		if err != nil {
			slog.Error("firebase: failed to init app", "err", err)
			os.Exit(1)
		}

		c, err := app.Auth(ctx)
		if err != nil {
			slog.Error("firebase: failed to get auth client", "err", err)
			os.Exit(1)
		}

		client = c
		slog.Info("firebase: auth client ready")
	})
	return client
}
