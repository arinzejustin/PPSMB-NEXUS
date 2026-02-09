<script setup lang="ts">
import AppSidebar from '@/components/app/AppSidebar.vue';
import PrintProgressModal from '@/components/app/PrintProgressModal.vue';
import { ref, onMounted, onUnmounted } from '#imports';
import { useWebSocketConnection } from '@/composables/useWebSocket';
import { useAppCleanUp } from "@/composables/useAppCleanUp";
import { usePrinter } from "@/composables/usePrinter";
import { showToast } from '@/utils/toast';

const { connect } = useWebSocketConnection();
const { reprintJob } = usePrinter();

const isCollapsed = ref(true);
const isMobile = ref<InstanceType<typeof AppSidebar> | null>(null);

const handleCollapsed = (value: boolean) => {
  isCollapsed.value = value
}

const openMobileSideBar = () => {
  isMobile.value?.toggleCollapse()
}

const handleReprint = async (jobId: string) => {
  const reprint = await reprintJob(jobId);
  if (!reprint) {
    showToast("Failed to reprint", "error");
  }
}

onMounted(() => {
  connect();
});

onUnmounted(() => {
  useAppCleanUp();
})
</script>

<template>
  <div class="min-h-screen bg-muted">
    <AppSidebar @is-collapsed="handleCollapsed" ref="isMobile" />
    <main class="min-h-screen transition-all duration-300 overflow-x-hidden"
      :class="isCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[280px]'">
      <div @click="openMobileSideBar" :class="!isCollapsed ? '-left-30' : 'left-0'"
        class="fixed md:hidden top-3 h-12 flex justify-center items-center w-16 rounded-r-lg border bg-background/60 backdrop-blur-sm z-99999 transition-all duration-500">
        <svg class="size-6 text-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M3 5h8m-8 7h13M3 19h18" />
        </svg>
      </div>
      <div class="p-6">
        <slot />
      </div>
    </main>

    <PrintProgressModal @reprint="handleReprint" />
  </div>
</template>
