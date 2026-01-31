package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"ppsmb-file-manager-server/internal/websocket"
	"ppsmb-file-manager-server/pkg/response"
)

// NotifyHandler handles notification requests
type NotifyHandler struct {
	hub *websocket.Hub
}

// NewNotifyHandler creates a new notify handler
func NewNotifyHandler(hub *websocket.Hub) *NotifyHandler {
	return &NotifyHandler{hub: hub}
}

// NotifyRequest represents the notification request body
type NotifyRequest struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Type    string `json:"type"` // "info", "warning", "error", "success"
}

// Send broadcasts a notification to all connected clients
// POST /api/notify
func (h *NotifyHandler) Send(c *fiber.Ctx) error {
	var req NotifyRequest

	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if req.Message == "" {
		return response.BadRequest(c, "Message is required")
	}

	// Default type to "info" if not specified
	if req.Type == "" {
		req.Type = "info"
	}

	// Validate type
	validTypes := map[string]bool{"info": true, "warning": true, "error": true, "success": true}
	if !validTypes[req.Type] {
		return response.BadRequest(c, "Invalid notification type. Must be: info, warning, error, or success")
	}

	data := fiber.Map{
		"title":     req.Title,
		"message":   req.Message,
		"type":      req.Type,
		"timestamp": time.Now().UnixMilli(),
	}

	// Broadcast to ALL clients (no channel specified)
	if err := h.hub.BroadcastMessage("notification", "", data); err != nil {
		return response.InternalError(c, "Failed to send notification")
	}

	return response.Success(c, "Notification sent to all clients", data)
}
