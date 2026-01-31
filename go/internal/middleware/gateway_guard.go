package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"

	"github.com/gofiber/fiber/v2"

	"ppsmb-file-manager-server/internal/config"
)

const (
	HeaderInternalGateway  = "X-Internal-Gateway"
	HeaderGatewaySignature = "X-Gateway-Signature"
	HeaderGatewayTimestamp = "X-Gateway-Timestamp"
	GatewayIdentifier      = "nitro"
)

// GatewayGuard creates middleware that enforces Nitro gateway trust
// Rejects ALL requests unless they originate from the trusted gateway
func GatewayGuard(cfg *config.SecurityConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check gateway identifier
		gateway := c.Get(HeaderInternalGateway)
		if gateway != GatewayIdentifier {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "forbidden",
				"code":  "GATEWAY_REQUIRED",
			})
		}

		// Get and validate signature
		signature := c.Get(HeaderGatewaySignature)
		if signature == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "forbidden",
				"code":  "SIGNATURE_REQUIRED",
			})
		}

		// Get timestamp for replay protection
		timestamp := c.Get(HeaderGatewayTimestamp)
		if timestamp == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "forbidden",
				"code":  "TIMESTAMP_REQUIRED",
			})
		}

		// Build canonical request string for signature verification
		canonicalRequest := buildCanonicalRequest(c, timestamp)

		// Compute expected signature
		expectedSignature := computeHMACSHA256(canonicalRequest, cfg.InternalSecret)

		// Constant-time comparison to prevent timing attacks
		providedBytes, err := hex.DecodeString(signature)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "forbidden",
				"code":  "INVALID_SIGNATURE_FORMAT",
			})
		}

		if subtle.ConstantTimeCompare(providedBytes, expectedSignature) != 1 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "forbidden",
				"code":  "SIGNATURE_MISMATCH",
			})
		}

		return c.Next()
	}
}

// buildCanonicalRequest creates a deterministic string from request components
func buildCanonicalRequest(c *fiber.Ctx, timestamp string) string {
	// Include: method, path, timestamp, and security-critical headers
	method := c.Method()
	path := c.Path()

	// Sort query parameters for deterministic ordering
	queryParams := c.Queries()
	sortedKeys := make([]string, 0, len(queryParams))
	for k := range queryParams {
		sortedKeys = append(sortedKeys, k)
	}
	sort.Strings(sortedKeys)

	var queryParts []string
	for _, k := range sortedKeys {
		queryParts = append(queryParts, fmt.Sprintf("%s=%s", k, queryParams[k]))
	}
	queryString := strings.Join(queryParts, "&")

	// Include user identity headers if present
	userUUID := c.Get("X-User-UUID")
	sessionToken := c.Get("X-Session-Token")

	return fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		method,
		path,
		queryString,
		timestamp,
		userUUID,
		sessionToken,
	)
}

// computeHMACSHA256 computes HMAC-SHA256 of message with key
func computeHMACSHA256(message string, key []byte) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(message))
	return mac.Sum(nil)
}
