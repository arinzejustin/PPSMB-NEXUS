# Dashboard UI Walkthrough

## Page Purpose
The Dashboard serves as the central command center for PPSMB leadership, providing real-time visibility into key performance indicators, system-wide trends, and actionable insights for managing the education board's teacher management operations.

## User Flow
1. **First Impression**: User lands on the Dashboard after login and immediately sees four KPI cards displaying Total Teachers, Active Schools, Pending Transfers, and Documents Processed.

2. **Trend Analysis**: User scrolls to view the Monthly Trends line chart showing documents processed and transfers completed over the year.

3. **Certification Review**: The donut chart displays the breakdown of certification statuses (Active/Expiring/Expired/Pending), helping HR prioritize renewal outreach.

4. **Zone Comparison**: The bar chart visualizes teacher and school distribution across administrative zones for resource allocation decisions.

5. **Activity Monitoring**: The Recent Activity feed shows real-time system actions (transfers, document processing, alerts), each clickable for drill-down.

6. **Quick Actions**: Four prominent action buttons allow one-click navigation to common tasks: Add Teacher, Scan Document, New Transfer, View Reports.

7. **Calendar Awareness**: Upcoming Events shows important deadlines and scheduled activities.

## Components Used
- `Card` (CardHeader, CardContent, CardTitle, CardDescription): For all stat cards and content sections
- `Badge`: For certification status and event type labels
- `Button`: For refresh and action buttons
- `Avatar` (AvatarFallback): For user icons in activity feed
- `Skeleton`: For loading state placeholders
- **vue-chartjs**: Line, Bar, Doughnut charts for data visualization
- **Lucide Icons**: TrendingUp, TrendingDown, Users, Building2, etc.

## Intended Logic Flow
1. **On Page Load**:
   - Set `isLoading = true`
   - Fetch KPI data from local IndexedDB (offline-first)
   - Fetch activity feed from local cache
   - Render charts with cached data
   - Set `isLoading = false`

2. **Refresh Button**:
   - Set `isLoading = true`
   - Attempt to sync with remote server if online
   - Update local IndexedDB with fresh data
   - Update `lastUpdated` timestamp
   - Re-render all components

3. **Quick Action Navigation**:
   - Use `navigateTo()` to route to respective pages
   - Preserve current session state

4. **Sync Status**:
   - Display "Last Synchronized" timestamp from Electron store
   - Show pending changes count badge if items await sync
