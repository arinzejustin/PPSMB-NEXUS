<script lang="ts">
import { defineComponent } from 'vue';
import { navigateTo, useRuntimeConfig } from 'nuxt/app';
import { ArrowDownIcon, Code2Icon, PlusIcon, TrashIcon } from 'lucide-vue-next'
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
import type { UserDetails } from '~/types/types'

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
    Code2Icon, PlusIcon, TrashIcon
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
    };
  },

  methods: {
    openBrowser,
    download() {
      window.electronAPI?.startDownload();
    },

    install() {
      window.electronAPI?.confirmInstall();
    },

    checkUpdate() {
      window.electronAPI?.checkUpdate();
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
  },

  async mounted() {
    if (!import.meta.client) return;

    let urlTo = "/login";

    if (window.electronAPI) {
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
          this.timer = setInterval(this.tick, 1000);
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
          console.log(options)
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

      return navigateTo(urlTo)
    }

    return navigateTo(urlTo)
  },

  beforeUnmount() {
    this.off.forEach((fn) => fn());
    if (this.timer) clearInterval(this.timer);
  },
});

</script>
<template>
  <div class="bg-muted min-h-screen" @contextmenu="onContextMenu">
    <NuxtLayout class="flex">
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
      <ContextMenuContent class="w-56">
        <ContextMenuItem inset :disabled="!menuOptions.back">
          Back
          <ContextMenuShortcut>⌘[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset :disabled="!menuOptions.forward">
          Forward
          <ContextMenuShortcut>⌘]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset :disabled="!menuOptions.restart">
          Restart
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuItem inset v-if="menuOptions.cut">
          Cut
          <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset v-if="menuOptions.copy">
          Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset v-if="menuOptions.paste">
          Paste
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator v-if="menuOptions.cut || menuOptions.copy || menuOptions.paste" />
        <ContextMenuItem inset v-if="menuOptions.linkUrl">Copy Full URLs</ContextMenuItem>
        <ContextMenuSeparator v-if="menuOptions.linkUrl || menuOptions.openLink" />
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>
            More Tools
          </ContextMenuSubTrigger>
          <ContextMenuSubContent class="w-52">
            <ContextMenuItem inset>
              Scan Document
              <ContextMenuShortcut>⇧⌘S</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              <PlusIcon class="size-5 mr-1" />
              Create Shortcut...
            </ContextMenuItem>
            <ContextMenuItem inset>
              Name Window...
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger inset>
                About
              </ContextMenuSubTrigger>
              <ContextMenuSubContent class="w-52">
                <ContextMenuItem inset>
                  Version: {{ menuOptions.__version ?? "0.0.1" }}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem @click="checkUpdate()" inset v-if="menuOptions.check">
                  Check For Update
                </ContextMenuItem>
                <ContextMenuItem @click="openBrowser(String(menuOptions.release))" inset v-if="menuOptions.release">
                  Release Note
                </ContextMenuItem>
                <ContextMenuSeparator />
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem inset v-if="menuOptions.exit">
          Quit
          <ContextMenuShortcut>Ctrl+Q</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </div>
</template>
