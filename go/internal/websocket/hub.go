package websocket

import (
	"log"
	"sync"
	"time"
)

// currentTimeMillis returns the current time in milliseconds
func currentTimeMillis() int64 {
	return time.Now().UnixMilli()
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Channel subscriptions
	channels map[string]map[*Client]bool

	// Broadcast channel for all clients
	Broadcast chan []byte

	// Register channel for new clients
	Register chan *Client

	// Unregister channel for disconnecting clients
	Unregister chan *Client

	// Mutex for thread safety
	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client connected. Total clients: %d", len(h.clients))

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				// Remove client from all channels
				for channel := range client.GetSubscriptions() {
					if clients, exists := h.channels[channel]; exists {
						delete(clients, client)
						if len(clients) == 0 {
							delete(h.channels, channel)
						}
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client disconnected. Total clients: %d", len(h.clients))

		case message := <-h.Broadcast:
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
	client.AddSubscription(channel)

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
	client.RemoveSubscription(channel)

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

// BroadcastMessage sends a structured message to clients
func (h *Hub) BroadcastMessage(msgType string, channel string, data interface{}) error {
	msg, err := NewMessage(msgType, channel, data)
	if err != nil {
		log.Printf("Failed to create broadcast message: %v", err)
		return err
	}

	msgBytes, err := msg.ToBytes()
	if err != nil {
		log.Printf("Failed to marshal broadcast message: %v", err)
		return err
	}

	if channel != "" {
		h.BroadcastToChannel(channel, msgBytes)
	} else {
		h.Broadcast <- msgBytes
	}

	return nil
}

// GetClientCount returns the number of connected clients
func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// GetChannelCount returns the number of active channels
func (h *Hub) GetChannelCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.channels)
}

// GetChannelSubscribers returns the number of subscribers for a channel
func (h *Hub) GetChannelSubscribers(channel string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, exists := h.channels[channel]; exists {
		return len(clients)
	}
	return 0
}
