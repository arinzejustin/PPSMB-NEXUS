export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const publicRoutes = ["/login", "/pin"];
  if (publicRoutes.includes(to.path)) return;

  const user = useUser();
  const pinLocked = useCookie<boolean>("YS");

  const redirectTo = encodeURIComponent(to.path);

  if (!user.value?.isAuthenticated) {
    if (window.electronAPI && pinLocked.value) {
      return navigateTo(`/pin?redirect=${redirectTo}`);
    } else {
      return navigateTo(`/login?redirect=${redirectTo}`);
    }
  }
});
