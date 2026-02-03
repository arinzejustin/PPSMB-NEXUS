package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"ppsmb-file-manager-server/internal/api"
	"ppsmb-file-manager-server/internal/config"
	"ppsmb-file-manager-server/internal/websocket"
)

func main() {
	cfg := config.LoadSecurityConfig()
	log.Println("✅ Security configuration loaded")

	// Create WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Println("✅ WebSocket hub started")

	// Create and setup router with security config
	router := api.NewRouter(hub, cfg)
	router.SetupRoutes()
	log.Println("✅ Routes configured with security middleware")

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		_ = router.Shutdown()
	}()

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = ":8080"
	} else {
		port = ":" + port
	}

	// BIND_ADDR: "127.0.0.1" for local dev, "0.0.0.0" for VPS
	bindAddr := os.Getenv("BIND_ADDR")
	if bindAddr == "" {
		bindAddr = "127.0.0.1" // Safe default
	}

	if err := router.Start(bindAddr, port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
