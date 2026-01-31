package middleware

import (
	"crypto/subtle"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"ppsmb-file-manager-server/internal/config"
)

const (
	HeaderAuthorization = "Authorization"
	HeaderUserUUID      = "X-User-UUID"
	HeaderSessionToken  = "X-Session-Token"
	BearerPrefix        = "Bearer "
)

// UserClaims represents the nested user object in JWT
type UserClaims struct {
	UUID     string `json:"uuid"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Name     string `json:"name"`
	DeviceID string `json:"deviceId"`
}

// TokenClaims represents the expected JWT claims
// Matches the payload structure from createSession.ts
type TokenClaims struct {
	SessionID string     `json:"sessionId"`
	CID       string     `json:"cid"`
	User      UserClaims `json:"user"`
	jwt.RegisteredClaims
}

// AuthContext holds authenticated user information
type AuthContext struct {
	UserUUID  string
	SessionID string
}

var (
	ErrMissingToken     = errors.New("missing authorization token")
	ErrInvalidToken     = errors.New("invalid authorization token")
	ErrTokenExpired     = errors.New("token has expired")
	ErrInvalidClaims    = errors.New("invalid token claims")
	ErrBindingMismatch  = errors.New("cryptographic binding mismatch")
	ErrMissingUserUUID  = errors.New("missing X-User-UUID header")
	ErrMissingSessionID = errors.New("missing X-Session-Token header")
)

// AuthMiddleware creates middleware that verifies JWT and enforces cryptographic binding
func AuthMiddleware(cfg *config.SecurityConfig, limiters *RateLimiters) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract token from Authorization header
		authHeader := c.Get(HeaderAuthorization)
		if authHeader == "" {
			return unauthorizedResponse(c, ErrMissingToken)
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			return unauthorizedResponse(c, ErrInvalidToken)
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		if tokenString == "" {
			return unauthorizedResponse(c, ErrMissingToken)
		}

		// Verify JWT token
		claims, err := verifyToken(tokenString, cfg.JWTSecret)
		if err != nil {
			return unauthorizedResponse(c, err)
		}

		// Get gateway-forwarded headers
		headerUserUUID := c.Get(HeaderUserUUID)
		headerSessionToken := c.Get(HeaderSessionToken)

		if headerUserUUID == "" {
			return unauthorizedResponse(c, ErrMissingUserUUID)
		}

		if headerSessionToken == "" {
			return unauthorizedResponse(c, ErrMissingSessionID)
		}

		// CRITICAL: Enforce cryptographic binding
		// Token claims MUST match gateway-forwarded headers
		if !secureCompare(claims.User.UUID, headerUserUUID) {
			return unauthorizedResponse(c, ErrBindingMismatch)
		}

		if !secureCompare(claims.SessionID, headerSessionToken) {
			return unauthorizedResponse(c, ErrBindingMismatch)
		}

		// Apply per-user rate limiting
		if !limiters.Authenticated.Allow(claims.User.UUID) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
				"code":  "RATE_LIMIT_USER",
			})
		}

		// Attach authenticated identity to context
		c.Locals("user_uuid", claims.User.UUID)
		c.Locals("session_id", claims.SessionID)

		return c.Next()
	}
}

// verifyToken parses and validates a JWT token
func verifyToken(tokenString string, secret []byte) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return secret, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	// Validate required claims
	if claims.User.UUID == "" {
		return nil, ErrInvalidClaims
	}

	if claims.SessionID == "" {
		return nil, ErrInvalidClaims
	}

	// Check expiration (belt and suspenders with jwt library)
	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, ErrTokenExpired
	}

	return claims, nil
}

// secureCompare performs constant-time string comparison
func secureCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// unauthorizedResponse returns a 401 response with error details
func unauthorizedResponse(c *fiber.Ctx, err error) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": "unauthorized",
		"code":  getErrorCode(err),
	})
}

// getErrorCode maps errors to response codes
func getErrorCode(err error) string {
	switch {
	case errors.Is(err, ErrMissingToken):
		return "TOKEN_REQUIRED"
	case errors.Is(err, ErrInvalidToken):
		return "TOKEN_INVALID"
	case errors.Is(err, ErrTokenExpired):
		return "TOKEN_EXPIRED"
	case errors.Is(err, ErrInvalidClaims):
		return "CLAIMS_INVALID"
	case errors.Is(err, ErrBindingMismatch):
		return "BINDING_MISMATCH"
	case errors.Is(err, ErrMissingUserUUID):
		return "UUID_REQUIRED"
	case errors.Is(err, ErrMissingSessionID):
		return "SESSION_REQUIRED"
	default:
		return "AUTH_FAILED"
	}
}

// ExtractTokenFromRequest extracts JWT from Authorization header or query param
// Used for WebSocket authentication where query param fallback is needed
func ExtractTokenFromRequest(c *fiber.Ctx) string {
	// Try Authorization header first
	authHeader := c.Get(HeaderAuthorization)
	if authHeader != "" && strings.HasPrefix(authHeader, BearerPrefix) {
		return strings.TrimPrefix(authHeader, BearerPrefix)
	}

	// Fall back to query parameter for WebSocket
	return c.Query("token")
}

// ValidateAndBindAuth performs full authentication and binding validation
// Returns AuthContext on success, error on failure
func ValidateAndBindAuth(c *fiber.Ctx, cfg *config.SecurityConfig) (*AuthContext, error) {
	tokenString := ExtractTokenFromRequest(c)
	if tokenString == "" {
		return nil, ErrMissingToken
	}

	// Verify JWT token
	claims, err := verifyToken(tokenString, cfg.JWTSecret)
	if err != nil {
		return nil, err
	}

	// Get gateway-forwarded headers
	headerUserUUID := c.Get(HeaderUserUUID)
	headerSessionToken := c.Get(HeaderSessionToken)

	if headerUserUUID == "" {
		return nil, ErrMissingUserUUID
	}

	if headerSessionToken == "" {
		return nil, ErrMissingSessionID
	}

	// CRITICAL: Enforce cryptographic binding
	if !secureCompare(claims.User.UUID, headerUserUUID) {
		return nil, ErrBindingMismatch
	}

	if !secureCompare(claims.SessionID, headerSessionToken) {
		return nil, ErrBindingMismatch
	}

	return &AuthContext{
		UserUUID:  claims.User.UUID,
		SessionID: claims.SessionID,
	}, nil
}
