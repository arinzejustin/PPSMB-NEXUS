package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"ppsmb-file-manager-server/internal/websocket"
	"ppsmb-file-manager-server/pkg/response"
)

// DashboardHandler handles dashboard-related requests
type DashboardHandler struct {
	hub *websocket.Hub
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler(hub *websocket.Hub) *DashboardHandler {
	return &DashboardHandler{hub: hub}
}

// DashboardUpdateRequest represents the dashboard update request body
type DashboardUpdateRequest struct {
	TotalTeachers int `json:"totalTeachers"`
	TotalStudents int `json:"totalStudents"`
	PendingItems  int `json:"pendingItems"`
}

// Update broadcasts a dashboard update to subscribed clients
// POST /api/dashboard/update
func (h *DashboardHandler) Update(c *fiber.Ctx) error {
	var req DashboardUpdateRequest

	// If body is provided, use it; otherwise use default values for testing
	if err := c.BodyParser(&req); err != nil {
		// Use default test values
		req = DashboardUpdateRequest{
			TotalTeachers: 1250,
			TotalStudents: 45000,
			PendingItems:  42,
		}
	}

	data := fiber.Map{
		"totalTeachers": req.TotalTeachers,
		"totalStudents": req.TotalStudents,
		"pendingItems":  req.PendingItems,
		"lastSyncedAt":  time.Now().UnixMilli(),
	}

	if err := h.hub.BroadcastMessage("dashboard_update", "dashboard", data); err != nil {
		return response.InternalError(c, "Failed to broadcast dashboard update")
	}

	return response.Success(c, "Dashboard update broadcasted", data)
}

// Stats returns current dashboard statistics
// GET /api/dashboard/stats
func (h *DashboardHandler) Stats(c *fiber.Ctx) error {
	return response.Success(c, "Dashboard statistics", fiber.Map{
		"connectedClients":     h.hub.GetClientCount(),
		"dashboardSubscribers": h.hub.GetChannelSubscribers("dashboard"),
		"activeChannels":       h.hub.GetChannelCount(),
	})
}
