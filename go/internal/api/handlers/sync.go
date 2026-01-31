package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"ppsmb-file-manager-server/internal/websocket"
	"ppsmb-file-manager-server/pkg/response"
)

// SyncHandler handles sync status requests
type SyncHandler struct {
	hub *websocket.Hub
}

// NewSyncHandler creates a new sync handler
func NewSyncHandler(hub *websocket.Hub) *SyncHandler {
	return &SyncHandler{hub: hub}
}

// SyncStatusRequest represents the sync status request body
type SyncStatusRequest struct {
	Status         string `json:"status"` // "syncing", "completed", "failed", "idle"
	PendingChanges int    `json:"pendingChanges"`
	Progress       int    `json:"progress"` // 0-100
	Message        string `json:"message"`  // Optional status message
}

// UpdateStatus broadcasts sync status to all connected clients
// POST /api/sync/status
func (h *SyncHandler) UpdateStatus(c *fiber.Ctx) error {
	var req SyncStatusRequest

	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	// Validate status
	validStatuses := map[string]bool{
		"syncing":   true,
		"completed": true,
		"failed":    true,
		"idle":      true,
	}
	if req.Status != "" && !validStatuses[req.Status] {
		return response.BadRequest(c, "Invalid sync status. Must be: syncing, completed, failed, or idle")
	}

	// Validate progress
	if req.Progress < 0 || req.Progress > 100 {
		return response.BadRequest(c, "Progress must be between 0 and 100")
	}

	data := fiber.Map{
		"status":         req.Status,
		"pendingChanges": req.PendingChanges,
		"progress":       req.Progress,
		"message":        req.Message,
		"timestamp":      time.Now().UnixMilli(),
	}

	// Broadcast to ALL clients
	if err := h.hub.BroadcastMessage("sync_status", "", data); err != nil {
		return response.InternalError(c, "Failed to broadcast sync status")
	}

	return response.Success(c, "Sync status broadcasted", data)
}

// StartSync initiates a sync operation and broadcasts the status
// POST /api/sync/start
func (h *SyncHandler) StartSync(c *fiber.Ctx) error {
	data := fiber.Map{
		"status":    "syncing",
		"progress":  0,
		"message":   "Sync started",
		"timestamp": time.Now().UnixMilli(),
	}

	if err := h.hub.BroadcastMessage("sync_status", "", data); err != nil {
		return response.InternalError(c, "Failed to broadcast sync start")
	}

	return response.Success(c, "Sync started", data)
}

// CompleteSync marks sync as completed and broadcasts the status
// POST /api/sync/complete
func (h *SyncHandler) CompleteSync(c *fiber.Ctx) error {
	var req struct {
		Message string `json:"message"`
	}
	c.BodyParser(&req)

	if req.Message == "" {
		req.Message = "Sync completed successfully"
	}

	data := fiber.Map{
		"status":         "completed",
		"progress":       100,
		"pendingChanges": 0,
		"message":        req.Message,
		"timestamp":      time.Now().UnixMilli(),
	}

	if err := h.hub.BroadcastMessage("sync_status", "", data); err != nil {
		return response.InternalError(c, "Failed to broadcast sync completion")
	}

	return response.Success(c, "Sync completed", data)
}
