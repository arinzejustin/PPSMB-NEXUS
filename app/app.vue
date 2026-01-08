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
      updateStatus: "available" as "idle" | "downloading" | "available" | "ready",
      downloadProgress: 0,
      version: "0.11.4"
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
    if (window.electronAPI) {
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
  }
});
</script>
<template>
  <div class="bg-muted min-h-screen">
    <NuxtLayout class="flex">
      <NuxtPage />
    </NuxtLayout>
    <div v-if="updateStatus !== 'idle'"
      class="fixed bottom-6 right-4 z-50 border border-border rounded-lg shadow-lg hover:shadow-1 p-2 bg-background text-foreground flex items-center gap-2 min-h-28 min-w-72">
      <div v-if="updateStatus === 'available'" class="w-full space-y-6 py-1 px-3">
        <h2 class="text-foreground text-base">New version available ({{ version }})</h2>
        <div class="flex justify-end w-full flex-1 gap-x-3">
          <Button @click="download()" class="app-btn cursor-pointer hover:shadow-lg">
            Download
            <ArrowDownIcon class="size-4" />
          </Button>
          <Button variant="ghost" @click="updateStatus = 'idle'">Cancel</Button>
        </div>
      </div>
    </div>
  </div>
</template>
