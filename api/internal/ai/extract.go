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

// LineItem is one product or service from a receipt.
type LineItem struct {
	Name         string `json:"name"`
	Amount       int64  `json:"amount"`       // minor units, same currency as receipt
	CategoryName string `json:"categoryName"` // must match allowed category list
}

// ExtractedReceipt holds the fields parsed from a receipt image.
type ExtractedReceipt struct {
	MerchantName    string     `json:"merchantName"`
	TransactionDate string     `json:"transactionDate"` // YYYY-MM-DD
	Currency        string     `json:"currency"`        // JPY | CNY
	TotalAmount     int64      `json:"totalAmount"`     // minor units
	PaymentHint     string     `json:"paymentHint"`     // cash|paypay|credit_card|unknown
	Confidence      float64    `json:"confidence"`      // 0–1
	LineItems       []LineItem `json:"lineItems"`
}

const systemPrompt = `You are a receipt parser for a private household accounting app used in Japan.

Extract every line item from the receipt and assign each item a category from the allowed list.
Return ONLY this JSON object, no markdown, no explanation:

{
  "merchantName": <string or "">,
  "transactionDate": "YYYY-MM-DD",
  "currency": "JPY",
  "totalAmount": <integer>,
  "paymentHint": "cash|paypay|credit_card|unknown",
  "confidence": <0.0-1.0>,
  "lineItems": [
    { "name": <string>, "amount": <integer>, "categoryName": <string> }
  ]
}

Rules:
- currency: "JPY" if receipt shows ¥ or 円; "CNY" if 元 or 人民币. Default to "JPY".
- totalAmount: the final paid total in minor units (JPY = integer yen; CNY = integer fen where ¥1.00 = 100).
- lineItems: one entry per distinct product or service line on the receipt.
  If the receipt shows no itemised list, create one item using the total amount.
- amount per item: integer minor units matching the receipt currency.
- categoryName for each item must be exactly one of:
    餐饮, 交通, 购物, 娱乐, 水电网, 医疗, 日用品, 房租, 保险, 其他支出
  Examples: coffee / food → 餐饮; shampoo / detergent → 日用品; train / taxi → 交通;
            clothing / electronics → 购物; electricity / gas bill → 水电网.
- transactionDate: use the date printed on the receipt. If unclear, use today.
- paymentHint: infer from logos or text (Suica / PayPay → paypay; VISA/Master → credit_card; 現金 → cash).
- confidence: 1.0 = all fields clearly visible; 0.5 = partially legible; 0.2 = mostly guessing.`

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
		"max_tokens":      1024,
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
