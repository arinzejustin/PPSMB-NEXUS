package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocketMessage represents the standard message structure
// matching the client-side WebSocketMessage interface
type WebSocketMessage struct {
	Type      string          `json:"type"`
	Channel   string          `json:"channel,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
	Timestamp int64           `json:"timestamp,omitempty"`
}

// Client represents a connected WebSocket client
type Client struct {
	conn          *websocket.Conn
	send          chan []byte
	subscriptions map[string]bool
	mu            sync.RWMutex
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	channels   map[string]map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Println("Client connected. Total clients:", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				// Remove client from all channels
				for channel := range client.subscriptions {
					if clients, exists := h.channels[channel]; exists {
						delete(clients, client)
						if len(clients) == 0 {
							delete(h.channels, channel)
						}
					}
				}
			}
			h.mu.Unlock()
			log.Println("Client disconnected. Total clients:", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Subscribe adds a client to a channel
func (h *Hub) Subscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.channels[channel] == nil {
		h.channels[channel] = make(map[*Client]bool)
	}
	h.channels[channel][client] = true
	client.mu.Lock()
	client.subscriptions[channel] = true
	client.mu.Unlock()

	log.Printf("Client subscribed to channel: %s", channel)
}

// Unsubscribe removes a client from a channel
func (h *Hub) Unsubscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, exists := h.channels[channel]; exists {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.channels, channel)
		}
	}
	client.mu.Lock()
	delete(client.subscriptions, channel)
	client.mu.Unlock()

	log.Printf("Client unsubscribed from channel: %s", channel)
}

// BroadcastToChannel sends a message to all clients subscribed to a channel
func (h *Hub) BroadcastToChannel(channel string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, exists := h.channels[channel]; exists {
		for client := range clients {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}

// WebSocket upgrader configuration
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for development - configure properly for production
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// serveWs handles WebSocket requests from clients
func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	client := &Client{
		conn:          conn,
		send:          make(chan []byte, 256),
		subscriptions: make(map[string]bool),
	}

	hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump(hub)
}

// readPump reads messages from the WebSocket connection
func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse the incoming message
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Failed to parse message: %v", err)
			continue
		}

		// Reset read deadline
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		// Process message based on type
		c.processMessage(hub, &msg)
	}
}

// processMessage handles different message types
func (c *Client) processMessage(hub *Hub, msg *WebSocketMessage) {
	switch msg.Type {
	case "ping":
		// Respond with pong
		response := WebSocketMessage{
			Type:      "pong",
			Timestamp: time.Now().UnixMilli(),
		}
		c.sendMessage(&response)
		log.Println("Received ping, sent pong")

	case "subscribe":
		if msg.Channel != "" {
			hub.Subscribe(c, msg.Channel)
			// Send confirmation
			response := WebSocketMessage{
				Type:      "subscribed",
				Channel:   msg.Channel,
				Timestamp: time.Now().UnixMilli(),
			}
			c.sendMessage(&response)
		}

	case "unsubscribe":
		if msg.Channel != "" {
			hub.Unsubscribe(c, msg.Channel)
			// Send confirmation
			response := WebSocketMessage{
				Type:      "unsubscribed",
				Channel:   msg.Channel,
				Timestamp: time.Now().UnixMilli(),
			}
			c.sendMessage(&response)
		}

	case "request_data":
		// Handle data requests - customize based on your needs
		c.handleDataRequest(hub, msg)

	default:
		// Handle other message types or custom processing
		log.Printf("Received message type: %s, channel: %s", msg.Type, msg.Channel)
		// Echo back or process as needed
		c.handleCustomMessage(hub, msg)
	}
}

// handleDataRequest processes data request messages
func (c *Client) handleDataRequest(hub *Hub, msg *WebSocketMessage) {
	// Parse the data field if needed
	var requestData map[string]interface{}
	if msg.Data != nil {
		if err := json.Unmarshal(msg.Data, &requestData); err != nil {
			log.Printf("Failed to parse request data: %v", err)
		}
	}

	log.Printf("Data request received: %v", requestData)

	// Example: Send back some response data
	responseData := map[string]interface{}{
		"success": true,
		"message": "Data request processed",
		"request": requestData,
	}

	dataBytes, _ := json.Marshal(responseData)
	response := WebSocketMessage{
		Type:      "data_response",
		Channel:   msg.Channel,
		Data:      dataBytes,
		Timestamp: time.Now().UnixMilli(),
	}
	c.sendMessage(&response)
}

// handleCustomMessage processes custom message types
func (c *Client) handleCustomMessage(hub *Hub, msg *WebSocketMessage) {
	// Implement custom message handling here
	// This is where you'd add your business logic

	// Example: Echo the message back with a modified type
	response := WebSocketMessage{
		Type:      msg.Type + "_response",
		Channel:   msg.Channel,
		Data:      msg.Data,
		Timestamp: time.Now().UnixMilli(),
	}
	c.sendMessage(&response)
}

// sendMessage sends a WebSocketMessage to the client
func (c *Client) sendMessage(msg *WebSocketMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	select {
	case c.send <- data:
	default:
		log.Println("Send buffer full, message dropped")
	}
}

// writePump writes messages to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Send any queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// BroadcastMessage sends a message to all connected clients
func (h *Hub) BroadcastMessage(msgType string, channel string, data interface{}) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		log.Printf("Failed to marshal broadcast data: %v", err)
		return
	}

	msg := WebSocketMessage{
		Type:      msgType,
		Channel:   channel,
		Data:      dataBytes,
		Timestamp: time.Now().UnixMilli(),
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal broadcast message: %v", err)
		return
	}

	if channel != "" {
		h.BroadcastToChannel(channel, msgBytes)
	} else {
		h.broadcast <- msgBytes
	}
}

func main() {
	hub := NewHub()
	go hub.Run()

	// WebSocket endpoint
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "healthy",
			"timestamp": time.Now().UnixMilli(),
		})
	})

	// Example: API endpoint to broadcast messages to all clients
	http.HandleFunc("/api/broadcast", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Type    string      `json:"type"`
			Channel string      `json:"channel"`
			Data    interface{} `json:"data"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		hub.BroadcastMessage(req.Type, req.Channel, req.Data)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "sent"})
	})

	port := ":8080"
	log.Printf("WebSocket server starting on %s", port)
	log.Printf("WebSocket endpoint: ws://localhost%s/ws", port)
	log.Printf("Health check: http://localhost%s/health", port)
	log.Printf("Broadcast API: http://localhost%s/api/broadcast (POST)", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("ListenAndServe error:", err)
	}
}