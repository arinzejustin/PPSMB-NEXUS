<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { showToast, definePageMeta, useRouter, useRoute, errorParser } from "#imports"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { PinInput, PinInputGroup, PinInputSlot } from '@/components/ui/pin-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Theme from '@/components/app/Theme.vue';
import { useUser, useToken } from '@/composables/states';
import { logOut } from '@/composables/logout';
import { useLockWindow } from '@/composables/useLockWindow';
import { useNavigationHistory } from '@/composables/useNavigationHistory';
import { deleteStorage } from '@/lib/storage';
import {
    User, Shield, Palette, LogOut, Lock, Bell, Save, Monitor, Clock,
    ArrowLeft, Key, Database, Languages, Trash2, CloudDownload, Download, CloudUpload,
    Smartphone, Mail, Settings2, Zap, Check, RotateCcwKey, ChevronLeft, ChevronRight,
} from 'lucide-vue-next';
import type { ResponseStatus } from "@/types";

definePageMeta({
    middleware: "user-validate"
})


const PIN_LENGTH = 4;
const router = useRouter();
const route = useRoute();
const user = useUser();
const token = useToken();
const { lockSession } = useLockWindow();
const { popBack } = useNavigationHistory();
const isElectron = ref(false);
const activeSection = ref('all');
const showInput = ref(false);
const checking = ref(false);
const accessToken = ref("");
const showPinModal = ref(false);
const pinStep = ref<'set' | 'confirm'>('set');
const pinValue = ref<number[]>([]);
const confirmPinValue = ref<number[]>([]);
const changeError = ref('');
const isPinLoading = ref(false);

const settings = reactive({
    autoSave: true,
    notifications: true,
    lockScreen: 1200,
    emailNotifications: true,
    soundEffects: true,
    autoUpdate: true,
    language: 'en',
    fontSize: 'medium',
    compactMode: false,
    showOnlineStatus: true,
    dataSync: true,
});

const lockTimeOptions = [
    { value: 60, label: '1 Minute' },
    { value: 300, label: '5 Minutes' },
    { value: 600, label: '10 Minutes' },
    { value: 1200, label: '20 Minutes' },
    { value: 1800, label: '30 Minutes' },
    { value: 3600, label: '1 Hour' },
    { value: 7200, label: '2 Hours' },
    { value: Infinity, label: 'Never' },
];

const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ig', label: 'Igbo' },
];

const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
];

const sections = [
    { id: 'all', label: 'All Settings', icon: Settings2 },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Monitor },
    { id: 'data', label: 'Data & Storage', icon: Database },
];

const handlePinComplete = (value: number[]): void => {
    if (pinStep.value === 'set') {
        pinValue.value = value;
    } else {
        confirmPinValue.value = value;
    }
};

async function goBack() {
    const path = popBack(route.fullPath);
    if (path) await router.push(path);
}

const isValidPinArray = (pin: number[]): boolean => {
    return pin.length === PIN_LENGTH && pin.every(value => value !== null);
};

const changePassword = () => {
    showToast("Need an administrative right to change password!", "error");
}

const isPinStepValid = computed(() => {
    if (pinStep.value === 'set') {
        return isValidPinArray(pinValue.value);
    }
    return isValidPinArray(confirmPinValue.value);
});

const goToConfirmStep = (): void => {
    if (isValidPinArray(pinValue.value)) {
        changeError.value = '';
        pinStep.value = 'confirm';
        confirmPinValue.value = [];
    } else {
        changeError.value = 'Please enter a 4-digit PIN';
    }
};

const goBackToSetStep = (): void => {
    pinStep.value = 'set';
    confirmPinValue.value = [];
    changeError.value = '';
};

const resetPinModal = (): void => {
    pinStep.value = 'set';
    pinValue.value = [];
    confirmPinValue.value = [];
    changeError.value = '';
};


const handleLogout = async () => {
    await logOut();
    deleteStorage("userDetails")
};

const handleDownloadApp = async () => {

}

const handleLock = () => {
    lockSession();
};

const handleExportData = () => {
    showToast("Data export started...", "success");
};

const handleImportData = () => {
    showToast("Data import feature coming soon...", "info");
};

const handleClearCache = () => {
    showToast("Cache cleared successfully!", "success");
};

const handleDeleteAccount = () => {
    showToast("Account deletion requires confirmation via email.", "warning");
};

const updateSetting = async (key: string, value: any) => {
    if (isElectron.value && window.electronAPI) {
        if (key === "lockScreen" && value > 7200) showToast("For security reasons don't turn off autolock.", "warning");
        await window.electronAPI.setSetting(key, value);
    }
};

const loadSettings = async () => {
    if (window.electronAPI) {
        isElectron.value = true;
        try {
            const autoSave = await window.electronAPI.getSetting('autoSave');
            const notifications = await window.electronAPI.getSetting('notifications');
            const lockScreen = await window.electronAPI.getSetting('lockScreen');
            const soundEffects = await window.electronAPI.getSetting('soundEffects');
            const autoUpdate = await window.electronAPI.getSetting('autoUpdate')

            if (autoSave !== undefined) settings.autoSave = autoSave;
            if (notifications !== undefined) settings.notifications = notifications;
            if (lockScreen !== undefined) settings.lockScreen = lockScreen;
            if (soundEffects !== undefined) settings.soundEffects = soundEffects;
            if (autoUpdate !== undefined) settings.autoUpdate = autoUpdate;
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
};

const shouldShowSection = (sectionId: string) => {
    return activeSection.value === 'all' || activeSection.value === sectionId;
};

const isButtonDisabled = computed(() => {
    const token = accessToken.value?.trim();
    return !token || token.length < 10;
});

const changePin = async (): Promise<void> => {
    if (!isValidPinArray(confirmPinValue.value)) {
        changeError.value = 'Please enter a 4-digit PIN';
        return;
    }

    const pin = pinValue.value.join('');
    const confirmPin = confirmPinValue.value.join('');

    if (pin !== confirmPin) {
        changeError.value = 'PINs do not match. Please try again.';
        confirmPinValue.value = [];
        return;
    }

    isPinLoading.value = true;
    changeError.value = '';

    try {
        const data = await $fetch<ResponseStatus>("/api/auth/set-pin", {
            method: "POST",
            body: {
                pin,
                uuid: user.value?.uuid || ""
            },
            headers: {
                authorization: `Bearer ${user.value?.token}`,
                "x-auth-token": token.value || ""
            }
        })

        if (!data.status) {
            changeError.value = "Failed To Change PIN";
            showToast("Failed To Change PIN", "error")
            return;
        }

        if (window.electronAPI) {
            const upsert = await window.electronAPI.dbUpdate(
                "users",
                { uuid: user.value?.uuid || "" },
                { $set: { pin: pin } },
                {}
            );

            if (upsert < 1) {
                showToast("Failed to set PIN. Please try again.", "error");
                return;
            }
        }
        showPinModal.value = false;
        resetPinModal();
        showToast("PIN set successfully!", "success");
    } catch (error: any) {
        errorParser(error)
    } finally {
        isPinLoading.value = false;
    }
};


onMounted(() => {
    loadSettings();
});

watch(() => settings.autoSave, (val) => updateSetting('autoSave', val));
watch(() => settings.notifications, (val) => updateSetting('notifications', val));
watch(() => settings.lockScreen, (val) => updateSetting('lockScreen', Number(val)));
watch(() => settings.soundEffects, (val) => updateSetting('soundEffects', val));
watch(() => settings.autoUpdate, (val) => updateSetting('autoUpdate', val));

</script>

<template>
    <div class="min-h-screen font-app">
        <div class="sticky top-0 z-10  backdrop-blur-xl border-b">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center gap-4">
                    <Button variant="ghost" size="icon-lg" @click="goBack" class="shrink-0">
                        <ArrowLeft class="w-6 h-6" />
                    </Button>
                    <div class="flex-1">
                        <h1 class="text-xl md:text-2xl font-inter font-semibold tracking-tight">Settings</h1>
                        <p class="text-sm text-muted-foreground mt-1">
                            Manage your account and application preferences
                        </p>
                    </div>
                    <Badge variant="outline" class="hidden md:flex">
                        v2.4.1
                    </Badge>
                </div>
            </div>
        </div>

        <div class="container mx-auto px-0 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div class="lg:col-span-1">
                    <Card class="sticky top-24 bg-background shadow-lg">
                        <CardContent class="p-4 space-y-2">
                            <button v-for="section in sections" :key="section.id" @click="activeSection = section.id"
                                :class="[
                                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all',
                                    activeSection === section.id
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                ]">
                                <component :is="section.icon" class="w-4 h-4 shrink-0" />
                                <span class="text-sm font-medium">{{ section.label }}</span>
                            </button>
                        </CardContent>
                    </Card>
                </div>

                <div class="lg:col-span-3 space-y-6 animate-fadeIn">

                    <Card v-if="shouldShowSection('appearance')" class="bg-background shadow-md">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-3 rounded-xl bg-linear-to-br from-purple-500/10 to-pink-500/10">
                                    <Palette class="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <CardTitle class="text-xl">Appearance</CardTitle>
                                    <CardDescription class="mt-1">
                                        Customize the look and feel of your interface
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div class="space-y-3">
                                <Label class="text-base font-semibold">Theme</Label>
                                <p class="text-sm text-muted-foreground">
                                    Choose between light, dark, or system theme
                                </p>
                                <Theme />
                            </div>

                            <Separator />

                            <div class="space-y-3">
                                <Label class="text-base font-semibold">Font Size</Label>
                                <Select v-model="settings.fontSize">
                                    <SelectTrigger class="w-full sm:w-64">
                                        <SelectValue placeholder="Select font size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem v-for="option in fontSizeOptions" :key="option.value"
                                                :value="option.value">
                                                {{ option.label }}
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div class="flex items-center justify-between">
                                <div class="space-y-0.5">
                                    <Label class="text-base font-semibold">Compact Mode</Label>
                                    <p class="text-sm text-muted-foreground">
                                        Reduce spacing for a denser layout
                                    </p>
                                </div>
                                <Checkbox v-model="settings.compactMode" />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Preferences Section -->
                    <Card v-if="isElectron && shouldShowSection('preferences')" class="bg-background shadow-md">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-3 rounded-xl bg-linear-to-br from-blue-500/10 to-cyan-500/10">
                                    <Monitor class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <CardTitle class="text-xl">Preferences</CardTitle>
                                    <CardDescription class="mt-1">
                                        Configure application behavior and features
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div class="grid gap-6">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-start gap-3">
                                        <Save class="w-5 h-5 text-muted-foreground mt-0.5" />
                                        <div class="space-y-0.5">
                                            <Label class="text-base font-semibold">Auto Save</Label>
                                            <p class="text-sm text-muted-foreground">
                                                Automatically save your work as you go
                                            </p>
                                        </div>
                                    </div>
                                    <Checkbox v-model="settings.autoSave" />
                                </div>

                                <Separator />

                                <div class="flex items-center justify-between">
                                    <div class="flex items-start gap-3">
                                        <Bell class="w-5 h-5 text-muted-foreground mt-0.5" />
                                        <div class="space-y-0.5">
                                            <Label class="text-base font-semibold">Push Notifications</Label>
                                            <p class="text-sm text-muted-foreground">
                                                Receive desktop notifications for important events
                                            </p>
                                        </div>
                                    </div>
                                    <Checkbox v-model="settings.notifications" />
                                </div>

                                <Separator />

                                <div class="flex items-center justify-between">
                                    <div class="flex items-start gap-3">
                                        <Mail class="w-5 h-5 text-muted-foreground mt-0.5" />
                                        <div class="space-y-0.5">
                                            <Label class="text-base font-semibold">Email Notifications</Label>
                                            <p class="text-sm text-muted-foreground">
                                                Get notified via email for critical updates
                                            </p>
                                        </div>
                                    </div>
                                    <Checkbox v-model="settings.emailNotifications" />
                                </div>

                                <Separator />

                                <div class="flex items-center justify-between">
                                    <div class="flex items-start gap-3">
                                        <Zap class="w-5 h-5 text-muted-foreground mt-0.5" />
                                        <div class="space-y-0.5">
                                            <Label class="text-base font-semibold">Sound Effects</Label>
                                            <p class="text-sm text-muted-foreground">
                                                Play sounds for actions and notifications
                                            </p>
                                        </div>
                                    </div>
                                    <Checkbox v-model="settings.soundEffects" />
                                </div>

                                <Separator />

                                <div class="flex items-center justify-between">
                                    <div class="flex items-start gap-3">
                                        <Download class="w-5 h-5 text-muted-foreground mt-0.5" />
                                        <div class="space-y-0.5">
                                            <Label class="text-base font-semibold">Auto Update</Label>
                                            <p class="text-sm text-muted-foreground">
                                                Automatically download and install updates
                                            </p>
                                        </div>
                                    </div>
                                    <Checkbox v-model="settings.autoUpdate" />
                                </div>

                                <Separator />

                                <div class="space-y-3">
                                    <div class="flex items-start gap-3">
                                        <Clock class="w-5 h-5 text-muted-foreground mt-0.5" />
                                        <div class="space-y-0.5">
                                            <Label class="text-base font-semibold">Auto Lock Timeout</Label>
                                            <p class="text-sm text-muted-foreground">
                                                Lock after period of inactivity for security
                                            </p>
                                        </div>
                                    </div>
                                    <Select v-model="settings.lockScreen">
                                        <SelectTrigger class="w-full sm:w-64">
                                            <SelectValue placeholder="Select timeout" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Duration</SelectLabel>
                                                <SelectItem v-for="option in lockTimeOptions" :key="option.value"
                                                    :value="option.value">
                                                    {{ option.label }}
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Separator />

                                <div class="space-y-3">
                                    <div class="flex items-start gap-3">
                                        <Languages class="w-5 h-5 text-muted-foreground mt-0.5" />
                                        <div class="space-y-0.5">
                                            <Label class="text-base font-semibold">Language</Label>
                                            <p class="text-sm text-muted-foreground">
                                                Select your preferred language
                                            </p>
                                        </div>
                                    </div>
                                    <Select v-model="settings.language">
                                        <SelectTrigger class="w-full sm:w-64">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem v-for="option in languageOptions" :key="option.value"
                                                    :value="option.value">
                                                    {{ option.label }}
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Account Section -->
                    <Card v-if="shouldShowSection('account')" class="bg-background shadow-md">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-3 rounded-xl bg-linear-to-br from-green-500/10 to-emerald-500/10">
                                    <User class="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <CardTitle class="text-xl">Account Information</CardTitle>
                                    <CardDescription class="mt-1">
                                        View and manage your personal details
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div class="grid gap-6 md:grid-cols-2">
                                <div class="space-y-2">
                                    <Label class="font-semibold">Full Name</Label>
                                    <div
                                        class="flex h-11 w-full items-center rounded-lg border border-input bg-muted/50 px-4 py-2 text-sm">
                                        {{ user?.name || 'Not Available' }}
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <Label class="font-semibold">Username</Label>
                                    <div
                                        class="flex h-11 w-full items-center rounded-lg border border-input bg-muted/50 px-4 py-2 text-sm">
                                        {{ user?.username || 'Not Available' }}
                                    </div>
                                </div>
                                <div class="space-y-2 md:col-span-2">
                                    <Label class="font-semibold">Email Address</Label>
                                    <div
                                        class="flex h-11 w-full items-center rounded-lg border border-input bg-muted/50 px-4 py-2 text-sm">
                                        {{ user?.email || 'Not Available' }}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div class="flex items-center justify-between">
                                <div class="space-y-0.5">
                                    <Label class="text-base font-semibold">Show Online Status</Label>
                                    <p class="text-sm text-muted-foreground">
                                        Let others see when you're online
                                    </p>
                                </div>
                                <Checkbox v-model="settings.showOnlineStatus" />
                            </div>
                        </CardContent>
                        <CardFooter class="border-t bg-muted/30 px-6 py-4 flex flex-col sm:flex-row gap-3">
                            <Button variant="outline" class="w-full sm:w-auto" @click="handleLogout">
                                <LogOut class="w-4 h-4 mr-0.5" />
                                Sign Out
                            </Button>
                            <Button variant="outline" @click="changePassword"
                                class="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10">
                                <RotateCcwKey class="w-4 h-4 mr-0.5" />
                                Change Password
                            </Button>
                            <Button variant="outline" v-if="isElectron" @click="showPinModal = true"
                                class="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10">
                                <RotateCcwKey class="w-4 h-4 mr-0.5" />
                                Change Pin
                            </Button>
                        </CardFooter>
                    </Card>

                    <!-- Security Section -->
                    <Card v-if="shouldShowSection('security')" class="bg-background shadow-md">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-3 rounded-xl bg-linear-to-br from-red-500/10 to-orange-500/10">
                                    <Shield class="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <CardTitle class="text-xl">Security & Privacy</CardTitle>
                                    <CardDescription class="mt-1">
                                        Protect your account and data
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div v-if="isElectron"
                                class="flex items-center justify-between p-4 border-2 rounded-xl bg-linear-to-br from-primary/5 to-primary/10 hover:border-primary/50 transition-all">
                                <div class="flex items-start gap-3">
                                    <Lock class="w-5 h-5 text-primary mt-0.5" />
                                    <div class="space-y-0.5">
                                        <Label class="text-base font-semibold">Lock Application</Label>
                                        <p class="text-sm text-muted-foreground">
                                            Instantly secure your session
                                        </p>
                                    </div>
                                </div>
                                <Button variant="default" @click="handleLock" class="shrink-0 text-white">
                                    <Lock class="w-4 h-4 mr-1" />
                                    Lock Now
                                </Button>
                            </div>

                            <Separator v-if="isElectron" />

                            <div
                                class="flex items-center justify-between p-4 border-2 rounded-xl bg-card hover:border-muted-foreground/30 transition-all">
                                <div class="flex items-start gap-3">
                                    <Key class="w-5 h-5 text-muted-foreground mt-0.5" />
                                    <div class="space-y-0.5">
                                        <Label class="text-base font-semibold">Two-Factor Authentication</Label>
                                        <p class="text-sm text-muted-foreground">
                                            Add an extra layer of security
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline">Coming Soon</Badge>
                            </div>

                            <Separator />

                            <div
                                class="flex items-center justify-between p-4 border-2 rounded-xl bg-card hover:border-muted-foreground/30 transition-all">
                                <div class="flex items-start gap-3">
                                    <Smartphone class="w-5 h-5 text-muted-foreground mt-0.5" />
                                    <div class="space-y-0.5">
                                        <Label class="text-base font-semibold">Active Sessions</Label>
                                        <p class="text-sm text-muted-foreground">
                                            Manage devices with access to your account
                                        </p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">
                                    View All
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter v-if="!isElectron" class="border-t bg-destructive/5 px-6 py-4">
                            <Button variant="outline" @click="handleDeleteAccount"
                                class="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 class="w-4 h-4 mr-2" />
                                Delete Account
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card v-if="shouldShowSection('data') && isElectron" class="bg-background shadow-md">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-3 rounded-xl bg-linear-to-br from-amber-500/10 to-yellow-500/10">
                                    <Database class="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <CardTitle class="text-xl">Data & Storage</CardTitle>
                                    <CardDescription class="mt-1">
                                        Manage your data and storage options
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div class="flex items-center justify-between">
                                <div class="space-y-0.5">
                                    <Label class="text-base font-semibold">Cloud Sync</Label>
                                    <p class="text-sm text-muted-foreground">
                                        Sync your data across devices
                                    </p>
                                </div>
                                <Checkbox disabled v-model="settings.dataSync" />
                            </div>

                            <Separator />

                            <div class="grid sm:grid-cols-2 gap-4">
                                <Button variant="outline" @click="handleExportData" class="h-auto py-4 flex-col gap-2">
                                    <CloudDownload class="w-5 h-5" />
                                    <div class="text-center">
                                        <div class="font-semibold">Download from Cloud</div>
                                        <div class="text-xs text-muted-foreground">
                                            Retrieve your data from secure storage
                                        </div>
                                    </div>
                                </Button>

                                <Button variant="outline" @click="handleImportData" class="h-auto py-4 flex-col gap-2">
                                    <CloudUpload class="w-5 h-5" />
                                    <div class="text-center">
                                        <div class="font-semibold">Upload to Cloud</div>
                                        <div class="text-xs text-muted-foreground">
                                            Upload existing local data
                                        </div>
                                    </div>
                                </Button>
                            </div>

                            <Separator />

                            <div class="space-y-4">
                                <div class="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                                    <div>
                                        <Label class="font-semibold">Cache Size</Label>
                                        <p class="text-sm font-inter text-muted-foreground mt-1">248 MB</p>
                                    </div>
                                    <Button variant="outline" size="sm" @click="handleClearCache">
                                        Clear Cache
                                    </Button>
                                </div>

                                <div class="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                                    <div>
                                        <Label class="font-semibold">Total Storage Used</Label>
                                        <p class="text-sm text-muted-foreground font-inter mt-1">1.2 GB / 3 GB</p>
                                        <span class="font-app text-xs mt-1 text-muted-foreground">Till next forced
                                            sync</span>
                                    </div>
                                    <div class="w-32 h-3 bg-muted rounded-full overflow-hidden">
                                        <div class="h-full bg-primary" style="width: 46%"></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter class="border-t bg-destructive/5 px-6 py-4">
                            <Button variant="outline" @click="handleDeleteAccount"
                                class="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 class="w-4 h-4 mr-2" />
                                Delete Account
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card v-if="(shouldShowSection('data') || shouldShowSection('preferences')) && !isElectron"
                        class="bg-background shadow-md">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-3 rounded-xl bg-linear-to-br from-red-500/10 to-orange-500/10">
                                    <Download class="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <CardTitle class="text-xl">Download The App</CardTitle>
                                    <CardDescription class="mt-1">
                                        To experience all features of the app, download it from the office website
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" @click="showInput = true" v-if="!showInput">
                                <Download class="w-4 h-4 mr-2" />
                                Download App
                            </Button>
                            <div v-else class="grid w-full items-center gap-1.5 space-y-3">
                                <Label for="token">Access Token</Label>
                                <Input v-model="accessToken" id="token" type="text"
                                    placeholder="Enter your access token" class="h-12" />
                                <Button :disabled="isButtonDisabled" variant="default"
                                    class="app-btn disabled:cursor-not-allowed cursor-pointer w-1/3 mx-auto text-white!">
                                    <span v-if="!checking" class="flex items-center justify-center gap-2">
                                        <Check class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        Verify Token
                                    </span>
                                    <span v-else class="flex items-center justify-center gap-2">
                                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                                            viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                            </path>
                                        </svg>
                                        Verifying...
                                    </span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        <Dialog :open="showPinModal" @update:open="(val) => { showPinModal = val; changeError = '' }">
            <DialogContent class="sm:max-w-md bg-background shadow-lg"
                @interact-outside="(e: any) => { e.preventDefault() }">
                <DialogHeader class="text-center">
                    <div class="flex justify-center mb-4">
                        <div
                            class="w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-primary-foreground" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <DialogTitle class="text-xl font-semibold text-center">
                        {{ pinStep === 'set' ? 'Change Pin' : 'Confirm Your New PIN' }}
                    </DialogTitle>
                    <DialogDescription class="text-center text-muted-foreground">
                        {{ pinStep === 'set' ? 'Enter Your New PIN' : 'Re-enter your PIN to confirm' }}
                    </DialogDescription>
                </DialogHeader>

                <div class="flex flex-col items-center py-6 pt-2 space-y-4">
                    <div class="flex items-center gap-2 mb-2 pb-4">
                        <div class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
                            :class="pinStep === 'set' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'">
                            1
                        </div>
                        <div class="w-8 h-0.5" :class="pinStep === 'confirm' ? 'bg-primary' : 'bg-border'"></div>
                        <div class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
                            :class="pinStep === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">
                            2
                        </div>
                    </div>

                    <PinInput v-if="pinStep === 'set'" :key="'set-pin'" v-model="pinValue" placeholder="●" type="number"
                        :length="4" @complete="handlePinComplete" class="">
                        <PinInputGroup class="gap-3">
                            <PinInputSlot v-for="(slot, index) in 4" :key="index" :index="index"
                                class="w-12 h-14 text-base font-semibold border-2 rounded-md bg-background/50 transition-all" />
                        </PinInputGroup>
                    </PinInput>

                    <PinInput v-if="pinStep === 'confirm'" :key="'confirm-pin'" v-model="confirmPinValue"
                        placeholder="●" type="number" :length="4" @complete="handlePinComplete">
                        <PinInputGroup class="gap-3">
                            <PinInputSlot v-for="(slot, index) in 4" :key="index" :index="index"
                                class="w-12 h-14 text-base font-semibold border-2 rounded-md bg-background/50 transition-all"
                                :class="{ 'border-destructive': changeError }" />
                        </PinInputGroup>
                    </PinInput>

                    <p v-if="changeError" class="text-sm text-destructive flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ changeError }}
                    </p>
                </div>

                <DialogFooter class="flex-col sm:flex-row gap-2">
                    <template v-if="pinStep === 'set'">
                        <Button type="button" class="w-2/3 mx-auto app-btn" :disabled="!isPinStepValid"
                            @click="goToConfirmStep">
                            Continue
                            <ChevronRight class="w-4 h-4 ml-2" />
                        </Button>
                    </template>
                    <template v-else>
                        <Button type="button" variant="outline" class="w-full sm:w-auto" @click="goBackToSetStep">
                            <ChevronLeft class="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button @click="changePin" type="button" class="w-full sm:w-auto"
                            :disabled="!isPinStepValid || isPinLoading">
                            <span v-if="!isPinLoading" class="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Change PIN
                            </span>
                            <span v-else class="flex items-center">
                                <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none"
                                    viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                                Changing...
                            </span>
                        </Button>
                    </template>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
