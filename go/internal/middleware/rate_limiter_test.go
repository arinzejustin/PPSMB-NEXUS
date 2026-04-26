package middleware

import (
	"testing"
	"time"
)

func TestRateLimiterAllowWithinLimitThenBlock(t *testing.T) {
	limiter := NewRateLimiter(2, time.Second)
	defer limiter.Stop()

	if !limiter.Allow("user-1") {
		t.Fatalf("expected first request to be allowed")
	}
	if !limiter.Allow("user-1") {
		t.Fatalf("expected second request to be allowed")
	}
	if limiter.Allow("user-1") {
		t.Fatalf("expected third request to be blocked")
	}
}

func TestRateLimiterResetsAfterWindow(t *testing.T) {
	limiter := NewRateLimiter(1, 20*time.Millisecond)
	defer limiter.Stop()

	if !limiter.Allow("user-2") {
		t.Fatalf("expected first request to be allowed")
	}
	if limiter.Allow("user-2") {
		t.Fatalf("expected second request in same window to be blocked")
	}

	time.Sleep(30 * time.Millisecond)

	if !limiter.Allow("user-2") {
		t.Fatalf("expected request after reset window to be allowed")
	}
}

func TestGetRemaining(t *testing.T) {
	limiter := NewRateLimiter(3, time.Second)
	defer limiter.Stop()

	if got := limiter.GetRemaining("user-3"); got != 3 {
		t.Fatalf("expected 3 remaining for new key, got %d", got)
	}

	_ = limiter.Allow("user-3")
	_ = limiter.Allow("user-3")

	if got := limiter.GetRemaining("user-3"); got != 1 {
		t.Fatalf("expected 1 remaining after two requests, got %d", got)
	}
}
