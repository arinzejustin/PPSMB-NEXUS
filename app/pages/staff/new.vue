<script setup lang="ts">
import { ref, computed } from 'vue';
import { definePageMeta, useRuntimeConfig } from '#imports';
import { useStaffData, type AddMethod } from '@/composables/useStaffData';
import {
    Pencil, ScanLine, FileUp, UserPlus, Upload, X,
    FileText, FileSpreadsheet, Image, ArrowLeft, Users,
    CheckCircle2, AlertCircle
} from 'lucide-vue-next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const env = useRuntimeConfig();
const isDesktop = computed(() => env.public.appType === 'desktop');

definePageMeta({ layout: 'app', middleware: ['user-validate'] });

const {
    addMethod, isScanning, isParsingFile, parsedRecords,
    editingRecordIndex, manualForm,
    zones, qualifications,
    addTeacherManually, addParsedRecords,
    triggerScan, handleFileUpload, resetManualForm,
    isElectron: isElectronEnv
} = useStaffData();

// Local state
const showSuccess = ref(false);
const successMessage = ref('');

// File upload handling
const fileInputRef = ref<HTMLInputElement | null>(null);

const onFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
        handleFileUpload(input.files[0]!);
    }
};

const triggerFileInput = () => {
    fileInputRef.value?.click();
};

const handleAddManually = () => {
    addTeacherManually();
    successMessage.value = `${manualForm.value.name || 'Teacher'} has been added successfully.`;
    showSuccess.value = true;
    setTimeout(() => showSuccess.value = false, 4000);
};

const handleAddParsed = () => {
    const count = parsedRecords.value.length;
    addParsedRecords();
    successMessage.value = `${count} teacher record${count > 1 ? 's' : ''} added successfully.`;
    showSuccess.value = true;
    setTimeout(() => showSuccess.value = false, 4000);
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
                        <h1 class="text-2xl font-bold tracking-tight text-foreground">Add New Teacher</h1>
                        <p class="text-muted-foreground mt-0.5">
                            Register new staff members using manual entry, document scanning, or file upload
                        </p>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <NuxtLink to="/staff/">
                    <Button variant="outline" size="sm">
                        <Users class="w-4 h-4 mr-2" />
                        View All Staff
                    </Button>
                </NuxtLink>
            </div>
        </div>

        <!-- Success Toast -->
        <Transition enter-active-class="transition-all duration-300 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
            <div v-if="showSuccess"
                class="flex items-center gap-3 p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50">
                <CheckCircle2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">{{ successMessage }}</p>
            </div>
        </Transition>

        <!-- Method Selection Cards (top overview) -->
        <div class="grid gap-4 md:grid-cols-3">
            <Card class="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                :class="{ 'border-primary/50 shadow-md shadow-primary/10': addMethod === 'manual' }"
                @click="addMethod = 'manual'">
                <CardContent class="pt-6">
                    <div class="flex flex-col items-center text-center gap-3">
                        <div class="p-4 rounded-2xl bg-linear-to-br from-blue-500/20 to-indigo-500/20">
                            <Pencil class="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 class="font-semibold">Manual Entry</h3>
                            <p class="text-sm text-muted-foreground mt-1">
                                Fill out the teacher's details by hand
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card v-if="isElectronEnv"
                class="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                :class="{ 'border-primary/50 shadow-md shadow-primary/10': addMethod === 'scan' }"
                @click="addMethod = 'scan'">
                <CardContent class="pt-6">
                    <div class="flex flex-col items-center text-center gap-3">
                        <div class="p-4 rounded-2xl bg-linear-to-br from-violet-500/20 to-purple-500/20">
                            <ScanLine class="w-8 h-8 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h3 class="font-semibold">Scan Document</h3>
                            <p class="text-sm text-muted-foreground mt-1">
                                Scan teacher's profile paperwork
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card class="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                :class="{ 'border-primary/50 shadow-md shadow-primary/10': addMethod === 'upload' }"
                @click="addMethod = 'upload'">
                <CardContent class="pt-6">
                    <div class="flex flex-col items-center text-center gap-3">
                        <div class="p-4 rounded-2xl bg-linear-to-br from-emerald-500/20 to-teal-500/20">
                            <FileUp class="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 class="font-semibold">Upload File</h3>
                            <p class="text-sm text-muted-foreground mt-1">
                                Import from PDF, Excel, CSV, or image
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Active Method Content -->
        <Card>
            <CardContent class="pt-6">
                <Tabs v-model="addMethod" class="w-full">
                    <TabsList class="grid w-full mb-6" :class="isElectronEnv ? 'grid-cols-3' : 'grid-cols-2'">
                        <TabsTrigger value="manual">
                            <Pencil class="w-3.5 h-3.5 mr-1.5" /> Manual Entry
                        </TabsTrigger>
                        <TabsTrigger v-if="isElectronEnv" value="scan">
                            <ScanLine class="w-3.5 h-3.5 mr-1.5" /> Scan Document
                        </TabsTrigger>
                        <TabsTrigger value="upload">
                            <FileUp class="w-3.5 h-3.5 mr-1.5" /> Upload File
                        </TabsTrigger>
                    </TabsList>

                    <!-- Manual Entry -->
                    <TabsContent value="manual" class="space-y-6">
                        <div class="flex items-center gap-2 mb-2">
                            <AlertCircle class="w-4 h-4 text-muted-foreground" />
                            <p class="text-sm text-muted-foreground">Fields marked with * are required</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label>Full Name *</Label>
                                <Input v-model="manualForm.name" placeholder="e.g. Mrs. Ngozi Eze" class="mt-1.5" />
                            </div>
                            <div>
                                <Label>Email</Label>
                                <Input v-model="manualForm.email" placeholder="email@ppsmb.edu.ng" class="mt-1.5" />
                            </div>
                            <div>
                                <Label>Phone</Label>
                                <Input v-model="manualForm.phone" placeholder="+234..." class="mt-1.5" />
                            </div>
                            <div>
                                <Label>Gender</Label>
                                <Select v-model="manualForm.gender">
                                    <SelectTrigger class="mt-1.5">
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Date of Birth</Label>
                                <Input v-model="manualForm.dateOfBirth" type="date" class="mt-1.5" />
                            </div>
                            <div>
                                <Label>Zone *</Label>
                                <Select v-model="manualForm.zone">
                                    <SelectTrigger class="mt-1.5">
                                        <SelectValue placeholder="Select Zone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="z in zones" :key="z" :value="z">{{ z }}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div class="md:col-span-2">
                                <Label>School</Label>
                                <Input v-model="manualForm.school" placeholder="School name" class="mt-1.5" />
                            </div>
                            <div>
                                <Label>Qualification</Label>
                                <Select v-model="manualForm.qualification">
                                    <SelectTrigger class="mt-1.5">
                                        <SelectValue placeholder="Select qualification" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="q in qualifications" :key="q" :value="q">{{ q
                                            }}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Subject</Label>
                                <Input v-model="manualForm.subject" placeholder="Subject area" class="mt-1.5" />
                            </div>
                            <div>
                                <Label>Grade Level</Label>
                                <Input v-model="manualForm.gradeLevel" placeholder="e.g. GL 08" class="mt-1.5" />
                            </div>
                            <div>
                                <Label>Employment Date</Label>
                                <Input v-model="manualForm.employmentDate" type="date" class="mt-1.5" />
                            </div>
                        </div>

                        <Separator />

                        <div class="flex items-center justify-end gap-3">
                            <Button variant="outline" @click="resetManualForm">
                                <X class="w-4 h-4 mr-2" /> Clear Form
                            </Button>
                            <Button @click="handleAddManually" :disabled="!manualForm.name || !manualForm.zone"
                                class="min-w-[160px]">
                                <UserPlus class="w-4 h-4 mr-2" /> Add Teacher
                            </Button>
                        </div>
                    </TabsContent>

                    <!-- Scan Document (Electron only) -->
                    <TabsContent v-if="isElectronEnv" value="scan" class="space-y-6">
                        <div class="text-center py-12">
                            <div v-if="isScanning" class="flex flex-col items-center gap-4">
                                <div
                                    class="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                                <div>
                                    <p class="font-medium">Scanning document...</p>
                                    <p class="text-sm text-muted-foreground mt-1">
                                        The Python scanner is processing the document
                                    </p>
                                </div>
                            </div>
                            <div v-else class="flex flex-col items-center gap-4">
                                <div
                                    class="p-8 rounded-3xl bg-linear-to-br from-primary/10 to-primary/5 border border-primary/20">
                                    <ScanLine class="w-16 h-16 text-primary" />
                                </div>
                                <div>
                                    <p class="text-lg font-semibold">Scan Teacher Paperwork</p>
                                    <p class="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                                        Place the teacher's profile document on the scanner and click the button below
                                        to start scanning
                                    </p>
                                </div>
                                <Button @click="triggerScan" size="lg" class="mt-2">
                                    <ScanLine class="w-4 h-4 mr-2" /> Start Scanning
                                </Button>
                            </div>
                        </div>

                        <!-- Parsed scan results -->
                        <div v-if="parsedRecords.length > 0" class="space-y-4">
                            <Separator />
                            <h4 class="font-semibold text-lg">Scanned Data (Editable)</h4>
                            <div v-for="(record, index) in parsedRecords" :key="index"
                                class="p-5 rounded-xl border bg-muted/30 space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div v-for="(value, key) in record" :key="key">
                                        <Label class="text-xs capitalize">{{ key }}</Label>
                                        <Input v-model="parsedRecords[index]![key]" class="mt-1 h-9 text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div class="flex justify-end">
                                <Button @click="handleAddParsed" size="lg">
                                    <UserPlus class="w-4 h-4 mr-2" /> Add to System
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <!-- Upload File -->
                    <TabsContent value="upload" class="space-y-6">
                        <input ref="fileInputRef" type="file" accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                            class="hidden" @change="onFileSelect" />

                        <div v-if="parsedRecords.length === 0">
                            <div @click="triggerFileInput"
                                class="border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
                                <div v-if="isParsingFile" class="flex flex-col items-center gap-4">
                                    <div
                                        class="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                                    <p class="font-medium text-muted-foreground">Processing file...</p>
                                </div>
                                <div v-else class="flex flex-col items-center gap-5">
                                    <div class="p-6 rounded-3xl bg-muted">
                                        <Upload class="w-12 h-12 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p class="text-lg font-semibold">Drop file here or click to browse</p>
                                        <p class="text-sm text-muted-foreground mt-1">
                                            Upload teacher records from various file formats
                                        </p>
                                    </div>
                                    <div class="flex gap-3 mt-1">
                                        <Badge variant="outline" class="text-xs px-3 py-1">
                                            <FileText class="w-3 h-3 mr-1.5" /> PDF
                                        </Badge>
                                        <Badge variant="outline" class="text-xs px-3 py-1">
                                            <FileSpreadsheet class="w-3 h-3 mr-1.5" /> Excel/CSV
                                        </Badge>
                                        <Badge variant="outline" class="text-xs px-3 py-1">
                                            <Image class="w-3 h-3 mr-1.5" /> Image
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Parsed file results (editable) -->
                        <div v-if="parsedRecords.length > 0" class="space-y-5">
                            <div class="flex items-center justify-between">
                                <h4 class="text-lg font-semibold">
                                    {{ parsedRecords.length }} Record{{ parsedRecords.length > 1 ? 's' : '' }} Found
                                </h4>
                                <Button variant="ghost" size="sm" @click="parsedRecords = []">
                                    <X class="w-3 h-3 mr-1" /> Clear All
                                </Button>
                            </div>

                            <div v-for="(record, index) in parsedRecords" :key="index"
                                class="p-5 rounded-xl border bg-card space-y-4 hover:shadow-sm transition-shadow">
                                <div class="flex items-center justify-between">
                                    <span class="font-semibold">Record #{{ index + 1 }}</span>
                                    <Button variant="ghost" size="sm"
                                        @click="editingRecordIndex = editingRecordIndex === index ? null : index">
                                        <Pencil class="w-3 h-3 mr-1" />
                                        {{ editingRecordIndex === index ? 'Collapse' : 'Edit' }}
                                    </Button>
                                </div>

                                <div v-if="editingRecordIndex === index"
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div v-for="(value, key) in record" :key="key">
                                        <Label class="text-xs capitalize">{{ key }}</Label>
                                        <Input v-model="parsedRecords[index]![key]" class="mt-1 h-9 text-sm" />
                                    </div>
                                </div>
                                <div v-else class="text-sm text-muted-foreground">
                                    {{ record.name }} — {{ record.zone }} — {{ record.qualification }}
                                </div>
                            </div>

                            <Separator />

                            <div class="flex items-center justify-end gap-3">
                                <Button variant="outline" @click="triggerFileInput">
                                    <Upload class="w-4 h-4 mr-2" /> Upload Another
                                </Button>
                                <Button @click="handleAddParsed" size="lg">
                                    <UserPlus class="w-4 h-4 mr-2" />
                                    Add {{ parsedRecords.length }} Record{{ parsedRecords.length > 1 ? 's' : '' }}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
</template>