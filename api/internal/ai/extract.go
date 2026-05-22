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
	Amount       int64  `json:"amount"`       // display units (JPY yen, CNY yuan)
	CategoryName string `json:"categoryName"` // must match allowed category list
}

// ExtractedReceipt holds the fields parsed from one receipt in an image.
type ExtractedReceipt struct {
	MerchantName             string     `json:"merchantName"`
	TransactionDate          string     `json:"transactionDate"`          // YYYY-MM-DD
	Currency                 string     `json:"currency"`                 // JPY | CNY
	TotalAmount              int64      `json:"totalAmount"`              // display units (JPY yen, CNY yuan)
	PaymentHint              string     `json:"paymentHint"`              // cash|paypay|credit_card|unknown
	SuggestedPaymentMethodID string     `json:"suggestedPaymentMethodId"` // matched from provided list
	Confidence               float64    `json:"confidence"`               // 0–1
	LineItems                []LineItem `json:"lineItems"`
}

// ExtractionResult wraps one or more receipts found in the image.
type ExtractionResult struct {
	Receipts []ExtractedReceipt `json:"receipts"`
}

// PaymentMethodHint is passed to ExtractFromImage so the AI can match payment methods.
type PaymentMethodHint struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Type      string `json:"type"`      // cash|paypay|credit_card|bank_account|other
	OwnerName string `json:"ownerName"` // display name of the actor who owns this PM
}

const systemPrompt = `You are a receipt parser for a private household accounting app used in Japan.

First, count the number of physically separate paper receipts in the photo (separate sheets of paper).
Then extract each one independently.

Return ONLY this JSON object — no markdown, no explanation:

{
  "receipts": [
    {
      "merchantName": <string or "">,
      "transactionDate": "YYYY-MM-DD",
      "currency": "JPY",
      "totalAmount": <integer, minor units>,
      "paymentHint": "cash|paypay|credit_card|unknown",
      "suggestedPaymentMethodId": <id string from the provided payment method list, or "" if unknown>,
      "confidence": <0.0-1.0>,
      "lineItems": [
        { "name": <string>, "amount": <integer, minor units>, "categoryName": <string> }
      ]
    }
  ]
}

CRITICAL — receipt splitting:
- Count the distinct physical paper receipts visible. One paper = one element.
- If the photo shows 1 paper receipt → "receipts" has exactly 1 element.
- If the photo shows 2 paper receipts → "receipts" has exactly 2 elements.
- NEVER duplicate a receipt. Each physical paper must appear exactly once.
- NEVER mix line items from different physical receipts into the same element.

Rules (apply independently to each receipt):
- currency: "JPY" if ¥ or 円; "CNY" if 元 or 人民币. Default "JPY".
- totalAmount: final paid total as a positive integer in display units (JPY = integer yen; CNY = integer yuan, NOT fen). Round to the nearest yuan/yen.
- lineItems: one entry per distinct product/service line printed on that receipt.
  If no itemised list is visible, create one item using the total amount.
- amount per item: the final amount the customer actually paid for that item, in integer
  display units (same unit as totalAmount: JPY=yen, CNY=yuan). AFTER applying that item's
  tax and any discounts/coupons. For mixed-tax receipts (e.g. 8% food + 10% other): compute
  each item's tax-inclusive price. For discounts or member-price reductions applied to
  specific items: subtract the discount from that item's amount. For store-wide discounts
  (e.g. 10% off total): distribute proportionally across items.
  CRITICAL: sum(lineItems[].amount) MUST equal totalAmount exactly. If rounding causes a
  1-unit gap, add or subtract 1 from the largest item to make it balance.
- name: translate to simplified Chinese.
  コーヒー→咖啡, ポケモンカード→宝可梦卡片, シャンプー→洗发水, 牛乳→牛奶,
  弁当→便当, チキン→炸鸡, お茶→绿茶. Keep Chinese or English names as-is.
- categoryName must be exactly one of:
    餐饮, 交通, 购物, 娱乐, 水电网, 医疗, 日用品, 房租, 保险, 其他支出
  coffee/food/drink→餐饮; shampoo/detergent/tissue→日用品; train/taxi/bus→交通;
  clothing/electronics/games→购物; electricity/gas/water bill→水电网.
- transactionDate: use the date printed on the receipt. If unclear, use today.
- paymentHint: Suica/PayPay→paypay; VISA/Master→credit_card; 現金→cash; else unknown.
- suggestedPaymentMethodId: match the payment method used on the receipt to the provided list.
  Each payment method has an ownerName indicating which household member owns it.
  Prefer payment methods owned by the uploader (provided separately). Use the "id" of the best match.
  If no list is provided or nothing matches, use "".
- confidence: 1.0=all fields clearly visible; 0.5=partially legible; 0.2=mostly guessing.`

const (
	ModelAccurate = "gpt-5.5"
	ModelFast     = "gpt-5.4-mini-2026-03-17"
)

// ExtractFromImage sends imageData (JPEG/PNG bytes) to OpenAI Vision and returns
// all receipts found in the image. userNote is optional guidance.
// paymentMethods is the household's active payment method list for AI matching.
// model selects the GPT model; use ModelAccurate or ModelFast.
func ExtractFromImage(ctx context.Context, imageData []byte, mimeType, userNote, model string, paymentMethods []PaymentMethodHint) (*ExtractionResult, string, error) {
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
	if len(paymentMethods) > 0 {
		pmJSON, _ := json.Marshal(paymentMethods)
		userContent = append(userContent, map[string]any{
			"type": "text",
			"text": "Available payment methods for this household (match suggestedPaymentMethodId from this list):\n" + string(pmJSON),
		})
	}
	if userNote != "" {
		userContent = append(userContent, map[string]any{
			"type": "text",
			"text": "User hint: " + userNote,
		})
	}

	if model == "" {
		model = ModelAccurate
	}
	payload := map[string]any{
		"model": model,
		"messages": []map[string]any{
			{"role": "user", "content": userContent},
		},
		"max_completion_tokens": 2048,
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

	var result ExtractionResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, content, fmt.Errorf("parse extracted JSON: %w", err)
	}
	if len(result.Receipts) == 0 {
		return nil, content, fmt.Errorf("no receipts extracted")
	}
	return &result, content, nil
}
