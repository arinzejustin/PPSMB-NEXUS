package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"

	"ppsmb-file-manager-server/internal/config"
)

// RateLimitEntry tracks rate limit state for a key
type RateLimitEntry struct {
	Count   int
	ResetAt time.Time
	mu      sync.Mutex
}

// RateLimiter implements sliding window rate limiting
type RateLimiter struct {
	entries     map[string]*RateLimitEntry
	mu          sync.RWMutex
	maxRequests int
	window      time.Duration
	cleanupTick *time.Ticker
	stopCleanup chan struct{}
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		entries:     make(map[string]*RateLimitEntry),
		maxRequests: maxRequests,
		window:      window,
		stopCleanup: make(chan struct{}),
	}

	// Start cleanup goroutine
	rl.cleanupTick = time.NewTicker(window)
	go rl.cleanup()

	return rl
}

// cleanup removes expired entries periodically
func (rl *RateLimiter) cleanup() {
	for {
		select {
		case <-rl.cleanupTick.C:
			now := time.Now()
			rl.mu.Lock()
			for key, entry := range rl.entries {
				entry.mu.Lock()
				if now.After(entry.ResetAt) {
					delete(rl.entries, key)
				}
				entry.mu.Unlock()
			}
			rl.mu.Unlock()
		case <-rl.stopCleanup:
			rl.cleanupTick.Stop()
			return
		}
	}
}

// Stop stops the rate limiter cleanup goroutine
func (rl *RateLimiter) Stop() {
	close(rl.stopCleanup)
}

// Allow checks if a request is allowed for the given key
func (rl *RateLimiter) Allow(key string) bool {
	now := time.Now()

	rl.mu.Lock()
	entry, exists := rl.entries[key]
	if !exists {
		entry = &RateLimitEntry{
			Count:   0,
			ResetAt: now.Add(rl.window),
		}
		rl.entries[key] = entry
	}
	rl.mu.Unlock()

	entry.mu.Lock()
	defer entry.mu.Unlock()

	// Reset if window has passed
	if now.After(entry.ResetAt) {
		entry.Count = 0
		entry.ResetAt = now.Add(rl.window)
	}

	// Check limit
	if entry.Count >= rl.maxRequests {
		return false
	}

	entry.Count++
	return true
}

// GetRemaining returns remaining requests for a key
func (rl *RateLimiter) GetRemaining(key string) int {
	rl.mu.RLock()
	entry, exists := rl.entries[key]
	rl.mu.RUnlock()

	if !exists {
		return rl.maxRequests
	}

	entry.mu.Lock()
	defer entry.mu.Unlock()

	remaining := rl.maxRequests - entry.Count
	if remaining < 0 {
		return 0
	}
	return remaining
}

// RateLimiters holds all rate limiter instances
type RateLimiters struct {
	GlobalIP      *RateLimiter
	Anonymous     *RateLimiter
	Authenticated *RateLimiter
}

// NewRateLimiters creates all rate limiters from config
func NewRateLimiters(cfg *config.SecurityConfig) *RateLimiters {
	return &RateLimiters{
		GlobalIP:      NewRateLimiter(cfg.RateLimitGlobalIPMax, cfg.RateLimitGlobalIPWindow),
		Anonymous:     NewRateLimiter(cfg.RateLimitAnonymousMax, cfg.RateLimitAnonymousWindow),
		Authenticated: NewRateLimiter(cfg.RateLimitAuthenticatedMax, cfg.RateLimitAuthenticatedWindow),
	}
}

// Stop stops all rate limiter cleanup goroutines
func (rls *RateLimiters) Stop() {
	rls.GlobalIP.Stop()
	rls.Anonymous.Stop()
	rls.Authenticated.Stop()
}

// GlobalIPRateLimiter creates middleware for global IP-based rate limiting
func GlobalIPRateLimiter(limiters *RateLimiters) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()

		if !limiters.GlobalIP.Allow(ip) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
				"code":  "RATE_LIMIT_IP",
			})
		}

		return c.Next()
	}
}

// AnonymousRateLimiter creates middleware for anonymous request rate limiting
func AnonymousRateLimiter(limiters *RateLimiters) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if user is already authenticated
		if c.Locals("user_uuid") != nil {
			return c.Next()
		}

		ip := c.IP()
		if !limiters.Anonymous.Allow(ip) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
				"code":  "RATE_LIMIT_ANONYMOUS",
			})
		}

		return c.Next()
	}
}

// UserRateLimiter creates middleware for per-user rate limiting
// Must be called AFTER AuthMiddleware
func UserRateLimiter(limiters *RateLimiters) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userUUID, ok := c.Locals("user_uuid").(string)
		if !ok || userUUID == "" {
			// Fall back to IP if no user UUID (should not happen after auth)
			return c.Next()
		}

		if !limiters.Authenticated.Allow(userUUID) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
				"code":  "RATE_LIMIT_USER",
			})
		}

		return c.Next()
	}
}
