export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  if (["/login", "/pin"].includes(to.path)) return;

  const user = useUser();
  const pinLocked = useCookie<boolean>("YS");

  const redirectTo = encodeURIComponent(to.path);

  if (!user.value || !user.value.isAuthenticated) {
    if (window.electronAPI) {
      if (pinLocked.value) return navigateTo(`/pin?redirect=${redirectTo}`);
    } else {
      return navigateTo(`/login?redirect=${redirectTo}`);
    }
  }
});
