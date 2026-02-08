<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    ChevronRight,
    ChevronDown
} from 'lucide-vue-next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Types
interface DepartmentPerformance {
    name: string;
    change: number;
}

interface MonthlyData {
    month: string;
    departments: DepartmentPerformance[];
}

// Props
const props = withDefaults(defineProps<{
    data: MonthlyData[];
    maxDepartments?: number;
}>(), {
    maxDepartments: 4
});

// Emit for "More" click
const emit = defineEmits<{
    (e: 'more-click', monthData: MonthlyData): void;
}>();

// Refs
const scrollContainerRef = ref<HTMLElement | null>(null);

// Data flows RIGHT → LEFT, so we reverse for display (newest first on right)
const displayData = computed(() => [...props.data].reverse());

// Navigation handlers
const scrollLeft = () => {
    if (scrollContainerRef.value) {
        const cardWidth = scrollContainerRef.value.querySelector('.snap-card')?.clientWidth || 300;
        scrollContainerRef.value.scrollBy({ left: -cardWidth - 16, behavior: 'smooth' });
    }
};

const scrollRight = () => {
    if (scrollContainerRef.value) {
        const cardWidth = scrollContainerRef.value.querySelector('.snap-card')?.clientWidth || 300;
        scrollContainerRef.value.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
    }
};

// Check if can scroll
const canScrollLeft = ref(false);
const canScrollRight = ref(true);

const updateScrollButtons = () => {
    if (scrollContainerRef.value) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.value;
        canScrollLeft.value = scrollLeft > 10;
        canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 10;
    }
};

// Get visible departments (max 4)
const getVisibleDepartments = (departments: DepartmentPerformance[]) => {
    return departments.slice(0, props.maxDepartments);
};

// Check if there are more departments
const hasMoreDepartments = (departments: DepartmentPerformance[]) => {
    return departments.length > props.maxDepartments;
};

// Handle "More" click
const handleMoreClick = (monthData: MonthlyData) => {
    emit('more-click', monthData);
};

// Format change display
const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}%`;
};

// Scroll to end (most recent) on mount
onMounted(() => {
    if (scrollContainerRef.value) {
        // Scroll to the end (rightmost = newest month)
        scrollContainerRef.value.scrollLeft = scrollContainerRef.value.scrollWidth;
        setTimeout(updateScrollButtons, 100);
    }
});
</script>

<template>
    <Card class="relative overflow-hidden border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
                <CardTitle class="text-base flex items-center gap-2">
                    <TrendingUp class="w-5 h-5 text-primary" />
                    Monthly Performance
                </CardTitle>
                <div class="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        :disabled="!canScrollLeft"
                        class="h-8 w-8 rounded-full hover:bg-muted disabled:opacity-30"
                        @click="scrollLeft"
                        aria-label="Scroll to newer months"
                    >
                        <ChevronLeft class="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        :disabled="!canScrollRight"
                        class="h-8 w-8 rounded-full hover:bg-muted disabled:opacity-30"
                        @click="scrollRight"
                        aria-label="Scroll to older months"
                    >
                        <ChevronRight class="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </CardHeader>

        <CardContent class="pt-0 pb-4">
            <!-- Horizontal Scroll Snap Container -->
            <div
                ref="scrollContainerRef"
                class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 hide-scrollbar"
                @scroll="updateScrollButtons"
            >
                <!-- Month Snap Cards -->
                <div
                    v-for="monthData in displayData"
                    :key="monthData.month"
                    class="snap-card snap-start shrink-0 w-[calc(33.333%-11px)] min-w-[220px] max-w-[280px] rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                >
                    <!-- Month Header -->
                    <div class="px-4 py-3 border-b border-border/30">
                        <h4 class="text-sm font-semibold text-foreground">
                            {{ monthData.month }}
                        </h4>
                    </div>

                    <!-- Department List -->
                    <div class="p-3 space-y-2">
                        <div
                            v-for="dept in getVisibleDepartments(monthData.departments)"
                            :key="dept.name"
                            class="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-background/50 transition-colors"
                        >
                            <!-- Department Name -->
                            <span class="text-sm text-foreground/80">
                                {{ dept.name }}
                            </span>

                            <!-- Change Indicator -->
                            <div
                                class="flex items-center gap-1 font-medium text-sm"
                                :class="[
                                    dept.change >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                ]"
                            >
                                <span>{{ formatChange(dept.change) }}</span>
                                <component
                                    :is="dept.change >= 0 ? TrendingUp : TrendingDown"
                                    class="w-3.5 h-3.5"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Separator & More -->
                    <div class="border-t border-border/30">
                        <button
                            v-if="hasMoreDepartments(monthData.departments)"
                            class="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
                            @click="handleMoreClick(monthData)"
                        >
                            <span>More</span>
                            <ChevronDown class="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
                        </button>
                        <div
                            v-else
                            class="py-2 text-center text-xs text-muted-foreground/50"
                        >
                            All shown
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<style scoped>
/* Hide scrollbar but keep functionality */
.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
    display: none;
}

/* Snap scroll behavior */
.snap-x {
    scroll-snap-type: x mandatory;
}

.snap-start {
    scroll-snap-align: start;
}

/* Smooth scroll */
.scroll-smooth {
    scroll-behavior: smooth;
}
</style>
