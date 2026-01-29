/**
 * Dashboard API Endpoint
 * 
 * Returns aggregated dashboard data for the web application.
 * In production, this would fetch from Supabase.
 */
import { defineEventHandler, createError } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // TODO: In production, fetch real data from Supabase
    // For now, return mock data that matches the DashboardData interface
    
    const mockData = {
      metrics: [
        {
          id: 'teachers',
          title: 'Total Teachers',
          value: '5,247',
          change: '+12',
          changePercent: '+2.3%',
          changeType: 'increase',
          changeLabel: 'vs last month',
          icon: 'Users',
          gradient: 'from-blue-500 via-blue-600 to-indigo-600',
          bgGradient: 'from-blue-500/10 to-indigo-500/5',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-600 dark:text-blue-400',
          route: '/staff'
        },
        {
          id: 'students',
          title: 'Total Students',
          value: '52,340',
          change: '+234',
          changePercent: '+0.4%',
          changeType: 'increase',
          changeLabel: 'from last month',
          icon: 'GraduationCap',
          gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
          bgGradient: 'from-emerald-500/10 to-teal-500/5',
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          badge: 'Coming Soon'
        },
        {
          id: 'zones',
          title: 'Active Zones',
          value: '6 / 142',
          change: '142',
          changePercent: '',
          changeType: 'neutral',
          changeLabel: 'schools total',
          icon: 'MapPin',
          gradient: 'from-violet-500 via-violet-600 to-purple-600',
          bgGradient: 'from-violet-500/10 to-purple-500/5',
          iconBg: 'bg-violet-500/10',
          iconColor: 'text-violet-600 dark:text-violet-400',
          route: '/zones'
        },
        {
          id: 'transfers',
          title: 'Pending Transfers',
          value: '23',
          change: '5',
          changePercent: '',
          changeType: 'decrease',
          changeLabel: 'urgent',
          icon: 'ArrowLeftRight',
          gradient: 'from-amber-500 via-amber-600 to-orange-600',
          bgGradient: 'from-amber-500/10 to-orange-500/5',
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-600 dark:text-amber-400',
          route: '/staff/transfers'
        },
        {
          id: 'documents',
          title: 'Documents Processed',
          value: '1,234',
          change: '+156',
          changePercent: '+9.2%',
          changeType: 'increase',
          changeLabel: 'this month',
          icon: 'FileText',
          gradient: 'from-teal-500 via-teal-600 to-cyan-600',
          bgGradient: 'from-teal-500/10 to-cyan-500/5',
          iconBg: 'bg-teal-500/10',
          iconColor: 'text-teal-600 dark:text-teal-400',
          route: '/documents'
        },
        {
          id: 'health',
          title: 'System Health',
          value: '99.7%',
          change: '',
          changePercent: '',
          changeType: 'neutral',
          changeLabel: 'Excellent uptime',
          icon: 'Heart',
          gradient: 'from-rose-500 via-rose-600 to-pink-600',
          bgGradient: 'from-rose-500/10 to-pink-500/5',
          iconBg: 'bg-rose-500/10',
          iconColor: 'text-rose-600 dark:text-rose-400'
        }
      ],
      zones: [
        { id: '1', name: 'Enugu North', code: 'EN', administrator: 'Mrs. Adaobi Nwankwo', teacherCount: 847, schoolCount: 24, studentCount: 8234, pendingItems: 3, health: 'healthy', lastSync: new Date(), growth: '+5%' },
        { id: '2', name: 'Enugu South', code: 'ES', administrator: 'Mr. Chukwuemeka Obi', teacherCount: 923, schoolCount: 28, studentCount: 9156, pendingItems: 1, health: 'healthy', lastSync: new Date(), growth: '+8%' },
        { id: '3', name: 'Enugu East', code: 'EE', administrator: 'Mrs. Ngozi Eze', teacherCount: 756, schoolCount: 19, studentCount: 7823, pendingItems: 5, health: 'attention', lastSync: new Date(), growth: '+3%' },
        { id: '4', name: 'Nsukka', code: 'NS', administrator: 'Dr. Emeka Nnamdi', teacherCount: 1024, schoolCount: 31, studentCount: 11234, pendingItems: 2, health: 'healthy', lastSync: new Date(), growth: '+12%' },
        { id: '5', name: 'Udi', code: 'UD', administrator: 'Mr. Ikechukwu Okoro', teacherCount: 689, schoolCount: 18, studentCount: 6892, pendingItems: 0, health: 'healthy', lastSync: new Date(), growth: '+2%' },
        { id: '6', name: 'Awgu', code: 'AW', administrator: 'Mrs. Chioma Ugwu', teacherCount: 1008, schoolCount: 22, studentCount: 9001, pendingItems: 4, health: 'healthy', lastSync: new Date(), growth: '+6%' },
      ],
      recentActivity: [
        { id: '1', type: 'transfer', title: 'Transfer Request Approved', description: 'Mrs. Adaobi Nwankwo transferred to Government Secondary School, Nsukka', actor: 'Admin User', timestamp: new Date(Date.now() - 15 * 60 * 1000), status: 'success' },
        { id: '2', type: 'document', title: 'Document Batch Processed', description: '24 documents from Enugu South Zone processed successfully', actor: 'System', timestamp: new Date(Date.now() - 60 * 60 * 1000), status: 'success' },
        { id: '3', type: 'certification', title: 'Certification Expiring', description: '12 teachers have certifications expiring within 30 days', actor: 'System Alert', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), status: 'warning' },
        { id: '4', type: 'user', title: 'New Teacher Registered', description: 'Mr. Emmanuel Okonkwo added to the system', actor: 'HR Admin', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), status: 'info' },
        { id: '5', type: 'mail', title: 'Correspondence Received', description: 'Official letter from Ministry of Education', actor: 'Mail System', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), status: 'info' },
      ],
      alerts: [
        { id: '1', severity: 'critical', title: '5 Teacher Certifications Expiring This Week', description: 'TRCN certifications for 5 teachers expire within 7 days', actionLabel: 'View Details', actionRoute: '/certifications/expiring', dismissable: true, createdAt: new Date() },
        { id: '2', severity: 'warning', title: '3 Pending Transfer Approvals Overdue', description: 'Transfer requests awaiting approval for over 7 days', actionLabel: 'Review Now', actionRoute: '/staff/transfers', dismissable: true, createdAt: new Date() },
      ],
      upcomingEvents: [
        { id: '1', title: 'Certification Renewal Deadline', date: '2026-01-30', type: 'deadline', priority: 'high' },
        { id: '2', title: 'Bi-weekly Data Sync', date: '2026-01-29', type: 'sync', priority: 'medium' },
        { id: '3', title: 'Quarterly Report Due', date: '2026-02-01', type: 'report', priority: 'high' },
        { id: '4', title: 'Staff Training Session', date: '2026-02-05', type: 'training', priority: 'low' },
      ],
      charts: {
        teacherDistribution: [
          { label: 'Enugu North', value: 847 },
          { label: 'Enugu South', value: 923 },
          { label: 'Enugu East', value: 756 },
          { label: 'Nsukka', value: 1024 },
          { label: 'Udi', value: 689 },
          { label: 'Awgu', value: 1008 },
        ],
        documentTrends: [
          { label: 'Jan', value: 1200 },
          { label: 'Feb', value: 1350 },
          { label: 'Mar', value: 1180 },
          { label: 'Apr', value: 1420 },
          { label: 'May', value: 1380 },
          { label: 'Jun', value: 1550 },
          { label: 'Jul', value: 1620 },
          { label: 'Aug', value: 1480 },
          { label: 'Sep', value: 1720 },
          { label: 'Oct', value: 1847 },
          { label: 'Nov', value: 0 },
          { label: 'Dec', value: 0 },
        ],
        certificationStatus: [
          { label: 'Active', value: 3245 },
          { label: 'Expiring Soon', value: 892 },
          { label: 'Expired', value: 234 },
          { label: 'Pending', value: 863 },
        ]
      },
      systemHealth: [
        { label: 'Database', value: 98, status: 'healthy' },
        { label: 'Sync Engine', value: 95, status: 'healthy' },
        { label: 'API Response', value: 87, status: 'warning' },
        { label: 'Storage', value: 72, status: 'healthy' },
      ],
      lastUpdated: new Date()
    };

    return {
      data: mockData,
      success: true
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch dashboard data'
    });
  }
});
