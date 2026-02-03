<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { definePageMeta, useRoute } from '#imports';
import {
    useDocumentsData,
    type DocumentDimension,
    type ScannedDocument
} from '@/composables/useDocumentsData';
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
    User,
    Crown,
    Building2,
    GraduationCap,
    Plus,
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Users,
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

// Use the documents data composable
const {
    documents: allDocuments,
    processingQueue,
    teachers,
    isLoading,
    error,
    lastUpdated,
    isChairman,
    hasCentralRegistryAccess,
    hasTeacherProfileAccess,
    accessibleDimensions,
    getCategoriesForDimension,
    getStatsForDimension,
    refresh,
    deleteDocument,
    cleanup,
    isElectron: isElectronEnv
} = useDocumentsData();

// Icon map for dimension icons
const iconMap = {
    Crown,
    Building2,
    GraduationCap
};

// Local UI state
const activeDimension = ref<DocumentDimension>('central-registry');
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedTeacher = ref('');
const viewMode = ref<'grid' | 'list'>('grid');
const showPreview = ref(false);
const selectedDocument = ref<ScannedDocument | null>(null);
const isDesktop = ref(false);
const route = useRoute();
const isRefreshing = ref(false);

// Document viewer state
const currentPage = ref(1);
const zoomLevel = ref(100);
const isFullscreen = ref(false);

// Dimensions configuration with icons
const dimensions = computed(() => [
    {
        id: 'chairman' as DocumentDimension,
        label: "Chairman's Documents",
        description: "Scanned documents from the Chairman's office",
        icon: Crown,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        accessible: isChairman.value
    },
    {
        id: 'central-registry' as DocumentDimension,
        label: 'Central Registry',
        description: 'Scanned documents from the Central Registry',
        icon: Building2,
        color: 'from-blue-500 to-indigo-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        accessible: hasCentralRegistryAccess.value
    },
    {
        id: 'teacher-profiles' as DocumentDimension,
        label: 'Teacher Profiles',
        description: 'Teacher paperwork and profile documents',
        icon: GraduationCap,
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        accessible: hasTeacherProfileAccess.value
    }
]);

// Get accessible dimensions with icons
const accessibleDimensionsWithIcons = computed(() =>
    dimensions.value.filter(d => d.accessible)
);

// Current dimension config
const currentDimension = computed(() =>
    dimensions.value.find(d => d.id === activeDimension.value) || dimensions.value[1]
);

// Current categories based on dimension
const categories = computed(() => getCategoriesForDimension(activeDimension.value));

// Stats for current dimension
const stats = computed(() => getStatsForDimension(activeDimension.value).value);

// Documents filtered by current dimension
const documents = computed(() =>
    allDocuments.value.filter(d => d.dimension === activeDimension.value)
);

// Processing queue filtered by dimension
const filteredProcessingQueue = computed(() =>
    processingQueue.value.filter(p => p.dimension === activeDimension.value)
);

// Filtered documents with search/category/teacher filters
const filteredDocuments = computed(() => {
    let result = [...documents.value];

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(d =>
            d.filename.toLowerCase().includes(query) ||
            d.teacher?.toLowerCase().includes(query) ||
            d.tags.some(t => t.toLowerCase().includes(query))
        );
    }

    if (selectedCategory.value) {
        result = result.filter(d => d.category === selectedCategory.value);
    }

    // Filter by teacher for teacher profiles dimension
    if (activeDimension.value === 'teacher-profiles' && selectedTeacher.value) {
        result = result.filter(d => d.teacherId === selectedTeacher.value);
    }

    return result.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
});

onMounted(() => {
    isDesktop.value = isElectronEnv;
    const activateScanner = route.query.scan as string;
    if (activateScanner) openScanner();

    // Set initial dimension based on user access
    if (isChairman.value) {
        activeDimension.value = 'chairman';
    } else if (hasCentralRegistryAccess.value) {
        activeDimension.value = 'central-registry';
    } else if (hasTeacherProfileAccess.value) {
        activeDimension.value = 'teacher-profiles';
    }
});

onUnmounted(() => {
    cleanup();
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

const previewDocument = (doc: ScannedDocument) => {
    selectedDocument.value = doc;
    currentPage.value = 1;
    zoomLevel.value = 100;
    showPreview.value = true;
};

const closePreview = () => {
    showPreview.value = false;
    selectedDocument.value = null;
    isFullscreen.value = false;
};

const openScanner = () => {
    if (isDesktop.value) {
        // Scanner logic here - will be handled by Electron
    }
};

const getCategoryLabel = (value: string) => {
    return categories.value.find(c => c.value === value)?.label || value;
};

// Document viewer controls
const nextPage = () => {
    if (selectedDocument.value && currentPage.value < selectedDocument.value.pages) {
        currentPage.value++;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};

const zoomIn = () => {
    if (zoomLevel.value < 200) {
        zoomLevel.value += 25;
    }
};

const zoomOut = () => {
    if (zoomLevel.value > 50) {
        zoomLevel.value -= 25;
    }
};

const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value;
};

// Refresh data
const handleRefresh = async () => {
    isRefreshing.value = true;
    try {
        await refresh();
    } finally {
        isRefreshing.value = false;
    }
};

// Handle document deletion
const handleDeleteDocument = async (docId: string) => {
    const success = await deleteDocument(docId);
    if (success && selectedDocument.value?.id === docId) {
        closePreview();
    }
};

// Reset filters when dimension changes
watch(activeDimension, () => {
    selectedCategory.value = '';
    selectedTeacher.value = '';
    searchQuery.value = '';
});

// Get dimension badge color
const getDimensionBadgeClass = (dimension: DocumentDimension) => {
    switch (dimension) {
        case 'chairman':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        case 'central-registry':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'teacher-profiles':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };
};
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Document Scanning</h1>
                <p class="text-muted-foreground mt-1">
                    Manage scanned documents across different offices and departments
                </p>
            </div>
            <div class="flex items-center gap-2">
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

        <!-- Desktop Warning -->
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

        <!-- Dimension Tabs -->
        <div class="flex flex-wrap gap-3">
            <button v-for="dim in accessibleDimensions" :key="dim.id" @click="activeDimension = dim.id" :class="[
                'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300',
                activeDimension === dim.id
                    ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
            ]">
                <div :class="['p-2 rounded-lg', dim.bgColor]">
                    <component :is="dim.icon" :class="['w-5 h-5', dim.textColor]" />
                </div>
                <div class="text-left">
                    <p class="font-semibold text-sm">{{ dim.label }}</p>
                    <p class="text-xs text-muted-foreground hidden sm:block">{{ dim.description }}</p>
                </div>
                <Badge v-if="activeDimension === dim.id" class="ml-2 bg-primary text-primary-foreground">
                    Active
                </Badge>
            </button>
        </div>

        <!-- Access Notice for Chairman -->
        <Card v-if="isChairman"
            class="border-amber-200/50 bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 dark:border-amber-800/50">
            <CardContent class="flex items-center gap-4 pt-6">
                <div
                    class="p-3 rounded-full bg-linear-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                    <Crown class="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h3 class="font-semibold text-amber-800 dark:text-amber-400">Chairman Access</h3>
                    <p class="text-sm text-amber-700 dark:text-amber-500">
                        You have access to all document dimensions: Chairman's Documents, Central Registry, and Teacher
                        Profiles.
                    </p>
                </div>
            </CardContent>
        </Card>

        <!-- Stats Cards -->
        <div class="grid gap-4 md:grid-cols-4">
            <Card
                class="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-0 bg-linear-to-br from-background to-muted/30">
                <div
                    :class="['absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br', `from-${currentDimension!.color.split(' ')[0]!.replace('from-', '')}/10 to-${currentDimension!.color.split(' ')[1]!.replace('to-', '')}/5`]">
                </div>
                <CardContent class="pt-6 relative">
                    <div class="flex items-center gap-4">
                        <div :class="['p-2 rounded-lg', currentDimension!.bgColor]">
                            <FileText :class="['w-5 h-5', currentDimension!.textColor]" />
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
                    class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-emerald-500/10 to-green-500/5">
                </div>
                <CardContent class="pt-6 relative">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
                    class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-violet-500/10 to-purple-500/5">
                </div>
                <CardContent class="pt-6 relative">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Loader2 class="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ filteredProcessingQueue.length }}</p>
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
                    class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-amber-500/10 to-orange-500/5">
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
                    <CardDescription>OCR processing for {{ currentDimension!.label }}</CardDescription>
                </CardHeader>
                <CardContent class="p-4 pt-0">
                    <ScrollArea class="h-[300px]">
                        <div class="space-y-4 pr-4">
                            <div v-for="item in filteredProcessingQueue" :key="item.id"
                                class="p-3 rounded-lg border bg-card">
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

                            <div v-if="filteredProcessingQueue.length === 0"
                                class="text-center py-6 text-muted-foreground">
                                <CheckCircle2 class="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p class="text-sm">No items in queue</p>
                            </div>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <!-- Document Library -->
            <Card class="lg:col-span-3">
                <CardHeader>
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle class="flex items-center gap-2">
                                <component :is="currentDimension!.icon"
                                    :class="['w-5 h-5', currentDimension!.textColor]" />
                                {{ currentDimension!.label }}
                            </CardTitle>
                            <CardDescription>Browse and manage documents</CardDescription>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
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
                                    <SelectItem :value="null" disabled>All Categories</SelectItem>
                                    <SelectItem v-for="cat in categories" :key="cat.value" :value="cat.value">
                                        {{ cat.label }} ({{ cat.count }})
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <!-- Teacher filter for teacher profiles -->
                            <Select v-if="activeDimension === 'teacher-profiles'" v-model="selectedTeacher">
                                <SelectTrigger class="w-[200px]">
                                    <SelectValue placeholder="All Teachers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem :value="null" disabled>All Teachers</SelectItem>
                                    <SelectItem v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
                                        {{ teacher.name }}
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
                    <ScrollArea :class="isLoading ? 'h-[400px]' : 'h-[500px]'">
                        <!-- Loading Skeleton Grid -->
                        <div v-if="isLoading && viewMode === 'grid'"
                            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pr-4">
                            <div v-for="i in 6" :key="i" class="rounded-lg border bg-card overflow-hidden">
                                <!-- Skeleton Thumbnail -->
                                <div class="aspect-4/3 bg-muted relative overflow-hidden">
                                    <Skeleton class="absolute inset-0" />
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <FileText class="w-16 h-16 text-muted-foreground/10" />
                                    </div>
                                    <!-- Skeleton Status Badge -->
                                    <Skeleton class="absolute top-2 right-2 w-6 h-6 rounded-full" />
                                    <!-- Skeleton Dimension Badge -->
                                    <Skeleton class="absolute top-2 left-2 w-20 h-5 rounded-full" />
                                </div>
                                <!-- Skeleton Info -->
                                <div class="p-3 space-y-2">
                                    <Skeleton class="h-4 w-3/4" />
                                    <Skeleton class="h-3 w-1/2" />
                                    <!-- Skeleton Tags -->
                                    <div class="flex gap-1 mt-2">
                                        <Skeleton class="h-5 w-12 rounded-full" />
                                        <Skeleton class="h-5 w-16 rounded-full" />
                                        <Skeleton class="h-5 w-10 rounded-full" />
                                    </div>
                                    <div class="flex items-center justify-between mt-2">
                                        <Skeleton class="h-5 w-20 rounded-full" />
                                        <Skeleton class="h-3 w-16" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Loading Skeleton List -->
                        <div v-else-if="isLoading && viewMode === 'list'" class="space-y-2 pr-4">
                            <div v-for="i in 8" :key="i" class="flex items-center gap-4 p-3 rounded-lg border bg-card">
                                <Skeleton class="w-10 h-10 rounded" />
                                <div class="flex-1 space-y-2">
                                    <Skeleton class="h-4 w-1/3" />
                                    <Skeleton class="h-3 w-1/4" />
                                </div>
                                <div class="flex gap-1">
                                    <Skeleton class="h-5 w-12 rounded-full" />
                                    <Skeleton class="h-5 w-16 rounded-full" />
                                </div>
                                <Skeleton class="h-5 w-20 rounded-full" />
                                <Skeleton class="h-3 w-24" />
                            </div>
                        </div>

                        <!-- Grid View -->
                        <div v-else-if="!isLoading && viewMode === 'grid'"
                            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pr-4">
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
                                    <!-- Dimension Badge -->
                                    <Badge
                                        :class="['absolute top-2 left-2 text-xs', getDimensionBadgeClass(doc.dimension)]">
                                        <component :is="currentDimension!.icon" class="w-3 h-3 mr-1" />
                                        {{ doc.dimension === 'chairman' ? 'Chairman' : doc.dimension === 'central-registry' ? 'Registry' : 'Teacher' }}
                                    </Badge>
                                </div>
                                <!-- Info -->
                                <div class="p-3">
                                    <p class="font-medium text-sm truncate">{{ doc.filename }}</p>
                                    <p class="text-xs text-muted-foreground mt-1">
                                        {{ doc.pages }} pages • {{ doc.size }}
                                    </p>
                                    <!-- Teacher name for teacher profiles -->
                                    <p v-if="doc.teacher" class="text-xs text-primary mt-1 flex items-center gap-1">
                                        <Users class="w-3 h-3" />
                                        {{ doc.teacher }}
                                    </p>
                                    <!-- Tags -->
                                    <div class="flex flex-wrap gap-1 mt-2">
                                        <Badge v-for="tag in doc.tags.slice(0, 3)" :key="tag" variant="outline"
                                            class="text-xs px-1.5 py-0">
                                            {{ tag }}
                                        </Badge>
                                        <Badge v-if="doc.tags.length > 3" variant="outline" class="text-xs px-1.5 py-0">
                                            +{{ doc.tags.length - 3 }}
                                        </Badge>
                                    </div>
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
                        <div v-else-if="!isLoading && viewMode === 'list'" class="divide-y pr-4">
                            <div v-for="doc in filteredDocuments" :key="doc.id"
                                class="flex items-center gap-4 py-3 px-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                                @click="previewDocument(doc)">
                                <div :class="['p-2 rounded-lg', currentDimension!.bgColor]">
                                    <FileText :class="['w-6 h-6', currentDimension!.textColor]" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium truncate">{{ doc.filename }}</p>
                                    <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span>{{ doc.pages }} pages</span>
                                        <span>•</span>
                                        <span>{{ doc.size }}</span>
                                        <span>•</span>
                                        <span>{{ formatDistanceToNow(doc.uploadedAt, { addSuffix: true }) }}</span>
                                        <span v-if="doc.teacher">•</span>
                                        <span v-if="doc.teacher" class="text-primary">{{ doc.teacher }}</span>
                                    </div>
                                    <!-- Tags in list view -->
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        <Badge v-for="tag in doc.tags.slice(0, 4)" :key="tag" variant="outline"
                                            class="text-xs px-1.5 py-0">
                                            {{ tag }}
                                        </Badge>
                                        <Badge v-if="doc.tags.length > 4" variant="outline" class="text-xs px-1.5 py-0">
                                            +{{ doc.tags.length - 4 }}
                                        </Badge>
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
                        <div v-if="!isLoading && filteredDocuments.length === 0" class="text-center py-12">
                            <FolderOpen class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 class="font-medium text-foreground">No documents found</h3>
                            <p class="text-sm text-muted-foreground mt-1">
                                Try adjusting your search or filters
                            </p>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <!-- Document Preview Dialog with Scrollable Content -->
        <Dialog v-model:open="showPreview">
            <DialogContent :class="[
                'transition-all duration-300',
                isFullscreen ? 'sm:max-w-[95vw] sm:h-[95vh]' : 'sm:max-w-4xl sm:max-h-[90vh]'
            ]">
                <DialogHeader>
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <DialogTitle class="flex items-center gap-2">
                                <component :is="currentDimension!.icon"
                                    :class="['w-5 h-5', currentDimension!.textColor]" />
                                Document Preview
                            </DialogTitle>
                            <DialogDescription class="truncate max-w-md">
                                {{ selectedDocument?.filename }}
                            </DialogDescription>
                        </div>
                        <!-- Viewer Controls -->
                        <div class="flex items-center gap-1 mr-8">
                            <Button variant="ghost" size="icon" @click="zoomOut" :disabled="zoomLevel <= 50"
                                title="Zoom Out">
                                <ZoomOut class="w-4 h-4" />
                            </Button>
                            <span class="text-sm font-medium min-w-16 text-center">{{ zoomLevel }}%</span>
                            <Button variant="ghost" size="icon" @click="zoomIn" :disabled="zoomLevel >= 200"
                                title="Zoom In">
                                <ZoomIn class="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" @click="toggleFullscreen" title="Toggle Fullscreen">
                                <Maximize2 class="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div v-if="selectedDocument" class="flex flex-col gap-4 flex-1 min-h-0">
                    <!-- Scrollable Preview Area -->
                    <ScrollArea :class="[
                        'rounded-lg border bg-muted/30 transition-all duration-300',
                        isFullscreen ? 'flex-1' : 'h-[400px]'
                    ]">
                        <div class="flex items-center justify-center min-h-full p-4"
                            :style="{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }">
                            <div
                                class="bg-white dark:bg-gray-900 shadow-xl rounded-lg p-8 min-w-[600px] min-h-[800px] flex flex-col items-center justify-center">
                                <FileText class="w-24 h-24 text-muted-foreground/20 mb-4" />
                                <p class="text-lg font-medium text-foreground">{{ selectedDocument.filename }}</p>
                                <p class="text-muted-foreground mt-2">Page {{ currentPage }} of
                                    {{ selectedDocument.pages }}</p>
                                <div class="mt-8 text-center text-muted-foreground/50">
                                    <p>Document preview content would display here</p>
                                    <p class="text-sm mt-2">OCR extracted text and scanned image</p>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <!-- Page Navigation -->
                    <div class="flex items-center justify-center gap-4">
                        <Button variant="outline" size="sm" @click="prevPage" :disabled="currentPage <= 1">
                            <ChevronLeft class="w-4 h-4 mr-1" />
                            Previous
                        </Button>
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-muted-foreground">Page</span>
                            <Input type="number" v-model.number="currentPage" :min="1" :max="selectedDocument.pages"
                                class="w-16 text-center" />
                            <span class="text-sm text-muted-foreground">of {{ selectedDocument.pages }}</span>
                        </div>
                        <Button variant="outline" size="sm" @click="nextPage"
                            :disabled="currentPage >= selectedDocument.pages">
                            Next
                            <ChevronRight class="w-4 h-4 ml-1" />
                        </Button>
                    </div>

                    <!-- Document Details in Scrollable Area -->
                    <ScrollArea class="max-h-[200px]">
                        <div class="space-y-4 pr-4">
                            <!-- Document Info Grid -->
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <FileType2 class="w-4 h-4" />
                                        <span>Size</span>
                                    </div>
                                    <p class="font-medium">{{ selectedDocument.size }}</p>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <FileText class="w-4 h-4" />
                                        <span>Pages</span>
                                    </div>
                                    <p class="font-medium">{{ selectedDocument.pages }}</p>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <Folder class="w-4 h-4" />
                                        <span>Category</span>
                                    </div>
                                    <p class="font-medium">{{ getCategoryLabel(selectedDocument.category) }}</p>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <Calendar class="w-4 h-4" />
                                        <span>Uploaded</span>
                                    </div>
                                    <p class="font-medium">{{ format(selectedDocument.uploadedAt, 'MMM d, yyyy') }}</p>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <User class="w-4 h-4" />
                                        <span>Uploaded By</span>
                                    </div>
                                    <p class="font-medium">{{ selectedDocument.uploadedBy }}</p>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <component :is="getStatusIcon(selectedDocument.ocrStatus)" class="w-4 h-4" />
                                        <span>OCR Status</span>
                                    </div>
                                    <Badge :class="getStatusColor(selectedDocument.ocrStatus)" class="capitalize">
                                        {{ selectedDocument.ocrStatus }}
                                    </Badge>
                                </div>
                                <div v-if="selectedDocument.teacher" class="space-y-1 col-span-2">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <GraduationCap class="w-4 h-4" />
                                        <span>Teacher</span>
                                    </div>
                                    <p class="font-medium text-primary">{{ selectedDocument.teacher }}</p>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2 text-muted-foreground">
                                        <component :is="currentDimension!.icon" class="w-4 h-4" />
                                        <span>Dimension</span>
                                    </div>
                                    <Badge :class="getDimensionBadgeClass(selectedDocument.dimension)">
                                        {{ currentDimension!.label }}
                                    </Badge>
                                </div>
                            </div>

                            <!-- Tags -->
                            <div class="space-y-2">
                                <div class="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Tag class="w-4 h-4" />
                                    <span>Tags</span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <Badge v-for="tag in selectedDocument.tags" :key="tag" variant="outline"
                                        class="hover:bg-primary/10 transition-colors cursor-pointer">
                                        {{ tag }}
                                    </Badge>
                                    <Button variant="ghost" size="sm" class="h-6 px-2 text-xs">
                                        <Plus class="w-3 h-3 mr-1" />
                                        Add Tag
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter class="shrink-0">
                    <Button variant="outline" @click="closePreview">Close</Button>
                    <Button>
                        <Download class="w-4 h-4 mr-2" />
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
