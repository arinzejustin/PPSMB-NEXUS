import { defineNuxtConfig } from "nuxt/config";

const isDesktop = process.env.NUXT_PUBLIC_APP_TYPE === "desktop";
const connect_src =
  import.meta.dev || isDesktop
    ? "http://localhost:* ws://localhost:* https://api.ppsmb.com.ng wss://socket.ppsmb.com.ng"
    : "https://api.ppsmb.com.ng wss://socket.ppsmb.com.ng";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: !isDesktop,
  app: {
    head: {
      title: "PPSMB Enugu Nexus",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "PPSMB Enugu Nexus" },
        { name: "format-detection", content: "telephone=no" },
        isDesktop
          ? {
              "http-equiv": "Content-Security-Policy",
              content: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' ${connect_src}; frame-src 'self';`,
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
    goApiBase: import.meta.dev
      ? "http://localhost:8000/internal/v1"
      : "https://api.ppsmb.com.ng/internal/v1",
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
