import { deleteStorage } from "@/lib/storage";

export const useLogOut = async () => {
  try {
    await $fetch("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    const user = useUser();
    user.value = null;
    clearNuxtData();
    if (window.electronAPI) {
      await window.electronAPI.authLogout();
      deleteStorage("userDetails");
      deleteStorage("hasLoggedIn");
      deleteStorage("lastTime");
    }
    deleteStorage("snapshot");
    navigateTo("/login");
  }
};
