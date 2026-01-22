<script setup lang="ts">
import AppSidebar from '@/components/app/AppSidebar.vue';
import { ref } from '#imports';


const isCollapsed = ref(true)

const handleCollapsed = (value: boolean) => {
  isCollapsed.value = value
}
</script>

<template>
  <div class="min-h-screen bg-muted">
    <AppSidebar @is-collapsed="handleCollapsed" />
    <main class="min-h-screen transition-all duration-300 overflow-x-hidden"
      :class="isCollapsed ? 'pl-6 lg:pl-[80px]' : 'pl-[70px] lg:pl-[280px]'">
      <div class="p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
@media (max-width: 1024px) {
  main {
    padding-left: 70px;
  }
}
</style>
