# Mail & Correspondence UI Walkthrough

## Page Purpose
Digital mail processing center for managing official correspondence, routing documents to appropriate departments, and maintaining a searchable archive of all communications.

## User Flow
1. **Folder Navigation**: Left sidebar displays:
   - Inbox (with unread count badge)
   - Sent
   - Starred (important items)
   - Archive

2. **Mail List**: Center panel shows mail items with:
   - Sender avatar and name
   - Subject line (bold if unread)
   - Preview snippet
   - Time ago indicator
   - Priority badge (High/Normal)
   - Attachment indicator (paperclip icon)
   - Tags (urgent, report, transfer, etc.)

3. **Quick Actions**:
   - Star toggle: Click star icon to mark as important
   - Checkbox: Select multiple for bulk operations
   - Search: Filter by sender, subject, or content

4. **Mail Detail View**: Click a mail to expand:
   - Full from/to information
   - Complete message body
   - Attachment list with download buttons
   - Reply/Forward action buttons

5. **Bulk Operations**: Select multiple mails to:
   - Archive selected
   - Delete selected
   - Mark as read/unread

6. **Compose**: Click "Compose" to create new correspondence (future implementation)

## Components Used
- `Card`: Container for sidebar and mail list
- `Tabs`: View switching (though using custom nav buttons)
- `ScrollArea`: Scrollable mail list
- `Avatar` (AvatarFallback): Sender initials
- `Badge`: Priority labels, tags
- `Checkbox`: Multi-select
- `Button`: Action buttons
- `Input`: Search field
- `Separator`: Section dividers
- `DropdownMenu`: Mail actions menu

## Intended Logic Flow

### Mail Loading
```
1. Load mails from IndexedDB cache on mount
2. Filter by active folder (inbox/sent/archive)
3. Sort by date descending (newest first)
4. If online, check for new mail from server
```

### Reading Mail
```
1. Click mail item triggers markAsRead()
2. Update isRead flag in local storage
3. Expand to detail view
4. Mark sync needed for read status
```

### Search
```
1. Filter applied in computed property
2. Searches subject, sender name, and preview
3. Results update reactively
```

### Starring
```
1. Toggle isStarred property
2. Update IndexedDB immediately
3. Sync status change on next sync window
```

### Archiving
```
1. Update folder property to 'archive'
2. Remove from current view
3. Item accessible via Archive folder
4. Sync change to server
```

### Reply/Forward (Future Implementation)
```
1. Open compose modal with quoted content
2. Pre-fill recipient (reply) or clear (forward)
3. Save draft to IndexedDB
4. Send via API when online
```
