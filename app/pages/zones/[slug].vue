<script setup lang="ts">
import { definePageMeta, useHead } from '#imports';


useHead({
    title: 'Loading Components...'
});

definePageMeta({
    middleware: ['user-validate'],
    layout: "app"
})


</script>

<template>
    <div class="flex items-center justify-center h-screen">
        <p class="text-lg font-medium text-muted-foreground">Loading Components...</p>
    </div>
</template>
