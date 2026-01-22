<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { definePageMeta, navigateTo } from '#imports';
import {
    Search,
    Filter,
    Download,
    Plus,
    MoreHorizontal,
    Eye,
    ArrowLeftRight,
    FileEdit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    SortAsc,
    SortDesc,
    X,
    MapPin,
    Building2,
    GraduationCap,
    Calendar,
    Phone,
    Mail,
    User,
    Clock,
    Check,
    AlertCircle,
    AlertTriangle
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays, addDays } from 'date-fns';

definePageMeta({
    layout: 'app'
});

// State
const searchQuery = ref('');
const selectedZone = ref('');
const selectedStatus = ref('');
const selectedQualification = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRows = ref<string[]>([]);
const sortColumn = ref('name');
const sortDirection = ref<'asc' | 'desc'>('asc');
const showProfileSheet = ref(false);
const selectedTeacher = ref<any>(null);
const showTransferDialog = ref(false);
const transferStep = ref(1);

// Filter options
const zones = [
    'Enugu North', 'Enugu South', 'Enugu East', 'Nsukka', 'Udi', 'Awgu'
];

const qualifications = [
    'B.Ed', 'M.Ed', 'NCE', 'B.Sc/B.A + PGDE', 'M.Sc/M.A + PGDE', 'Ph.D'
];

const certStatuses = [
    { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'expiring', label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700' },
    { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700' },
    { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' }
];

// Mock teacher data
const teachers = ref([
    {
        id: 'TCH001',
        name: 'Mrs. Adaobi Nwankwo',
        email: 'adaobi.nwankwo@ppsmb.edu.ng',
        phone: '+234 803 456 7890',
        avatar: '',
        gender: 'Female',
        dateOfBirth: '1985-03-15',
        zone: 'Enugu North',
        school: 'Government Secondary School, Enugu',
        qualification: 'M.Ed',
        subject: 'Mathematics',
        yearsOfService: 12,
        employmentDate: '2014-01-15',
        certStatus: 'active',
        certExpiry: '2027-06-30',
        lastTransfer: '2022-08-01',
        status: 'active'
    },
    {
        id: 'TCH002',
        name: 'Mr. Emmanuel Okonkwo',
        email: 'emmanuel.okonkwo@ppsmb.edu.ng',
        phone: '+234 805 234 5678',
        avatar: '',
        gender: 'Male',
        dateOfBirth: '1980-07-22',
        zone: 'Nsukka',
        school: 'Community Secondary School, Nsukka',
        qualification: 'B.Ed',
        subject: 'English Language',
        yearsOfService: 15,
        employmentDate: '2011-03-20',
        certStatus: 'expiring',
        certExpiry: '2026-02-28',
        lastTransfer: '2019-01-10',
        status: 'active'
    },
    {
        id: 'TCH003',
        name: 'Mrs. Chioma Eze',
        email: 'chioma.eze@ppsmb.edu.ng',
        phone: '+234 807 890 1234',
        avatar: '',
        gender: 'Female',
        dateOfBirth: '1990-11-08',
        zone: 'Enugu South',
        school: 'Girls Secondary School, Trans-Ekulu',
        qualification: 'NCE',
        subject: 'Biology',
        yearsOfService: 6,
        employmentDate: '2020-02-10',
        certStatus: 'active',
        certExpiry: '2028-12-31',
        lastTransfer: null,
        status: 'active'
    },
    {
        id: 'TCH004',
        name: 'Mr. Ikechukwu Ugwu',
        email: 'ikechukwu.ugwu@ppsmb.edu.ng',
        phone: '+234 809 567 8901',
        avatar: '',
        gender: 'Male',
        dateOfBirth: '1978-05-30',
        zone: 'Udi',
        school: 'Technical College, Udi',
        qualification: 'B.Sc + PGDE',
        subject: 'Physics',
        yearsOfService: 18,
        employmentDate: '2008-09-01',
        certStatus: 'expired',
        certExpiry: '2025-06-30',
        lastTransfer: '2015-03-15',
        status: 'active'
    },
    {
        id: 'TCH005',
        name: 'Miss Ngozi Okoro',
        email: 'ngozi.okoro@ppsmb.edu.ng',
        phone: '+234 802 345 6789',
        avatar: '',
        gender: 'Female',
        dateOfBirth: '1995-01-20',
        zone: 'Awgu',
        school: 'Secondary School, Awgu',
        qualification: 'B.Ed',
        subject: 'Chemistry',
        yearsOfService: 3,
        employmentDate: '2023-01-05',
        certStatus: 'pending',
        certExpiry: null,
        lastTransfer: null,
        status: 'active'
    },
    {
        id: 'TCH006',
        name: 'Mr. Obiora Nnamdi',
        email: 'obiora.nnamdi@ppsmb.edu.ng',
        phone: '+234 806 789 0123',
        avatar: '',
        gender: 'Male',
        dateOfBirth: '1982-09-12',
        zone: 'Enugu East',
        school: 'Model Secondary School, Nike',
        qualification: 'M.Sc + PGDE',
        subject: 'Computer Science',
        yearsOfService: 10,
        employmentDate: '2016-04-18',
        certStatus: 'active',
        certExpiry: '2027-08-15',
        lastTransfer: '2021-06-01',
        status: 'active'
    },
    {
        id: 'TCH007',
        name: 'Mrs. Amaka Obi',
        email: 'amaka.obi@ppsmb.edu.ng',
        phone: '+234 808 901 2345',
        avatar: '',
        gender: 'Female',
        dateOfBirth: '1988-12-05',
        zone: 'Enugu North',
        school: 'Federal Government College, Enugu',
        qualification: 'Ph.D',
        subject: 'Economics',
        yearsOfService: 8,
        employmentDate: '2018-02-12',
        certStatus: 'active',
        certExpiry: '2029-04-20',
        lastTransfer: '2023-01-10',
        status: 'active'
    },
    {
        id: 'TCH008',
        name: 'Mr. Chukwuemeka Ani',
        email: 'chukwuemeka.ani@ppsmb.edu.ng',
        phone: '+234 804 567 8901',
        avatar: '',
        gender: 'Male',
        dateOfBirth: '1975-04-18',
        zone: 'Nsukka',
        school: 'Urban Secondary School, Nsukka',
        qualification: 'M.Ed',
        subject: 'History',
        yearsOfService: 22,
        employmentDate: '2004-08-01',
        certStatus: 'expiring',
        certExpiry: '2026-03-15',
        lastTransfer: '2012-09-01',
        status: 'active'
    }
]);

// Filtered and sorted teachers
const filteredTeachers = computed(() => {
    let result = [...teachers.value];

    // Search filter
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(t =>
            t.name.toLowerCase().includes(query) ||
            t.id.toLowerCase().includes(query) ||
            t.email.toLowerCase().includes(query) ||
            t.school.toLowerCase().includes(query)
        );
    }

    // Zone filter
    if (selectedZone.value) {
        result = result.filter(t => t.zone === selectedZone.value);
    }

    // Status filter
    if (selectedStatus.value) {
        result = result.filter(t => t.certStatus === selectedStatus.value);
    }

    // Qualification filter
    if (selectedQualification.value) {
        result = result.filter(t => t.qualification === selectedQualification.value);
    }

    // Sort
    result.sort((a, b) => {
        const aVal = a[sortColumn.value as keyof typeof a];
        const bVal = b[sortColumn.value as keyof typeof b];
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection.value === 'asc' ? comparison : -comparison;
    });

    return result;
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredTeachers.value.length / pageSize.value));
const paginatedTeachers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredTeachers.value.slice(start, start + pageSize.value);
});

// Methods
const toggleSort = (column: string) => {
    if (sortColumn.value === column) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn.value = column;
        sortDirection.value = 'asc';
    }
};

const toggleSelectAll = () => {
    if (selectedRows.value.length === paginatedTeachers.value.length) {
        selectedRows.value = [];
    } else {
        selectedRows.value = paginatedTeachers.value.map(t => t.id);
    }
};

const toggleSelectRow = (id: string) => {
    const index = selectedRows.value.indexOf(id);
    if (index > -1) {
        selectedRows.value.splice(index, 1);
    } else {
        selectedRows.value.push(id);
    }
};

const viewTeacher = (teacher: any) => {
    selectedTeacher.value = teacher;
    showProfileSheet.value = true;
};

const initiateTransfer = (teacher: any) => {
    selectedTeacher.value = teacher;
    transferStep.value = 1;
    showTransferDialog.value = true;
};

const clearFilters = () => {
    searchQuery.value = '';
    selectedZone.value = '';
    selectedStatus.value = '';
    selectedQualification.value = '';
};

const hasActiveFilters = computed(() => {
    return searchQuery.value || selectedZone.value || selectedStatus.value || selectedQualification.value;
});

const getCertStatusBadge = (status: string) => {
    const config = certStatuses.find(s => s.value === status);
    return config || { label: status, color: 'bg-gray-100 text-gray-700' };
};

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const getDaysUntilExpiry = (date: string | null) => {
    if (!date) return null;
    return differenceInDays(new Date(date), new Date());
};

// Transfer workflow state
const transferDestination = ref('');
const transferReason = ref('');
const transferDocuments = ref<string[]>([]);
const transferSchools = [
    'Government Secondary School, Nsukka',
    'Community Secondary School, Udi',
    'Girls Secondary School, Trans-Ekulu',
    'Technical College, Awgu',
    'Model Secondary School, Nike'
];
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Teacher Management</h1>
                <p class="text-muted-foreground mt-1">
                    Manage teacher profiles, certifications, and transfers
                </p>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm">
                    <Download class="w-4 h-4 mr-2" />
                    Export
                </Button>
                <Button size="sm" @click="navigateTo('/staff/new')">
                    <Plus class="w-4 h-4 mr-2" />
                    Add Teacher
                </Button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid gap-4 md:grid-cols-4">
            <Card>
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <User class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{ teachers.length }}</p>
                            <p class="text-sm text-muted-foreground">Total Teachers</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <Check class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{teachers.filter(t => t.certStatus === 'active').length}}
                            </p>
                            <p class="text-sm text-muted-foreground">Active Certifications</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <AlertCircle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{teachers.filter(t => t.certStatus === 'expiring').length}}
                            </p>
                            <p class="text-sm text-muted-foreground">Expiring Soon</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent class="pt-6">
                    <div class="flex items-center gap-4">
                        <div class="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold">{{teachers.filter(t => t.certStatus === 'expired').length}}
                            </p>
                            <p class="text-sm text-muted-foreground">Expired</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Filters and Search -->
        <Card>
            <CardContent class="pt-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex flex-1 items-center gap-2">
                        <div class="relative flex-1 max-w-sm">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input v-model="searchQuery" placeholder="Search by name, ID, email..." class="pl-9" />
                        </div>
                        <Select v-model="selectedZone">
                            <SelectTrigger class="w-[160px]">
                                <SelectValue placeholder="All Zones" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Zones</SelectItem>
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
                                <SelectItem value="">All Status</SelectItem>
                                <SelectItem v-for="status in certStatuses" :key="status.value" :value="status.value">
                                    {{ status.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select v-model="selectedQualification">
                            <SelectTrigger class="w-[160px]">
                                <SelectValue placeholder="Qualification" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Qualifications</SelectItem>
                                <SelectItem v-for="qual in qualifications" :key="qual" :value="qual">
                                    {{ qual }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button v-if="hasActiveFilters" variant="ghost" size="sm" @click="clearFilters">
                            <X class="w-4 h-4 mr-1" />
                            Clear Filters
                        </Button>
                        <span class="text-sm text-muted-foreground">
                            {{ filteredTeachers.length }} of {{ teachers.length }} teachers
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Data Table -->
        <Card>
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
                            <TableHead>Certification</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead class="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-for="teacher in paginatedTeachers" :key="teacher.id"
                            class="cursor-pointer hover:bg-muted/50" @click="viewTeacher(teacher)">
                            <TableCell @click.stop>
                                <Checkbox :checked="selectedRows.includes(teacher.id)"
                                    @update:checked="toggleSelectRow(teacher.id)" />
                            </TableCell>
                            <TableCell>
                                <div class="flex items-center gap-3">
                                    <Avatar class="w-10 h-10">
                                        <AvatarImage :src="teacher.avatar" />
                                        <AvatarFallback class="bg-primary text-primary-foreground text-sm">
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
                                    <span
                                        class="text-xs text-muted-foreground truncate max-w-[200px]">{{ teacher.school }}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium">{{ teacher.qualification }}</span>
                                    <span class="text-xs text-muted-foreground">{{ teacher.subject }}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge :class="getCertStatusBadge(teacher.certStatus).color">
                                    {{ getCertStatusBadge(teacher.certStatus).label }}
                                </Badge>
                                <p v-if="teacher.certExpiry" class="text-xs text-muted-foreground mt-1">
                                    Expires: {{ format(new Date(teacher.certExpiry), 'MMM d, yyyy') }}
                                </p>
                            </TableCell>
                            <TableCell>
                                <span class="text-sm">{{ teacher.yearsOfService }} years</span>
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
                                            <Eye class="w-4 h-4 mr-2" />
                                            View Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem @click="navigateTo(`/staff/${teacher.id}`)">
                                            <FileEdit class="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem @click="initiateTransfer(teacher)">
                                            <ArrowLeftRight class="w-4 h-4 mr-2" />
                                            Initiate Transfer
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem class="text-destructive focus:text-destructive">
                                            <Trash2 class="w-4 h-4 mr-2" />
                                            Delete
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
                        {{ Math.min(currentPage * pageSize, filteredTeachers.length) }} of {{ filteredTeachers.length }}
                        results
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

        <!-- Teacher Profile Sheet -->
        <Sheet v-model:open="showProfileSheet">
            <SheetContent class="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Teacher Profile</SheetTitle>
                    <SheetDescription>View complete teacher information</SheetDescription>
                </SheetHeader>

                <div v-if="selectedTeacher" class="mt-6 space-y-6">
                    <!-- Profile Header -->
                    <div class="flex items-center gap-4">
                        <Avatar class="w-20 h-20">
                            <AvatarImage :src="selectedTeacher.avatar" />
                            <AvatarFallback class="bg-primary text-primary-foreground text-xl">
                                {{ getInitials(selectedTeacher.name) }}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 class="text-xl font-semibold">{{ selectedTeacher.name }}</h3>
                            <p class="text-muted-foreground">{{ selectedTeacher.id }}</p>
                            <Badge :class="getCertStatusBadge(selectedTeacher.certStatus).color" class="mt-2">
                                {{ getCertStatusBadge(selectedTeacher.certStatus).label }}
                            </Badge>
                        </div>
                    </div>

                    <Separator />

                    <!-- Tabbed Content -->
                    <Tabs default-value="personal" class="w-full">
                        <TabsList class="grid w-full grid-cols-3">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="employment">Employment</TabsTrigger>
                            <TabsTrigger value="certification">Certification</TabsTrigger>
                        </TabsList>

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
                                            {{ format(new Date(selectedTeacher.dateOfBirth), 'MMMM d, yyyy') }}</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

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
                                <div v-if="selectedTeacher.lastTransfer" class="flex items-center gap-3">
                                    <ArrowLeftRight class="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p class="text-sm text-muted-foreground">Last Transfer</p>
                                        <p class="font-medium">
                                            {{ format(new Date(selectedTeacher.lastTransfer), 'MMMM d, yyyy') }}</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="certification" class="space-y-4 mt-4">
                            <div class="p-4 rounded-lg border">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-muted-foreground">Certification Status</p>
                                        <Badge :class="getCertStatusBadge(selectedTeacher.certStatus).color"
                                            class="mt-1">
                                            {{ getCertStatusBadge(selectedTeacher.certStatus).label }}
                                        </Badge>
                                    </div>
                                    <div v-if="selectedTeacher.certExpiry" class="text-right">
                                        <p class="text-sm text-muted-foreground">Expiry Date</p>
                                        <p class="font-medium">
                                            {{ format(new Date(selectedTeacher.certExpiry), 'MMMM d, yyyy') }}</p>
                                        <p v-if="getDaysUntilExpiry(selectedTeacher.certExpiry)! > 0"
                                            class="text-xs text-muted-foreground">
                                            {{ getDaysUntilExpiry(selectedTeacher.certExpiry) }} days remaining
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Separator />

                    <!-- Actions -->
                    <div class="flex gap-2">
                        <Button class="flex-1" @click="initiateTransfer(selectedTeacher)">
                            <ArrowLeftRight class="w-4 h-4 mr-2" />
                            Initiate Transfer
                        </Button>
                        <Button variant="outline" class="flex-1" @click="navigateTo(`/staff/${selectedTeacher.id}`)">
                            <FileEdit class="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>

        <!-- Transfer Dialog -->
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

                <!-- Step 1: Select Destination -->
                <div v-if="transferStep === 1" class="space-y-4">
                    <div>
                        <label class="text-sm font-medium">Destination School</label>
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
                        <label class="text-sm font-medium">Reason for Transfer</label>
                        <Input v-model="transferReason" placeholder="Enter transfer reason" class="mt-2" />
                    </div>
                </div>

                <!-- Step 2: Attach Documents -->
                <div v-if="transferStep === 2" class="space-y-4">
                    <p class="text-sm text-muted-foreground">Attach supporting documents for this transfer request.</p>
                    <div class="border-2 border-dashed rounded-lg p-8 text-center">
                        <FileText class="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p class="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
                        <Button variant="outline" size="sm" class="mt-4">Browse Files</Button>
                    </div>
                </div>

                <!-- Step 3: Review -->
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
                    <Button @click="transferStep < 3 ? transferStep++ : showTransferDialog = false">
                        {{ transferStep === 3 ? 'Submit Request' : 'Next' }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>