# Teacher Management UI Walkthrough

## Page Purpose
Provides HR and Zonal Administrators with a central hub to manage the lifecycle of 5,000+ teachers including profile viewing, certification tracking, transfer initiation, and bulk operations.

## User Flow
1. **Overview**: User sees a data table of all teachers with summary stat cards showing Total Teachers, Active Certifications, Expiring Soon, and Expired counts.

2. **Search & Filter**: User filters the table by:
   - Free-text search (name, ID, email, school)
   - Zone dropdown (Enugu North, South, East, Nsukka, Udi, Awgu)
   - Certification status (Active, Expiring, Expired, Pending)
   - Qualification level (B.Ed, M.Ed, NCE, etc.)

3. **Table Interaction**: 
   - Click column headers to sort by Name, Zone, or Service Years
   - Click row checkbox for bulk selection
   - Click row to open profile Sheet (slide-over panel)

4. **Profile View**: The Sheet component displays:
   - Personal tab: Email, phone, gender, DOB
   - Employment tab: Zone, school, qualification, years of service
   - Certification tab: Status badge, expiry date, days remaining

5. **Transfer Request**: User selects "Initiate Transfer" which opens a multi-step Dialog:
   - Step 1: Select destination school and enter reason
   - Step 2: Attach supporting documents
   - Step 3: Review and submit

6. **Bulk Operations**: Select multiple teachers via checkboxes, then export or perform batch actions.

## Components Used
- `Table` (TableHeader, TableBody, TableRow, TableCell, TableHead): Main data display
- `Sheet` (SheetContent, SheetHeader, SheetTitle): Slide-over profile panel
- `Dialog` (DialogContent, DialogHeader, DialogFooter): Transfer workflow modal
- `Tabs` (TabsList, TabsTrigger, TabsContent): Profile section navigation
- `Select` (SelectTrigger, SelectContent, SelectItem): Filter dropdowns
- `Input`: Search field
- `Checkbox`: Row selection
- `Badge`: Certification status indicators
- `Avatar`: Teacher profile images
- `DropdownMenu`: Row action menu (View, Edit, Transfer, Delete)
- `Button`: Action triggers
- `Separator`: Visual dividers

## Intended Logic Flow

### Data Loading
```
1. On mount, load teachers from IndexedDB cache
2. Display cached data immediately (offline-first)
3. If online, sync latest records from Supabase
4. Update local cache and re-render table
```

### Filtering
```
1. All filters use computed properties for reactive updates
2. Filtering happens client-side on cached data
3. Pagination recalculates after each filter change
```

### Transfer Workflow
```
1. Validate destination school selection
2. Store attached documents in pending uploads queue
3. Create transfer request record in IndexedDB
4. Mark record with "Pending Sync" status
5. On next sync window, push to Supabase
6. Update transfer status to "Submitted"
```

### Profile Updates
```
1. Local edits save to IndexedDB immediately
2. A "Pending Sync" icon appears next to modified fields
3. Changes pushed to server during bi-weekly sync
4. Conflict resolution: server wins with local backup
```
