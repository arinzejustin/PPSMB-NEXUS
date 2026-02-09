<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Printer,
    FileText,
    Settings,
    Eye,
    RefreshCw,
    CheckCircle2,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Loader2,
    AlertCircle,
    Monitor,
} from 'lucide-vue-next';
import { usePrinter } from '@/composables/usePrinter';
import { printHandler } from '@/utils/printHandler';
import { showToast } from '@/utils/toast';

interface Props {
    open: boolean;
    documentTitle?: string;
    printContent?: string;
}

const props = withDefaults(defineProps<Props>(), {
    open: false,
    documentTitle: 'Document',
    printContent: '',
});

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void;
    (e: 'print-success'): void;
    (e: 'print-error', error: Error): void;
}>();

// Printer composable
const {
    printers,
    selectedPrinter,
    loadPrinters,
    loadSelectedPrinter,
    savePrinter,
    printSilent,
} = usePrinter();

// Component state
const isLoadingPrinters = ref(false);
const isPrinting = ref(false);
const previewZoom = ref(100);
const isFullPreview = ref(false);
const localSelectedPrinter = ref<string | null>(null);
const previewIframeRef = ref<HTMLIFrameElement | null>(null);

// Computed values
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value),
});

const hasPrinters = computed(() => printers.value.length > 0);
const currentPrinter = computed(() => localSelectedPrinter.value || selectedPrinter.value);

const previewStyles = computed(() => ({
    transform: `scale(${previewZoom.value / 100})`,
    transformOrigin: 'top center',
}));

// Methods
const refreshPrinters = async () => {
    isLoadingPrinters.value = true;
    try {
        await loadPrinters();
        await loadSelectedPrinter();
        if (selectedPrinter.value) {
            localSelectedPrinter.value = selectedPrinter.value;
        }
    } catch (error) {
        console.error('Failed to load printers:', error);
        showToast('Failed to load printers', 'error');
    } finally {
        isLoadingPrinters.value = false;
    }
};

const handlePrinterChange = async (value: string) => {
    if (typeof value !== 'string') return;
    localSelectedPrinter.value = value;
    await savePrinter(value);
};

const calculateSize = () => {
    return props.printContent ? (props.printContent.length / 1024).toFixed(1) : '0'
}

const zoomIn = () => {
    if (previewZoom.value < 200) {
        previewZoom.value += 25;
    }
};

const zoomOut = () => {
    if (previewZoom.value > 50) {
        previewZoom.value -= 25;
    }
};

const resetZoom = () => {
    previewZoom.value = 100;
};

const toggleFullPreview = () => {
    isFullPreview.value = !isFullPreview.value;
};

const handlePrint = async () => {
    if (!props.printContent) {
        showToast('No content to print', 'error');
        return;
    }

    isPrinting.value = true;

    try {
        const result = await printHandler(props.printContent, {
            name: props.documentTitle,
            silent: printSilent.value,
            printer: currentPrinter.value || undefined,
            size: `${calculateSize()} KB`
        });

        if (result) {
            showToast('Document sent to printer', 'success');
            emit('print-success');
            isOpen.value = false;
        }
    } catch (error) {
        console.error('Print failed:', error);
        showToast('Failed to print document', 'error');
        emit('print-error', error as Error);
    } finally {
        isPrinting.value = false;
    }
};

const handleClose = () => {
    isOpen.value = false;
    isFullPreview.value = false;
    previewZoom.value = 100;
};

// Update preview iframe content
const updatePreviewContent = async () => {
    await nextTick();
    if (previewIframeRef.value && props.printContent) {
        const iframeDoc = previewIframeRef.value.contentDocument || previewIframeRef.value.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(props.printContent);
            iframeDoc.close();
        }
    }
};

// Watchers
watch(() => props.open, async (newVal) => {
    if (newVal) {
        await refreshPrinters();
        await updatePreviewContent();
    }
});

watch(() => props.printContent, async () => {
    if (props.open) {
        await updatePreviewContent();
    }
});

watch(() => currentPrinter.value, async (newVal) => {
    if (!newVal) return;
    await handlePrinterChange(newVal);
})

// Lifecycle
onMounted(async () => {
    if (props.open) {
        await refreshPrinters();
    }
});
</script>

<template>
    <Dialog :open="isOpen" @update:open="handleClose">
        <DialogContent :class="[
            'border-primary/20 overflow-hidden transition-all duration-300',
            isFullPreview ? 'sm:max-w-[95vw] h-[96vh]' : 'sm:max-w-[900px] h-[90vh]'
        ]">
            <!-- Decorative Background -->
            <div
                class="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
            <div
                class="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <!-- Header -->
            <DialogHeader class="relative pb-4 border-b border-border/50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div
                            class="p-2.5 rounded-xl bg-linear-to-br from-primary/20 to-emerald-500/10 shadow-lg shadow-primary/10">
                            <Printer class="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle class="text-lg font-semibold">Print Document</DialogTitle>
                            <DialogDescription class="text-sm">
                                {{ documentTitle }}
                            </DialogDescription>
                        </div>
                    </div>

                    <!-- View Toggle -->
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <Button variant="outline" size="icon" @click="toggleFullPreview"
                                    class="rounded-xl h-9 w-9 hover:bg-primary/10 hover:border-primary/30">
                                    <Maximize2 v-if="!isFullPreview" class="w-4 h-4" />
                                    <Minimize2 v-else class="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {{ isFullPreview ? 'Compact View' : 'Full Preview' }}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </DialogHeader>

            <div class="relative flex-1 flex gap-4 py-4 overflow-hidden">
                <!-- Preview Section -->
                <div :class="[
                    'flex flex-col transition-all duration-300',
                    isFullPreview ? 'flex-1' : 'w-2/3'
                ]">
                    <!-- Preview Controls -->
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <Eye class="w-4 h-4 text-primary" />
                            <span class="text-sm font-medium">Preview</span>
                            <Badge variant="outline" class="text-xs">
                                {{ previewZoom }}%
                            </Badge>
                        </div>

                        <div class="flex items-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Button variant="ghost" size="icon" @click="zoomOut"
                                            :disabled="previewZoom <= 50" class="rounded-lg h-8 w-8">
                                            <ZoomOut class="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Zoom Out</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Button variant="ghost" size="icon" @click="resetZoom"
                                            class="rounded-lg h-8 w-8">
                                            <RotateCcw class="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reset Zoom</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Button variant="ghost" size="icon" @click="zoomIn"
                                            :disabled="previewZoom >= 200" class="rounded-lg h-8 w-8">
                                            <ZoomIn class="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Zoom In</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    <!-- Preview Container -->
                    <div
                        class="flex-1 relative rounded-xl border border-border/50 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-inner">
                        <!-- Paper Background Pattern -->
                        <div class="absolute inset-0 opacity-[0.02] pointer-events-none">
                            <div class="w-full h-full"
                                style="background-image: linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px); background-size: 20px 20px;" />
                        </div>

                        <ScrollArea class="h-full">
                            <div class="p-4 flex justify-center">
                                <div class="bg-white shadow-2xl shadow-black/10 transition-transform duration-300 origin-top"
                                    :style="previewStyles">
                                    <!-- Print Preview iframe -->
                                    <iframe ref="previewIframeRef" class="w-[800px] min-h-[1000px] border-0"
                                        sandbox="allow-same-origin" title="Print Preview" />
                                </div>
                            </div>
                        </ScrollArea>

                        <!-- No Content Overlay -->
                        <div v-if="!printContent"
                            class="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 backdrop-blur-sm">
                            <div class="p-4 rounded-2xl bg-muted/50 mb-4">
                                <FileText class="w-12 h-12 text-muted-foreground" />
                            </div>
                            <p class="text-lg font-semibold text-foreground">No Preview Available</p>
                            <p class="text-sm text-muted-foreground">Document content is empty</p>
                        </div>
                    </div>
                </div>

                <!-- Settings Panel -->
                <ScrollArea v-if="!isFullPreview" class="w-1/3 flex flex-col space-y-4">
                    <!-- Printer Selection -->
                    <div class="space-y-3 my-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <Printer class="w-4 h-4 text-primary" />
                                <span class="text-sm font-medium">Printer</span>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Button variant="ghost" size="icon" @click="refreshPrinters"
                                            :disabled="isLoadingPrinters" class="rounded-lg h-8 w-8">
                                            <RefreshCw :class="['w-4 h-4', isLoadingPrinters && 'animate-spin']" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Refresh Printers</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <Select :model-value="currentPrinter || undefined">
                            <SelectTrigger
                                class="w-full rounded-xl border-border/50 bg-background focus:border-primary/50"
                                :disabled="isLoadingPrinters || !hasPrinters">
                                <SelectValue :placeholder="isLoadingPrinters ? 'Loading...' : 'Select printer'" />
                            </SelectTrigger>
                            <SelectContent class="border-primary/20">
                                <SelectGroup>
                                    <SelectLabel class="text-primary font-semibold">Available Printers</SelectLabel>
                                    <SelectItem v-for="printer in printers" :key="printer.name" :value="printer.name">
                                        <div class="flex items-center gap-2">
                                            <Printer class="w-4 h-4 text-muted-foreground" />
                                            <div class="flex flex-col">
                                                <span>{{ printer.name }}</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>

                        <!-- Printer Status -->
                        <div v-if="currentPrinter" class="flex items-center gap-2 text-sm">
                            <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                            <span class="text-muted-foreground">Ready to print</span>
                        </div>
                        <div v-else-if="!isLoadingPrinters && !hasPrinters" class="flex items-center gap-2 text-sm">
                            <AlertCircle class="w-4 h-4 text-amber-500" />
                            <span class="text-muted-foreground">No printers found</span>
                        </div>
                    </div>

                    <!-- Print Settings -->
                    <div class="space-y-3 my-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div class="flex items-center gap-2">
                            <Settings class="w-4 h-4 text-primary" />
                            <span class="text-sm font-medium">Settings</span>
                        </div>

                        <div class="space-y-3">
                            <!-- Silent Print -->
                            <div
                                class="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 rounded-lg bg-primary/10">
                                        <Monitor class="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <Label class="text-sm font-medium cursor-pointer">Silent Print</Label>
                                        <p class="text-xs text-muted-foreground">Print without system dialog</p>
                                    </div>
                                </div>
                                <Checkbox :modelValue="printSilent"
                                    class="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                            </div>
                        </div>
                    </div>

                    <!-- Document Info -->
                    <div class="flex-1 space-y-3 my-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div class="flex items-center gap-2">
                            <FileText class="w-4 h-4 text-primary" />
                            <span class="text-sm font-medium">Document Info</span>
                        </div>

                        <div class="space-y-2 text-sm">
                            <div class="flex items-center justify-between p-2 rounded-lg bg-background/50">
                                <span class="text-muted-foreground">Title</span>
                                <span class="font-medium truncate max-w-[150px]">{{ documentTitle }}</span>
                            </div>
                            <div class="flex items-center justify-between p-2 rounded-lg bg-background/50">
                                <span class="text-muted-foreground">Size</span>
                                <span class="font-medium">{{ calculateSize() }}
                                    KB</span>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            <!-- Footer -->
            <DialogFooter class="relative sm:justify-between items-center border-t border-border/50 pt-4">
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Printer class="w-4 h-4" />
                    <span v-if="currentPrinter" class="truncate max-w-[200px]">{{ currentPrinter }}</span>
                    <span v-else>No printer selected</span>
                </div>

                <div class="flex items-center gap-2">
                    <Button variant="ghost" @click="handleClose" class="rounded-xl">
                        Cancel
                    </Button>
                    <Button @click="handlePrint" :disabled="isPrinting || !printContent"
                        class="rounded-xl px-6 bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-lg shadow-primary/25">
                        <Loader2 v-if="isPrinting" class="w-4 h-4 mr-2 animate-spin" />
                        <Printer v-else class="w-4 h-4 mr-2" />
                        {{ isPrinting ? 'Printing...' : 'Print' }}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<style scoped>
/* Custom scrollbar for preview */
:deep(.scroll-area-viewport) {
    scrollbar-width: thin;
    scrollbar-color: rgba(var(--primary), 0.3) transparent;
}

:deep(.scroll-area-viewport)::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

:deep(.scroll-area-viewport)::-webkit-scrollbar-track {
    background: transparent;
}

:deep(.scroll-area-viewport)::-webkit-scrollbar-thumb {
    background: rgba(var(--primary), 0.3);
    border-radius: 4px;
}

:deep(.scroll-area-viewport)::-webkit-scrollbar-thumb:hover {
    background: rgba(var(--primary), 0.5);
}

/* Preview paper shadow effect */
.preview-paper {
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -2px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(0, 0, 0, 0.05);
}

/* Smooth transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
