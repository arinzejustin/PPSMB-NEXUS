<script setup lang="ts">
import { ref, computed } from 'vue';
import { definePageMeta, useRuntimeConfig } from '#imports';
import { useStaffData } from '@/composables/useStaffData';
import {
    ArrowLeftRight, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    FileText, Plus, MapPin, Building2, Calendar, Clock, User,
    Check, X, AlertTriangle, ArrowLeft, Filter, Download, Eye,
    CheckCircle2, XCircle, Loader2
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

definePageMeta({ layout: 'app' });

const {
    teachers, filteredTeachers, selectedTeacher,
    showTransferDialog, transferStep, transferDestination, transferReason,
    zones, transferSchools,
    initiateTransfer, submitTransfer, getInitials, getStatusBadge
} = useStaffData();

// Local state
const searchQuery = ref('');
const statusFilter = ref('all');
const zoneFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

// Compute all transfer records across all teachers
interface FlatTransfer {
    teacherId: string;
    teacherName: string;
    teacherAvatar: string;
    transferId: string;
    fromSchool: string;
    fromZone: string;
    toSchool: string;
    toZone: string;
    reason: string;
    transferDate: string;
    approvedBy: string;
    status: 'completed' | 'pending' | 'rejected';
}

const allTransfers = computed<FlatTransfer[]>(() => {
    const transfers: FlatTransfer[] = [];
    teachers.value.forEach(teacher => {
        teacher.transferHistory.forEach(t => {
            transfers.push({
                teacherId: teacher.id,
                teacherName: teacher.name,
                teacherAvatar: teacher.avatar,
                transferId: t.id,
                fromSchool: t.fromSchool,
                fromZone: t.fromZone,
                toSchool: t.toSchool,
                toZone: t.toZone,
                reason: t.reason,
                transferDate: t.transferDate,
                approvedBy: t.approvedBy,
                status: t.status,
            });
        });
    });
    // Sort by date descending
    transfers.sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime());
    return transfers;
});

const filteredTransfers = computed(() => {
    let result = [...allTransfers.value];

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        result = result.filter(t =>
            t.teacherName.toLowerCase().includes(q) ||
            t.fromSchool.toLowerCase().includes(q) ||
            t.toSchool.toLowerCase().includes(q) ||
            t.reason.toLowerCase().includes(q)
        );
    }

    if (statusFilter.value !== 'all') {
        result = result.filter(t => t.status === statusFilter.value);
    }

    if (zoneFilter.value) {
        result = result.filter(t => t.fromZone === zoneFilter.value || t.toZone === zoneFilter.value);
    }

    return result;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTransfers.value.length / pageSize.value)));
const paginatedTransfers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredTransfers.value.slice(start, start + pageSize.value);
});

// Stats
const transferStats = computed(() => ({
    total: allTransfers.value.length,
    completed: allTransfers.value.filter(t => t.status === 'completed').length,
    pending: allTransfers.value.filter(t => t.status === 'pending').length,
    rejected: allTransfers.value.filter(t => t.status === 'rejected').length,
}));

const getTransferStatusConfig = (status: string) => {
    switch (status) {
        case 'completed':
            return {
                label: 'Completed',
                color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                icon: CheckCircle2,
            };
        case 'pending':
            return {
                label: 'Pending',
                color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                icon: Loader2,
            };
        case 'rejected':
            return {
                label: 'Rejected',
                color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                icon: XCircle,
            };
        default:
            return {
                label: status,
                color: 'bg-gray-100 text-gray-700',
                icon: AlertTriangle,
            };
    }
};

// New Transfer flow
const showNewTransferPicker = ref(false);
const newTransferSearch = ref('');

const teachersForTransfer = computed(() => {
    if (!newTransferSearch.value) return teachers.value.filter(t => t.serviceStatus === 'active');
    const q = newTransferSearch.value.toLowerCase();
    return teachers.value.filter(t =>
        t.serviceStatus === 'active' &&
        (t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.school.toLowerCase().includes(q))
    );
});

const startTransferForTeacher = (teacher: any) => {
    showNewTransferPicker.value = false;
    newTransferSearch.value = '';
    initiateTransfer(teacher);
};

const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = 'all';
    zoneFilter.value = '';
    currentPage.value = 1;
};

const hasActiveFilters = computed(() => searchQuery.value || statusFilter.value !== 'all' || zoneFilter.value);
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
                        <h1 class="text-2xl font-bold tracking-tight text-foreground">Transfer Management</h1>
                        <p class="text-muted-foreground mt-0.5">
                            Track and manage teacher transfer requests and history
                        </p>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm">
                    <Download class="w-4 h-4 mr-2" />
                    Export
                </Button>
                <Button size="sm" @click="showNewTransferPicker = true">
                    <Plus class="w-4 h-4 mr-2" />
                    New Transfer
                </Button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid gap-4 md:grid-cols-4">
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-blue-500/20 to-indigo-500/20">
                            <ArrowLeftRight class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ transferStats.total }}</p>
                            <p class="text-sm text-muted-foreground">Total Transfers</p>
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
                            <p class="text-2xl font-bold">{{ transferStats.completed }}</p>
                            <p class="text-sm text-muted-foreground">Completed</p>
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
                            <p class="text-2xl font-bold">{{ transferStats.pending }}</p>
                            <p class="text-sm text-muted-foreground">Pending</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="overflow-hidden">
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-linear-to-br from-red-500/20 to-rose-500/20">
                            <XCircle class="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ transferStats.rejected }}</p>
                            <p class="text-sm text-muted-foreground">Rejected</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Filters -->
        <Card>
            <CardContent class="pt-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex flex-1 items-center gap-2 flex-wrap">
                        <div class="relative flex-1 min-w-[200px] max-w-sm">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input v-model="searchQuery" placeholder="Search transfers..." class="pl-9" />
                        </div>
                        <Select v-model="statusFilter">
                            <SelectTrigger class="w-[150px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select v-model="zoneFilter">
                            <SelectTrigger class="w-[150px]">
                                <SelectValue placeholder="All Zones" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem :value="null" disabled>All Zones</SelectItem>
                                <SelectItem v-for="zone in zones" :key="zone" :value="zone">
                                    {{ zone }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button v-if="hasActiveFilters" variant="ghost" size="sm" @click="clearFilters">
                            <X class="w-4 h-4 mr-1" /> Clear
                        </Button>
                        <span class="text-sm text-muted-foreground whitespace-nowrap">
                            {{ filteredTransfers.length }} of {{ allTransfers.length }} transfers
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Transfer Records Table -->
        <Card>
            <CardContent class="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Teacher</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Approved By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-if="paginatedTransfers.length === 0">
                            <TableCell :colspan="7" class="text-center py-12">
                                <ArrowLeftRight class="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                                <p class="text-muted-foreground font-medium">No transfer records found</p>
                                <p class="text-sm text-muted-foreground mt-1">
                                    {{ hasActiveFilters ? 'Try adjusting your filters.' : 'Transfer records will appear here.' }}
                                </p>
                            </TableCell>
                        </TableRow>
                        <TableRow v-for="transfer in paginatedTransfers" :key="transfer.transferId"
                            class="hover:bg-muted/50 transition-colors">
                            <TableCell>
                                <div class="flex items-center gap-3">
                                    <Avatar class="w-8 h-8">
                                        <AvatarImage :src="transfer.teacherAvatar" />
                                        <AvatarFallback
                                            class="bg-linear-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
                                            {{ getInitials(transfer.teacherName) }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p class="font-medium text-sm">{{ transfer.teacherName }}</p>
                                        <p class="text-xs text-muted-foreground">{{ transfer.teacherId }}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium">{{ transfer.fromSchool }}</span>
                                    <span class="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin class="w-3 h-3" /> {{ transfer.fromZone }}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium">{{ transfer.toSchool }}</span>
                                    <span class="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin class="w-3 h-3" /> {{ transfer.toZone }}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span class="text-sm">
                                    {{ format(new Date(transfer.transferDate), 'MMM d, yyyy') }}
                                </span>
                            </TableCell>
                            <TableCell>
                                <span class="text-sm text-muted-foreground max-w-[180px] truncate block">
                                    {{ transfer.reason }}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Badge :class="getTransferStatusConfig(transfer.status).color">
                                    {{ getTransferStatusConfig(transfer.status).label }}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <span class="text-sm text-muted-foreground">{{ transfer.approvedBy }}</span>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <!-- Pagination -->
                <div v-if="filteredTransfers.length > 0" class="flex items-center justify-between px-6 py-4 border-t">
                    <div class="text-sm text-muted-foreground">
                        Showing {{ (currentPage - 1) * pageSize + 1 }} to
                        {{ Math.min(currentPage * pageSize, filteredTransfers.length) }} of
                        {{ filteredTransfers.length }}
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

        <!-- Recent Transfer Timeline -->
        <Card v-if="allTransfers.length > 0">
            <CardContent class="pt-6">
                <h3 class="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Clock class="w-5 h-5 text-muted-foreground" />
                    Recent Transfer Timeline
                </h3>
                <div class="relative pl-8 space-y-6">
                    <!-- Timeline Line -->
                    <div class="absolute left-3 top-2 bottom-2 w-0.5 bg-border"></div>

                    <div v-for="(transfer, idx) in allTransfers.slice(0, 5)" :key="transfer.transferId"
                        class="relative">
                        <!-- Timeline Dot -->
                        <div :class="[
                            'absolute -left-5 top-1 w-4 h-4 rounded-full border-2 border-background',
                            transfer.status === 'completed' ? 'bg-emerald-500' :
                                transfer.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                        ]"></div>

                        <div class="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                            <div class="flex items-start justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <Avatar class="w-8 h-8">
                                        <AvatarImage :src="transfer.teacherAvatar" />
                                        <AvatarFallback
                                            class="bg-linear-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                                            {{ getInitials(transfer.teacherName) }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p class="font-medium text-sm">{{ transfer.teacherName }}</p>
                                        <p class="text-xs text-muted-foreground">{{ transfer.reason }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Badge :class="getTransferStatusConfig(transfer.status).color" class="text-xs">
                                        {{ getTransferStatusConfig(transfer.status).label }}
                                    </Badge>
                                    <span class="text-xs text-muted-foreground">
                                        {{ format(new Date(transfer.transferDate), 'MMM d, yyyy') }}
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 text-sm mt-3">
                                <div class="flex items-center gap-1.5 text-muted-foreground">
                                    <Building2 class="w-3.5 h-3.5" />
                                    <span class="truncate max-w-[180px]">{{ transfer.fromSchool }}</span>
                                </div>
                                <ArrowLeftRight class="w-4 h-4 text-primary shrink-0" />
                                <div class="flex items-center gap-1.5 text-muted-foreground">
                                    <Building2 class="w-3.5 h-3.5" />
                                    <span class="truncate max-w-[180px]">{{ transfer.toSchool }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Select Teacher for Transfer Dialog -->
        <Dialog v-model:open="showNewTransferPicker">
            <DialogContent class="sm:max-w-lg max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select Teacher for Transfer</DialogTitle>
                    <DialogDescription>
                        Choose an active teacher to initiate a transfer request
                    </DialogDescription>
                </DialogHeader>

                <div class="relative mb-4">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input v-model="newTransferSearch" placeholder="Search by name, ID, or school..." class="pl-9" />
                </div>

                <div class="space-y-2 max-h-[400px] overflow-y-auto">
                    <div v-for="teacher in teachersForTransfer" :key="teacher.id"
                        class="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 cursor-pointer transition-colors"
                        @click="startTransferForTeacher(teacher)">
                        <div class="flex items-center gap-3">
                            <Avatar class="w-10 h-10">
                                <AvatarImage :src="teacher.avatar" />
                                <AvatarFallback
                                    class="bg-linear-to-br from-primary/80 to-primary text-primary-foreground text-sm font-medium">
                                    {{ getInitials(teacher.name) }}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p class="font-medium text-sm">{{ teacher.name }}</p>
                                <p class="text-xs text-muted-foreground">{{ teacher.school }} • {{ teacher.zone }}</p>
                            </div>
                        </div>
                        <ArrowLeftRight class="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div v-if="teachersForTransfer.length === 0" class="text-center py-8 text-muted-foreground">
                        <User class="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p class="text-sm">No matching teachers found</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <!-- Transfer Dialog (reused from composable) -->
        <Dialog v-model:open="showTransferDialog">
            <DialogContent class="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Initiate Transfer Request</DialogTitle>
                    <DialogDescription>
                        Transfer {{ selectedTeacher?.name }} to a new school
                    </DialogDescription>
                </DialogHeader>

                <!-- Step Indicators -->
                <div class="flex items-center justify-center gap-2 py-4">
                    <div v-for="step in 3" :key="step" class="flex items-center gap-2">
                        <div :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                            transferStep >= step
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                        ]">
                            {{ step }}
                        </div>
                        <div v-if="step < 3" class="w-12 h-0.5 bg-muted" :class="{ 'bg-primary': transferStep > step }">
                        </div>
                    </div>
                </div>

                <div v-if="transferStep === 1" class="space-y-4">
                    <div>
                        <Label>Destination School</Label>
                        <Select v-model="transferDestination">
                            <SelectTrigger class="mt-2">
                                <SelectValue placeholder="Select destination school" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="school in transferSchools" :key="school" :value="school">
                                    {{ school }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Reason for Transfer</Label>
                        <Input v-model="transferReason" placeholder="Enter transfer reason" class="mt-2" />
                    </div>
                </div>

                <div v-if="transferStep === 2" class="space-y-4">
                    <p class="text-sm text-muted-foreground">Attach supporting documents for this transfer.</p>
                    <div class="border-2 border-dashed rounded-lg p-8 text-center">
                        <FileText class="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p class="text-sm text-muted-foreground">Drag and drop files, or click to browse</p>
                        <Button variant="outline" size="sm" class="mt-4">Browse Files</Button>
                    </div>
                </div>

                <div v-if="transferStep === 3" class="space-y-4">
                    <div class="p-4 rounded-lg bg-muted space-y-3">
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Teacher:</span>
                            <span class="font-medium">{{ selectedTeacher?.name }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">From:</span>
                            <span class="font-medium">{{ selectedTeacher?.school }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">To:</span>
                            <span class="font-medium">{{ transferDestination }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Reason:</span>
                            <span class="font-medium">{{ transferReason }}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter class="gap-2">
                    <Button variant="outline" @click="transferStep > 1 ? transferStep-- : showTransferDialog = false">
                        {{ transferStep === 1 ? 'Cancel' : 'Back' }}
                    </Button>
                    <Button @click="transferStep < 3 ? transferStep++ : submitTransfer()">
                        {{ transferStep === 3 ? 'Submit Request' : 'Next' }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>