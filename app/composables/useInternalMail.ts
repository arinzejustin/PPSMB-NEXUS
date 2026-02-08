import { ref, computed, readonly } from "vue";
import type {
  InternalUnit,
  InternalUser,
  MailRecipient,
  InternalMessage,
  MailAttachment,
  InternalMail,
} from "@/types/mail";
import { useChannel } from "@/composables/useWebSocket";
import { db, isElectron, type DBRecord } from "@/lib/db";
import { mockDepartments, mockPersonnel, initialMails } from "@/lib/mock";

// --- Types ---
interface InternalMailState {
  allMails: InternalMail[];
  isSending: boolean;
  isLoading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
}

interface WSAttachment {
  name: string;
  size?: string;
  link?: string;
}

interface WSMailPayload {
  id?: string;
  from?: { name: string; email: string };
  to?: string[];
  subject?: string;
  preview?: string;
  body?: string;
  hasAttachment?: boolean;
  attachments?: WSAttachment[];
  priority?: "low" | "normal" | "high";
  tags?: string[];
  date?: Date;
}

/**
 * Internal Mail Manager Class (Singleton)
 */
class InternalMailManager {
  private state = ref<InternalMailState>({
    allMails: [],
    isSending: false,
    isLoading: false,
    error: null,
    page: 1,
    limit: 20,
    total: 0,
  });

  private wsChannel = useChannel("internal_mail");
  private wsUnsubscribe: (() => void) | null = null;
  private dbUnsubscribe: (() => void) | null = null;
  private processedMailIds = new Set<string>();

  constructor() {
    this.init();
  }

  private init() {
    this.setupWebSocket();
    // In Electron, we could optionally subscribe to DB changes if multi-window
    // if (isElectron()) this.setupDBListeners();
  }

  private setupWebSocket() {
    this.wsUnsubscribe = this.wsChannel.on(
      "new_mail",
      async (incoming: WSMailPayload | WSMailPayload[]) => {
        const payloads = Array.isArray(incoming) ? incoming : [incoming];

        const normalized: InternalMail[] = [];

        for (const item of payloads) {
          const id = item.id ?? crypto.randomUUID();

          if (this.processedMailIds.has(id)) continue;
          this.processedMailIds.add(id);

          normalized.push({
            id,
            folder: "inbox",
            from: item.from ?? { name: "System", email: "system@ppsmb.edu.ng" },
            to: item.to ?? ["me@ppsmb.edu.ng"],
            subject: item.subject ?? "New Message",
            preview: item.preview ?? "No preview available",
            body: item.body ?? "",
            date: item.date ?? new Date(),
            isRead: false,
            isStarred: false,
            hasAttachment: !!item.hasAttachment,
            attachments: (item.attachments ?? []).map((att) => ({
              name: att.name,
              size: att.size ?? "Unknown",
              link: att.link ?? "",
            })),
            priority: item.priority ?? "normal",
            tags: item.tags ?? [],
          });
        }

        if (normalized.length === 0) return;

        this.state.value.allMails.unshift(...normalized);

        if (isElectron()) {
          try {
            const existingIds = await db.findManyIds(
              "internal_mails",
              normalized.map((m) => m.id),
            );

            const toInsert = normalized.filter((m) => !existingIds.has(m.id));

            if (toInsert.length > 0) {
              await db.insertMany("internal_mails", toInsert, true);
            }

            await this.pruneLocalCache();
          } catch (err) {
            console.error("Failed to cache new mail in local DB:", err);
          }
        }
      },
    );
  }

  private async pruneLocalCache() {
    // Keep only the latest 40 messages in local DB
    try {
      const all = await db.find<InternalMail>(
        "internal_mails",
        {},
        {
          sort: { date: -1 },
        },
      );
      if (all.length > 100) {
        const toDelete = all.slice(100);
        for (const item of toDelete) {
          if (item._id) await db.delete("internal_mails", { _id: item._id });
          else if (item.id) await db.delete("internal_mails", { id: item.id });
        }
      }
    } catch (err) {
      console.warn("Pruning local mail cache failed:", err);
    }
  }

  public async fetchMails(page = 1, refresh = false) {
    this.state.value.isLoading = true;
    this.state.value.page = page;

    try {
      if (isElectron()) {
        await this.loadFromLocalDB();
        // Optionally fetch from API in background if refresh is true
        if (refresh) {
          this.fetchFromAPI().catch(console.error);
        }
      } else {
        await this.fetchFromAPI();
      }
      if (this.state.value.allMails.length === 0) {
        this.state.value.allMails = [...initialMails];
      }
    } catch (err: any) {
      console.error("Failed to fetch mails:", err);
      this.state.value.error = "Failed to load messages";
      if (this.state.value.allMails.length === 0) {
        this.state.value.allMails = [...initialMails];
      }
    } finally {
      this.state.value.isLoading = false;
    }
  }

  private async loadFromLocalDB() {
    try {
      const limit = 100;
      const localMails = await db.find<InternalMail>(
        "internal_mails",
        {},
        { sort: { date: -1 }, limit },
      );

      // Ensure dates are parsed correctly if stored as strings
      const parsedMails = localMails.map((m) => ({
        ...m,
        date: new Date(m.date),
      }));

      if (parsedMails.length > 0) {
        this.state.value.allMails = parsedMails;
      }
    } catch (err) {
      console.warn("Local DB load failed, falling back to mock:", err);
      this.state.value.allMails = [...initialMails];
    }
  }

  private async fetchFromAPI() {
    // Simulate API Fetch
    await new Promise((resolve) => setTimeout(resolve, 800));

    // In reality: const response = await $fetch('/api/mails')
    // We'll just stick to mock data if empty
    if (this.state.value.allMails.length === 0) {
      this.state.value.allMails = [...initialMails];
    }
  }

  // --- Actions ---

  public async sendInternalMessage(message: Partial<InternalMessage>) {
    this.state.value.isSending = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Internal Message Sent:", message);

      const sentMail = {
        id: `ML-SENT-${Date.now()}`,
        folder: "sent",
        from: { name: "You", email: "me@ppsmb.edu.ng" },
        to: message.to?.map((r) => r.label) || [],
        subject: message.subject || "",
        preview: "You sent an internal memo...",
        body: message.body || "",
        date: new Date(),
        isRead: true,
        isStarred: false,
        hasAttachment: (message.attachments?.length || 0) > 0,
        attachments:
          message.attachments?.map((a) => ({
            name: a.name,
            size: "Unknown",
            link: "",
          })) || [],
        priority: "normal",
        tags: ["internal"],
      };

      this.state.value.allMails.unshift(sentMail);

      if (isElectron()) {
        try {
          await db.insert("internal_mails", sentMail);
        } catch (e) {}
      }

      return { success: true, id: `msg-${Date.now()}` };
    } catch (error) {
      console.error(error);
      return { success: false, error: "Failed to send message" };
    } finally {
      this.state.value.isSending = false;
    }
  }

  public async deleteMessages(ids: string[]) {
    // Optimistic update
    this.state.value.allMails = this.state.value.allMails.filter(
      (m) => !ids.includes(m.id),
    );

    if (isElectron()) {
      try {
        for (const id of ids) {
          await db.delete("internal_mails", { id });
        }
      } catch (e) {
        console.error("Failed local delete", e);
      }
    }
    // await api.post('/delete', { ids })
  }

  public async toggleStar(id: string) {
    const mail = this.state.value.allMails.find((m) => m.id === id);
    if (mail) {
      mail.isStarred = !mail.isStarred;
      // Persist
      if (isElectron()) {
        await db.update<DBRecord>(
          "internal_mails",
          { _id: id },
          { $set: { isStarred: mail.isStarred } },
        );
      }
    }
  }

  public async markAsRead(id: string) {
    const mail = this.state.value.allMails.find((m) => m.id === id);
    if (mail && !mail.isRead) {
      mail.isRead = true;
      if (isElectron()) {
        await db.update<DBRecord>(
          "internal_mails",
          { _id: id },
          { $set: { isRead: true } },
        );
      }
    }
  }

  public async archiveHandler(ids: string[], unarchive: boolean = false) {
    ids.forEach((id) => {
      const mail = this.state.value.allMails.find((m) => m.id === id);
      if (mail) mail.folder = unarchive ? "inbox" : "archive";
    });

    if (isElectron()) {
      for (const id of ids) {
        await db.update<DBRecord>(
          "internal_mails",
          { _id: id },
          { $set: { folder: unarchive ? "inbox" : "archive" } },
        );
      }
    }
  }

  public cleanup() {
    if (this.wsUnsubscribe) this.wsUnsubscribe();
    if (this.dbUnsubscribe) this.dbUnsubscribe();
  }

  public getState() {
    return readonly(this.state);
  }
}

// Singleton Instance
let internalMailManager: InternalMailManager | null = null;

function getInternalMailManager() {
  if (!internalMailManager) {
    internalMailManager = new InternalMailManager();
  }
  return internalMailManager;
}

export function useInternalMail() {
  const manager = getInternalMailManager();
  const state = manager.getState();

  // Combine Departments and Personnel into a flat searchable/selectable structure
  const availableRecipients = computed<MailRecipient[]>(() => {
    const list: MailRecipient[] = [];
    mockDepartments.forEach((dept) => {
      list.push({
        id: dept.id,
        type: "department",
        label: dept.name,
        description: "Entire Department",
        data: dept,
      });
    });
    mockPersonnel.forEach((user) => {
      list.push({
        id: user.id,
        type: "user",
        label: `${user.name}`,
        description: `${user.role} - ${user.departmentName}`,
        email: user.email,
        data: user,
      });
    });
    return list;
  });

  // Grouped for Dropdown display
  const groupedRecipients = computed(() => {
    const hqDepts = mockDepartments.filter((d) => d.type === "headquarters");
    const zonalDepts = mockDepartments.filter((d) => d.type === "zone");

    return [
      {
        label: "Headquarters (Departments)",
        items: hqDepts.map((d) => ({
          id: d.id,
          label: d.name,
          value: d.id,
          type: "department",
          desc: "Entire Unit",
        })),
      },
      {
        label: "Zonal Offices (Departments)",
        items: zonalDepts.map((d) => ({
          id: d.id,
          label: d.name,
          value: d.id,
          type: "department",
          desc: "Entire Zone",
        })),
      },
      {
        label: "Staff Members",
        items: mockPersonnel.map((u) => ({
          id: u.id,
          label: u.name,
          value: u.id,
          type: "user",
          desc: `${u.role}, ${u.departmentName}`,
        })),
      },
    ];
  });

  return {
    allMails: computed(() => state.value.allMails),
    isSending: computed(() => state.value.isSending),
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    page: computed(() => state.value.page),
    limit: computed(() => state.value.limit),
    total: computed(() => state.value.total),

    availableRecipients,
    groupedRecipients,

    // Actions
    fetchMails: (page?: number, refresh?: boolean) =>
      manager.fetchMails(page, refresh),
    refresh: () => manager.fetchMails(1, true),
    sendInternalMessage: (msg: Partial<InternalMessage>) =>
      manager.sendInternalMessage(msg),
    deleteMessages: (ids: string[]) => manager.deleteMessages(ids),
    toggleStar: (id: string) => manager.toggleStar(id),
    markAsRead: (id: string) => manager.markAsRead(id),
    archiveHandler: (ids: string[], unarchive: boolean = false) =>
      manager.archiveHandler(ids, unarchive),
    cleanup: () => manager.cleanup(),
  };
}
