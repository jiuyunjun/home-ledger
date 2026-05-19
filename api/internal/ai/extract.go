// Package ai provides OpenAI-powered receipt extraction.
package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// ExtractedReceipt holds the fields parsed from a receipt image.
type ExtractedReceipt struct {
	TransactionType string  `json:"transactionType"` // expense | income
	TransactionDate string  `json:"transactionDate"` // YYYY-MM-DD
	Amount          int64   `json:"amount"`          // minor units (JPY=yen, CNY=fen)
	Currency        string  `json:"currency"`        // JPY | CNY
	CategoryName    string  `json:"categoryName"`
	MerchantName    string  `json:"merchantName"`
	Title           string  `json:"title"`
	Confidence      float64 `json:"confidence"` // 0–1
}

const systemPrompt = `You are a financial receipt parser for a household accounting app used in Japan.
Analyze the receipt image and return ONLY a JSON object with these fields:
{
  "transactionType": "expense",
  "transactionDate": "YYYY-MM-DD",
  "amount": <integer minor units>,
  "currency": "JPY",
  "categoryName": <string>,
  "merchantName": <string>,
  "title": <short description>,
  "confidence": <0.0-1.0>
}

Rules:
- transactionType is almost always "expense" for receipts.
- amount: JPY is integer yen (no decimals). CNY is integer fen (¥1.00 = 100 fen).
- currency: "JPY" if amounts show ¥ or 円, "CNY" if 元/人民币.
- transactionDate: use the date shown on the receipt. If unclear, use today's date.
- categoryName must be exactly one of: 餐饮, 交通, 购物, 娱乐, 水电网, 医疗, 日用品, 房租, 保险, 其他支出
- merchantName: the store/restaurant name as shown.
- title: a short human-readable description (e.g. "セブン-イレブン コーヒー").
- confidence: 1.0 = perfectly clear receipt, 0.5 = partially legible, 0.2 = guessing.`

// ExtractFromImage sends imageData (JPEG/PNG bytes) to OpenAI Vision
// and returns parsed receipt fields. userNote is optional guidance.
func ExtractFromImage(ctx context.Context, imageData []byte, mimeType, userNote string) (*ExtractedReceipt, string, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, "", fmt.Errorf("OPENAI_API_KEY not set")
	}

	b64 := base64.StdEncoding.EncodeToString(imageData)
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, b64)

	userContent := []map[string]any{
		{
			"type":      "image_url",
			"image_url": map[string]string{"url": dataURL, "detail": "high"},
		},
		{
			"type": "text",
			"text": systemPrompt,
		},
	}
	if userNote != "" {
		userContent = append(userContent, map[string]any{
			"type": "text",
			"text": "User hint: " + userNote,
		})
	}

	payload := map[string]any{
		"model": "gpt-4o",
		"messages": []map[string]any{
			{"role": "user", "content": userContent},
		},
		"max_tokens":      512,
		"response_format": map[string]string{"type": "json_object"},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("openai request: %w", err)
	}
	defer resp.Body.Close()

	rawBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, string(rawBody), fmt.Errorf("openai status %d: %s", resp.StatusCode, rawBody)
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(rawBody, &apiResp); err != nil || len(apiResp.Choices) == 0 {
		return nil, string(rawBody), fmt.Errorf("parse openai response: %w", err)
	}

	content := strings.TrimSpace(apiResp.Choices[0].Message.Content)

	var extracted ExtractedReceipt
	if err := json.Unmarshal([]byte(content), &extracted); err != nil {
		return nil, content, fmt.Errorf("parse extracted JSON: %w", err)
	}
	return &extracted, content, nil
}
