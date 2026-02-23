<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useHead, navigateTo, useUser, useToken, definePageMeta, showToast, errorParser } from '#imports';
import { CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { useIsDesktop } from "@/composables/useIsDesktop";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronRight, ChevronLeft, UserPlus, Eye, EyeOff, Check } from "lucide-vue-next";
import type { LoginAuth } from "@/types/index";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

definePageMeta({
    layout: "auth"
});

// Block Electron/desktop access — registration is web-only
onMounted(() => {
    if (useIsDesktop()) {
        showToast('Registration is not available in the desktop app.', 'info');
        // navigateTo('/login');
    }
});

useHead({
    title: 'Register - PPSMB Staff Manager'
});

const user = useUser();
const token = useToken();

// Form state
const currentStep = ref(1);
const isLoading = ref(false);
const formSubmitted = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const form = reactive({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    department: '',
});

const errors = reactive({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    department: '',
    general: ''
});

// Available roles as specified
const roles = [
    { value: 'chairman', label: 'Chairman' },
    { value: 'asst_chairman', label: 'Asst. Chairman' },
    { value: 'chairman_secretary', label: 'Chairman Secretary' },
    { value: 'perm_sec', label: 'Perm. Secretary' },
    { value: 'director', label: 'Director' },
    { value: 'asst_director', label: 'Asst. Director' },
    { value: 'member', label: 'Member' },
];

// Available departments
const departments = [
    { value: "chairman's office", label: "Chairman's Office" },
    { value: "perm sec office", label: "Perm. Sec. Office" },
    { value: 'ict', label: 'ICT Department' },
    { value: 'finance', label: 'Finance Department' },
    { value: 'human resources', label: 'Human Resources' },
    { value: 'central registry', label: 'Central Registry' },
    { value: 'inspection', label: 'Inspection Department' },
    { value: 'planning', label: 'Planning & Statistics' },
    { value: 'personnel', label: 'Personnel Department' },
    { value: 'accounts', label: 'Accounts Department' },
    { value: 'admin', label: 'Admin/General Services' },
    { value: 'legal', label: 'Legal Department' },
    { value: 'training', label: 'Training & Development' },
    { value: 'procurement', label: 'Procurement Department' },
];

// Step 1 validations
const validateName = (): boolean => {
    if (!form.name.trim()) {
        errors.name = 'Full name is required';
        return false;
    }
    if (form.name.trim().split(' ').length < 2) {
        errors.name = 'Please enter your first and last name';
        return false;
    }
    errors.name = '';
    return true;
};

const validateEmail = (): boolean => {
    if (!form.email.trim()) {
        errors.email = 'Email is required';
        return false;
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
        errors.email = 'Please enter a valid email address';
        return false;
    }
    errors.email = '';
    return true;
};

const validateUsername = (): boolean => {
    if (!form.username.trim()) {
        errors.username = 'Username is required';
        return false;
    }
    if (form.username.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
        return false;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(form.username.trim())) {
        errors.username = 'Username can only contain letters, numbers, dots, hyphens and underscores';
        return false;
    }
    errors.username = '';
    return true;
};

// Step 2 validations
const validatePassword = (): boolean => {
    if (!form.password) {
        errors.password = 'Password is required';
        return false;
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
        return false;
    }
    errors.password = '';
    return true;
};

const validateConfirmPassword = (): boolean => {
    if (!form.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
        return false;
    }
    if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
        return false;
    }
    errors.confirmPassword = '';
    return true;
};

const validateRole = (): boolean => {
    if (!form.role) {
        errors.role = 'Please select a role';
        return false;
    }
    errors.role = '';
    return true;
};

const validateDepartment = (): boolean => {
    if (!form.department) {
        errors.department = 'Please select a department';
        return false;
    }
    errors.department = '';
    return true;
};

const validateStep1 = (): boolean => {
    const nameValid = validateName();
    const emailValid = validateEmail();
    const usernameValid = validateUsername();
    return nameValid && emailValid && usernameValid;
};

const validateStep2 = (): boolean => {
    const passwordValid = validatePassword();
    const confirmValid = validateConfirmPassword();
    const roleValid = validateRole();
    const departmentValid = validateDepartment();
    return passwordValid && confirmValid && roleValid && departmentValid;
};

const clearError = (field: keyof typeof errors): void => {
    errors[field] = '';
};

// Step navigation
const nextStep = () => {
    if (currentStep.value === 1 && validateStep1()) {
        currentStep.value = 2;
    }
};

const prevStep = () => {
    if (currentStep.value === 2) {
        currentStep.value = 1;
    }
};

// Form submission
const handleSubmit = async (): Promise<void> => {
    formSubmitted.value = true;
    errors.general = '';

    if (!validateStep2()) {
        return;
    }

    isLoading.value = true;

    try {
        const data = await $fetch<LoginAuth>("/api/auth/register", {
            method: "POST",
            body: {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                username: form.username.trim().toLowerCase(),
                password: form.password,
                role: form.role,
                department: form.department,
            },
            headers: {
                "x-auth-token": token.value || ""
            }
        });

        if (data.status) {
            user.value = {
                ...data.user,
                isAuthenticated: true,
                token: data.token,
                hasSetPin: data.hasSetPin,
            };

            showToast('Account created successfully!', 'success');
            await navigateTo('/');
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        errorParser(error as Error);
    } finally {
        isLoading.value = false;
    }
};

const isStep1Valid = computed(() => {
    return form.name.trim().split(' ').length >= 2 &&
        EMAIL_REGEX.test(form.email.trim()) &&
        form.username.trim().length >= 3;
});

const isStep2Valid = computed(() => {
    return form.password.length >= MIN_PASSWORD_LENGTH &&
        form.password === form.confirmPassword &&
        form.role !== '' &&
        form.department !== '';
});

// Password strength
const passwordStrength = computed(() => {
    const pw = form.password;
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
    return { score: 5, label: 'Excellent', color: 'bg-emerald-600' };
});
</script>

<template>
    <div class="w-full max-w-md px-4 animate-fadeIn">
        <div class="border-0 bg-transparent backdrop-blur-sm">
            <!-- Header -->
            <div class="space-y-1 pb-6 mt-1">
                <div class="flex justify-center mb-4">
                    <div
                        class="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                        <UserPlus class="w-8 h-8 text-primary-foreground" />
                    </div>
                </div>
                <CardTitle class="text-2xl font-inter uppercase mb-1 font-bold text-center">
                    Create Account
                </CardTitle>
                <CardDescription class="text-center text-base text-muted-foreground font-app">
                    Register for a new staff account
                </CardDescription>
            </div>

            <!-- Step Indicator -->
            <div class="flex items-center justify-center gap-2 mb-6">
                <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300"
                        :class="currentStep >= 1 ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'bg-muted text-muted-foreground'">
                        <Check v-if="currentStep > 1" class="w-4 h-4" />
                        <span v-else>1</span>
                    </div>
                    <span class="text-xs font-medium hidden sm:inline"
                        :class="currentStep >= 1 ? 'text-foreground' : 'text-muted-foreground'">Personal Info</span>
                </div>
                <div class="w-12 h-0.5 transition-colors duration-300"
                    :class="currentStep >= 2 ? 'bg-primary' : 'bg-border'"></div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300"
                        :class="currentStep >= 2 ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'bg-muted text-muted-foreground'">
                        2
                    </div>
                    <span class="text-xs font-medium hidden sm:inline"
                        :class="currentStep >= 2 ? 'text-foreground' : 'text-muted-foreground'">Role & Security</span>
                </div>
            </div>

            <CardContent>
                <!-- Step 1: Personal Info -->
                <form v-if="currentStep === 1" @submit.prevent="nextStep" class="space-y-5">
                    <div v-if="errors.general"
                        class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ errors.general }}
                    </div>

                    <!-- Full Name -->
                    <div class="space-y-2">
                        <Label for="name" class="text-sm font-medium">Full Name</Label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <Input id="name" v-model="form.name" type="text" placeholder="e.g. John Doe"
                                class="pl-10 h-11 bg-background/50"
                                :class="{ 'border-destructive focus-visible:ring-destructive': errors.name }"
                                @focus="clearError('name')" />
                        </div>
                        <p v-if="errors.name" class="text-xs text-destructive flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.name }}
                        </p>
                    </div>

                    <!-- Email -->
                    <div class="space-y-2">
                        <Label for="email" class="text-sm font-medium">Email Address</Label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <Input id="email" v-model="form.email" type="email" placeholder="e.g. john@ppsmb.edu.ng"
                                class="pl-10 h-11 bg-background/50"
                                :class="{ 'border-destructive focus-visible:ring-destructive': errors.email }"
                                @focus="clearError('email')" />
                        </div>
                        <p v-if="errors.email" class="text-xs text-destructive flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.email }}
                        </p>
                    </div>

                    <!-- Username -->
                    <div class="space-y-2">
                        <Label for="username" class="text-sm font-medium">Username</Label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                                </svg>
                            </div>
                            <Input id="username" v-model="form.username" type="text" placeholder="e.g. johndoe"
                                class="pl-10 h-11 bg-background/50"
                                :class="{ 'border-destructive focus-visible:ring-destructive': errors.username }"
                                @focus="clearError('username')" />
                        </div>
                        <p v-if="errors.username" class="text-xs text-destructive flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.username }}
                        </p>
                    </div>

                    <Button type="submit"
                        class="w-full h-11 text-sm font-semibold relative overflow-hidden group app-btn"
                        :disabled="!isStep1Valid">
                        <span class="flex items-center justify-center gap-2">
                            Continue
                            <ChevronRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                    </Button>
                </form>

                <!-- Step 2: Role & Security -->
                <form v-if="currentStep === 2" @submit.prevent="handleSubmit" class="space-y-5">
                    <!-- Role -->
                    <div class="space-y-2">
                        <Label for="role" class="text-sm font-medium">Role</Label>
                        <Select v-model="form.role" @update:model-value="clearError('role')">
                            <SelectTrigger id="role" class="h-11 bg-background/50"
                                :class="{ 'border-destructive': errors.role }">
                                <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="r in roles" :key="r.value" :value="r.value">
                                    {{ r.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p v-if="errors.role" class="text-xs text-destructive flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.role }}
                        </p>
                    </div>

                    <!-- Department -->
                    <div class="space-y-2">
                        <Label for="department" class="text-sm font-medium">Department</Label>
                        <Select v-model="form.department" @update:model-value="clearError('department')">
                            <SelectTrigger id="department" class="h-11 bg-background/50"
                                :class="{ 'border-destructive': errors.department }">
                                <SelectValue placeholder="Select your department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="d in departments" :key="d.value" :value="d.value">
                                    {{ d.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p v-if="errors.department" class="text-xs text-destructive flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.department }}
                        </p>
                    </div>

                    <!-- Password -->
                    <div class="space-y-2">
                        <Label for="password" class="text-sm font-medium">Password</Label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <Input id="password" v-model="form.password"
                                :type="showPassword ? 'text' : 'password'" placeholder="Create a password"
                                class="pl-10 pr-10 h-11 bg-background/50"
                                :class="{ 'border-destructive focus-visible:ring-destructive': errors.password }"
                                @focus="clearError('password')" autocomplete="new-password" />
                            <button type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                @click="showPassword = !showPassword">
                                <Eye v-if="!showPassword" class="w-4 h-4" />
                                <EyeOff v-else class="w-4 h-4" />
                            </button>
                        </div>
                        <!-- Password strength indicator -->
                        <div v-if="form.password" class="flex items-center gap-2 mt-1">
                            <div class="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500"
                                    :class="passwordStrength.color"
                                    :style="{ width: `${passwordStrength.score * 20}%` }"></div>
                            </div>
                            <span class="text-xs font-medium"
                                :class="passwordStrength.score <= 2 ? 'text-amber-500' : 'text-emerald-500'">
                                {{ passwordStrength.label }}
                            </span>
                        </div>
                        <p v-if="errors.password" class="text-xs text-destructive flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.password }}
                        </p>
                    </div>

                    <!-- Confirm Password -->
                    <div class="space-y-2">
                        <Label for="confirmPassword" class="text-sm font-medium">Confirm Password</Label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <Input id="confirmPassword" v-model="form.confirmPassword"
                                :type="showConfirmPassword ? 'text' : 'password'" placeholder="Re-enter your password"
                                class="pl-10 pr-10 h-11 bg-background/50"
                                :class="{ 'border-destructive focus-visible:ring-destructive': errors.confirmPassword }"
                                @focus="clearError('confirmPassword')" autocomplete="new-password" />
                            <button type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                @click="showConfirmPassword = !showConfirmPassword">
                                <Eye v-if="!showConfirmPassword" class="w-4 h-4" />
                                <EyeOff v-else class="w-4 h-4" />
                            </button>
                        </div>
                        <!-- Match indicator -->
                        <div v-if="form.confirmPassword && form.password === form.confirmPassword"
                            class="flex items-center gap-1 text-xs text-emerald-500">
                            <Check class="w-3 h-3" />
                            Passwords match
                        </div>
                        <p v-if="errors.confirmPassword"
                            class="text-xs text-destructive flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ errors.confirmPassword }}
                        </p>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3">
                        <Button type="button" variant="outline" class="flex-1 h-11" @click="prevStep">
                            <ChevronLeft class="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button type="submit"
                            class="flex-2 h-11 text-sm font-semibold relative overflow-hidden group app-btn"
                            :disabled="isLoading || !isStep2Valid">
                            <span v-if="!isLoading" class="flex items-center justify-center gap-2">
                                Create Account
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
                                Creating account...
                            </span>
                        </Button>
                    </div>
                </form>
            </CardContent>
        </div>
        <p class="text-xs text-center text-muted-foreground/60 mt-5 flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured connection
        </p>
    </div>
</template>
