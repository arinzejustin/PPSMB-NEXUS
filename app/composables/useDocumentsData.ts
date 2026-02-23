import { ref, computed, readonly, watch } from "vue";
import { db, isElectron, type DBRecord } from "@/lib/db";
import { useRawWebSocket } from "@/composables/useWebSocket";
import { useUser } from "@/composables/useUserStates";

// Document dimension types
export type DocumentDimension =
  | "chairman"
  | "central-registry"
  | "teacher-profiles";

// Document status types
export type OCRStatus = "completed" | "processing" | "failed" | "queued";

// Document interface
export interface ScannedDocument {
  id: string;
  filename: string;
  category: string;
  thumbnail: string;
  pages: number;
  size: string;
  sizeBytes?: number;
  ocrStatus: OCRStatus;
  ocrText?: string;
  uploadedAt: Date;
  uploadedBy: string;
  teacher: string | null;
  teacherId: string | null;
  tags: readonly string[];
  dimension: DocumentDimension;
  filePath?: string;
  pageContents?: readonly string[];
  _id?: string;
}

// Mutable version for internal use when creating/modifying documents
export interface MutableScannedDocument extends Omit<
  ScannedDocument,
  "tags" | "pageContents"
> {
  tags: string[];
  pageContents?: string[];
}

// Processing queue item interface
export interface ProcessingQueueItem {
  id: string;
  filename: string;
  pages: number;
  progress: number;
  status: "processing" | "queued" | "completed" | "failed";
  startedAt: Date | null;
  dimension: DocumentDimension;
  _id?: string;
}

// Teacher interface
export interface Teacher {
  id: string;
  name: string;
  school: string;
  zone: string;
  _id?: string;
}

// Document category interface
export interface DocumentCategory {
  value: string;
  label: string;
  count: number;
}

// Dimension configuration interface
export interface DimensionConfig {
  id: DocumentDimension;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  accessible: boolean;
}

// Documents data state interface
export interface DocumentsData {
  documents: ScannedDocument[];
  processingQueue: ProcessingQueueItem[];
  teachers: Teacher[];
  lastUpdated: Date;
}

// Default categories per dimension
const categoriesByDimension: Record<DocumentDimension, DocumentCategory[]> = {
  chairman: [
    { value: "directives", label: "Directives", count: 0 },
    { value: "approvals", label: "Approvals", count: 0 },
    { value: "correspondence", label: "Correspondence", count: 0 },
    { value: "minutes", label: "Meeting Minutes", count: 0 },
    { value: "memos", label: "Memos", count: 0 },
    { value: "policies", label: "Policies", count: 0 },
  ],
  "central-registry": [
    { value: "certificates", label: "Certificates", count: 0 },
    { value: "employment", label: "Employment Letters", count: 0 },
    { value: "transfers", label: "Transfer Documents", count: 0 },
    { value: "reports", label: "Reports", count: 0 },
    { value: "correspondence", label: "Correspondence", count: 0 },
    { value: "circulars", label: "Circulars", count: 0 },
    { value: "other", label: "Other", count: 0 },
  ],
  "teacher-profiles": [
    { value: "credentials", label: "Credentials", count: 0 },
    { value: "certificates", label: "Certificates", count: 0 },
    { value: "identification", label: "Identification", count: 0 },
    { value: "employment-history", label: "Employment History", count: 0 },
    { value: "evaluations", label: "Performance Evaluations", count: 0 },
    { value: "training", label: "Training Records", count: 0 },
    { value: "medical", label: "Medical Records", count: 0 },
  ],
};

// Default mock data for initial load
const defaultDocuments: ScannedDocument[] = [];
const defaultProcessingQueue: ProcessingQueueItem[] = [];
const defaultTeachers: Teacher[] = [];

/**
 * Documents Data Manager Class
 * Handles data fetching, caching, and real-time updates for documents
 */
class DocumentsDataManager {
  private data = ref<DocumentsData>({
    documents: defaultDocuments,
    processingQueue: defaultProcessingQueue,
    teachers: defaultTeachers,
    lastUpdated: new Date(),
  });

  private isLoading = ref(true);
  private error = ref<string | null>(null);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeElectron: (() => void) | null = null;
  private wsUnsubscribe: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (isElectron()) {
      await this.initElectron();
    } else {
      await this.initWeb();
    }
  }

  /**
   * Initialize for Electron environment
   * Listens for database change broadcasts from main process
   */
  private async initElectron() {
    // Also init web for WebSocket updates
    await this.initWeb();

    // Load initial data from local database
    await this.loadFromLocalDB();

    // Subscribe to database change events from Electron main process
    if (window.electronAPI?.onDatabaseChange) {
      this.unsubscribeElectron = window.electronAPI.onDatabaseChange(
        (event: { table: string; action: string; data?: any }) => {
          console.log("[Documents] Database change detected:", event);
          this.handleDatabaseChange(event);
        },
      );
    }

    // Set up periodic refresh (every 2 minutes for local data)
    this.refreshInterval = setInterval(
      () => {
        this.loadFromLocalDB();
      },
      2 * 60 * 1000,
    );
  }

  /**
   * Initialize for Web environment
   * Fetches data from API and sets up WebSocket for real-time updates
   */
  private async initWeb() {
    // Load initial data from API
    await this.loadFromAPI();

    // Set up WebSocket connection for real-time updates
    this.setupWebSocket();

    // Set up periodic refresh (every 5 minutes as fallback)
    this.refreshInterval = setInterval(
      () => {
        this.loadFromAPI();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Load documents data from local NeDB database (Electron)
   */
  private async loadFromLocalDB() {
    this.isLoading.value = true;
    this.error.value = null;

    try {
      return;
      // Fetch all scanned documents
      const scannedRecords = await db.find("scanned_records", {});

      // Map to ScannedDocument format
      const documents: ScannedDocument[] = scannedRecords.map(
        (record: any) => ({
          id: record._id || record.id,
          filename: record.filename || record.name || "Unknown",
          category: record.category || "other",
          thumbnail: record.thumbnail || "",
          pages: record.pages || 1,
          size: this.formatFileSize(record.sizeBytes || record.size || 0),
          sizeBytes: record.sizeBytes || record.size,
          ocrStatus: record.ocrStatus || "completed",
          ocrText: record.ocrText,
          uploadedAt: new Date(
            record.createdAt || record.uploadedAt || Date.now(),
          ),
          uploadedBy: record.uploadedBy || "System",
          teacher: record.teacherName || record.teacher || null,
          teacherId: record.teacherId || null,
          tags: record.tags || [],
          dimension: record.dimension || this.inferDimension(record),
          filePath: record.filePath,
          _id: record._id,
        }),
      );

      // Fetch processing queue
      const queueRecords = await db.find("processing_queue", {
        status: { $ne: "completed" } as unknown as string,
      });

      const processingQueue: ProcessingQueueItem[] = queueRecords.map(
        (record: any) => ({
          id: record._id || record.id,
          filename: record.filename || "Unknown",
          pages: record.pages || 1,
          progress: record.progress || 0,
          status: record.status || "queued",
          startedAt: record.startedAt ? new Date(record.startedAt) : null,
          dimension: record.dimension || "central-registry",
          _id: record._id,
        }),
      );

      // Fetch teachers list
      const staffRecords = await db.find("staff", {});
      const teachers: Teacher[] = staffRecords.map((record: any) => ({
        id: record._id || record.id,
        name: record.name || record.fullName || "Unknown",
        school: record.school || record.currentSchool || "Not Assigned",
        zone: record.zone || "Unknown",
        _id: record._id,
      }));

      // Update data
      this.data.value = {
        documents,
        processingQueue,
        teachers,
        lastUpdated: new Date(),
      };
    } catch (err) {
      console.error("Failed to load documents data from local DB:", err);
      this.error.value = "Failed to load documents data";
      // Load mock data as fallback
      await this.loadMockData();
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Load documents data from API (Web)
   */
  private async loadFromAPI() {
    this.isLoading.value = true;
    this.error.value = null;

    try {
      const response = await $fetch<{ data: DocumentsData }>(
        "/nn/api/documents",
        {
          method: "GET",
        },
      );

      if (response?.data) {
        this.data.value = {
          ...response.data,
          documents: response.data.documents.map((d) => ({
            ...d,
            uploadedAt: new Date(d.uploadedAt),
          })),
          lastUpdated: new Date(),
        };
      } else {
        await this.loadMockData();
      }
    } catch (err: any) {
      console.error("Failed to load documents data from API:", err);
      this.error.value = err.message || "Failed to load documents data";
      // Use mock data as fallback
      await this.loadMockData();
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Load mock data for development/demo purposes
   */
  private async loadMockData() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockDocuments: ScannedDocument[] = [
      // Chairman's Documents
      {
        id: "CHM001",
        filename: "Directive_Staff_Promotion_2025.pdf",
        category: "directives",
        thumbnail: "",
        pages: 3,
        size: "245 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["directive", "promotion", "2025", "urgent"],
        dimension: "chairman",
      },
      {
        id: "CHM002",
        filename: "Approval_Budget_Q1.pdf",
        category: "approvals",
        thumbnail: "",
        pages: 5,
        size: "412 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["approval", "budget", "Q1", "financial"],
        dimension: "chairman",
      },
      {
        id: "CHM003",
        filename: "Meeting_Minutes_Board_Jan2025.pdf",
        category: "minutes",
        thumbnail: "",
        pages: 12,
        size: "1.2 MB",
        ocrStatus: "processing",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
        uploadedBy: "Secretary",
        teacher: null,
        teacherId: null,
        tags: ["minutes", "board", "meeting", "january"],
        dimension: "chairman",
      },
      {
        id: "CHM001",
        filename: "Directive_Staff_Promotion_2025.pdf",
        category: "directives",
        thumbnail: "",
        pages: 3,
        size: "245 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["directive", "promotion", "2025", "urgent"],
        dimension: "chairman",
      },
      {
        id: "CHM002",
        filename: "Approval_Budget_Q1.pdf",
        category: "approvals",
        thumbnail: "",
        pages: 5,
        size: "412 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["approval", "budget", "Q1", "financial"],
        dimension: "chairman",
      },
      {
        id: "CHM003",
        filename: "Meeting_Minutes_Board_Jan2025.pdf",
        category: "minutes",
        thumbnail: "",
        pages: 12,
        size: "1.2 MB",
        ocrStatus: "processing",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
        uploadedBy: "Secretary",
        teacher: null,
        teacherId: null,
        tags: ["minutes", "board", "meeting", "january"],
        dimension: "chairman",
      },
      {
        id: "CHM001",
        filename: "Directive_Staff_Promotion_2025.pdf",
        category: "directives",
        thumbnail: "",
        pages: 3,
        size: "245 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["directive", "promotion", "2025", "urgent"],
        dimension: "chairman",
      },
      {
        id: "CHM002",
        filename: "Approval_Budget_Q1.pdf",
        category: "approvals",
        thumbnail: "",
        pages: 5,
        size: "412 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["approval", "budget", "Q1", "financial"],
        dimension: "chairman",
      },
      {
        id: "CHM003",
        filename: "Meeting_Minutes_Board_Jan2025.pdf",
        category: "minutes",
        thumbnail: "",
        pages: 12,
        size: "1.2 MB",
        ocrStatus: "processing",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
        uploadedBy: "Secretary",
        teacher: null,
        teacherId: null,
        tags: ["minutes", "board", "meeting", "january"],
        dimension: "chairman",
      },
      {
        id: "CHM001",
        filename: "Directive_Staff_Promotion_2025.pdf",
        category: "directives",
        thumbnail: "",
        pages: 3,
        size: "245 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["directive", "promotion", "2025", "urgent"],
        dimension: "chairman",
      },
      {
        id: "CHM002",
        filename: "Approval_Budget_Q1.pdf",
        category: "approvals",
        thumbnail: "",
        pages: 5,
        size: "412 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        uploadedBy: "Chairman's Office",
        teacher: null,
        teacherId: null,
        tags: ["approval", "budget", "Q1", "financial"],
        dimension: "chairman",
      },
      {
        id: "CHM003",
        filename: "Meeting_Minutes_Board_Jan2025.pdf",
        category: "minutes",
        thumbnail: "",
        pages: 12,
        size: "1.2 MB",
        ocrStatus: "processing",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
        uploadedBy: "Secretary",
        teacher: null,
        teacherId: null,
        tags: ["minutes", "board", "meeting", "january"],
        dimension: "chairman",
      },
      // Central Registry Documents
      {
        id: "REG001",
        filename: "Employment_Letter_Batch_23.pdf",
        category: "employment",
        thumbnail: "",
        pages: 2,
        size: "245 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        uploadedBy: "Central Registry",
        teacher: null,
        teacherId: null,
        tags: ["employment", "batch-23", "verified"],
        dimension: "central-registry",
      },
      {
        id: "REG002",
        filename: "Transfer_Documents_Zone_A.pdf",
        category: "transfers",
        thumbnail: "",
        pages: 8,
        size: "892 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        uploadedBy: "Registry Staff",
        teacher: null,
        teacherId: null,
        tags: ["transfer", "zone-a", "pending"],
        dimension: "central-registry",
      },
      {
        id: "REG003",
        filename: "Circular_Holiday_Schedule_2025.pdf",
        category: "circulars",
        thumbnail: "",
        pages: 1,
        size: "156 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        uploadedBy: "Central Registry",
        teacher: null,
        teacherId: null,
        tags: ["circular", "holiday", "2025", "schedule"],
        dimension: "central-registry",
      },
      {
        id: "REG004",
        filename: "Annual_Report_2024.pdf",
        category: "reports",
        thumbnail: "",
        pages: 45,
        size: "4.5 MB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        uploadedBy: "Admin Office",
        teacher: null,
        teacherId: null,
        tags: ["report", "annual", "2024", "comprehensive"],
        dimension: "central-registry",
      },

      // Teacher Profile Documents (named by teacher)
      {
        id: "TPR001",
        filename: "Mrs_Adaobi_Nwankwo_Credentials.pdf",
        category: "credentials",
        thumbnail: "",
        pages: 8,
        size: "1.2 MB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        uploadedBy: "HR Department",
        teacher: "Mrs. Adaobi Nwankwo",
        teacherId: "TCH001",
        tags: ["credentials", "verified", "b.ed", "pgde"],
        dimension: "teacher-profiles",
      },
      {
        id: "TPR002",
        filename: "Mr_Emmanuel_Okonkwo_Certificates.pdf",
        category: "certificates",
        thumbnail: "",
        pages: 12,
        size: "2.3 MB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        uploadedBy: "HR Department",
        teacher: "Mr. Emmanuel Okonkwo",
        teacherId: "TCH002",
        tags: ["certificates", "waec", "degree", "nysc"],
        dimension: "teacher-profiles",
      },
      {
        id: "TPR003",
        filename: "Mrs_Chioma_Eze_Employment_History.pdf",
        category: "employment-history",
        thumbnail: "",
        pages: 6,
        size: "756 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        uploadedBy: "Personnel Unit",
        teacher: "Mrs. Chioma Eze",
        teacherId: "TCH003",
        tags: ["employment", "history", "promotion-record"],
        dimension: "teacher-profiles",
      },
      {
        id: "TPR004",
        filename: "Mr_Chukwuemeka_Okoro_Evaluations.pdf",
        category: "evaluations",
        thumbnail: "",
        pages: 15,
        size: "1.8 MB",
        ocrStatus: "processing",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
        uploadedBy: "Inspection Unit",
        teacher: "Mr. Chukwuemeka Okoro",
        teacherId: "TCH004",
        tags: ["evaluation", "performance", "2024", "outstanding"],
        dimension: "teacher-profiles",
      },
      {
        id: "TPR005",
        filename: "Miss_Ngozi_Okoro_Training_Records.pdf",
        category: "training",
        thumbnail: "",
        pages: 4,
        size: "445 KB",
        ocrStatus: "completed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        uploadedBy: "Training Department",
        teacher: "Miss Ngozi Okoro",
        teacherId: "TCH005",
        tags: ["training", "workshop", "seminar", "certificate"],
        dimension: "teacher-profiles",
      },
      {
        id: "TPR006",
        filename: "Mr_Ikechukwu_Agu_Identification.pdf",
        category: "identification",
        thumbnail: "",
        pages: 3,
        size: "523 KB",
        ocrStatus: "failed",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        uploadedBy: "Admin Staff",
        teacher: "Mr. Ikechukwu Agu",
        teacherId: "TCH006",
        tags: ["id", "passport", "nin", "lga-origin"],
        dimension: "teacher-profiles",
      },
    ];

    const mockProcessingQueue: ProcessingQueueItem[] = [
      {
        id: "PQ001",
        filename: "Certificate_Batch_23.pdf",
        pages: 12,
        progress: 75,
        status: "processing",
        startedAt: new Date(Date.now() - 1000 * 60 * 5),
        dimension: "central-registry",
      },
      {
        id: "PQ002",
        filename: "Chairman_Directives_Jan.pdf",
        pages: 8,
        progress: 45,
        status: "processing",
        startedAt: new Date(Date.now() - 1000 * 60 * 2),
        dimension: "chairman",
      },
      {
        id: "PQ003",
        filename: "Mrs_Adaobi_Nwankwo_Profile.pdf",
        pages: 25,
        progress: 10,
        status: "queued",
        startedAt: null,
        dimension: "teacher-profiles",
      },
    ];

    const mockTeachers: Teacher[] = [
      {
        id: "TCH001",
        name: "Mrs. Adaobi Nwankwo",
        school: "Unity Primary School",
        zone: "Enugu North",
      },
      {
        id: "TCH002",
        name: "Mr. Emmanuel Okonkwo",
        school: "Central Secondary School",
        zone: "Enugu East",
      },
      {
        id: "TCH003",
        name: "Mrs. Chioma Eze",
        school: "Government Girls College",
        zone: "Enugu South",
      },
      {
        id: "TCH004",
        name: "Mr. Chukwuemeka Okoro",
        school: "Model Primary School",
        zone: "Nsukka",
      },
      {
        id: "TCH005",
        name: "Miss Ngozi Okoro",
        school: "Technical College",
        zone: "Udi",
      },
      {
        id: "TCH006",
        name: "Mr. Ikechukwu Agu",
        school: "Community Secondary School",
        zone: "Igbo-Etiti",
      },
      {
        id: "TCH007",
        name: "Mrs. Amaka Uzoma",
        school: "Science and Technical College",
        zone: "Oji River",
      },
      {
        id: "TCH008",
        name: "Mr. Obinna Nwosu",
        school: "Central Primary School",
        zone: "Awgu",
      },
    ];

    this.data.value = {
      documents: mockDocuments,
      processingQueue: mockProcessingQueue,
      teachers: mockTeachers,
      lastUpdated: new Date(),
    };
  }

  /**
   * Set up WebSocket listener for real-time updates (Web)
   */
  private setupWebSocket() {
    try {
      const { client, isConnected } = useRawWebSocket();

      const setupChannelSubscription = () => {
        if (!client.value || !client.value.isConnected) {
          return;
        }

        // Subscribe to documents channel
        client.value.subscribe("documents");

        // Set up listener if not already set
        if (!this.wsUnsubscribe) {
          this.wsUnsubscribe = client.value.on(
            "documents_update",
            (data: Partial<DocumentsData>) => {
              this.handleWebSocketUpdate(data);
            },
            "documents",
          );
        }
      };

      // Watch for client availability and connection status changes
      watch(
        [() => client.value, isConnected],
        ([clientVal, connected]) => {
          if (clientVal && connected) {
            setupChannelSubscription();
          }
        },
        { immediate: true },
      );
    } catch (err) {
      console.error("Failed to setup WebSocket listener:", err);
    }
  }

  /**
   * Handle WebSocket update for web
   */
  private handleWebSocketUpdate(updateData: Partial<DocumentsData>) {
    if (updateData.documents) {
      updateData.documents = updateData.documents.map((d) => ({
        ...d,
        uploadedAt: new Date(d.uploadedAt),
      }));
    }

    this.data.value = {
      ...this.data.value,
      ...updateData,
      lastUpdated: new Date(),
    };
  }

  /**
   * Handle database change event from Electron
   */
  private async handleDatabaseChange(event: {
    table: string;
    action: string;
    data?: any;
  }) {
    const tablesToWatch = ["scanned_records", "processing_queue", "staff"];

    if (tablesToWatch.includes(event.table)) {
      await this.loadFromLocalDB();
    }
  }

  /**
   * Format file size from bytes
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Infer document dimension from record data
   */
  private inferDimension(record: any): DocumentDimension {
    if (
      record.source === "chairman" ||
      record.uploadedBy?.toLowerCase().includes("chairman")
    ) {
      return "chairman";
    }
    if (record.teacherId || record.teacher || record.teacherName) {
      return "teacher-profiles";
    }
    return "central-registry";
  }

  /**
   * Refresh documents data
   */
  public async refresh() {
    if (isElectron()) {
      await this.loadFromLocalDB();
    } else {
      await this.loadFromAPI();
    }
  }

  /**
   * Add a new document
   */
  public async addDocument(
    doc: Partial<ScannedDocument>,
  ): Promise<ScannedDocument | null> {
    try {
      // Create as mutable first, then treat as readonly when stored
      let newDocId = "";
      let newDocDbId: string | undefined;

      const baseDoc = {
        id: "",
        filename: doc.filename || "Untitled",
        category: doc.category || "other",
        thumbnail: doc.thumbnail || "",
        pages: doc.pages || 1,
        size: doc.size || "0 KB",
        ocrStatus: doc.ocrStatus || "queued",
        uploadedAt: new Date(),
        uploadedBy: doc.uploadedBy || "System",
        teacher: doc.teacher || null,
        teacherId: doc.teacherId || null,
        tags: [...(doc.tags || [])] as readonly string[],
        dimension: doc.dimension || "central-registry",
      };

      if (isElectron()) {
        const result = await db.insert("scanned_records", baseDoc);
        newDocId = result.id || "";
        newDocDbId = result.id;
      } else {
        // API call for web
        const response = await $fetch<{ data: ScannedDocument }>(
          "/api/documents",
          {
            method: "POST",
            body: baseDoc,
          },
        );
        if (response?.data) {
          newDocId = response.data.id;
          newDocDbId = response.data.id;
        }
      }

      const newDoc: ScannedDocument = {
        ...baseDoc,
        id: newDocId,
        _id: newDocDbId,
      };

      // Update local state
      this.data.value = {
        ...this.data.value,
        documents: [...this.data.value.documents, newDoc],
        lastUpdated: new Date(),
      };

      return newDoc;
    } catch (err) {
      console.error("Failed to add document:", err);
      return null;
    }
  }

  /**
   * Delete a document
   */
  public async deleteDocument(docId: string): Promise<boolean> {
    try {
      if (isElectron()) {
        await db.delete("scanned_records", { _id: docId });
      } else {
        await $fetch(`/api/documents/${docId}`, { method: "DELETE" });
      }

      this.data.value = {
        ...this.data.value,
        documents: this.data.value.documents.filter(
          (d) => d.id !== docId && d._id !== docId,
        ),
        lastUpdated: new Date(),
      };

      return true;
    } catch (err) {
      console.error("Failed to delete document:", err);
      return false;
    }
  }

  /**
   * Update document tags
   */
  public async updateDocumentTags(
    docId: string,
    tags: string[],
  ): Promise<boolean> {
    try {
      if (isElectron()) {
        await db.update<DBRecord>(
          "scanned_records",
          { _id: docId },
          { $set: { tags } },
        );
      } else {
        await $fetch(`/api/documents/${docId}/tags`, {
          method: "PATCH",
          body: { tags },
        });
      }

      this.data.value = {
        ...this.data.value,
        documents: this.data.value.documents.map((d) =>
          d.id === docId || d._id === docId ? { ...d, tags } : d,
        ),
        lastUpdated: new Date(),
      };

      return true;
    } catch (err) {
      console.error("Failed to update document tags:", err);
      return false;
    }
  }

  /**
   * Get current data
   */
  public getData() {
    return readonly(this.data);
  }

  /**
   * Get loading state
   */
  public getIsLoading() {
    return readonly(this.isLoading);
  }

  /**
   * Get error state
   */
  public getError() {
    return readonly(this.error);
  }

  /**
   * Cleanup resources
   */
  public cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.unsubscribeElectron) {
      this.unsubscribeElectron();
    }
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe();
    }
  }
}

// Singleton instance
let documentsManager: DocumentsDataManager | null = null;

function getDocumentsManager(): DocumentsDataManager {
  if (!documentsManager) {
    documentsManager = new DocumentsDataManager();
  }
  return documentsManager;
}

/**
 * Documents Data Composable Hook
 */
export function useDocumentsData() {
  const manager = getDocumentsManager();
  const data = manager.getData();
  const isLoading = manager.getIsLoading();
  const error = manager.getError();
  const user = useUser();

  // User role/access computed properties
  const userRole = computed(() => user.value?.role?.toLowerCase() || "");
  const userDepartment = computed(
    () => user.value?.department?.toLowerCase() || "",
  );

  const { hasAccess: isChairman } = useRoleAccess(["chairman", "manager"]);

  const hasCentralRegistryAccess = computed(
    () =>
      isChairman.value ||
      userDepartment.value.includes("central") ||
      userDepartment.value.includes("registry") ||
      userRole.value.includes("registry"),
  );

  const hasTeacherProfileAccess = computed(
    () =>
      isChairman.value ||
      userDepartment.value.includes("hr") ||
      userDepartment.value.includes("human") ||
      userDepartment.value.includes("personnel") ||
      userRole.value.includes("hr"),
  );

  // Dimensions configuration
  const dimensions = computed<DimensionConfig[]>(() => [
    {
      id: "chairman",
      label: "Chairman's Documents",
      description: "Scanned documents from the Chairman's office",
      icon: "Crown",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      textColor: "text-amber-600 dark:text-amber-400",
      accessible: isChairman.value,
    },
    {
      id: "central-registry",
      label: "Central Registry",
      description: "Scanned documents from the Central Registry",
      icon: "Building2",
      color: "from-blue-500 to-indigo-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-blue-600 dark:text-blue-400",
      accessible: hasCentralRegistryAccess.value,
    },
    {
      id: "teacher-profiles",
      label: "Teacher Profiles",
      description: "Teacher paperwork and profile documents",
      icon: "GraduationCap",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
      accessible: hasTeacherProfileAccess.value,
    },
  ]);

  const accessibleDimensions = computed(() =>
    dimensions.value.filter((d) => d.accessible),
  );

  // Computed data accessors
  const documents = computed(() => data.value.documents);
  const processingQueue = computed(() => data.value.processingQueue);
  const teachers = computed(() => data.value.teachers);
  const lastUpdated = computed(() => data.value.lastUpdated);

  // Get documents by dimension
  const getDocumentsByDimension = (dimension: DocumentDimension) =>
    computed(() => documents.value.filter((d) => d.dimension === dimension));

  // Get processing queue by dimension
  const getProcessingQueueByDimension = (dimension: DocumentDimension) =>
    computed(() =>
      processingQueue.value.filter((p) => p.dimension === dimension),
    );

  // Get categories for a dimension
  const getCategoriesForDimension = (dimension: DocumentDimension) => {
    const baseCats = [...categoriesByDimension[dimension]];
    const dimensionDocs = documents.value.filter(
      (d) => d.dimension === dimension,
    );

    return baseCats.map((cat) => ({
      ...cat,
      count: dimensionDocs.filter((d) => d.category === cat.value).length,
    }));
  };

  // Stats for a dimension
  const getStatsForDimension = (dimension: DocumentDimension) =>
    computed(() => {
      const dimensionDocs = documents.value.filter(
        (d) => d.dimension === dimension,
      );
      return {
        total: dimensionDocs.length,
        processing: dimensionDocs.filter((d) => d.ocrStatus === "processing")
          .length,
        completed: dimensionDocs.filter((d) => d.ocrStatus === "completed")
          .length,
        failed: dimensionDocs.filter((d) => d.ocrStatus === "failed").length,
      };
    });

  // Actions
  const refresh = () => manager.refresh();
  const addDocument = (doc: Partial<ScannedDocument>) =>
    manager.addDocument(doc);
  const deleteDocument = (docId: string) => manager.deleteDocument(docId);
  const updateDocumentTags = (docId: string, tags: string[]) =>
    manager.updateDocumentTags(docId, tags);
  const cleanup = () => manager.cleanup();

  return {
    // Data
    data,
    documents,
    processingQueue,
    teachers,
    lastUpdated,

    // Dimensions
    dimensions,
    accessibleDimensions,
    categoriesByDimension,

    // Access control
    isChairman,
    hasCentralRegistryAccess,
    hasTeacherProfileAccess,

    // State
    isLoading,
    error,

    // Helpers
    getDocumentsByDimension,
    getProcessingQueueByDimension,
    getCategoriesForDimension,
    getStatsForDimension,

    // Actions
    refresh,
    addDocument,
    deleteDocument,
    updateDocumentTags,
    cleanup,

    // Environment
    isElectron: isElectron(),
  };
}
