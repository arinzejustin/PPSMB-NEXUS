export const useIsDesktop = () => {
  if (import.meta.server) return false;

  return !!(window as any).electronAPI;
};

export const useUnSyncedMbSize = () =>
  useState<number>("unsyncedSizeMb", () => 0);
