import { ref, computed, watch } from "vue";
import { db, isElectron } from "@/lib/db";
import {
  mockTeachers,
  zones,
  qualifications,
  serviceStatuses,
  transferSchools,
  nigerianBanks,
  type MockTeacher,
  type BankRecord,
  type TransferRecord,
} from "@/lib/mock";
import { format, differenceInDays } from "date-fns";

/** Returns today as YYYY-MM-DD (guaranteed string). */
const todayISO = (): string => format(new Date(), "yyyy-MM-dd");

// Types for Add Teacher methods
export type AddMethod = "manual" | "scan" | "upload";
export type ViewMode = "list" | "grid";

export interface ParsedTeacherRecord {
  name: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  zone: string;
  school: string;
  qualification: string;
  subject: string;
  gradeLevel: string;
  employmentDate: string;
  [key: string]: string;
}

export interface ActivityLog {
  id: string;
  type: "staff" | "transfer" | "bank" | "document" | "system";
  title: string;
  description: string;
  actor: string;
  timestamp: Date;
  status: "success" | "warning" | "error" | "info";
}

export function useStaffData() {
  // View mode
  const viewMode = ref<ViewMode>("grid");

  // State
  const searchQuery = ref("");
  const selectedZone = ref("");
  const selectedStatus = ref("");
  const selectedQualification = ref("");
  const currentPage = ref(1);
  const pageSize = ref(10);
  const selectedRows = ref<string[]>([]);
  const sortColumn = ref("name");
  const sortDirection = ref<"asc" | "desc">("asc");

  // Profile sheet
  const showProfileSheet = ref(false);
  const selectedTeacher = ref<MockTeacher | null>(null);
  const profileTab = ref("personal");

  // Transfer dialog
  const showTransferDialog = ref(false);
  const transferStep = ref(1);
  const transferDestination = ref("");
  const transferReason = ref("");

  // Add teacher dialog
  const showAddDialog = ref(false);
  const addMethod = ref<AddMethod>("manual");
  const isScanning = ref(false);
  const isParsingFile = ref(false);
  const parsedRecords = ref<ParsedTeacherRecord[]>([]);
  const editingRecordIndex = ref<number | null>(null);

  // Manual form
  const manualForm = ref<ParsedTeacherRecord>({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    zone: "",
    school: "",
    qualification: "",
    subject: "",
    gradeLevel: "",
    employmentDate: "",
  });

  // Bank account dialog
  const showBankDialog = ref(false);
  const bankForm = ref({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  // Teachers data
  const teachers = ref<MockTeacher[]>([...mockTeachers]);

  // Activity log
  const activityLog = ref<ActivityLog[]>([]);

  // Filtered and sorted teachers
  const filteredTeachers = computed(() => {
    let result = [...teachers.value];

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query) ||
          t.email.toLowerCase().includes(query) ||
          t.school.toLowerCase().includes(query),
      );
    }

    if (selectedZone.value) {
      result = result.filter((t) => t.zone === selectedZone.value);
    }

    if (selectedStatus.value) {
      result = result.filter((t) => t.serviceStatus === selectedStatus.value);
    }

    if (selectedQualification.value) {
      result = result.filter(
        (t) => t.qualification === selectedQualification.value,
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortColumn.value as keyof typeof a];
      const bVal = b[sortColumn.value as keyof typeof b];
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection.value === "asc" ? comparison : -comparison;
    });

    return result;
  });

  // Pagination
  const totalPages = computed(() =>
    Math.ceil(filteredTeachers.value.length / pageSize.value),
  );
  const paginatedTeachers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredTeachers.value.slice(start, start + pageSize.value);
  });

  // Stats
  const stats = computed(() => ({
    total: teachers.value.length,
    active: teachers.value.filter((t) => t.serviceStatus === "active").length,
    retiringSoon: teachers.value.filter(
      (t) => t.serviceStatus === "retiring-soon",
    ).length,
    retired: teachers.value.filter((t) => t.serviceStatus === "retired").length,
    onLeave: teachers.value.filter((t) => t.serviceStatus === "on-leave")
      .length,
  }));

  // Methods
  const toggleSort = (column: string) => {
    if (sortColumn.value === column) {
      sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    } else {
      sortColumn.value = column;
      sortDirection.value = "asc";
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.value.length === paginatedTeachers.value.length) {
      selectedRows.value = [];
    } else {
      selectedRows.value = paginatedTeachers.value.map((t) => t.id);
    }
  };

  const toggleSelectRow = (id: string) => {
    const index = selectedRows.value.indexOf(id);
    if (index > -1) {
      selectedRows.value.splice(index, 1);
    } else {
      selectedRows.value.push(id);
    }
  };

  const viewTeacher = (teacher: MockTeacher) => {
    selectedTeacher.value = teacher;
    profileTab.value = "personal";
    showProfileSheet.value = true;
  };

  const initiateTransfer = (teacher: MockTeacher) => {
    selectedTeacher.value = teacher;
    transferStep.value = 1;
    transferDestination.value = "";
    transferReason.value = "";
    showTransferDialog.value = true;
  };

  const clearFilters = () => {
    searchQuery.value = "";
    selectedZone.value = "";
    selectedStatus.value = "";
    selectedQualification.value = "";
  };

  const hasActiveFilters = computed(() => {
    return (
      searchQuery.value ||
      selectedZone.value ||
      selectedStatus.value ||
      selectedQualification.value
    );
  });

  const getStatusBadge = (status: string) => {
    const config = serviceStatuses.find((s) => s.value === status);
    return (
      config || {
        label: status,
        color: "bg-gray-100 text-gray-700",
      }
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getDaysUntilRetirement = (date: string | null) => {
    if (!date) return null;
    return differenceInDays(new Date(date), new Date());
  };

  const getYearsUntilRetirement = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    return Math.floor(days / 365);
  };

  // Add activity
  const addActivity = (activity: Omit<ActivityLog, "id" | "timestamp">) => {
    const newActivity: ActivityLog = {
      ...activity,
      id: `ACT-${Date.now()}`,
      timestamp: new Date(),
    };
    activityLog.value.unshift(newActivity);

    // Also save to db for dashboard
    try {
      db.insert("staff_logs", {
        action: activity.title,
        details: activity.description,
        performedBy: activity.actor,
        targetEntity: activity.type,
        status: activity.status,
      });
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  };

  // Submit transfer
  const submitTransfer = () => {
    if (!selectedTeacher.value) return;

    const transfer: TransferRecord = {
      id: `TR-${Date.now()}`,
      fromSchool: selectedTeacher.value.school,
      fromZone: selectedTeacher.value.zone,
      toSchool: transferDestination.value,
      toZone: "",
      reason: transferReason.value,
      transferDate: todayISO(),
      approvedBy: "Pending Approval",
      status: "pending",
    };

    selectedTeacher.value.transferHistory.push(transfer);
    selectedTeacher.value.lastTransfer = transfer.transferDate;

    addActivity({
      type: "transfer",
      title: "Transfer Request Initiated",
      description: `${selectedTeacher.value.name} transfer from ${transfer.fromSchool} to ${transfer.toSchool}`,
      actor: "Current User",
      status: "info",
    });

    showTransferDialog.value = false;
  };

  // Add bank record
  const addBankRecord = () => {
    if (!selectedTeacher.value) return;

    // Mark all existing records as not current
    selectedTeacher.value.bankRecords.forEach((b) => (b.isCurrent = false));

    const newRecord: BankRecord = {
      id: `BK-${Date.now()}`,
      bankName: bankForm.value.bankName,
      accountNumber: bankForm.value.accountNumber,
      accountName: bankForm.value.accountName,
      dateAdded: todayISO(),
      isCurrent: true,
    };

    selectedTeacher.value.bankRecords.push(newRecord);

    addActivity({
      type: "bank",
      title: "Bank Account Updated",
      description: `${selectedTeacher.value.name}'s payee account updated to ${newRecord.bankName} - ${newRecord.accountNumber}`,
      actor: "Current User",
      status: "success",
    });

    showBankDialog.value = false;
    bankForm.value = { bankName: "", accountNumber: "", accountName: "" };
  };

  // Add teacher manually
  const addTeacherManually = () => {
    const f = manualForm.value;
    const newTeacher: MockTeacher = {
      id: `TCH${String(teachers.value.length + 1).padStart(3, "0")}`,
      name: f.name,
      email: f.email,
      phone: f.phone,
      avatar: "",
      gender: f.gender,
      dateOfBirth: f.dateOfBirth,
      zone: f.zone,
      school: f.school,
      qualification: f.qualification,
      subject: f.subject,
      gradeLevel: f.gradeLevel,
      yearsOfService: 0,
      employmentDate: f.employmentDate || todayISO(),
      retirementDate: "",
      serviceStatus: "active",
      lastTransfer: null,
      status: "active",
      bankRecords: [],
      transferHistory: [],
    };

    // Calculate retirement date (60 years from DOB)
    if (f.dateOfBirth) {
      const dob = new Date(f.dateOfBirth);
      newTeacher.retirementDate = `${dob.getFullYear() + 60}-${String(
        dob.getMonth() + 1,
      ).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
    }

    teachers.value.push(newTeacher);

    addActivity({
      type: "staff",
      title: "New Teacher Added",
      description: `${newTeacher.name} added manually to the system`,
      actor: "Current User",
      status: "success",
    });

    resetManualForm();
    showAddDialog.value = false;
  };

  // Add parsed records
  const addParsedRecords = () => {
    parsedRecords.value.forEach((record) => {
      const newTeacher: MockTeacher = {
        id: `TCH${String(teachers.value.length + 1).padStart(3, "0")}`,
        name: record.name,
        email: record.email,
        phone: record.phone,
        avatar: "",
        gender: record.gender,
        dateOfBirth: record.dateOfBirth,
        zone: record.zone,
        school: record.school,
        qualification: record.qualification,
        subject: record.subject,
        gradeLevel: record.gradeLevel,
        yearsOfService: 0,
        employmentDate: record.employmentDate || todayISO(),
        retirementDate: "",
        serviceStatus: "active",
        lastTransfer: null,
        status: "active",
        bankRecords: [],
        transferHistory: [],
      };

      if (record.dateOfBirth) {
        const dob = new Date(record.dateOfBirth);
        newTeacher.retirementDate = `${dob.getFullYear() + 60}-${String(
          dob.getMonth() + 1,
        ).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
      }

      teachers.value.push(newTeacher);
    });

    addActivity({
      type: "staff",
      title: `${parsedRecords.value.length} Teachers Added`,
      description: `Batch upload of ${parsedRecords.value.length} teacher records via file upload`,
      actor: "Current User",
      status: "success",
    });

    parsedRecords.value = [];
    showAddDialog.value = false;
  };

  // Trigger scan (Electron only)
  const triggerScan = async () => {
    if (!isElectron() || !window.electronAPI) return;

    isScanning.value = true;
    try {
      // Trigger Python scanner via IPC
      window.electronAPI.onScanDocument(() => {
        // Scan completed - data will come via IPC callback
        isScanning.value = false;
      });
    } catch (e) {
      console.error("Scan failed:", e);
      isScanning.value = false;
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    isParsingFile.value = true;
    parsedRecords.value = [];

    try {
      if (isElectron() && window.electronAPI) {
        // On Electron: send file to Python parser via IPC
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result;
          // The actual IPC call would go here
          // For now we simulate parsing
          await simulateFileParse(file);
        };

        if (file.type.includes("image")) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      } else {
        // On Web: send to API for parsing
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await $fetch<{ data: ParsedTeacherRecord[] }>(
            "/nn/api/staff/parse-file",
            {
              method: "POST",
              body: formData,
            },
          );

          if (response?.data) {
            parsedRecords.value = response.data;
          }
        } catch {
          // Fallback to simulation
          await simulateFileParse(file);
        }
      }
    } catch (e) {
      console.error("File parse failed:", e);
    } finally {
      isParsingFile.value = false;
    }
  };

  // Simulate file parsing for dev
  const simulateFileParse = async (file: File) => {
    await new Promise((r) => setTimeout(r, 1500));

    const isMulti =
      file.name.endsWith(".csv") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");

    const sampleRecords: ParsedTeacherRecord[] = isMulti
      ? [
          {
            name: "Mr. Uchenna Nwosu",
            email: "uchenna.nwosu@ppsmb.edu.ng",
            phone: "+234 801 234 5678",
            gender: "Male",
            dateOfBirth: "1990-05-15",
            zone: "Enugu North",
            school: "Government Secondary School, Enugu",
            qualification: "B.Ed",
            subject: "Mathematics",
            gradeLevel: "GL 08",
            employmentDate: "2024-01-15",
          },
          {
            name: "Mrs. Blessing Agu",
            email: "blessing.agu@ppsmb.edu.ng",
            phone: "+234 803 987 6543",
            gender: "Female",
            dateOfBirth: "1988-11-22",
            zone: "Nsukka",
            school: "Community Secondary School, Nsukka",
            qualification: "M.Ed",
            subject: "English Language",
            gradeLevel: "GL 10",
            employmentDate: "2024-01-15",
          },
        ]
      : [
          {
            name: "Mr. Uchenna Nwosu",
            email: "uchenna.nwosu@ppsmb.edu.ng",
            phone: "+234 801 234 5678",
            gender: "Male",
            dateOfBirth: "1990-05-15",
            zone: "Enugu North",
            school: "Government Secondary School, Enugu",
            qualification: "B.Ed",
            subject: "Mathematics",
            gradeLevel: "GL 08",
            employmentDate: "2024-01-15",
          },
        ];

    parsedRecords.value = sampleRecords;
  };

  const resetManualForm = () => {
    manualForm.value = {
      name: "",
      email: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
      zone: "",
      school: "",
      qualification: "",
      subject: "",
      gradeLevel: "",
      employmentDate: "",
    };
  };

  const deleteTeacher = (id: string) => {
    const teacher = teachers.value.find((t) => t.id === id);
    teachers.value = teachers.value.filter((t) => t.id !== id);
    if (teacher) {
      addActivity({
        type: "staff",
        title: "Teacher Record Deleted",
        description: `${teacher.name} (${teacher.id}) removed from the system`,
        actor: "Current User",
        status: "warning",
      });
    }
  };

  return {
    // View
    viewMode,
    // State
    searchQuery,
    selectedZone,
    selectedStatus,
    selectedQualification,
    currentPage,
    pageSize,
    selectedRows,
    sortColumn,
    sortDirection,
    // Profile
    showProfileSheet,
    selectedTeacher,
    profileTab,
    // Transfer
    showTransferDialog,
    transferStep,
    transferDestination,
    transferReason,
    // Add teacher
    showAddDialog,
    addMethod,
    isScanning,
    isParsingFile,
    parsedRecords,
    editingRecordIndex,
    manualForm,
    // Bank
    showBankDialog,
    bankForm,
    // Data
    teachers,
    activityLog,
    filteredTeachers,
    paginatedTeachers,
    totalPages,
    stats,
    // Constants
    zones,
    qualifications,
    serviceStatuses,
    transferSchools,
    nigerianBanks,
    // Methods
    toggleSort,
    toggleSelectAll,
    toggleSelectRow,
    viewTeacher,
    initiateTransfer,
    clearFilters,
    hasActiveFilters,
    getStatusBadge,
    getInitials,
    getDaysUntilRetirement,
    getYearsUntilRetirement,
    addActivity,
    submitTransfer,
    addBankRecord,
    addTeacherManually,
    addParsedRecords,
    triggerScan,
    handleFileUpload,
    resetManualForm,
    deleteTeacher,
    isElectron: isElectron(),
  };
}
