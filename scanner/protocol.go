package main

import (
	"encoding/json"
	"fmt"
)

// Request is the JSON command sent from Electron via stdin.
type Request struct {
	Command string            `json:"command"`
	Params  map[string]string `json:"params,omitempty"`
}

// Response is the JSON reply sent back to Electron via stdout.
type Response struct {
	Status  string `json:"status"`             // "ok" or "error"
	Message string `json:"message,omitempty"`  // human-readable description
	Path    string `json:"path,omitempty"`     // file path for scan results
	Data    any    `json:"data,omitempty"`     // arbitrary payload (device list, etc.)
}

// DeviceInfo holds scanner metadata returned by LIST_DEVICES.
type DeviceInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func reply(r Response) {
	data, _ := json.Marshal(r)
	fmt.Println(string(data))
}

func replyOK(msg, path string, data any) {
	reply(Response{Status: "ok", Message: msg, Path: path, Data: data})
}

func replyError(msg string) {
	reply(Response{Status: "error", Message: msg})
}
