<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { definePageMeta } from '#imports';
import { useUser } from '@/composables/states'
import { useSyncStatus } from '@/composables/useSyncStatus';
import {
  Users,
  Building2,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  ChevronRight,
  Activity,
  UserPlus,
  FileCheck,
  Mail,
  Calendar,
  RefreshCw,
  Zap,
  Target,
  Shield,
  Award,
  Eye,
  Download,
  ArrowUpRight,
  MoreHorizontal,
  BarChart2,
  PieChart,
  LineChart as LineChartIcon
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format, formatDistanceToNow } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

definePageMeta({
  layout: 'app',
  middleware: ['user-validate']
});

const isLoading = ref(true);
const lastUpdated = ref(new Date());
const currentTime = ref(new Date());
const timeInterval = ref<ReturnType<typeof setInterval> | null>(null);
const { status: syncStatus } = useSyncStatus();

watch(() => syncStatus.value.isOnline, (isOnline: boolean) => {
  console.log('Online status changed:', isOnline);
});



onMounted(() => {
  timeInterval.value = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value);
  }
});

// Enhanced KPI Data with more metrics
const kpiData = ref([
  {
    id: 'teachers',
    title: 'Total Teachers',
    value: '5,234',
    change: '+12',
    changePercent: '+2.3%',
    changeType: 'increase' as const,
    changeLabel: 'vs last month',
    icon: Users,
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    bgGradient: 'from-blue-500/10 to-indigo-500/5',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'schools',
    title: 'Active Schools',
    value: '342',
    change: '+3',
    changePercent: '+0.9%',
    changeType: 'increase' as const,
    changeLabel: 'new registrations',
    icon: Building2,
    gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
    bgGradient: 'from-emerald-500/10 to-teal-500/5',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  {
    id: 'transfers',
    title: 'Pending Transfers',
    value: '47',
    change: '-8',
    changePercent: '-14.5%',
    changeType: 'decrease' as const,
    changeLabel: 'from last week',
    icon: ArrowLeftRight,
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    bgGradient: 'from-amber-500/10 to-orange-500/5',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  {
    id: 'documents',
    title: 'Documents Processed',
    value: '1,847',
    change: '+156',
    changePercent: '+9.2%',
    changeType: 'increase' as const,
    changeLabel: 'this month',
    icon: FileText,
    gradient: 'from-violet-500 via-violet-600 to-purple-600',
    bgGradient: 'from-violet-500/10 to-purple-500/5',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400'
  }
]);

// System Health Metrics
const systemHealth = ref([
  { label: 'Database', value: 98, status: 'healthy' },
  { label: 'Sync Engine', value: 95, status: 'healthy' },
  { label: 'API Response', value: 87, status: 'warning' },
  { label: 'Storage', value: 72, status: 'healthy' }
]);

// Zone distribution data
const zoneDistribution = ref([
  { zone: 'Enugu North', teachers: 892, schools: 58, growth: '+5%' },
  { zone: 'Enugu South', teachers: 1034, schools: 72, growth: '+8%' },
  { zone: 'Enugu East', teachers: 756, schools: 48, growth: '+3%' },
  { zone: 'Nsukka', teachers: 1124, schools: 68, growth: '+12%' },
  { zone: 'Udi', teachers: 689, schools: 52, growth: '+2%' },
  { zone: 'Awgu', teachers: 739, schools: 44, growth: '+6%' }
]);

// Monthly trend chart data with enhanced styling
const monthlyTrendData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: 'Documents Processed',
      data: [1200, 1350, 1180, 1420, 1380, 1550, 1620, 1480, 1720, 1847, 0, 0],
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgb(99, 102, 241)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    },
    {
      label: 'Transfers Completed',
      data: [45, 52, 38, 61, 55, 48, 42, 39, 58, 47, 0, 0],
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgb(16, 185, 129)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          family: 'inherit',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        size: 14,
        weight: 'bold' as const
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          family: 'inherit'
        }
      }
    },
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          family: 'inherit'
        }
      }
    }
  }
};

// Zone distribution bar chart
const zoneChartData = computed(() => ({
  labels: zoneDistribution.value.map(z => z.zone),
  datasets: [
    {
      label: 'Teachers',
      data: zoneDistribution.value.map(z => z.teachers),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderRadius: 8,
      borderSkipped: false
    },
    {
      label: 'Schools',
      data: zoneDistribution.value.map(z => z.schools * 10), // Scale for visibility
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 8,
      borderSkipped: false
    }
  ]
}));

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
};

// Certification status donut chart
const certificationData = computed(() => ({
  labels: ['Active', 'Expiring Soon', 'Expired', 'Pending'],
  datasets: [{
    data: [3245, 892, 234, 863],
    backgroundColor: [
      'rgba(16, 185, 129, 0.9)',
      'rgba(234, 179, 8, 0.9)',
      'rgba(239, 68, 68, 0.9)',
      'rgba(156, 163, 175, 0.9)'
    ],
    borderColor: [
      'rgb(16, 185, 129)',
      'rgb(234, 179, 8)',
      'rgb(239, 68, 68)',
      'rgb(156, 163, 175)'
    ],
    borderWidth: 2,
    hoverOffset: 8
  }]
}));

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        usePointStyle: true,
        padding: 15,
        font: {
          family: 'inherit'
        }
      }
    }
  },
  cutout: '70%'
};

// Recent activity feed with avatars
const recentActivity = ref([
  {
    id: 1,
    type: 'transfer',
    icon: ArrowLeftRight,
    title: 'Transfer Request Approved',
    description: 'Mrs. Adaobi Nwankwo transferred to Government Secondary School, Nsukka',
    time: new Date(Date.now() - 15 * 60 * 1000),
    status: 'success',
    user: { name: 'Admin User', avatar: null }
  },
  {
    id: 2,
    type: 'document',
    icon: FileCheck,
    title: 'Document Batch Processed',
    description: '24 documents from Enugu South Zone processed successfully',
    time: new Date(Date.now() - 60 * 60 * 1000),
    status: 'success',
    user: { name: 'System', avatar: null }
  },
  {
    id: 3,
    type: 'certification',
    icon: AlertCircle,
    title: 'Certification Expiring',
    description: '12 teachers have certifications expiring within 30 days',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'warning',
    user: { name: 'System Alert', avatar: null }
  },
  {
    id: 4,
    type: 'user',
    icon: UserPlus,
    title: 'New Teacher Registered',
    description: 'Mr. Emmanuel Okonkwo added to the system',
    time: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: 'info',
    user: { name: 'HR Admin', avatar: null }
  },
  {
    id: 5,
    type: 'mail',
    icon: Mail,
    title: 'Correspondence Received',
    description: 'Official letter from Ministry of Education',
    time: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: 'info',
    user: { name: 'Mail System', avatar: null }
  }
]);

// Quick actions with enhanced styling
const quickActions = [
  {
    label: 'Add Teacher',
    icon: UserPlus,
    to: '/staff/new',
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Register new staff'
  },
  {
    label: 'Scan Document',
    icon: FileText,
    to: '/documents/scan',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Digitize records'
  },
  {
    label: 'New Transfer',
    icon: ArrowLeftRight,
    to: '/staff/',
    gradient: 'from-amber-500 to-orange-600',
    description: 'Process requests'
  },
  {
    label: 'View Reports',
    icon: BarChart2,
    to: '/reports/',
    gradient: 'from-violet-500 to-purple-600',
    description: 'Analytics & insights'
  }
];

// Upcoming events
const upcomingEvents = ref([
  { id: 1, title: 'Certification Renewal Deadline', date: '2026-01-30', type: 'deadline', priority: 'high' },
  { id: 2, title: 'Bi-weekly Data Sync', date: '2026-01-29', type: 'sync', priority: 'medium' },
  { id: 3, title: 'Quarterly Report Due', date: '2026-02-01', type: 'report', priority: 'high' },
  { id: 4, title: 'Staff Training Session', date: '2026-02-05', type: 'training', priority: 'low' }
]);

// Top performing zones
const topZones = computed(() =>
  [...zoneDistribution.value]
    .sort((a, b) => b.teachers - a.teachers)
    .slice(0, 3)
);

const getActivityStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }
};

const getHealthColor = (value: number) => {
  if (value >= 90) return 'bg-emerald-500';
  if (value >= 70) return 'bg-amber-500';
  return 'bg-red-500';
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-500/10 text-red-600 border-red-500/30';
    case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    default: return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
  }
};

const refreshData = () => {
  isLoading.value = true;
  setTimeout(() => {
    lastUpdated.value = new Date();
    isLoading.value = false;
  }, 1000);
};

const user = computed(() => {
  const user = useUser();
  return user.value;
});

const greeting = computed(() => {
  const hour = currentTime.value.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
});

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false;
  }, 800);
});
</script>

<template>
  <div class="space-y-6 pb-8">
    <!-- Premium Page Header -->
    <div
      class="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-8">
      <!-- Decorative Elements -->
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2">
      </div>
      <div
        class="absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-primary/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2">
      </div>

      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar class="w-4 h-4" />
            {{ format(currentTime, 'EEEE, MMMM d, yyyy') }}
            <span class="text-primary font-mono">{{ format(currentTime, 'HH:mm:ss') }}</span>
          </div>
          <h1 class="text-3xl lg:text-4xl font-bold tracking-tight">
            {{ greeting }}, <span class="text-primary">{{ user?.name?.split(' ')[1] || 'User' }}</span>!
          </h1>
          <p class="text-muted-foreground max-w-2xl">
            Here's your command center for managing staff, documents, and operations across all zones.
          </p>
        </div>

        <div class="flex flex-col items-center gap-3">
          <div class="relative flex items-center gap-3">
            <div :class="[
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
              syncStatus.isOnline
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            ]">
              <span :class="[
                'w-2 h-2 rounded-full animate-pulse',
                syncStatus.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              ]"></span>
              {{ syncStatus.isOnline ? 'System Online' : 'Offline Mode' }}
            </div>

            <Button variant="outline" size="sm" @click="refreshData" :disabled="isLoading" class="rounded-full">
              <RefreshCw :class="['w-4 h-4 mr-2', isLoading ? 'animate-spin' : '']" />
              Refresh
            </Button>
          </div>
          <div class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
            <Clock class="w-4 h-4 text-muted-foreground" />
            <span class="text-muted-foreground">Updated
              {{ formatDistanceToNow(lastUpdated, { addSuffix: true }) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Cards - Premium Glass Design -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card v-for="kpi in kpiData" :key="kpi.id"
        class="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-0 bg-linear-to-br from-background to-muted/30">
        <!-- Gradient Background -->
        <div
          :class="['absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br', kpi.bgGradient]">
        </div>

        <!-- Decorative Corner -->
        <div :class="['absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 bg-linear-to-br', kpi.gradient]">
        </div>

        <CardHeader class="relative flex flex-row items-start justify-between pb-2">
          <div class="space-y-1">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              {{ kpi.title }}
            </CardTitle>
            <template v-if="isLoading">
              <Skeleton class="h-9 w-24" />
            </template>
            <template v-else>
              <div class="text-3xl font-bold tracking-tight">{{ kpi.value }}</div>
            </template>
          </div>
          <div :class="['p-3 rounded-xl', kpi.iconBg]">
            <component :is="kpi.icon" :class="['w-5 h-5', kpi.iconColor]" />
          </div>
        </CardHeader>

        <CardContent class="relative pt-0">
          <template v-if="isLoading">
            <Skeleton class="h-4 w-32" />
          </template>
          <template v-else>
            <div class="flex items-center gap-2">
              <Badge :variant="kpi.changeType === 'increase' ? 'default' : 'secondary'" :class="[
                'font-semibold text-xs',
                kpi.changeType === 'increase'
                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
              ]">
                <component :is="kpi.changeType === 'increase' ? TrendingUp : TrendingDown" class="w-3 h-3 mr-1" />
                {{ kpi.changePercent }}
              </Badge>
              <span class="text-xs text-muted-foreground">{{ kpi.changeLabel }}</span>
            </div>
          </template>
        </CardContent>

        <!-- Hover Shimmer -->
        <div
          class="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000">
        </div>
      </Card>
    </div>

    <!-- Quick Actions - Premium Floating Cards -->
    <Card class="border-0 bg-linear-to-br from-background via-background to-muted/20 shadow-lg">
      <CardHeader class="pb-4">
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <Zap class="w-5 h-5 text-amber-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Frequently used operations at your fingertips</CardDescription>
          </div>
          <Button variant="ghost" size="sm" class="text-muted-foreground">
            View All
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to"
            class="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
            <!-- Gradient Background -->
            <div
              :class="['absolute inset-0 bg-linear-to-br opacity-90 group-hover:opacity-100 transition-opacity', action.gradient]">
            </div>

            <!-- Glass Overlay -->
            <div
              class="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            </div>

            <!-- Content -->
            <div class="relative flex flex-col items-center gap-3 text-white">
              <div class="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                <component :is="action.icon" class="w-6 h-6" />
              </div>
              <span class="font-semibold text-center">{{ action.label }}</span>
              <span class="text-xs text-white/70 text-center">{{ action.description }}</span>
            </div>

            <!-- Arrow indicator -->
            <ArrowUpRight
              class="absolute top-4 right-4 w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
          </NuxtLink>
        </div>
      </CardContent>
    </Card>

    <!-- Charts Row -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Monthly Trend Chart -->
      <Card class="lg:col-span-2 border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="flex items-center gap-2">
                <LineChartIcon class="w-5 h-5 text-indigo-500" />
                Monthly Trends
              </CardTitle>
              <CardDescription>Documents processed and transfers completed</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="h-8 w-8">
                  <MoreHorizontal class="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download class="w-4 h-4 mr-2" /> Export Data
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye class="w-4 h-4 mr-2" /> View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div class="h-80">
            <Line v-if="!isLoading" :data="monthlyTrendData" :options="chartOptions" />
            <div v-else class="flex items-center justify-center h-full">
              <Skeleton class="h-full w-full rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Certification Status Donut -->
      <Card class="border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <PieChart class="w-5 h-5 text-emerald-500" />
            Certification Status
          </CardTitle>
          <CardDescription>Teacher certification breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="h-72">
            <Doughnut v-if="!isLoading" :data="certificationData" :options="donutOptions" />
            <div v-else class="flex items-center justify-center h-full">
              <Skeleton class="h-48 w-48 rounded-full mx-auto" />
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex-col items-start gap-2 text-sm border-t pt-4">
          <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Shield class="w-4 h-4" />
            <span class="font-medium">62% fully certified</span>
          </div>
        </CardFooter>
      </Card>
    </div>

    <!-- Zone Distribution and Activity -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Zone Distribution -->
      <Card class="border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="flex items-center gap-2">
                <BarChart2 class="w-5 h-5 text-indigo-500" />
                Zone Distribution
              </CardTitle>
              <CardDescription>Teachers and schools by administrative zone</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="h-72">
            <Bar v-if="!isLoading" :data="zoneChartData" :options="barChartOptions" />
            <div v-else class="flex items-center justify-center h-full">
              <Skeleton class="h-full w-full rounded-xl" />
            </div>
          </div>
        </CardContent>
        <CardFooter class="border-t pt-4">
          <div class="flex items-center gap-4 w-full">
            <div v-for="zone in topZones" :key="zone.zone" class="flex items-center gap-2">
              <Award class="w-4 h-4 text-amber-500" />
              <span class="text-sm font-medium">{{ zone.zone }}</span>
              <Badge variant="outline" class="text-xs">{{ zone.growth }}</Badge>
            </div>
          </div>
        </CardFooter>
      </Card>

      <!-- Recent Activity -->
      <Card class="border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader class="flex flex-row items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <Activity class="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </div>
          <Button variant="ghost" size="sm" class="text-muted-foreground">
            View All
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea class="h-80 pr-4">
            <div class="space-y-4">
              <template v-if="isLoading">
                <div v-for="i in 4" :key="i" class="flex items-start gap-3">
                  <Skeleton class="h-10 w-10 rounded-full shrink-0" />
                  <div class="flex-1 space-y-2">
                    <Skeleton class="h-4 w-3/4" />
                    <Skeleton class="h-3 w-full" />
                  </div>
                </div>
              </template>
              <template v-else>
                <div v-for="activity in recentActivity" :key="activity.id"
                  class="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div
                    :class="['p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110', getActivityStatusColor(activity.status)]">
                    <component :is="activity.icon" class="w-4 h-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">{{ activity.title }}</p>
                    <p class="text-xs text-muted-foreground truncate">{{ activity.description }}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                      <Clock class="w-3 h-3 text-muted-foreground/70" />
                      <span class="text-xs text-muted-foreground/70">
                        {{ formatDistanceToNow(activity.time, { addSuffix: true }) }}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </template>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>

    <!-- System Health and Upcoming Events -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- System Health -->
      <Card class="border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Target class="w-5 h-5 text-emerald-500" />
            System Health
          </CardTitle>
          <CardDescription>Real-time performance metrics</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-for="metric in systemHealth" :key="metric.label" class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">{{ metric.label }}</span>
              <span :class="[
                'font-semibold',
                metric.value >= 90 ? 'text-emerald-600' : metric.value >= 70 ? 'text-amber-600' : 'text-red-600'
              ]">{{ metric.value }}%</span>
            </div>
            <div class="h-2 rounded-full bg-muted overflow-hidden">
              <div :class="['h-full rounded-full transition-all duration-500', getHealthColor(metric.value)]"
                :style="{ width: `${metric.value}%` }"></div>
            </div>
          </div>
        </CardContent>
        <CardFooter class="border-t pt-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All systems operational
          </div>
        </CardFooter>
      </Card>

      <!-- Upcoming Events -->
      <Card class="lg:col-span-2 border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="flex items-center gap-2">
                <Calendar class="w-5 h-5 text-primary" />
                Upcoming Events
              </CardTitle>
              <CardDescription>Important dates and deadlines</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Calendar class="w-4 h-4 mr-2" /> View Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="event in upcomingEvents" :key="event.id"
              class="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer group">
              <!-- Date Block -->
              <div class="text-center shrink-0 p-3 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                <div class="text-2xl font-bold text-primary">
                  {{ format(new Date(event.date), 'd') }}
                </div>
                <div class="text-xs text-muted-foreground uppercase font-medium">
                  {{ format(new Date(event.date), 'MMM') }}
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate">{{ event.title }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <Badge variant="outline" :class="getPriorityColor(event.priority)" class="text-[10px] capitalize">
                    {{ event.priority }}
                  </Badge>
                  <Badge variant="secondary" class="text-[10px] capitalize">
                    {{ event.type }}
                  </Badge>
                </div>
              </div>

              <ChevronRight
                class="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* Custom animation enhancements */
@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>