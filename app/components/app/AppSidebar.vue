<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from '#imports';
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  BarChart3,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Cloud,
  ChevronDown,
  Building2,
  MapPin,
  UserCog,
  LogOut,
  User,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser, navigateTo } from '#imports';
import { logOut } from '@/composables/logout';
import { useLockWindow } from '@/composables/useLockWindow';
import { useSyncStatus } from '@/composables/useSyncStatus';
import { getStorage, setStorage } from "@/lib/storage"
import type { NavItem } from "@/types"

const route = useRoute();
const user = useUser();
const { lockSession } = useLockWindow();
const { status: syncStatus, formatLastSynced, statusLabel, statusColor, forceCheck } = useSyncStatus();

const isCollapsed = ref(true);
const expandedMenus = ref<string[]>([]);
const emit = defineEmits(['isCollapsed'])
const isRefreshing = ref(false);

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/dashboard'
  },
  {
    id: 'teachers',
    label: 'Teacher Management',
    icon: Users,
    children: [
      { id: 'teachers-all', label: 'All Teachers', icon: Users, to: '/staff/' },
      { id: 'teachers-new', label: 'Add Teacher', icon: UserCog, to: '/staff/new' },
      { id: 'teachers-zones', label: 'By Zone', icon: MapPin, to: '/staff/zones' },
      { id: 'teachers-schools', label: 'By School', icon: Building2, to: '/staff/schools' },
    ]
  },
  {
    id: 'mail',
    label: 'Mail & Correspondence',
    icon: Mail,
    to: '/mail/',
    badge: 5
  },
  {
    id: 'documents',
    label: 'Document Scanning',
    icon: FileText,
    to: '/documents/'
  },
  {
    id: 'reports',
    label: 'Reporting Engine',
    icon: BarChart3,
    to: '/reports/'
  },
  {
    id: 'students',
    label: 'Student Records',
    icon: GraduationCap,
    to: '/students/',
    badge: 'Soon'
  }
];

const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    to: '/settings/'
  }
];

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  setStorage("sidebarCollapsed", isCollapsed.value)
  emit("isCollapsed", isCollapsed.value)
};

defineExpose({
  toggleCollapse
})

const toggleSubmenu = (id: string) => {
  const index = expandedMenus.value.indexOf(id);
  if (index > -1) {
    expandedMenus.value.splice(index, 1);
  } else {
    expandedMenus.value.push(id);
  }
};

const isActive = (item: NavItem): boolean => {
  if (item.to) {
    return route.path === item.to;
  }
  if (item.children) {
    return item.children.some(child => child.to && route.path.startsWith(child.to));
  }
  return false;
};

const isSubmenuExpanded = (id: string): boolean => {
  return expandedMenus.value.includes(id);
};

const userInitials = computed(() => {
  if (!user.value?.name) return 'US';
  return user.value.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
});

const handleLogout = async () => {
  await logOut();
  navigateTo('/login');
};

const handleLock = () => {
  lockSession();
};

const avatar = computed(() => user.value?.avatar || "/image/avatar.png")

const handleRefreshSync = async () => {
  isRefreshing.value = true;
  await forceCheck();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 1000);
};

const connectionIcon = computed(() => {
  if (!syncStatus.value.isOnline) return WifiOff;
  switch (syncStatus.value.connectionStrength) {
    case 'excellent': return Zap;
    case 'good': return Wifi;
    case 'poor': return Cloud;
    default: return CloudOff;
  }
});

// Auto-expand menu if child is active
watch(() => route.path, () => {
  navItems.forEach(item => {
    if (item.children && isActive(item) && !expandedMenus.value.includes(item.id)) {
      expandedMenus.value.push(item.id);
    }
  });
}, { immediate: true });

onMounted(() => {
  const collapsed = getStorage<boolean>("sidebarCollapsed")
  if (collapsed !== null) {
    isCollapsed.value = Boolean(collapsed)
    emit("isCollapsed", isCollapsed.value)
  }
})
</script>

<template>
  <TooltipProvider :delay-duration="10">
    <aside :class="[
      'fixed top-0 z-40 h-screen flex flex-col bg-linear-to-b from-background via-background to-background/95 shadow-2xl border-r border-sidebar-border/50 transition-all duration-300 backdrop-blur-sm',
      isCollapsed ? 'w-0 -left-40 md:w-17.5 md:left-0' : 'w-72'
    ]">
      <div class="relative flex items-center gap-3 px-4 py-5 border-b border-sidebar-border/70">
        <div class="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none">
        </div>

        <div
          class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 shrink-0 overflow-hidden group">
          <img src="/logo.png" alt="PPSMB"
            class="w-7 h-7 object-contain group-hover:scale-110 transition-transform duration-300" />
          <div
            class="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700">
          </div>
        </div>
        <div v-if="!isCollapsed" class="flex flex-col overflow-hidden">
          <span class="text-sm font-bold text-sidebar-foreground truncate tracking-wide">PPSMB</span>
          <span class="text-xs text-sidebar-foreground/60 truncate">Staff Management System</span>
        </div>
      </div>

      <!-- Sync Status Indicator - Modern Glass Card -->
      <div class="px-3 py-3">
        <Tooltip :disabled="!isCollapsed">
          <TooltipTrigger as-child>
            <div :class="[
              'relative flex items-center gap-3 text-xs font-medium transition-all duration-300 cursor-pointer group overflow-hidden',
              statusColor.bg, statusColor.text, isCollapsed ? 'rounded-full p-3 justify-center' : 'rounded-xl px-3 py-2.5'
            ]" @click="handleRefreshSync">
              <!-- Animated Background -->
              <div
                class="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              </div>

              <!-- Connection Icon with Pulse -->
              <div class="relative shrink-0">

                <component :is="connectionIcon" :class="['w-4 h-4 transition-transform group-hover:scale-110']" />
                <!-- Live Indicator Dot -->
                <span v-if="syncStatus.isOnline"
                  :class="['absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse', statusColor.dot]"></span>
              </div>

              <template v-if="!isCollapsed">
                <div class="flex flex-col flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold truncate">{{ statusLabel }}</span>
                    <RefreshCw v-if="syncStatus.isChecking || isRefreshing" class="w-3 h-3 animate-spin opacity-90" />
                  </div>
                  <span class="text-[10px] opacity-70 truncate">
                    {{ formatLastSynced }}
                  </span>
                </div>

                <!-- Pending Changes Badge -->
                <div v-if="syncStatus.pendingChanges > 0" class="relative">
                  <Badge variant="outline"
                    class="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold h-5 px-1.5">
                    {{ syncStatus.pendingChanges }}
                  </Badge>
                  <span
                    class="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping opacity-75"></span>
                </div>
              </template>
            </div>
          </TooltipTrigger>
          <TooltipContent v-if="isCollapsed" side="right" class="max-w-xs text-white">
            <div class="flex flex-col gap-1">
              <p class="font-semibold">{{ statusLabel }}</p>
              <p class="text-xs opacity-70">Last sync: {{ formatLastSynced }}</p>
              <p v-if="syncStatus.pendingChanges > 0" class="text-xs text-amber-500">
                {{ syncStatus.pendingChanges }} pending changes
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea class="flex-1 px-3 mb-2">
        <nav class="space-y-2 py-2">
          <template v-for="item in navItems" :key="item.id">
            <!-- Item with children -->
            <div v-if="item.children">
              <Tooltip :disabled="!isCollapsed">
                <TooltipTrigger as-child>
                  <button @click="toggleSubmenu(item.id)" :class="[
                    'relative w-full flex justify-center items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden',
                    isActive(item)
                      ? 'bg-sidebar-accent/80 text-sidebar-foreground shadow-sm'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                  ]">
                    <!-- Hover Glow -->
                    <div
                      class="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity">
                    </div>

                    <div :class="[
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shrink-0',
                      isActive(item)
                        ? 'bg-primary/10 text-primary'
                        : 'group-hover:bg-sidebar-accent'
                    ]">
                      <component :is="item.icon" class="w-4.5 h-4.5" />
                    </div>
                    <span v-if="!isCollapsed" class="flex-1 text-left truncate">{{ item.label }}</span>
                    <ChevronDown v-if="!isCollapsed" :class="[
                      'w-4 h-4 transition-transform duration-300 shrink-0 opacity-60',
                      isSubmenuExpanded(item.id) ? 'rotate-180' : ''
                    ]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent v-if="isCollapsed" side="right">
                  <p :class="isActive(item) ? 'text-white' : ''">{{ item.label }}</p>
                </TooltipContent>
              </Tooltip>

              <!-- Submenu with Slide Animation -->
              <Transition enter-active-class="transition-all duration-300 ease-out"
                leave-active-class="transition-all duration-200 ease-in"
                enter-from-class="opacity-0 -translate-y-2 max-h-0" enter-to-class="opacity-100 translate-y-0 max-h-96"
                leave-from-class="opacity-100 translate-y-0 max-h-96" leave-to-class="opacity-0 -translate-y-2 max-h-0">
                <div v-if="!isCollapsed && isSubmenuExpanded(item.id)"
                  class="mt-1 ml-5 pl-4 border-l-2 border-sidebar-border/40 space-y-1 overflow-hidden">
                  <NuxtLink v-for="child in item.children" :key="child.id" :to="child.to!" :class="[
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 group/child',
                    route.path === child.to
                      ? 'bg-linear-to-r from-primary to-primary/90 text-white font-medium shadow-md shadow-primary/20'
                      : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  ]">
                    <component :is="child.icon" class="w-3.5 h-3.5 shrink-0" />
                    <span class="truncate">{{ child.label }}</span>
                  </NuxtLink>
                </div>
              </Transition>
            </div>

            <!-- Regular item -->
            <Tooltip v-else :disabled="!isCollapsed">
              <TooltipTrigger as-child>
                <NuxtLink :to="item.to!" :class="[
                  'relative flex items-center justify-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden',
                  isActive(item)
                    ? 'bg-linear-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                ]">
                  <!-- Active Glow -->
                  <div v-if="isActive(item)"
                    class="absolute inset-0 bg-linear-to-r from-white/10 via-transparent to-white/5"></div>

                  <div :class="[
                    'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shrink-0',
                    isActive(item)
                      ? 'bg-white/20'
                      : 'group-hover:bg-sidebar-accent'
                  ]">
                    <component :is="item.icon" class="w-4.5 h-4.5" />
                  </div>
                  <span v-if="!isCollapsed" class="flex-1 truncate">{{ item.label }}</span>

                  <!-- Badge -->
                  <template v-if="item.badge && !isCollapsed">
                    <Badge v-if="typeof item.badge === 'number'"
                      class="bg-red-500 text-white border-0 text-[10px] font-bold h-5 px-1.5 animate-pulse">
                      {{ item.badge }}
                    </Badge>
                    <Badge v-else variant="outline" class="text-[10px] opacity-60 border-current/30">
                      {{ item.badge }}
                    </Badge>
                  </template>
                </NuxtLink>
              </TooltipTrigger>
              <TooltipContent v-if="isCollapsed" side="right">
                <div class="flex items-center gap-2">
                  <p>{{ item.label }}</p>
                  <Badge v-if="item.badge" class="text-[10px]">{{ item.badge }}</Badge>
                </div>
              </TooltipContent>
            </Tooltip>
          </template>
        </nav>
      </ScrollArea>

      <!-- Bottom Section - Premium Glass Effect -->
      <div class="relative border-t border-sidebar-border/50 p-3 space-y-2">
        <!-- Ambient Glow -->
        <div class="absolute inset-0 bg-linear-to-t from-primary/10 via-transparent to-transparent pointer-events-none">
        </div>

        <!-- Settings Link -->
        <template v-for="item in bottomNavItems" :key="item.id">
          <Tooltip :disabled="!isCollapsed">
            <TooltipTrigger as-child>
              <NuxtLink :to="item.to!" :class="[
                'relative flex items-center justify-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden',
                isActive(item)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
              ]">
                <div :class="[
                  'flex items-center justify-center w-8 h-8 rounded-lg transition-all shrink-0',
                  isActive(item) ? 'bg-white/20' : 'group-hover:bg-sidebar-accent'
                ]">
                  <component :is="item.icon" class="w-4.5 h-4.5" />
                </div>
                <span v-if="!isCollapsed" class="flex-1 truncate">{{ item.label }}</span>
              </NuxtLink>
            </TooltipTrigger>
            <TooltipContent v-if="isCollapsed" side="right">
              <p>{{ item.label }}</p>
            </TooltipContent>
          </Tooltip>
        </template>

        <Separator class="opacity-50" />

        <!-- User Profile - Premium Card -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button :class="[
              'relative w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-300 group overflow-hidden',
              isCollapsed ? 'justify-center' : '',
              'text-sidebar-foreground/70 hover:text-sidebar-foreground'
            ]">
              <!-- Hover Glow -->
              <div
                class="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity">
              </div>

              <!-- Avatar with Online Indicator -->
              <div class="relative">
                <Avatar
                  class="w-9 h-9 shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all bg-linear-to-br from-primary to-primary/50 hover:shadow-xl duration-700">
                  <AvatarImage :src="avatar" />
                  <AvatarFallback class="text-primary-foreground text-xs font-semibold">
                    {{ userInitials }}
                  </AvatarFallback>
                </Avatar>
                <!-- Online Status Dot -->
                <span v-if="syncStatus.isOnline"
                  class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></span>
              </div>

              <div v-if="!isCollapsed" class="flex-1 text-left min-w-0">
                <p class="text-sm font-semibold truncate">{{ user?.name || 'User' }}</p>
                <p class="text-xs text-sidebar-foreground/50 truncate capitalize">{{ user?.role || 'Staff' }}</p>
              </div>

              <ChevronDown v-if="!isCollapsed"
                class="w-4 h-4 opacity-40 group-hover:opacity-70 transition-opacity shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" :side="isCollapsed ? 'right' : 'top'" class="w-60 font-app">
            <!-- User Info Header -->
            <div class="flex items-center gap-3 p-3 border-b border-border/50">
              <Avatar class="w-10 h-10 ring-2 ring-primary/20 bg-linear-to-tl from-emerald-500 to-primary/40">
                <AvatarImage :src="avatar" />
                <AvatarFallback class="text-primary-foreground text-sm font-semibold">
                  {{ userInitials }}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate">{{ user?.name || 'User' }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ user?.email || 'user@example.com' }}</p>
              </div>
            </div>

            <div class="p-1">
              <DropdownMenuItem @click="navigateTo('/settings/?active=account')" class="rounded-lg cursor-pointer">
                <User class="mr-2 h-4 w-4 opacity-70" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem @click="navigateTo('/settings/')" class="rounded-lg cursor-pointer">
                <Settings class="mr-2 h-4 w-4 opacity-70" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem @click="navigateTo('/settings/?active=preferences')" class="rounded-lg cursor-pointer">
                <Bell class="mr-2 h-4 w-4 opacity-70" />
                <span>Notifications</span>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator />

            <div class="p-1">
              <DropdownMenuItem @click="handleLock" class="rounded-lg cursor-pointer">
                <svg class="mr-2 h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Lock Screen</span>
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleLogout"
                class="rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut class="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Collapse Toggle - Sleek Button -->
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="sm" @click="toggleCollapse" :class="[
              'w-full text-sidebar-foreground/60 hover:text-primary transition-all duration-300 rounded-lg mt-3',
              isCollapsed ? 'px-0 justify-center' : 'justify-start'
            ]">
              <div
                class="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
                <component :is="isCollapsed ? ChevronRight : ChevronLeft" class="w-4 h-4" />
              </div>
              <span v-if="!isCollapsed" class="ml-1 text-xs">Collapse</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent v-if="isCollapsed" side="right">
            <p>Expand Sidebar</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  </TooltipProvider>
</template>
