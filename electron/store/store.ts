import Store from "electron-store";
import { safeStorage } from "electron";
import crypto from "node:crypto";
import os from "node:os";
import dotenv from "dotenv";
import type { AppStore } from "../types.js";

dotenv.config();

/**
 * Derives a device-specific encryption key using Electron's safeStorage
 * (Windows DPAPI / macOS Keychain / Linux libsecret).
 *
 * No shell commands — relies entirely on OS-level credential storage.
 */
function getDeviceEncryptionKey(): string {
  // Build a stable device fingerprint from OS info (no exec calls)
  const fingerprint = [
    os.hostname(),
    os.arch(),
    os.platform(),
    os.totalmem().toString(),
    os.cpus()[0]?.model ?? "unknown-cpu",
    os.userInfo().username,
  ].join("|");

  const baseHash = crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex");

  // Use Electron's safeStorage (DPAPI on Windows) to further derive the key.
  // This ties the encryption to the OS user session.
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(baseHash);
    return crypto.createHash("sha256").update(encrypted).digest("hex");
  }

  return baseHash;
}

// ─── Lazy Store Initialization ──────────────────────────────────────────────
// The store must not be created until `app.whenReady()` resolves, because
// safeStorage (DPAPI) is not available before the app is ready.

let _store: Store<AppStore> | null = null;

function getStore(): Store<AppStore> {
  if (!_store) {
    _store = new Store<AppStore>({
      name: "config",
      encryptionKey: getDeviceEncryptionKey(),
      clearInvalidConfig: true,
      defaults: {
        settings: {
          theme: "system",
          autoSave: true,
          notifications: true,
          lockScreen: 1200,
          emailNotifications: true,
          soundEffects: true,
          autoUpdate: true,
          language: "en",
          fontSize: "medium",
          compactMode: false,
          showOnlineStatus: true,
          dataSync: true,
        },
        recentFiles: [],
        SUPABASE_URL: "",
        SUPABASE_KEY: "",
        updateDownloaded: false,
      },
    });
  }
  return _store;
}

class StoreHelper {
  private get store() {
    return getStore();
  }

  /**
   * Get a value from store
   */
  get<K extends keyof AppStore>(key: K): AppStore[K] | undefined;
  get<T = any>(key: string): T | undefined;
  get<T = any>(key: string, defaultValue: T): T;
  get(key: string, defaultValue?: any) {
    return this.store.get(key as any, defaultValue);
  }

  /**
   * Set a value in store
   */
  set<K extends keyof AppStore>(key: K, value: AppStore[K]): void;
  set(key: string, value: any): void;
  set(key: string, value: any): void {
    if (value === undefined) {
      this.store.delete(key as any);
      return;
    }
    this.store.set(key as any, value);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.store.has(key as any);
  }

  /**
   * Delete a key
   */
  delete(key: string): void {
    this.store.delete(key as any);
  }

  /**
   * Clear entire store
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get all store data
   */
  getAll(): AppStore {
    return this.store.store;
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.store.clear();
  }

  // --- User Methods ---

  getUser() {
    return this.get("user");
  }

  setUser(user: AppStore["user"]) {
    this.set("user", user);
  }

  clearUser() {
    this.delete("user");
  }

  isUserLoggedIn(): boolean {
    return this.has("user") && this.has("session");
  }

  getSession() {
    const session = this.get("session");
    if (!session) return null;

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      this.clearSession();
      return null;
    }

    return session;
  }

  setSession(session: AppStore["session"]) {
    this.set("session", session);
  }

  clearSession() {
    this.delete("session");
  }

  isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null;
  }

  // --- Settings Methods ---

  getSettings() {
    return this.get("settings")!;
  }

  setSetting<K extends keyof AppStore["settings"]>(
    key: K,
    value: AppStore["settings"][K],
  ) {
    const settings = this.getSettings();
    this.set("settings", { ...settings, [key]: value });
  }

  getSetting<K extends keyof AppStore["settings"]>(
    key: K,
  ): AppStore["settings"][K] {
    const settings = this.getSettings();
    return settings[key];
  }

  // --- Recent Files Methods ---

  getRecentFiles(): string[] {
    return this.get("recentFiles", []);
  }

  addRecentFile(filePath: string, maxFiles: number = 10) {
    const recentFiles = this.getRecentFiles();

    // Remove if already exists
    const filtered = recentFiles.filter((f) => f !== filePath);

    // Add to beginning
    const updated = [filePath, ...filtered].slice(0, maxFiles);

    this.set("recentFiles", updated);
  }

  clearRecentFiles() {
    this.set("recentFiles", []);
  }

  // --- Last Sync Methods ---

  getLastSync(): number | undefined {
    return this.get("lastSync");
  }

  updateLastSync() {
    this.set("lastSync", Date.now());
  }

  // --- Utility Methods ---

  /**
   * Export store data as JSON
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Import store data from JSON
   */
  import(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value);
      });
      return true;
    } catch (error) {
      console.error("Failed to import store data:", error);
      return false;
    }
  }

  /**
   * Get store file path
   */
  getPath(): string {
    return this.store.path;
  }

  /**
   * Watch for changes to a specific key
   */
  onDidChange<K extends keyof AppStore>(
    key: K,
    callback: (newValue?: AppStore[K], oldValue?: AppStore[K]) => void,
  ) {
    return this.store.onDidChange(key, callback);
  }

  /**
   * Watch for any changes to the store
   */
  onDidAnyChange(
    callback: (
      newValue?: Readonly<AppStore>,
      oldValue?: Readonly<AppStore>,
    ) => void,
  ) {
    return this.store.onDidAnyChange(callback);
  }
}

// Export singleton instance — safe to import at module level.
// The underlying Store is only created on first property access (after app is ready).
export const storeHelper = new StoreHelper();
