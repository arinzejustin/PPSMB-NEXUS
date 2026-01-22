<script setup lang="ts">
import { ref, computed } from 'vue';
import { definePageMeta, useHead } from '#imports';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Inbox,
  Send,
  Archive,
  Star,
  Trash2,
  Mail,
  MailOpen,
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
  CheckCheck
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow } from 'date-fns';

definePageMeta({
  layout: 'app',
  middleware: "user-validate"
});

useHead({
  title: ""
})

const searchQuery = ref('');
const activeTab = ref('inbox');
const selectedMail = ref<any>(null);
const selectedMails = ref<string[]>([]);
const isComposing = ref(false);

// Mail categories/folders counts
const folderCounts = computed(() => ({
  inbox: allMails.value.filter(m => m.folder === 'inbox' && !m.isRead).length,
  sent: allMails.value.filter(m => m.folder === 'sent').length,
  archive: allMails.value.filter(m => m.folder === 'archive').length,
  starred: allMails.value.filter(m => m.isStarred).length
}));

// Mock mail data
const allMails = ref([
  {
    id: 'ML001',
    folder: 'inbox',
    from: {
      name: 'Ministry of Education',
      email: 'ministry@ed.gov.ng',
      avatar: ''
    },
    to: ['ppsmb@ed.gov.ng'],
    subject: 'Annual Teacher Census Report Request',
    preview: 'Please submit the annual teacher census report for all zones by January 31st, 2026. This report should include...',
    body: `Dear PPSMB Director,

Please submit the annual teacher census report for all zones by January 31st, 2026. This report should include the following information:

1. Total number of teachers per zone
2. Qualification breakdown
3. Certification status summary
4. Transfer statistics for the year
5. New hires and retirements

The report format should follow the attached template. Please ensure all data is accurate and up-to-date.

Best regards,
Ministry of Education`,
    date: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
    isStarred: true,
    hasAttachment: true,
    attachments: [
      { name: 'Report_Template.xlsx', size: '245 KB' }
    ],
    priority: 'high',
    tags: ['urgent', 'report']
  },
  {
    id: 'ML002',
    folder: 'inbox',
    from: {
      name: 'Enugu North Zonal Office',
      email: 'enugu.north@ppsmb.edu.ng',
      avatar: ''
    },
    to: ['ppsmb@ed.gov.ng'],
    subject: 'Monthly Transfer Requests Summary',
    preview: 'Attached is the summary of transfer requests for Enugu North Zone for the month of January 2026...',
    body: `Good day,

Attached is the summary of transfer requests for Enugu North Zone for the month of January 2026. We have received 12 new transfer requests this month.

Summary:
- Approved: 5
- Pending Review: 4
- Rejected: 2
- Under Investigation: 1

Please review the pending cases at your earliest convenience.

Thank you,
Enugu North Zonal Office`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 3),
    isRead: true,
    isStarred: false,
    hasAttachment: true,
    attachments: [
      { name: 'Transfer_Summary_Jan2026.pdf', size: '1.2 MB' }
    ],
    priority: 'normal',
    tags: ['transfer']
  },
  {
    id: 'ML003',
    folder: 'inbox',
    from: {
      name: 'Mrs. Chioma Eze',
      email: 'chioma.eze@ppsmb.edu.ng',
      avatar: ''
    },
    to: ['hr@ppsmb.edu.ng'],
    subject: 'Certification Renewal Application',
    preview: 'I am writing to apply for the renewal of my teaching certification which is due to expire on March 15, 2026...',
    body: `Dear HR Department,

I am writing to apply for the renewal of my teaching certification which is due to expire on March 15, 2026.

I have attached all required documents including:
- Current certification copy
- Professional development certificates
- Employment verification letter
- Recent passport photographs

Please let me know if any additional documents are required.

Best regards,
Mrs. Chioma Eze
TCH003`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isRead: true,
    isStarred: false,
    hasAttachment: true,
    attachments: [
      { name: 'Certification_Docs.zip', size: '3.4 MB' }
    ],
    priority: 'normal',
    tags: ['certification']
  },
  {
    id: 'ML004',
    folder: 'inbox',
    from: {
      name: 'IT Department',
      email: 'it@ppsmb.edu.ng',
      avatar: ''
    },
    to: ['all-staff@ppsmb.edu.ng'],
    subject: 'System Maintenance Notice - January 25th',
    preview: 'Please be informed that the PPSMB File Management System will undergo scheduled maintenance...',
    body: `Dear All,

Please be informed that the PPSMB File Management System will undergo scheduled maintenance on January 25th, 2026 from 10:00 PM to 2:00 AM.

During this time:
- The system will be unavailable
- Please save all work before the maintenance window
- Pending sync operations will resume after maintenance

We apologize for any inconvenience.

IT Department`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    isRead: false,
    isStarred: false,
    hasAttachment: false,
    attachments: [],
    priority: 'normal',
    tags: ['system']
  },
  {
    id: 'ML005',
    folder: 'sent',
    from: {
      name: 'PPSMB Admin',
      email: 'admin@ppsmb.edu.ng',
      avatar: ''
    },
    to: ['ministry@ed.gov.ng'],
    subject: 'Re: Annual Teacher Census Report Request',
    preview: 'Thank you for your correspondence. We acknowledge receipt of your request for the annual report...',
    body: `Dear Ministry of Education,

Thank you for your correspondence. We acknowledge receipt of your request for the annual teacher census report.

We are currently compiling the data from all zones and will submit the complete report before the January 31st deadline.

Best regards,
PPSMB Administration`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    attachments: [],
    priority: 'normal',
    tags: ['report']
  },
  {
    id: 'ML006',
    folder: 'archive',
    from: {
      name: 'Training Department',
      email: 'training@ppsmb.edu.ng',
      avatar: ''
    },
    to: ['all-teachers@ppsmb.edu.ng'],
    subject: 'Professional Development Workshop - December 2025',
    preview: 'Thank you to all teachers who participated in the Professional Development Workshop held last month...',
    body: `Dear Teachers,

Thank you to all teachers who participated in the Professional Development Workshop held last month. The event was a great success with over 500 participants.

Certificates of participation have been uploaded to your profiles and can be downloaded from the system.

Best regards,
Training Department`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    isRead: true,
    isStarred: true,
    hasAttachment: true,
    attachments: [
      { name: 'Workshop_Report.pdf', size: '890 KB' }
    ],
    priority: 'low',
    tags: ['training']
  }
]);

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
  mail.isStarred = !mail.isStarred;
};

const markAsRead = (mail: any) => {
  mail.isRead = true;
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

const archiveSelected = () => {
  selectedMails.value.forEach(id => {
    const mail = allMails.value.find(m => m.id === id);
    if (mail) mail.folder = 'archive';
  });
  selectedMails.value = [];
};

const deleteSelected = () => {
  allMails.value = allMails.value.filter(m => !selectedMails.value.includes(m.id));
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
        <Button variant="outline" size="sm">
          <RefreshCw class="w-4 h-4 mr-2" />
          Sync
        </Button>
        <Button size="sm" @click="isComposing = true">
          <Plus class="w-4 h-4 mr-2" />
          Compose
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-12 gap-6">
      <!-- Sidebar -->
      <Card class="col-span-12 lg:col-span-3">
        <CardContent class="p-4">
          <nav class="space-y-1">
            <button @click="activeTab = 'inbox'" :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'inbox'
                ? 'bg-primary text-primary-foreground'
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
            <button @click="activeTab = 'sent'" :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'sent'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]">
              <div class="flex items-center gap-3">
                <Send class="w-4 h-4" />
                <span>Sent</span>
              </div>
            </button>
            <button @click="activeTab = 'starred'" :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'starred'
                ? 'bg-primary text-primary-foreground'
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
            <button @click="activeTab = 'archive'" :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'archive'
                ? 'bg-primary text-primary-foreground'
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
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">urgent</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">report</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">transfer</Badge>
              <Badge variant="outline" class="cursor-pointer hover:bg-muted">certification</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Mail List or Detail View -->
      <Card class="col-span-12 lg:col-span-9">
        <!-- Mail List View -->
        <template v-if="!selectedMail">
          <CardHeader class="pb-3">
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
              <Button variant="ghost" size="sm" @click="archiveSelected">
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
              <div class="divide-y">
                <div v-for="mail in filteredMails" :key="mail.id" :class="[
                  'flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50',
                  !mail.isRead ? 'bg-primary/5' : ''
                ]" @click="markAsRead(mail)">
                  <Checkbox :checked="selectedMails.includes(mail.id)" @update:checked="toggleSelectMail(mail.id)"
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
                <div v-if="filteredMails.length === 0" class="p-12 text-center">
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
              <Button variant="ghost" size="sm">
                <Archive class="w-4 h-4" />
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
                  <AvatarImage :src="selectedMail.from.avatar" />
                  <AvatarFallback class="bg-primary/10 text-primary">
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
