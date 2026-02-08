<script lang="ts">
import { defineComponent } from 'vue';
import { openBrowser } from '~/utils/urlHandler';

export default defineComponent({
    props: {
        width: {
            type: String,
            default: "60%"
        }
    },
    methods: {
        openBrowser,
    }
})
</script>

<template>
    <div :style="{ width }"
        class="side-layer min-h-screen hidden rounded-r-xl lg:block w-full fixed top-0 left-0 z-50 overflow-hidden">
        <!-- Animated Gradient Background -->
        <div class="absolute inset-0 bg-gradient-animated"></div>

        <!-- Decorative SVG Wave Pattern -->
        <svg class="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="currentColor" class="text-white"
                d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
                <animate attributeName="d" dur="10s" repeatCount="indefinite"
                    values="
                    M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                    M0,128L48,144C96,160,192,192,288,197.3C384,203,480,181,576,165.3C672,149,768,139,864,160C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                    M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            </path>
        </svg>

        <!-- Floating Geometric Shapes -->
        <div class="floating-shapes">
            <div class="shape shape-1"></div>
            <div class="shape shape-2"></div>
            <div class="shape shape-3"></div>
            <div class="shape shape-4"></div>
            <div class="shape shape-5"></div>
            <div class="shape shape-6"></div>
        </div>

        <div class="relative z-10 flex justify-center items-center flex-col gap-y-6 min-h-screen">
            <div class="logo-container">
                <div class="logo-glow"></div>
                <div class="logo-ring"></div>
                <div
                    class="flex h-44 w-44 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-2xl relative z-10">
                    <img src="/logo.png" alt="Logo" class="w-full p-3 h-full object-contain" />
                </div>
            </div>
            <div class="gap-y-4 flex flex-col items-center font-app text-center px-8 animate-fadeInUp">
                <p class="text-2xl font-semibold text-center text-white drop-shadow-lg leading-relaxed">
                    POST PRIMARY SCHOOL MANAGEMENT BOARD,
                    <br />ENUGU STATE.
                </p>
                <div class="h-px w-24 bg-linear-to-r from-transparent via-white/50 to-transparent my-2"></div>
                <p class="text-lg font-bold text-center text-white/90 tracking-wider uppercase">
                    File Management System
                </p>
            </div>
        </div>

        <div class="absolute bottom-6 right-6 z-20">
            <NuxtLink @click="openBrowser('https://axiolot.com.ng')" target="_blank"
                class="dev-link group flex items-center gap-2 text-xs font-app uppercase text-white/60 cursor-pointer transition-all duration-300 hover:text-white">
                <span class="relative">
                    Developed By
                    <span class="font-semibold ml-1">AXIOLOT HUB™</span>
                    <span
                        class="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
                </span>
                <svg class="w-4 h-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </NuxtLink>
        </div>

        <div class="absolute top-0 right-0 w-64 h-64 opacity-10">
            <div class="absolute top-8 right-8 w-32 h-32 border-2 border-white rounded-full"></div>
            <div class="absolute top-16 right-16 w-20 h-20 border border-white rounded-full"></div>
        </div>
    </div>
</template>

<style scoped>
.bg-gradient-animated {
    background: linear-gradient(-45deg,
            var(--primary),
            oklch(from var(--primary) l c h / 0.9),
            oklch(from var(--primary) l c h / 0.85),
            var(--primary));
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
}

.floating-shapes {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}

.shape {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    animation: float 20s infinite ease-in-out;
}

.shape-1 {
    width: 120px;
    height: 120px;
    top: 10%;
    left: 10%;
    animation-delay: 0s;
}

.shape-2 {
    width: 80px;
    height: 80px;
    top: 60%;
    left: 5%;
    animation-delay: -3s;
    animation-duration: 18s;
}

.shape-3 {
    width: 60px;
    height: 60px;
    top: 30%;
    right: 15%;
    animation-delay: -6s;
    animation-duration: 22s;
}

.shape-4 {
    width: 100px;
    height: 100px;
    bottom: 20%;
    right: 10%;
    animation-delay: -9s;
}

.shape-5 {
    width: 40px;
    height: 40px;
    top: 70%;
    left: 40%;
    animation-delay: -12s;
    animation-duration: 16s;
}

.shape-6 {
    width: 70px;
    height: 70px;
    top: 15%;
    right: 30%;
    animation-delay: -4s;
    animation-duration: 24s;
}

.logo-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-glow {
    position: absolute;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
    border-radius: 50%;
    animation: pulse 3s ease-in-out infinite;
}

.logo-ring {
    position: absolute;
    width: 220px;
    height: 220px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    animation: ringPulse 3s ease-in-out infinite;
}
</style>