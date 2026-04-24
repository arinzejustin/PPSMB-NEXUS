package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/go-ole/go-ole"
)

var (
	scanMu  sync.Mutex // prevent concurrent scan operations
	scanDir string     // temp directory for scanned files
)

func main() {
	// Signal readiness to the parent process
	replyOK("scanner process ready", "", map[string]string{
		"version": "1.0.0",
		"pid":     fmt.Sprintf("%d", os.Getpid()),
	})

	reader := bufio.NewReader(os.Stdin)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			// Parent closed the pipe — shut down gracefully
			if comReady {
				ole.CoUninitialize()
			}
			os.Exit(0)
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Parse JSON command
		var req Request
		if err := json.Unmarshal([]byte(line), &req); err != nil {
			// Fallback: support legacy plain-text commands (e.g. "SCAN\n")
			req = Request{Command: line}
		}

		// Route the command
		switch strings.ToUpper(req.Command) {
		case "PING":
			replyWithID(req.ID, "pong", "", nil)
		case "LIST_DEVICES":
			handleListDevicesWithID(req.ID)
		case "SCAN":
			handleScanWithID(req.ID, req.Params)
		case "SCAN_SILENT":
			handleScanSilentWithID(req.ID, req.Params)
		case "CLEANUP":
			handleCleanupWithID(req.ID, req.Params)
		case "EXIT", "QUIT":
			if comReady {
				ole.CoUninitialize()
			}
			replyWithID(req.ID, "shutting down", "", nil)
			os.Exit(0)
		default:
			replyErrorWithID(req.ID, fmt.Sprintf("unknown command: %s", req.Command))
		}
	}
}
