package api

import (
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"ppsmb-file-manager-server/internal/api/handlers"
	ws "ppsmb-file-manager-server/internal/websocket"
)

// Router manages the API routes
type Router struct {
	app *fiber.App
	hub *ws.Hub
}

// NewRouter creates a new router with the given hub
func NewRouter(hub *ws.Hub) *Router {
	app := fiber.New(fiber.Config{
		AppName: "PPSMB WebSocket Server",
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	return &Router{
		app: app,
		hub: hub,
	}
}

// SetupRoutes configures all the routes
func (r *Router) SetupRoutes() {
	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(r.hub)
	broadcastHandler := handlers.NewBroadcastHandler(r.hub)
	dashboardHandler := handlers.NewDashboardHandler(r.hub)
	notifyHandler := handlers.NewNotifyHandler(r.hub)
	syncHandler := handlers.NewSyncHandler(r.hub)

	// Health check
	r.app.Get("/health", healthHandler.Check)

	// WebSocket endpoint
	r.app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	r.app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		client := ws.NewClient(r.hub, c)
		r.hub.Register <- client

		go client.WritePump()
		client.ReadPump()
	}))

	// API routes
	api := r.app.Group("/api")

	// Broadcast
	api.Post("/broadcast", broadcastHandler.Send)

	// Dashboard
	dashboard := api.Group("/dashboard")
	dashboard.Post("/update", dashboardHandler.Update)
	dashboard.Get("/stats", dashboardHandler.Stats)

	// Notifications
	api.Post("/notify", notifyHandler.Send)

	// Sync
	sync := api.Group("/sync")
	sync.Post("/status", syncHandler.UpdateStatus)
	sync.Post("/start", syncHandler.StartSync)
	sync.Post("/complete", syncHandler.CompleteSync)
}

// Start starts the server on the given port
func (r *Router) Start(port string) error {
	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📡 WebSocket endpoint: ws://localhost%s/ws", port)
	log.Printf("🏥 Health check: http://localhost%s/health", port)
	log.Printf("📢 Broadcast API: http://localhost%s/api/broadcast", port)
	log.Printf("📊 Dashboard API: http://localhost%s/api/dashboard/*", port)
	log.Printf("🔔 Notify API: http://localhost%s/api/notify", port)
	log.Printf("🔄 Sync API: http://localhost%s/api/sync/*", port)

	return r.app.Listen(port)
}

// Shutdown gracefully shuts down the server
func (r *Router) Shutdown() error {
	return r.app.Shutdown()
}
