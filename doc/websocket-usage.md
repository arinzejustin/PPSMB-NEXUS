# WebSocket Usage Guide

This guide explains how to use the WebSocket composables throughout the app.

## Architecture Overview

```
app/layouts/app.vue          → Initializes WebSocket connection (once)
      ↓
app/composables/useWebSocket.ts  → Core WebSocket management
      ↓
Any page/component           → Subscribe to channels & receive data
```

## 1. Connection is Initialized in App Layout

The WebSocket connection is established **once** in `app/layouts/app.vue` when the user is authenticated:

```vue
<script setup lang="ts">
import { useWebSocketConnection } from '@/composables/useWebSocket';

const { connect } = useWebSocketConnection();

onMounted(() => {
  connect();
});
</script>
```

## 2. Subscribe to Channels in Pages/Components

### Option A: Using `useChannel` (Recommended)

Auto-subscribes on mount, auto-unsubscribes on unmount:

```vue
<script setup lang="ts">
import { useChannel } from '@/composables/useWebSocket';

// Subscribe to 'teachers' channel
const { data, on } = useChannel<TeacherUpdateData>('teachers');

// Listen for specific message types
on('teacher_created', (data) => {
  console.log('New teacher created:', data);
  refreshTeacherList();
});

on('teacher_updated', (data) => {
  console.log('Teacher updated:', data);
  updateTeacherInList(data);
});

on('teacher_deleted', (data) => {
  console.log('Teacher deleted:', data);
  removeTeacherFromList(data.id);
});
</script>

<template>
  <div>
    <!-- Use reactive data -->
    <pre>{{ data }}</pre>
  </div>
</template>
```

### Option B: Using `useWebSocketMessage` (Global Messages)

Listen for a message type without channel filter:

```vue
<script setup lang="ts">
import { useWebSocketMessage } from '@/composables/useWebSocket';

// Listen for 'notification' messages from any channel
const { data: notification } = useWebSocketMessage<NotificationData>('notification');

watch(notification, (newNotification) => {
  if (newNotification) {
    showToast(newNotification);
  }
});
</script>
```

### Option C: Using `useSendMessage` (Send to Server)

```vue
<script setup lang="ts">
import { useSendMessage } from '@/composables/useWebSocket';

const { send } = useSendMessage();

const requestRefresh = () => {
  send('request_refresh', { section: 'dashboard' }, 'dashboard');
};
</script>
```

## 3. Multiple Channels Example

```vue
<!-- pages/admin.vue -->
<script setup lang="ts">
import { useChannel } from '@/composables/useWebSocket';

// Subscribe to multiple channels
const { on: onDashboard } = useChannel('dashboard');
const { on: onTeachers } = useChannel('teachers');
const { on: onNotifications } = useChannel('notifications');

// Dashboard updates
onDashboard('metrics_update', (data) => {
  updateMetrics(data);
});

// Teacher updates
onTeachers('teacher_transfer', (data) => {
  handleTransferNotification(data);
});

// Notifications
onNotifications('alert', (data) => {
  showAlert(data);
});
</script>
```

## 4. Files Page Example

```vue
<!-- pages/files.vue -->
<script setup lang="ts">
import { useChannel, useSendMessage } from '@/composables/useWebSocket';

interface FileUpdate {
  action: 'created' | 'updated' | 'deleted';
  file: {
    id: string;
    name: string;
    path: string;
  };
}

const { on } = useChannel<FileUpdate>('files');
const { send } = useSendMessage();

const files = ref<File[]>([]);

// Listen for file changes
on('file_created', (data) => {
  files.value.push(data.file);
});

on('file_deleted', (data) => {
  files.value = files.value.filter(f => f.id !== data.file.id);
});

on('file_updated', (data) => {
  const index = files.value.findIndex(f => f.id === data.file.id);
  if (index >= 0) {
    files.value[index] = data.file;
  }
});

// Request file list
const requestFiles = () => {
  send('request_files', { folder: currentFolder.value }, 'files');
};

onMounted(() => {
  requestFiles();
});
</script>
```

## 5. Transfers Page Example

```vue
<!-- pages/transfers.vue -->
<script setup lang="ts">
import { useChannel } from '@/composables/useWebSocket';

interface TransferUpdate {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  teacher: { name: string; id: string };
  fromSchool: string;
  toSchool: string;
}

const { on } = useChannel<TransferUpdate>('transfers');

const pendingTransfers = ref<TransferUpdate[]>([]);

on('transfer_created', (data) => {
  pendingTransfers.value.unshift(data);
  showToast('New transfer request received');
});

on('transfer_approved', (data) => {
  updateTransferStatus(data.id, 'approved');
});

on('transfer_rejected', (data) => {
  updateTransferStatus(data.id, 'rejected');
});
</script>
```

## 6. Go Server: Broadcasting to Channels

```go
// Broadcast to dashboard channel
hub.BroadcastToChannel("dashboard", Message{
    Type:    "metrics_update",
    Channel: "dashboard",
    Data:    metricsData,
})

// Broadcast to teachers channel
hub.BroadcastToChannel("teachers", Message{
    Type:    "teacher_created",
    Channel: "teachers",
    Data:    teacherData,
})

// Broadcast to files channel
hub.BroadcastToChannel("files", Message{
    Type:    "file_updated",
    Channel: "files",
    Data:    fileData,
})
```

## Summary

| Composable | Purpose | Auto-cleanup |
|------------|---------|--------------|
| `useWebSocketConnection` | Initialize connection (app layout only) | Yes |
| `useChannel` | Subscribe to a channel | Yes |
| `useWebSocketMessage` | Listen for message type globally | Yes |
| `useSendMessage` | Send messages to server | N/A |
| `useRawWebSocket` | Advanced: Access raw client | No |
