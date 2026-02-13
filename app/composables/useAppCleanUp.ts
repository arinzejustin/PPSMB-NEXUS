
export function useAppCleanUp() {
  const { cleanup: dashboardCleanup } = useDashboardData();
  const { cleanup: syncStatusCleanup } = useSyncStatus();
  const { cleanup: broadcastCleanup } = useBroadcastData();
  const { cleanup: taskReportCleanup } = useTaskReportData();

  dashboardCleanup();
  syncStatusCleanup();
  broadcastCleanup();
  taskReportCleanup();
}
