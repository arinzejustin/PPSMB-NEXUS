import { definePageMeta, useHead } from "#imports";
import { useIsDesktop } from "@/composables/useIsDesktop";

const isDesktop = useIsDesktop();

useHead({
  title: isDesktop
    ? "PPSMB Staff Manager"
    : "Zones Management - PPSMB Staff Manager",
});

definePageMeta({
  middleware: ["user-validate"],
  layout: "app",
});

export default defineComponent({
  render() {
    return <h1>Index page zones</h1>;
  },
});
