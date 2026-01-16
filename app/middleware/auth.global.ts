export default defineNuxtRouteMiddleware(async (to, _from) => {
  if (import.meta.server) return;

  const user = useUser();
  const publicRoutes = ["/login", "/pin"];
  const isPublicRoute = publicRoutes.includes(to.path);

  if (!user.value || !user.value.isAuthenticated) {
    if (!isPublicRoute) {
      try {
        const { data } = await useFetch<UserDetails & Auth>("/api/auth/me");
        if (data.value && data.value.isAuthenticated) user.value = data.value;
        else return navigateTo("/login");
      } catch {
        return navigateTo("/login");
      }
    }
  } else {
    if (to.path !== "/login" && to.path !== "/pin") {
      return navigateTo(to.path);
    }
    console.log(to.path, _from.path);
  }
});
