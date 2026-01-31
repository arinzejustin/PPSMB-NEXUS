package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"ppsmb-file-manager-server/internal/websocket"
	"ppsmb-file-manager-server/pkg/response"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	hub *websocket.Hub
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(hub *websocket.Hub) *HealthHandler {
	return &HealthHandler{hub: hub}
}

// Check returns the server health status
// GET /health
func (h *HealthHandler) Check(c *fiber.Ctx) error {
	return response.Success(c, "Server is healthy", fiber.Map{
		"status":       "healthy",
		"timestamp":    time.Now().UnixMilli(),
		"clients":      h.hub.GetClientCount(),
		"channels":     h.hub.GetChannelCount(),
	})
}
