import { defineNuxtConfig } from "nuxt/config";

const isDesktop = process.env.NUXT_PUBLIC_APP_TYPE === "desktop";

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
        isDesktop
          ? {
              "http-equiv": "Content-Security-Policy",
              content:
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*; frame-src 'self';",
            }
          : {},
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
    "@/assets/css/animate.css",
    "vue-sonner/style.css",
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
    keySecret: "",
    domainCookie: "",
    supabaseUrl: "",
    supabaseKey: "",
    public: {
      appType: "",
      apiUrl: "",
      wsUrl: "",
    },
  },
  vite: {
    build: {
      rollupOptions: {},
    },
  },
  imports: {
    dirs: ["@/composables/**"],
  },
});
