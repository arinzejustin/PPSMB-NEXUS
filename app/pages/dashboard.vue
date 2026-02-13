<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { definePageMeta, useHead, useRuntimeConfig, showToast, navigateTo } from '#imports';
import { useUser } from '~/composables/useUserStates';
import { useSyncStatus } from '@/composables/useSyncStatus';
import { useDashboardData } from '@/composables/useDashboardData';
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
  LineChart as LineChartIcon,
  MapPin,
  GraduationCap,
  Heart,
  Bell,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Wifi,
  WifiOff,
  Cloud,
  Loader2,
  ScanLine,
  Send,
  ClipboardList,
  X
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { format, formatDistanceToNow } from 'date-fns';
import { setStorage, getStorage, getSession, setSession } from "@/lib/storage"
import MonthlyPerformanceTimeline, { type MonthlyData } from '@/components/app/MonthlyPerformanceTimeline.vue';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const env = useRuntimeConfig();
const isDesktop = computed(() => env.public.appType === 'desktop');

useHead({
  title: isDesktop.value ? 'PPSMB Staff Manager' : 'Dashboard - PPSMB Staff Manager'
});

definePageMeta({
  layout: 'app',
  middleware: ['user-validate']
});

const currentTime = ref(new Date());
const timeInterval = ref<ReturnType<typeof setInterval> | null>(null);
const showSyncDetails = ref(false);
const showQuickActionsDialog = ref(false);
const showAlertsInline = ref(false);


const { status: syncStatus, formatLastSynced, statusColor, forceCheck } = useSyncStatus();
const {
  data: dashboardData,
  metrics,
  zones,
  recentActivity,
  alerts,
  upcomingEvents,
  charts,
  systemHealth,
  lastUpdated,
  topZones,
  criticalAlertsCount,
  isLoading,
  refresh,
  dismissAlert,
  monthlyPerformanceData
} = useDashboardData();

const user = computed(() => {
  const userData = useUser();
  return userData.value;
});

const greeting = computed(() => {
  const hour = currentTime.value.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
});

const userName = computed(() => {
  if (!user.value?.name) return 'User';
  const names = user.value.name.split(' ');
  return names[names.length > 1 ? 1 : 0] || 'User';
});

const userRole = computed(() => {
  if (!user.value?.role) return 'Staff';
  return user.value.role.replace(/_/g, ' ').split(' ')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
});

const pendingTasksSummary = computed(() => {
  const tasks = [];
  const transferCount = parseInt(metrics.value[3]?.value?.toString() || '0');
  if (transferCount > 0) {
    tasks.push(`${transferCount} pending transfers`);
  }
  if (criticalAlertsCount.value > 0) {
    tasks.push(`${criticalAlertsCount.value} critical alerts`);
  }
  return tasks.length > 0 ? tasks.join(' • ') : 'All caught up!';
});

const monthlyTrendData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: 'Documents Processed',
      data: charts.value.documentTrends.map(d => d.value) || [1200, 1350, 1180, 1420, 1380, 1550, 1620, 1480, 1720, 1847, 0, 0],
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
  labels: zones.value.map(z => z.name),
  datasets: [
    {
      label: 'Teachers',
      data: zones.value.map(z => z.teacherCount),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderRadius: 8,
      borderSkipped: false
    },
    {
      label: 'Schools',
      data: zones.value.map(z => z.schoolCount),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 8,
      borderSkipped: false
    },
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
  labels: charts.value.certificationStatus.map(c => c.label) || ['Active', 'Expiring Soon', 'Expired', 'Pending'],
  datasets: [{
    data: charts.value.certificationStatus.map(c => c.value) || [3245, 892, 234, 863],
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


const handlePerformanceMoreClick = (monthData: MonthlyData) => {
  navigateTo({
    path: '/reports',
    query: {
      tab: 'task-completion',
      month: monthData.month,
      year: monthData.year
    }
  });
};

const iconMap: Record<string, any> = {
  Users,
  Building2,
  ArrowLeftRight,
  FileText,
  MapPin,
  GraduationCap,
  Heart,
  TrendingUp,
  TrendingDown,
  Activity,
  UserPlus,
  FileCheck,
  Mail,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle
};

// Get icon component by name
const getIcon = (iconName: string) => {
  return iconMap[iconName] || Activity;
};

// Sync status icon
const syncIcon = computed(() => {
  if (syncStatus.value.isChecking) return Loader2;
  if (!syncStatus.value.isOnline) return WifiOff;
  return syncStatus.value.connectionStrength === 'excellent' ? Cloud : Wifi;
});

// Sync status text with more detail
const syncStatusText = computed(() => {
  if (syncStatus.value.isChecking) return 'Checking connection...';
  if (!syncStatus.value.isOnline) return 'Offline Mode';

  switch (syncStatus.value.connectionStrength) {
    case 'excellent': return 'Online & Synced';
    case 'good': return 'Connected';
    case 'poor': return 'Weak Connection';
    default: return 'Offline Mode';
  }
});

// All available quick actions
const allQuickActions = [
  {
    id: 'add-teacher',
    label: 'Add Teacher',
    icon: UserPlus,
    to: '/staff/new',
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Register new staff',
    shortcut: 'Ctrl+N'
  },
  {
    id: 'scan-document',
    label: 'Scan Document',
    icon: ScanLine,
    to: '/documents/scan',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Digitize records',
    shortcut: 'Ctrl+D',
    desktopOnly: true
  },
  {
    id: 'process-transfer',
    label: 'Process Transfer',
    icon: ArrowLeftRight,
    to: '/staff/transfers',
    gradient: 'from-amber-500 to-orange-600',
    description: 'Manage requests',
    shortcut: 'Ctrl+T'
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    icon: BarChart2,
    to: '/reports/',
    gradient: 'from-violet-500 to-purple-600',
    description: 'Analytics & insights',
    shortcut: 'Ctrl+R'
  },
  {
    id: 'send-mail',
    label: 'Send Mail',
    icon: Mail,
    to: '/mail/?compose=true',
    gradient: 'from-rose-500 to-pink-600',
    description: 'Correspondence',
    shortcut: 'Ctrl+M'
  },
  {
    id: 'broadcast',
    label: 'Broadcast Messages',
    icon: Send,
    to: '/broadcast',
    gradient: 'dark:from-white/80 dark:to-white/20 from-black/80 to-black/20',
    description: 'Send messages to all staff',
    shortcut: 'Ctrl+B'
  },
  {
    id: 'evaluation',
    label: 'Evaluation',
    icon: ClipboardList,
    to: '/evaluations/new',
    gradient: 'from-cyan-500 to-blue-600',
    description: 'Performance review',
    shortcut: 'Ctrl+E'
  }
];

// Get available actions based on platform (exclude desktop-only on web)
const availableQuickActions = computed(() => {
  return allQuickActions.filter(action => {
    if (action.desktopOnly && !window.electronAPI) return false;
    return true;
  });
});

const selectedQuickActionIds = ref<string[]>([]);
const tempSelectedIds = ref<string[]>([]);

const displayedQuickActions = computed(() => {
  return availableQuickActions.value
    .filter(action => selectedQuickActionIds.value.includes(action.id))
    .slice(0, 4);
});

const loadQuickActionsFromStorage = () => {
  try {
    const saved = getStorage<string[]>('dashboard_quick_actions');
    if (saved) {
      const validIds = saved.filter(id =>
        availableQuickActions.value.some(action => action.id === id)
      );
      selectedQuickActionIds.value = validIds.slice(0, 4);
    } else {
      selectedQuickActionIds.value = availableQuickActions.value
        .slice(0, 4)
        .map(a => a.id);
    }
  } catch (e) {
    selectedQuickActionIds.value = availableQuickActions.value
      .slice(0, 4)
      .map(a => a.id);
  }
};

const saveQuickActionsToStorage = () => {
  try {
    setStorage('dashboard_quick_actions', selectedQuickActionIds.value);
  } catch (e) {
    showToast('Failed to customize quick actions!', 'warning');
  }
};

const openCustomizeDialog = () => {
  tempSelectedIds.value = [...selectedQuickActionIds.value];
  showQuickActionsDialog.value = true;
};

const toggleActionSelection = (actionId: string) => {
  const index = tempSelectedIds.value.indexOf(actionId);
  if (index > -1) {
    tempSelectedIds.value.splice(index, 1);
  } else {
    if (tempSelectedIds.value.length < 4) {
      tempSelectedIds.value.push(actionId);
    }
  }
};

const isActionSelected = (actionId: string) => {
  return tempSelectedIds.value.includes(actionId);
};
const canSelectMore = computed(() => {
  return tempSelectedIds.value.length < 4;
});

const saveQuickActionsCustomization = () => {
  selectedQuickActionIds.value = [...tempSelectedIds.value];
  saveQuickActionsToStorage();
  showQuickActionsDialog.value = false;
};

const cancelQuickActionsCustomization = () => {
  showQuickActionsDialog.value = false;
  tempSelectedIds.value = [];
};


const getActivityStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'transfer': return ArrowLeftRight;
    case 'document': return FileCheck;
    case 'certification': return AlertCircle;
    case 'user': return UserPlus;
    case 'mail': return Mail;
    default: return Activity;
  }
};

const getHealthColor = (value: number) => {
  if (value >= 90) return 'bg-emerald-500';
  if (value >= 70) return 'bg-amber-500';
  return 'bg-red-500';
};

const getHealthTextColor = (value: number) => {
  if (value >= 90) return 'text-emerald-600';
  if (value >= 70) return 'text-amber-600';
  return 'text-red-600';
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-500/10 text-red-600 border-red-500/30';
    case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    default: return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
  }
};

const getAlertIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return XCircle;
    case 'warning': return AlertTriangle;
    default: return Info;
  }
};

const getAlertColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'border-red-500/30 bg-red-500/5';
    case 'warning': return 'border-amber-500/30 bg-amber-500/5';
    default: return 'border-blue-500/30 bg-blue-500/5';
  }
};

const getAlertIconColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-500';
    case 'warning': return 'text-amber-500';
    default: return 'text-blue-500';
  }
};

const getZoneHealthColor = (health: string) => {
  switch (health) {
    case 'healthy': return 'bg-emerald-500';
    case 'attention': return 'bg-amber-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getZoneHealthText = (health: string) => {
  switch (health) {
    case 'healthy': return 'Healthy';
    case 'attention': return 'Needs Attention';
    case 'critical': return 'Critical';
    default: return 'Unknown';
  }
};

// Refresh data function
const refreshData = async () => {
  await refresh();
  await forceCheck();
};

// Handle sync now
const handleSyncNow = async () => {
  await forceCheck();
};

// Check if alerts should be shown inline (first visit this session)
const checkAlertsVisibility = () => {
  const alertsShownThisSession = getSession<boolean>('dashboard_alerts_shown');
  if (!alertsShownThisSession) {
    showAlertsInline.value = true;
    setSession('dashboard_alerts_shown', true);
  }
};

// Dismiss inline alerts (hides the inline section, bell still shows alerts)
const dismissInlineAlerts = () => {
  showAlertsInline.value = false;
};

onMounted(() => {
  timeInterval.value = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  // Load quick actions from localStorage
  loadQuickActionsFromStorage();
  // Check if we should show inline alerts
  checkAlertsVisibility();
});

onUnmounted(() => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value);
  }
});
</script>

<template>
  <div class="space-y-6 pb-8">
    <div
      class="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2">
      </div>
      <div
        class="absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-primary/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2">
      </div>
      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar class="w-4 h-4" />
            {{ format(currentTime, 'EEEE, MMMM d, yyyy') }}
            <span class="text-primary font-mono font-semibold">{{ format(currentTime, 'HH:mm:ss') }}</span>
          </div>
          <h1 class="text-3xl lg:text-4xl font-bold tracking-tight">
            {{ greeting }}, <span class="text-primary">{{ userName }}</span>!
          </h1>
          <div class="flex items-center gap-3">
            <Badge variant="outline" class="px-3 py-1 font-medium bg-primary/5">
              {{ userRole }}
            </Badge>
            <span class="text-muted-foreground text-sm">{{ pendingTasksSummary }}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-3">
          <div
            class="relative bg-muted/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 cursor-pointer hover:bg-muted/70 transition-all min-w-[280px]"
            @click="showSyncDetails = !showSyncDetails">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div :class="[
                  'p-2 rounded-lg transition-all',
                  statusColor.bg
                ]">
                  <component :is="syncIcon" :class="[
                    'w-5 h-5',
                    statusColor.text,
                    syncStatus.isChecking ? 'animate-spin' : ''
                  ]" />
                </div>
                <div>
                  <p :class="['font-semibold text-sm', statusColor.text]">
                    {{ syncStatusText }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    Last synced {{ formatLastSynced }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="syncStatus.pendingChanges > 0"
                  class="px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-600 rounded-full">
                  {{ syncStatus.pendingChanges }} pending
                </span>
                <ChevronRight :class="[
                  'w-4 h-4 text-muted-foreground transition-transform',
                  showSyncDetails ? 'rotate-90' : ''
                ]" />
              </div>
            </div>
            <div v-if="showSyncDetails" class="mt-4 pt-4 border-t border-border/50 space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Connection</span>
                <span class="font-medium capitalize">{{ syncStatus.connectionStrength }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Pending Changes</span>
                <span class="font-medium">{{ syncStatus.pendingChanges }}</span>
              </div>
              <Button variant="outline" size="sm" class="w-full"
                :disabled="!syncStatus.isOnline || syncStatus.isChecking" @click.stop="handleSyncNow">
                <RefreshCw :class="['w-4 h-4 mr-2', syncStatus.isChecking ? 'animate-spin' : '']" />
                Sync Now
              </Button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- Notification Bell with Dropdown -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="icon" class="relative rounded-full h-9 w-9">
                  <Bell class="w-4 h-4" />
                  <span v-if="alerts.length > 0"
                    class="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                    {{ alerts.length > 9 ? '9+' : alerts.length }}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-80 max-h-96 overflow-auto">
                <div class="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span class="font-semibold text-sm">Notifications</span>
                  <Badge v-if="alerts.length > 0" variant="secondary" class="text-xs">
                    {{ alerts.length }} alert{{ alerts.length > 1 ? 's' : '' }}
                  </Badge>
                </div>
                <div v-if="alerts.length === 0" class="p-4 text-center text-muted-foreground text-sm">
                  <Bell class="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No alerts at this time</p>
                </div>
                <template v-else>
                  <div v-for="alert in alerts" :key="alert.id"
                    class="p-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                    <div class="flex items-start gap-3">
                      <div
                        :class="['p-1.5 rounded-lg shrink-0', alert.severity === 'critical' ? 'bg-red-500/10' : alert.severity === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10']">
                        <component :is="getAlertIcon(alert.severity)"
                          :class="['w-4 h-4', getAlertIconColor(alert.severity)]" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm truncate">{{ alert.title }}</p>
                        <p class="text-xs text-muted-foreground line-clamp-2 mt-0.5">{{ alert.description }}</p>
                        <div class="flex items-center gap-2 mt-2">
                          <Button v-if="alert.actionLabel" variant="outline" size="sm" class="h-7 text-xs"
                            @click="$router.push(alert.actionRoute || '#')">
                            {{ alert.actionLabel }}
                          </Button>
                          <Button v-if="alert.dismissable" variant="ghost" size="sm" class="h-7 text-xs"
                            @click="dismissAlert(alert.id)">
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" @click="refreshData" :disabled="isLoading" class="rounded-full">
              <RefreshCw :class="['w-4 h-4 mr-2', isLoading ? 'animate-spin' : '']" />
              Refresh
            </Button>
            <div class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
              <Clock class="w-4 h-4 text-muted-foreground" />
              <span class="text-muted-foreground">Updated
                {{ formatDistanceToNow(lastUpdated, { addSuffix: true }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Critical Alerts Section (Prominent) - Only shown on first visit per session -->
    <div v-if="alerts.length > 0 && showAlertsInline" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Bell class="w-4 h-4" />
          System Alerts
        </h3>
        <Button variant="ghost" size="sm" class="h-7 text-xs" @click="dismissInlineAlerts">
          <X class="w-3 h-3 mr-1" />
          Dismiss All
        </Button>
      </div>
      <div v-for="alert in alerts" :key="alert.id" :class="[
        'relative p-4 rounded-xl border-2 flex items-start gap-4 transition-all hover:shadow-md',
        getAlertColor(alert.severity)
      ]">
        <div
          :class="['p-2 rounded-lg', alert.severity === 'critical' ? 'bg-red-500/10' : alert.severity === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10']">
          <component :is="getAlertIcon(alert.severity)" :class="['w-5 h-5', getAlertIconColor(alert.severity)]" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm">{{ alert.title }}</p>
          <p class="text-sm text-muted-foreground mt-1">{{ alert.description }}</p>
          <div class="flex items-center gap-2 mt-3">
            <Button v-if="alert.actionLabel" variant="outline" size="sm"
              @click="$router.push(alert.actionRoute || '#')">
              {{ alert.actionLabel }}
            </Button>
            <Button v-if="alert.dismissable" variant="ghost" size="sm" @click="dismissAlert(alert.id)">
              Dismiss
            </Button>
          </div>
        </div>
        <Button v-if="alert.dismissable" variant="ghost" size="icon" class="shrink-0 h-8 w-8"
          @click="dismissAlert(alert.id)">
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="kpi in metrics" :key="kpi.id"
        class="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-0 bg-linear-to-br from-background to-muted/30"
        :class="{ 'cursor-pointer': kpi.route }" @click="kpi.route && $router.push(kpi.route)">
        <Badge v-if="kpi.badge" variant="secondary" class="absolute top-2 right-2 z-10 text-[10px] px-1.5">
          {{ kpi.badge }}
        </Badge>

        <div
          :class="['absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br', kpi.bgGradient]">
        </div>
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
            <component :is="getIcon(kpi.icon)" :class="['w-5 h-5', kpi.iconColor]" />
          </div>
        </CardHeader>

        <CardContent class="relative pt-0">
          <template v-if="isLoading">
            <Skeleton class="h-4 w-32" />
          </template>
          <template v-else>
            <div class="flex items-center gap-2">
              <Badge v-if="kpi.changePercent" :variant="kpi.changeType === 'increase' ? 'default' : 'secondary'" :class="[
                'font-semibold text-xs',
                kpi.changeType === 'increase'
                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  : kpi.changeType === 'decrease'
                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                    : 'bg-muted text-muted-foreground'
              ]">
                <component :is="kpi.changeType === 'increase' ? TrendingUp : TrendingDown" class="w-3 h-3 mr-1" />
                {{ kpi.changePercent }}
              </Badge>
              <span v-else class="text-xs font-medium text-muted-foreground">{{ kpi.change }}</span>
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
            <CardDescription class="mt-1.5">Frequently used operations at your fingertips</CardDescription>
          </div>
          <Button variant="ghost" size="sm" class="text-muted-foreground" @click="openCustomizeDialog">
            Customize
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <TooltipProvider>
            <NuxtLink v-for="action in displayedQuickActions" :key="action.id" :to="action.to"
              class="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
              <!-- Gradient Background -->
              <div
                :class="['absolute inset-0 bg-linear-to-br opacity-90 group-hover:opacity-100 transition-opacity', action.gradient]">
              </div>

              <!-- Glass Overlay -->
              <div
                class="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              </div>

              <!-- Content -->
              <div class="relative flex flex-col items-center gap-2 text-white">
                <div class="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <component :is="action.icon" class="w-5 h-5" />
                </div>
                <span class="font-semibold text-center text-sm">{{ action.label }}</span>
                <span class="text-[11px] text-white/70 text-center">{{ action.description }}</span>
              </div>

              <!-- Keyboard shortcut hint -->
              <Tooltip v-if="isDesktop">
                <TooltipTrigger as-child>
                  <div
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white/50 font-mono">
                    {{ action.shortcut }}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{{ action.shortcut }}</p>
                </TooltipContent>
              </Tooltip>

              <!-- Arrow indicator -->
              <ArrowUpRight
                class="absolute bottom-3 right-3 w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </NuxtLink>
          </TooltipProvider>
        </div>

        <!-- Empty state when no actions selected -->
        <div v-if="displayedQuickActions.length === 0" class="text-center py-8">
          <Zap class="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p class="text-muted-foreground text-sm">No quick actions selected</p>
          <Button variant="outline" size="sm" class="mt-3" @click="openCustomizeDialog">
            Choose Actions
          </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog :open="showQuickActionsDialog" @update:open="val => !val && cancelQuickActionsCustomization()">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Zap class="w-5 h-5 text-amber-500" />
            Customize Quick Actions
          </DialogTitle>
          <DialogDescription>
            Select up to {{ 4 }} quick actions to display on your dashboard.
            <span
              :class="['font-medium ml-1', tempSelectedIds.length >= 4 ? 'text-amber-600' : 'text-muted-foreground']">
              ({{ tempSelectedIds.length }}/{{ 4 }} selected)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-3 py-4 max-h-[360px] overflow-y-auto">
          <div v-for="action in availableQuickActions" :key="action.id" :class="[
            'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
            isActionSelected(action.id)
              ? 'border-primary/50 bg-primary/5'
              : 'border-border hover:border-primary/30 hover:bg-muted/30',
            !isActionSelected(action.id) && !canSelectMore ? 'opacity-50 cursor-not-allowed' : ''
          ]" @click="toggleActionSelection(action.id)">
            <div :class="['p-2 rounded-lg bg-linear-to-br text-white', action.gradient]">
              <component :is="action.icon" class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <Label :for="action.id" class="font-medium text-sm cursor-pointer">
                {{ action.label }}
              </Label>
              <p class="text-xs text-muted-foreground truncate">{{ action.description }}</p>
            </div>
            <Badge v-if="action.desktopOnly" variant="outline" class="text-[10px] shrink-0">
              Desktop
            </Badge>
          </div>
        </div>

        <DialogFooter class="gap-2 gap-x-4">
          <Button variant="outline" @click="cancelQuickActionsCustomization">
            Cancel
          </Button>
          <Button @click="saveQuickActionsCustomization"
            class="bg-linear-to-tl bg-transparent from-primary to-primary/40 hover:bg-linear-to-br"
            :disabled="tempSelectedIds.length === 0">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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

    <!-- Monthly Performance Timeline - Full Width -->
    <MonthlyPerformanceTimeline :data="monthlyPerformanceData" :max-departments="4" :visible-months="3"
      @more-click="handlePerformanceMoreClick" />

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
          <div class="flex items-center gap-4 w-full flex-wrap">
            <div v-for="zone in topZones" :key="zone.id" class="flex items-center gap-2">
              <Award class="w-4 h-4 text-amber-500" />
              <span class="text-sm font-medium">{{ zone.name }}</span>
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
          <Button variant="ghost" size="sm" class="text-muted-foreground" @click="$router.push('/activity')">
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
                    <component :is="getActivityIcon(activity.type)" class="w-4 h-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">{{ activity.title }}</p>
                    <p class="text-xs text-muted-foreground truncate">{{ activity.description }}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                      <span class="text-xs text-muted-foreground/70">{{ activity.actor }}</span>
                      <span class="text-muted-foreground/50">•</span>
                      <Clock class="w-3 h-3 text-muted-foreground/70" />
                      <span class="text-xs text-muted-foreground/70">
                        {{ formatDistanceToNow(activity.timestamp, { addSuffix: true }) }}
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

    <!-- Zone Overview Cards -->
    <Card class="border-0 bg-linear-to-br from-background via-background to-muted/20 shadow-lg">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <MapPin class="w-5 h-5 text-violet-500" />
              Zone Overview
            </CardTitle>
            <CardDescription>Performance and status across all administrative zones</CardDescription>
          </div>
          <Button variant="outline" size="sm" @click="$router.push('/zones')">
            Manage Zones
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div v-for="zone in zones" :key="zone.id"
            class="relative p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group"
            @click="$router.push(`/zones/${zone.code.toLowerCase()}`)">
            <!-- Health Indicator -->
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold text-sm">{{ zone.name }}</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span :class="['w-2.5 h-2.5 rounded-full animate-pulse', getZoneHealthColor(zone.health)]"></span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{{ getZoneHealthText(zone.health) }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <!-- Stats -->
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Teachers</span>
                <span class="font-medium">{{ zone.teacherCount.toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Schools</span>
                <span class="font-medium">{{ zone.schoolCount }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Pending</span>
                <Badge variant="secondary" :class="zone.pendingItems > 0 ? 'bg-amber-500/10 text-amber-600' : ''"
                  class="text-xs">
                  {{ zone.pendingItems }}
                </Badge>
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
              <Badge variant="outline" class="text-[10px]">{{ zone.growth }}</Badge>
              <ChevronRight
                class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- System Health and Upcoming Events -->
    <div class="grid gap-6 grid-cols-1 lg:grid-cols-3">
      <!-- System Health -->
      <Card class="border-0 order-2 lg:order-1 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Target class="w-5 h-5 text-emerald-500" />
            System Health
          </CardTitle>
          <CardDescription>Real-time performance metrics</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <template v-if="isLoading">
            <div v-for="i in 4" :key="i" class="space-y-2">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-2 w-full" />
            </div>
          </template>
          <template v-else>
            <div v-for="metric in systemHealth" :key="metric.label" class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">{{ metric.label }}</span>
                <span :class="[
                  'font-semibold',
                  getHealthTextColor(metric.value)
                ]">{{ metric.value }}%</span>
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div :class="['h-full rounded-full transition-all duration-500', getHealthColor(metric.value)]"
                  :style="{ width: `${metric.value}%` }"></div>
              </div>
            </div>
          </template>
        </CardContent>
        <CardFooter class="border-t pt-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All systems operational
          </div>
        </CardFooter>
      </Card>

      <!-- Upcoming Events -->
      <Card class="lg:col-span-2 order-1 lg:order-2 border-0 bg-linear-to-br from-background to-muted/20 shadow-lg">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="flex items-center gap-2 text-base lg:text-auto">
                <Calendar class="w-5 h-5 text-primary" />
                Upcoming Events
              </CardTitle>
              <CardDescription class="mt-1.5">Important dates and deadlines</CardDescription>
            </div>
            <Button variant="outline" size="sm" @click="$router.push('/calendar')">
              <Calendar class="w-4 h-4 mr-2" /> View Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 sm:grid-cols-2">
            <template v-if="isLoading">
              <div v-for="i in 4" :key="i" class="flex items-center gap-4 p-4 rounded-xl border border-border/50">
                <Skeleton class="h-16 w-16 rounded-xl shrink-0" />
                <div class="flex-1 space-y-2">
                  <Skeleton class="h-4 w-3/4" />
                  <Skeleton class="h-3 w-1/2" />
                </div>
              </div>
            </template>
            <template v-else>
              <div v-for="event in upcomingEvents" :key="event.id"
                class="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer group">
                <!-- Date Block -->
                <div
                  class="text-center shrink-0 p-3 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <div class="text-2xl font-bold text-primary">
                    {{ format(new Date(event.date), 'd') }}
                  </div>
                  <div class="text-xs text-muted-foreground uppercase font-medium">
                    {{ format(new Date(event.date), 'MMM') }}
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate">{{ event.title }}</p>
                  <div class="flex items-center gap-2 mt-2 pt-1">
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
            </template>
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

/* Smooth transitions for all interactive elements */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>