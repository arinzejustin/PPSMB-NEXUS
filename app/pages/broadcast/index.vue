<script setup lang="ts">
import { ref, computed, watch, type DeepReadonly } from 'vue';
import { definePageMeta, useHead, showToast, sharedToast, useRuntimeConfig } from '#imports';
import { useUser } from '@/composables/useUserStates';
import { useBroadcastData } from '@/composables/useBroadcastData';
import { useSyncStatus } from '@/composables/useSyncStatus';
import {
  Send,
  Mail,
  MessageSquare,
  Users,
  User,
  MapPin,
  Building2,
  Building,
  Briefcase,
  BookOpen,
  Search,
  Plus,
  X,
  Link2,
  FileText,
  Upload,
  History,
  FileEdit,
  Trash2,
  Eye,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Save,
  LayoutTemplate,
  MoreHorizontal,
  Crown,
  Shield,
  Zap,
  Download,
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { calculateSmsSegments } from "@/types/broadcast";
import type {
  BroadcastChannel,
  RecipientFilterType,
  RecipientFilter,
  BroadcastMessage,
  BroadcastAttachment,
  MessageTemplate,
  Recipient,
  BroadcastDraft, BroadcastHistoryEntry,
} from '@/types/broadcast';

definePageMeta({
  layout: 'app',
  middleware: ['user-validate'],
});

const env = useRuntimeConfig(), isDesktop = env.public.appType === 'desktop';

useHead({
  title: isDesktop ? 'PPSMB File Manager' : 'Broadcasting Hub - PPSMB',
});

const user = useUser();
const { status: syncStatus } = useSyncStatus();
const {
  zones,
  schools,
  subjects,
  roles,
  templates,
  drafts,
  history,
  isSending,
  filterOptions,
  error,
  canBroadcast,
  canSendInternal,
  getRecipientCount,
  sendBroadcast,
  saveDraft,
  deleteDraft,
  uploadForSmartLink,
  getRecipientsByFilter,
  saveTemplate,
  deleteTemplate,
  refreshHistory,
  updateTemplate,
  searchStaff,
} = useBroadcastData();

// UI State
const activeTab = ref<'compose' | 'internal' | 'drafts' | 'history' | 'templates'>('compose');
const channel = ref<BroadcastChannel>('email');
const isInternal = ref(false);
const oldError = ref('');

// Recipient Filter State
const filterType = ref<RecipientFilterType>('global');
const filterValue = ref<string>('');
const selectedZoneForSchool = ref<string>('');
const searchQuery = ref('');
const searchResults = ref<Recipient[]>([]);
const selectedRecipients = ref<Recipient[]>([]);
const selectedIndividuals = ref<string[]>([]); // Keep for backward compat/watcher, but sync with selectedRecipients
const recipientCount = ref(0);

// Edit Template State
const showEditTemplateDialog = ref(false);
const editingTemplate = ref<MessageTemplate | null>(null);
const editTemplateName = ref('');
const editTemplateSubject = ref('');
const editTemplateBody = ref('');

// Email Content State
const emailSubject = ref('');
const emailBody = ref('');
const emailAttachments = ref<BroadcastAttachment[]>([]);

// SMS Content State
const smsBody = ref('');
const smsSmartLinks = ref<{ url: string; label: string }[]>([]);

// Template Dialog
const showTemplateDialog = ref(false);
const selectedTemplate = ref<MessageTemplate | null>(null);

// Preview Dialog
const showPreviewDialog = ref(false);
const previewRecipients = ref<any[]>([]);

// Confirmation Dialog
const showConfirmDialog = ref(false);

// Save Template Dialog
const showSaveTemplateDialog = ref(false);
const newTemplateName = ref('');

// Edit Draft Dialog
const showEditDraftDialog = ref(false);
const editingDraft = ref<BroadcastDraft | null>(null);
const editDraftSubject = ref('');
const editDraftBody = ref('');

// Message Details Dialog
const showDetailsDialog = ref(false);
const selectedHistoryItem = ref<DeepReadonly<BroadcastHistoryEntry> | null>(null);

// History refresh state
const isRefreshingHistory = ref(false);

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null);
const smsFileInputRef = ref<HTMLInputElement | null>(null);

// Icon mapping
const iconMap: Record<string, any> = {
  User, Users, MapPin, Building2, Building, Briefcase, BookOpen,
};

// Computed: SMS Stats
const smsStats = computed(() => {
  const stats = calculateSmsSegments(smsBody.value);
  return stats;
});

watch(() => error.value, (newError) => {
  if (newError && oldError.value !== newError) {
    showToast(newError, "error");
    oldError.value = newError;
  }
})

// Computed: Filter Label
const filterLabel = computed(() => {
  switch (filterType.value) {
    case 'individual':
      return selectedIndividuals.value.length > 0
        ? `${selectedIndividuals.value.length} staff selected`
        : 'No staff selected';
    case 'global':
      return 'All Teachers';
    case 'zone':
      const zone = zones.value.find(z => z.id === filterValue.value);
      return zone ? `All staff in ${zone.name}` : 'Select a zone';
    case 'school':
      const school = schools.value.find(s => s.id === filterValue.value);
      return school ? `All staff at ${school.name}` : 'Select a school';
    case 'role':
      const role = roles.value.find(r => r.id === filterValue.value);
      return role ? `All ${role.label}s` : 'Select a role';
    case 'subject':
      const subject = subjects.value.find(s => s.id === filterValue.value);
      return subject ? `All ${subject.name} teachers` : 'Select a subject';
    case 'headquarters':
      return filterValue.value === 'main' ? 'Main Headquarters' : 'Zonal Headquarters';
    default:
      return 'Configure recipients';
  }
});

// Computed: Can Send
const canSend = computed(() => {
  if (!syncStatus.value.isOnline) return false;
  if (recipientCount.value === 0) return false;
  if (channel.value === 'email') {
    return emailSubject.value.trim() && emailBody.value.trim();
  }
  return smsBody.value.trim();
});

// Watch filter changes to update recipient count
watch([filterType, filterValue, selectedIndividuals], async () => {
  const filter: RecipientFilter = {
    type: filterType.value,
    value: filterValue.value || null,
    label: filterLabel.value,
    tags: [],
  };
  recipientCount.value = await getRecipientCount(filter);
}, { immediate: true });

// Sync selected recipients to values
watch(selectedRecipients, (newVal) => {
  selectedIndividuals.value = newVal.map(r => r.id);
  filterValue.value = selectedIndividuals.value.join(',');
}, { deep: true });

// Handle Staff Search
const handleSearchStaff = async () => {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }
  searchResults.value = await searchStaff(searchQuery.value);
};

// Select Recipient
const selectRecipient = (recipient: Recipient) => {
  if (selectedRecipients.value.length >= 5) {
    showToast("Maximum of 5 recipients allowed", "error");
    return;
  }
  if (!selectedRecipients.value.find(r => r.id === recipient.id)) {
    selectedRecipients.value.push(recipient);
  }
  searchQuery.value = '';
  searchResults.value = [];
};

// Remove Recipient
const removeRecipient = (recipientId: string) => {
  selectedRecipients.value = selectedRecipients.value.filter(r => r.id !== recipientId);
};

// Open Edit Template Modal
const openEditTemplateModal = (template: MessageTemplate) => {
  editingTemplate.value = template;
  editTemplateName.value = template.name;
  editTemplateSubject.value = template.subject || '';
  editTemplateBody.value = template.body;
  showEditTemplateDialog.value = true;
};

// Save Edited Template
const handleSaveEditedTemplate = async () => {
  if (!editingTemplate.value) return;

  await updateTemplate(editingTemplate.value.id, {
    name: editTemplateName.value,
    subject: editingTemplate.value.channel === 'email' ? editTemplateSubject.value : undefined,
    body: editTemplateBody.value,
  });

  showEditTemplateDialog.value = false;
  editingTemplate.value = null;
  showToast('Template updated successfully', 'success');
};

// Reset filter value when type changes
watch(filterType, () => {
  filterValue.value = '';
  selectedIndividuals.value = [];
  selectedZoneForSchool.value = '';
});

// Switch to internal tab
watch(isInternal, (val) => {
  if (val) {
    filterType.value = 'headquarters';
    filterValue.value = 'main';
  } else {
    filterType.value = 'global';
    filterValue.value = '';
  }
});

// Handle file upload for email
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files) return;

  Array.from(target.files).forEach(file => {
    const attachment: BroadcastAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      file: file,
    };
    emailAttachments.value.push(attachment);
  });

  target.value = '';
};

// Handle file upload for SMS smart link
const handleSmsFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  if (!file) {
    showToast("No file selected", "error");
    return;
  }
  const smartLink = await uploadForSmartLink(file);

  // Insert smart link into SMS body
  smsBody.value += (smsBody.value ? ' ' : '') + smartLink.shortUrl;
  smsSmartLinks.value.push({ url: smartLink.shortUrl, label: file.name });

  target.value = '';
};

// Remove attachment
const removeAttachment = (id: string) => {
  emailAttachments.value = emailAttachments.value.filter(a => a.id !== id);
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Apply template
const applyTemplate = (template: MessageTemplate) => {
  channel.value = template.channel;
  if (template.channel === 'email') {
    emailSubject.value = template.subject || '';
    emailBody.value = template.body;
  } else {
    smsBody.value = template.body;
  }
  showTemplateDialog.value = false;
  activeTab.value = 'compose';
};

// Preview recipients
const previewRecipientsHandler = async () => {
  const filter: RecipientFilter = {
    type: filterType.value,
    value: filterValue.value || null,
    label: filterLabel.value,
    tags: [],
  };
  previewRecipients.value = await getRecipientsByFilter(filter, 20);
  showPreviewDialog.value = true;
};

// Send message
const handleSend = async () => {
  const message: BroadcastMessage = {
    channel: channel.value,
    recipientFilter: {
      type: filterType.value,
      value: filterValue.value || null,
      label: filterLabel.value,
      tags: [],
    },
    recipientCount: recipientCount.value,
    recipients: [],
    isInternal: isInternal.value,
    isDraft: false,
    createdAt: new Date(),
    createdBy: user.value?.name || 'Unknown',
    status: 'sending',
  };

  if (channel.value === 'email') {
    message.emailContent = {
      subject: emailSubject.value,
      body: emailBody.value,
      attachments: emailAttachments.value,
      inlineImages: [],
    };
  } else {
    message.smsContent = {
      body: smsBody.value,
      smartLinks: smsSmartLinks.value.map(l => ({
        originalUrl: l.url,
        shortUrl: l.url,
        fileName: l.label
      })),
      characterCount: smsStats.value.characters,
      segmentCount: smsStats.value.segments,
    };
  }

  const result = await sendBroadcast(message);

  if (result.success) {
    showConfirmDialog.value = false;
    emailSubject.value = '';
    emailBody.value = '';
    emailAttachments.value = [];
    smsBody.value = '';
    smsSmartLinks.value = [];
    showToast(`Message sent to ${recipientCount.value} recipients!`, 'success');
    activeTab.value = 'history';
  } else {
    showToast(result.error || 'An error occurred while sending the message.', 'error');
  }
};

// Save as draft
const handleSaveDraft = async () => {
  const draft = {
    channel: channel.value,
    recipientFilter: {
      type: filterType.value,
      value: filterValue.value || null,
      label: filterLabel.value,
      tags: [],
    },
    recipientCount: recipientCount.value,
    recipients: [],
    isInternal: isInternal.value,
    isDraft: true,
    createdAt: new Date(),
    createdBy: user.value?.name || 'Unknown',
    lastModified: new Date(),
    ...(channel.value === 'email' && {
      emailContent: {
        subject: emailSubject.value,
        body: emailBody.value,
        attachments: emailAttachments.value,
        inlineImages: [],
      },
    }),
    ...(channel.value === 'sms' && {
      smsContent: {
        body: smsBody.value,
        smartLinks: smsSmartLinks.value.map(l => ({
          originalUrl: l.url,
          shortUrl: l.url,
          fileName: l.label
        })),
        characterCount: smsStats.value.characters,
        segmentCount: smsStats.value.segments,
      },
    }),
  };

  await saveDraft(draft);
  sharedToast({ message: 'Your message has been saved as a draft.', type: 'success' });
};

// Save as template
const handleSaveTemplate = async () => {
  if (!newTemplateName.value.trim()) return;

  const template = {
    name: newTemplateName.value,
    channel: channel.value,
    subject: channel.value === 'email' ? emailSubject.value : undefined,
    body: channel.value === 'email' ? emailBody.value : smsBody.value,
    tags: [],
  };

  await saveTemplate(template);
  showSaveTemplateDialog.value = false;
  newTemplateName.value = '';
  sharedToast({ message: 'Your message template has been saved.', type: 'success' });
};

// Get status badge color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'sent': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'sending': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'partial': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  }
};

// Get initials
const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

// Load draft into compose section
const loadDraftToCompose = (draft: BroadcastDraft) => {
  // Set channel
  channel.value = draft.channel;
  isInternal.value = draft.isInternal;

  // Set recipient filter
  filterType.value = draft.recipientFilter.type;
  filterValue.value = draft.recipientFilter.value || '';

  // Set content based on channel
  if (draft.channel === 'email' && draft.emailContent) {
    emailSubject.value = draft.emailContent.subject || '';
    emailBody.value = draft.emailContent.body || '';
    emailAttachments.value = draft.emailContent.attachments || [];
  } else if (draft.smsContent) {
    smsBody.value = draft.smsContent.body || '';
    smsSmartLinks.value = draft.smsContent.smartLinks?.map(l => ({
      url: l.shortUrl,
      label: l.fileName || 'File'
    })) || [];
  }

  // Navigate to compose tab
  activeTab.value = 'compose';
};

// Open edit draft modal
const openEditDraftModal = (draft: BroadcastDraft) => {
  editingDraft.value = draft;
  if (draft.channel === 'email' && draft.emailContent) {
    editDraftSubject.value = draft.emailContent.subject || '';
    editDraftBody.value = draft.emailContent.body || '';
  } else if (draft.smsContent) {
    editDraftBody.value = draft.smsContent.body || '';
  }
  showEditDraftDialog.value = true;
};

// Save edited draft
const handleSaveEditedDraft = async () => {
  if (!editingDraft.value) return;

  const updatedDraft = {
    ...editingDraft.value,
    lastModified: new Date(),
  };

  if (editingDraft.value.channel === 'email') {
    updatedDraft.emailContent = {
      ...updatedDraft.emailContent,
      subject: editDraftSubject.value,
      body: editDraftBody.value,
      attachments: updatedDraft.emailContent?.attachments || [],
      inlineImages: updatedDraft.emailContent?.inlineImages || [],
    };
  } else {
    updatedDraft.smsContent = {
      ...updatedDraft.smsContent,
      body: editDraftBody.value,
      smartLinks: updatedDraft.smsContent?.smartLinks || [],
      characterCount: editDraftBody.value.length,
      segmentCount: Math.ceil(editDraftBody.value.length / 160),
    };
  }

  await saveDraft(updatedDraft);
  showEditDraftDialog.value = false;
  editingDraft.value = null;
  sharedToast({ message: 'Draft updated successfully!', type: 'success' });
};

// Refresh history with loading state
const handleRefreshHistory = async () => {
  isRefreshingHistory.value = true;
  try {
    await refreshHistory();
  } catch (err) {
    showToast('Failed to refresh messages', 'error');
  } finally {
    isRefreshingHistory.value = false;
  }
};

// View message details
const viewMessageDetails = (item: DeepReadonly<BroadcastHistoryEntry>) => {
  selectedHistoryItem.value = item;
  showDetailsDialog.value = true;
};

// Resend message
const resendMessage = async (item: DeepReadonly<BroadcastHistoryEntry>) => {
  // Populate compose form with the sent message content
  channel.value = item.channel;
  isInternal.value = item.isInternal;
  filterType.value = item.filterType;

  if (item.channel === 'email') {
    emailSubject.value = item.subject || '';
    emailBody.value = item.previewText || '';
  } else {
    smsBody.value = item.previewText || '';
  }

  activeTab.value = 'compose';
  showToast('Message loaded for resending', 'info');
};

// Download report
const downloadReport = (item: DeepReadonly<BroadcastHistoryEntry>) => {
  const report = {
    messageId: item.id,
    channel: item.channel,
    subject: item.subject || 'N/A',
    preview: item.previewText,
    recipientCount: item.recipientCount,
    filterType: item.filterType,
    filterLabel: item.filterLabel,
    sentAt: item.sentAt,
    sentBy: item.sentBy,
    status: item.status,
    deliveryStats: item.deliveryStats,
    failedRecipients: item.failedRecipients || [],
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/xlsx' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `broadcast-report-${item.id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Report downloaded!', 'success');
};

// Check if template is a default template (not editable)
const isDefaultTemplate = (templateId: string) => {
  return templateId.startsWith('tpl') && !templateId.startsWith('tpl_');
};
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-linear-to-br from-emerald-500 to-primary/40 shadow-lg shadow-indigo-500/25">
            <Send class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">Broadcasting Hub</h1>
            <p class="text-muted-foreground">
              Send targeted messages to staff via Email or SMS
            </p>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Badge v-if="canSendInternal" variant="outline" class="gap-1.5">
          <Shield class="w-3 h-3" />
          Internal Access
        </Badge>
        <Badge v-if="canBroadcast" class="gap-1.5 bg-linear-to-r from-emerald-500 to-primary/40">
          <Zap class="w-3 h-3" />
          Broadcast Enabled
        </Badge>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="!syncStatus.isOnline"
      class="mb-4 p-4 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 shrink-0" />
      <div>
        <h3 class="font-medium">You are currently offline</h3>
        <p class="text-sm opacity-90">Message processing is disabled until an internet connection is restored.</p>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-6">
      <!-- Left Sidebar - Navigation -->
      <Card class="col-span-12 lg:col-span-3 h-fit">
        <CardContent class="p-4">
          <nav class="space-y-1">
            <button @click="activeTab = 'compose'; isInternal = false" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'compose' && !isInternal
                ? 'bg-linear-to-r from-emerald-500 to-primary/40 text-white shadow-lg shadow-indigo-500/25'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <Send class="w-4 h-4" />
                <span>Compose Message</span>
              </div>
            </button>

            <button v-if="canSendInternal" @click="activeTab = 'compose'; isInternal = true" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'compose' && isInternal
                ? 'bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <Crown class="w-4 h-4" />
                <span>Internal HQ</span>
              </div>
              <Badge variant="secondary" class="text-[10px]">Private</Badge>
            </button>

            <Separator class="my-3!" />

            <button @click="activeTab = 'drafts'" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'drafts'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <FileEdit class="w-4 h-4" />
                <span>Drafts</span>
              </div>
              <Badge v-if="drafts.length > 0" variant="secondary" class="text-xs">
                {{ drafts.length }}
              </Badge>
            </button>

            <button @click="activeTab = 'history'" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'history'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <History class="w-4 h-4" />
                <span>Sent Messages</span>
              </div>
            </button>

            <button @click="activeTab = 'templates'" :class="[
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'templates'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <LayoutTemplate class="w-4 h-4" />
                <span>Templates</span>
              </div>
            </button>
          </nav>

          <!-- Quick Stats -->
          <Separator class="my-4" />
          <div class="space-y-3 px-2">
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="p-2.5 rounded-lg bg-muted/50">
                <p class="text-lg font-bold text-foreground">{{ history.length }}</p>
                <p class="text-xs text-muted-foreground">Messages Sent</p>
              </div>
              <div class="p-2.5 rounded-lg bg-muted/50">
                <p class="text-lg font-bold text-foreground">{{ drafts.length }}</p>
                <p class="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Main Content Area -->
      <div class="col-span-12 lg:col-span-9 space-y-6">
        <!-- Compose View -->
        <template v-if="activeTab === 'compose'">
          <!-- Internal HQ Banner -->
          <Card v-if="isInternal" class="border-amber-500/50 bg-linear-to-r from-amber-500/10 to-orange-500/10">
            <CardContent class="py-3 px-4 flex items-center gap-3">
              <Crown class="w-5 h-5 text-amber-500" />
              <div class="flex-1">
                <p class="font-medium text-amber-700 dark:text-amber-400">Internal Headquarters Communication</p>
                <p class="text-sm text-amber-600/80 dark:text-amber-400/70">Messages sent here are confidential and only
                  visible to HQ staff</p>
              </div>
            </CardContent>
          </Card>

          <div class="grid grid-cols-12 gap-6">
            <!-- Message Composer -->
            <Card class="col-span-12 xl:col-span-8">
              <CardHeader class="pb-4">
                <div class="flex items-center justify-between">
                  <CardTitle class="text-lg">Compose Message</CardTitle>
                  <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="showTemplateDialog = true">
                      <LayoutTemplate class="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="space-y-6">
                <!-- Channel Toggle -->
                <div class="space-y-2">
                  <Label>Communication Channel</Label>
                  <Tabs v-model="channel" class="w-full mt-1.5">
                    <TabsList class="grid w-full grid-cols-2">
                      <TabsTrigger value="email" class="gap-2">
                        <Mail class="w-4 h-4" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="sms" class="gap-2">
                        <MessageSquare class="w-4 h-4" />
                        SMS
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <!-- Email Content -->
                <div v-if="channel === 'email'" class="space-y-4">
                  <div class="space-y-4">
                    <Label for="subject">Subject Line</Label>
                    <Input id="subject" v-model="emailSubject" placeholder="Enter email subject..."
                      class="font-medium mt-1.5 py-2" />
                  </div>

                  <div class="space-y-4">
                    <Label for="body">Message Body</Label>
                    <textarea id="body" v-model="emailBody" rows="12" placeholder="Compose your email message here..."
                      class="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
                    <p class="text-xs text-muted-foreground">
                      Tip: Use [NAME], [ZONE], [SCHOOL] as placeholders for personalization
                    </p>
                  </div>

                  <!-- Attachments -->
                  <div class="space-y-4">
                    <Label>Attachments</Label>
                    <div class="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50 mt-1.5">
                      <input ref="fileInputRef" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        class="hidden" @change="handleFileUpload" />
                      <div class="flex flex-col items-center gap-2 cursor-pointer" @click="fileInputRef?.click()">
                        <div class="p-2 rounded-full bg-muted">
                          <Upload class="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p class="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p class="text-xs text-muted-foreground">
                          PDF, Word, Excel, PowerPoint (Max 10MB each)
                        </p>
                      </div>
                    </div>

                    <!-- Attachment List -->
                    <div v-if="emailAttachments.length > 0" class="space-y-2 mt-3">
                      <div v-for="attachment in emailAttachments" :key="attachment.id"
                        class="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div class="flex items-center gap-2">
                          <div class="p-1.5 rounded bg-primary/10">
                            <FileText class="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p class="text-sm font-medium">{{ attachment.name }}</p>
                            <p class="text-xs text-muted-foreground">{{ attachment.size }}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" @click="removeAttachment(attachment.id)">
                          <X class="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SMS Content -->
                <div v-else class="space-y-4">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="sms-body">Message</Label>
                      <div class="flex items-center gap-3 text-xs">
                        <span :class="[
                          'font-medium',
                          smsStats.characters > 160 ? 'text-amber-500' : 'text-muted-foreground'
                        ]">
                          {{ smsStats.characters }}/{{ smsStats.isUnicode ? 70 : 160 }} chars
                        </span>
                        <Badge variant="outline" class="text-xs">
                          {{ smsStats.segments }} segment{{ smsStats.segments !== 1 ? 's' : '' }}
                        </Badge>
                      </div>
                    </div>
                    <textarea id="sms-body" v-model="smsBody" rows="6" placeholder="Type your SMS message here..."
                      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
                    <p v-if="smsStats.segments > 1" class="text-xs text-amber-500">
                      ⚠️ Message exceeds single SMS limit and will be sent as {{ smsStats.segments }} parts
                    </p>
                  </div>

                  <!-- Smart Links for SMS -->
                  <div class="space-y-2 font-app">
                    <Label>Smart Links (Auto-hosted files)</Label>
                    <div class="flex items-center gap-2 mt-1.5">
                      <input ref="smsFileInputRef" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden"
                        @change="handleSmsFileUpload" />
                      <Button variant="outline" size="sm" @click="smsFileInputRef?.click()" class="gap-2">
                        <Link2 class="w-4 h-4" />
                        Add File Link
                      </Button>
                      <p class="text-xs text-muted-foreground">
                        Upload a file to generate a short link for SMS
                      </p>
                    </div>

                    <!-- Smart Link List -->
                    <div v-if="smsSmartLinks.length > 0" class="space-y-1 mt-2">
                      <div v-for="(link, index) in smsSmartLinks" :key="index" class="flex items-center gap-2 text-xs">
                        <Link2 class="w-3 h-3 text-primary" />
                        <span class="text-muted-foreground">{{ link.label }}:</span>
                        <code class="px-1.5 py-0.5 rounded bg-muted text-primary">{{ link.url }}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter class="flex items-center justify-between border-t pt-4">
                <div class="flex items-center gap-2">
                  <Button variant="outline" @click="handleSaveDraft">
                    <Save class="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button variant="ghost" @click="showSaveTemplateDialog = true">
                    <LayoutTemplate class="w-4 h-4 mr-2" />
                    Save as Template
                  </Button>
                </div>
                <Button :disabled="!canSend || isSending" @click="showConfirmDialog = true"
                  class="gap-2 bg-linear-to-r from-emerald-500 to-primary/40 hover:from-emerald-600 hover:to-primary/50">
                  <Loader2 v-if="isSending" class="w-4 h-4 animate-spin" />
                  <Send v-else class="w-4 h-4" />
                  {{ isSending ? 'Sending...' : 'Send Message' }}
                </Button>
              </CardFooter>
            </Card>

            <!-- Recipients Panel -->
            <Card class="col-span-12 xl:col-span-4 h-fit">
              <CardHeader class="pb-3">
                <CardTitle class="text-lg">Recipients</CardTitle>
                <CardDescription>Configure who receives this message</CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <!-- Filter Type Selection -->
                <div class="space-y-2">
                  <Label>Target Audience</Label>
                  <Select v-model="filterType">
                    <SelectTrigger>
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="option in filterOptions" :key="option.type" :value="option.type"
                        :disabled="option.type === 'headquarters' && !canSendInternal && !isInternal">
                        <div class="flex items-center gap-2">
                          <component :is="iconMap[option.icon]" class="w-4 h-4" />
                          <span>{{ option.label }}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- Dynamic Filter Value Selection -->
                <div v-if="filterType === 'zone'" class="space-y-2">
                  <Label>Select Zone</Label>
                  <Select v-model="filterValue">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a zone..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="zone in zones" :key="zone.id" :value="zone.id">
                        <div class="flex items-center justify-between w-full gap-4">
                          <span>{{ zone.name }}</span>
                          <Badge variant="outline" class="text-xs">{{ zone.teacherCount }}</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div v-else-if="filterType === 'school'" class="space-y-3">
                  <div class="space-y-2">
                    <Label>Filter by Zone (Optional)</Label>
                    <Select v-model="selectedZoneForSchool">
                      <SelectTrigger>
                        <SelectValue placeholder="All zones..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        <SelectItem v-for="zone in zones" :key="zone.id" :value="zone.id">
                          {{ zone.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2">
                    <Label>Select School</Label>
                    <Select v-model="filterValue">
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a school..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="school in schools.filter(s => !selectedZoneForSchool || s.zoneId === selectedZoneForSchool)"
                          :key="school.id" :value="school.id">
                          <div class="flex items-center justify-between w-full gap-4">
                            <span>{{ school.name }}</span>
                            <Badge variant="outline" class="text-xs">{{ school.teacherCount }}</Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div v-else-if="filterType === 'role'" class="space-y-2">
                  <Label>Select Role</Label>
                  <Select v-model="filterValue">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="role in roles" :key="role.id" :value="role.id">
                        <div class="flex items-center justify-between w-full gap-4">
                          <span>{{ role.label }}</span>
                          <Badge variant="outline" class="text-xs">{{ role.count }}</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div v-else-if="filterType === 'subject'" class="space-y-2">
                  <Label>Select Subject</Label>
                  <Select v-model="filterValue">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="subject in subjects" :key="subject.id" :value="subject.id">
                        <div class="flex items-center justify-between w-full gap-4">
                          <span>{{ subject.name }}</span>
                          <Badge variant="outline" class="text-xs">{{ subject.teacherCount }}</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div v-else-if="filterType === 'headquarters'" class="space-y-2">
                  <Label>Headquarters Type</Label>
                  <Select v-model="filterValue">
                    <SelectTrigger>
                      <SelectValue placeholder="Select headquarters..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">
                        <div class="flex items-center gap-2">
                          <Building class="w-4 h-4" />
                          <span>Main Headquarters</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="zonal">
                        <div class="flex items-center gap-2">
                          <Building2 class="w-4 h-4" />
                          <span>Zonal Headquarters (All)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div v-else-if="filterType === 'individual'" class="space-y-3">
                  <Label>Search Staff</Label>
                  <div class="relative z-50">
                    <Search class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input v-model="searchQuery" @input="handleSearchStaff" placeholder="Search by name, email..."
                      class="pl-9" />

                    <!-- Search Results Dropdown -->
                    <div v-if="searchResults.length > 0"
                      class="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-md z-50 max-h-60 overflow-y-auto">
                      <TooltipProvider>
                        <div v-for="result in searchResults" :key="result.id"
                          class="p-2 hover:bg-muted cursor-pointer flex items-center gap-3 text-sm"
                          @click="selectRecipient(result)">
                          <Avatar class="w-8 h-8">
                            <AvatarFallback>{{ getInitials(result.name) }}</AvatarFallback>
                          </Avatar>
                          <div class="flex-1 min-w-0">
                            <Tooltip>
                              <TooltipTrigger as-child>
                                <p class="font-medium truncate">{{ result.name }}</p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div class="space-y-1">
                                  <p class="font-bold">{{ result.name }}</p>
                                  <p class="text-xs">{{ result.school }}</p>
                                  <p class="text-xs">{{ result.role }}</p>
                                  <p class="text-xs">{{ result.email }}</p>
                                  <p class="text-xs">{{ result.phone }}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <p class="text-xs text-muted-foreground truncate">{{ result.email }}</p>
                          </div>
                          <Badge variant="outline" class="text-[10px]">{{ result.zone }}</Badge>
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>

                  <!-- Selected Recipients -->
                  <div v-if="selectedRecipients.length > 0" class="flex flex-wrap gap-2">
                    <Badge v-for="recipient in selectedRecipients" :key="recipient.id" variant="secondary"
                      class="gap-1 pr-1">
                      {{ recipient.name }}
                      <div class="cursor-pointer hover:bg-destructive/20 rounded-full p-0.5"
                        @click="removeRecipient(recipient.id)">
                        <X class="w-3 h-3" />
                      </div>
                    </Badge>
                  </div>

                  <p class="text-xs text-muted-foreground">
                    Search and select up to 5 individual staff members
                  </p>
                </div>

                <Separator />

                <!-- Recipient Summary -->
                <div class="p-4 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium">Estimated Recipients</span>
                    <Button variant="ghost" size="sm" @click="previewRecipientsHandler" class="h-7 text-xs">
                      <Eye class="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                  <div class="flex items-baseline gap-2">
                    <span class="text-3xl font-bold text-primary">{{ recipientCount.toLocaleString() }}</span>
                    <span
                      class="text-sm text-muted-foreground">{{ channel === 'email' ? 'email addresses' : 'phone numbers' }}</span>
                  </div>
                  <p class="text-xs text-muted-foreground mt-2">
                    {{ filterLabel }}
                  </p>
                </div>

                <!-- Cost Estimate for SMS -->
                <div v-if="channel === 'sms' && recipientCount > 0"
                  class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <p class="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">SMS Cost Estimate</p>
                  <p class="text-xs text-amber-600 dark:text-amber-500">
                    {{ (recipientCount * smsStats.segments * 4).toLocaleString() }} NGN
                    <span class="text-amber-500">
                      ({{ recipientCount }} × {{ smsStats.segments }} segment{{ smsStats.segments !== 1 ? 's' : '' }} ×
                      ₦4)
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </template>

        <!-- Drafts View -->
        <template v-else-if="activeTab === 'drafts'">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Drafts</CardTitle>
                  <CardDescription>Continue working on saved messages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div v-if="drafts.length === 0" class="py-12 text-center">
                <FileEdit class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p class="text-muted-foreground">No drafts saved</p>
                <p class="text-sm text-muted-foreground">Start composing a message and save it as a draft</p>
              </div>
              <div v-else class="divide-y">
                <div v-for="draft in drafts" :key="draft.id"
                  class="py-4 flex items-start gap-4 hover:bg-muted/50 -mx-4 px-4 cursor-pointer transition-colors"
                  @click="loadDraftToCompose(draft)">
                  <div class="p-2 rounded-lg bg-muted">
                    <Mail v-if="draft.channel === 'email'" class="w-5 h-5 text-muted-foreground" />
                    <MessageSquare v-else class="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">
                      {{ draft.emailContent?.subject || draft.smsContent?.body?.substring(0, 50) || 'Untitled' }}
                    </p>
                    <p class="text-sm text-muted-foreground truncate">
                      {{ draft.recipientFilter.label }} · {{ draft.recipientCount }} recipients
                    </p>
                    <p class="text-xs text-muted-foreground mt-1">
                      Last modified {{ formatDistanceToNow(draft.lastModified, { addSuffix: true }) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-1">
                    <Button variant="ghost" size="sm" @click.stop="openEditDraftModal(draft)">
                      <FileEdit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click.stop="deleteDraft(draft.id!)">
                      <Trash2 class="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </template>

        <!-- History View -->
        <template v-else-if="activeTab === 'history'">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Sent Messages</CardTitle>
                  <CardDescription>View your broadcast history</CardDescription>
                </div>
                <Button variant="outline" size="sm" @click="handleRefreshHistory" :disabled="isRefreshingHistory">
                  <RefreshCw :class="['w-4 h-4 mr-2', isRefreshingHistory && 'animate-spin']" />
                  {{ isRefreshingHistory ? 'Refreshing...' : 'Refresh' }}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <!-- Loading skeleton -->
              <div v-if="isRefreshingHistory" class="space-y-4">
                <div v-for="i in 3" :key="i" class="flex items-start gap-4 animate-pulse">
                  <div class="w-10 h-10 bg-muted rounded-lg"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 bg-muted rounded w-3/4"></div>
                    <div class="h-3 bg-muted rounded w-1/2"></div>
                    <div class="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
              </div>
              <div v-else-if="history.length === 0" class="py-12 text-center">
                <History class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p class="text-muted-foreground">No messages sent yet</p>
              </div>
              <div v-else class="divide-y">
                <div v-for="item in history" :key="item.id" class="py-4 first:pt-0 last:pb-0">
                  <div class="flex items-start gap-4">
                    <div :class="[
                      'p-2 rounded-lg',
                      item.channel === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                    ]">
                      <Mail v-if="item.channel === 'email'" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <MessageSquare v-else class="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="font-medium truncate">{{ item.subject || item.previewText }}</p>
                        <Badge v-if="item.isInternal" variant="outline" class="text-[10px]">Internal</Badge>
                      </div>
                      <p class="text-sm text-muted-foreground">
                        {{ item.filterLabel }} · {{ item.recipientCount.toLocaleString() }} recipients
                      </p>
                      <div class="flex items-center gap-3 mt-2">
                        <Badge :class="getStatusColor(item.status)" class="text-xs">
                          {{ item.status }}
                        </Badge>
                        <span class="text-xs text-muted-foreground">
                          Sent {{ formatDistanceToNow(item.sentAt, { addSuffix: true }) }} by {{ item.sentBy }}
                        </span>
                      </div>
                      <!-- Delivery Stats -->
                      <div v-if="item.deliveryStats" class="mt-3 flex items-center gap-4 text-xs">
                        <div class="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 class="w-3 h-3" />
                          <span>{{ item.deliveryStats.sent }} delivered</span>
                        </div>
                        <div v-if="item.deliveryStats.failed > 0"
                          class="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle class="w-3 h-3" />
                          <span>{{ item.deliveryStats.failed }} failed</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal class="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="viewMessageDetails(item)">
                          <Eye class="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="resendMessage(item)">
                          <Send class="w-4 h-4 mr-2" />
                          Resend
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="downloadReport(item)">
                          <Download class="w-4 h-4 mr-2" />
                          Download Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </template>

        <!-- Templates View -->
        <template v-else-if="activeTab === 'templates'">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription class="mt-1.5">Reusable message templates for common communications</CardDescription>
                </div>
                <Button size="sm" @click="showSaveTemplateDialog = true">
                  <Plus class="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card v-for="template in templates" :key="template.id"
                  class="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-500"
                  @click="applyTemplate(template)">
                  <CardHeader class="pb-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div :class="[
                          'p-1.5 rounded-md',
                          template.channel === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                        ]">
                          <Mail v-if="template.channel === 'email'" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <MessageSquare v-else class="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div class="flex items-center gap-2">
                          <CardTitle class="text-base">{{ template.name }}</CardTitle>
                          <Badge v-if="isDefaultTemplate(template.id)" variant="secondary" class="text-[10px]">Default
                          </Badge>
                        </div>
                      </div>
                      <!-- Only show menu for user-created templates -->
                      <DropdownMenu v-if="!isDefaultTemplate(template.id)">
                        <DropdownMenuTrigger as-child>
                          <Button variant="ghost" size="sm" @click.stop>
                            <MoreHorizontal class="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem @click.stop="openEditTemplateModal(template)">Edit</DropdownMenuItem>
                          <DropdownMenuItem @click.stop="deleteTemplate(template.id)" class="text-destructive">Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p v-if="template.subject" class="text-sm font-medium mb-1">{{ template.subject }}</p>
                    <p class="text-sm text-muted-foreground line-clamp-2">{{ template.body }}</p>
                    <div class="flex items-center gap-2 mt-3">
                      <Badge variant="outline" class="text-xs">Used {{ template.usageCount }}x</Badge>
                      <div class="flex-1" />
                      <Button variant="ghost" size="sm" class="text-primary" @click.stop="applyTemplate(template)">
                        Use Template
                        <ChevronRight class="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </template>
      </div>
    </div>

    <!-- Template Selection Dialog -->
    <Dialog v-model:open="showTemplateDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Template</DialogTitle>
          <DialogDescription>Choose a template to start your message</DialogDescription>
        </DialogHeader>
        <ScrollArea class="max-h-80">
          <div class="space-y-2">
            <button v-for="template in templates" :key="template.id"
              class="w-full p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
              @click="applyTemplate(template)">
              <div class="flex items-center gap-2 mb-1">
                <Mail v-if="template.channel === 'email'" class="w-4 h-4 text-blue-500" />
                <MessageSquare v-else class="w-4 h-4 text-green-500" />
                <span class="font-medium">{{ template.name }}</span>
              </div>
              <p class="text-sm text-muted-foreground line-clamp-2">{{ template.body }}</p>
            </button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <!-- Preview Recipients Dialog -->
    <Dialog v-model:open="showPreviewDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recipients Preview</DialogTitle>
          <DialogDescription>
            Showing sample of {{ recipientCount.toLocaleString() }} total recipients
          </DialogDescription>
        </DialogHeader>
        <ScrollArea class="max-h-80">
          <div class="space-y-2">
            <div v-for="recipient in previewRecipients" :key="recipient.id"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Avatar class="w-8 h-8">
                <AvatarFallback class="text-xs">{{ getInitials(recipient.name) }}</AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ recipient.name }}</p>
                <p class="text-xs text-muted-foreground truncate">
                  {{ channel === 'email' ? recipient.email : recipient.phone }}
                </p>
              </div>
              <Badge variant="outline" class="text-xs shrink-0">{{ recipient.zone }}</Badge>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" @click="showPreviewDialog = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Confirm Send Dialog -->
    <Dialog v-model:open="showConfirmDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Send</DialogTitle>
          <DialogDescription>
            You are about to send a {{ channel === 'email' ? 'email' : 'SMS' }} to {{ recipientCount.toLocaleString() }}
            recipients.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="p-4 rounded-lg bg-muted/50">
            <div class="flex items-center gap-2 mb-2">
              <Mail v-if="channel === 'email'" class="w-4 h-4" />
              <MessageSquare v-else class="w-4 h-4" />
              <span class="font-medium">{{ channel === 'email' ? 'Email' : 'SMS' }}</span>
            </div>
            <p v-if="channel === 'email'" class="text-sm font-medium">{{ emailSubject }}</p>
            <p class="text-sm text-muted-foreground line-clamp-3">
              {{ channel === 'email' ? emailBody : smsBody }}
            </p>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Recipients:</span>
            <span class="font-medium">{{ recipientCount.toLocaleString() }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Filter:</span>
            <span class="font-medium">{{ filterLabel }}</span>
          </div>
          <div v-if="channel === 'sms'" class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Est. Cost:</span>
            <span class="font-medium">₦{{ (recipientCount * smsStats.segments * 4).toLocaleString() }}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showConfirmDialog = false">Cancel</Button>
          <Button @click="handleSend" :disabled="isSending" class="bg-linear-to-r from-indigo-500 to-purple-600">
            <Loader2 v-if="isSending" class="w-4 h-4 mr-2 animate-spin" />
            <Send v-else class="w-4 h-4 mr-2" />
            {{ isSending ? 'Sending...' : 'Confirm & Send' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Save Template Dialog -->
    <Dialog v-model:open="showSaveTemplateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this message as a reusable template
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-4">
            <Label for="template-name">Template Name</Label>
            <Input id="template-name" v-model="newTemplateName" placeholder="E.g., Staff Meeting Notice"
              class="mt-1.5 py-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showSaveTemplateDialog = false">Cancel</Button>
          <Button @click="handleSaveTemplate" :disabled="!newTemplateName.trim()">
            <Save class="w-4 h-4 mr-2" />
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Template Dialog -->
    <Dialog v-model:open="showEditTemplateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Modify message template
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4" v-if="editingTemplate">
          <div class="space-y-2">
            <Label for="edit-template-name">Template Name</Label>
            <Input id="edit-template-name" v-model="editTemplateName" placeholder="Template Name" />
          </div>

          <div v-if="editingTemplate.channel === 'email'" class="space-y-2">
            <Label for="edit-template-subject">Subject</Label>
            <Input id="edit-template-subject" v-model="editTemplateSubject" placeholder="Subject Line" />
          </div>

          <div class="space-y-2">
            <Label for="edit-template-body">Body</Label>
            <textarea id="edit-template-body" v-model="editTemplateBody" rows="5"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditTemplateDialog = false">Cancel</Button>
          <Button @click="handleSaveEditedTemplate">
            <Save class="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Draft Dialog -->
    <Dialog v-model:open="showEditDraftDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Draft</DialogTitle>
          <DialogDescription>
            Modify your draft message
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4" v-if="editingDraft">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail v-if="editingDraft.channel === 'email'" class="w-4 h-4" />
            <MessageSquare v-else class="w-4 h-4" />
            <span>{{ editingDraft.channel === 'email' ? 'Email' : 'SMS' }} Draft</span>
          </div>

          <!-- Subject for email -->
          <div v-if="editingDraft.channel === 'email'" class="space-y-2">
            <Label for="edit-draft-subject">Subject</Label>
            <Input id="edit-draft-subject" v-model="editDraftSubject" placeholder="Enter subject..." />
          </div>

          <!-- Body -->
          <div class="space-y-2">
            <Label for="edit-draft-body">{{ editingDraft.channel === 'email' ? 'Body' : 'Message' }}</Label>
            <textarea id="edit-draft-body" v-model="editDraftBody" :rows="editingDraft.channel === 'email' ? 8 : 5"
              placeholder="Enter message..."
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
          </div>

          <div class="text-xs text-muted-foreground">
            Recipients: {{ editingDraft.recipientFilter?.label }} · {{ editingDraft.recipientCount }} recipients
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditDraftDialog = false">Cancel</Button>
          <Button @click="handleSaveEditedDraft">
            <Save class="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Message Details Dialog -->
    <Dialog v-model:open="showDetailsDialog">
      <DialogContent class="sm:max-w-3xl h-[90vh] overflow-y-auto font-app">
        <DialogHeader>
          <DialogTitle>Message Details</DialogTitle>
          <DialogDescription>
            Complete information about this broadcast
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-6 py-4" v-if="selectedHistoryItem">
          <!-- Channel and Status -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div :class="[
                'p-2 rounded-lg',
                selectedHistoryItem.channel === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
              ]">
                <Mail v-if="selectedHistoryItem.channel === 'email'" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <MessageSquare v-else class="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p class="font-medium">{{ selectedHistoryItem.channel === 'email' ? 'Email' : 'SMS' }} Broadcast</p>
                <Badge v-if="selectedHistoryItem.isInternal" variant="outline" class="text-[10px]">Internal</Badge>
              </div>
            </div>
            <Badge :class="getStatusColor(selectedHistoryItem.status)">{{ selectedHistoryItem.status }}</Badge>
          </div>

          <!-- Subject -->
          <div v-if="selectedHistoryItem.subject" class="space-y-1">
            <Label class="text-muted-foreground">Subject</Label>
            <p class="font-medium">{{ selectedHistoryItem.subject }}</p>
          </div>

          <!-- Message Preview -->
          <div class="space-y-1">
            <Label class="text-muted-foreground">Message Preview</Label>
            <div class="p-3 rounded-lg bg-muted/50 text-sm">
              {{ selectedHistoryItem.previewText }}
            </div>
          </div>

          <!-- Recipient Info -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <Label class="text-muted-foreground">Target Audience</Label>
              <p class="font-medium">{{ selectedHistoryItem.filterLabel }}</p>
            </div>
            <div class="space-y-1">
              <Label class="text-muted-foreground">Total Recipients</Label>
              <p class="font-medium">{{ selectedHistoryItem.recipientCount.toLocaleString() }}</p>
            </div>
          </div>

          <!-- Send Info -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <Label class="text-muted-foreground">Sent By</Label>
              <p class="font-medium">{{ selectedHistoryItem.sentBy }}</p>
            </div>
            <div class="space-y-1">
              <Label class="text-muted-foreground">Sent At</Label>
              <p class="font-medium">{{ formatDistanceToNow(selectedHistoryItem.sentAt, { addSuffix: true }) }}</p>
            </div>
          </div>

          <!-- Delivery Stats -->
          <div v-if="selectedHistoryItem.deliveryStats" class="space-y-3">
            <Label class="text-muted-foreground">Delivery Statistics</Label>
            <div class="grid grid-cols-4 gap-3 mt-1.5">
              <div class="p-3 rounded-lg bg-muted/50 text-center">
                <p class="text-2xl font-bold">{{ selectedHistoryItem.deliveryStats.total }}</p>
                <p class="text-xs text-muted-foreground">Total</p>
              </div>
              <div class="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-center">
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                  {{ selectedHistoryItem.deliveryStats.sent }}</p>
                <p class="text-xs text-green-600/70 dark:text-green-400/70">Delivered</p>
              </div>
              <div class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-center">
                <p class="text-2xl font-bold text-red-600 dark:text-red-400">
                  {{ selectedHistoryItem.deliveryStats.failed }}
                </p>
                <p class="text-xs text-red-600/70 dark:text-red-400/70">Failed</p>
              </div>
              <div class="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-center">
                <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {{ selectedHistoryItem.deliveryStats.pending }}</p>
                <p class="text-xs text-amber-600/70 dark:text-amber-400/70">Pending</p>
              </div>
            </div>
          </div>

          <!-- Failed Recipients Section -->
          <div v-if="selectedHistoryItem.deliveryStats!.failed > 0" class="space-y-3">
            <div class="flex items-center gap-2">
              <XCircle class="w-4 h-4 text-red-500" />
              <Label class="text-red-600 dark:text-red-400">Failed Deliveries</Label>
            </div>
            <div class="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
              <ScrollArea class="max-h-40">
                <div v-if="selectedHistoryItem.failedRecipients && selectedHistoryItem.failedRecipients.length > 0"
                  class="space-y-2">
                  <div v-for="(recipient, index) in selectedHistoryItem.failedRecipients" :key="index"
                    class="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20">
                    <div class="flex items-center gap-2">
                      <User class="w-3 h-3 text-red-500" />
                      <span>{{ recipient.name || recipient.email || recipient.phone }}</span>
                    </div>
                    <span class="text-xs text-red-500">{{ recipient.reason || 'Delivery failed' }}</span>
                  </div>
                </div>
                <div v-else class="text-sm text-muted-foreground">
                  <p>{{ selectedHistoryItem.deliveryStats!.failed }} message(s) failed to deliver.</p>
                  <p class="text-xs mt-1">Detailed recipient information not available.</p>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDetailsDialog = false">Close</Button>
          <Button variant="outline" @click="downloadReport(selectedHistoryItem!); showDetailsDialog = false">
            <Download class="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button @click="resendMessage(selectedHistoryItem!); showDetailsDialog = false">
            <Send class="w-4 h-4 mr-2" />
            Resend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
