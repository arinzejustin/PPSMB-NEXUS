<script setup lang="ts">
import { navigateTo, definePageMeta, useHead, computed, useRuntimeConfig } from '#imports';

const env = useRuntimeConfig();
const isDesktop = computed(() => env.public.appType === 'desktop');

useHead({
    title: isDesktop.value ? 'PPSMB Staff Manager' : 'Loading Components...'
});

definePageMeta({
    middleware: ['user-validate']
})

navigateTo('/dashboard')

</script>

<template>
    <div class="flex items-center justify-center h-screen">
        <p class="text-lg font-medium text-muted-foreground">Loading Components...</p>
    </div>
</template>
