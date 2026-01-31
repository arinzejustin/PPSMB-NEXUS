package config

import (
	"os"
	"time"
)

// SecurityConfig holds all security-related configuration
type SecurityConfig struct {
	// InternalSecret is the HMAC-SHA256 signing key for gateway verification
	InternalSecret []byte

	// JWTSecret is the secret for JWT token verification
	JWTSecret []byte

	// Rate limiting configuration
	RateLimitAnonymousMax        int
	RateLimitAnonymousWindow     time.Duration
	RateLimitAuthenticatedMax    int
	RateLimitAuthenticatedWindow time.Duration
	RateLimitGlobalIPMax         int
	RateLimitGlobalIPWindow      time.Duration
}

// LoadSecurityConfig loads security configuration from environment variables
func LoadSecurityConfig() *SecurityConfig {
	internalSecret := os.Getenv("INTERNAL_SECRET")
	if internalSecret == "" {
		panic("INTERNAL_SECRET environment variable is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		panic("JWT_SECRET environment variable is required")
	}

	return &SecurityConfig{
		InternalSecret:               []byte(internalSecret),
		JWTSecret:                    []byte(jwtSecret),
		RateLimitAnonymousMax:        30,
		RateLimitAnonymousWindow:     time.Minute,
		RateLimitAuthenticatedMax:    120,
		RateLimitAuthenticatedWindow: time.Minute,
		RateLimitGlobalIPMax:         60,
		RateLimitGlobalIPWindow:      time.Minute,
	}
}
