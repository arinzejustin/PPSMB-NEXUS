import { definePageMeta, useHead } from "#imports";
import { useIsDesktop } from "@/composables/useIsDesktop";

const isDesktop = useIsDesktop();

useHead({
  title: isDesktop
    ? "PPSMB Enugu Nexus"
    : "Zones Management - PPSMB Enugu Nexus",
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
