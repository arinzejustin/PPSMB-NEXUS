<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
    Building2,
    Search,
    TrendingUp,
    Target,
    Award,
    AlertCircle,
    BarChart3,
    FileSpreadsheet,
    Filter,
    X,
    Percent,
    ListChecks,
    Loader2,
    Plus,
    Trash2,
    CalendarRange,
    CalendarDays,
    Pencil,
    Save,
    XCircle
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    useTaskReportData,
    computeDepartmentMetrics,
    getPerformanceStatus,
    getRemark,
    type DepartmentTaskData
} from '@/composables/useTaskReportData';

/* =======================
   Props & Emits
======================= */
const props = withDefaults(defineProps<{
    initialMonth?: string;
    initialYear?: string;
}>(), {
    initialMonth: '',
    initialYear: ''
});

const emit = defineEmits<{
    (e: 'export', payload: { month: string; year: string; filteredData: DepartmentTaskData[] }): void;
    (e: 'month-change', payload: { month: string; year: string }): void;
}>();

/* =======================
   Constants
======================= */
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = Array.from({ length: 7 }, (_, i) => (new Date().getFullYear() - 3 + i).toString());

const PERFORMANCE_CONFIG = {
    Failure: {
        color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
        dotColor: 'bg-red-500',
        icon: AlertCircle,
        gradient: 'from-red-500 to-red-600',
        remark: 'Department performance is below expectation.'
    },
    Good: {
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        dotColor: 'bg-amber-500',
        icon: TrendingUp,
        gradient: 'from-amber-500 to-amber-600',
        remark: 'Department shows moderate task completion.'
    },
    Fair: {
        color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
        dotColor: 'bg-blue-500',
        icon: Target,
        gradient: 'from-blue-500 to-blue-600',
        remark: 'Department performance is satisfactory.'
    },
    Excellent: {
        color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        dotColor: 'bg-emerald-500',
        icon: Award,
        gradient: 'from-emerald-500 to-emerald-600',
        remark: 'Outstanding departmental performance.'
    }
} as const;

const STATUS_OPTIONS = ['All', 'Excellent', 'Fair', 'Good', 'Failure'] as const;

/* =======================
   Composable
======================= */
const {
    dataByPeriod,
    isLoading: isDataLoading,
    isSaving,
    loadPeriod,
    upsertDepartment,
    deleteDepartment,
    cleanup
} = useTaskReportData();

/* =======================
   State
======================= */
const now = new Date();
const selectedMonth = ref<string>(props.initialMonth || MONTHS[now.getMonth()]!);
const selectedYear = ref<string>(props.initialYear || now.getFullYear().toString());
const searchQuery = ref('');
const statusFilter = ref<string>('All');
const isExporting = ref(false);
const exportScope = ref<'month' | 'year'>('month');

// Editing state
const editingId = ref<string | null>(null);
const editValues = ref({ totalAssigned: 0, totalCompleted: 0 });

/* =======================
   Init & Lifecycle
======================= */
onMounted(() => {
    loadPeriod(selectedMonth.value, selectedYear.value);
    console.log(props.initialMonth + "1~~", "is empty"+props.initialYear + "2~", selectedMonth.value + "3~~`", selectedYear.value + "4~~~~")
});

onUnmounted(() => {
    cleanup();
});

// Watch for prop changes (from dashboard navigation)
watch(() => props.initialMonth, (val) => {
    if (val && MONTHS.includes(val)) {
        selectedMonth.value = val;
    }
});

watch(() => props.initialYear, (val) => {
    if (val && YEARS.includes(val)) {
        selectedYear.value = val;
    }
});

// Reload data when month/year changes
watch([selectedMonth, selectedYear], ([month, year]) => {
    if (month && year) {
        loadPeriod(month as string, year as string);
        cancelEditing();
        emit('month-change', { month: month as string, year: year as string });
    }
});

/* =======================
   Report Data (reactive to period)
======================= */
const periodKey = computed(() => `${selectedYear.value}_${selectedMonth.value}`);

const reportData = computed(() => {
    return dataByPeriod.value.get(periodKey.value) || [];
});

/* =======================
   Add Department Dialog
======================= */
const showAddDialog = ref(false);
const newDept = ref({
    departmentName: '',
    totalAssigned: 0,
    totalCompleted: 0
});

const newDeptErrors = ref({
    departmentName: '',
    totalAssigned: '',
    totalCompleted: ''
});

const newDeptPreview = computed(() => {
    const assigned = newDept.value.totalAssigned;
    const completed = newDept.value.totalCompleted;
    if (assigned <= 0) return null;
    const pct = Math.round((Math.min(completed, assigned) / assigned) * 100);
    const status = getPerformanceStatus(pct);
    return {
        completionPercentage: pct,
        performanceStatus: status,
        remark: getRemark(status)
    };
});

const validateForm = (): boolean => {
    let valid = true;
    newDeptErrors.value = { departmentName: '', totalAssigned: '', totalCompleted: '' };

    if (!newDept.value.departmentName.trim()) {
        newDeptErrors.value.departmentName = 'Department name is required';
        valid = false;
    } else if (reportData.value.some(d => d.departmentName.toLowerCase() === newDept.value.departmentName.trim().toLowerCase())) {
        newDeptErrors.value.departmentName = 'Department already exists for this period';
        valid = false;
    }

    if (newDept.value.totalAssigned <= 0) {
        newDeptErrors.value.totalAssigned = 'Must be greater than 0';
        valid = false;
    }

    if (newDept.value.totalCompleted < 0) {
        newDeptErrors.value.totalCompleted = 'Cannot be negative';
        valid = false;
    }

    if (newDept.value.totalCompleted > newDept.value.totalAssigned) {
        newDeptErrors.value.totalCompleted = 'Cannot exceed assigned tasks';
        valid = false;
    }

    return valid;
};

const openAddDialog = () => {
    newDept.value = { departmentName: '', totalAssigned: 0, totalCompleted: 0 };
    newDeptErrors.value = { departmentName: '', totalAssigned: '', totalCompleted: '' };
    showAddDialog.value = true;
};

const addDepartment = async () => {
    if (!validateForm()) return;

    const data = computeDepartmentMetrics(
        newDept.value.departmentName,
        newDept.value.totalAssigned,
        newDept.value.totalCompleted,
        selectedMonth.value ?? '',
        selectedYear.value ?? ''
    );

    await upsertDepartment(data);
    showAddDialog.value = false;
};

/* =======================
   Inline Editing
======================= */
const startEditing = (dept: DepartmentTaskData) => {
    editingId.value = dept.id;
    editValues.value = {
        totalAssigned: dept.totalAssigned,
        totalCompleted: dept.totalCompleted
    };
};

const cancelEditing = () => {
    editingId.value = null;
    editValues.value = { totalAssigned: 0, totalCompleted: 0 };
};

const saveEditing = async (dept: DepartmentTaskData) => {
    const assigned = editValues.value.totalAssigned;
    const completed = editValues.value.totalCompleted;

    if (assigned <= 0 || completed < 0 || completed > assigned) return;

    const updated = computeDepartmentMetrics(
        dept.departmentName,
        assigned,
        completed,
        dept.month,
        dept.year,
        dept.id
    );

    await upsertDepartment(updated);
    cancelEditing();
};

const editPreview = computed(() => {
    const assigned = editValues.value.totalAssigned;
    const completed = editValues.value.totalCompleted;
    if (assigned <= 0) return null;
    const pct = Math.round((Math.min(completed, assigned) / assigned) * 100);
    const status = getPerformanceStatus(pct);
    return { completionPercentage: pct, performanceStatus: status };
});

/* =======================
   Remove Department
======================= */
const removeDepartment = async (dept: DepartmentTaskData) => {
    if (!dept) return;
    await deleteDepartment(dept.id);
};

/* =======================
   Computed
======================= */
const filteredData = computed(() => {
    let data = reportData.value;

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase().trim();
        data = data.filter(d => d.departmentName.toLowerCase().includes(query));
    }

    if (statusFilter.value !== 'All') {
        data = data.filter(d => d.performanceStatus === statusFilter.value);
    }

    return data;
});

const totalDepartments = computed(() => reportData.value.length);

const averageCompletion = computed(() => {
    if (reportData.value.length === 0) return 0;
    const sum = reportData.value.reduce((acc, d) => acc + d.completionPercentage, 0);
    return Math.round(sum / reportData.value.length);
});

const overallStatus = computed(() => {
    if (reportData.value.length === 0) return 'Good' as const;
    return getPerformanceStatus(averageCompletion.value);
});

const statusBreakdown = computed(() => {
    const counts = { Excellent: 0, Fair: 0, Good: 0, Failure: 0 };
    reportData.value.forEach(d => { counts[d.performanceStatus]++; });
    return counts;
});

const hasActiveFilters = computed(() => {
    return searchQuery.value.trim() !== '' || statusFilter.value !== 'All';
});

/* =======================
   Actions
======================= */
const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = 'All';
};

const exportToExcel = async () => {
    isExporting.value = true;

    try {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();

        if (exportScope.value === 'year') {
            // Summary sheet
            const summaryRows = [
                { 'Metric': 'Report Year', 'Value': selectedYear.value },
                { 'Metric': 'Active Month', 'Value': selectedMonth.value },
                { 'Metric': 'Total Departments', 'Value': totalDepartments.value.toString() },
                { 'Metric': 'Average Completion', 'Value': `${averageCompletion.value}%` },
                { 'Metric': 'Overall Status', 'Value': overallStatus.value },
                { 'Metric': 'Excellent', 'Value': statusBreakdown.value.Excellent.toString() },
                { 'Metric': 'Fair', 'Value': statusBreakdown.value.Fair.toString() },
                { 'Metric': 'Good', 'Value': statusBreakdown.value.Good.toString() },
                { 'Metric': 'Failure', 'Value': statusBreakdown.value.Failure.toString() },
            ];
            const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
            summaryWs['!cols'] = [{ wch: 22 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

            // One sheet per month that has data
            for (const month of MONTHS) {
                const key = `${selectedYear.value}_${month}`;
                const monthData = dataByPeriod.value.get(key) || [];
                if (monthData.length === 0) continue;

                const rows = monthData.map((d, i) => ({
                    'S/N': i + 1,
                    'Department Name': d.departmentName,
                    'Total Tasks Assigned': d.totalAssigned,
                    'Total Tasks Completed': d.totalCompleted,
                    'Completion (%)': d.completionPercentage,
                    'Performance Status': d.performanceStatus,
                    'Remark': d.remark
                }));

                const ws = XLSX.utils.json_to_sheet(rows);
                ws['!cols'] = [
                    { wch: 5 }, { wch: 28 }, { wch: 20 }, { wch: 22 },
                    { wch: 16 }, { wch: 20 }, { wch: 50 },
                ];
                XLSX.utils.book_append_sheet(wb, ws, month.substring(0, 10));
            }

            XLSX.writeFile(wb, `Department_Task_Report_${selectedYear.value}_Full_Year.xlsx`);
        } else {
            const exportRows = filteredData.value.map((d, i) => ({
                'S/N': i + 1,
                'Department Name': d.departmentName,
                'Total Tasks Assigned': d.totalAssigned,
                'Total Tasks Completed': d.totalCompleted,
                'Completion (%)': d.completionPercentage,
                'Performance Status': d.performanceStatus,
                'Remark': d.remark
            }));

            const ws = XLSX.utils.json_to_sheet(exportRows);
            ws['!cols'] = [
                { wch: 5 }, { wch: 28 }, { wch: 20 }, { wch: 22 },
                { wch: 16 }, { wch: 20 }, { wch: 50 },
            ];
            XLSX.utils.book_append_sheet(wb, ws, 'Department Report');
            XLSX.writeFile(wb, `Department_Task_Report_${selectedMonth.value}_${selectedYear.value}.xlsx`);
        }

        emit('export', {
            month: selectedMonth.value ?? '',
            year: selectedYear.value ?? '',
            filteredData: [...filteredData.value] as DepartmentTaskData[]
        });
    } catch (err) {
        console.error('Export failed:', err);
    } finally {
        setTimeout(() => { isExporting.value = false; }, 600);
    }
};

/* =======================
   Helpers
======================= */
const getPercentageBarWidth = (pct: number) => `${Math.min(100, pct)}%`;

const getPercentageBarColor = (status: DepartmentTaskData['performanceStatus']) => {
    switch (status) {
        case 'Excellent': return 'bg-emerald-500';
        case 'Fair': return 'bg-blue-500';
        case 'Good': return 'bg-amber-500';
        case 'Failure': return 'bg-red-500';
    }
};
</script>

<template>
    <div class="space-y-6">
        <!-- Report Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h2 class="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                    <div class="p-2 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white">
                        <ListChecks class="w-5 h-5" />
                    </div>
                    Department Task Completion Report
                </h2>
                <p class="text-sm text-muted-foreground mt-1.5 ml-[44px]">
                    Monthly departmental task performance overview
                    <span v-if="isDataLoading"
                        class="inline-flex items-center gap-1 ml-2 text-xs text-primary animate-pulse">
                        <Loader2 class="w-3 h-3 animate-spin" /> Loading...
                    </span>
                    <span v-if="isSaving" class="inline-flex items-center gap-1 ml-2 text-xs text-amber-500">
                        <Loader2 class="w-3 h-3 animate-spin" /> Saving...
                    </span>
                </p>
            </div>

            <!-- Month / Year Selectors + Add + Export -->
            <div class="flex items-center gap-2 flex-wrap">
                <Select v-model="selectedMonth">
                    <SelectTrigger class="w-[140px] h-9 text-sm">
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="month in MONTHS" :key="month" :value="month">
                            {{ month }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Select v-model="selectedYear">
                    <SelectTrigger class="w-[100px] h-9 text-sm">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="year in YEARS" :key="year" :value="year">
                            {{ year }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Button size="sm" class="h-9 gap-2" @click="openAddDialog">
                    <Plus class="w-4 h-4" />
                    <span class="hidden sm:inline">Add Department</span>
                </Button>

                <Select v-model="exportScope">
                    <SelectTrigger class="w-[130px] h-9 text-sm">
                        <div class="flex items-center gap-2">
                            <component :is="exportScope === 'year' ? CalendarRange : CalendarDays"
                                class="w-3.5 h-3.5 text-muted-foreground" />
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">Full Year</SelectItem>
                    </SelectContent>
                </Select>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button size="sm"
                                class="h-9 gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-500/20"
                                @click="exportToExcel" :disabled="isExporting || filteredData.length === 0">
                                <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
                                <FileSpreadsheet v-else class="w-4 h-4" />
                                <span class="hidden sm:inline">Export Excel</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p v-if="exportScope === 'month'">
                                Download Department_Task_Report_{{ selectedMonth }}_{{ selectedYear }}.xlsx
                            </p>
                            <p v-else>
                                Download Department_Task_Report_{{ selectedYear }}_Full_Year.xlsx
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <!-- Total Departments -->
            <Card class="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div class="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-indigo-500/0"></div>
                <CardContent class="pt-5 pb-4 px-5 relative">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Total Departments</p>
                            <p class="text-3xl font-bold mt-1 text-foreground">{{ totalDepartments }}</p>
                        </div>
                        <div
                            class="p-3 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
                            <Building2 class="w-5 h-5" />
                        </div>
                    </div>
                    <div class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span class="flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {{ statusBreakdown.Excellent }} excellent
                        </span>
                        <span>·</span>
                        <span class="flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-red-500"></span>
                            {{ statusBreakdown.Failure }} failing
                        </span>
                    </div>
                </CardContent>
            </Card>

            <!-- Average Completion -->
            <Card class="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div class="absolute inset-0 bg-linear-to-br from-violet-500/5 to-violet-500/0"></div>
                <CardContent class="pt-5 pb-4 px-5 relative">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Avg. Completion</p>
                            <p class="text-3xl font-bold mt-1 text-foreground">{{ averageCompletion }}%</p>
                        </div>
                        <div
                            class="p-3 rounded-2xl bg-linear-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25">
                            <Percent class="w-5 h-5" />
                        </div>
                    </div>
                    <div class="mt-3">
                        <div class="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-700 ease-out"
                                :class="getPercentageBarColor(overallStatus)"
                                :style="{ width: getPercentageBarWidth(averageCompletion) }"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Overall Status -->
            <Card class="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div class="absolute inset-0 bg-linear-to-br" :class="{
                    'from-emerald-500/5 to-emerald-500/0': overallStatus === 'Excellent',
                    'from-blue-500/5 to-blue-500/0': overallStatus === 'Fair',
                    'from-amber-500/5 to-amber-500/0': overallStatus === 'Good',
                    'from-red-500/5 to-red-500/0': overallStatus === 'Failure',
                }"></div>
                <CardContent class="pt-5 pb-4 px-5 relative">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Overall Status</p>
                            <p class="text-2xl font-bold mt-1 text-foreground">
                                {{ totalDepartments > 0 ? overallStatus : '—' }}
                            </p>
                        </div>
                        <div class="p-3 rounded-2xl text-white shadow-lg" :class="{
                            'bg-linear-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25': overallStatus === 'Excellent',
                            'bg-linear-to-br from-blue-500 to-blue-600 shadow-blue-500/25': overallStatus === 'Fair',
                            'bg-linear-to-br from-amber-500 to-amber-600 shadow-amber-500/25': overallStatus === 'Good',
                            'bg-linear-to-br from-red-500 to-red-600 shadow-red-500/25': overallStatus === 'Failure',
                        }">
                            <component :is="PERFORMANCE_CONFIG[overallStatus].icon" class="w-5 h-5" />
                        </div>
                    </div>
                    <p v-if="totalDepartments > 0"
                        class="mt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {{ PERFORMANCE_CONFIG[overallStatus].remark }}
                    </p>
                    <p v-else class="mt-2.5 text-xs text-muted-foreground">
                        Add departments to see overall status
                    </p>
                </CardContent>
            </Card>

            <!-- Report Period -->
            <Card class="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div class="absolute inset-0 bg-linear-to-br from-rose-500/5 to-rose-500/0"></div>
                <CardContent class="pt-5 pb-4 px-5 relative">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Report Period</p>
                            <p class="text-lg font-bold mt-1 text-foreground">{{ selectedMonth }}</p>
                            <p class="text-2xl font-bold text-foreground -mt-0.5">{{ selectedYear }}</p>
                        </div>
                        <div
                            class="p-3 rounded-2xl bg-linear-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25">
                            <BarChart3 class="w-5 h-5" />
                        </div>
                    </div>
                    <div class="mt-2 text-xs text-muted-foreground">
                        {{ filteredData.length }} of {{ totalDepartments }} departments shown
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Filter & Search Bar -->
        <Card class="border-0 shadow-md">
            <CardContent class="py-4 px-5">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="relative flex-1 max-w-sm">
                            <Search
                                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input v-model="searchQuery" placeholder="Search department..." class="pl-9 h-9 text-sm" />
                        </div>

                        <Select v-model="statusFilter">
                            <SelectTrigger class="w-[150px] h-9 text-sm">
                                <div class="flex items-center gap-2">
                                    <Filter class="w-3.5 h-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="status in STATUS_OPTIONS" :key="status" :value="status">
                                    <div class="flex items-center gap-2">
                                        <span v-if="status !== 'All'" class="w-2 h-2 rounded-full"
                                            :class="PERFORMANCE_CONFIG[status as keyof typeof PERFORMANCE_CONFIG]?.dotColor"></span>
                                        {{ status }}
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Button v-if="hasActiveFilters" variant="ghost" size="sm"
                            class="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                            @click="clearFilters">
                            <X class="w-3.5 h-3.5" />
                            Clear
                        </Button>
                    </div>

                    <p class="text-sm text-muted-foreground">
                        Showing <span class="font-semibold text-foreground">{{ filteredData.length }}</span>
                        <span v-if="hasActiveFilters"> of {{ totalDepartments }}</span> departments
                    </p>
                </div>
            </CardContent>
        </Card>

        <!-- Report Table -->
        <Card class="border-0 shadow-md overflow-hidden">
            <div class="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow class="bg-muted/50 hover:bg-muted/50">
                            <TableHead class="w-[50px] text-center font-semibold text-xs uppercase tracking-wider">S/N
                            </TableHead>
                            <TableHead class="font-semibold text-xs uppercase tracking-wider min-w-[180px]">Department
                            </TableHead>
                            <TableHead class="text-center font-semibold text-xs uppercase tracking-wider">Assigned
                            </TableHead>
                            <TableHead class="text-center font-semibold text-xs uppercase tracking-wider">Completed
                            </TableHead>
                            <TableHead class="text-center font-semibold text-xs uppercase tracking-wider min-w-[160px]">
                                Completion %</TableHead>
                            <TableHead class="text-center font-semibold text-xs uppercase tracking-wider">Status
                            </TableHead>
                            <TableHead class="font-semibold text-xs uppercase tracking-wider min-w-[280px]">Remark
                            </TableHead>
                            <TableHead class="w-[80px] text-center font-semibold text-xs uppercase tracking-wider">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <!-- Empty State -->
                        <TableRow v-if="filteredData.length === 0">
                            <TableCell :colspan="8" class="h-48">
                                <div class="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                    <div class="p-4 rounded-2xl bg-muted/50">
                                        <Building2 class="w-8 h-8 opacity-40" />
                                    </div>
                                    <div class="text-center">
                                        <p class="font-medium text-foreground" v-if="totalDepartments === 0">
                                            No departments added for {{ selectedMonth }} {{ selectedYear }}
                                        </p>
                                        <p class="font-medium text-foreground" v-else>No departments match your filters
                                        </p>
                                        <p class="text-sm mt-1" v-if="totalDepartments === 0">
                                            Click "Add Department" to start building this month's report
                                        </p>
                                        <p class="text-sm mt-1" v-else>Try adjusting your search or filter criteria</p>
                                    </div>
                                    <Button v-if="totalDepartments === 0" size="sm" @click="openAddDialog"
                                        class="mt-1 gap-2">
                                        <Plus class="w-4 h-4" />
                                        Add Department
                                    </Button>
                                    <Button v-else-if="hasActiveFilters" variant="outline" size="sm"
                                        @click="clearFilters" class="mt-1">
                                        Clear Filters
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>

                        <!-- Data Rows -->
                        <TableRow v-for="(dept, index) in filteredData" :key="dept.id"
                            class="group hover:bg-muted/30 transition-colors duration-200">
                            <!-- S/N -->
                            <TableCell class="text-center text-sm text-muted-foreground font-medium">
                                {{ index + 1 }}
                            </TableCell>

                            <!-- Department Name -->
                            <TableCell class="font-medium text-sm">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-linear-to-br"
                                        :class="PERFORMANCE_CONFIG[editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus].gradient">
                                        {{ dept.departmentName.charAt(0) }}
                                    </div>
                                    <span>{{ dept.departmentName }}</span>
                                </div>
                            </TableCell>

                            <!-- Total Assigned (editable) -->
                            <TableCell class="text-center text-sm font-semibold tabular-nums">
                                <template v-if="editingId === dept.id">
                                    <Input type="number" v-model.number="editValues.totalAssigned" :min="1"
                                        class="w-20 h-8 text-center text-sm mx-auto" />
                                </template>
                                <template v-else>{{ dept.totalAssigned }}</template>
                            </TableCell>

                            <!-- Total Completed (editable) -->
                            <TableCell class="text-center text-sm font-semibold tabular-nums">
                                <template v-if="editingId === dept.id">
                                    <Input type="number" v-model.number="editValues.totalCompleted" :min="0"
                                        :max="editValues.totalAssigned" class="w-20 h-8 text-center text-sm mx-auto" />
                                </template>
                                <template v-else>{{ dept.totalCompleted }}</template>
                            </TableCell>

                            <!-- Completion % -->
                            <TableCell class="text-center">
                                <div class="flex items-center gap-2.5">
                                    <div class="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-500 ease-out"
                                            :class="getPercentageBarColor(editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus)"
                                            :style="{ width: getPercentageBarWidth(editingId === dept.id && editPreview ? editPreview.completionPercentage : dept.completionPercentage) }">
                                        </div>
                                    </div>
                                    <span class="text-sm font-bold tabular-nums min-w-[42px] text-right" :class="{
                                        'text-emerald-600 dark:text-emerald-400': (editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus) === 'Excellent',
                                        'text-blue-600 dark:text-blue-400': (editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus) === 'Fair',
                                        'text-amber-600 dark:text-amber-400': (editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus) === 'Good',
                                        'text-red-600 dark:text-red-400': (editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus) === 'Failure',
                                    }">
                                        {{ editingId === dept.id && editPreview ?
                                            editPreview.completionPercentage :
                                            dept.completionPercentage }}%
                                    </span>
                                </div>
                            </TableCell>

                            <!-- Status Badge -->
                            <TableCell class="text-center">
                                <Badge variant="outline" :class="[
                                    'text-xs font-semibold px-2.5 py-1 border rounded-full inline-flex items-center gap-1.5',
                                    PERFORMANCE_CONFIG[editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus].color
                                ]">
                                    <span class="w-1.5 h-1.5 rounded-full"
                                        :class="PERFORMANCE_CONFIG[editingId === dept.id && editPreview ? editPreview.performanceStatus : dept.performanceStatus].dotColor">
                                    </span>
                                    {{ editingId === dept.id && editPreview ?
                                        editPreview.performanceStatus :
                                        dept.performanceStatus }}
                                </Badge>
                            </TableCell>

                            <!-- Remark -->
                            <TableCell class="text-sm text-muted-foreground leading-relaxed">
                                {{ dept.remark }}
                            </TableCell>

                            <!-- Actions (Edit / Delete) -->
                            <TableCell class="text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <template v-if="editingId === dept.id">
                                        <!-- Save -->
                                        <Button variant="ghost" size="icon"
                                            class="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                            @click="saveEditing(dept)"
                                            :disabled="editValues.totalAssigned <= 0 || editValues.totalCompleted < 0 || editValues.totalCompleted > editValues.totalAssigned">
                                            <Save class="w-3.5 h-3.5" />
                                        </Button>
                                        <!-- Cancel -->
                                        <Button variant="ghost" size="icon"
                                            class="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            @click="cancelEditing">
                                            <XCircle class="w-3.5 h-3.5" />
                                        </Button>
                                    </template>
                                    <template v-else>
                                        <!-- Edit -->
                                        <Button variant="ghost" size="icon"
                                            class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-blue-600"
                                            @click="startEditing(dept)">
                                            <Pencil class="w-3.5 h-3.5" />
                                        </Button>
                                        <!-- Delete -->
                                        <Button variant="ghost" size="icon"
                                            class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600"
                                            @click="removeDepartment(dept)">
                                            <Trash2 class="w-3.5 h-3.5" />
                                        </Button>
                                    </template>
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <!-- Table Footer -->
            <div class="border-t border-border/50 px-6 py-3.5 bg-muted/20 flex items-center justify-between">
                <div class="flex items-center gap-4 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Excellent (100%)
                    </span>
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                        Fair (75–99%)
                    </span>
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                        Good (50–74%)
                    </span>
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        Failure (&lt; 50%)
                    </span>
                </div>
                <p class="text-xs text-muted-foreground">
                    {{ selectedMonth }} {{ selectedYear }} · {{ filteredData.length }} departments
                </p>
            </div>
        </Card>

        <!-- Add Department Dialog -->
        <Dialog v-model:open="showAddDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <Plus class="w-5 h-5 text-primary" />
                        Add Department Entry
                    </DialogTitle>
                    <DialogDescription>
                        Enter the department name and task data for
                        <strong>{{ selectedMonth }} {{ selectedYear }}</strong>.
                        Status and remark are auto-computed.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-4 py-4">
                    <!-- Department Name -->
                    <div class="space-y-2">
                        <Label for="dept-name">Department Name</Label>
                        <Input id="dept-name" v-model="newDept.departmentName"
                            placeholder="e.g. Human Resources, ICT Department..." class="text-sm" />
                        <p v-if="newDeptErrors.departmentName" class="text-xs text-red-500">
                            {{ newDeptErrors.departmentName }}
                        </p>
                    </div>

                    <!-- Tasks Assigned -->
                    <div class="space-y-2">
                        <Label for="tasks-assigned">Total Tasks Assigned</Label>
                        <Input id="tasks-assigned" type="number" v-model.number="newDept.totalAssigned" :min="0"
                            class="text-sm" />
                        <p v-if="newDeptErrors.totalAssigned" class="text-xs text-red-500">
                            {{ newDeptErrors.totalAssigned }}
                        </p>
                    </div>

                    <!-- Tasks Completed -->
                    <div class="space-y-2">
                        <Label for="tasks-completed">Total Tasks Completed</Label>
                        <Input id="tasks-completed" type="number" v-model.number="newDept.totalCompleted" :min="0"
                            :max="newDept.totalAssigned" class="text-sm" />
                        <p v-if="newDeptErrors.totalCompleted" class="text-xs text-red-500">
                            {{ newDeptErrors.totalCompleted }}
                        </p>
                    </div>

                    <!-- Auto-Computed Preview -->
                    <div v-if="newDeptPreview"
                        class="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3 mt-2">
                        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auto-Computed
                            Result</p>

                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-foreground">Completion</span>
                            <div class="flex items-center gap-2">
                                <div class="w-20 h-2 rounded-full bg-muted overflow-hidden">
                                    <div class="h-full rounded-full transition-all duration-300"
                                        :class="getPercentageBarColor(newDeptPreview.performanceStatus)"
                                        :style="{ width: getPercentageBarWidth(newDeptPreview.completionPercentage) }">
                                    </div>
                                </div>
                                <span class="text-sm font-bold tabular-nums" :class="{
                                    'text-emerald-600 dark:text-emerald-400': newDeptPreview.performanceStatus === 'Excellent',
                                    'text-blue-600 dark:text-blue-400': newDeptPreview.performanceStatus === 'Fair',
                                    'text-amber-600 dark:text-amber-400': newDeptPreview.performanceStatus === 'Good',
                                    'text-red-600 dark:text-red-400': newDeptPreview.performanceStatus === 'Failure',
                                }">
                                    {{ newDeptPreview.completionPercentage }}%
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-foreground">Status</span>
                            <Badge variant="outline" :class="[
                                'text-xs font-semibold px-2.5 py-1 border rounded-full inline-flex items-center gap-1.5',
                                PERFORMANCE_CONFIG[newDeptPreview.performanceStatus].color
                            ]">
                                <span class="w-1.5 h-1.5 rounded-full"
                                    :class="PERFORMANCE_CONFIG[newDeptPreview.performanceStatus].dotColor"></span>
                                {{ newDeptPreview.performanceStatus }}
                            </Badge>
                        </div>

                        <div>
                            <span class="text-sm text-muted-foreground">Remark</span>
                            <p class="text-sm text-foreground/80 mt-0.5">{{ newDeptPreview.remark }}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" @click="showAddDialog = false">Cancel</Button>
                    <Button @click="addDepartment"
                        :disabled="!newDept.departmentName.trim() || newDept.totalAssigned <= 0 || isSaving">
                        <Loader2 v-if="isSaving" class="w-4 h-4 mr-2 animate-spin" />
                        <Plus v-else class="w-4 h-4 mr-2" />
                        Add to Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
