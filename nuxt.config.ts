import { defineNuxtConfig } from "nuxt/config";

const isDesktop = process.env.NUXT_APP_TYPE === "desktop";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: !isDesktop,
  app: {
    head: {
      title: "PPSMB Staff Manager",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "PPSMB Staff Manager" },
        { name: "format-detection", content: "telephone=no" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },

  modules: ["@nuxtjs/tailwindcss", "shadcn-nuxt"],
  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },
  css: [
    isDesktop ? "@/assets/css/font-desktop.css" : "@/assets/css/font-web.css",
  ],
  tailwindcss: {
    cssPath: [
      "@/assets/css/tailwind.css",
      {
        injectPosition: "first",
      },
    ],
  },
  runtimeConfig: {
    public: {
      appType: process.env.NUXT_APP_TYPE,
    },
  },
  vite: {
    build: {
      rollupOptions: {
        external: ["better-sqlite3"],
      },
    },
  },
});
