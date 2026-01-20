import type { Theme, ResolvedTheme } from "@/types";

export default defineNuxtPlugin(async () => {
  if (import.meta.client && window.electronAPI) {
    const savedTheme = await window.electronAPI
      .getSetting("theme")
      .then((theme: Theme) => {
        return theme;
      });

    let resolved: ResolvedTheme;
    if (savedTheme === "system") {
      resolved = (await window.electronAPI.getSetting("theme")) as Theme;
    } else {
      resolved = savedTheme;
    }

    const root = document.documentElement;
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
});
