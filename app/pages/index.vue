<script setup lang="ts">
import { navigateTo, definePageMeta, useHead } from '#imports';


useHead({
    title: 'Loading Components...'
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
