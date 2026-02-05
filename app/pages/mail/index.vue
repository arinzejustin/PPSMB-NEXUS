<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { definePageMeta, useHead } from '#imports';
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
  ArchiveRestore
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
import { format, formatDistanceToNow } from 'date-fns';
import { useInternalMail } from '@/composables/useInternalMail';
import { useIsDesktop } from "@/composables/useIsDesktop"
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { InternalMail } from '@/types/mail';

definePageMeta({
  layout: 'app',
  middleware: ["user-validate"]
});


useHead({
  title: useIsDesktop() ? "PPSMB File Manager" : "Mail & Correspondence"
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
  refresh: refreshMails,
} = useInternalMail();

const isComposeOpen = ref(false);
const composeForm = ref({
  recipients: [] as any[],
  subject: '',
  body: '',
  attachments: [] as File[]
});

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
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
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
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// --- Existing Mail Logic ---

const searchQuery = ref('');
const activeTab = ref('inbox');
const selectedMail = ref<InternalMail | null>(null);
const selectedMails = ref<string[]>([]);

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

  // Sort by date (newest first)
  return mails.sort((a, b) => b.date.getTime() - a.date.getTime());
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
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Mail & Correspondence</h1>
        <p class="text-muted-foreground mt-1">
          Manage official correspondence and communications
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="fetchMails(1, true)">
          <RefreshCw class="w-4 h-4 mr-2" />
          Sync
        </Button>

        <Dialog v-model:open="isComposeOpen">
          <DialogTrigger as-child>
            <Button size="sm">
              <Plus class="w-4 h-4 mr-2" />
              New Internal Memo
            </Button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-[700px] flex flex-col h-[85vh]">
            <DialogHeader>
              <DialogTitle>New Internal Memo</DialogTitle>
              <DialogDescription>
                Send official correspondence to departments or staff.
              </DialogDescription>
            </DialogHeader>

            <div class="flex-1 flex flex-col gap-4 py-4 overflow-y-auto hidden-scrollbar">
              <!-- To Field -->
              <div class="space-y-2">
                <div class="flex flex-wrap gap-2 mb-2 p-2 border rounded-md min-h-[42px] bg-background">
                  <Badge v-for="(recipient, index) in composeForm.recipients" :key="recipient.id" variant="secondary"
                    class="flex items-center gap-1 pl-2 pr-1 py-1">
                    <component :is="recipient.type === 'department' ? Building2 : User"
                      class="w-3 h-3 text-muted-foreground" />
                    <span>{{ recipient.label }}</span>
                    <button @click="removeRecipient(index)"
                      class="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5">
                      <X class="w-3 h-3" />
                    </button>
                  </Badge>
                  <Select @update:model-value="addRecipient">
                    <SelectTrigger class="border-0 shadow-none h-8 w-auto min-w-[150px] p-0 focus:ring-0">
                      <SelectValue placeholder="Add recipient..." />
                    </SelectTrigger>
                    <SelectContent>
                      <template v-for="group in groupedRecipients" :key="group.label">
                        <SelectGroup>
                          <SelectLabel>{{ group.label }}</SelectLabel>
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
              <div class="space-y-1">
                <Input v-model="composeForm.subject" placeholder="Memo Subject"
                  class="text-base font-medium px-4 py-6 border-0 shadow-sm ring-1 ring-inset ring-border focus-visible:ring-2 focus-visible:ring-primary bg-muted/20" />
              </div>

              <!-- Body (Rich Text) -->
              <div class="flex-1 border rounded-md overflow-hidden flex flex-col bg-background shadow-sm">
                <!-- Toolbar could go here -->
                <div class="border-b px-3 py-2 bg-muted/30 flex items-center gap-2">
                  <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Memo Content</span>
                </div>
                <div class="flex-1 overflow-y-auto">
                  <editor-content :editor="editor" />
                </div>
              </div>

              <!-- Attachments -->
              <div v-if="composeForm.attachments.length > 0" class="space-y-2">
                <p class="text-xs font-semibold text-muted-foreground">Attachments</p>
                <div class="flex flex-wrap gap-2">
                  <div v-for="(file, index) in composeForm.attachments" :key="index"
                    class="flex items-center gap-2 text-sm p-2 border rounded-md bg-muted/40">
                    <Paperclip class="w-3 h-3 text-muted-foreground" />
                    <span class="max-w-[200px] truncate">{{ file.name }}</span>
                    <span class="text-xs text-muted-foreground">({{ (file.size / 1024).toFixed(0) }} KB)</span>
                    <button @click="removeAttachment(index)" class="hover:text-destructive">
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter class="sm:justify-between items-center border-t pt-4">
              <div class="flex items-center gap-2">
                <input type="file" ref="fileInputRef" multiple class="hidden" @change="handleFileSelect" />
                <Button type="button" variant="outline" size="sm" @click="triggerFileSelect">
                  <Paperclip class="w-4 h-4 mr-2" />
                  Attach File
                </Button>
              </div>
              <div class="flex items-center gap-2">
                <Button type="button" variant="ghost" @click="isComposeOpen = false">Discard</Button>
                <Button type="button" @click="handleSend" :disabled="isSending">
                  <Send class="w-4 h-4 mr-2" />
                  {{ isSending ? 'Sending...' : 'Send Memo' }}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-12 gap-6">
      <!-- Sidebar -->
      <Card class="col-span-12 lg:col-span-3 h-fit shadow-lg">
        <CardContent class="p-4">
          <nav class="space-y-2">
            <button @click="activeTab = 'inbox', selectedMail = null" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-500',
              activeTab === 'inbox'
                ? 'bg-linear-to-br from-emerald-500 dark:from-emerald-400 to-primary/40 text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <Inbox class="w-4 h-4" />
                <span>Inbox</span>
              </div>
              <Badge v-if="folderCounts.inbox > 0" variant="secondary" class="text-xs">
                {{ folderCounts.inbox }}
              </Badge>
            </button>
            <button @click="activeTab = 'sent', selectedMail = null" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-500',
              activeTab === 'sent'
                ? 'bg-linear-to-br from-emerald-500 dark:from-emerald-400 to-primary/40 text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <Send class="w-4 h-4" />
                <span>Sent</span>
              </div>
            </button>
            <button @click="activeTab = 'starred', selectedMail = null" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-500',
              activeTab === 'starred'
                ? 'bg-linear-to-br from-emerald-500 dark:from-emerald-400 to-primary/40 text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <Star class="w-4 h-4" />
                <span>Starred</span>
              </div>
              <Badge v-if="folderCounts.starred > 0" variant="secondary" class="text-xs">
                {{ folderCounts.starred }}
              </Badge>
            </button>
            <button @click="activeTab = 'archive', selectedMail = null" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-500',
              activeTab === 'archive'
                ? 'bg-linear-to-br from-emerald-500 dark:from-emerald-400 to-primary/40 text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <Archive class="w-4 h-4" />
                <span>Archive</span>
              </div>
            </button>
          </nav>

          <Separator class="my-4" />

          <!-- Tags -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">Tags</p>
            <div class="flex flex-wrap gap-2 px-3">
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">Urgent</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">Report</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">Transfer</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">Certification</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">Priority</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">Project</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">Proposal</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Mail List or Detail View -->
      <Card class="col-span-12 lg:col-span-9 shadow-lg">
        <!-- Mail List View -->
        <template v-if="!selectedMail">
          <CardHeader class="pb-3 mb-5">
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg capitalize">{{ activeTab }}</CardTitle>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input v-model="searchQuery" placeholder="Search mail..." class="pl-9 w-64" />
                </div>
              </div>
            </div>
            <!-- Bulk Actions -->
            <div v-if="selectedMails.length > 0" class="flex items-center gap-2 mt-3 p-2 bg-muted rounded-lg">
              <span class="text-sm text-muted-foreground">{{ selectedMails.length }} selected</span>
              <div class="flex-1"></div>
              <Button v-if="activeTab === 'archive'" variant="ghost" size="sm" @click="handleArchiveSelected(true)">
                <ArchiveRestore class="w-4 h-4 mr-1" />
                Unarchive
              </Button>
              <Button v-else variant="ghost" size="sm" @click="handleArchiveSelected(false)">
                <Archive class="w-4 h-4 mr-1" />
                Archive
              </Button>
              <Button variant="ghost" size="sm" @click="deleteSelected" class="text-destructive hover:text-destructive">
                <Trash2 class="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-0">
            <ScrollArea class="h-[600px]">

              <!-- Loading Skeleton -->
              <div v-if="isLoading && filteredMails.length === 0" class="p-4 space-y-4">
                <div v-for="i in 5" :key="i" class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 bg-muted animate-pulse rounded w-1/3"></div>
                    <div class="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                    <div class="h-3 bg-muted animate-pulse rounded w-3/4"></div>
                  </div>
                </div>
              </div>

              <div v-else class="divide-y">
                <div v-for="mail in filteredMails" :key="mail.id" :class="[
                  'flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50',
                  !mail.isRead ? 'bg-primary/5' : ''
                ]" @click="markAsRead(mail)">
                  <Checkbox :modelValue="selectedMails.includes(mail.id)" @update:modelValue="toggleSelectMail(mail.id)"
                    @click.stop class="mt-1" />
                  <button @click.stop="toggleStar(mail)" class="mt-1">
                    <Star :class="[
                      'w-4 h-4 transition-colors',
                      mail.isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground hover:text-amber-400'
                    ]" />
                  </button>
                  <Avatar class="w-10 h-10 shrink-0">
                    <AvatarImage :src="mail.from.avatar" />
                    <AvatarFallback class="bg-primary/10 text-primary text-sm">
                      {{ getInitials(mail.from.name) }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <p :class="['text-sm truncate', !mail.isRead ? 'font-semibold' : 'font-medium']">
                        {{ mail.from.name }}
                      </p>
                      <span class="text-xs text-muted-foreground shrink-0">
                        {{ formatDistanceToNow(mail.date, { addSuffix: true }) }}
                      </span>
                    </div>
                    <p :class="['text-sm truncate', !mail.isRead ? 'font-medium text-foreground' : 'text-foreground']">
                      {{ mail.subject }}
                    </p>
                    <p class="text-xs text-muted-foreground truncate mt-1">
                      {{ mail.preview }}
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <Badge v-if="mail.priority === 'high'" :class="getPriorityColor(mail.priority)"
                        class="text-[10px]">
                        High Priority
                      </Badge>
                      <div v-if="mail.hasAttachment" class="flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip class="w-3 h-3" />
                        <span>{{ mail.attachments.length }}</span>
                      </div>
                      <Badge v-for="tag in mail.tags.slice(0, 2)" :key="tag" variant="outline" class="text-[10px]">
                        {{ tag }}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                </div>

                <!-- Empty State -->
                <div v-if="!isLoading && filteredMails.length === 0" class="p-12 text-center">
                  <Mail class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p class="text-muted-foreground">No messages in {{ activeTab }}</p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </template>

        <!-- Mail Detail View -->
        <template v-else>
          <CardHeader class="pb-3">
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm" @click="closeMail">
                <ArrowLeft class="w-4 h-4 mr-1" />
                Back
              </Button>
              <div class="flex-1"></div>
              <Button variant="ghost" size="sm" @click="toggleStar(selectedMail)">
                <Star :class="['w-4 h-4', selectedMail.isStarred ? 'fill-amber-400 text-amber-400' : '']" />
              </Button>
              <Button v-if="selectedMail.folder === 'inbox'" variant="ghost" size="sm"
                @click="handleSingleArchive(selectedMail.id, false)">
                <Archive class="w-4 h-4" />
              </Button>
              <Button v-if="selectedMail.folder === 'archive'" variant="ghost" size="sm"
                @click="handleSingleArchive(selectedMail.id, true)">
                <ArchiveRestore class="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Printer class="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal class="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Mark as Unread</DropdownMenuItem>
                  <DropdownMenuItem>Forward</DropdownMenuItem>
                  <DropdownMenuItem>Move to Folder</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem class="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-6">
              <!-- Subject -->
              <div>
                <h2 class="text-xl font-semibold">{{ selectedMail.subject }}</h2>
                <div class="flex items-center gap-2 mt-2">
                  <Badge v-if="selectedMail.priority === 'high'" :class="getPriorityColor(selectedMail.priority)">
                    High Priority
                  </Badge>
                  <Badge v-for="tag in selectedMail.tags" :key="tag" variant="outline">
                    {{ tag }}
                  </Badge>
                </div>
              </div>

              <Separator />

              <!-- From/To -->
              <div class="flex items-start gap-4">
                <Avatar class="w-12 h-12">
                  <AvatarImage v-if="selectedMail.from.avatar" :src="selectedMail.from.avatar" />
                  <AvatarFallback v-else class="bg-primary/10 text-primary">
                    {{ getInitials(selectedMail.from.name) }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-semibold">{{ selectedMail.from.name }}</p>
                      <p class="text-sm text-muted-foreground">{{ selectedMail.from.email }}</p>
                    </div>
                    <p class="text-sm text-muted-foreground">
                      {{ format(selectedMail.date, 'MMM d, yyyy \'at\' h:mm a') }}
                    </p>
                  </div>
                  <p class="text-sm text-muted-foreground mt-1">
                    To: {{ selectedMail.to.join(', ') }}
                  </p>
                </div>
              </div>

              <Separator />

              <!-- Body -->
              <div class="prose prose-sm max-w-none dark:prose-invert">
                <pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">{{ selectedMail.body }}</pre>
              </div>

              <!-- Attachments -->
              <div v-if="selectedMail.attachments.length > 0">
                <Separator />
                <div class="mt-4">
                  <h4 class="text-sm font-medium mb-3 flex items-center gap-2">
                    <Paperclip class="w-4 h-4" />
                    Attachments ({{ selectedMail.attachments.length }})
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    <div v-for="attachment in selectedMail.attachments" :key="attachment.name"
                      class="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted cursor-pointer transition-colors">
                      <div class="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <Paperclip class="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p class="text-sm font-medium">{{ attachment.name }}</p>
                        <p class="text-xs text-muted-foreground">{{ attachment.size }}</p>
                      </div>
                      <Button variant="ghost" size="sm" class="ml-2">
                        <Download class="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <!-- Reply Actions -->
              <div class="flex items-center gap-2">
                <Button class="flex-1">
                  <Reply class="w-4 h-4 mr-2" />
                  Reply
                </Button>
                <Button variant="outline" class="flex-1">
                  <Forward class="w-4 h-4 mr-2" />
                  Forward
                </Button>
              </div>
            </div>
          </CardContent>
        </template>
      </Card>
    </div>
  </div>
</template>

<style>
/* Tiptap styles */
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
</style>
