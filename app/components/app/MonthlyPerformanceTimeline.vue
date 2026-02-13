<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BarChart3
} from 'lucide-vue-next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/* =======================
   Types
======================= */
interface DepartmentPerformance {
    name: string;
    change: number;
}

export interface MonthlyData {
    month: string;
    year: string;
    departments: DepartmentPerformance[];
}

/* =======================
   Props
======================= */
const props = withDefaults(defineProps<{
    data: MonthlyData[];
    maxDepartments?: number;
    visibleMonths?: number;
}>(), {
    maxDepartments: 4,
    visibleMonths: 4
});

/* =======================
   Emit
======================= */
const emit = defineEmits<{
    (e: 'more-click', monthData: MonthlyData): void;
}>();

/* =======================
   Responsive logic
======================= */
const viewportWidth = ref(0);

const updateViewport = () => {
    viewportWidth.value = window.innerWidth;
};

const initialScrollDone = ref(false);

onMounted(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
});

onUnmounted(() => {
    window.removeEventListener('resize', updateViewport);
});

/**
 * lg ≥ 1024px  → visibleMonths
 * md ≥ 768px   → visibleMonths / 2
 * sm & below   → visibleMonths / 4 (min 1)
 */
const effectiveVisibleMonths = computed(() => {
    if (viewportWidth.value >= 1024) {
        return props.visibleMonths;
    }

    if (viewportWidth.value >= 768) {
        return Math.max(1, Math.floor(props.visibleMonths / 2));
    }

    return Math.max(1, Math.floor(props.visibleMonths / 4));
});

/* =======================
   Navigation
======================= */
const currentIndex = ref(0);
const isAnimating = ref(false);

const maxIndex = computed(() =>
    Math.max(0, props.data.length - effectiveVisibleMonths.value)
);

// Start at the end (most recent months) once data and viewport are ready
watch(
    [maxIndex, effectiveVisibleMonths],
    ([newMax]) => {
        if (!initialScrollDone.value && newMax > 0) {
            currentIndex.value = newMax;
            initialScrollDone.value = true;
        }
    },
    { immediate: true }
);

// keep index valid when screen resizes
watch([effectiveVisibleMonths, maxIndex], () => {
    if (currentIndex.value > maxIndex.value) {
        currentIndex.value = maxIndex.value;
    }
});

const navigateLeft = () => {
    if (isAnimating.value || currentIndex.value <= 0) return;
    isAnimating.value = true;
    currentIndex.value--;
    setTimeout(() => (isAnimating.value = false), 850);
};

const navigateRight = () => {
    if (isAnimating.value || currentIndex.value >= maxIndex.value) return;
    isAnimating.value = true;
    currentIndex.value++;
    setTimeout(() => (isAnimating.value = false), 850);
};

const canGoLeft = computed(() => currentIndex.value > 0);
const canGoRight = computed(() => currentIndex.value < maxIndex.value);

/* =======================
   Transform
======================= */
const transformStyle = computed(() => {
    const blockWidth = 100 / effectiveVisibleMonths.value;
    return {
        transform: `translateX(-${currentIndex.value * blockWidth}%)`,
    };
});

/* =======================
   Helpers
======================= */
const getVisibleDepartments = (departments: DepartmentPerformance[]) =>
    departments.slice(0, props.maxDepartments);

const hasMoreDepartments = (departments: DepartmentPerformance[]) =>
    departments.length > props.maxDepartments;

const handleMoreClick = (monthData: MonthlyData) => {
    emit('more-click', monthData);
};

const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}%`;
};
</script>


<template>
    <Card class="relative overflow-hidden border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader class="pb-4">
            <div class="flex items-center justify-between">
                <div>
                    <CardTitle class="text-lg flex items-center gap-2">
                        <BarChart3 class="w-5 h-5 text-indigo-500" />
                        Monthly Performance Timeline
                    </CardTitle>
                    <CardDescription class="mt-1">Department performance across months</CardDescription>
                </div>

                <!-- Navigation Controls -->
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="icon" :disabled="!canGoLeft || isAnimating"
                        class="h-9 w-9 rounded-full transition-all duration-200 disabled:opacity-30"
                        @click="navigateLeft" aria-label="View earlier months">
                        <ChevronLeft class="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="icon" :disabled="!canGoRight || isAnimating"
                        class="h-9 w-9 rounded-full transition-all duration-200 disabled:opacity-30"
                        @click="navigateRight" aria-label="View later months">
                        <ChevronRight class="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </CardHeader>

        <CardContent class="pt-0 pb-6">
            <!-- Timeline Container - Overflow Hidden -->
            <div class="overflow-hidden">
                <!-- Sliding Track -->
                <div class="flex timeline-track" :style="transformStyle">
                    <!-- Month Blocks -->
                    <div v-for="(monthData, index) in data" :key="monthData.month"
                        class="month-block shrink-0 px-2 first:pl-0 last:pr-0"
                        :style="{ width: `${100 / effectiveVisibleMonths}%` }">
                        <div
                            class="h-full rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/60 hover:border-border transition-all duration-300">
                            <!-- Month Header -->
                            <div class="px-4 py-3 border-b border-border/40">
                                <h4 class="text-sm font-semibold text-foreground">
                                    {{ monthData.month }}
                                </h4>
                            </div>

                            <!-- Department List -->
                            <div class="p-4 space-y-2.5">
                                <div v-for="dept in getVisibleDepartments(monthData.departments)" :key="dept.name"
                                    class="flex items-center justify-between">
                                    <!-- Department Name -->
                                    <span class="text-sm text-foreground/80">
                                        {{ dept.name }}
                                    </span>

                                    <!-- Change Indicator -->
                                    <div class="flex items-center gap-1.5 font-semibold text-sm" :class="[
                                        dept.change >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-600 dark:text-red-400'
                                    ]">
                                        <span>{{ formatChange(dept.change) }}</span>
                                        <component :is="dept.change >= 0 ? TrendingUp : TrendingDown" class="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            <!-- Separator & More Indicator -->
                            <div class="border-t border-border/40">
                                <button v-if="hasMoreDepartments(monthData.departments)"
                                    class="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-200 group"
                                    @click="handleMoreClick(monthData)">
                                    <span>View More</span>
                                    <ChevronDown
                                        class="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform duration-200" />
                                </button>
                                <div v-else class="py-2.5 text-center text-xs text-muted-foreground/50">
                                    All departments shown
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Timeline Progress Indicator -->
            <div class="mt-4 flex items-center justify-center gap-2">
                <span class="text-xs text-muted-foreground">
                    {{ currentIndex + 1 }}–{{ Math.min(currentIndex + effectiveVisibleMonths, data.length) }} of
                    {{ data.length }} months
                </span>
            </div>
        </CardContent>
    </Card>
</template>

<style scoped>
/* Smooth, slow timeline animation */
.timeline-track {
    transition: transform 800ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Month block spacing */
.month-block {
    padding-left: 8px;
    padding-right: 8px;
}

.month-block:first-child {
    padding-left: 0;
}

.month-block:last-child {
    padding-right: 0;
}
</style>
