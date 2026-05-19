// Package storage provides Cloud Storage helpers.
package storage

import (
	"context"
	"fmt"
	"io"
	"os"

	gcs "cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

var bucketName = func() string {
	if b := os.Getenv("GCS_BUCKET"); b != "" {
		return b
	}
	return "home-ledger-jiuyun-receipts"
}()

func client(ctx context.Context) (*gcs.Client, error) {
	var opts []option.ClientOption
	if cred := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); cred != "" {
		opts = append(opts, option.WithCredentialsFile(cred))
	}
	return gcs.NewClient(ctx, opts...)
}

// Upload stores data at objectPath and returns the GCS URI.
func Upload(ctx context.Context, objectPath string, r io.Reader, contentType string) (string, error) {
	c, err := client(ctx)
	if err != nil {
		return "", fmt.Errorf("gcs client: %w", err)
	}
	defer c.Close()

	wc := c.Bucket(bucketName).Object(objectPath).NewWriter(ctx)
	wc.ContentType = contentType
	if _, err := io.Copy(wc, r); err != nil {
		return "", fmt.Errorf("gcs write: %w", err)
	}
	if err := wc.Close(); err != nil {
		return "", fmt.Errorf("gcs close: %w", err)
	}
	return fmt.Sprintf("gs://%s/%s", bucketName, objectPath), nil
}

// Download returns the object contents as bytes.
func Download(ctx context.Context, objectPath string) ([]byte, error) {
	c, err := client(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcs client: %w", err)
	}
	defer c.Close()

	rc, err := c.Bucket(bucketName).Object(objectPath).NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcs open: %w", err)
	}
	defer rc.Close()

	data, err := io.ReadAll(rc)
	if err != nil {
		return nil, fmt.Errorf("gcs read: %w", err)
	}
	return data, nil
}
