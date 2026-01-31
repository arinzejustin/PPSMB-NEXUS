package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
)

// Client represents a connected WebSocket client with authentication binding
type Client struct {
	hub           *Hub
	conn          *websocket.Conn
	send          chan []byte
	subscriptions map[string]bool
	mu            sync.RWMutex

	// Authentication binding - set at connection time, immutable
	userUUID  string
	sessionID string
}

// NewClient creates a new WebSocket client (unauthenticated)
func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, 256),
		subscriptions: make(map[string]bool),
	}
}

// NewAuthenticatedClient creates a new authenticated WebSocket client
func NewAuthenticatedClient(hub *Hub, conn *websocket.Conn, userUUID, sessionID string) *Client {
	return &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, 256),
		subscriptions: make(map[string]bool),
		userUUID:      userUUID,
		sessionID:     sessionID,
	}
}

// GetUserUUID returns the bound user UUID
func (c *Client) GetUserUUID() string {
	return c.userUUID
}

// GetSessionID returns the bound session ID
func (c *Client) GetSessionID() string {
	return c.sessionID
}

// IsAuthenticated returns true if the client has valid authentication binding
func (c *Client) IsAuthenticated() bool {
	return c.userUUID != "" && c.sessionID != ""
}

// ReadPump reads messages from the WebSocket connection
func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister <- c
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error [user=%s]: %v", c.userUUID, err)
			}
			break
		}

		// Parse the incoming message
		msg, err := ParseMessage(message)
		if err != nil {
			log.Printf("Failed to parse message [user=%s]: %v", c.userUUID, err)
			continue
		}

		// Process message based on type
		c.processMessage(msg)
	}
}

// WritePump writes messages to the WebSocket connection
func (c *Client) WritePump() {
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

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
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

// processMessage handles different message types
func (c *Client) processMessage(msg *Message) {
	switch msg.Type {
	case "ping":
		c.sendPong()

	case "subscribe":
		if msg.Channel != "" {
			c.hub.Subscribe(c, msg.Channel)
			c.sendConfirmation("subscribed", msg.Channel)
		}

	case "unsubscribe":
		if msg.Channel != "" {
			c.hub.Unsubscribe(c, msg.Channel)
			c.sendConfirmation("unsubscribed", msg.Channel)
		}

	case "request_data":
		c.handleDataRequest(msg)

	default:
		log.Printf("Received message type: %s, channel: %s [user=%s]", msg.Type, msg.Channel, c.userUUID)
		c.handleCustomMessage(msg)
	}
}

// sendPong sends a pong response
func (c *Client) sendPong() {
	response, _ := NewMessage("pong", "", nil)
	c.SendMessage(response)
	log.Printf("Received ping, sent pong [user=%s]", c.userUUID)
}

// sendConfirmation sends a subscription confirmation
func (c *Client) sendConfirmation(msgType, channel string) {
	response, _ := NewMessage(msgType, channel, nil)
	c.SendMessage(response)
}

// handleDataRequest processes data request messages
func (c *Client) handleDataRequest(msg *Message) {
	var requestData map[string]interface{}
	if msg.Data != nil {
		json.Unmarshal(msg.Data, &requestData)
	}

	log.Printf("Data request received [user=%s]: %v", c.userUUID, requestData)

	responseData := map[string]interface{}{
		"success": true,
		"message": "Data request processed",
		"request": requestData,
	}

	response, _ := NewMessage("data_response", msg.Channel, responseData)
	c.SendMessage(response)
}

// handleCustomMessage processes custom message types
func (c *Client) handleCustomMessage(msg *Message) {
	response, _ := NewMessage(msg.Type+"_response", msg.Channel, msg.Data)
	c.SendMessage(response)
}

// SendMessage sends a WebSocketMessage to the client
func (c *Client) SendMessage(msg *Message) {
	data, err := msg.ToBytes()
	if err != nil {
		log.Printf("Failed to marshal message [user=%s]: %v", c.userUUID, err)
		return
	}

	select {
	case c.send <- data:
	default:
		log.Printf("Send buffer full, message dropped [user=%s]", c.userUUID)
	}
}

// AddSubscription adds a channel subscription
func (c *Client) AddSubscription(channel string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.subscriptions[channel] = true
}

// RemoveSubscription removes a channel subscription
func (c *Client) RemoveSubscription(channel string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.subscriptions, channel)
}

// GetSubscriptions returns all subscriptions
func (c *Client) GetSubscriptions() map[string]bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// Return a copy to avoid race conditions
	subs := make(map[string]bool)
	for k, v := range c.subscriptions {
		subs[k] = v
	}
	return subs
}

// Close terminates the client connection
func (c *Client) Close() {
	c.conn.Close()
}
