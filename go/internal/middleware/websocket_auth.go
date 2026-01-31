package middleware

import (
	"crypto/subtle"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"ppsmb-file-manager-server/internal/config"
)

// WebSocketPreAuthLocals stores authentication data for WebSocket upgrade
const (
	LocalsWSUserUUID  = "ws_user_uuid"
	LocalsWSSessionID = "ws_session_id"
	LocalsWSAuthValid = "ws_auth_valid"
)

// WebSocketPreAuth performs authentication BEFORE WebSocket protocol upgrade
// For direct client connections (no gateway), validates JWT only
// For proxied connections (with gateway), validates JWT + binding
func WebSocketPreAuth(cfg *config.SecurityConfig, limiters *RateLimiters) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Apply per-IP rate limiting first (before auth overhead)
		ip := c.IP()
		if !limiters.GlobalIP.Allow(ip) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
				"code":  "RATE_LIMIT_WS_IP",
			})
		}

		// Check if request came through gateway (has signature)
		hasGateway := c.Get(HeaderGatewaySignature) != ""

		var authCtx *AuthContext
		var err error

		if hasGateway {
			// Full validation with cryptographic binding
			authCtx, err = ValidateAndBindAuth(c, cfg)
		} else {
			// Direct client connection - JWT validation only
			authCtx, err = ValidateJWTOnly(c, cfg)
		}

		if err != nil {
			return unauthorizedResponse(c, err)
		}

		// Apply per-user rate limiting for WebSocket handshakes
		if !limiters.Authenticated.Allow(authCtx.UserUUID) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
				"code":  "RATE_LIMIT_WS_USER",
			})
		}

		// Store auth context for WebSocket handler to retrieve
		c.Locals(LocalsWSUserUUID, authCtx.UserUUID)
		c.Locals(LocalsWSSessionID, authCtx.SessionID)
		c.Locals(LocalsWSAuthValid, true)

		return c.Next()
	}
}

// ValidateJWTOnly validates JWT token without gateway binding
// Used for direct WebSocket connections from clients
func ValidateJWTOnly(c *fiber.Ctx, cfg *config.SecurityConfig) (*AuthContext, error) {
	tokenString := ExtractTokenFromRequest(c)
	if tokenString == "" {
		return nil, ErrMissingToken
	}

	// Verify JWT token
	claims, err := verifyTokenWS(tokenString, cfg.JWTSecret)
	if err != nil {
		return nil, err
	}

	return &AuthContext{
		UserUUID:  claims.User.UUID,
		SessionID: claims.SessionID,
	}, nil
}

// verifyTokenWS parses and validates a JWT token for WebSocket
func verifyTokenWS(tokenString string, secret []byte) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return secret, nil
	})

	if err != nil {
		if strings.Contains(err.Error(), "expired") {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	if claims.User.UUID == "" || claims.SessionID == "" {
		return nil, ErrInvalidClaims
	}

	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, ErrTokenExpired
	}

	return claims, nil
}

// GetWSAuthContext retrieves authenticated WebSocket context from Fiber locals
func GetWSAuthContext(c *fiber.Ctx) (*AuthContext, bool) {
	valid, ok := c.Locals(LocalsWSAuthValid).(bool)
	if !ok || !valid {
		return nil, false
	}

	userUUID, ok := c.Locals(LocalsWSUserUUID).(string)
	if !ok || userUUID == "" {
		return nil, false
	}

	sessionID, ok := c.Locals(LocalsWSSessionID).(string)
	if !ok || sessionID == "" {
		return nil, false
	}

	return &AuthContext{
		UserUUID:  userUUID,
		SessionID: sessionID,
	}, true
}

// secureCompareWS performs constant-time string comparison
func secureCompareWS(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
