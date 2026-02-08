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
import {
  mockBroadcastZones as mockZones,
  mockSchools,
  mockSubjects,
  mockRoles,
  mockRecipients,
  defaultTemplates,
  defaultBroadcastHistory,
} from "@/lib/mock";

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
    this.state.value.history = [...defaultBroadcastHistory];
  }

  /**
   * Get estimated recipient count based on filter
   */
  public async getRecipientCount(filter: RecipientFilter): Promise<number> {
    switch (filter.type) {
      case "individual":
        return filter.value ? filter.value.split(",").length : 0;
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
    return mockRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.email?.toLowerCase().includes(query.toLowerCase()) ||
        r.role?.toLowerCase().includes(query.toLowerCase()),
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
