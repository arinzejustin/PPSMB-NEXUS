<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { navigateTo, showToast } from "#imports"
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
import Theme from '@/components/app/Theme.vue';
import { useUser } from '@/composables/states';
import { logOut } from '@/composables/logout';
import { useLockWindow } from '@/composables/useLockWindow';
import { deleteStorage } from '@/lib/storage';
import { User, Shield, Palette, LogOut, Lock, Bell, Save, Monitor, Clock } from 'lucide-vue-next';

const user = useUser();
const { lockSession } = useLockWindow();
const isElectron = ref(false);

const settings = reactive({
    autoSave: true,
    notifications: true,
    lockScreen: 1200
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

const handleLogout = async () => {
    await logOut();
    deleteStorage("userDetails")
};

const handleLock = () => {
    lockSession();
    navigateTo('/pin');
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

            if (autoSave !== undefined) settings.autoSave = autoSave;
            if (notifications !== undefined) settings.notifications = notifications;
            if (lockScreen !== undefined) settings.lockScreen = lockScreen;
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
};

onMounted(() => {
    loadSettings();
});

watch(() => settings.autoSave, (val) => updateSetting('autoSave', val));
watch(() => settings.notifications, (val) => updateSetting('notifications', val));
watch(() => settings.lockScreen, (val) => updateSetting('lockScreen', Number(val)));

</script>

<template>
    <div class="py-6 lg:py-10 space-y-8 animate-fadeIn font-app">
        <div class="flex flex-col gap-2">
            <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
            <p class="text-muted-foreground">
                Manage your account settings and application preferences.
            </p>
        </div>

        <div class="grid gap-6 gap-x-0">
            <Card class="bg-background shadow-md dark:shadow-lg">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <Palette class="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription class="mt-1">
                                Customize the interface look and feel.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid gap-2">
                        <Label class="text-base">Theme</Label>
                        <p class="text-sm text-muted-foreground mb-2">
                            Select your preferred theme for the application.
                        </p>
                        <Theme />
                    </div>
                </CardContent>
            </Card>
            <Card v-if="isElectron" class="bg-background shadow-md dark:shadow-lg">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <Monitor class="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Preferences</CardTitle>
                            <CardDescription class="mt-1">
                                Manage general application behavior.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="grid gap-6">
                    <div class="flex items-center justify-between space-x-2">
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-2">
                                <Save class="w-4 h-4 text-muted-foreground" />
                                <Label class="text-base">Auto Save</Label>
                            </div>
                            <p class="text-sm text-muted-foreground">
                                Automatically save changes as you work.
                            </p>
                        </div>
                        <Checkbox :checked="settings.autoSave" @update:checked="(v: any) => settings.autoSave = v" />
                    </div>
                    <div class="flex items-center justify-between space-x-2">
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-2">
                                <Bell class="w-4 h-4 text-muted-foreground" />
                                <Label class="text-base">Notifications</Label>
                            </div>
                            <p class="text-sm text-muted-foreground">
                                Enable system notifications for events.
                            </p>
                        </div>
                        <Checkbox :checked="settings.notifications"
                            @update:checked="(v: any) => settings.notifications = v" />
                    </div>
                    <div class="space-y-3">
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-2">
                                <Clock class="w-4 h-4 text-muted-foreground" />
                                <Label class="text-base">Auto Lock Timeout</Label>
                            </div>
                            <p class="text-sm text-muted-foreground">
                                Automatically lock the application after a period of inactivity.
                            </p>
                        </div>
                        <div class="relative w-full sm:w-64">
                            <Select v-model="settings.lockScreen">
                                <SelectTrigger class="w-[250px]">
                                    <SelectValue placeholder="Select minutes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Minutes</SelectLabel>
                                        <SelectItem v-for="option in lockTimeOptions" :key="option.value"
                                            :value="option.value">
                                            {{ option.label }}
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <div
                                class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                    stroke-linejoin="round" class="h-4 w-4">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card class="bg-background shadow-md dark:shadow-lg">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <User class="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Account</CardTitle>
                            <CardDescription class="mt-1">
                                View your personal information.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="grid gap-6 md:grid-cols-2">
                    <div class="space-y-1">
                        <Label>Full Name</Label>
                        <div
                            class="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                            {{ user?.name || 'Not Available' }}
                        </div>
                    </div>
                    <div class="space-y-1">
                        <Label>Username</Label>
                        <div
                            class="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                            {{ user?.username || 'Not Available' }}
                        </div>
                    </div>
                    <div class="space-y-1 md:col-span-2">
                        <Label>Email</Label>
                        <div
                            class="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                            {{ user?.email || 'Not Available' }}
                        </div>
                    </div>
                </CardContent>
                <CardFooter class="border-t bg-muted/20 px-6 py-4">
                    <Button variant="outline"
                        class="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        @click="handleLogout">
                        <LogOut class="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </CardFooter>
            </Card>
            <Card class="bg-background shadow-md dark:shadow-lg">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <Shield class="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Security</CardTitle>
                            <CardDescription class="mt-1">
                                Manage application security and access.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-2">
                                <Lock class="w-4 h-4 text-muted-foreground" />
                                <Label class="text-base">Lock Application</Label>
                            </div>
                            <p class="text-sm text-muted-foreground">
                                Instantly lock the application to prevent unauthorized access.
                            </p>
                        </div>
                        <Button variant="default" @click="handleLock">
                            Lock Now
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</template>
