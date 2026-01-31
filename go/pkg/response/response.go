package response

import "github.com/gofiber/fiber/v2"

// Response represents a standard API response
type Response struct {
	Status bool        `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Success sends a successful response
func Success(c *fiber.Ctx, message string, data interface{}) error {
	return c.JSON(Response{
		Status: true,
		Message: message,
		Data:    data,
	})
}

// Error sends an error response
func Error(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(Response{
		Status: false,
		Error:   message,
	})
}

// BadRequest sends a 400 error response
func BadRequest(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusBadRequest, message)
}

// NotFound sends a 404 error response
func NotFound(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusNotFound, message)
}

// InternalError sends a 500 error response
func InternalError(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusInternalServerError, message)
}

// Unauthorized sends a 401 error response
func Unauthorized(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusUnauthorized, message)
}

// Forbidden sends a 403 error response
func Forbidden(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusForbidden, message)
}
