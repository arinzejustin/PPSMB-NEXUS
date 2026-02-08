import { useRuntimeConfig } from "#imports";

export const useIsDesktop = () => {
  if (import.meta.server) return false;

  const env = useRuntimeConfig();
  return !!(window as any).electronAPI || env.public.appType === "desktop";
};
