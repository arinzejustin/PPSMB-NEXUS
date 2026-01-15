<script lang="ts">
import { defineComponent } from 'vue';
import { navigateTo, useRuntimeConfig } from 'nuxt/app';
import { ArrowDownIcon, Code2Icon, UserSearch, CloudSync, FileScan, FilePlusCorner } from 'lucide-vue-next'
import { Button } from "@/components/ui/button";
import { Progress } from '@/components/ui/progress';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { getStorage, setStorage } from '@/lib/storage';
import { openBrowser } from '~/shared/urlHandler';
import type { UserDetails } from '~/shared/types'

export default defineComponent({
  components: {
    Button,
    Progress,
    ArrowDownIcon,
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
    Code2Icon, UserSearch, CloudSync, FileScan, FilePlusCorner
  },
  data() {
    return {
      status: "idle" as "idle" | "available" | "downloading" | "ready",
      progress: 0,
      version: "0.10",
      countdown: 60,
      timer: null as ReturnType<typeof setInterval> | null,
      off: [] as (() => void)[],
      menuOptions: {} as Record<string, boolean | number | string>,
      loading: true,
    };
  },

  methods: {
    openBrowser,
    navigateTo,
    download() {
      window.electronAPI?.startDownload();
    },

    install() {
      window.electronAPI?.confirmInstall();
    },

    checkUpdate() {
      window.electronAPI?.checkUpdate();
    },

    exitOrRestart(action: "exit" | "restart") {
      window.electronAPI?.exitOrRestart(action);
    },

    navigateHistory(action: "back" | "forward") {
      window.electronAPI?.navigateHistory(action);
    },

    syncRecords() {
      window.electronAPI?.syncRecords()
    },

    changeRotation() {
      let style = document.createElement("style");
      style.id = "dynamic-orbit-style";

      const rotateA = `@keyframes orbit {
    0% { transform: rotate(360deg); }
    50% { transform: rotate(180deg); }
    100% { transform: rotate(0deg); }
  }`;

      const rotateB = `@keyframes orbit {
    0% { transform: rotate(0deg); }
    50% { transform: rotate(180deg); }
    100% { transform: rotate(360deg); }
  }`;

      let isRotateA = true;

      const updateKeyframe = () => {
        const oldStyle = document.getElementById("dynamic-orbit-style");
        if (oldStyle) {
          oldStyle.remove();
        }

        style = document.createElement("style");
        style.id = "dynamic-orbit-style";
        style.innerHTML = isRotateA ? rotateA : rotateB;
        document.head.appendChild(style);

        isRotateA = !isRotateA;
      };

      updateKeyframe();
      setInterval(updateKeyframe, 3000);
    },

    tick() {
      this.countdown--;
      if (this.countdown <= 0) {
        this.status = "idle";
        if (this.timer) clearInterval(this.timer);
      }
    },

    onContextMenu(e: MouseEvent) {
      if (!e.isTrusted) {
        e.stopPropagation();
      }
    },

    handleKeydown(e: KeyboardEvent) {
      if (!e.ctrlKey) return;

      const key = e.key.toLowerCase();
      const shift = e.shiftKey;

      if (!shift) {
        if (key === "[") {
          e.preventDefault();
          this.navigateHistory("back");
        } else if (key === "]") {
          e.preventDefault();
          this.navigateHistory("forward");
        } else if (key === "r") {
          e.preventDefault();
          this.exitOrRestart("restart");
        } else if (key === "q") {
          e.preventDefault();
          this.exitOrRestart("exit");
        }
      } else {
        if (key === "d") {
          e.preventDefault();
          navigateTo("/documents/scan");
        } else if (key === "r") {
          e.preventDefault();
          this.syncRecords()
        } else if (key === "a") {
          e.preventDefault();
          console.warn("Add Record not implemented");
        } else if (key === "s") {
          e.preventDefault();
          console.warn("Search Teacher not implemented");
        }
      }
    },
  },

  async mounted() {
    if (!import.meta.client) return;
    this.changeRotation();

    let urlTo = "/login";

    if (window.electronAPI) {
      window.addEventListener("keydown", this.handleKeydown);
      const state = await window.electronAPI.getUpdateState();

      if (state.downloaded) {
        this.status = "ready";
        this.version = state.version ?? "";
      }

      this.off.push(
        window.electronAPI.onUpdateAvailable((v: string) => {
          this.version = v;
          this.status = "available";
        }),

        window.electronAPI.onUpdateProgress((p: number) => {
          this.status = "downloading";
          this.progress = p;
        }),

        window.electronAPI.onUpdateDownloaded(() => {
          this.status = "ready";
          this.countdown = 60;

          if (this.timer) clearInterval(this.timer);
          this.timer = setInterval(this.tick, 1500);
        }),

        window.electronAPI.onScanDocument(() => {
          navigateTo("/documents/scan");
        }),

        window.electronAPI.openContextMenu((options) => {
          this.menuOptions = options;
          const { x, y } = options;

          let trigger = this.$refs.menuTrigger as HTMLElement | null;
          if (!trigger) {
            trigger = document.getElementById('menuTrigger');
          }
          if (trigger && typeof x === 'number' && typeof y === 'number') {
            trigger.style.left = `${x}px`;
            trigger.style.top = `${y}px`;
            trigger.dispatchEvent(
              new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
              })
            );
          }
        })
      );

      const hasLoggedIn = getStorage<boolean>('hasLoggedIn'),
        lastTime = getStorage<number>('lastTime'),
        userDetails = getStorage<UserDetails>('userDetails');

      if (hasLoggedIn && lastTime && lastTime > Date.now() - 30 * 24 * 60 * 60 * 1000) {
        if (userDetails) {
          setStorage('lastTime', Date.now());
          urlTo = '/pin';
        } else {
          setStorage('lastTime', Date.now() - 30 * 24 * 60 * 60 * 1000);
          setStorage('hasLoggedIn', false);
        }
      };
      navigateTo(urlTo);

      await new Promise((resolve) => setTimeout(resolve, 4000));
      return this.loading = false;
    }
    navigateTo(urlTo)

    await new Promise((resolve) => setTimeout(resolve, 4000));
    this.loading = false;
  },

  beforeUnmount() {
    this.off.forEach((fn) => fn());
    if (this.timer) clearInterval(this.timer);
    if (window.electronAPI) {
      window.removeEventListener("keydown", this.handleKeydown);
    }
  },
});

</script>
<template>
  <div class="bg-muted min-h-screen" @contextmenu="onContextMenu">
    <div v-if="loading" class="fixed inset-0 z-10000 flex flex-col items-center justify-center bg-primary">
      <div class="relative flex items-center justify-center">
        <svg class="absolute w-44 h-44 animate-orbit" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" class="orbit-ring" stroke-width="2" fill="none" stroke-dasharray="30"
            stroke-dashoffset="105" stroke-linecap="round" />
        </svg>
        <div class="z-10 flex h-36 w-36 items-center justify-center rounded-full bg-white">
          <img src="/logo.png" alt="Logo" class="w-full h-full object-contain" />
        </div>
      </div>
      <div class="absolute bottom-8 text-2xl font-extrabold uppercase text-primary-foreground font-app">
        PPSMB File Manager
      </div>
    </div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <div v-if="status !== 'idle'"
      class="fixed bottom-6 right-4 z-50 border border-border rounded-lg shadow-lg hover:shadow-1 p-2 bg-background text-foreground flex items-center gap-2 min-h-28 min-w-72">
      <div v-if="status === 'available'" class="w-full space-y-6 py-1 px-3">
        <h2 class="text-foreground text-base">New version available ({{ version }})</h2>
        <div class="flex justify-end w-full flex-1 gap-x-3">
          <Button @click="download()" class="app-btn hover:shadow-lg">
            Download
            <ArrowDownIcon class="size-4" />
          </Button>
          <Button variant="ghost" @click="status = 'idle'" class="hover:underline cursor-pointer">Later</Button>
        </div>
      </div>
      <div v-if="status === 'downloading'" class="w-full space-y-5 py-1 px-3">
        <h2 class="text-foreground text-base text-center font-app font-normal mb-0 pb-3">Downloading {{ progress }}%
        </h2>
        <Progress v-model="progress" class="w-full mx-auto" />
        <div class="flex justify-start w-full flex-1 gap-x-3">
          <Button disabled class="app-btn shadow-lg">
            <span class="">Downloading</span>
            <ArrowDownIcon class="size-6 animate-bounce" />
          </Button>
          <Button variant="ghost" class="hover:underline cursor-pointer" @click="status = 'idle'">Cancel</Button>
        </div>
      </div>
      <div v-if="status === 'ready'" class="w-full space-y-6 py-1 px-3">
        <h2 class="text-foreground text-base font-app font-normal">Download Completed. Restart app to update</h2>
        <div class="flex justify-end w-full flex-1 gap-x-3">
          <Button @click="install()" class="app-btn hover:shadow-lg font-app">
            Restart ({{ countdown }}s)
          </Button>
          <Button variant="ghost" @click="status = 'idle'"
            class="hover:underline cursor-pointer font-app">Later</Button>
        </div>
      </div>
    </div>

    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div ref="menuTrigger" class="fixed size-0" id="menuTrigger" />
      </ContextMenuTrigger>
      <ContextMenuContent class="w-64 font-app">
        <ContextMenuItem @click="navigateHistory('back')" inset :disabled="!menuOptions.back">
          Back
          <ContextMenuShortcut class="text-[11px]">Ctrl+[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem @click="navigateHistory('forward')" inset :disabled="!menuOptions.forward">
          Forward
          <ContextMenuShortcut class="text-[11px]">Ctrl+]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem @click="exitOrRestart('restart')" inset :disabled="!menuOptions.restart">
          Restart
          <ContextMenuShortcut class="text-[11px]">Ctrl+R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuItem inset v-if="menuOptions.cut">
          Cut
          <ContextMenuShortcut class="text-[11px]">Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset v-if="menuOptions.copy">
          Copy
          <ContextMenuShortcut class="text-[11px]">Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset v-if="menuOptions.paste">
          Paste
          <ContextMenuShortcut class="text-[11px]">Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator v-if="menuOptions.cut || menuOptions.copy || menuOptions.paste" />
        <ContextMenuItem inset v-if="menuOptions.linkUrl">Copy Full URLs</ContextMenuItem>
        <ContextMenuSeparator v-if="menuOptions.linkUrl || menuOptions.openLink" />
        <ContextMenuItem class="my-1" @click="navigateTo('/documents/scan')">
          <FileScan class="size-4 mr-2" />
          Scan Document
          <ContextMenuShortcut class="text-[11px]">Ctrl+⇧+D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem class="my-1" @click="syncRecords()">
          <CloudSync class="size-4 mr-2" />
          <span class="truncate">Synchronize Records</span>
          <ContextMenuShortcut class="text-[11px]">Ctrl+⇧+R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem class="my-1">
          <FilePlusCorner class="size-4 mr-2" />
          Add Record
          <ContextMenuShortcut class="text-[11px]">Ctrl+⇧+A</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem class="my-1">
          <UserSearch class="size-4 mr-2" />
          Search Teacher
          <ContextMenuShortcut class="text-[11px]">Ctrl+⇧+S</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>
            About
          </ContextMenuSubTrigger>
          <ContextMenuSubContent class="w-52">
            <ContextMenuItem inset disabled>
              Version: {{ menuOptions.__version ?? "0.0.1" }}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem @click="checkUpdate()" inset v-if="menuOptions.check">
              Check For Update
            </ContextMenuItem>
            <ContextMenuItem @click="openBrowser(String(menuOptions.release))" inset v-if="menuOptions.release">
              Release Note
            </ContextMenuItem>
            <ContextMenuItem @click="openBrowser('https://axiolot.com.ng')">
              <Code2Icon class="size-4 mr-2" />
              About Developers
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem inset v-if="menuOptions.copyVersion">
              Copy Version
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem @click="exitOrRestart('exit')" inset v-if="menuOptions.exit">
          Quit
          <ContextMenuShortcut class="text-[11px]">Ctrl+Q</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </div>
</template>
