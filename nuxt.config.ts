import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: process.env.appType === "desktop" ? false : true,
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
  css: ["@/assets/css/font.css"],
  tailwindcss: {
    cssPath: [
      "@/assets/css/tailwind.css",
      {
        injectPosition: "first",
      },
    ],
  },
  runtimeConfig: {
    apiType: process.env.appType,
    public: {},
  },
  vite: {
    build: {
      rollupOptions: {
        external: ["better-sqlite3"],
      },
    },
  },
});
