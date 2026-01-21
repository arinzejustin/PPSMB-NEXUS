<script setup lang="ts">
import { ref, onMounted } from '#imports';
import { useTheme } from '~/composables/useTheme';
import { Monitor, Moon, Sun } from 'lucide-vue-next';
import { getStorage, setStorage } from '@/lib/storage';
import type { Theme } from '~/types';

const { theme, setTheme } = useTheme();
let refTheme = ref("system");

const themes = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
    { id: 'system', name: 'System', icon: Monitor },
] as const;

const setGlobalTheme = (val: Theme) => {
    if (window.electronAPI) {
        setTheme(val);
        refTheme.value = theme.value;
    } else {
        setStorage("theme", val);
        if (val === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.className = isDark ? 'dark' : 'light';
        } else {
            document.documentElement.className = val;
        }
        refTheme.value = val;
    }
}

onMounted(() => {
    if (window.electronAPI) {
        refTheme.value = theme.value;
    } else {
        refTheme.value = getStorage("theme") || "system";
    }
});
</script>

<template>
    <div class="grid grid-cols-3 gap-2">
        <button v-for="t in themes" :key="t.id" @click="setGlobalTheme(t.id)"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 transition-all" :class="[
                refTheme === t.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent bg-muted hover:bg-muted/80 text-foreground'
            ]">
            <component :is="t.icon" class="size-4" />
            <span class="text-xs font-medium">{{ t.name }}</span>
        </button>
    </div>
</template>
