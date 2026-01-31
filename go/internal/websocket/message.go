package websocket

import "encoding/json"

// Message represents the standard WebSocket message structure
// matching the client-side WebSocketMessage interface
type Message struct {
	Type      string          `json:"type"`
	Channel   string          `json:"channel,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
	Timestamp int64           `json:"timestamp,omitempty"`
}

// NewMessage creates a new message with the current timestamp
func NewMessage(msgType string, channel string, data interface{}) (*Message, error) {
	var dataBytes json.RawMessage
	var err error

	if data != nil {
		dataBytes, err = json.Marshal(data)
		if err != nil {
			return nil, err
		}
	}

	return &Message{
		Type:      msgType,
		Channel:   channel,
		Data:      dataBytes,
		Timestamp: currentTimeMillis(),
	}, nil
}

// ToBytes converts the message to JSON bytes
func (m *Message) ToBytes() ([]byte, error) {
	return json.Marshal(m)
}

// ParseMessage parses a JSON message
func ParseMessage(data []byte) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}
