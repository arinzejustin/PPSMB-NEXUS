import { useNavigationHistory } from "@/composables/useNavigationHistory";

export default defineNuxtRouteMiddleware((to, from) => {
  if (process.server) return;

  const { recordNavigation } = useNavigationHistory();
  recordNavigation(to.fullPath, from.fullPath);
});
