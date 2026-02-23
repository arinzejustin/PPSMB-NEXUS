import type { UserDetails, Auth } from "~/utils/types";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useUser();
  const token = useToken();

  if (user.value?.isAuthenticated) return;

  const publicRoutes = ["/login", "/pin", "/", "/register"];
  const isPublicRoute = publicRoutes.includes(to.path);
  const redirectTo = encodeURIComponent(to.path);

  if (!isPublicRoute) {
    try {
      const data = await $fetch<UserDetails & Auth>(
        "/api/auth/me?to=" + from.path,
        {
          headers: {
            "x-auth-token": token.value || "",
          },
        },
      );

      if (data.isAuthenticated) {
        user.value = data;
      } else {
        if (from.path === "/pin")
          return navigateTo(`/pin?redirect=${redirectTo}`);
        return navigateTo(`/login?redirect=${redirectTo}`);
      }
    } catch (error: any) {
      if (from.path === "/pin")
        return navigateTo(`/pin?redirect=${redirectTo}`);
      return navigateTo(`/login?redirect=${redirectTo}`);
    }
  }
});
