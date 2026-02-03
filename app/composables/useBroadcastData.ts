/**
 * Communication & Broadcasting Hub Composable
 * Manages state and logic for the broadcast system
 */

import { ref, computed, readonly } from "vue";
import { db, isElectron } from "@/lib/db";
import { useUser } from "@/composables/useUserStates";
import type {
  RecipientFilterType,
  RecipientFilter,
  Recipient,
  BroadcastMessage,
  BroadcastDraft,
  SmartLink,
  Zone,
  School,
  Subject,
  StaffRole,
  MessageTemplate,
  BroadcastHistoryEntry,
  BroadcastState,
} from "@/types/broadcast";

// Mock data for zones
const mockZones: Zone[] = [
  {
    id: "z1",
    name: "Enugu North",
    code: "EN",
    teacherCount: 245,
    schoolCount: 18,
  },
  {
    id: "z2",
    name: "Enugu East",
    code: "EE",
    teacherCount: 312,
    schoolCount: 22,
  },
  {
    id: "z3",
    name: "Enugu South",
    code: "ES",
    teacherCount: 198,
    schoolCount: 15,
  },
  { id: "z4", name: "Nsukka", code: "NS", teacherCount: 423, schoolCount: 35 },
  { id: "z5", name: "Udi", code: "UD", teacherCount: 287, schoolCount: 24 },
  { id: "z6", name: "Awgu", code: "AW", teacherCount: 156, schoolCount: 12 },
  {
    id: "z7",
    name: "Igbo-Etiti",
    code: "IE",
    teacherCount: 178,
    schoolCount: 14,
  },
  {
    id: "z8",
    name: "Oji River",
    code: "OJ",
    teacherCount: 134,
    schoolCount: 10,
  },
];

// Mock schools
const mockSchools: School[] = [
  {
    id: "s1",
    name: "Unity Primary School",
    zone: "Enugu North",
    zoneId: "z1",
    teacherCount: 15,
    principalName: "Mrs. Adaeze Obi",
    principalEmail: "adaeze.obi@ppsmb.edu.ng",
    principalPhone: "+2348034567890",
  },
  {
    id: "s2",
    name: "Central Secondary School",
    zone: "Enugu East",
    zoneId: "z2",
    teacherCount: 28,
    principalName: "Mr. Chukwuemeka Eze",
    principalEmail: "chukwuemeka.eze@ppsmb.edu.ng",
    principalPhone: "+2348045678901",
  },
  {
    id: "s3",
    name: "Government Girls College",
    zone: "Enugu South",
    zoneId: "z3",
    teacherCount: 32,
    principalName: "Mrs. Ngozi Okwu",
    principalEmail: "ngozi.okwu@ppsmb.edu.ng",
    principalPhone: "+2348056789012",
  },
  {
    id: "s4",
    name: "Model Primary School",
    zone: "Nsukka",
    zoneId: "z4",
    teacherCount: 12,
    principalName: "Mr. Obinna Nwosu",
    principalEmail: "obinna.nwosu@ppsmb.edu.ng",
    principalPhone: "+2348067890123",
  },
  {
    id: "s5",
    name: "Technical College Udi",
    zone: "Udi",
    zoneId: "z5",
    teacherCount: 45,
    principalName: "Mr. Ikechukwu Agu",
    principalEmail: "ikechukwu.agu@ppsmb.edu.ng",
    principalPhone: "+2348078901234",
  },
  {
    id: "s6",
    name: "Community Secondary School Awgu",
    zone: "Awgu",
    zoneId: "z6",
    teacherCount: 18,
    principalName: "Mrs. Amaka Uzoma",
    principalEmail: "amaka.uzoma@ppsmb.edu.ng",
    principalPhone: "+2348089012345",
  },
];

// Mock subjects
const mockSubjects: Subject[] = [
  { id: "sub1", name: "Mathematics", code: "MATH", teacherCount: 234 },
  { id: "sub2", name: "English Language", code: "ENG", teacherCount: 287 },
  { id: "sub3", name: "Physics", code: "PHY", teacherCount: 145 },
  { id: "sub4", name: "Chemistry", code: "CHE", teacherCount: 132 },
  { id: "sub5", name: "Biology", code: "BIO", teacherCount: 156 },
  { id: "sub6", name: "Computer Science", code: "CS", teacherCount: 89 },
  { id: "sub7", name: "Agricultural Science", code: "AGRIC", teacherCount: 67 },
  { id: "sub8", name: "History", code: "HIST", teacherCount: 78 },
  { id: "sub9", name: "Geography", code: "GEO", teacherCount: 92 },
  { id: "sub10", name: "Economics", code: "ECON", teacherCount: 84 },
];

// Mock roles
const mockRoles: StaffRole[] = [
  { id: "role1", name: "principal", label: "Principal", count: 150 },
  { id: "role2", name: "vice_principal", label: "Vice Principal", count: 145 },
  {
    id: "role3",
    name: "head_of_department",
    label: "Head of Department",
    count: 320,
  },
  { id: "role4", name: "senior_teacher", label: "Senior Teacher", count: 456 },
  { id: "role5", name: "teacher", label: "Teacher", count: 1234 },
  {
    id: "role6",
    name: "zonal_education_officer",
    label: "Zonal Education Officer",
    count: 8,
  },
];

// Mock recipients for simulation
const mockRecipients: Recipient[] = [
  {
    id: "r1",
    name: "Mrs. Adaobi Nwankwo",
    email: "adaobi.nwankwo@ppsmb.edu.ng",
    phone: "+2348034567890",
    zone: "Enugu North",
    school: "Unity Primary School",
    role: "teacher",
    subject: "Mathematics",
    tags: ["role:teacher", "zone:enugu-north", "subject:mathematics"],
  },
  {
    id: "r2",
    name: "Mr. Emmanuel Okonkwo",
    email: "emmanuel.okonkwo@ppsmb.edu.ng",
    phone: "+2348045678901",
    zone: "Enugu East",
    school: "Central Secondary School",
    role: "senior_teacher",
    subject: "English Language",
    tags: ["role:senior_teacher", "zone:enugu-east", "subject:english"],
  },
  {
    id: "r3",
    name: "Mrs. Chioma Eze",
    email: "chioma.eze@ppsmb.edu.ng",
    phone: "+2348056789012",
    zone: "Enugu South",
    school: "Government Girls College",
    role: "head_of_department",
    subject: "Physics",
    tags: ["role:head_of_department", "zone:enugu-south", "subject:physics"],
  },
  {
    id: "r4",
    name: "Mr. Chukwuemeka Okoro",
    email: "chukwuemeka.okoro@ppsmb.edu.ng",
    phone: "+2348067890123",
    zone: "Nsukka",
    school: "Model Primary School",
    role: "principal",
    subject: "Biology",
    tags: ["role:principal", "zone:nsukka", "subject:biology"],
  },
  {
    id: "r5",
    name: "Miss Ngozi Okoro",
    email: "ngozi.okoro@ppsmb.edu.ng",
    phone: "+2348078901234",
    zone: "Udi",
    school: "Technical College Udi",
    role: "teacher",
    subject: "Computer Science",
    tags: ["role:teacher", "zone:udi", "subject:computer-science"],
  },
];

// Message templates
const defaultTemplates: MessageTemplate[] = [
  {
    id: "tpl1",
    name: "Staff Meeting Notice",
    channel: "email",
    subject: "Important: Staff Meeting Notice",
    body: `Dear Staff,

This is to inform you that a mandatory staff meeting has been scheduled.

Date: [DATE]
Time: [TIME]
Venue: [VENUE]

Your attendance is compulsory.

Best regards,
Management`,
    tags: ["meeting", "official"],
    createdAt: new Date(),
    usageCount: 24,
  },
  {
    id: "tpl2",
    name: "Urgent SMS Alert",
    channel: "sms",
    body: "PPSMB ALERT: [MESSAGE]. For enquiries, call [PHONE].",
    tags: ["urgent", "alert"],
    createdAt: new Date(),
    usageCount: 56,
  },
  {
    id: "tpl3",
    name: "Training Workshop Invitation",
    channel: "email",
    subject: "Invitation: Professional Development Workshop",
    body: `Dear Colleague,

You are cordially invited to attend a Professional Development Workshop.

Topic: [TOPIC]
Date: [DATE]
Time: [TIME]
Venue: [VENUE]

Please confirm your attendance by [DEADLINE].

Warm regards,
Training Department`,
    tags: ["training", "workshop"],
    createdAt: new Date(),
    usageCount: 12,
  },
];

/**
 * Broadcast Data Manager Class
 * Singleton pattern for managing broadcast state
 */
class BroadcastDataManager {
  private state = ref<BroadcastState>({
    currentMessage: null,
    drafts: [],
    history: [],
    zones: mockZones,
    schools: mockSchools,
    subjects: mockSubjects,
    roles: mockRoles,
    templates: defaultTemplates,
    isSending: false,
    isLoading: false,
    error: null,
  });

  private wsUnsubscribe: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    this.state.value.isLoading = true;
    try {
      await this.loadDeviceData();
      await this.refreshHistory();
    } catch (err) {
      this.state.value.error = "Failed to load broadcast data";
      this.loadMockData(); // Ultimate fallback
    } finally {
      this.state.value.isLoading = false;
    }
  }

  private async loadDeviceData() {
    try {
      const drafts = await db.find<BroadcastDraft>("broadcast_drafts", {});
      if (drafts.length > 0) {
        this.state.value.drafts = drafts;
      }

      const templates = await db.find<MessageTemplate>(
        "broadcast_templates",
        {},
      );
      if (templates.length > 0) {
        this.state.value.templates = [...defaultTemplates, ...templates];
      }
    } catch (err) {}
  }

  private loadMockData() {
    this.state.value.history = [
      {
        id: "hist1",
        channel: "email",
        subject: "Annual Teacher Census Report Reminder",
        previewText:
          "Please submit your annual census report by the deadline...",
        recipientCount: 1234,
        filterType: "global",
        filterLabel: "All Teachers",
        isInternal: false,
        status: "sent" as BroadcastMessage["status"],
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        sentBy: "Chairman Office",
        deliveryStats: { total: 1234, sent: 1230, failed: 4, pending: 0 },
      },
      {
        id: "hist2",
        channel: "sms",
        previewText: "URGENT: All principals are required to attend...",
        recipientCount: 150,
        filterType: "role",
        filterLabel: "All Principals",
        isInternal: false,
        status: "sent" as BroadcastMessage["status"],
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        sentBy: "Secretary",
        deliveryStats: { total: 150, sent: 148, failed: 2, pending: 0 },
      },
      {
        id: "hist3",
        channel: "email",
        subject: "Internal Memo: Budget Review Meeting",
        previewText: "This is to notify all HQ staff about the upcoming...",
        recipientCount: 25,
        filterType: "headquarters",
        filterLabel: "Main Headquarters",
        isInternal: true,
        status: "sent" as BroadcastMessage["status"],
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        sentBy: "PRO",
        deliveryStats: { total: 25, sent: 25, failed: 0, pending: 0 },
      },
    ];
  }

  /**
   * Get estimated recipient count based on filter
   */
  public async getRecipientCount(filter: RecipientFilter): Promise<number> {
    switch (filter.type) {
      case "individual":
        return filter.value ? filter.value.split(',').length : 0;
      case "global":
        return this.state.value.roles.reduce((sum, r) => sum + r.count, 0);
      case "zone":
        const zone = this.state.value.zones.find((z) => z.id === filter.value);
        return zone?.teacherCount || 0;
      case "school":
        const school = this.state.value.schools.find(
          (s) => s.id === filter.value,
        );
        return school?.teacherCount || 0;
      case "role":
        const role = this.state.value.roles.find((r) => r.id === filter.value);
        return role?.count || 0;
      case "subject":
        const subject = this.state.value.subjects.find(
          (s) => s.id === filter.value,
        );
        return subject?.teacherCount || 0;
      case "headquarters":
        return filter.value === "main" ? 35 : 8;
      default:
        return 0;
    }
  }

  /**
   * Send broadcast message
   */
  public async sendBroadcast(
    message: BroadcastMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.state.value.isSending = true;
    this.state.value.error = null;

    try {
      // Validate message
      if (message.channel === "email" && !message.emailContent?.subject) {
        throw new Error("Email subject is required");
      }
      if (message.channel === "email" && !message.emailContent?.body) {
        throw new Error("Email body is required");
      }
      if (message.channel === "sms" && !message.smsContent?.body) {
        throw new Error("SMS body is required");
      }
      if (message.recipientCount === 0) {
        throw new Error("No recipients selected");
      }

      // In real implementation, send to backend
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const messageId = `msg_${Date.now()}`;

      // Add to history
      const historyEntry: BroadcastHistoryEntry = {
        id: messageId,
        channel: message.channel,
        subject: message.emailContent?.subject,
        previewText:
          message.channel === "email"
            ? message.emailContent?.body?.substring(0, 100) || ""
            : message.smsContent?.body?.substring(0, 100) || "",
        recipientCount: message.recipientCount,
        filterType: message.recipientFilter.type,
        filterLabel: message.recipientFilter.label,
        isInternal: message.isInternal,
        status: "sent",
        sentAt: new Date(),
        sentBy: message.createdBy,
        deliveryStats: {
          total: message.recipientCount,
          sent: message.recipientCount,
          failed: 0,
          pending: 0,
        },
      };

      this.state.value.history.unshift(historyEntry);

      // Save to local database (works for both Electron and Web)
      try {
        await db.insert("broadcast_history", historyEntry);
      } catch (err) {
        console.error("Failed to save history to database:", err);
      }

      return { success: true, messageId };
    } catch (err: any) {
      this.state.value.error = err.message || "Failed to send broadcast";
      return { success: false, error: err.message };
    } finally {
      this.state.value.isSending = false;
    }
  }

  /**
   * Save draft
   */
  public async saveDraft(draft: BroadcastDraft): Promise<string> {
    const draftId = draft.id || `draft_${Date.now()}`;
    const updatedDraft = { ...draft, id: draftId, lastModified: new Date() };

    const existingIndex = this.state.value.drafts.findIndex(
      (d) => d.id === draftId,
    );
    if (existingIndex >= 0) {
      this.state.value.drafts[existingIndex] = updatedDraft;
    } else {
      this.state.value.drafts.unshift(updatedDraft);
    }

    // Save to database (works for both Electron NeDB and Web IndexedDB)
    try {
      const existing = await db.findOne("broadcast_drafts", { id: draftId });
      if (existing) {
        await db.update(
          "broadcast_drafts",
          { id: draftId },
          { $set: updatedDraft },
        );
      } else {
        await db.insert("broadcast_drafts", updatedDraft);
      }
    } catch (err) {
      console.error("Failed to save draft to database:", err);
    }

    return draftId;
  }

  /**
   * Delete draft
   */
  public async deleteDraft(draftId: string): Promise<void> {
    this.state.value.drafts = this.state.value.drafts.filter(
      (d) => d.id !== draftId,
    );
    // Delete from database (works for both Electron and Web)
    try {
      await db.delete("broadcast_drafts", { id: draftId });
    } catch (err) {
      console.error("Failed to delete draft from database:", err);
    }
  }

  /**
   * Upload file for SMS smart link
   */
  public async uploadForSmartLink(file: File): Promise<SmartLink> {
    try {
      // In real implementation, upload to file hosting service
      // and generate shortened URL
      const shortUrl = `https://ppsmb.link/${Math.random().toString(36).substring(2, 8)}`;

      return {
        originalUrl: URL.createObjectURL(file),
        shortUrl,
        fileName: file.name,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
    } catch (err) {
      console.error("Failed to upload smart link:", err);
      throw new Error("Failed to upload file for smart link");
    }
  }

  /**
   * Get recipients by filter (for preview)
   */
  public async getRecipientsByFilter(
    filter: RecipientFilter,
    limit = 10,
  ): Promise<Recipient[]> {
    // In real implementation, query from backend
    // For now, return filtered mock data
    return mockRecipients.slice(0, limit);
  }

  /**
   * Save template
   */
  public async saveTemplate(
    template: Pick<
      MessageTemplate,
      "name" | "channel" | "subject" | "body" | "tags"
    >,
  ): Promise<string> {
    const templateId = `tpl_${Date.now()}`;
    const newTemplate: MessageTemplate = {
      id: templateId,
      name: template.name,
      channel: template.channel,
      subject: template.subject,
      body: template.body,
      tags: template.tags,
      createdAt: new Date(),
      usageCount: 0,
    };

    this.state.value.templates.push(newTemplate);

    // Save to database (works for both Electron and Web)
    try {
      await db.insert("broadcast_templates", newTemplate);
    } catch (err) {
      console.error("Failed to save template to database:", err);
    }

    return templateId;
  }

  /**
   * Delete template
   */
  public async deleteTemplate(templateId: string): Promise<void> {
    this.state.value.templates = this.state.value.templates.filter(
      (t) => t.id !== templateId,
    );
    // Delete from database (works for both Electron and Web)
    try {
      await db.delete("broadcast_templates", { id: templateId });
    } catch (err) {
      console.error("Failed to delete template from database:", err);
    }
  }

  /**
   * Update template
   */
  public async updateTemplate(
    templateId: string,
    updates: Partial<
      Pick<MessageTemplate, "name" | "subject" | "body" | "tags">
    >,
  ): Promise<void> {
    const index = this.state.value.templates.findIndex(
      (t) => t.id === templateId,
    );
    const currentTemplate = this.state.value.templates[index];

    if (index >= 0 && currentTemplate) {
      const updatedTemplate: MessageTemplate = {
        ...currentTemplate,
        ...updates,
        tags: updates.tags ? [...updates.tags] : [...currentTemplate.tags],
      };
      this.state.value.templates[index] = updatedTemplate;

      try {
        await db.update<MessageTemplate>(
          "broadcast_templates",
          { id: templateId } as Partial<MessageTemplate>,
          { $set: updates as Partial<MessageTemplate> },
        );
      } catch (err) {
        console.error("Failed to update template in database:", err);
      }
    }
  }

  /**
   * Refresh history explicitly
   * Strategy: Try API first -> On Success (Update Local DB if Electron) -> On Failure (Fallback to Local DB)
   */
  public async refreshHistory(): Promise<void> {
    this.state.value.isLoading = true;

    // Simulate API Fetch
    try {
      // Check connectivity if needed, or just let the API call fail
      // Simulate a network request
      const apiHistory = await this.fetchHistoryFromAPI();

      if (apiHistory && apiHistory.length > 0) {
        this.state.value.history = apiHistory;

        // Update local database cache for offline access (mostly relevant for Electron)
        if (isElectron()) {
          await this.updateLocalHistoryCache(apiHistory);
        }
        return;
      }
    } catch (apiError) {
      console.warn("API fetch failed, falling back to local DB:", apiError);
    }

    // Fallback: Load from local database
    try {
      const history = await db.find<BroadcastHistoryEntry>(
        "broadcast_history",
        {},
        { sort: { sentAt: -1 }, limit: 50 },
      );
      if (history.length > 0) {
        this.state.value.history = history;
      } else {
        // If no local data, load mock data for demo purposes
        this.loadMockData();
      }
    } catch (dbError) {
      console.error("Failed to load history from backup DB:", dbError);
      this.loadMockData();
    } finally {
      this.state.value.isLoading = false;
    }
  }

  // Simulate API Call
  private async fetchHistoryFromAPI(): Promise<BroadcastHistoryEntry[]> {
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Return mock data as if it came from API
    // In production this would be a real fetch() call
    return [
      {
        id: `hist_${Date.now()}_1`,
        channel: "email",
        subject:
          "API: Important Announcement " + this.state.value.history.length,
        previewText: 'This message was fetched from the "server"...',
        recipientCount: 500,
        filterType: "global",
        filterLabel: "All Staff",
        isInternal: false,
        status: "sent",
        sentAt: new Date(),
        sentBy: "Server Admin",
        deliveryStats: { total: 500, sent: 495, failed: 5, pending: 0 },
      } as BroadcastHistoryEntry,
      ...this.state.value.history, // Append existing just to show data
    ].slice(0, 50);
  }

  private async updateLocalHistoryCache(apiHistory: BroadcastHistoryEntry[]) {
    // Efficiently upsert history items
    for (const item of apiHistory) {
      try {
        const existing = await db.findOne("broadcast_history", { id: item.id });
        if (existing) {
          await db.update("broadcast_history", { id: item.id }, { $set: item });
        } else {
          await db.insert("broadcast_history", item);
        }
      } catch (err) {
        console.error("Error caching history item:", err);
      }
    }
  }

  // Getters
  public getState() {
    return readonly(this.state);
  }

  public cleanup() {
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe();
    }
  }
}

// Singleton instance
let broadcastManager: BroadcastDataManager | null = null;

function getBroadcastManager(): BroadcastDataManager {
  if (!broadcastManager) {
    broadcastManager = new BroadcastDataManager();
  }
  return broadcastManager;
}

/**
 * Broadcast Data Composable Hook
 */
export function useBroadcastData() {
  const manager = getBroadcastManager();
  const state = manager.getState();
  const user = useUser();

  // Computed properties
  const zones = computed(() => state.value.zones);
  const schools = computed(() => state.value.schools);
  const subjects = computed(() => state.value.subjects);
  const roles = computed(() => state.value.roles);
  const templates = computed(() => state.value.templates);
  const drafts = computed<BroadcastDraft[]>(
    () => state.value.drafts as BroadcastDraft[],
  );
  const history = computed(() => state.value.history);
  const isSending = computed(() => state.value.isSending);
  const isLoading = computed(() => state.value.isLoading);
  const error = computed(() => state.value.error);

  // Schools filtered by zone
  const getSchoolsByZone = (zoneId: string) =>
    computed(() => state.value.schools.filter((s) => s.zoneId === zoneId));

  // Check if user has broadcast permission
  const canBroadcast = computed(() => {
    const role = user.value?.role?.toLowerCase() || "";
    return (
      role.includes("chairman") ||
      role.includes("secretary") ||
      role.includes("typist") ||
      role.includes("pro") ||
      role.includes("manager") ||
      role === "admin"
    );
  });

  // Check if user can send internal HQ messages
  const canSendInternal = computed(() => {
    const role = user.value?.role?.toLowerCase() || "";
    return (
      role.includes("chairman") ||
      role.includes("secretary") ||
      role.includes("pro") ||
      role.includes("manager") ||
      role === "admin"
    );
  });

  // Filter options for UI
  const filterOptions = computed(() => [
    {
      type: "individual" as RecipientFilterType,
      label: "Individual Staff",
      icon: "User",
      description: "Select specific staff members",
    },
    {
      type: "global" as RecipientFilterType,
      label: "All Teachers",
      icon: "Users",
      description: "Broadcast to entire database",
    },
    {
      type: "zone" as RecipientFilterType,
      label: "By Zone",
      icon: "MapPin",
      description: "Staff within a specific zone",
    },
    {
      type: "school" as RecipientFilterType,
      label: "By School",
      icon: "Building2",
      description: "Staff at a specific school",
    },
    {
      type: "role" as RecipientFilterType,
      label: "By Role",
      icon: "Briefcase",
      description: "All Principals, Vice Principals, etc.",
    },
    {
      type: "subject" as RecipientFilterType,
      label: "By Subject",
      icon: "BookOpen",
      description: "All Mathematics teachers, etc.",
    },
    {
      type: "headquarters" as RecipientFilterType,
      label: "Headquarters",
      icon: "Building",
      description: "Internal HQ communication",
    },
  ]);

  const searchStaff = async (query: string): Promise<Recipient[]> => {
    if (!query || query.length < 2) return [];
    // Mock search - in production this would be an API call
    return mockRecipients.filter(r => 
      r.name.toLowerCase().includes(query.toLowerCase()) || 
      r.email?.toLowerCase().includes(query.toLowerCase()) ||
      r.role?.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Actions
  const getRecipientCount = (filter: RecipientFilter) =>
    manager.getRecipientCount(filter);
  const sendBroadcast = (message: BroadcastMessage) =>
    manager.sendBroadcast(message);
  const saveDraft = (draft: BroadcastDraft) => manager.saveDraft(draft);
  const deleteDraft = (draftId: string) => manager.deleteDraft(draftId);
  const uploadForSmartLink = (file: File) => manager.uploadForSmartLink(file);
  const getRecipientsByFilter = (filter: RecipientFilter, limit?: number) =>
    manager.getRecipientsByFilter(filter, limit);
  const saveTemplate = (
    template: Pick<
      MessageTemplate,
      "name" | "channel" | "subject" | "body" | "tags"
    >,
  ) => manager.saveTemplate(template);
  const deleteTemplate = (templateId: string) =>
    manager.deleteTemplate(templateId);
  const updateTemplate = (
    templateId: string,
    updates: Partial<
      Pick<MessageTemplate, "name" | "subject" | "body" | "tags">
    >,
  ) => manager.updateTemplate(templateId, updates);
  const refreshHistory = () => manager.refreshHistory();
  const cleanup = () => manager.cleanup();

  return {
    // State
    zones,
    schools,
    subjects,
    roles,
    templates,
    drafts,
    history,
    isSending,
    isLoading,
    error,

    // Computed
    filterOptions,
    canBroadcast,
    canSendInternal,

    // Helpers
    getSchoolsByZone,

    // Actions
    getRecipientCount,
    sendBroadcast,
    saveDraft,
    deleteDraft,
    uploadForSmartLink,
    getRecipientsByFilter,
    saveTemplate,
    deleteTemplate,
    updateTemplate,
    refreshHistory,
    cleanup,
    searchStaff,
  };
}
