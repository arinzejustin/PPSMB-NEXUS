<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useHead, useRuntimeConfig, navigateTo } from 'nuxt/app';
import { CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PinInput, PinInputGroup, PinInputSlot } from '@/components/ui/pin-input';
import { ChevronRight, ChevronLeft } from "lucide-vue-next";
import type { LoginAuth } from "@/types/index"


const env = useRuntimeConfig();

// Page meta
definePageMeta({
    layout: "auth"
});

useHead({
    title: env.public.appType === 'desktop' ? 'PPSMB Staff Manager' : 'Login - PPSMB Staff Manager'
});

const form = reactive({
    identifier: '',
    password: '',
    rememberMe: false
});

const isLoading = ref(false);
const showPassword = ref(false);
const formSubmitted = ref(false);
const hasSetPin = ref(true)
const showPinModal = ref(false)
const pinStep = ref<'set' | 'confirm'>('set')
const pinValue = ref<number[]>([])
const confirmPinValue = ref<number[]>([])
const pinError = ref('')
const isPinLoading = ref(false)

const handlePinComplete = (value: number[]) => {
    if (pinStep.value === 'set') {
        pinValue.value = value
    } else {
        confirmPinValue.value = value
    }
}

const goToConfirmStep = () => {
    if (pinValue.value.length === 4 && pinValue.value.every(v => v !== null)) {
        pinError.value = ''
        pinStep.value = 'confirm'
        confirmPinValue.value = []
    } else {
        pinError.value = 'Please enter a 4-digit PIN'
    }
}

const goBackToSetStep = () => {
    pinStep.value = 'set'
    confirmPinValue.value = []
    pinError.value = ''
}

const submitPin = async () => {
    const pin = pinValue.value.join('')
    const confirmPin = confirmPinValue.value.join('')

    if (confirmPinValue.value.length !== 4 || confirmPinValue.value.some(v => v === null)) {
        pinError.value = 'Please enter a 4-digit PIN'
        return
    }

    if (pin !== confirmPin) {
        pinError.value = 'PINs do not match. Please try again.'
        confirmPinValue.value = []
        return
    }

    isPinLoading.value = true
    pinError.value = ''

    try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('PIN set successfully:', pin)

        hasSetPin.value = true
        showPinModal.value = false

        pinStep.value = 'set'
        pinValue.value = []
        confirmPinValue.value = []
    } catch (error: any) {
        pinError.value = error.message || 'Failed to set PIN. Please try again.'
    } finally {
        isPinLoading.value = false
    }
}

watch(hasSetPin, (value) => {
    if (!value) {
        showPinModal.value = true
    }
}, { immediate: true })

const isPinStepValid = computed(() => {
    if (pinStep.value === 'set') {
        return pinValue.value.length === 4 && pinValue.value.every(v => v !== null)
    }
    return confirmPinValue.value.length === 4 && confirmPinValue.value.every(v => v !== null)
})

const errors = reactive({
    identifier: '',
    password: '',
    general: ''
});

const isEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
};

const validateIdentifier = (): boolean => {
    if (!form.identifier.trim()) {
        errors.identifier = 'Email or username is required';
        return false;
    }

    if (form.identifier.includes('@') && !isEmail(form.identifier)) {
        errors.identifier = 'Please enter a valid email address';
        return false;
    }
    if (form.identifier.length < 3) {
        errors.identifier = 'Must be at least 3 characters';
        return false;
    }
    errors.identifier = '';
    return true;
};

const validatePassword = (): boolean => {
    if (!form.password) {
        errors.password = 'Password is required';
        return false;
    }
    if (form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
        return false;
    }
    errors.password = '';
    return true;
};

const validateForm = (): boolean => {
    const isIdentifierValid = validateIdentifier();
    const isPasswordValid = validatePassword();
    return isIdentifierValid && isPasswordValid;
};

const onIdentifierBlur = () => {
    if (formSubmitted.value || form.identifier) {
        validateIdentifier();
    }
};

const onPasswordBlur = () => {
    if (formSubmitted.value || form.password) {
        validatePassword();
    }
};

const clearError = (field: 'identifier' | 'password' | 'general') => {
    errors[field] = '';
};

const handleSubmit = async () => {
    formSubmitted.value = true;
    errors.general = '';

    if (!validateForm()) {
        return;
    }

    isLoading.value = true;

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('Login attempt:', {
            identifier: form.identifier,
            rememberMe: form.rememberMe
        });

        hasSetPin.value = false;
        showPinModal.value = true

        //navigateTo('/dashboard');

    } catch (error: any) {
        errors.general = error.message || 'An error occurred. Please try again.';
    } finally {
        isLoading.value = false;
    }
};


const isButtonDisabled = computed(() => {
    return isLoading.value || !form.identifier || !form.password;
});

</script>

<template>
    <div class="w-full max-w-md px-4 animate-fadeIn">
        <div class="border-0 bg-transparent backdrop-blur-sm">
            <div class="space-y-1 pb-6 mt-1">
                <div class="flex justify-center mb-4">
                    <div
                        class="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-primary-foreground" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                </div>
                <CardTitle class="text-2xl font-inter uppercase mb-1 font-bold text-center">
                    Welcome back
                </CardTitle>
                <CardDescription class="text-center text-base text-muted-foreground font-app">
                    Enter your credentials to access your account
                </CardDescription>
            </div>
            <CardContent>
                <form @submit.prevent="handleSubmit" class="space-y-5">
                    <div v-if="errors.general"
                        class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ errors.general }}
                    </div>
                    <div class="space-y-4">
                        <Label for="identifier" class="text-sm font-medium">
                            Email or Username
                        </Label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <Input id="identifier" v-model="form.identifier" type="text"
                                placeholder="Enter email or username" class="pl-10 h-11 bg-background/50"
                                :class="{ 'border-destructive focus-visible:ring-destructive': errors.identifier }"
                                @blur="onIdentifierBlur" @focus="clearError('identifier')" autocomplete="username" />
                        </div>
                        <p v-if="errors.identifier" class="text-xs text-destructive flex items-center gap-1 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.identifier }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label for="password" class="text-sm font-medium">
                                Password
                            </Label>
                            <NuxtLink to="/forgot-password"
                                class="text-xs text-primary hover:text-primary/80 hover:underline transition-colors">
                                Forgot password?
                            </NuxtLink>
                        </div>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <Input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
                                placeholder="Enter your password" class="pl-10 pr-10 h-11 bg-background/50"
                                :class="{ 'border-destructive focus-visible:ring-destructive': errors.password }"
                                @blur="onPasswordBlur" @focus="clearError('password')"
                                autocomplete="current-password" />
                            <button type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                @click="showPassword = !showPassword">
                                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            </button>
                        </div>
                        <p v-if="errors.password" class="text-xs text-destructive flex items-center gap-1 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.password }}
                        </p>
                    </div>
                    <div class="flex items-center space-x-2 mb-3">
                        <Checkbox id="remember" :checked="form.rememberMe"
                            @update:checked="(val: boolean) => form.rememberMe = val" />
                        <Label for="remember" class="text-sm font-normal text-muted-foreground cursor-pointer">
                            Remember me for 30 days
                        </Label>
                    </div>
                    <Button type="submit"
                        class="w-full h-11 text-sm font-semibold relative overflow-hidden group app-btn"
                        :disabled="isButtonDisabled">
                        <span v-if="!isLoading" class="flex items-center justify-center gap-2">
                            Sign in
                            <ChevronRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
                            Signing in...
                        </span>
                    </Button>
                </form>
            </CardContent>
            <CardFooter class="flex flex-col space-y-4 pt-2">
                <div class="relative w-full">
                    <div class="absolute inset-0 flex items-center">
                        <span class="w-full border-t border-border"></span>
                    </div>
                    <div class="relative flex justify-center text-xs uppercase">
                        <span class="bg-muted px-2 text-muted-foreground font-app text-xs font-medium">New to the
                            platform?</span>
                    </div>
                </div>
                <p class="text-sm text-center text-muted-foreground">
                    Contact your administrator for account access
                </p>
            </CardFooter>
        </div>
        <p class="text-xs text-center text-muted-foreground/60 mt-5 flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured connection
        </p>
        <Dialog :open="showPinModal && !hasSetPin" @update:open="(val) => showPinModal = val">
            <DialogContent class="sm:max-w-md" :hideClose="true">
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
                        {{ pinStep === 'set' ? 'Set Your PIN' : 'Confirm Your PIN' }}
                    </DialogTitle>
                    <DialogDescription class="text-center text-muted-foreground">
                        {{ pinStep === 'set' ? 'Create a 4-digit PIN to secure your account' : 'Re-enter your PIN to confirm' }}
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

                    <PinInput v-if="pinStep === 'set'" :key="'set-pin'" v-model="pinValue" placeholder="0" type="number"
                        :length="4" @complete="handlePinComplete" class="">
                        <PinInputGroup class="gap-3">
                            <PinInputSlot v-for="(slot, index) in 4" :key="index" :index="index"
                                class="w-12 h-14 text-base font-semibold border-2 rounded-md bg-background/50 transition-all" />
                        </PinInputGroup>
                    </PinInput>

                    <PinInput v-if="pinStep === 'confirm'" :key="'confirm-pin'" v-model="confirmPinValue"
                        placeholder="0" type="number" :length="4" @complete="handlePinComplete">
                        <PinInputGroup class="gap-3">
                            <PinInputSlot v-for="(slot, index) in 4" :key="index" :index="index"
                                class="w-12 h-14 text-base font-semibold border-2 rounded-md bg-background/50 transition-all"
                                :class="{ 'border-destructive': pinError }" />
                        </PinInputGroup>
                    </PinInput>

                    <p v-if="pinError" class="text-sm text-destructive flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ pinError }}
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
                        <Button type="button" class="w-full sm:w-auto" :disabled="!isPinStepValid || isPinLoading"
                            @click="submitPin">
                            <span v-if="!isPinLoading" class="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Set PIN
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
                                Setting PIN...
                            </span>
                        </Button>
                    </template>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>