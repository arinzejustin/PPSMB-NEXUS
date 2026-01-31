<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { definePageMeta, useRoute } from '#imports';
import {
    FileText,
    Search,
    MoreHorizontal,
    Eye,
    Download,
    Trash2,
    Folder,
    Grid3X3,
    List,
    FileType2,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Upload,
    ScanLine,
    FolderOpen,
    Calendar,
    Tag,
    MonitorDown,
    User
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';

definePageMeta({
    layout: 'app',
    middleware: "user-validate"
});

const searchQuery = ref('');
const selectedCategory = ref('');
const viewMode = ref<'grid' | 'list'>('grid');
const showPreview = ref(false);
const selectedDocument = ref<any>(null);
const isDesktop = ref(false);
const route = useRoute();

onMounted(() => {
    isDesktop.value = !!window.electronAPI;
    const activateScanner = route.query.scan as string;
    if (activateScanner) openScanner()
});

// Document categories
const categories = [
    { value: 'certificates', label: 'Certificates', count: 234 },
    { value: 'employment', label: 'Employment Letters', count: 156 },
    { value: 'transfers', label: 'Transfer Documents', count: 89 },
    { value: 'reports', label: 'Reports', count: 312 },
    { value: 'correspondence', label: 'Correspondence', count: 203 },
    { value: 'other', label: 'Other', count: 67 }
];

// Mock OCR processing queue
const processingQueue = ref([
    {
        id: 'PQ001',
        filename: 'Certificate_Batch_23.pdf',
        pages: 12,
        progress: 75,
        status: 'processing',
        startedAt: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
        id: 'PQ002',
        filename: 'Transfer_Requests_Jan.pdf',
        pages: 8,
        progress: 45,
        status: 'processing',
        startedAt: new Date(Date.now() - 1000 * 60 * 2)
    },
    {
        id: 'PQ003',
        filename: 'Teacher_Profiles_Zone_A.pdf',
        pages: 25,
        progress: 10,
        status: 'queued',
        startedAt: null
    }
]);

// Mock documents
const documents = ref([
    {
        id: 'DOC001',
        filename: 'Employment_Letter_TCH001.pdf',
        category: 'employment',
        thumbnail: '',
        pages: 2,
        size: '245 KB',
        ocrStatus: 'completed',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        uploadedBy: 'Admin User',
        teacher: 'Mrs. Adaobi Nwankwo',
        teacherId: 'TCH001',
        tags: ['employment', 'verified']
    },
    {
        id: 'DOC002',
        filename: 'Teaching_Certificate_TCH002.pdf',
        category: 'certificates',
        thumbnail: '',
        pages: 1,
        size: '156 KB',
        ocrStatus: 'completed',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        uploadedBy: 'HR Staff',
        teacher: 'Mr. Emmanuel Okonkwo',
        teacherId: 'TCH002',
        tags: ['certificate', 'B.Ed']
    },
    {
        id: 'DOC003',
        filename: 'Transfer_Request_Form.pdf',
        category: 'transfers',
        thumbnail: '',
        pages: 3,
        size: '312 KB',
        ocrStatus: 'completed',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        uploadedBy: 'Zonal Office',
        teacher: 'Mrs. Chioma Eze',
        teacherId: 'TCH003',
        tags: ['transfer', 'pending']
    },
    {
        id: 'DOC004',
        filename: 'Annual_Report_2025.pdf',
        category: 'reports',
        thumbnail: '',
        pages: 45,
        size: '4.5 MB',
        ocrStatus: 'processing',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
        uploadedBy: 'Admin User',
        teacher: null,
        teacherId: null,
        tags: ['report', 'annual']
    },
    {
        id: 'DOC005',
        filename: 'NYSC_Certificate_TCH005.pdf',
        category: 'certificates',
        thumbnail: '',
        pages: 1,
        size: '189 KB',
        ocrStatus: 'failed',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        uploadedBy: 'HR Staff',
        teacher: 'Miss Ngozi Okoro',
        teacherId: 'TCH005',
        tags: ['nysc', 'certificate']
    },
    {
        id: 'DOC006',
        filename: 'Ministry_Correspondence_001.pdf',
        category: 'correspondence',
        thumbnail: '',
        pages: 4,
        size: '523 KB',
        ocrStatus: 'completed',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        uploadedBy: 'Reception',
        teacher: null,
        teacherId: null,
        tags: ['ministry', 'official']
    }
]);

// Stats
const stats = computed(() => ({
    total: documents.value.length,
    processing: documents.value.filter(d => d.ocrStatus === 'processing').length,
    completed: documents.value.filter(d => d.ocrStatus === 'completed').length,
    failed: documents.value.filter(d => d.ocrStatus === 'failed').length
}));

// Filtered documents
const filteredDocuments = computed(() => {
    let result = [...documents.value];

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(d =>
            d.filename.toLowerCase().includes(query) ||
            d.teacher?.toLowerCase().includes(query) ||
            d.tags.some(t => t.includes(query))
        );
    }

    if (selectedCategory.value) {
        result = result.filter(d => d.category === selectedCategory.value);
    }

    return result.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
});

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'completed': return CheckCircle2;
        case 'processing': return Loader2;
        case 'failed': return XCircle;
        default: return Clock;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
        case 'processing': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
        default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    }
};

const previewDocument = (doc: any) => {
    selectedDocument.value = doc;
    showPreview.value = true;
};

const openScanner = () => {
    if (isDesktop.value) {

    }
};

const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || value;
};
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Document Scanning</h1>
                <p class="text-muted-foreground mt-1">
                    Manage scanned documents and monitor OCR processing
                </p>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm">
                    <User class="w-4 h-4 mr-2" />
                    Chairman's Documents
                </Button>
                <Button variant="outline" size="sm">
                    <Upload class="w-4 h-4 mr-2" />
                    Upload
                </Button>
                <Button size="sm" @click="openScanner" :disabled="!isDesktop"
                    :title="!isDesktop ? 'Scanning is only available in the desktop application' : ''">
                    <ScanLine class="w-4 h-4 mr-2" />
                    Scan Document
                </Button>
            </div>
        </div>

        <Card v-if="!isDesktop" class="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
            <CardContent class="flex items-center gap-4 pt-6">
                <div class="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <MonitorDown class="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h3 class="font-semibold text-amber-800 dark:text-amber-400">Desktop Application Required</h3>
                    <p class="text-sm text-amber-700 dark:text-amber-500">
                        Document scanning functionality requires the desktop application. The scanner uses an external
                        scanning module that is only available on the desktop version.
                    </p>
                </div>
            </CardContent>
        </Card>
        <div class="grid gap-4 md:grid-cols-4">
            <Card
                class="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-0 bg-linear-to-br from-background to-muted/30">
                <div
                    :class="['absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-blue-500/10 to-indigo-500/5']">
                </div>
                <CardContent class="pt-6 relative">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <FileText class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ stats.total }}</p>
                            <p class="text-sm text-muted-foreground">Total Documents</p>
                        </div>
                    </div>
                </CardContent>
                <div
                    class="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000">
                </div>
            </Card>
            <Card
                class="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-0 bg-linear-to-br from-background to-muted/30">
                <div
                    :class="['absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-pink-500/10 to-purple-500/5']">
                </div>
                <CardContent class="pt-6 relative">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <FileText class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ stats.completed }}</p>
                            <p class="text-sm text-muted-foreground">OCR Completed</p>
                        </div>
                    </div>
                </CardContent>
                <div
                    class="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000">
                </div>
            </Card>
            <Card
                class="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-0 bg-linear-to-br from-background to-muted/30">
                <div
                    :class="['absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-violet-500/10 to-purple-500/5']">
                </div>
                <CardContent class="pt-6 relative">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Loader2 class="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ processingQueue.length }}</p>
                            <p class="text-sm text-muted-foreground">In Queue</p>
                        </div>
                    </div>
                </CardContent>
                <div
                    class="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000">
                </div>
            </Card>
            <Card
                class="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-0 bg-linear-to-br from-background to-muted/30">
                <div
                    :class="['absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-amber-500/10 to-orange-500/5']">
                </div>
                <CardContent class="pt-6 relative">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <XCircle class="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ stats.failed }}</p>
                            <p class="text-sm text-muted-foreground">Failed</p>
                        </div>
                    </div>
                </CardContent>
                <div
                    class="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000">
                </div>
            </Card>
        </div>

        <!-- Main Content -->
        <div class="grid gap-6 lg:grid-cols-4">
            <!-- Processing Queue -->
            <Card class="lg:col-span-1">
                <CardHeader>
                    <CardTitle class="text-base flex items-center gap-2">
                        <Loader2 class="w-4 h-4 animate-spin" />
                        Processing Queue
                    </CardTitle>
                    <CardDescription>OCR processing status</CardDescription>
                </CardHeader>
                <CardContent class="p-4 pt-0">
                    <div class="space-y-4">
                        <div v-for="item in processingQueue" :key="item.id" class="p-3 rounded-lg border bg-card">
                            <div class="flex items-start justify-between mb-2">
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium truncate">{{ item.filename }}</p>
                                    <p class="text-xs text-muted-foreground">{{ item.pages }} pages</p>
                                </div>
                                <Badge
                                    :class="item.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'">
                                    {{ item.status }}
                                </Badge>
                            </div>
                            <Progress :model-value="item.progress" class="h-1.5" />
                            <p class="text-xs text-muted-foreground mt-2">
                                {{ item.progress }}% complete
                            </p>
                        </div>

                        <div v-if="processingQueue.length === 0" class="text-center py-6 text-muted-foreground">
                            <CheckCircle2 class="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p class="text-sm">No items in queue</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Document Library -->
            <Card class="lg:col-span-3">
                <CardHeader>
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>Document Library</CardTitle>
                            <CardDescription>Browse and manage all documents</CardDescription>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="relative">
                                <Search
                                    class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input v-model="searchQuery" placeholder="Search documents..." class="pl-9 w-64" />
                            </div>
                            <Select v-model="selectedCategory">
                                <SelectTrigger class="w-[180px]">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem :value="null" :disabled="true">All Categories</SelectItem>
                                    <SelectItem v-for="cat in categories" :key="cat.value" :value="cat.value">
                                        {{ cat.label }} ({{ cat.count }})
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <div class="flex items-center border rounded-lg">
                                <Button variant="ghost" size="sm" :class="viewMode === 'grid' ? 'bg-muted' : ''"
                                    @click="viewMode = 'grid'">
                                    <Grid3X3 class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" :class="viewMode === 'list' ? 'bg-muted' : ''"
                                    @click="viewMode = 'list'">
                                    <List class="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <!-- Grid View -->
                    <div v-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div v-for="doc in filteredDocuments" :key="doc.id"
                            class="group relative rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer"
                            @click="previewDocument(doc)">
                            <!-- Thumbnail -->
                            <div
                                class="aspect-4/3 bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                                <FileText class="w-16 h-16 text-muted-foreground/30" />
                                <!-- Status Indicator -->
                                <div
                                    :class="['absolute top-2 right-2 p-1.5 rounded-full', getStatusColor(doc.ocrStatus)]">
                                    <component :is="getStatusIcon(doc.ocrStatus)"
                                        :class="['w-3 h-3', doc.ocrStatus === 'processing' ? 'animate-spin' : '']" />
                                </div>
                            </div>
                            <!-- Info -->
                            <div class="p-3">
                                <p class="font-medium text-sm truncate">{{ doc.filename }}</p>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ doc.pages }} pages • {{ doc.size }}
                                </p>
                                <div class="flex items-center justify-between mt-2">
                                    <Badge variant="outline" class="text-xs">
                                        {{ getCategoryLabel(doc.category) }}
                                    </Badge>
                                    <span class="text-xs text-muted-foreground">
                                        {{ formatDistanceToNow(doc.uploadedAt, { addSuffix: true }) }}
                                    </span>
                                </div>
                            </div>
                            <!-- Hover Actions -->
                            <div
                                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                <Button size="sm" variant="secondary">
                                    <Eye class="w-4 h-4 mr-1" />
                                    View
                                </Button>
                                <Button size="sm" variant="secondary">
                                    <Download class="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <!-- List View -->
                    <div v-else class="divide-y">
                        <div v-for="doc in filteredDocuments" :key="doc.id"
                            class="flex items-center gap-4 py-3 px-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                            @click="previewDocument(doc)">
                            <div class="p-2 rounded-lg bg-muted">
                                <FileText class="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium truncate">{{ doc.filename }}</p>
                                <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{{ doc.pages }} pages</span>
                                    <span>•</span>
                                    <span>{{ doc.size }}</span>
                                    <span>•</span>
                                    <span>{{ formatDistanceToNow(doc.uploadedAt, { addSuffix: true }) }}</span>
                                </div>
                            </div>
                            <Badge variant="outline">{{ getCategoryLabel(doc.category) }}</Badge>
                            <Badge :class="getStatusColor(doc.ocrStatus)">
                                <component :is="getStatusIcon(doc.ocrStatus)"
                                    :class="['w-3 h-3 mr-1', doc.ocrStatus === 'processing' ? 'animate-spin' : '']" />
                                {{ doc.ocrStatus }}
                            </Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger as-child>
                                    <Button variant="ghost" size="sm" @click.stop>
                                        <MoreHorizontal class="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem @click.stop="previewDocument(doc)">
                                        <Eye class="w-4 h-4 mr-2" />
                                        Preview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Download class="w-4 h-4 mr-2" />
                                        Download
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem class="text-destructive">
                                        <Trash2 class="w-4 h-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div v-if="filteredDocuments.length === 0" class="text-center py-12">
                        <FolderOpen class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 class="font-medium text-foreground">No documents found</h3>
                        <p class="text-sm text-muted-foreground mt-1">
                            Try adjusting your search or filters
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Document Preview Dialog -->
        <Dialog v-model:open="showPreview">
            <DialogContent class="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Document Preview</DialogTitle>
                    <DialogDescription>
                        {{ selectedDocument?.filename }}
                    </DialogDescription>
                </DialogHeader>

                <div v-if="selectedDocument" class="space-y-4">
                    <!-- Preview Area -->
                    <div class="aspect-4/3 bg-muted rounded-lg flex items-center justify-center">
                        <div class="text-center text-muted-foreground">
                            <FileText class="w-16 h-16 mx-auto mb-2 opacity-30" />
                            <p>Document preview would display here</p>
                        </div>
                    </div>

                    <!-- Document Details -->
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <FileType2 class="w-4 h-4 text-muted-foreground" />
                                <span class="text-muted-foreground">Size:</span>
                                <span class="font-medium">{{ selectedDocument.size }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <FileText class="w-4 h-4 text-muted-foreground" />
                                <span class="text-muted-foreground">Pages:</span>
                                <span class="font-medium">{{ selectedDocument.pages }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <Folder class="w-4 h-4 text-muted-foreground" />
                                <span class="text-muted-foreground">Category:</span>
                                <span class="font-medium">{{ getCategoryLabel(selectedDocument.category) }}</span>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <Calendar class="w-4 h-4 text-muted-foreground" />
                                <span class="text-muted-foreground">Uploaded:</span>
                                <span
                                    class="font-medium">{{ format(selectedDocument.uploadedAt, 'MMM d, yyyy') }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <component :is="getStatusIcon(selectedDocument.ocrStatus)"
                                    class="w-4 h-4 text-muted-foreground" />
                                <span class="text-muted-foreground">OCR Status:</span>
                                <Badge :class="getStatusColor(selectedDocument.ocrStatus)" class="capitalize">
                                    {{ selectedDocument.ocrStatus }}
                                </Badge>
                            </div>
                            <div v-if="selectedDocument.teacher" class="flex items-center gap-2">
                                <Tag class="w-4 h-4 text-muted-foreground" />
                                <span class="text-muted-foreground">Teacher:</span>
                                <span class="font-medium">{{ selectedDocument.teacher }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tags -->
                    <div class="flex items-center gap-2">
                        <Tag class="w-4 h-4 text-muted-foreground" />
                        <div class="flex flex-wrap gap-1">
                            <Badge v-for="tag in selectedDocument.tags" :key="tag" variant="outline">
                                {{ tag }}
                            </Badge>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" @click="showPreview = false">Close</Button>
                    <Button>
                        <Download class="w-4 h-4 mr-2" />
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
