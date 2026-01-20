<script setup lang="ts">
import { useTheme } from '~/composables/useTheme';
import { Monitor, Moon, Sun } from 'lucide-vue-next';

const { theme, setTheme } = useTheme();

const themes = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
    { id: 'system', name: 'System', icon: Monitor },
] as const;
</script>

<template>
    <div class="grid grid-cols-3 gap-2">
        <button v-for="t in themes" :key="t.id" @click="setTheme(t.id)"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 transition-all" :class="[
                theme === t.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent bg-muted hover:bg-muted/80 text-foreground'
            ]">
            <component :is="t.icon" class="size-4" />
            <span class="text-xs font-medium">{{ t.name }}</span>
        </button>
    </div>
</template>
