<script setup lang="ts">
import { computed } from 'vue';
import { definePageMeta, navigateTo, useRuntimeConfig, useHead } from '#imports';
import { useStaffData, type ViewMode } from '@/composables/useStaffData';
import {
    Search, Download, Plus, MoreHorizontal, Eye, ArrowLeftRight,
    Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    SortAsc, SortDesc, X, MapPin, Building2, GraduationCap, Calendar,
    Phone, Mail, User, Clock, Check, LayoutGrid, LayoutList,
    Banknote, History, Landmark, CreditCard, Shield
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

definePageMeta({ layout: 'app', middleware: ['user-validate'] });

const env = useRuntimeConfig();
const isDesktop = computed(() => env.public.appType === 'desktop');

useHead({
    title: isDesktop ? "PPSMB File Manager" : "PPSMB File Manager - Staff View"
})

const {
    viewMode, searchQuery, selectedZone, selectedStatus, selectedQualification,
    currentPage, pageSize, selectedRows, sortColumn, sortDirection,
    showProfileSheet, selectedTeacher, profileTab,
    showBankDialog, bankForm,
    teachers, filteredTeachers, paginatedTeachers, totalPages, stats,
    zones, qualifications, serviceStatuses, nigerianBanks,
    toggleSort, toggleSelectAll, toggleSelectRow, viewTeacher,
    clearFilters, hasActiveFilters, getStatusBadge, getInitials, getYearsUntilRetirement,
    addBankRecord, deleteTeacher,
} = useStaffData();
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Staff Management</h1>
                <p class="text-muted-foreground mt-1">
                    Manage teacher profiles, transfers, and records
                </p>
            </div>
            <div class="flex items-center gap-2">
                <!-- View Toggle -->
                <div class="flex items-center bg-muted rounded-lg p-1">
                    <Button :variant="viewMode === 'list' ? 'default' : 'ghost'" size="sm" class="h-8 px-3 rounded-md"
                        @click="viewMode = 'list'">
                        <LayoutList class="w-4 h-4" />
                    </Button>
                    <Button :variant="viewMode === 'grid' ? 'default' : 'ghost'" size="sm" class="h-8 px-3 rounded-md"
                        @click="viewMode = 'grid'">
                        <LayoutGrid class="w-4 h-4" />
                    </Button>
                </div>
                <Button variant="outline" size="sm">
                    <Download class="w-4 h-4 mr-2" />
                    Export
                </Button>
                <NuxtLink to="/staff/new">
                    <Button size="sm">
                        <Plus class="w-4 h-4 mr-2" />
                        Add Teacher
                    </Button>
                </NuxtLink>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid gap-4 md:grid-cols-4">
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-blue-500/20 to-indigo-500/20">
                            <User class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ stats.total }}</p>
                            <p class="text-sm text-muted-foreground">Total Staff</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/20">
                            <Check class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ stats.active }}</p>
                            <p class="text-sm text-muted-foreground">Active in Service</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-amber-500/20 to-orange-500/20">
                            <Clock class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ stats.retiringSoon }}</p>
                            <p class="text-sm text-muted-foreground">Retiring Soon</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-slate-500/20 to-gray-500/20">
                            <Shield class="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ stats.retired }}</p>
                            <p class="text-sm text-muted-foreground">Retired</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Filters and Search -->
        <Card>
            <CardContent class="pt-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex flex-1 items-center gap-2 flex-wrap">
                        <div class="relative flex-1 min-w-[200px] max-w-sm">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input v-model="searchQuery" placeholder="Search by name, ID, email..." class="pl-9" />
                        </div>
                        <Select v-model="selectedZone">
                            <SelectTrigger class="w-[150px]">
                                <SelectValue placeholder="All Zones" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="zone in zones" :key="zone" :value="zone">
                                    {{ zone }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select v-model="selectedStatus">
                            <SelectTrigger class="w-[160px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="status in serviceStatuses" :key="status.value" :value="status.value">
                                    {{ status.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select v-model="selectedQualification">
                            <SelectTrigger class="w-[160px]">
                                <SelectValue placeholder="Qualification" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="qual in qualifications" :key="qual" :value="qual">
                                    {{ qual }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button v-if="hasActiveFilters" variant="ghost" size="sm" @click="clearFilters">
                            <X class="w-4 h-4 mr-1" />
                            Clear
                        </Button>
                        <span class="text-sm text-muted-foreground whitespace-nowrap">
                            {{ filteredTeachers.length }} of {{ teachers.length }} staff
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- LIST VIEW -->
        <Card v-if="viewMode === 'list'">
            <CardContent class="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead class="w-12">
                                <Checkbox
                                    :checked="selectedRows.length === paginatedTeachers.length && paginatedTeachers.length > 0"
                                    @update:checked="toggleSelectAll" />
                            </TableHead>
                            <TableHead class="cursor-pointer" @click="toggleSort('name')">
                                <div class="flex items-center gap-1">
                                    Teacher
                                    <component
                                        :is="sortColumn === 'name' ? (sortDirection === 'asc' ? SortAsc : SortDesc) : SortAsc"
                                        class="w-4 h-4 opacity-50" />
                                </div>
                            </TableHead>
                            <TableHead>Zone / School</TableHead>
                            <TableHead>Qualification</TableHead>
                            <TableHead>Service Status</TableHead>
                            <TableHead>Years</TableHead>
                            <TableHead class="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-for="teacher in paginatedTeachers" :key="teacher.id"
                            class="cursor-pointer hover:bg-muted/50 transition-colors" @click="viewTeacher(teacher)">
                            <TableCell @click.stop>
                                <Checkbox :checked="selectedRows.includes(teacher.id)"
                                    @update:checked="toggleSelectRow(teacher.id)" />
                            </TableCell>
                            <TableCell>
                                <div class="flex items-center gap-3">
                                    <Avatar class="w-10 h-10">
                                        <AvatarImage :src="teacher.avatar" />
                                        <AvatarFallback
                                            class="bg-linear-to-br from-primary/80 to-primary text-primary-foreground text-sm font-medium">
                                            {{ getInitials(teacher.name) }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p class="font-medium">{{ teacher.name }}</p>
                                        <p class="text-sm text-muted-foreground">{{ teacher.id }}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium flex items-center gap-1">
                                        <MapPin class="w-3 h-3" />
                                        {{ teacher.zone }}
                                    </span>
                                    <span class="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {{ teacher.school }}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium">{{ teacher.qualification }}</span>
                                    <span class="text-xs text-muted-foreground">{{ teacher.subject }}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge :class="getStatusBadge(teacher.serviceStatus).color">
                                    {{ getStatusBadge(teacher.serviceStatus).label }}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <span class="text-sm">{{ teacher.yearsOfService }} yrs</span>
                            </TableCell>
                            <TableCell @click.stop>
                                <DropdownMenu>
                                    <DropdownMenuTrigger as-child>
                                        <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                                            <MoreHorizontal class="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem @click="viewTeacher(teacher)">
                                            <Eye class="w-4 h-4 mr-2" />View Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem @click="navigateTo('/staff/transfers')">
                                            <ArrowLeftRight class="w-4 h-4 mr-2" />Initiate Transfer
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem class="text-destructive" @click="deleteTeacher(teacher.id)">
                                            <Trash2 class="w-4 h-4 mr-2" />Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <!-- Pagination -->
                <div class="flex items-center justify-between px-6 py-4 border-t">
                    <div class="text-sm text-muted-foreground">
                        Showing {{ (currentPage - 1) * pageSize + 1 }} to
                        {{ Math.min(currentPage * pageSize, filteredTeachers.length) }} of
                        {{ filteredTeachers.length }}
                    </div>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" size="sm" :disabled="currentPage === 1" @click="currentPage = 1">
                            <ChevronsLeft class="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" :disabled="currentPage === 1" @click="currentPage--">
                            <ChevronLeft class="w-4 h-4" />
                        </Button>
                        <span class="text-sm px-3">Page {{ currentPage }} of {{ totalPages }}</span>
                        <Button variant="outline" size="sm" :disabled="currentPage === totalPages"
                            @click="currentPage++">
                            <ChevronRight class="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" :disabled="currentPage === totalPages"
                            @click="currentPage = totalPages">
                            <ChevronsRight class="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- GRID VIEW -->
        <div v-if="viewMode === 'grid'">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card v-for="teacher in paginatedTeachers" :key="teacher.id"
                    class="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden"
                    @click="viewTeacher(teacher)">
                    <!-- Card linear top bar -->
                    <div class="h-1.5 bg-linear-to-r from-primary/60 to-primary/20"></div>
                    <CardContent class="pt-5">
                        <div class="flex flex-col items-center text-center gap-3">
                            <Avatar class="w-16 h-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                                <AvatarImage :src="teacher.avatar" />
                                <AvatarFallback
                                    class="bg-linear-to-br from-primary/80 to-primary text-primary-foreground text-lg font-semibold">
                                    {{ getInitials(teacher.name) }}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 class="font-semibold text-sm leading-tight">{{ teacher.name }}</h3>
                                <p class="text-xs text-muted-foreground mt-0.5">{{ teacher.id }} •
                                    {{ teacher.gradeLevel }}</p>
                            </div>
                            <Badge :class="getStatusBadge(teacher.serviceStatus).color" class="text-xs">
                                {{ getStatusBadge(teacher.serviceStatus).label }}
                            </Badge>
                        </div>

                        <Separator class="my-4" />

                        <div class="space-y-2.5 text-sm">
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <MapPin class="w-3.5 h-3.5 shrink-0" />
                                <span class="truncate">{{ teacher.zone }}</span>
                            </div>
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <Building2 class="w-3.5 h-3.5 shrink-0" />
                                <span class="truncate">{{ teacher.school }}</span>
                            </div>
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <GraduationCap class="w-3.5 h-3.5 shrink-0" />
                                <span>{{ teacher.qualification }} — {{ teacher.subject }}</span>
                            </div>
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <Clock class="w-3.5 h-3.5 shrink-0" />
                                <span>{{ teacher.yearsOfService }} years in service</span>
                            </div>
                        </div>

                        <!-- Card Actions -->
                        <div class="flex gap-2 mt-4 pt-3 border-t">
                            <Button variant="outline" size="sm" class="flex-1 text-xs h-8"
                                @click.stop="viewTeacher(teacher)">
                                <Eye class="w-3 h-3 mr-1" />
                                View
                            </Button>
                            <Button variant="outline" size="sm" class="flex-1 text-xs h-8"
                                @click.stop="navigateTo('/staff/transfers')">
                                <ArrowLeftRight class="w-3 h-3 mr-1" />
                                Transfer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Grid Pagination -->
            <div class="flex items-center justify-between mt-4">
                <span class="text-sm text-muted-foreground">
                    Showing {{ (currentPage - 1) * pageSize + 1 }} to
                    {{ Math.min(currentPage * pageSize, filteredTeachers.length) }} of
                    {{ filteredTeachers.length }}
                </span>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" :disabled="currentPage === 1" @click="currentPage--">
                        <ChevronLeft class="w-4 h-4 mr-1" /> Prev
                    </Button>
                    <span class="text-sm px-2">{{ currentPage }} / {{ totalPages }}</span>
                    <Button variant="outline" size="sm" :disabled="currentPage === totalPages" @click="currentPage++">
                        Next
                        <ChevronRight class="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Teacher Profile Sheet -->
        <Sheet v-model:open="showProfileSheet">
            <SheetContent class="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Staff Profile</SheetTitle>
                    <SheetDescription>Complete staff information and records</SheetDescription>
                </SheetHeader>

                <div v-if="selectedTeacher" class="mt-6 space-y-6">
                    <!-- Profile Header -->
                    <div class="flex items-center gap-4">
                        <Avatar class="w-20 h-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                            <AvatarImage :src="selectedTeacher.avatar" />
                            <AvatarFallback
                                class="bg-linear-to-br from-primary/80 to-primary text-primary-foreground text-xl font-semibold">
                                {{ getInitials(selectedTeacher.name) }}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 class="text-xl font-semibold">{{ selectedTeacher.name }}</h3>
                            <p class="text-muted-foreground">{{ selectedTeacher.id }} • {{ selectedTeacher.gradeLevel }}
                            </p>
                            <Badge :class="getStatusBadge(selectedTeacher.serviceStatus).color" class="mt-2">
                                {{ getStatusBadge(selectedTeacher.serviceStatus).label }}
                            </Badge>
                        </div>
                    </div>

                    <Separator />

                    <!-- Tabbed Content -->
                    <Tabs v-model="profileTab" class="w-full">
                        <TabsList class="grid w-full grid-cols-4">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="employment">Employment</TabsTrigger>
                            <TabsTrigger value="transfers">Transfers</TabsTrigger>
                            <TabsTrigger value="bank">Bank</TabsTrigger>
                        </TabsList>

                        <!-- Personal Tab -->
                        <TabsContent value="personal" class="space-y-4 mt-4">
                            <div class="grid gap-4">
                                <div class="flex items-center gap-3">
                                    <Mail class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Email</p>
                                        <p class="font-medium">{{ selectedTeacher.email }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <Phone class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Phone</p>
                                        <p class="font-medium">{{ selectedTeacher.phone }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <User class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Gender</p>
                                        <p class="font-medium">{{ selectedTeacher.gender }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <Calendar class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Date of Birth</p>
                                        <p class="font-medium">
                                            {{ format(new Date(selectedTeacher.dateOfBirth), 'MMMM d, yyyy') }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <!-- Employment Tab -->
                        <TabsContent value="employment" class="space-y-4 mt-4">
                            <div class="grid gap-4">
                                <div class="flex items-center gap-3">
                                    <MapPin class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Zone</p>
                                        <p class="font-medium">{{ selectedTeacher.zone }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <Building2 class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">School</p>
                                        <p class="font-medium">{{ selectedTeacher.school }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <GraduationCap class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Qualification</p>
                                        <p class="font-medium">{{ selectedTeacher.qualification }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <Clock class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Years of Service</p>
                                        <p class="font-medium">{{ selectedTeacher.yearsOfService }} years (Since
                                            {{ format(new Date(selectedTeacher.employmentDate), 'yyyy') }})</p>
                                    </div>
                                </div>
                                <!-- Retirement Info -->
                                <div v-if="selectedTeacher.retirementDate" class="p-4 rounded-lg border bg-muted/30">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <p class="text-sm text-muted-foreground">Retirement Date</p>
                                            <p class="font-medium">
                                                {{ format(new Date(selectedTeacher.retirementDate), 'MMMM d, yyyy') }}
                                            </p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-sm text-muted-foreground">Time Until Retirement</p>
                                            <p class="font-semibold text-primary">
                                                {{ getYearsUntilRetirement(selectedTeacher.retirementDate) }} years
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <!-- Transfers Tab -->
                        <TabsContent value="transfers" class="space-y-4 mt-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-semibold flex items-center gap-2">
                                    <History class="w-4 h-4" />
                                    Transfer History
                                </h4>
                                <NuxtLink to="/staff/transfers">
                                    <Button size="sm" variant="outline">
                                        <Plus class="w-3 h-3 mr-1" /> New Transfer
                                    </Button>
                                </NuxtLink>
                            </div>
                            <div v-if="selectedTeacher.transferHistory.length === 0"
                                class="text-center py-8 text-muted-foreground">
                                <ArrowLeftRight class="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p>No transfer records</p>
                            </div>
                            <div v-else class="space-y-3">
                                <div v-for="transfer in selectedTeacher.transferHistory" :key="transfer.id"
                                    class="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                    <div class="flex items-start justify-between mb-2">
                                        <Badge :class="transfer.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : transfer.status === 'pending'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'">
                                            {{ transfer.status }}
                                        </Badge>
                                        <span class="text-xs text-muted-foreground">
                                            {{ format(new Date(transfer.transferDate), 'MMM d, yyyy') }}
                                        </span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 text-sm mt-3">
                                        <div>
                                            <p class="text-xs text-muted-foreground">From</p>
                                            <p class="font-medium">{{ transfer.fromSchool }}</p>
                                            <p class="text-xs text-muted-foreground">{{ transfer.fromZone }}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-muted-foreground">To</p>
                                            <p class="font-medium">{{ transfer.toSchool }}</p>
                                            <p class="text-xs text-muted-foreground">{{ transfer.toZone }}</p>
                                        </div>
                                    </div>
                                    <p class="text-xs text-muted-foreground mt-2">
                                        Reason: {{ transfer.reason }} • Approved by: {{ transfer.approvedBy }}
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        <!-- Bank Tab -->
                        <TabsContent value="bank" class="space-y-4 mt-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-semibold flex items-center gap-2">
                                    <Landmark class="w-4 h-4" />
                                    Payee Account Records
                                </h4>
                                <Button size="sm" variant="outline" @click="showBankDialog = true">
                                    <Plus class="w-3 h-3 mr-1" /> Add Account
                                </Button>
                            </div>
                            <div v-if="selectedTeacher.bankRecords.length === 0"
                                class="text-center py-8 text-muted-foreground">
                                <CreditCard class="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p>No bank records on file</p>
                            </div>
                            <div v-else class="space-y-3">
                                <div v-for="bank in selectedTeacher.bankRecords" :key="bank.id"
                                    class="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                                    :class="{ 'border-primary/40 bg-primary/5': bank.isCurrent }">
                                    <div class="flex items-start justify-between">
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <p class="font-semibold">{{ bank.bankName }}</p>
                                                <Badge v-if="bank.isCurrent" class="bg-primary/10 text-primary text-xs">
                                                    Current
                                                </Badge>
                                            </div>
                                            <p class="text-sm text-muted-foreground mt-1">{{ bank.accountName }}</p>
                                            <p class="font-mono text-sm mt-1">{{ bank.accountNumber }}</p>
                                        </div>
                                        <span class="text-xs text-muted-foreground">
                                            Added {{ format(new Date(bank.dateAdded), 'MMM d, yyyy') }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Separator />

                    <!-- Actions -->
                    <div class="flex gap-2">
                        <NuxtLink to="/staff/transfers" class="flex-1">
                            <Button class="w-full">
                                <ArrowLeftRight class="w-4 h-4 mr-2" />
                                Initiate Transfer
                            </Button>
                        </NuxtLink>
                        <Button variant="outline" class="flex-1" @click="showBankDialog = true; profileTab = 'bank'">
                            <Banknote class="w-4 h-4 mr-2" />
                            Update Account
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>

        <!-- Transfer Dialog and Add Teacher Dialog have been moved to dedicated pages -->

        <!-- Bank Account Dialog -->
        <Dialog v-model:open="showBankDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Bank Account</DialogTitle>
                    <DialogDescription>
                        Add a new payee account for {{ selectedTeacher?.name }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div>
                        <Label>Bank Name</Label>
                        <Select v-model="bankForm.bankName">
                            <SelectTrigger class="mt-1">
                                <SelectValue placeholder="Select bank" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="bank in nigerianBanks" :key="bank" :value="bank">
                                    {{ bank }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Account Number</Label>
                        <Input v-model="bankForm.accountNumber" placeholder="10-digit account number" maxlength="10"
                            class="mt-1 font-mono" />
                    </div>
                    <div>
                        <Label>Account Name</Label>
                        <Input v-model="bankForm.accountName" placeholder="Account holder name" class="mt-1" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showBankDialog = false">Cancel</Button>
                    <Button @click="addBankRecord"
                        :disabled="!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName">
                        <Landmark class="w-4 h-4 mr-2" /> Save Account
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>