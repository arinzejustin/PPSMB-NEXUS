import type { UserDetails, Auth } from "#shared/types";

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
    console.log("fired");
  }
});
