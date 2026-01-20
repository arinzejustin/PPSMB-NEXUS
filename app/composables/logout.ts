export const logOut = async () => {
  const data = await $fetch("/api/auth/logout", {
    method: "POST",
  });

  if (data) {
    const user = useUser();
    user.value = null;
    clearNuxtData();
    navigateTo("/login");
  }
};
