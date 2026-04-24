package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
)

// ─── Command: PING ──────────────────────────────────────────────────────────

func handlePing() {
	replyOK("pong", "", nil)
}

// ─── Command: LIST_DEVICES ──────────────────────────────────────────────────

func handleListDevices() {
	handleListDevicesWithID("")
}

func handleListDevicesWithID(id string) {
	if err := initCOM(); err != nil {
		replyErrorWithID(id, err.Error())
		return
	}

	unknown, err := oleutil.CreateObject("WIA.DeviceManager")
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to create WIA.DeviceManager: %v", err))
		return
	}
	defer unknown.Release()

	mgr, err := unknown.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to query DeviceManager interface: %v", err))
		return
	}
	defer mgr.Release()

	devInfos, err := oleutil.GetProperty(mgr, "DeviceInfos")
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to get DeviceInfos: %v", err))
		return
	}
	infos := devInfos.ToIDispatch()
	defer infos.Release()

	countVar, _ := oleutil.GetProperty(infos, "Count")
	count := int(countVar.Val)

	devices := make([]DeviceInfo, 0, count)

	for i := 1; i <= count; i++ {
		itemVar, err := oleutil.CallMethod(infos, "Item", i)
		if err != nil {
			continue
		}
		item := itemVar.ToIDispatch()

		typeVar, _ := oleutil.GetProperty(item, "Type")
		devType := int(typeVar.Val)

		if devType == wiaDeviceTypeScanner {
			idVar, _ := oleutil.GetProperty(item, "DeviceID")
			nameVar, _ := oleutil.CallMethod(item, "Properties")

			devID := idVar.ToString()
			devName := devID

			if nameVar != nil {
				props := nameVar.ToIDispatch()
				if pName, err := oleutil.CallMethod(props, "Item", "Name"); err == nil {
					if valVar, err := oleutil.GetProperty(pName.ToIDispatch(), "Value"); err == nil {
						devName = valVar.ToString()
					}
				}
				props.Release()
			}

			devices = append(devices, DeviceInfo{ID: devID, Name: devName})
		}
		item.Release()
	}

	replyWithID(id, fmt.Sprintf("found %d scanner(s)", len(devices)), "", devices)
}

// ─── Command: SCAN ──────────────────────────────────────────────────────────

func handleScan(params map[string]string) {
	handleScanWithID("", params)
}

func handleScanWithID(id string, params map[string]string) {
	scanMu.Lock()
	defer scanMu.Unlock()

	if err := initCOM(); err != nil {
		replyErrorWithID(id, err.Error())
		return
	}

	if err := ensureScanDir(); err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to create scan directory: %v", err))
		return
	}

	formatID, ext := resolveFormat(params["format"])
	outPath := filepath.Join(scanDir, scanFileName(ext))

	// Create WIA CommonDialog — this provides the native scan UI
	unknown, err := oleutil.CreateObject("WIA.CommonDialog")
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to create WIA.CommonDialog: %v", err))
		return
	}
	defer unknown.Release()

	dialog, err := unknown.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to query CommonDialog interface: %v", err))
		return
	}
	defer dialog.Release()

	// ShowAcquireImage(DeviceType, Intent, Bias, FormatID, AlwaysSelectDevice, UseCommonUI, CancelError)
	result, err := oleutil.CallMethod(
		dialog,
		"ShowAcquireImage",
		wiaDeviceTypeScanner,
		wiaImageIntentColor,
		wiaImageBiasMiniThumb,
		formatID,
		false,
		true,
		false,
	)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("Scan failed or was cancelled: %v", err))
		return
	}
	if result == nil || result.Val == 0 {
		replyErrorWithID(id, "Scan was cancelled by the user")
		return
	}

	imageFile := result.ToIDispatch()
	defer imageFile.Release()

	// Save the scanned image to disk
	_, err = oleutil.CallMethod(imageFile, "SaveFile", outPath)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to save scanned image: %v", err))
		return
	}

	// Verify the file was actually written
	info, err := os.Stat(outPath)
	if err != nil || info.Size() == 0 {
		replyErrorWithID(id, "scan produced an empty or missing file")
		return
	}

	replyWithID(id, "scan completed", outPath, map[string]any{
		"size":   info.Size(),
		"format": strings.TrimPrefix(ext, "."),
	})
}

// ─── Command: SCAN_SILENT ───────────────────────────────────────────────────

func handleScanSilent(params map[string]string) {
	handleScanSilentWithID("", params)
}

func handleScanSilentWithID(id string, params map[string]string) {
	scanMu.Lock()
	defer scanMu.Unlock()

	if err := initCOM(); err != nil {
		replyErrorWithID(id, err.Error())
		return
	}

	if err := ensureScanDir(); err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to create scan directory: %v", err))
		return
	}

	formatID, ext := resolveFormat(params["format"])
	outPath := filepath.Join(scanDir, scanFileName(ext))

	dmUnk, err := oleutil.CreateObject("WIA.DeviceManager")
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to create WIA.DeviceManager: %v", err))
		return
	}
	defer dmUnk.Release()

	dm, err := dmUnk.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("DeviceManager query failed: %v", err))
		return
	}
	defer dm.Release()

	devInfos, err := oleutil.GetProperty(dm, "DeviceInfos")
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to get DeviceInfos: %v", err))
		return
	}
	infos := devInfos.ToIDispatch()
	defer infos.Release()

	countVar, _ := oleutil.GetProperty(infos, "Count")
	count := int(countVar.Val)

	targetDeviceID := params["device_id"]
	var deviceInfo *ole.IDispatch

	for i := 1; i <= count; i++ {
		itemVar, err := oleutil.CallMethod(infos, "Item", i)
		if err != nil {
			continue
		}
		item := itemVar.ToIDispatch()

		typeVar, _ := oleutil.GetProperty(item, "Type")
		if int(typeVar.Val) != wiaDeviceTypeScanner {
			item.Release()
			continue
		}

		if targetDeviceID != "" {
			idVar, _ := oleutil.GetProperty(item, "DeviceID")
			if idVar.ToString() != targetDeviceID {
				item.Release()
				continue
			}
		}

		deviceInfo = item
		break
	}

	if deviceInfo == nil {
		replyErrorWithID(id, "no scanner device found")
		return
	}
	defer deviceInfo.Release()

	devVar, err := oleutil.CallMethod(deviceInfo, "Connect")
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to connect to scanner: %v", err))
		return
	}
	device := devVar.ToIDispatch()
	defer device.Release()

	itemsVar, err := oleutil.GetProperty(device, "Items")
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to get scanner items: %v", err))
		return
	}
	items := itemsVar.ToIDispatch()
	defer items.Release()

	itemCountVar, _ := oleutil.GetProperty(items, "Count")
	if int(itemCountVar.Val) == 0 {
		replyErrorWithID(id, "scanner has no scan items available")
		return
	}

	firstItemVar, err := oleutil.CallMethod(items, "Item", 1)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to get scan item: %v", err))
		return
	}
	scanItem := firstItemVar.ToIDispatch()
	defer scanItem.Release()

	imgVar, err := oleutil.CallMethod(scanItem, "Transfer", formatID)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("scan transfer failed: %v", err))
		return
	}
	imageFile := imgVar.ToIDispatch()
	defer imageFile.Release()

	_, err = oleutil.CallMethod(imageFile, "SaveFile", outPath)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to save scanned image: %v", err))
		return
	}

	info, err := os.Stat(outPath)
	if err != nil || info.Size() == 0 {
		replyErrorWithID(id, "scan produced an empty or missing file")
		return
	}

	replyWithID(id, "silent scan completed", outPath, map[string]any{
		"size":   info.Size(),
		"format": strings.TrimPrefix(ext, "."),
	})
}

// ─── Command: CLEANUP ───────────────────────────────────────────────────────

func handleCleanup(params map[string]string) {
	handleCleanupWithID("", params)
}

func handleCleanupWithID(id string, params map[string]string) {
	if scanDir == "" {
		if err := ensureScanDir(); err != nil {
			replyErrorWithID(id, err.Error())
			return
		}
	}

	maxAge := 24 * time.Hour
	if v, ok := params["max_age_hours"]; ok {
		if d, err := time.ParseDuration(v + "h"); err == nil {
			maxAge = d
		}
	}

	cutoff := time.Now().Add(-maxAge)
	removed := 0

	entries, err := os.ReadDir(scanDir)
	if err != nil {
		replyErrorWithID(id, fmt.Sprintf("failed to read scan directory: %v", err))
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.Remove(filepath.Join(scanDir, entry.Name()))
			removed++
		}
	}

	replyWithID(id, fmt.Sprintf("cleaned up %d file(s)", removed), "", map[string]int{
		"removed": removed,
	})
}
