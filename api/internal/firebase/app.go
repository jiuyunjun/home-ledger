// Package firebase initialises the Firebase Admin SDK app singleton.
package firebase

import (
	"context"
	"log/slog"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

var (
	once            sync.Once
	authClient      *auth.Client
	firestoreClient *firestore.Client
)

func init_() {
	once.Do(func() {
		ctx := context.Background()

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

		ac, err := app.Auth(ctx)
		if err != nil {
			slog.Error("firebase: failed to get auth client", "err", err)
			os.Exit(1)
		}
		authClient = ac

		fc, err := app.Firestore(ctx)
		if err != nil {
			slog.Error("firebase: failed to get firestore client", "err", err)
			os.Exit(1)
		}
		firestoreClient = fc

		slog.Info("firebase: clients ready", "project", projectID)
	})
}

// AuthClient returns the Firebase Auth client, initialising on first call.
func AuthClient(_ context.Context) *auth.Client {
	init_()
	return authClient
}

// FirestoreClient returns the Firestore client, initialising on first call.
func FirestoreClient(_ context.Context) *firestore.Client {
	init_()
	return firestoreClient
}
