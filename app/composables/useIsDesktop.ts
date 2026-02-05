import { useRuntimeConfig } from "#imports";

export const useIsDesktop = () => {
  const env = useRuntimeConfig();
  return env.public.appType === "desktop";
};
