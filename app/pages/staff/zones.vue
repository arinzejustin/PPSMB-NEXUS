<script setup lang="ts">
import { ref, computed } from 'vue';
import { definePageMeta } from '#imports';
import { useStaffData } from '@/composables/useStaffData';
import {
    MapPin, Users, Building2, GraduationCap, Clock, Check,
    Shield, ArrowLeft, Eye, ArrowLeftRight, ChevronRight,
    TrendingUp, UserCheck, AlertTriangle, Search, BarChart3
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

definePageMeta({ layout: 'app' });

const {
    teachers, zones, qualifications, getInitials, getStatusBadge, viewTeacher,
    initiateTransfer, showProfileSheet, selectedTeacher, profileTab
} = useStaffData();

// State
const searchQuery = ref('');
const selectedZoneDetail = ref<string | null>(null);
const showZoneSheet = ref(false);

// Zone gradients for visual appeal
const zoneGradients = [
    'from-blue-500/20 to-indigo-500/20',
    'from-emerald-500/20 to-teal-500/20',
    'from-violet-500/20 to-purple-500/20',
    'from-amber-500/20 to-orange-500/20',
    'from-rose-500/20 to-pink-500/20',
    'from-cyan-500/20 to-sky-500/20',
];

const zoneIconColors = [
    'text-blue-600 dark:text-blue-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-violet-600 dark:text-violet-400',
    'text-amber-600 dark:text-amber-400',
    'text-rose-600 dark:text-rose-400',
    'text-cyan-600 dark:text-cyan-400',
];

const zoneBarColors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
];

// Computed zone data
interface ZoneData {
    name: string;
    totalStaff: number;
    activeStaff: number;
    retiringSoon: number;
    retired: number;
    onLeave: number;
    schools: string[];
    qualificationBreakdown: Record<string, number>;
    averageYearsOfService: number;
    totalTransfers: number;
    gradientClass: string;
    iconColorClass: string;
    barColorClass: string;
}

const zoneData = computed<ZoneData[]>(() => {
    return zones.map((zone, idx) => {
        const zoneTeachers = teachers.value.filter(t => t.zone === zone);
        const schools = [...new Set(zoneTeachers.map(t => t.school))];

        const qualBreakdown: Record<string, number> = {};
        zoneTeachers.forEach(t => {
            qualBreakdown[t.qualification] = (qualBreakdown[t.qualification] || 0) + 1;
        });

        const totalYears = zoneTeachers.reduce((sum, t) => sum + t.yearsOfService, 0);
        const totalTransfers = zoneTeachers.reduce((sum, t) => sum + t.transferHistory.length, 0);

        return {
            name: zone,
            totalStaff: zoneTeachers.length,
            activeStaff: zoneTeachers.filter(t => t.serviceStatus === 'active').length,
            retiringSoon: zoneTeachers.filter(t => t.serviceStatus === 'retiring-soon').length,
            retired: zoneTeachers.filter(t => t.serviceStatus === 'retired').length,
            onLeave: zoneTeachers.filter(t => t.serviceStatus === 'on-leave').length,
            schools,
            qualificationBreakdown: qualBreakdown,
            averageYearsOfService: zoneTeachers.length > 0 ? Math.round(totalYears / zoneTeachers.length) : 0,
            totalTransfers,
            gradientClass: zoneGradients[idx % zoneGradients.length]!,
            iconColorClass: zoneIconColors[idx % zoneIconColors.length]!,
            barColorClass: zoneBarColors[idx % zoneBarColors.length]!,
        };
    });
});

const filteredZones = computed(() => {
    if (!searchQuery.value) return zoneData.value;
    const q = searchQuery.value.toLowerCase();
    return zoneData.value.filter(z =>
        z.name.toLowerCase().includes(q) ||
        z.schools.some(s => s.toLowerCase().includes(q))
    );
});

// Global summary stats
const globalStats = computed(() => ({
    totalZones: zones.length,
    totalStaff: teachers.value.length,
    totalSchools: [...new Set(teachers.value.map(t => t.school))].length,
    avgStaffPerZone: zones.length > 0 ? Math.round(teachers.value.length / zones.length) : 0,
}));

// Max staff in a zone for progress bar scaling
const maxStaffInZone = computed(() => Math.max(...zoneData.value.map(z => z.totalStaff), 1));

// Zone detail
const selectedZoneData = computed(() => {
    if (!selectedZoneDetail.value) return null;
    return zoneData.value.find(z => z.name === selectedZoneDetail.value) || null;
});

const zoneTeachers = computed(() => {
    if (!selectedZoneDetail.value) return [];
    return teachers.value.filter(t => t.zone === selectedZoneDetail.value);
});

const openZoneDetail = (zoneName: string) => {
    selectedZoneDetail.value = zoneName;
    showZoneSheet.value = true;
};
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <div class="flex items-center gap-3 mb-1">
                    <NuxtLink to="/staff/"
                        class="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <ArrowLeft class="w-5 h-5" />
                    </NuxtLink>
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-foreground">Zone Management</h1>
                        <p class="text-muted-foreground mt-0.5">
                            Overview of administrative zones, schools, and staff distribution
                        </p>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input v-model="searchQuery" placeholder="Search zones or schools..." class="pl-9 w-[250px]" />
                </div>
            </div>
        </div>

        <!-- Global Summary -->
        <div class="grid gap-4 md:grid-cols-4">
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-blue-500/20 to-indigo-500/20">
                            <MapPin class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ globalStats.totalZones }}</p>
                            <p class="text-sm text-muted-foreground">Total Zones</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/20">
                            <Users class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ globalStats.totalStaff }}</p>
                            <p class="text-sm text-muted-foreground">Total Staff</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-violet-500/20 to-purple-500/20">
                            <Building2 class="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ globalStats.totalSchools }}</p>
                            <p class="text-sm text-muted-foreground">Total Schools</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-amber-500/20 to-orange-500/20">
                            <BarChart3 class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ globalStats.avgStaffPerZone }}</p>
                            <p class="text-sm text-muted-foreground">Avg Staff/Zone</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Staff Distribution Bar Chart -->
        <Card>
            <CardContent class="pt-6">
                <h3 class="font-semibold text-lg mb-5 flex items-center gap-2">
                    <TrendingUp class="w-5 h-5 text-muted-foreground" />
                    Staff Distribution by Zone
                </h3>
                <div class="space-y-4">
                    <div v-for="(zone, idx) in zoneData" :key="zone.name"
                        class="flex items-center gap-4 group cursor-pointer" @click="openZoneDetail(zone.name)">
                        <div class="w-28 shrink-0 text-sm font-medium truncate text-right">{{ zone.name }}</div>
                        <div class="flex-1 h-10 bg-muted/50 rounded-lg overflow-hidden relative">
                            <div :class="[zone.barColorClass, 'h-full rounded-lg transition-all duration-700 ease-out relative']"
                                :style="{ width: `${Math.max((zone.totalStaff / maxStaffInZone) * 100, 8)}%` }">
                                <div
                                    class="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity">
                                </div>
                            </div>
                            <div class="absolute inset-y-0 right-3 flex items-center">
                                <span class="text-xs font-bold text-foreground/70">{{ zone.totalStaff }} staff</span>
                            </div>
                        </div>
                        <div class="w-6 shrink-0">
                            <ChevronRight
                                class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Zone Cards Grid -->
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card v-for="(zone, idx) in filteredZones" :key="zone.name"
                class="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden"
                @click="openZoneDetail(zone.name)">
                <!-- Zone gradient bar -->
                <div class="h-1.5 bg-linear-to-r" :class="zone.gradientClass.replace('from-', 'from-').replace('/20', '/60')"></div>

                <CardContent class="pt-5">
                    <!-- Zone Header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="p-2.5 rounded-xl bg-linear-to-br" :class="zone.gradientClass">
                                <MapPin class="w-5 h-5" :class="zone.iconColorClass" />
                            </div>
                            <div>
                                <h3 class="font-semibold">{{ zone.name }}</h3>
                                <p class="text-xs text-muted-foreground">{{ zone.schools.length }} school{{
                                    zone.schools.length !== 1 ? 's' : '' }}</p>
                            </div>
                        </div>
                        <ChevronRight
                            class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <Separator class="mb-4" />

                    <!-- Staff Stats Grid -->
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div class="flex items-center gap-2">
                            <Users class="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                                <p class="text-sm font-bold">{{ zone.totalStaff }}</p>
                                <p class="text-xs text-muted-foreground">Total Staff</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <UserCheck class="w-3.5 h-3.5 text-emerald-500" />
                            <div>
                                <p class="text-sm font-bold">{{ zone.activeStaff }}</p>
                                <p class="text-xs text-muted-foreground">Active</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
                            <div>
                                <p class="text-sm font-bold">{{ zone.retiringSoon }}</p>
                                <p class="text-xs text-muted-foreground">Retiring Soon</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <Clock class="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                                <p class="text-sm font-bold">{{ zone.averageYearsOfService }} yrs</p>
                                <p class="text-xs text-muted-foreground">Avg Service</p>
                            </div>
                        </div>
                    </div>

                    <!-- Schools List -->
                    <div class="space-y-1.5">
                        <p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">Schools</p>
                        <div v-for="school in zone.schools.slice(0, 3)" :key="school"
                            class="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 class="w-3 h-3 shrink-0" />
                            <span class="truncate">{{ school }}</span>
                        </div>
                        <p v-if="zone.schools.length > 3" class="text-xs text-primary font-medium">
                            +{{ zone.schools.length - 3 }} more
                        </p>
                    </div>

                    <!-- Transfer Activity -->
                    <div class="mt-4 pt-3 border-t flex items-center justify-between">
                        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ArrowLeftRight class="w-3 h-3" />
                            {{ zone.totalTransfers }} transfer{{ zone.totalTransfers !== 1 ? 's' : '' }}
                        </div>
                        <Button variant="ghost" size="sm" class="text-xs h-7 px-2"
                            @click.stop="openZoneDetail(zone.name)">
                            View Details
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <!-- Empty State -->
            <template v-if="filteredZones.length === 0">
                <div class="col-span-full text-center py-16">
                    <MapPin class="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p class="text-muted-foreground font-medium">No zones match your search</p>
                    <p class="text-sm text-muted-foreground mt-1">Try adjusting your search term</p>
                </div>
            </template>
        </div>

        <!-- Zone Detail Sheet -->
        <Sheet v-model:open="showZoneSheet">
            <SheetContent class="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle class="flex items-center gap-2">
                        <MapPin class="w-5 h-5 text-primary" />
                        {{ selectedZoneData?.name }}
                    </SheetTitle>
                    <SheetDescription>
                        Detailed zone information & staff listing
                    </SheetDescription>
                </SheetHeader>

                <div v-if="selectedZoneData" class="mt-6 space-y-6">
                    <!-- Zone Summary Stats -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 rounded-xl border bg-card">
                            <div class="flex items-center gap-2 mb-1">
                                <Users class="w-4 h-4 text-blue-500" />
                                <span class="text-xs text-muted-foreground">Total Staff</span>
                            </div>
                            <p class="text-2xl font-bold">{{ selectedZoneData.totalStaff }}</p>
                        </div>
                        <div class="p-4 rounded-xl border bg-card">
                            <div class="flex items-center gap-2 mb-1">
                                <UserCheck class="w-4 h-4 text-emerald-500" />
                                <span class="text-xs text-muted-foreground">Active</span>
                            </div>
                            <p class="text-2xl font-bold">{{ selectedZoneData.activeStaff }}</p>
                        </div>
                        <div class="p-4 rounded-xl border bg-card">
                            <div class="flex items-center gap-2 mb-1">
                                <Building2 class="w-4 h-4 text-violet-500" />
                                <span class="text-xs text-muted-foreground">Schools</span>
                            </div>
                            <p class="text-2xl font-bold">{{ selectedZoneData.schools.length }}</p>
                        </div>
                        <div class="p-4 rounded-xl border bg-card">
                            <div class="flex items-center gap-2 mb-1">
                                <Clock class="w-4 h-4 text-amber-500" />
                                <span class="text-xs text-muted-foreground">Avg Service</span>
                            </div>
                            <p class="text-2xl font-bold">{{ selectedZoneData.averageYearsOfService }} yrs</p>
                        </div>
                    </div>

                    <Separator />

                    <!-- Qualification Breakdown -->
                    <div>
                        <h4 class="font-semibold mb-3 flex items-center gap-2">
                            <GraduationCap class="w-4 h-4 text-muted-foreground" />
                            Qualification Breakdown
                        </h4>
                        <div class="space-y-3">
                            <div v-for="(count, qual) in selectedZoneData.qualificationBreakdown" :key="qual"
                                class="flex items-center gap-3">
                                <span class="w-28 text-sm font-medium truncate">{{ qual }}</span>
                                <div class="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden">
                                    <div class="h-full bg-primary/60 rounded-md transition-all duration-500"
                                        :style="{ width: `${(count / selectedZoneData.totalStaff) * 100}%` }">
                                    </div>
                                </div>
                                <span class="text-sm font-bold w-8 text-right">{{ count }}</span>
                            </div>
                            <div v-if="Object.keys(selectedZoneData.qualificationBreakdown).length === 0"
                                class="text-sm text-muted-foreground text-center py-4">
                                No qualification data available
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <!-- Schools in Zone -->
                    <div>
                        <h4 class="font-semibold mb-3 flex items-center gap-2">
                            <Building2 class="w-4 h-4 text-muted-foreground" />
                            Schools in {{ selectedZoneData.name }}
                        </h4>
                        <div class="space-y-2">
                            <div v-for="school in selectedZoneData.schools" :key="school"
                                class="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                <div class="flex items-center gap-2">
                                    <Building2 class="w-4 h-4 text-muted-foreground" />
                                    <span class="text-sm font-medium">{{ school }}</span>
                                </div>
                                <Badge variant="outline" class="text-xs">
                                    {{ teachers.filter(t => t.school === school).length }} staff
                                </Badge>
                            </div>
                            <div v-if="selectedZoneData.schools.length === 0"
                                class="text-center py-4 text-muted-foreground text-sm">
                                No schools registered in this zone
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <!-- Staff in Zone -->
                    <div>
                        <h4 class="font-semibold mb-3 flex items-center gap-2">
                            <Users class="w-4 h-4 text-muted-foreground" />
                            Staff Members ({{ zoneTeachers.length }})
                        </h4>
                        <div class="space-y-2">
                            <div v-for="teacher in zoneTeachers" :key="teacher.id"
                                class="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                                @click="viewTeacher(teacher)">
                                <div class="flex items-center gap-3">
                                    <Avatar class="w-9 h-9">
                                        <AvatarImage :src="teacher.avatar" />
                                        <AvatarFallback
                                            class="bg-linear-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
                                            {{ getInitials(teacher.name) }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p class="text-sm font-medium">{{ teacher.name }}</p>
                                        <p class="text-xs text-muted-foreground">
                                            {{ teacher.qualification }} • {{ teacher.subject }} •
                                            {{ teacher.yearsOfService }} yrs
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Badge :class="getStatusBadge(teacher.serviceStatus).color" class="text-xs">
                                        {{ getStatusBadge(teacher.serviceStatus).label }}
                                    </Badge>
                                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div v-if="zoneTeachers.length === 0"
                                class="text-center py-8 text-muted-foreground">
                                <Users class="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p class="text-sm">No staff assigned to this zone</p>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    </div>
</template>