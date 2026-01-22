<script lang="ts">
import { defineComponent } from 'vue';
import { useRoute, navigateTo, useHead, useRuntimeConfig, definePageMeta, useUser, logOut } from '#imports';
import { useLockWindow } from '@/composables/useLockWindow';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PinInput, PinInputGroup, PinInputSlot } from '@/components/ui/pin-input';
import { ChevronRight, ClockFading, CircleAlert, LockKeyhole, LogIn } from 'lucide-vue-next';
import { setStorage, getStorage, deleteStorage } from '@/lib/storage';

export default defineComponent({
    setup() {
        const env = useRuntimeConfig();
        const user = useUser()
        const { lockSession, unLockSession } = useLockWindow()

        definePageMeta({
            layout: 'auth'
        });

        useHead({
            title: env.public.appType === 'desktop' ? 'PPSMB Staff Manager' : 'Unlock - PPSMB Staff Manager'
        });

        return {
            user,
            lockSession,
            unLockSession
        }
    },

    components: {
        CardTitle,
        CardDescription,
        Button,
        PinInput,
        PinInputGroup,
        PinInputSlot,
        ChevronRight,
        ClockFading,
        CircleAlert,
        LockKeyhole,
        LogIn
    },

    data() {
        return {
            pinValue: [] as number[],
            pinError: '',
            isLoading: false,
            errCount: 0,
            lockoutEndTime: null as number | null,
            remainingTime: 0,
            lockoutTimer: null as ReturnType<typeof setInterval> | null,
            LOCKOUT_DURATION: 10 * 60 * 1000,
            MAX_ATTEMPTS: 6,
        };
    },

    computed: {
        isLockedOut(): boolean {
            return this.lockoutEndTime !== null && this.remainingTime > 0;
        },

        redirectUrl(): string {
            const route = useRoute();
            return (route.query.redirect as string) || '/';
        }
    },

    watch: {
        errCount(count: number) {
            if (count >= this.MAX_ATTEMPTS && !this.lockoutEndTime) {
                this.lockoutEndTime = Date.now() + this.LOCKOUT_DURATION;
                this.remainingTime = this.LOCKOUT_DURATION;
                this.startLockoutTimer();
            }
        },

        lockoutEndTime(endTime: number | null) {
            if (endTime) {
                setStorage('pinLockoutEnd', endTime.toString());
            } else {
                deleteStorage('pinLockoutEnd');
            }
        }
    },

    mounted() {
        if (!import.meta.client) return;

        if (!window.electronAPI || !this.user) {
            return navigateTo('/login');
        }

        const storedLockout = getStorage<string | null>('pinLockoutEnd');
        if (storedLockout) {
            const lockoutEnd = parseInt(storedLockout, 10);
            if (lockoutEnd > Date.now()) {
                this.lockoutEndTime = lockoutEnd;
                this.remainingTime = lockoutEnd - Date.now();
                this.errCount = this.MAX_ATTEMPTS;
                this.startLockoutTimer();
            } else {
                deleteStorage('pinLockoutEnd');
            }
        }
    },

    unmounted() {
        if (this.lockoutTimer) {
            clearInterval(this.lockoutTimer);
        }
    },

    methods: {
        formatTime(ms: number): string {
            const totalSeconds = Math.ceil(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },

        startLockoutTimer() {
            if (this.lockoutTimer) clearInterval(this.lockoutTimer);

            this.lockoutTimer = setInterval(() => {
                if (this.lockoutEndTime) {
                    const remaining = this.lockoutEndTime - Date.now();
                    if (remaining <= 0) {
                        this.lockoutEndTime = null;
                        this.remainingTime = 0;
                        this.errCount = 0;
                        this.pinError = '';
                        if (this.lockoutTimer) clearInterval(this.lockoutTimer);
                    } else {
                        this.remainingTime = remaining;
                    }
                }
            }, 1000);
        },

        handlePinComplete(value: number[]) {
            this.pinValue = value;
            if (value.length === 4 && value.every(v => v !== null)) {
                this.verifyPin();
            }
        },

        async verifyPin() {
            if (this.isLockedOut) {
                this.pinError = `Too many attempts. Try again in ${this.formatTime(this.remainingTime)}`;
                return;
            }

            if (this.pinValue.length !== 4 || this.pinValue.some(v => v === null)) {
                this.pinError = 'Please enter a 4-digit PIN';
                return;
            }

            if (!this.user) {
                this.pinError = "Access denied!"
                return;
            }

            this.isLoading = true;
            this.pinError = '';

            try {
                const pin = this.pinValue.join('');

                await new Promise(resolve => setTimeout(resolve, 800));

                const validData = await window.electronAPI.verifyPin(pin, this.user?.uuid);

                if (validData) {
                    this.user = validData;
                    this.unLockSession();
                    await navigateTo(this.redirectUrl);
                } else {
                    this.errCount++;
                    if (this.errCount >= this.MAX_ATTEMPTS) {
                        this.pinError = `Too many attempts. Try again in ${this.formatTime(this.LOCKOUT_DURATION)}`;
                    } else {
                        this.pinError = `Incorrect PIN. ${this.MAX_ATTEMPTS - this.errCount} attempts remaining.`;
                    }
                    this.pinValue = [];
                }
            } catch (error: any) {
                this.pinError = error.message || 'Verification failed. Please try again.';
                this.pinValue = [];
            } finally {
                this.isLoading = false;
            }
        },

        async handleLogout() {
            await logOut();
            deleteStorage("userDetails");
            navigateTo('/login');
        }
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
                    Welcome, {{ user?.name ? user.name.split(" ")[0] : "Staff" }}
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
                    <NuxtLink v-if="pinError === 'Access denied!'" to="/login"
                        class="text-sm text-primary font-semibold hover:underline my-0 py-0 mb-1 pb-2">
                        Try Login Again
                    </NuxtLink>

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