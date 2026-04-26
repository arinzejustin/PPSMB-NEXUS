package main

import (
	"strings"
	"testing"
)

func TestResolveFormat(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		wantID     string
		wantSuffix string
	}{
		{name: "png", input: "png", wantID: wiaFormatPNG, wantSuffix: ".png"},
		{name: "bmp", input: "bmp", wantID: wiaFormatBMP, wantSuffix: ".bmp"},
		{name: "jpg default", input: "jpg", wantID: wiaFormatJPEG, wantSuffix: ".jpg"},
		{name: "unknown default", input: "tiff", wantID: wiaFormatJPEG, wantSuffix: ".jpg"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotID, gotExt := resolveFormat(tt.input)
			if gotID != tt.wantID {
				t.Fatalf("expected format ID %s, got %s", tt.wantID, gotID)
			}
			if gotExt != tt.wantSuffix {
				t.Fatalf("expected ext %s, got %s", tt.wantSuffix, gotExt)
			}
		})
	}
}

func TestScanFileName(t *testing.T) {
	got := scanFileName(".png")
	if !strings.HasPrefix(got, "scan_") {
		t.Fatalf("expected filename to start with scan_, got %s", got)
	}
	if !strings.HasSuffix(got, ".png") {
		t.Fatalf("expected filename to end with .png, got %s", got)
	}
	if len(got) <= len("scan_.png") {
		t.Fatalf("expected timestamp content in filename, got %s", got)
	}
}
