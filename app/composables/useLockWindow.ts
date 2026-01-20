export const useLockWindow = () => {
  const user = useUser();
  const pinLocked = useCookie("YS", {
    sameSite: "strict",
    default: () => false,
  });

  const lockSession = () => {
    if (!user.value) return;
    pinLocked.value = true;
    user.value.isAuthenticated = false;
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
