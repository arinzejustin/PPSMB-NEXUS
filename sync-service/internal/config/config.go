package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// Config holds all service configuration
type Config struct {
	// NitroBaseURL is the base URL for the Nitro server (e.g. http://127.0.0.1:<port>)
	NitroBaseURL string `json:"nitroBaseUrl"`

	// GoBackendURL is the URL for the Go WebSocket/API server
	GoBackendURL string `json:"goBackendUrl"`

	// SupabaseURL is the Supabase project URL
	SupabaseURL string `json:"supabaseUrl"`

	// SupabaseKey is the Supabase anon/service key
	SupabaseKey string `json:"supabaseKey"`

	// ControlPort is the port for the local HTTP control API
	ControlPort int `json:"controlPort"`

	// SyncIntervalSeconds is the interval between sync cycles
	SyncIntervalSeconds int `json:"syncIntervalSeconds"`

	// StatusCheckIntervalSeconds is the interval between status checks
	StatusCheckIntervalSeconds int `json:"statusCheckIntervalSeconds"`

	// NeDBPath is the path to the NeDB database directory
	NeDBPath string `json:"nedbPath"`

	// LogDir is the directory for log files
	LogDir string `json:"logDir"`

	// MaxRecordsPerTable is the record cap for rotation
	MaxRecordsPerTable int `json:"maxRecordsPerTable"`

	// TablesToSync lists the table names to synchronize
	TablesToSync []string `json:"tablesToSync"`

	// InternalSecret for gateway-signed requests to Go backend
	InternalSecret string `json:"internalSecret"`

	// JWTSecret for auth
	JWTSecret string `json:"jwtSecret"`
}

var (
	instance *Config
	once     sync.Once
	mu       sync.RWMutex
	cfgPath  string
)

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		NitroBaseURL:               "", // Discovered dynamically or set by Electron
		GoBackendURL:               "https://api.axiolot.com.ng",
		SupabaseURL:                "",
		SupabaseKey:                "",
		ControlPort:                4545,
		SyncIntervalSeconds:        300, // 5 minutes
		StatusCheckIntervalSeconds: 30,
		NeDBPath:                   "", // Will be set from ProgramData or AppData
		LogDir:                     "", // Will be set from ProgramData
		MaxRecordsPerTable:         3000,
		TablesToSync:               []string{"scanned_records", "staff_logs"},
		InternalSecret:             "",
		JWTSecret:                  "",
	}
}

// Load reads config from file, falling back to defaults
func Load() *Config {
	once.Do(func() {
		instance = DefaultConfig()

		// Determine config file path
		programData := os.Getenv("ProgramData")
		if programData == "" {
			programData = `C:\ProgramData`
		}
		baseDir := filepath.Join(programData, "PPSMB-Core")
		os.MkdirAll(baseDir, 0755)

		cfgPath = filepath.Join(baseDir, "sync-service.json")

		// Set default log dir
		instance.LogDir = filepath.Join(baseDir, "logs")
		os.MkdirAll(instance.LogDir, 0755)

		// Try to read existing config
		data, err := os.ReadFile(cfgPath)
		if err == nil {
			json.Unmarshal(data, instance)
		}

		// Discover NeDB path if not set
		if instance.NeDBPath == "" {
			appData := os.Getenv("APPDATA")
			if appData != "" {
				// Electron stores userData under APPDATA/<productName>
				instance.NeDBPath = filepath.Join(appData, "ppsmb-enugu-nexus", "database")
			}
		}

		// Read env overrides
		if v := os.Getenv("SYNC_SUPABASE_URL"); v != "" {
			instance.SupabaseURL = v
		}
		if v := os.Getenv("SYNC_SUPABASE_KEY"); v != "" {
			instance.SupabaseKey = v
		}
		if v := os.Getenv("SYNC_NITRO_URL"); v != "" {
			instance.NitroBaseURL = v
		}
		if v := os.Getenv("SYNC_INTERNAL_SECRET"); v != "" {
			instance.InternalSecret = v
		}
		if v := os.Getenv("SYNC_JWT_SECRET"); v != "" {
			instance.JWTSecret = v
		}

		// Persist the resolved config
		Save()
	})

	return instance
}

// Get returns the current config (thread-safe)
func Get() *Config {
	mu.RLock()
	defer mu.RUnlock()
	if instance == nil {
		mu.RUnlock()
		return Load()
	}
	return instance
}

// Save persists the current config to disk
func Save() error {
	mu.RLock()
	defer mu.RUnlock()

	data, err := json.MarshalIndent(instance, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cfgPath, data, 0644)
}

// Update modifies config values and persists
func Update(fn func(c *Config)) error {
	mu.Lock()
	fn(instance)
	mu.Unlock()
	return Save()
}
