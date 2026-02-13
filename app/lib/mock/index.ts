/**
 * Mock Data Index
 * Central export point for all mock data
 */

// Dashboard mock data
export {
  defaultMetrics,
  defaultZones,
  mockZonesData,
  mockActivityData,
  mockAlertsData,
  mockEventsData,
  defaultSystemHealth,
  monthlyPerformanceData,
  type MonthlyPerformanceEntry,
} from "./dashboardMock";

// Internal mail mock data
export {
  mockDepartments,
  mockPersonnel,
  initialMails,
} from "./internalMailMock";

// Broadcast mock data
export {
  mockZones as mockBroadcastZones,
  mockSchools,
  mockSubjects,
  mockRoles,
  mockRecipients,
  defaultTemplates,
  defaultBroadcastHistory,
} from "./broadcastMock";

// Staff mock data
export {
  mockTeachers,
  zones,
  qualifications,
  certStatuses,
  serviceStatuses,
  transferSchools,
  nigerianBanks,
  type MockTeacher,
  type BankRecord,
  type TransferRecord,
} from "./staffMock";

// Documents mock data
export {
  categoriesByDimension,
  mockDocuments,
  mockProcessingQueue,
  mockDocumentTeachers,
} from "./documentsMock";
