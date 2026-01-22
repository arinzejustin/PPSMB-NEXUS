<script setup lang="ts">
import { ref, computed, watch } from 'vue';
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
  Database,
  CloudOff,
  Cloud,
  ChevronDown,
  Building2,
  MapPin,
  UserCog,
  LogOut,
  User,
  Bell
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser, navigateTo } from '#imports';
import { logOut } from '@/composables/logout';
import { useLockWindow } from '@/composables/useLockWindow';
import type { NavItem } from "@/types"

const route = useRoute();
const user = useUser();
const { lockSession } = useLockWindow();

const isCollapsed = ref(true);
const expandedMenus = ref<string[]>([]);
const emit = defineEmits(['isCollapsed'])

// Mock sync status - in production would come from Electron
const syncStatus = ref({
  isOnline: true,
  lastSynced: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
  pendingChanges: 3
});

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/'
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
  emit("isCollapsed", isCollapsed.value)
};

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
    return route.path === item.to || route.path.startsWith(item.to);
  }
  if (item.children) {
    return item.children.some(child => child.to && route.path.startsWith(child.to));
  }
  return false;
};

const isSubmenuExpanded = (id: string): boolean => {
  return expandedMenus.value.includes(id);
};

const formatLastSynced = computed(() => {
  const diff = Date.now() - syncStatus.value.lastSynced.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return syncStatus.value.lastSynced.toLocaleDateString();
});

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

// Auto-expand menu if child is active
watch(() => route.path, () => {
  navItems.forEach(item => {
    if (item.children && isActive(item) && !expandedMenus.value.includes(item.id)) {
      expandedMenus.value.push(item.id);
    }
  });
}, { immediate: true });
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <aside :class="[
      'fixed left-0 top-0 z-40 h-screen flex flex-col bg-background shadow-md border-r border-sidebar-border transition-all duration-300',
      isCollapsed ? 'w-[70px]' : 'w-[280px]'
    ]">
      <!-- Header with Logo -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shrink-0">
          <img src="/logo.png" alt="PPSMB" class="w-8 h-8 object-contain" />
        </div>
        <div v-if="!isCollapsed" class="flex flex-col overflow-hidden">
          <span class="text-sm font-bold text-sidebar-foreground truncate">PPSMB</span>
          <span class="text-xs text-sidebar-foreground/70 truncate">File Manager</span>
        </div>
      </div>

      <!-- Sync Status Indicator -->
      <div :class="[
        'flex items-center gap-2 mx-3 my-3 px-3 py-2 rounded-lg text-xs font-medium transition-all',
        syncStatus.isOnline
          ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-600/10 text-amber-600 dark:text-amber-400'
      ]">
        <component :is="syncStatus.isOnline ? Cloud : CloudOff" class="w-4 h-4 shrink-0" />
        <template v-if="!isCollapsed">
          <div class="flex flex-col flex-1 min-w-0">
            <span class="truncate">
              {{ syncStatus.isOnline ? 'Connected' : 'Offline Mode' }}
            </span>
            <span class="text-[10px] opacity-70 truncate">
              Last sync: {{ formatLastSynced }}
            </span>
          </div>
          <Tooltip v-if="syncStatus.pendingChanges > 0">
            <TooltipTrigger>
              <div
                class="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {{ syncStatus.pendingChanges }}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{{ syncStatus.pendingChanges }} pending changes</p>
            </TooltipContent>
          </Tooltip>
        </template>
      </div>

      <!-- Navigation -->
      <ScrollArea class="flex-1 px-3">
        <nav class="space-y-1 py-2">
          <template v-for="item in navItems" :key="item.id">
            <!-- Item with children -->
            <div v-if="item.children">
              <Tooltip :disabled="!isCollapsed">
                <TooltipTrigger as-child>
                  <button @click="toggleSubmenu(item.id)" :class="[
                    'w-full flex items-center gap-3 gap-y-5 px-3 py-3 rounded-lg text-sm font-app my-2.5 font-medium transition-all group',
                    isActive(item)
                      ? 'bg-sidebar-accent'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  ]">
                    <component :is="item.icon" class="w-5 h-5 shrink-0" />
                    <span v-if="!isCollapsed" class="flex-1 text-left truncate">{{ item.label }}</span>
                    <ChevronDown v-if="!isCollapsed" :class="[
                      'w-4 h-4 transition-transform shrink-0',
                      isSubmenuExpanded(item.id) ? 'rotate-180' : ''
                    ]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent v-if="isCollapsed" side="right">
                  <p :class="isActive(item) ? 'text-white' : ''">{{ item.label }}</p>
                </TooltipContent>
              </Tooltip>

              <!-- Submenu -->
              <div v-if="!isCollapsed && isSubmenuExpanded(item.id)"
                class="mt-1 ml-4 pl-4 border-l border-sidebar-border space-y-1">
                <NuxtLink v-for="child in item.children" :key="child.id" :to="child.to!" :class="[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  route.path === child.to
                    ? 'bg-sidebar-primary text-white font-medium'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                ]">
                  <component :is="child.icon" class="w-4 h-4 shrink-0" />
                  <span class="truncate">{{ child.label }}</span>
                </NuxtLink>
              </div>
            </div>

            <!-- Regular item -->
            <Tooltip v-else :disabled="!isCollapsed">
              <TooltipTrigger as-child>
                <NuxtLink :to="item.to!" :class="[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive(item)
                    ? 'bg-sidebar-primary text-white'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                ]">
                  <component :is="item.icon" class="w-5 h-5 shrink-0" />
                  <span v-if="!isCollapsed" class="flex-1 truncate">{{ item.label }}</span>
                  <span v-if="item.badge && !isCollapsed" :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                    typeof item.badge === 'number'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-sidebar-accent text-sidebar-foreground/70'
                  ]">
                    {{ item.badge }}
                  </span>
                </NuxtLink>
              </TooltipTrigger>
              <TooltipContent v-if="isCollapsed" side="right">
                <p>{{ item.label }}</p>
                <span v-if="item.badge" class="ml-2 text-xs opacity-70">({{ item.badge }})</span>
              </TooltipContent>
            </Tooltip>
          </template>
        </nav>
      </ScrollArea>

      <!-- Bottom Section -->
      <div class="border-t border-sidebar-border p-3 space-y-2">
        <!-- Settings Link -->
        <template v-for="item in bottomNavItems" :key="item.id">
          <Tooltip :disabled="!isCollapsed">
            <TooltipTrigger as-child>
              <NuxtLink :to="item.to!" :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive(item)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              ]">
                <component :is="item.icon" class="w-5 h-5 shrink-0" />
                <span v-if="!isCollapsed" class="flex-1 truncate">{{ item.label }}</span>
              </NuxtLink>
            </TooltipTrigger>
            <TooltipContent v-if="isCollapsed" side="right">
              <p>{{ item.label }}</p>
            </TooltipContent>
          </Tooltip>
        </template>

        <Separator />
        <!-- User Profile -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button :class="[
              'w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl transition-all',
              'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            ]">
              <Avatar class="w-8 h-8 shrink-0 bg-primary/80">
                <AvatarImage :src="avatar" />
                <AvatarFallback class="text-primary-foreground text-xs">
                  {{ userInitials }}
                </AvatarFallback>
              </Avatar>
              <div v-if="!isCollapsed" class="flex-1 text-left min-w-0">
                <p class="text-sm font-medium truncate">{{ user?.name || 'User' }}</p>
                <p class="text-xs text-sidebar-foreground/50 truncate">{{ user?.role || 'Staff' }}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" :side="isCollapsed ? 'right' : 'top'" class="w-56 font-app">
            <DropdownMenuLabel class="font-app">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="navigateTo('/settings/?active=account')">
              <User class="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem @click="navigateTo('/settings/')">
              <Settings class="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem @click="navigateTo('/settings/?active=preferences')">
              <Bell class="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLock">
              <Database class="mr-2 h-4 w-4" />
              <span>Lock Screen</span>
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleLogout" class="text-destructive focus:text-destructive">
              <LogOut class="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Collapse Toggle -->
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="sm" @click="toggleCollapse" :class="[
              'w-full text-sidebar-foreground/50 hover:text-primary/90 transition-all duration-700',
              isCollapsed ? 'px-0 justify-center' : 'justify-start'
            ]">
              <component :is="isCollapsed ? ChevronRight : ChevronLeft" class="w-4 h-4" />
              <span v-if="!isCollapsed" class="ml-1">Collapse</span>
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
