package api

import (
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"ppsmb-file-manager-server/internal/api/handlers"
	"ppsmb-file-manager-server/internal/config"
	"ppsmb-file-manager-server/internal/middleware"
	ws "ppsmb-file-manager-server/internal/websocket"
)

// Router manages the API routes
type Router struct {
	app      *fiber.App
	hub      *ws.Hub
	cfg      *config.SecurityConfig
	limiters *middleware.RateLimiters
}

// NewRouter creates a new router with the given hub and security configuration
func NewRouter(hub *ws.Hub, cfg *config.SecurityConfig) *Router {
	app := fiber.New(fiber.Config{
		AppName:               "PPSMB Server",
		DisableStartupMessage: false,
		// Security hardening
		EnableTrustedProxyCheck: true,
		TrustedProxies:          []string{"127.0.0.1"},
		ProxyHeader:             "X-Forwarded-For",
	})

	// Create rate limiters
	limiters := middleware.NewRateLimiters(cfg)

	// Core middleware (order matters)
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} ${latency}\n",
	}))

	// NOTE: Gateway guard is NOT applied globally
	// It's applied per-route group to allow direct WebSocket connections

	return &Router{
		app:      app,
		hub:      hub,
		cfg:      cfg,
		limiters: limiters,
	}
}

// SetupRoutes configures all the routes with security middleware
func (r *Router) SetupRoutes() {
	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(r.hub)
	broadcastHandler := handlers.NewBroadcastHandler(r.hub)
	dashboardHandler := handlers.NewDashboardHandler(r.hub)
	notifyHandler := handlers.NewNotifyHandler(r.hub)
	syncHandler := handlers.NewSyncHandler(r.hub)

	// ============================================================
	// WEBSOCKET ENDPOINT - Direct client connections allowed
	// Uses JWT-only auth for direct connections (no gateway required)
	// ============================================================
	r.app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	r.app.Get("/ws",
		middleware.WebSocketPreAuth(r.cfg, r.limiters),
		websocket.New(func(c *websocket.Conn) {
			// Retrieve authenticated context from Fiber locals
			userUUID := c.Locals("ws_user_uuid")
			sessionID := c.Locals("ws_session_id")

			userUUIDStr, ok := userUUID.(string)
			if !ok || userUUIDStr == "" {
				log.Println("WebSocket: Missing user UUID after auth - closing")
				c.Close()
				return
			}

			sessionIDStr, ok := sessionID.(string)
			if !ok || sessionIDStr == "" {
				log.Println("WebSocket: Missing session ID after auth - closing")
				c.Close()
				return
			}

			// Create authenticated client with bound identity
			client := ws.NewAuthenticatedClient(r.hub, c, userUUIDStr, sessionIDStr)

			if !client.IsAuthenticated() {
				log.Println("WebSocket: Client not authenticated - closing")
				c.Close()
				return
			}

			log.Printf("WebSocket: Authenticated client connected [user=%s, session=%s]",
				userUUIDStr, sessionIDStr)

			r.hub.Register <- client
			go client.WritePump()
			client.ReadPump()
		}),
	)

	// ============================================================
	// HEALTH CHECK - Publicly accessible (no auth, no gateway guard)
	// Used by load balancers, monitoring tools, and health checks
	// ============================================================
	r.app.Get("/health", healthHandler.Check, middleware.AnonymousRateLimiter(r.limiters))

	// ============================================================
	// API ROUTES - Full security: Gateway + Auth + Rate Limiting
	// These routes are called by Nitro proxy, not directly by clients
	// ============================================================
	api := r.app.Group("/api",
		middleware.GatewayGuard(r.cfg),
		middleware.GlobalIPRateLimiter(r.limiters),
		middleware.AnonymousRateLimiter(r.limiters),
	)

	// Authenticated routes
	authenticated := api.Group("",
		middleware.AuthMiddleware(r.cfg, r.limiters),
		middleware.UserRateLimiter(r.limiters),
	)

	// Broadcast
	authenticated.Post("/broadcast", broadcastHandler.Send)

	// Dashboard
	dashboard := authenticated.Group("/dashboard")
	dashboard.Post("/update", dashboardHandler.Update)
	dashboard.Get("/stats", dashboardHandler.Stats)

	// Notifications
	authenticated.Post("/notify", notifyHandler.Send)

	// Sync
	sync := authenticated.Group("/sync")
	sync.Post("/status", syncHandler.UpdateStatus)
	sync.Post("/start", syncHandler.StartSync)
	sync.Post("/complete", syncHandler.CompleteSync)
}

// Start starts the server on the specified bind address
func (r *Router) Start(bindAddr string, port string) error {
	addr := bindAddr + port
	log.Printf("🚀 Server starting on %s", addr)
	log.Printf("📡 WebSocket endpoint: ws://%s%s/ws (direct client)", bindAddr, port)
	log.Printf("📡 API endpoint: http://%s%s/api (gateway required)", bindAddr, port)
	log.Printf("🔒 Gateway guard: ENABLED for /api only")
	log.Printf("🔒 Rate limiting: ENABLED")
	log.Printf("🔒 JWT Auth: ENABLED")

	if bindAddr == "0.0.0.0" {
		log.Printf("⚠️  Server is publicly accessible - ensure firewall/reverse proxy is configured")
	}

	return r.app.Listen(addr)
}

// Shutdown gracefully shuts down the server and cleanup
func (r *Router) Shutdown() error {
	r.limiters.Stop()
	return r.app.Shutdown()
}
