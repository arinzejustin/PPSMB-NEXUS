/**
 * App cleanup function - call this when unmounting the app layout
 * Cleans up dashboard data subscriptions and sync status
 */
export function useAppCleanUp() {
  // Get cleanup functions at call time, not module load time
  const { cleanup: dashboardCleanup } = useDashboardData();
  const { cleanup: syncStatusCleanup } = useSyncStatus();

  dashboardCleanup();
  syncStatusCleanup();
}
