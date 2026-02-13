<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { definePageMeta, useHead, showToast, useRoute, navigateTo } from '#imports';
import {
  Search,
  Plus,
  MoreHorizontal,
  Inbox,
  Send,
  Archive,
  Star,
  Trash2,
  Mail,
  Paperclip,
  Clock,
  ChevronRight,
  ArrowLeft,
  Forward,
  Reply,
  CornerUpLeft,
  Tags,
  Building2,
  User,
  Calendar,
  Download,
  Printer,
  X,
  RefreshCw,
  CheckCheck,
  FileText,
  ArchiveRestore,
  Filter,
  MailOpen,
  Sparkles,
  Bell,
  ChevronDown,
  Eye,
  EyeOff,
  Check,
  ReplyAll,
  Tag
} from 'lucide-vue-next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import { useInternalMail } from '@/composables/useInternalMail';
import { useIsDesktop } from "@/composables/useIsDesktop"
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { printHandler } from "@/utils/printHandler"
import type { InternalMail } from '@/types/mail';
import PrinterModal from '@/components/app/PrinterModal.vue';

definePageMeta({
  layout: 'app',
  middleware: ["user-validate"]
});

const isElectron = ref<boolean>(useIsDesktop());
const route = useRoute();

useHead({
  title: isElectron.value ? "PPSMB File Manager" : "Mail & Correspondence"
})

// --- Internal Mail Logic ---
// We now get 'allMails' and 'fetchMails' from the composable
const {
  groupedRecipients,
  sendInternalMessage,
  isSending,
  allMails,
  fetchMails,
  isLoading,
  markAsRead: markAsReadAction,
  toggleStar: toggleStarAction,
  deleteMessages: deleteMessagesAction,
  archiveHandler: archiveMessagesAction,
} = useInternalMail();

const isComposeOpen = ref<boolean>(false);
const composeForm = ref({
  recipients: [] as any[],
  subject: '',
  body: '',
  attachments: [] as File[]
});
const printerModal = ref<boolean>(false);
const printContentHtml = ref<string>('');

const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'Write your memo here...',
    }),
  ],
  onUpdate: ({ editor }) => {
    composeForm.value.body = editor.getHTML();
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 dark:prose-invert',
    },
  },
});

const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileSelect = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    for (let i = 0; i < input.files.length; i++) {
      composeForm.value.attachments.push(input.files[i]!);
    }
  }
  // Reset input
  if (input) input.value = '';
};

const removeAttachment = (index: number) => {
  composeForm.value.attachments.splice(index, 1);
};

// Fix TS error: accept 'any' type for the event value
const addRecipient = (value: any) => {
  const recipientId = value as string;
  // Find recipient in groups
  let recipient: any = null;
  for (const group of groupedRecipients.value) {
    const found = group.items.find(i => i.id === recipientId);
    if (found) {
      recipient = found;
      break;
    }
  }

  if (recipient) {
    // Check if already added
    if (!composeForm.value.recipients.find(r => r.id === recipient.id)) {
      composeForm.value.recipients.push(recipient);
    }
  }
};

const removeRecipient = (index: number) => {
  composeForm.value.recipients.splice(index, 1);
};

const handleSend = async () => {
  if (composeForm.value.recipients.length === 0 || !composeForm.value.subject) return;

  const result = await sendInternalMessage({
    subject: composeForm.value.subject,
    body: composeForm.value.body,
    to: composeForm.value.recipients,
    attachments: composeForm.value.attachments.map(f => ({
      id: `file-${Date.now()}`,
      name: f.name,
      size: f.size,
      type: f.type,
      file: f
    }))
  });

  if (result.success) {
    isComposeOpen.value = false;
    // Reset form
    composeForm.value = {
      recipients: [],
      subject: '',
      body: '',
      attachments: []
    };
    editor.value?.commands.clearContent();
    // Ideally show a toast here
  }
};

onMounted(() => {
  fetchMails();
  if (route.query.compose) {
    isComposeOpen.value = true;
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// --- Existing Mail Logic ---

const searchQuery = ref('');
const activeTab = ref('inbox');
const selectedMail = ref<InternalMail | null>(null);
const selectedMails = ref<string[]>([]);
const isRefreshing = ref(false);

// Mail categories/folders counts
// Compute counts based on live data
const folderCounts = computed(() => ({
  inbox: allMails.value.filter(m => m.folder === 'inbox' && !m.isRead).length,
  sent: allMails.value.filter(m => m.folder === 'sent').length,
  archive: allMails.value.filter(m => m.folder === 'archive').length,
  starred: allMails.value.filter(m => m.isStarred).length
}));

// Filtered mails based on active tab and search
const filteredMails = computed(() => {
  let mails = allMails.value;

  // Filter by tab/folder
  if (activeTab.value === 'starred') {
    mails = mails.filter(m => m.isStarred);
  } else {
    mails = mails.filter(m => m.folder === activeTab.value);
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    mails = mails.filter(m =>
      m.subject.toLowerCase().includes(query) ||
      m.from.name.toLowerCase().includes(query) ||
      m.preview.toLowerCase().includes(query)
    );
  }

  // Sort by date (newest first) - spread to avoid mutating readonly array
  return [...mails].sort((a, b) => b.date.getTime() - a.date.getTime());
});

const toggleStar = (mail: any) => {
  // Use composable action which updates state and DB
  toggleStarAction(mail.id);
};

const markAsRead = (mail: any) => {
  // Use composable action which updates state and DB
  markAsReadAction(mail.id);
  selectedMail.value = mail;
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'low': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }
};

const getPriorityBorder = (priority: string) => {
  switch (priority) {
    case 'high': return 'border-l-red-500';
    case 'low': return 'border-l-gray-400';
    default: return 'border-l-transparent';
  }
};

const closeMail = () => {
  selectedMail.value = null;
};

const toggleSelectMail = (id: string) => {
  const index = selectedMails.value.indexOf(id);
  if (index > -1) {
    selectedMails.value.splice(index, 1);
  } else {
    selectedMails.value.push(id);
  }
};

const handleArchiveSelected = async (unarchive: boolean = false) => {
  await archiveMessagesAction(selectedMails.value, unarchive);
  selectedMails.value = [];
};

const handleSingleArchive = async (id: string, unarchive: boolean = false) => {
  await archiveMessagesAction([id], unarchive);
  selectedMail.value = null;
};

const deleteSelected = async () => {
  await deleteMessagesAction(selectedMails.value);
  selectedMails.value = [];
};

const toggleSelectAll = () => {
  if (selectedMails.value.length === filteredMails.value.length) {
    selectedMails.value = [];
  } else {
    selectedMails.value = filteredMails.value.map(m => m.id);
  }
};

const handleRefresh = async () => {
  isRefreshing.value = true;
  await fetchMails(1, true);
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

const folderConfig = [
  { key: 'inbox', label: 'Inbox', icon: Inbox, countKey: 'inbox' as const },
  { key: 'sent', label: 'Sent', icon: Send, countKey: null },
  { key: 'starred', label: 'Starred', icon: Star, countKey: 'starred' as const },
  { key: 'archive', label: 'Archive', icon: Archive, countKey: null },
];

const getActiveTabLabel = computed(() => {
  const found = folderConfig.find(f => f.key === activeTab.value);
  return found?.label || 'Inbox';
});

// --- Reply & Forward Logic ---
type ComposeMode = 'new' | 'reply' | 'forward';
const composeMode = ref<ComposeMode>('new');
const composeTitle = computed(() => {
  switch (composeMode.value) {
    case 'reply': return 'Reply to Message';
    case 'forward': return 'Forward Message';
    default: return 'New Internal Memo';
  }
});

const handleReply = () => {
  if (!selectedMail.value) return;

  composeMode.value = 'reply';

  // Find sender in recipients list to add as recipient
  const senderName = selectedMail.value.from.name;
  let senderRecipient: any = null;
  for (const group of groupedRecipients.value) {
    const found = group.items.find(i => i.label === senderName || i.value === senderName);
    if (found) {
      senderRecipient = found;
      break;
    }
  }

  // Create quoted reply content
  const originalDate = format(selectedMail.value.date, 'MMM d, yyyy \'at\' h:mm a');
  const quotedContent = `
    <br/><br/>
    <div style="border-left: 3px solid #10b981; padding-left: 16px; margin-top: 16px; color: #6b7280;">
      <p style="margin: 0 0 8px 0;"><strong>On ${originalDate}, ${selectedMail.value.from.name} wrote:</strong></p>
      <div style="margin-top: 8px;">${selectedMail.value.body}</div>
    </div>
  `;

  composeForm.value = {
    recipients: senderRecipient ? [senderRecipient] : [],
    subject: `Re: ${selectedMail.value.subject.replace(/^Re:\s*/i, '')}`,
    body: '',
    attachments: []
  };

  // Set editor content with quote
  editor.value?.commands.setContent(quotedContent);
  composeForm.value.body = quotedContent;

  isComposeOpen.value = true;
};

const handleForward = () => {
  if (!selectedMail.value) return;

  composeMode.value = 'forward';

  // Create forwarded content
  const originalDate = format(selectedMail.value.date, 'MMM d, yyyy \'at\' h:mm a');
  const forwardedContent = `
    <br/><br/>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
      <p style="margin: 0 0 4px 0; font-weight: 600;">---------- Forwarded message ---------</p>
      <p style="margin: 0 0 4px 0;"><strong>From:</strong> ${selectedMail.value.from.name} &lt;${selectedMail.value.from.email}&gt;</p>
      <p style="margin: 0 0 4px 0;"><strong>Date:</strong> ${originalDate}</p>
      <p style="margin: 0 0 4px 0;"><strong>Subject:</strong> ${selectedMail.value.subject}</p>
      <p style="margin: 0 0 16px 0;"><strong>To:</strong> ${selectedMail.value.to.join(', ')}</p>
      <div>${selectedMail.value.body}</div>
    </div>
  `;

  composeForm.value = {
    recipients: [],
    subject: `Fwd: ${selectedMail.value.subject.replace(/^Fwd:\s*/i, '')}`,
    body: '',
    attachments: []
  };

  // Set editor content with forwarded message
  editor.value?.commands.setContent(forwardedContent);
  composeForm.value.body = forwardedContent;

  isComposeOpen.value = true;
};

const resetComposeMode = () => {
  composeMode.value = 'new';
  composeForm.value = {
    recipients: [],
    subject: '',
    body: '',
    attachments: []
  };
  editor.value?.commands.clearContent();
};

// Watch for compose dialog close to reset mode
const handleComposeClose = (open: boolean) => {
  isComposeOpen.value = open;
  if (!open) {
    resetComposeMode();
  }
  navigateTo("/mail/")
};

// --- Print Logic ---
const generatePrintContent = () => {
  if (!selectedMail.value) return '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${selectedMail.value.subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .header {
          border-bottom: 2px solid #10b981;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .subject {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px 0;
        }
        .meta {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .meta-row {
          display: flex;
          margin-bottom: 8px;
        }
        .meta-label {
          font-weight: 600;
          width: 80px;
          color: #6b7280;
        }
        .meta-value {
          color: #1f2937;
        }
        .tags {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .tag {
          background: #e5e7eb;
          color: #374151;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }
        .priority-high {
          background: #fee2e2;
          color: #dc2626;
        }
        .body {
          margin-top: 24px;
        }
        .attachments {
          margin-top: 30px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        .attachment-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="subject">${selectedMail.value.subject}</h1>
        <div class="tags">
          ${selectedMail.value.priority === 'high' ? '<span class="tag priority-high">High Priority</span>' : ''}
          ${selectedMail.value.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      
      <div class="meta">
        <div class="meta-row">
          <span class="meta-label">From:</span>
          <span class="meta-value">${selectedMail.value.from.name} &lt;${selectedMail.value.from.email}&gt;</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">To:</span>
          <span class="meta-value">${selectedMail.value.to.join(', ')}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date:</span>
          <span class="meta-value">${format(selectedMail.value.date, 'MMMM d, yyyy \'at\' h:mm a')}</span>
        </div>
      </div>
      
      <div class="body">
        ${selectedMail.value.body}
      </div>
      
      ${selectedMail.value.attachments.length > 0 ? `
        <div class="attachments">
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Attachments (${selectedMail.value.attachments.length})</h3>
          ${selectedMail.value.attachments.map(att => `
            <div class="attachment-item">
              <span>📎</span>
              <span>${att.name}</span>
              <span style="color: #9ca3af;">(${att.size})</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="footer">
        Printed from PPSMB Mail System • ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
      </div>
    </body>
    </html>
  `;
};

const handlePrint = () => {
  if (!selectedMail.value) return;

  const printContent = generatePrintContent();
  printContentHtml.value = printContent;

  // For Electron, show the printer modal with preview
  if (isElectron.value) {
    printerModal.value = true;
    return;
  }

  // For web, use the direct print handler
  printHandler(printContent);
};

const handlePrintSuccess = () => {
  printerModal.value = false;
};

// --- Label Management Logic ---
const isLabelDialogOpen = ref(false);
const availableLabels = ref([
  { id: 'urgent', name: 'Urgent', color: 'bg-red-500' },
  { id: 'report', name: 'Report', color: 'bg-blue-500' },
  { id: 'transfer', name: 'Transfer', color: 'bg-emerald-500' },
  { id: 'certification', name: 'Certification', color: 'bg-purple-500' },
  { id: 'priority', name: 'Priority', color: 'bg-amber-500' },
  { id: 'project', name: 'Project', color: 'bg-indigo-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-pink-500' },
  { id: 'follow-up', name: 'Follow Up', color: 'bg-cyan-500' },
]);
const selectedLabels = ref<string[]>([]);
const newLabelName = ref('');

const openLabelDialog = () => {
  if (!selectedMail.value) return;
  // Pre-select existing labels
  selectedLabels.value = [...selectedMail.value.tags];
  isLabelDialogOpen.value = true;
};

const toggleLabel = (labelId: string) => {
  const index = selectedLabels.value.indexOf(labelId);
  if (index > -1) {
    selectedLabels.value.splice(index, 1);
  } else {
    selectedLabels.value.push(labelId);
  }
};

const addNewLabel = () => {
  if (!newLabelName.value.trim()) return;

  const newId = newLabelName.value.toLowerCase().replace(/\s+/g, '-');
  if (!availableLabels.value.find(l => l.id === newId)) {
    availableLabels.value.push({
      id: newId,
      name: newLabelName.value.trim(),
      color: 'bg-gray-500'
    });
  }

  if (!selectedLabels.value.includes(newId)) {
    selectedLabels.value.push(newId);
  }

  newLabelName.value = '';
};

const saveLabels = () => {
  if (!selectedMail.value) return;

  // Update the mail's tags (in a real app, this would call an API)
  // For now, we update the local state
  const mailIndex = allMails.value.findIndex(m => m.id === selectedMail.value?.id);
  if (mailIndex > -1) {
    // Since it's readonly, we'd need to update through the composable
    // For demo purposes, we'll update selectedMail
    selectedMail.value = {
      ...selectedMail.value,
      tags: [...selectedLabels.value]
    };
  }

  isLabelDialogOpen.value = false;
};

const getLabelColor = (labelId: string): string => {
  const label = availableLabels.value.find(l => l.id === labelId || l.name.toLowerCase() === labelId.toLowerCase());
  return label?.color || 'bg-gray-500';
};

// --- Delete Single Mail ---
const handleDeleteMail = async () => {
  if (!selectedMail.value) return;
  await deleteMessagesAction([selectedMail.value.id]);
  selectedMail.value = null;
};
</script>

<template>
  <div class="min-h-screen">
    <!-- Premium Header Section -->
    <div
      class="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
      <!-- Decorative blurs -->
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2">
      </div>
      <div
        class="absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2">
      </div>

      <div class="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-xl bg-primary/10">
              <Mail class="w-6 h-6 text-primary" />
            </div>
            <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Mail & Correspondence
            </h1>
          </div>
          <p class="text-muted-foreground">
            Manage official correspondence and internal communications
          </p>
        </div>

        <div class="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="outline" size="icon" @click="handleRefresh"
                  class="rounded-xl h-10 w-10 hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <RefreshCw :class="['w-4 h-4', isRefreshing ? 'animate-spin' : '']" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sync Messages</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog :open="isComposeOpen" @update:open="handleComposeClose">
            <DialogTrigger as-child>
              <Button
                class="rounded-xl px-5 h-10 bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-lg shadow-primary/25 transition-all">
                <Plus class="w-4 h-4 mr-2" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-[700px] flex flex-col h-[85vh] border-primary/20">
              <DialogHeader class="pb-4 border-b border-border/50">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-xl bg-primary/10">
                    <component :is="composeMode === 'reply' ? Reply : composeMode === 'forward' ? Forward : Send"
                      class="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle class="text-lg">{{ composeTitle }}</DialogTitle>
                    <DialogDescription>
                      {{ composeMode === 'reply' ? 'Send a reply to this message' : composeMode === 'forward' ? 'Forward this message to others' : 'Send official correspondence to departments or staff' }}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div class="flex-1 flex flex-col gap-4 py-4 overflow-y-auto hidden-scrollbar">
                <!-- To Field -->
                <div class="space-y-2">
                  <label class="text-sm font-medium text-muted-foreground">Recipients</label>
                  <div
                    class="flex flex-wrap gap-2 p-3 border rounded-xl min-h-[50px] bg-muted/30 border-border/50 focus-within:border-primary/50 transition-colors">
                    <Badge v-for="(recipient, index) in composeForm.recipients" :key="recipient.id" variant="secondary"
                      class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                      <component :is="recipient.type === 'department' ? Building2 : User" class="w-3 h-3" />
                      <span class="font-medium">{{ recipient.label }}</span>
                      <button @click="removeRecipient(index)"
                        class="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                        <X class="w-3 h-3" />
                      </button>
                    </Badge>
                    <Select @update:model-value="addRecipient">
                      <SelectTrigger class="border-0 shadow-none h-8 w-auto min-w-[150px] p-0 focus:ring-0">
                        <SelectValue placeholder="Add recipient..." />
                      </SelectTrigger>
                      <SelectContent class="border-primary/20">
                        <template v-for="group in groupedRecipients" :key="group.label">
                          <SelectGroup>
                            <SelectLabel class="text-primary font-semibold">{{ group.label }}</SelectLabel>
                            <SelectItem v-for="item in group.items" :key="item.id" :value="item.id">
                              <div class="flex items-center gap-2">
                                <component :is="item.type === 'department' ? Building2 : User"
                                  class="w-4 h-4 text-muted-foreground" />
                                <div class="flex flex-col text-left">
                                  <span>{{ item.label }}</span>
                                  <span class="text-xs text-muted-foreground" v-if="item.desc">{{ item.desc }}</span>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectGroup>
                          <DropdownMenuSeparator />
                        </template>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <!-- Subject -->
                <div class="space-y-2">
                  <label class="text-sm font-medium text-muted-foreground">Subject</label>
                  <Input v-model="composeForm.subject" placeholder="Enter memo subject..."
                    class="text-base font-medium px-4 py-5 rounded-xl border-border/50 focus-visible:border-primary/50 bg-muted/30" />
                </div>

                <!-- Body (Rich Text) -->
                <div class="flex-1 space-y-2">
                  <label class="text-sm font-medium text-muted-foreground">Content</label>
                  <div class="border rounded-xl overflow-hidden flex flex-col bg-background border-border/50">
                    <div class="border-b px-4 py-2.5 bg-muted/30 flex items-center gap-2">
                      <Sparkles class="w-4 h-4 text-primary" />
                      <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rich Text
                        Editor</span>
                    </div>
                    <div class="flex-1 overflow-y-auto min-h-[200px]">
                      <editor-content :editor="editor" />
                    </div>
                  </div>
                </div>

                <!-- Attachments -->
                <div v-if="composeForm.attachments.length > 0" class="space-y-2">
                  <label class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Paperclip class="w-4 h-4" />
                    Attachments ({{ composeForm.attachments.length }})
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <div v-for="(file, index) in composeForm.attachments" :key="index"
                      class="flex items-center gap-2 text-sm px-3 py-2 border rounded-xl bg-muted/40 border-border/50">
                      <FileText class="w-4 h-4 text-primary" />
                      <span class="max-w-[180px] truncate font-medium">{{ file.name }}</span>
                      <span class="text-xs text-muted-foreground">({{ (file.size / 1024).toFixed(0) }} KB)</span>
                      <button @click="removeAttachment(index)" class="hover:text-destructive transition-colors">
                        <X class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter class="sm:justify-between items-center border-t border-border/50 pt-4">
                <div class="flex items-center gap-2">
                  <input type="file" ref="fileInputRef" multiple class="hidden" @change="handleFileSelect" />
                  <Button type="button" variant="outline" size="sm" @click="triggerFileSelect"
                    class="rounded-lg hover:bg-muted/80">
                    <Paperclip class="w-4 h-4 mr-2" />
                    Attach File
                  </Button>
                </div>
                <div class="flex items-center gap-2">
                  <Button type="button" variant="ghost" @click="isComposeOpen = false" class="rounded-lg">
                    Discard
                  </Button>
                  <Button type="button" @click="handleSend" :disabled="isSending"
                    class="rounded-lg bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90">
                    <Send class="w-4 h-4 mr-2" />
                    {{ isSending ? 'Sending...' : 'Send Memo' }}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-12 gap-6">
      <!-- Sidebar -->
      <div class="col-span-12 lg:col-span-3">
        <Card class="sticky top-6 border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          <!-- Sidebar Header with gradient -->
          <div class="p-4 border-b border-border/50 bg-linear-to-r from-muted/50 to-transparent">
            <div class="flex items-center gap-2">
              <MailOpen class="w-5 h-5 text-primary" />
              <span class="font-semibold">Mailbox</span>
            </div>
          </div>

          <CardContent class="p-3">
            <nav class="space-y-1">
              <button v-for="folder in folderConfig" :key="folder.key"
                @click="activeTab = folder.key, selectedMail = null" :class="[
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group',
                  activeTab === folder.key
                    ? 'bg-linear-to-r from-primary to-emerald-600 text-primary-foreground shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                ]">
                <div class="flex items-center gap-3">
                  <component :is="folder.icon" :class="[
                    'w-4 h-4 transition-transform group-hover:scale-110',
                    activeTab === folder.key && folder.key === 'starred' ? 'fill-current' : ''
                  ]" />
                  <span>{{ folder.label }}</span>
                </div>
                <Badge v-if="folder.countKey && folderCounts[folder.countKey] > 0"
                  :variant="activeTab === folder.key ? 'secondary' : 'outline'" :class="[
                    'text-xs transition-all',
                    activeTab === folder.key ? 'bg-white/20 text-white border-white/30' : ''
                  ]">
                  {{ folderCounts[folder.countKey] }}
                </Badge>
              </button>
            </nav>

            <Separator class="my-4" />

            <!-- Quick Stats -->
            <div class="space-y-3 px-2">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</p>
              <div class="grid grid-cols-2 gap-2">
                <div class="p-3 rounded-xl bg-muted/50 border border-border/50 text-center">
                  <p class="text-2xl font-bold text-primary">{{ allMails.length }}</p>
                  <p class="text-xs text-muted-foreground">Total</p>
                </div>
                <div class="p-3 rounded-xl bg-muted/50 border border-border/50 text-center">
                  <p class="text-2xl font-bold text-amber-500">{{ folderCounts.inbox }}</p>
                  <p class="text-xs text-muted-foreground">Unread</p>
                </div>
              </div>
            </div>

            <Separator class="my-4" />

            <!-- Tags -->
            <div class="space-y-3 px-2">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</p>
              <div class="flex flex-wrap gap-1.5">
                <Badge variant="outline"
                  class="cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 transition-all text-xs">
                  <span class="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
                  Urgent
                </Badge>
                <Badge variant="outline"
                  class="cursor-pointer hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-600 transition-all text-xs">
                  <span class="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
                  Report
                </Badge>
                <Badge variant="outline"
                  class="cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all text-xs">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                  Transfer
                </Badge>
                <Badge variant="outline"
                  class="cursor-pointer hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-600 transition-all text-xs">
                  <span class="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>
                  Project
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Mail List or Detail View -->
      <Card class="col-span-12 lg:col-span-9 border-border/50 shadow-xl shadow-black/5 overflow-hidden">
        <!-- Mail List View -->
        <template v-if="!selectedMail">
          <CardHeader class="pb-4 border-b border-border/50 bg-linear-to-r from-muted/30 to-transparent">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-xl bg-primary/10">
                  <component :is="folderConfig.find(f => f.key === activeTab)?.icon || Inbox"
                    class="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle class="text-lg">{{ getActiveTabLabel }}</CardTitle>
                  <p class="text-sm text-muted-foreground">{{ filteredMails.length }} messages</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input v-model="searchQuery" placeholder="Search messages..."
                    class="pl-9 w-64 rounded-xl border-border/50 focus-visible:border-primary/50 bg-muted/30" />
                </div>
                <Button variant="outline" size="icon" class="rounded-xl">
                  <Filter class="w-4 h-4" />
                </Button>
              </div>
            </div>

            <!-- Bulk Actions -->
            <div v-if="selectedMails.length > 0"
              class="flex items-center gap-3 mt-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <Checkbox :modelValue="selectedMails.length === filteredMails.length"
                @update:modelValue="toggleSelectAll" />
              <span class="text-sm font-medium">{{ selectedMails.length }} selected</span>
              <div class="flex-1"></div>
              <Button v-if="activeTab === 'archive'" variant="ghost" size="sm" @click="handleArchiveSelected(true)"
                class="rounded-lg">
                <ArchiveRestore class="w-4 h-4 mr-1.5" />
                Restore
              </Button>
              <Button v-else variant="ghost" size="sm" @click="handleArchiveSelected(false)" class="rounded-lg">
                <Archive class="w-4 h-4 mr-1.5" />
                Archive
              </Button>
              <Button variant="ghost" size="sm" @click="deleteSelected"
                class="text-destructive hover:text-destructive rounded-lg">
                <Trash2 class="w-4 h-4 mr-1.5" />
                Delete
              </Button>
            </div>
          </CardHeader>

          <CardContent class="p-0">
            <ScrollArea class="h-[600px]">
              <!-- Loading Skeleton -->
              <div v-if="isLoading && filteredMails.length === 0" class="p-4 space-y-3">
                <div v-for="i in 5" :key="i" class="flex items-start gap-4 p-4 rounded-xl bg-muted/30 animate-pulse">
                  <div class="w-12 h-12 rounded-full bg-muted shrink-0"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 bg-muted rounded w-1/3"></div>
                    <div class="h-4 bg-muted rounded w-1/2"></div>
                    <div class="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </div>

              <div v-else class="divide-y divide-border/50">
                <div v-for="mail in filteredMails" :key="mail.id" :class="[
                  'flex items-start gap-4 p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50 border-l-4',
                  !mail.isRead ? 'bg-primary/5 border-l-primary' : 'border-l-transparent',
                  getPriorityBorder(mail.priority)
                ]" @click="markAsRead(mail)">
                  <Checkbox v-if="activeTab === 'inbox' || activeTab === 'archive'"
                    :modelValue="selectedMails.includes(mail.id)" @update:modelValue="toggleSelectMail(mail.id)"
                    @click.stop class="mt-3" />

                  <button @click.stop="toggleStar(mail)" class="mt-3 group">
                    <Star :class="[
                      'w-5 h-5 transition-all duration-200',
                      mail.isStarred
                        ? 'fill-amber-400 text-amber-400 scale-110'
                        : 'text-muted-foreground group-hover:text-amber-400 group-hover:scale-110'
                    ]" />
                  </button>

                  <Avatar class="w-12 h-12 shrink-0 ring-2 ring-border/50 bg-linear-to-br from-primary to-emerald-600">
                    <AvatarImage v-if="mail.from.avatar" :src="mail.from.avatar" />
                    <AvatarFallback v-else class="text-white text-sm font-semibold">
                      {{ getInitials(mail.from.name) }}
                    </AvatarFallback>
                  </Avatar>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <p :class="['text-sm truncate', !mail.isRead ? 'font-bold text-foreground' : 'font-medium']">
                        {{ mail.from.name }}
                      </p>
                      <div class="flex items-center gap-2 shrink-0">
                        <Badge v-if="!mail.isRead" variant="secondary"
                          class="text-[10px] bg-primary/10 text-primary border-primary/20">
                          NEW
                        </Badge>
                        <span class="text-xs text-muted-foreground">
                          {{ formatDistanceToNow(mail.date, { addSuffix: true }) }}
                        </span>
                      </div>
                    </div>
                    <p
                      :class="['text-sm truncate mt-0.5', !mail.isRead ? 'font-semibold text-foreground' : 'text-foreground']">
                      {{ mail.subject }}
                    </p>
                    <p class="text-xs text-muted-foreground truncate mt-1 line-clamp-1">
                      {{ mail.preview }}
                    </p>
                    <div class="flex items-center gap-2 mt-2.5 flex-wrap">
                      <Badge v-if="mail.priority === 'high'" variant="destructive"
                        class="text-[10px] rounded-md px-2 py-0.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse"></span>
                        High Priority
                      </Badge>
                      <div v-if="mail.hasAttachment"
                        class="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-0.5">
                        <Paperclip class="w-3 h-3" />
                        <span>{{ mail.attachments.length }}</span>
                      </div>
                      <Badge v-for="tag in mail.tags.slice(0, 2)" :key="tag" variant="outline"
                        class="text-[10px] rounded-md">
                        {{ tag }}
                      </Badge>
                    </div>
                  </div>

                  <ChevronRight class="w-5 h-5 text-muted-foreground shrink-0 mt-4" />
                </div>

                <!-- Empty State -->
                <div v-if="!isLoading && filteredMails.length === 0"
                  class="flex flex-col items-center justify-center py-16 px-4">
                  <div class="p-4 rounded-2xl bg-muted/50 mb-4">
                    <Mail class="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p class="text-lg font-semibold text-foreground">No messages</p>
                  <p class="text-muted-foreground text-sm mt-1">Your {{ activeTab }} is empty</p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </template>

        <!-- Mail Detail View -->
        <template v-else>
          <CardHeader class="pb-4 border-b border-border/50 bg-linear-to-r from-muted/30 to-transparent">
            <div class="flex items-center gap-3">
              <Button variant="ghost" size="sm" @click="closeMail" class="rounded-lg hover:bg-muted">
                <ArrowLeft class="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <div class="flex-1"></div>
              <div class="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button variant="ghost" size="icon" @click="toggleStar(selectedMail)" class="rounded-lg h-9 w-9">
                        <Star :class="['w-4 h-4', selectedMail.isStarred ? 'fill-amber-400 text-amber-400' : '']" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{{ selectedMail.isStarred ? 'Remove star' : 'Add star' }}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button v-if="selectedMail.folder === 'inbox'" variant="ghost" size="icon"
                        @click="handleSingleArchive(selectedMail.id, false)" class="rounded-lg h-9 w-9">
                        <Archive class="w-4 h-4" />
                      </Button>
                      <Button v-if="selectedMail.folder === 'archive'" variant="ghost" size="icon"
                        @click="handleSingleArchive(selectedMail.id, true)" class="rounded-lg h-9 w-9">
                        <ArchiveRestore class="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{{ selectedMail.folder === 'archive' ? 'Restore' : 'Archive' }}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button variant="ghost" size="icon" class="rounded-lg h-9 w-9" @click="handlePrint">
                        <Printer class="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Print</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="rounded-lg h-9 w-9">
                      <MoreHorizontal class="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-48">
                    <DropdownMenuItem v-if="activeTab !== 'sent'" @click="markAsReadAction(selectedMail.id)">
                      <EyeOff class="w-4 h-4 mr-2" />
                      Mark as Unread
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="handleForward">
                      <Forward class="w-4 h-4 mr-2" />
                      Forward
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openLabelDialog">
                      <Tag class="w-4 h-4 mr-2" />
                      Manage Labels
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem class="text-destructive" @click="handleDeleteMail">
                      <Trash2 class="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-6">
            <div class="space-y-6">
              <!-- Subject Section -->
              <div class="space-y-3">
                <h2 class="text-xl lg:text-2xl font-bold tracking-tight">{{ selectedMail.subject }}</h2>
                <div class="flex items-center gap-2 flex-wrap">
                  <Badge v-if="selectedMail.priority === 'high'" variant="destructive" class="rounded-lg px-3 py-1">
                    <span class="w-2 h-2 rounded-full bg-current mr-1.5 animate-pulse"></span>
                    High Priority
                  </Badge>
                  <Badge v-for="tag in selectedMail.tags" :key="tag" variant="outline" class="rounded-lg px-3 py-1">
                    {{ tag }}
                  </Badge>
                </div>
              </div>

              <Separator class="bg-border/50" />

              <!-- Sender Info -->
              <div class="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                <Avatar class="w-14 h-14 ring-2 ring-border/50 bg-linear-to-br from-primary to-emerald-600">
                  <AvatarImage v-if="selectedMail.from.avatar" :src="selectedMail.from.avatar" />
                  <AvatarFallback class="text-white text-lg font-semibold">
                    {{ getInitials(selectedMail.from.name) }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="font-bold text-lg">{{ selectedMail.from.name }}</p>
                      <p class="text-sm text-muted-foreground">{{ selectedMail.from.email }}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-sm font-medium">
                        {{ format(selectedMail.date, 'MMM d, yyyy') }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ format(selectedMail.date, 'h:mm a') }}
                      </p>
                    </div>
                  </div>
                  <div class="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <span>To:</span>
                    <span class="font-medium text-foreground">{{ selectedMail.to.join(', ') }}</span>
                  </div>
                </div>
              </div>

              <Separator class="bg-border/50" />

              <!-- Message Body - FIXED: Now renders HTML properly -->
              <div
                class="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-a:text-primary">
                <div v-html="selectedMail.body" class="mail-body-content"></div>
              </div>

              <!-- Attachments -->
              <div v-if="selectedMail.attachments.length > 0" class="space-y-4">
                <Separator class="bg-border/50" />
                <div>
                  <h4 class="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Paperclip class="w-4 h-4 text-primary" />
                    Attachments ({{ selectedMail.attachments.length }})
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div v-for="attachment in selectedMail.attachments" :key="attachment.name"
                      class="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 hover:bg-muted/50 cursor-pointer transition-all group">
                      <div
                        class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileText class="w-5 h-5 text-primary" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ attachment.name }}</p>
                        <p class="text-xs text-muted-foreground">{{ attachment.size }}</p>
                      </div>
                      <Button variant="ghost" size="icon" class="rounded-lg h-8 w-8 shrink-0">
                        <Download class="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator class="bg-border/50" />

              <!-- Reply Actions -->
              <div class="flex flex-col sm:flex-row gap-3">
                <Button @click="handleReply"
                  class="flex-1 rounded-xl h-11 bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-lg shadow-primary/20">
                  <Reply class="w-4 h-4 mr-2" />
                  Reply
                </Button>
                <Button variant="outline" class="flex-1 rounded-xl h-11 hover:bg-muted/80" @click="handleForward">
                  <Forward class="w-4 h-4 mr-2" />
                  Forward
                </Button>
              </div>
            </div>
          </CardContent>
        </template>
      </Card>
    </div>

    <!-- Label Management Dialog -->
    <Dialog :open="isLabelDialogOpen" @update:open="(val: boolean) => isLabelDialogOpen = val">
      <DialogContent class="sm:max-w-[450px] border-primary/20">
        <DialogHeader class="pb-4 border-b border-border/50">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-primary/10">
              <Tag class="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle class="text-lg">Manage Labels</DialogTitle>
              <DialogDescription>
                Add or remove labels for this message
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="py-4 space-y-4">
          <!-- Existing Labels -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">Available Labels</label>
            <div class="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto">
              <button v-for="label in availableLabels" :key="label.id" @click="toggleLabel(label.name)" :class="[
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all',
                selectedLabels.includes(label.name) || selectedLabels.includes(label.id)
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border/50 hover:bg-muted/50'
              ]">
                <span :class="['w-3 h-3 rounded-full shrink-0', label.color]"></span>
                <span class="flex-1 text-sm font-medium truncate">{{ label.name }}</span>
                <Check v-if="selectedLabels.includes(label.name) || selectedLabels.includes(label.id)"
                  class="w-4 h-4 text-primary shrink-0" />
              </button>
            </div>
          </div>

          <!-- Add New Label -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">Create New Label</label>
            <div class="flex gap-2">
              <Input v-model="newLabelName" placeholder="Enter label name..." @keyup.enter="addNewLabel"
                class="flex-1 rounded-xl border-border/50 focus-visible:border-primary/50" />
              <Button variant="outline" size="icon" @click="addNewLabel" :disabled="!newLabelName.trim()"
                class="rounded-xl h-10 w-10 shrink-0">
                <Plus class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <!-- Selected Labels Preview -->
          <div v-if="selectedLabels.length > 0" class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">Selected Labels</label>
            <div class="flex flex-wrap gap-2">
              <Badge v-for="labelId in selectedLabels" :key="labelId" variant="secondary"
                class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg">
                <span :class="['w-2 h-2 rounded-full', getLabelColor(labelId)]"></span>
                <span class="font-medium">{{ labelId }}</span>
                <button @click="toggleLabel(labelId)"
                  class="ml-0.5 hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors">
                  <X class="w-3 h-3" />
                </button>
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter class="border-t border-border/50 pt-4">
          <Button variant="ghost" @click="isLabelDialogOpen = false" class="rounded-lg">
            Cancel
          </Button>
          <Button @click="saveLabels"
            class="rounded-lg bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90">
            <Check class="w-4 h-4 mr-2" />
            Save Labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Printer Modal with Preview -->
    <PrinterModal v-model:open="printerModal" :document-title="selectedMail?.subject || 'Document'"
      :print-content="printContentHtml" @print-success="handlePrintSuccess" />
  </div>
</template>

<style>
/* Tiptap Editor styles */
.ProseMirror {
  outline: none;
  min-height: 200px;
}

.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

/* Mail body content styles - ensures HTML renders properly */
.mail-body-content {
  font-family: inherit;
  line-height: 1.7;
}

.mail-body-content p {
  margin-bottom: 1em;
}

.mail-body-content ul,
.mail-body-content ol {
  padding-left: 1.5em;
  margin-bottom: 1em;
}

.mail-body-content li {
  margin-bottom: 0.25em;
}

.mail-body-content strong,
.mail-body-content b {
  font-weight: 600;
}

.mail-body-content em,
.mail-body-content i {
  font-style: italic;
}

.mail-body-content a {
  color: var(--primary);
  text-decoration: underline;
}

.mail-body-content a:hover {
  opacity: 0.8;
}

.mail-body-content blockquote {
  border-left: 3px solid var(--primary);
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: var(--muted-foreground);
}

.mail-body-content h1,
.mail-body-content h2,
.mail-body-content h3,
.mail-body-content h4 {
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.mail-body-content h1 {
  font-size: 1.5em;
}

.mail-body-content h2 {
  font-size: 1.25em;
}

.mail-body-content h3 {
  font-size: 1.1em;
}

.mail-body-content pre {
  background-color: var(--muted);
  padding: 1em;
  border-radius: 0.5em;
  overflow-x: auto;
  font-family: monospace;
}

.mail-body-content code {
  background-color: var(--muted);
  padding: 0.2em 0.4em;
  border-radius: 0.25em;
  font-family: monospace;
  font-size: 0.9em;
}

.mail-body-content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
}

.mail-body-content th,
.mail-body-content td {
  border: 1px solid var(--border);
  padding: 0.5em;
  text-align: left;
}

.mail-body-content th {
  background-color: var(--muted);
  font-weight: 600;
}

/* Scrollbar styling for hidden scrollbar */
.hidden-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hidden-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>