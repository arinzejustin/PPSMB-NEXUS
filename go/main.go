package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"ppsmb-file-manager-server/internal/api"
	"ppsmb-file-manager-server/internal/websocket"
)

func main() {
	// Create WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Create and setup router
	router := api.NewRouter(hub)
	router.SetupRoutes()

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

	if err := router.Start(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

	
}