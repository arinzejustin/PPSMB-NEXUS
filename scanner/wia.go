package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-ole/go-ole"
)

// ─── WIA Constants ───────────────────────────────────────────────────────────

const (
	wiaDeviceTypeScanner  = 1
	wiaImageIntentColor   = 1
	wiaImageBiasMiniThumb = 0x10000 // minimize size
	wiaFormatJPEG         = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
	wiaFormatPNG          = "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}"
	wiaFormatBMP          = "{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}"
)

var comReady bool // whether COM has been initialised

// ─── COM Initialization ─────────────────────────────────────────────────────

func initCOM() error {
	if comReady {
		return nil
	}
	if err := ole.CoInitializeEx(0, ole.COINIT_MULTITHREADED); err != nil {
		// HRESULT S_FALSE (already initialised) is acceptable
		oleErr, ok := err.(*ole.OleError)
		if !ok || oleErr.Code() != 0x00000001 {
			return fmt.Errorf("COM init failed: %w", err)
		}
	}
	comReady = true
	return nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func ensureScanDir() error {
	if scanDir != "" {
		return nil
	}

	base := os.Getenv("TEMP")
	if base == "" {
		base = os.TempDir()
	}

	scanDir = filepath.Join(base, "ppsmb-scans")
	return os.MkdirAll(scanDir, 0755)
}

func scanFileName(ext string) string {
	ts := time.Now().Format("20060102_150405")
	return fmt.Sprintf("scan_%s%s", ts, ext)
}

func resolveFormat(fmtParam string) (formatID string, ext string) {
	switch strings.ToLower(fmtParam) {
	case "png":
		return wiaFormatPNG, ".png"
	case "bmp":
		return wiaFormatBMP, ".bmp"
	default:
		return wiaFormatJPEG, ".jpg"
	}
}
