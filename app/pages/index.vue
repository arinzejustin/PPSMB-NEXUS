<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { definePageMeta } from '#imports';
import { useUser } from '@/composables/states'
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
  RefreshCw
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { format } from 'date-fns';

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

// Mock KPI Data
const kpiData = ref([
  {
    id: 'teachers',
    title: 'Total Teachers',
    value: '5,234',
    change: '+12',
    changeType: 'increase' as const,
    changeLabel: 'this month',
    icon: Users,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'schools',
    title: 'Active Schools',
    value: '342',
    change: '+3',
    changeType: 'increase' as const,
    changeLabel: 'new schools',
    icon: Building2,
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    id: 'transfers',
    title: 'Pending Transfers',
    value: '47',
    change: '-8',
    changeType: 'decrease' as const,
    changeLabel: 'from last week',
    icon: ArrowLeftRight,
    color: 'from-amber-500 to-amber-600'
  },
  {
    id: 'documents',
    title: 'Documents Processed',
    value: '1,847',
    change: '+156',
    changeType: 'increase' as const,
    changeLabel: 'this month',
    icon: FileText,
    color: 'from-violet-500 to-violet-600'
  }
]);

// Zone distribution data
const zoneDistribution = ref([
  { zone: 'Enugu North', teachers: 892, schools: 58 },
  { zone: 'Enugu South', teachers: 1034, schools: 72 },
  { zone: 'Enugu East', teachers: 756, schools: 48 },
  { zone: 'Nsukka', teachers: 1124, schools: 68 },
  { zone: 'Udi', teachers: 689, schools: 52 },
  { zone: 'Awgu', teachers: 739, schools: 44 }
]);

// Monthly trend chart data
const monthlyTrendData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: 'Documents Processed',
      data: [1200, 1350, 1180, 1420, 1380, 1550, 1620, 1480, 1720, 1847, 0, 0],
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4
    },
    {
      label: 'Transfers Completed',
      data: [45, 52, 38, 61, 55, 48, 42, 39, 58, 47, 0, 0],
      borderColor: 'rgb(234, 179, 8)',
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
      fill: true,
      tension: 0.4
    }
  ]
}));

const chartOptions = {
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

// Zone distribution bar chart
const zoneChartData = computed(() => ({
  labels: zoneDistribution.value.map(z => z.zone),
  datasets: [
    {
      label: 'Teachers',
      data: zoneDistribution.value.map(z => z.teachers),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderRadius: 6
    },
    {
      label: 'Schools',
      data: zoneDistribution.value.map(z => z.schools),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 6
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
      'rgba(16, 185, 129, 0.8)',
      'rgba(234, 179, 8, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(156, 163, 175, 0.8)'
    ],
    borderColor: [
      'rgb(16, 185, 129)',
      'rgb(234, 179, 8)',
      'rgb(239, 68, 68)',
      'rgb(156, 163, 175)'
    ],
    borderWidth: 1
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
        padding: 15
      }
    }
  },
  cutout: '65%'
};

// Recent activity feed
const recentActivity = ref([
  {
    id: 1,
    type: 'transfer',
    icon: ArrowLeftRight,
    title: 'Transfer Request Approved',
    description: 'Mrs. Adaobi Nwankwo transferred to Government Secondary School, Nsukka',
    time: '15 minutes ago',
    status: 'success'
  },
  {
    id: 2,
    type: 'document',
    icon: FileCheck,
    title: 'Document Batch Processed',
    description: '24 documents from Enugu South Zone processed successfully',
    time: '1 hour ago',
    status: 'success'
  },
  {
    id: 3,
    type: 'certification',
    icon: AlertCircle,
    title: 'Certification Expiring',
    description: '12 teachers have certifications expiring within 30 days',
    time: '2 hours ago',
    status: 'warning'
  },
  {
    id: 4,
    type: 'user',
    icon: UserPlus,
    title: 'New Teacher Registered',
    description: 'Mr. Emmanuel Okonkwo added to the system',
    time: '3 hours ago',
    status: 'info'
  },
  {
    id: 5,
    type: 'mail',
    icon: Mail,
    title: 'Correspondence Received',
    description: 'Official letter from Ministry of Education',
    time: '5 hours ago',
    status: 'info'
  }
]);

// Quick actions
const quickActions = [
  { label: 'Add Teacher', icon: UserPlus, to: '/staff/new', color: 'bg-blue-500 hover:bg-blue-600' },
  { label: 'Scan Document', icon: FileText, to: '/documents/scan', color: 'bg-emerald-500 hover:bg-emerald-600' },
  { label: 'New Transfer', icon: ArrowLeftRight, to: '/staff/', color: 'bg-amber-500 hover:bg-amber-600' },
  { label: 'View Reports', icon: Activity, to: '/reports/', color: 'bg-violet-500 hover:bg-violet-600' }
];

// Upcoming events
const upcomingEvents = ref([
  { id: 1, title: 'Certification Renewal Deadline', date: '2026-01-25', type: 'deadline' },
  { id: 2, title: 'Bi-weekly Data Sync', date: '2026-01-26', type: 'sync' },
  { id: 3, title: 'Quarterly Report Due', date: '2026-02-01', type: 'report' }
]);

const getActivityStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
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

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false;
  }, 800);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p class="text-muted-foreground mt-1">
          Welcome Back {{ user.name.split(" ")[1] }}! Here's an overview of your system.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-sm text-muted-foreground flex items-center gap-2">
          <Clock class="w-4 h-4" />
          <span>Last updated: {{ format(lastUpdated, 'MMM d, h:mm a') }}</span>
        </div>
        <Button variant="outline" size="sm" @click="refreshData" :disabled="isLoading">
          <RefreshCw :class="['w-4 h-4 mr-2', isLoading ? 'animate-spin' : '']" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card v-for="kpi in kpiData" :key="kpi.id"
        class="relative overflow-hidden group hover:shadow-lg hover:scale-105 transition-all duration-700">
        <div :class="['absolute inset-0 opacity-5 bg-linear-to-br', kpi.color]"></div>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm lg:text-base font-medium font-app text-muted-foreground">
            {{ kpi.title }}
          </CardTitle>
          <div :class="['p-2 rounded-lg bg-linear-to-br text-white', kpi.color]">
            <component :is="kpi.icon" class="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <template v-if="isLoading">
            <Skeleton class="h-8 w-24 mb-2" />
            <Skeleton class="h-4 w-32" />
          </template>
          <template v-else>
            <div class="text-3xl font-bold text-foreground">{{ kpi.value }}</div>
            <p class="text-xs flex items-center gap-1 mt-1">
              <span :class="[
                'flex items-center font-medium',
                kpi.changeType === 'increase' ? 'text-emerald-600' : 'text-amber-600'
              ]">
                <component :is="kpi.changeType === 'increase' ? TrendingUp : TrendingDown" class="w-3 h-3 mr-0.5" />
                {{ kpi.change }}
              </span>
              <span class="text-muted-foreground">{{ kpi.changeLabel }}</span>
            </p>
          </template>
        </CardContent>
      </Card>
    </div>

    <!-- Quick Actions -->
    <Card class="space-y-4">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to" :class="[
            'flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-white transition-all duration-300 hover:scale-105 hover:shadow-lg',
            action.color
          ]">
            <component :is="action.icon" class="w-6 h-6" />
            <span class="text-sm font-medium">{{ action.label }}</span>
          </NuxtLink>
        </div>
      </CardContent>
    </Card>

    <!-- Charts Row -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Monthly Trend Chart -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-primary" />
            Monthly Trends
          </CardTitle>
          <CardDescription>Documents processed and transfers completed by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="h-75">
            <Line v-if="!isLoading" :data="monthlyTrendData" :options="chartOptions" />
            <div v-else class="flex items-center justify-center h-full">
              <Skeleton class="h-full w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Certification Status Donut -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <AlertCircle class="w-5 h-5 text-primary" />
            Certification Status
          </CardTitle>
          <CardDescription>Teacher certification breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="h-75">
            <Doughnut v-if="!isLoading" :data="certificationData" :options="donutOptions" />
            <div v-else class="flex items-center justify-center h-full">
              <Skeleton class="h-48 w-48 rounded-full mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Zone Distribution and Activity -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Zone Distribution -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Building2 class="w-5 h-5 text-primary" />
            Zone Distribution
          </CardTitle>
          <CardDescription>Teachers and schools by administrative zone</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="h-75">
            <Bar v-if="!isLoading" :data="zoneChartData" :options="barChartOptions" />
            <div v-else class="flex items-center justify-center h-full">
              <Skeleton class="h-full w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Recent Activity -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <Activity class="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <template v-if="isLoading">
              <div v-for="i in 4" :key="i" class="flex items-start gap-3">
                <Skeleton class="h-10 w-10 rounded-full" />
                <div class="flex-1 space-y-2">
                  <Skeleton class="h-4 w-3/4" />
                  <Skeleton class="h-3 w-full" />
                </div>
              </div>
            </template>
            <template v-else>
              <div v-for="activity in recentActivity" :key="activity.id"
                class="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                <div :class="['p-2 rounded-full shrink-0', getActivityStatusColor(activity.status)]">
                  <component :is="activity.icon" class="w-4 h-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground">{{ activity.title }}</p>
                  <p class="text-xs text-muted-foreground truncate">{{ activity.description }}</p>
                  <p class="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {{ activity.time }}
                  </p>
                </div>
                <ChevronRight
                  class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </template>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Quick Actions and Upcoming Events -->
    <div class="grid gap-6 lg:grid-cols-3">

      <!-- Upcoming Events -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Calendar class="w-5 h-5 text-primary" />
            Upcoming
          </CardTitle>
          <CardDescription>Important dates and deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div v-for="event in upcomingEvents" :key="event.id"
              class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div class="text-center shrink-0">
                <div class="text-2xl font-bold text-primary">
                  {{ format(new Date(event.date), 'd') }}
                </div>
                <div class="text-xs text-muted-foreground uppercase">
                  {{ format(new Date(event.date), 'MMM') }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground truncate">{{ event.title }}</p>
                <Badge variant="secondary" class="mt-1 text-xs">
                  {{ event.type }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <!-- Quick Actions -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>Scan Document</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to" :class="[
              'flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-white transition-all duration-300 hover:scale-105 hover:shadow-lg',
              action.color
            ]">
              <component :is="action.icon" class="w-6 h-6" />
              <span class="text-sm font-medium">{{ action.label }}</span>
            </NuxtLink>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>