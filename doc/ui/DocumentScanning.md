# Document Scanning UI Walkthrough

## Page Purpose
Interface for high-resolution batch document scanning and OCR (Optical Character Recognition) status monitoring. This module is the primary entry point for digitizing physical teacher records, certificates, and correspondence.

> **Important**: Document scanning functionality is **desktop-only**. The scanning feature uses an external Python executable (`scanner.exe`) that interfaces with connected scanning hardware. This feature is not available in web browsers.

## User Flow
1. **Desktop Detection**: On page load, system checks for Electron environment:
   - If desktop: Full functionality enabled
   - If web: Warning banner displayed explaining desktop requirement

2. **Stats Overview**: Four cards display:
   - Total Documents in library
   - OCR Completed count
   - Items In Queue (processing)
   - Failed OCR count

3. **Processing Queue**: Left sidebar shows:
   - Currently processing documents
   - Progress bar for each item
   - Page count and percentage complete
   - Queue position for waiting items

4. **Document Library**: Main area displays:
   - Grid or List view toggle
   - Category filter dropdown
   - Search by filename, teacher name, or tags
   - Document cards with thumbnails

5. **Document Actions**:
   - Hover reveals View/Download buttons
   - Click opens Preview Dialog with metadata
   - Category, size, pages, upload date, OCR status
   - Associated teacher link (if applicable)

6. **Scan Document** (Desktop Only):
   - Click navigates to `/documents/scan`
   - External Python scanner exe handles hardware
   - Scanned pages returned for categorization

## Components Used
- `Card`: Stats cards, queue panel, library container
- `Button`: Scan, Upload, View, Download
- `Badge`: Category labels, OCR status
- `Progress`: Queue item progress bars
- `Dialog`: Document preview modal
- `Select`: Category filter
- `Input`: Search field
- `ScrollArea`: Queue list scrolling
- **Grid/List Toggle**: Custom button group
- **Lucide Icons**: FileText, ScanLine, CheckCircle2, Loader2, etc.

## Scanning Architecture (Desktop Only)

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                │
├─────────────────────────────────────────────────────────┤
│  1. User clicks "Scan Document"                         │
│  2. IPC message sent to main process                    │
│  3. Main spawns Python scanner.exe                      │
│  4. scanner.exe interfaces with TWAIN/WIA driver        │
│  5. Scanned image returned as base64                    │
│  6. Image saved to app data folder                      │
│  7. OCR queue picks up new document                     │
│  8. Tesseract OCR extracts text                         │
│  9. Document indexed in local database                  │
│  10. Sync queues document for Supabase upload           │
└─────────────────────────────────────────────────────────┘
```

## Intended Logic Flow

### Document Loading
```
1. Load document metadata from IndexedDB
2. Display with placeholder thumbnails
3. Load actual thumbnails lazily
4. Apply current filters
```

### OCR Processing Queue
```
1. New scans added to processing queue
2. Background worker processes one at a time
3. Progress updates via IPC events
4. On completion, move to completed status
5. On failure, mark with error and allow retry
```

### Category Filtering
```
1. Filter updates computed property
2. Client-side filtering on cached data
3. Categories: certificates, employment, transfers, reports, correspondence, other
```

### Document Preview
```
1. Click document opens Dialog
2. Load full metadata from IndexedDB
3. Display document viewer (embedded PDF viewer or image)
4. Show all associated tags and teacher link
```

### Upload (Non-Scan)
```
1. File picker for manual uploads
2. Validate file type (PDF, images)
3. Add to OCR queue
4. Process same as scanned documents
```
