<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, navigateTo, useHead, useRuntimeConfig, definePageMeta, useUser, clearNuxtData } from '#imports';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PinInput, PinInputGroup, PinInputSlot } from '@/components/ui/pin-input';
import { ChevronRight, ClockFading, CircleAlert, LockKeyhole, LogIn } from 'lucide-vue-next';
import { setStorage, getStorage, deleteStorage } from '@/lib/storage';

const env = useRuntimeConfig();

definePageMeta({
    layout: 'auth'
});

useHead({
    title: env.public.appType === 'desktop' ? 'PPSMB Staff Manager' : 'Unlock - PPSMB Staff Manager'
});

const route = useRoute();

const pinValue = ref<number[]>([]);
const pinError = ref('');
const isLoading = ref(false);
const errCount = ref(0);
const user = useUser();


const lockoutEndTime = ref<number | null>(null);
const remainingTime = ref(0);
let lockoutTimer: ReturnType<typeof setInterval> | null = null;

const LOCKOUT_DURATION = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;

const isLockedOut = computed(() => {
    return lockoutEndTime.value !== null && remainingTime.value > 0;
});

const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const startLockoutTimer = () => {
    if (lockoutTimer) clearInterval(lockoutTimer);

    lockoutTimer = setInterval(() => {
        if (lockoutEndTime.value) {
            const remaining = lockoutEndTime.value - Date.now();
            if (remaining <= 0) {
                lockoutEndTime.value = null;
                remainingTime.value = 0;
                errCount.value = 0;
                pinError.value = '';
                if (lockoutTimer) clearInterval(lockoutTimer);
            } else {
                remainingTime.value = remaining;
            }
        }
    }, 1000);
};

watch(errCount, (count) => {
    if (count >= MAX_ATTEMPTS && !lockoutEndTime.value) {
        lockoutEndTime.value = Date.now() + LOCKOUT_DURATION;
        remainingTime.value = LOCKOUT_DURATION;
        startLockoutTimer();
    }
});

onMounted(() => {
    const storedLockout = getStorage<string | null>('pinLockoutEnd');
    if (storedLockout) {
        const lockoutEnd = parseInt(storedLockout, 10);
        if (lockoutEnd > Date.now()) {
            lockoutEndTime.value = lockoutEnd;
            remainingTime.value = lockoutEnd - Date.now();
            errCount.value = MAX_ATTEMPTS;
            startLockoutTimer();
        } else {
            deleteStorage('pinLockoutEnd');
        }
    }
});

watch(lockoutEndTime, (endTime) => {
    if (endTime) {
        setStorage('pinLockoutEnd', endTime.toString());
    } else {
        deleteStorage('pinLockoutEnd');
    }
});

onUnmounted(() => {
    if (lockoutTimer) clearInterval(lockoutTimer);
});

const redirectUrl = computed(() => {
    return (route.query.redirect as string) || '/';
});

const handlePinComplete = (value: number[]) => {
    pinValue.value = value;
    if (value.length === 4 && value.every(v => v !== null)) {
        verifyPin();
    }
};

const verifyPin = async () => {
    if (isLockedOut.value) {
        pinError.value = `Too many attempts. Try again in ${formatTime(remainingTime.value)}`;
        return;
    }

    if (pinValue.value.length !== 4 || pinValue.value.some(v => v === null)) {
        pinError.value = 'Please enter a 4-digit PIN';
        return;
    }

    isLoading.value = true;
    pinError.value = '';

    try {
        const pin = pinValue.value.join('');

        await new Promise(resolve => setTimeout(resolve, 800));

        const validData = await window.electronAPI.verifyPin(pin, user?.uuid);

        if (validData) {
            user.value = validData;
            await navigateTo(redirectUrl.value);
        } else {
            errCount.value++;
            if (errCount.value >= MAX_ATTEMPTS) {
                pinError.value = `Too many attempts. Try again in ${formatTime(LOCKOUT_DURATION)}`;
            } else {
                pinError.value = `Incorrect PIN. ${MAX_ATTEMPTS - errCount.value} attempts remaining.`;
            }
            pinValue.value = [];
        }
    } catch (error: any) {
        pinError.value = error.message || 'Verification failed. Please try again.';
        pinValue.value = [];
    } finally {
        isLoading.value = false;
    }
};

const handleLogout = () => {
    deleteStorage("userDetails")
    clearNuxtData();
    navigateTo('/login');
};

onMounted(() => {
    if (!import.meta.client) return;
    if (!window.electronAPI) {
        navigateTo('/login');
    }
});
</script>

<template>
    <div class="w-full max-w-md px-4 animate-fadeIn">
        <div class="border-0 bg-transparent backdrop-blur-sm">
            <div class="space-y-1 pb-6 mt-1 text-center">
                <div class="flex justify-center mb-4">
                    <div
                        class="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                        <LockKeyhole class="w-8 h-8 text-primary-foreground" />
                    </div>
                </div>

                <CardTitle class="text-2xl font-inter uppercase mb-1 font-bold text-center">
                    Welcome, {{ user?.name.split(" ")[0] }}
                </CardTitle>
                <CardDescription class="text-center font-app text-base text-muted-foreground font-app">
                    Enter your PIN to continue
                </CardDescription>
            </div>

            <div class="flex flex-col items-center py-6 pt-2 space-y-6">
                <div v-if="isLockedOut" class="flex flex-col items-center gap-3 py-4">
                    <div class="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                        <ClockFading class="w-10 h-10 text-destructive" />
                    </div>
                    <p class="text-sm text-muted-foreground text-center">Too many failed attempts</p>
                    <div class="text-3xl font-bold text-destructive font-mono tracking-wider">
                        {{ formatTime(remainingTime) }}
                    </div>
                    <p class="text-xs text-muted-foreground">Please wait before trying again</p>
                </div>
                <template v-else>
                    <PinInput v-model="pinValue" placeholder="●" type="number" :length="4" :disabled="isLoading"
                        @complete="handlePinComplete">
                        <PinInputGroup class="gap-3">
                            <PinInputSlot v-for="(_, index) in 4" :key="index" :index="index"
                                class="w-14 h-16 text-xl font-semibold border-2 rounded-md bg-background/50 transition-all"
                                :class="{ 'border-destructive': pinError }" />
                        </PinInputGroup>
                    </PinInput>

                    <p v-if="pinError" class="text-sm text-destructive flex items-center gap-1.5">
                        <CircleAlert class="w-4 h-4" />
                        {{ pinError }}
                    </p>

                    <Button type="button"
                        class="w-full max-w-xs h-11 text-sm font-semibold relative overflow-hidden group app-btn"
                        :disabled="pinValue.length !== 4 || isLoading" @click="verifyPin">
                        <span v-if="!isLoading" class="flex items-center justify-center gap-2">
                            Unlock
                            <ChevronRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                        <span v-else class="flex items-center justify-center gap-2">
                            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                                viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4">
                                </circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            Verifying...
                        </span>
                    </Button>
                </template>
            </div>

            <div class="pt-4 border-t border-border/50">
                <p class="text-sm text-center text-muted-foreground mb-3">
                    Not you?
                </p>
                <Button variant="ghost" class="w-full cursor-pointer text-muted-foreground hover:text-primary"
                    @click="handleLogout">
                    <LogIn class="w-4 h-4 mr-2" />
                    Sign in with a different account
                </Button>
            </div>
        </div>

        <p class="text-xs text-center text-muted-foreground/60 mt-5 flex items-center justify-center gap-1">
            <LockKeyhole class="w-3 h-3" />
            Session locked for security
        </p>
    </div>
</template>