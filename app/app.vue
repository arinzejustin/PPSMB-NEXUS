<script lang="ts">
import { defineComponent } from 'vue';
import { ArrowDownIcon } from 'lucide-vue-next'
import { Button } from "@/components/ui/button";

export default defineComponent({
  components: {
    ArrowDownIcon,
    Button
  },
  setup() {
    return {};
  },

  data() {
    return {
      updateStatus: "idle" as "idle" | "downloading" | "available" | "ready",
      downloadProgress: 0,
      version: ""
    }
  },

  methods: {
    download() {
      window.electronAPI.startDownload();
    },
    install() {
      window.electronAPI.confirmInstall();
    }
  },

  mounted() {
    window.electronAPI.onUpdateAvailable((v: string) => {
      this.version = v;
      this.updateStatus = "available";
    });

    window.electronAPI.onUpdateProgress((p: number) => {
      this.updateStatus = 'downloading';
      this.downloadProgress = Math.round(p);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      this.updateStatus = 'ready';
    });
  }
});
</script>
<template>
  <div class="bg-background min-h-screen">
    <NuxtLayout class="flex">
      <NuxtPage />
    </NuxtLayout>
    <div v-if="updateStatus !== 'idle'"
      class="fixed bottom-1 right-4 z-50 border border-border rounded-lg shadow-md hover:shadow-1 p-2 bg-primary text-foreground flex items-center gap-2">
      <div v-if="updateStatus === 'available'">
        <ArrowDownIcon class="w-4 h-4" />
        <h2 class="text-foreground text-base">New version available ({{ version }})</h2>
        <div class="flex flex-end w-full flex-1 gap-x-3">
          <Button @click="download()" class="app-btn">Download</Button>
          <Button variant="outline" @click="updateStatus = 'idle'">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
</template>
