<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Printer,
    RefreshCw,
    X,
    Info,
    CheckCircle2,
    Loader2,
    XCircle,
    Clock,
    FileText,
    GripVertical,
    Trash2,
    Minimize2,
    ChevronDown,
} from 'lucide-vue-next';
import { usePrinter, type PrintStatus } from '@/composables/usePrinter';

const emit = defineEmits<{
    (e: 'reprint', jobId: string): void;
}>();

// Printer composable
const {
    printProgress,
    cancelPrint,
    reorderPrint,
    dismissPrintProgress,
    hasTriggerPrint,
} = usePrinter();

// Component state
const isExpanded = ref(false);
const isMinimized = ref(false);
const isDragging = ref(false);
const draggedIndex = ref<number | null>(null);

// Computed values
const hasActiveJobs = computed(() =>
    printProgress.value.some(p => p.status === 'queued' || p.status === 'printing')
);

const activeJobsCount = computed(() =>
    printProgress.value.filter(p => p.status === 'queued' || p.status === 'printing').length
);

const isPrinting = computed(() =>
    printProgress.value.some(p => p.status === 'printing')
);

const totalJobsCount = computed(() => printProgress.value.length);

const canReprintAll = computed(() =>
    printProgress.value.filter(p =>
        p.status === 'printing' ||
        p.status === 'queued'
    ).length === 0
);

const shouldShow = computed(() => hasTriggerPrint.value && totalJobsCount.value > 0);

// Status configuration with fallback for unknown statuses
const defaultStatusConfig = {
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10 border-gray-500/20',
    icon: Clock,
    label: 'Unknown'
};

const getStatusConfig = (status: PrintStatus | undefined) => {
    if (!status) return defaultStatusConfig;

    const configs: Record<PrintStatus, { color: string; bgColor: string; icon: any; label: string }> = {
        'completed': {
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10 border-emerald-500/20',
            icon: CheckCircle2,
            label: 'Completed'
        },
        'pdf fallback': {
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10 border-emerald-500/20',
            icon: CheckCircle2,
            label: 'PDF Fallback'
        },
        'queued': {
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10 border-amber-500/20',
            icon: Clock,
            label: 'Queued'
        },
        'printing': {
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10 border-blue-500/20',
            icon: Loader2,
            label: 'Printing'
        },
        'cancelled': {
            color: 'text-gray-500',
            bgColor: 'bg-gray-500/10 border-gray-500/20',
            icon: XCircle,
            label: 'Cancelled'
        },
        'failed': {
            color: 'text-red-500',
            bgColor: 'bg-red-500/10 border-red-500/20',
            icon: XCircle,
            label: 'Failed'
        }
    };
    return configs[status] ?? defaultStatusConfig;
};

// Check if status allows cancel
const canCancel = (status: PrintStatus | undefined) => {
    if (!status) return false;
    return status === 'queued' || status === 'printing';
};

// Check if status allows reprint
const canReprint = (status: PrintStatus | undefined) => {
    if (!status) return false;
    return status === 'completed' || status === 'pdf fallback';
};

// Format date
const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

// Toggle expansion
const toggleExpand = () => {
    if (isMinimized.value) {
        isMinimized.value = false;
        isExpanded.value = true;
    } else {
        isExpanded.value = !isExpanded.value;
    }
};

const minimize = () => {
    isExpanded.value = false;
    isMinimized.value = true;
};

const close = () => {
    isExpanded.value = false;
    isMinimized.value = false;
    dismissPrintProgress();
};

// Drag & Drop handlers
const handleDragStart = (index: number) => {
    isDragging.value = true;
    draggedIndex.value = index;
};

const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex.value === null || draggedIndex.value === index) return;

    // Reorder the array
    const items = [...printProgress.value];
    const draggedItem = items[draggedIndex.value];

    // Guard against undefined (TypeScript safety)
    if (!draggedItem) return;

    items.splice(draggedIndex.value, 1);
    items.splice(index, 0, draggedItem);
    printProgress.value = items;
    draggedIndex.value = index;
};

const handleDragEnd = async () => {
    isDragging.value = false;
    if (draggedIndex.value !== null) {
        // Send reordered IDs to backend
        const ids = printProgress.value.map(p => p.jobId);
        await reorderPrint(ids);
    }
    draggedIndex.value = null;
};

// Actions
const handleCancel = async (jobId: string) => {
    await cancelPrint(jobId);
};

const handleReprint = (jobId: string) => {
    emit('reprint', jobId);
};

const handleClearCompleted = () => {
};

// Auto-expand when print job is triggered
watch(hasTriggerPrint, (val) => {
    if (val && totalJobsCount.value > 0) {
        isExpanded.value = true;
        isMinimized.value = false;
    }
});

// Watch for new print jobs
watch(() => printProgress.value.length, (newLen, oldLen) => {
    if (newLen > oldLen && !isExpanded.value) {
        isExpanded.value = true;
        isMinimized.value = false;
    }
});
</script>

<template>
    <!-- Main Container - Fixed Position Bottom Right -->
    <Teleport to="body">
        <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 translate-y-8"
            enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-8">
            <div v-if="shouldShow" class="fixed bottom-6 right-6 z-9999 flex flex-col items-end">
                <!-- Expanded Panel -->
                <Transition enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="opacity-0 scale-95 translate-y-4"
                    enter-to-class="opacity-100 scale-100 translate-y-0"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100 scale-100 translate-y-0"
                    leave-to-class="opacity-0 scale-95 translate-y-4">
                    <div v-if="isExpanded"
                        class="mb-3 w-[380px] max-h-[500px] bg-background rounded-2xl border border-border/50 shadow-2xl shadow-black/20 overflow-hidden flex flex-col">
                        <!-- Panel Header -->
                        <div
                            class="relative px-4 py-3 border-b border-border/50 bg-linear-to-r from-primary/5 to-emerald-500/5">
                            <!-- Decorative gradient -->
                            <div
                                class="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-primary/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div class="relative flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="p-2 rounded-xl bg-linear-to-br from-primary/20 to-emerald-500/10 shadow-sm">
                                        <Printer class="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-semibold text-foreground">Print Queue</h3>
                                        <p class="text-xs text-muted-foreground">
                                            {{ totalJobsCount }} job{{ totalJobsCount !== 1 ? 's' : '' }}
                                            <span v-if="activeJobsCount > 0" class="text-primary"> ·
                                                {{ activeJobsCount }} active</span>
                                        </p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-1">
                                    <!-- Clear completed -->
                                    <TooltipProvider v-if="canReprintAll">
                                        <Tooltip>
                                            <TooltipTrigger as-child>
                                                <Button variant="ghost" size="icon" @click="handleClearCompleted"
                                                    class="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
                                                    <Trash2 class="w-3.5 h-3.5" /> {{ canReprintAll }}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent class="z-10000">Reprint all</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <!-- Minimize -->
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger as-child>
                                                <Button variant="ghost" size="icon" @click="minimize"
                                                    class="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
                                                    <Minimize2 class="w-3.5 h-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent class="z-10000">Minimize</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <!-- Close -->
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger as-child>
                                                <Button variant="ghost" size="icon" @click="close"
                                                    class="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500">
                                                    <X class="w-3.5 h-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent class="z-10000">Close</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>

                        <!-- Jobs List -->
                        <ScrollArea class="flex-1 max-h-[380px]">
                            <div v-if="printProgress.length === 0"
                                class="flex flex-col items-center justify-center py-12 text-center px-4">
                                <div class="p-4 rounded-2xl bg-muted/50 mb-3">
                                    <FileText class="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p class="text-sm font-medium text-foreground">No print jobs</p>
                                <p class="text-xs text-muted-foreground mt-1">Print jobs will appear here</p>
                            </div>

                            <div v-else class="p-2 space-y-1.5">
                                <div v-for="(job, index) in printProgress.filter(j => j && j.status).sort((a, b) => new Date(b.queuedAt || 0).getTime() - new Date(a.queuedAt || 0).getTime())"
                                    :key="job?.jobId ?? index" :draggable="job && canCancel(job.status)"
                                    @dragstart="handleDragStart(index)" @dragover="(e) => handleDragOver(e, index)"
                                    @dragend="handleDragEnd" :class="[
                                        'group relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200',
                                        getStatusConfig(job?.status).bgColor,
                                        isDragging && draggedIndex === index ? 'opacity-50 scale-[0.98]' : '',
                                        job && canCancel(job.status) ? 'cursor-grab active:cursor-grabbing' : ''
                                    ]">
                                    <!-- Drag Handle -->
                                    <div v-if="canCancel(job.status)"
                                        class="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0">
                                        <GripVertical class="w-3.5 h-3.5 text-muted-foreground" />
                                    </div>
                                    <div v-else class="w-3.5 shrink-0" />

                                    <!-- Status Icon -->
                                    <div :class="['p-1.5 rounded-lg shrink-0', getStatusConfig(job.status).bgColor]">
                                        <component :is="getStatusConfig(job.status).icon" :class="[
                                            'w-3.5 h-3.5',
                                            getStatusConfig(job.status).color,
                                            job.status === 'printing' ? 'animate-spin' : ''
                                        ]" />
                                    </div>

                                    <!-- Job Info -->
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="text-xs font-medium truncate max-w-[140px]">{{ job.name || 'Untitled' }}</span>
                                            <Badge variant="outline"
                                                :class="['text-[9px] px-1 py-0 h-4', getStatusConfig(job.status).color]">
                                                {{ getStatusConfig(job.status).label }}
                                            </Badge>
                                        </div>
                                        <p class="text-[10px] text-muted-foreground mt-0.5 truncate">
                                            {{ formatDate(job.queuedAt) }}
                                        </p>
                                    </div>

                                    <!-- Actions -->
                                    <div class="flex items-center gap-0.5 shrink-0">
                                        <!-- Info Tooltip -->
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger as-child>
                                                    <Button variant="ghost" size="icon"
                                                        class="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Info class="w-3 h-3 text-muted-foreground" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" class="max-w-[200px] z-10000">
                                                    <div class="space-y-2 text-[10px]">
                                                        <div class="flex justify-between gap-3">
                                                            <span class="text-white">Document:</span>
                                                            <span
                                                                class="font-medium truncate max-w-[100px]">{{ job.name || 'Untitled' }}</span>
                                                        </div>
                                                        <div class="flex justify-between gap-3">
                                                            <span class="text-white">Size:</span>
                                                            <span class="font-medium">{{ job.size || 'Unknown' }}</span>
                                                        </div>
                                                        <div class="flex justify-between gap-3">
                                                            <span class="text-white">Queued At:</span>
                                                            <span
                                                                class="font-medium">{{ formatDate(job.queuedAt) }}</span>
                                                        </div>
                                                        <div class="flex justify-between gap-3">
                                                            <span class="text-white">Finished At:</span>
                                                            <span
                                                                class="font-medium">{{ canCancel(job.status) ? 'Processing...' : formatDate(job.finishedAt) }}</span>
                                                        </div>
                                                        <div v-if="job.printer" class="flex justify-between gap-3">
                                                            <span class="text-white">Printer:</span>
                                                            <span
                                                                class="font-medium truncate max-w-[80px]">{{ job.printer }}</span>
                                                        </div>
                                                        <div class="flex justify-between gap-3">
                                                            <span class="text-white">Job ID:</span>
                                                            <span
                                                                class="font-mono text-[9px]">{{ job.jobId.slice(0, 8) }}...</span>
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <!-- Cancel Button -->
                                        <TooltipProvider v-if="canCancel(job.status)">
                                            <Tooltip>
                                                <TooltipTrigger as-child>
                                                    <Button variant="ghost" size="icon" @click="handleCancel(job.jobId)"
                                                        class="h-6 w-6 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                                        <X class="w-3 h-3" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent class="z-10000">Cancel</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <!-- Reprint Button -->
                                        <TooltipProvider v-if="canReprint(job.status)">
                                            <Tooltip>
                                                <TooltipTrigger as-child>
                                                    <Button variant="ghost" size="icon"
                                                        @click="handleReprint(job.jobId)"
                                                        class="h-6 w-6 rounded-md text-primary hover:text-primary hover:bg-primary/10">
                                                        <RefreshCw class="w-3 h-3" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent class="z-10000">Reprint</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        <!-- Active Jobs Footer -->
                        <div v-if="hasActiveJobs" class="px-4 py-2.5 border-t border-border/50 bg-muted/30">
                            <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                                <span>Processing {{ activeJobsCount }}
                                    job{{ activeJobsCount !== 1 ? 's' : '' }}...</span>
                            </div>
                        </div>
                    </div>
                </Transition>

                <!-- Floating Button / Minimized State -->
                <button @click="toggleExpand" :class="[
                    'relative group flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 cursor-pointer',
                    isExpanded
                        ? 'w-12 h-12 bg-muted hover:bg-muted/80 shadow-black/10'
                        : 'w-14 h-14 bg-linear-to-br from-primary to-emerald-600 shadow-primary/30 hover:shadow-primary/50 hover:scale-105',
                ]">
                    <!-- Pulse animation when printing -->
                    <div v-if="isPrinting && !isExpanded"
                        class="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-30" />

                    <!-- Icon -->
                    <div class="relative">
                        <ChevronDown v-if="isExpanded" class="w-5 h-5 text-muted-foreground" />
                        <Loader2 v-else-if="isPrinting" class="w-6 h-6 text-white animate-spin" />
                        <Printer v-else class="w-6 h-6 text-white" />
                    </div>

                    <!-- Badge for count -->
                    <Transition enter-active-class="transition-all duration-200 ease-out"
                        enter-from-class="opacity-0 scale-0" enter-to-class="opacity-100 scale-100"
                        leave-active-class="transition-all duration-150 ease-in"
                        leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-0">
                        <div v-if="activeJobsCount > 0 && !isExpanded"
                            class="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-lg">
                            {{ activeJobsCount > 9 ? '9+' : activeJobsCount }}
                        </div>
                    </Transition>

                    <!-- Glow effect on hover -->
                    <div v-if="!isExpanded"
                        class="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* Custom drag styling */
[draggable="true"] {
    user-select: none;
}

/* Smooth transitions for list items */
.space-y-1\.5>div {
    transition: transform 0.15s ease, opacity 0.15s ease;
}
</style>
