package handlers

import (
	"github.com/gofiber/fiber/v2"

	"ppsmb-file-manager-server/internal/websocket"
	"ppsmb-file-manager-server/pkg/response"
)

// BroadcastHandler handles broadcast requests
type BroadcastHandler struct {
	hub *websocket.Hub
}

// NewBroadcastHandler creates a new broadcast handler
func NewBroadcastHandler(hub *websocket.Hub) *BroadcastHandler {
	return &BroadcastHandler{hub: hub}
}

// BroadcastRequest represents the broadcast request body
type BroadcastRequest struct {
	Type    string      `json:"type"`
	Channel string      `json:"channel"`
	Data    interface{} `json:"data"`
}

// Send broadcasts a message to clients
// POST /api/broadcast
func (h *BroadcastHandler) Send(c *fiber.Ctx) error {
	var req BroadcastRequest

	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if req.Type == "" {
		return response.BadRequest(c, "Message type is required")
	}

	if err := h.hub.BroadcastMessage(req.Type, req.Channel, req.Data); err != nil {
		return response.InternalError(c, "Failed to broadcast message")
	}

	return response.Success(c, "Message broadcasted successfully", fiber.Map{
		"type":    req.Type,
		"channel": req.Channel,
	})
}
