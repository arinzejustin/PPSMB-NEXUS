export const useLockWindow = () => {
  const user = useUser();
  const pinLocked = useCookie("YS", {
    sameSite: "strict",
    default: () => false,
  });
  const route = useRoute();
  const redirect = encodeURIComponent(route.path);

  const lockSession = () => {
    if (!user.value) return;
    pinLocked.value = true;
    user.value.isAuthenticated = false;
    navigateTo(`/pin?redirect=${redirect}`);
  };

  const unLockSession = () => {
    if (!user.value) return;
    pinLocked.value = false;
    user.value.isAuthenticated = true;
  };

  return {
    lockSession,
    unLockSession,
  };
};
