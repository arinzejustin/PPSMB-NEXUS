import { ref, computed, onMounted, onUnmounted } from "vue";
import type { Theme, ResolvedTheme } from "@/types";

const theme = ref<Theme>("system");
const resolvedTheme = ref<ResolvedTheme>("light");
let cleanupListener: (() => void) | null = null;

export function useTheme() {
  const applyTheme = (resolved: ResolvedTheme) => {
    if (import.meta.client) {
      const root = document.documentElement;
      if (resolved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const updateResolvedTheme = async (themeValue: Theme) => {
    let resolved: ResolvedTheme;

    if (themeValue === "system") {
      resolved = (await window.electronAPI.getSystemTheme()) as ResolvedTheme;
    } else {
      resolved = themeValue as ResolvedTheme;
    }

    resolvedTheme.value = resolved;
    applyTheme(resolved);
  };

  const setTheme = async (newTheme: Theme) => {
    theme.value = newTheme;
    await window.electronAPI.setSetting("theme", newTheme);
    await updateResolvedTheme(newTheme);
  };

  const initTheme = async () => {
    if (import.meta.client && window.electronAPI) {
      const savedTheme = (await window.electronAPI.getSetting(
        "theme",
      )) as Theme;
      theme.value = savedTheme;
      await updateResolvedTheme(savedTheme);

      cleanupListener = window.electronAPI.onSystemThemeChange(
        (systemTheme) => {
          if (theme.value === "system") {
            resolvedTheme.value = systemTheme as ResolvedTheme;
            applyTheme(systemTheme as ResolvedTheme);
          }
        },
      );
    }
  };

  onMounted(() => {
    initTheme();
  });

  onUnmounted(() => {
    if (cleanupListener) {
      cleanupListener();
    }
  });

  // Fix: Explicitly type the return
  return {
    theme: computed<Theme>(() => theme.value),
    resolvedTheme: computed<ResolvedTheme>(() => resolvedTheme.value),
    setTheme,
  } as const;
}
