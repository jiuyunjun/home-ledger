package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
)

// VoiceLineItem is one item within a multi-category voice expense.
type VoiceLineItem struct {
	Title      string `json:"title"`
	CategoryID string `json:"categoryId"`
	Amount     int64  `json:"amount"` // display units (JPY yen, CNY yuan)
}

// VoiceEntryResult is the parsed transaction suggestion from a voice recording.
type VoiceEntryResult struct {
	TransactionType string          `json:"transactionType"` // expense | income | transfer
	Amount          int64           `json:"amount"`          // positive integer display units (JPY yen, CNY yuan)
	Currency        string          `json:"currency"`        // JPY | CNY
	MerchantName    string          `json:"merchantName"`
	Title           string          `json:"title"`
	CategoryID      string          `json:"categoryId"`
	PaymentMethodID string          `json:"paymentMethodId"`
	Memo            string          `json:"memo"`
	Transcript      string          `json:"transcript"`
	LineItems       []VoiceLineItem `json:"lineItems,omitempty"` // set when >1 distinct item
}

// CategoryHint is passed to ParseVoiceEntry for AI category matching.
type CategoryHint struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"` // expense | income
}

// TranscribeAudio converts audio bytes to text via OpenAI Whisper.
func TranscribeAudio(ctx context.Context, audioData []byte, filename string) (string, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("OPENAI_API_KEY not set")
	}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := fw.Write(audioData); err != nil {
		return "", err
	}
	_ = mw.WriteField("model", "whisper-1")
	_ = mw.WriteField("language", "zh")
	mw.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/audio/transcriptions", &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("whisper request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("whisper status %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse whisper response: %w", err)
	}
	return strings.TrimSpace(result.Text), nil
}

const voiceSystemPrompt = `You are a transaction parser for a household accounting app used in Japan.
Parse the user's voice input (already transcribed to text) into a structured transaction.

Return ONLY this JSON object — no markdown, no explanation:
{
  "transactionType": "expense|income|transfer",
  "amount": <positive integer, display units: JPY=yen, CNY=yuan>,
  "currency": "JPY|CNY",
  "merchantName": "<store or payer/payee name, or empty string>",
  "title": "<concise item or purpose in simplified Chinese>",
  "categoryId": "<id from provided category list, or empty string>",
  "paymentMethodId": "<id from provided payment method list, or empty string>",
  "memo": "<any extra context, or empty string>",
  "lineItems": []
}

Rules:
- transactionType: "expense" for spending; "income" for receiving money; "transfer" for moving between own accounts.
- amount: positive integer in display units (JPY=yen integer; CNY=yuan integer, NOT fen).
- currency: "CNY" if 人民币/元/rmb is mentioned; otherwise "JPY".
- merchantName: the store, restaurant, or person name if mentioned.
- title: concise Chinese description of the item/purpose. Translate Japanese to simplified Chinese.
- categoryId: match to the provided category list by semantic meaning. Use "" if unclear.
- paymentMethodId: match to the provided payment method list by name/type hint. Use "" if unclear.
- For income: salary/工资/bonus/报销 → income; received transfer → income.
- For transfer: explicit movement between own accounts → transfer.

lineItems rule (expense only):
- If the user mentions 2 or more DISTINCT items with DIFFERENT categories, populate lineItems:
  [{ "title": "<item name in Chinese>", "categoryId": "<id>", "amount": <integer> }, ...]
  sum(lineItems[].amount) MUST equal amount exactly.
- If there is only one item or all items share the same category, leave lineItems as [].`

// ParseVoiceEntry uses GPT to turn a transcript into a structured transaction suggestion.
func ParseVoiceEntry(ctx context.Context, transcript string, categories []CategoryHint, paymentMethods []PaymentMethodHint) (*VoiceEntryResult, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY not set")
	}

	parts := []string{voiceSystemPrompt, "\nUser said: " + transcript}
	if len(categories) > 0 {
		catsJSON, _ := json.Marshal(categories)
		parts = append(parts, "\nAvailable categories:\n"+string(catsJSON))
	}
	if len(paymentMethods) > 0 {
		pmsJSON, _ := json.Marshal(paymentMethods)
		parts = append(parts, "\nAvailable payment methods:\n"+string(pmsJSON))
	}

	payload := map[string]any{
		"model": ModelFast,
		"messages": []map[string]any{
			{"role": "user", "content": strings.Join(parts, "\n")},
		},
		"max_completion_tokens": 512,
		"response_format":       map[string]string{"type": "json_object"},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai request: %w", err)
	}
	defer resp.Body.Close()

	rawBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai status %d: %s", resp.StatusCode, rawBody)
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(rawBody, &apiResp); err != nil || len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("parse openai response: %w", err)
	}

	var result VoiceEntryResult
	if err := json.Unmarshal([]byte(strings.TrimSpace(apiResp.Choices[0].Message.Content)), &result); err != nil {
		return nil, fmt.Errorf("parse voice JSON: %w", err)
	}
	result.Transcript = transcript
	return &result, nil
}
