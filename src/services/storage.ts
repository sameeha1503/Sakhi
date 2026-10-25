// Local-first storage adapter with Supabase background sync,
// offline queueing, debounced upserts, and multi-device merge.
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const PREFIX = "sakhi:";

export const SYNCED_KEYS = [
  "logs",
  "logs_schema_version",
  "medicines",
  "doses",
  "visits",
  "prep_custom_questions",
  "prep_ticked_ids",
  "scheme_answers",
  "user_state_code",
  "schemes_tracker",
  "pmsma_monthly_reminder",
  "screening_reminder",
  "schemes_viewed",
  "lang",
  "remember_location",
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
export const SYNCED_KEY_SET = new Set<string>(SYNCED_KEYS);

// Explicit forbidden keys that must NEVER be synced to the cloud
export const VAULT_KEYS = ["vault_pin_meta", "vault_lockout", "vault_db", "sakhi_vault_db"];

export function isKeySyncable(key: string): boolean {
  if (VAULT_KEYS.includes(key) || key.startsWith("vault_")) return false;
  return SYNCED_KEY_SET.has(key);
}

export type SyncStatus = "synced" | "saving" | "offline" | "not_signed_in" | "not_configured";

type ClearCallback = () => void | Promise<void>;
type ErrorListener = (message: string) => void;
type SyncStatusListener = (status: SyncStatus) => void;
type StorageChangeListener = (key: string, value: unknown) => void;

interface PendingWrite {
  key: string;
  value: unknown;
  timestamp: string;
}

const clearCallbacks: ClearCallback[] = [];
const errorListeners: ErrorListener[] = [];
const syncStatusListeners: SyncStatusListener[] = [];
const changeListeners: StorageChangeListener[] = [];

// In-memory pending debounced writes map: key -> PendingWrite
const pendingWrites = new Map<string, PendingWrite>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentSyncStatus: SyncStatus = "not_signed_in";

// Track local write timestamps for conflict resolution: key -> ISO string
function getLocalTimestamps(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFIX + "sync_timestamps");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalTimestamp(key: string, iso: string) {
  if (typeof window === "undefined") return;
  try {
    const map = getLocalTimestamps();
    map[key] = iso;
    localStorage.setItem(PREFIX + "sync_timestamps", JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Persistent offline retry queue
function getOfflineQueue(): PendingWrite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PREFIX + "sync_queue");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: PendingWrite[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + "sync_queue", JSON.stringify(queue));
  } catch {
    // ignore
  }
}

function enqueueOfflineWrite(write: PendingWrite) {
  const queue = getOfflineQueue();
  const existingIdx = queue.findIndex((item) => item.key === write.key);
  if (existingIdx !== -1) {
    queue[existingIdx] = write;
  } else {
    queue.push(write);
  }
  saveOfflineQueue(queue);
}

function updateSyncStatus(newStatus: SyncStatus) {
  currentSyncStatus = newStatus;
  syncStatusListeners.forEach((l) => {
    try {
      l(newStatus);
    } catch {
      // ignore
    }
  });
}

// Attach online listener in browser environment
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    storage.flushSyncQueue();
  });
  window.addEventListener("offline", () => {
    if (storage.isUserSignedIn()) {
      updateSyncStatus("offline");
    }
  });
}

export const storage = {
  onError(listener: ErrorListener) {
    errorListeners.push(listener);
    return () => {
      const idx = errorListeners.indexOf(listener);
      if (idx !== -1) errorListeners.splice(idx, 1);
    };
  },

  onSyncStatusChange(listener: SyncStatusListener) {
    syncStatusListeners.push(listener);
    listener(this.getSyncStatus());
    return () => {
      const idx = syncStatusListeners.indexOf(listener);
      if (idx !== -1) syncStatusListeners.splice(idx, 1);
    };
  },

  onChange(listener: StorageChangeListener) {
    changeListeners.push(listener);
    return () => {
      const idx = changeListeners.indexOf(listener);
      if (idx !== -1) changeListeners.splice(idx, 1);
    };
  },

  notifyChange(key: string, value: unknown) {
    changeListeners.forEach((l) => {
      try {
        l(key, value);
      } catch {
        // ignore
      }
    });
  },

  notifyError(message: string) {
    errorListeners.forEach((l) => {
      try {
        l(message);
      } catch {
        // ignore listener failures
      }
    });
  },

  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch (e) {
      console.warn(`[storage] Failed to read key "${key}":`, e);
      return fallback;
    }
  },

  set<T>(key: string, value: T): boolean {
    if (typeof window === "undefined") return false;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      const now = new Date().toISOString();
      setLocalTimestamp(key, now);
      this.notifyChange(key, value);

      // Trigger cloud sync if this key is syncable and user has an active account
      if (isKeySyncable(key) && this.isUserSignedIn()) {
        this.queueCloudSync(key, value, now);
      }

      return true;
    } catch (e: unknown) {
      console.error(`[storage] Failed to write key "${key}":`, e);
      const isQuota =
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          e.code === 22 ||
          e.code === 1014);

      if (isQuota) {
        this.notifyError(
          "Device storage is full. Please delete older records to save new check-ins.",
        );
      } else {
        this.notifyError(
          "Unable to save data. Local storage might be blocked by your browser settings.",
        );
      }
      return false;
    }
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(PREFIX + key);
      this.notifyChange(key, null);
    } catch (e) {
      console.warn(`[storage] Failed to remove key "${key}":`, e);
    }
  },

  onClear(cb: ClearCallback) {
    clearCallbacks.push(cb);
  },

  async clearAll() {
    // If signed in, delete remote rows for this user as well
    const client = getSupabaseClient();
    const userId = this.getCurrentUserId();
    if (client && userId) {
      try {
        await client.from("user_data").delete().eq("user_id", userId);
      } catch (err) {
        console.warn("[storage] Failed to clear remote user_data:", err);
      }
    }

    if (typeof window !== "undefined") {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(PREFIX))
          .forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn("[storage] Error clearing local storage:", e);
      }
    }

    pendingWrites.clear();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    updateSyncStatus("not_signed_in");

    for (const cb of clearCallbacks) {
      try {
        await cb();
      } catch {
        // Continue cleaning remaining resources
      }
    }
  },

  /**
   * Clears synced data on logout to protect privacy on shared phones,
   * without touching the vault or language preference.
   */
  clearSyncedDataOnLogout() {
    if (typeof window === "undefined") return;
    SYNCED_KEYS.forEach((key) => {
      if (key !== "lang") {
        this.remove(key);
      }
    });
    this.remove("sync_queue");
    this.remove("sync_timestamps");
    this.remove("first_login_merged");
    pendingWrites.clear();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    updateSyncStatus("not_signed_in");
  },

  getPendingSyncCount(): number {
    return pendingWrites.size + getOfflineQueue().length;
  },

  hasPendingSync(): boolean {
    return this.getPendingSyncCount() > 0;
  },

  // --- Cloud Sync Internals ---

  isUserSignedIn(): boolean {
    if (typeof window === "undefined") return false;
    const session = this.get<boolean>("session", false);
    const mode = this.get<string>("auth_mode", "guest");
    const user = this.get<{ id?: string } | null>("user", null);
    return session && mode === "account" && !!user?.id;
  },

  getCurrentUserId(): string | null {
    if (!this.isUserSignedIn()) return null;
    const user = this.get<{ id?: string } | null>("user", null);
    return user?.id || null;
  },

  getSyncStatus(): SyncStatus {
    if (!isSupabaseConfigured()) {
      return "not_configured";
    }
    if (!this.isUserSignedIn()) {
      return "not_signed_in";
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "offline";
    }
    return currentSyncStatus;
  },

  isFirstLoginMerged(): boolean {
    return this.get<boolean>("first_login_merged", false);
  },

  clearFirstLoginMerged() {
    this.remove("first_login_merged");
  },

  queueCloudSync(key: string, value: unknown, timestamp: string) {
    if (!isKeySyncable(key)) return;

    pendingWrites.set(key, { key, value, timestamp });
    updateSyncStatus("saving");

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      this.flushSyncQueue();
    }, 800);
  },

  async flushSyncQueue(overrideUserId?: string): Promise<void> {
    if (typeof window === "undefined") return;

    const userId = overrideUserId || this.getCurrentUserId();
    if (!userId) {
      updateSyncStatus("not_signed_in");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      updateSyncStatus("not_configured");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Save any pending writes to offline queue
      for (const write of pendingWrites.values()) {
        enqueueOfflineWrite(write);
      }
      pendingWrites.clear();
      updateSyncStatus("offline");
      return;
    }

    // Merge offline queue items with in-memory pending items
    const offlineItems = getOfflineQueue();
    const allWrites = new Map<string, PendingWrite>();

    for (const item of offlineItems) {
      allWrites.set(item.key, item);
    }
    for (const [key, item] of pendingWrites.entries()) {
      allWrites.set(key, item);
    }

    if (allWrites.size === 0) {
      updateSyncStatus("synced");
      return;
    }

    updateSyncStatus("saving");

    const failedWrites: PendingWrite[] = [];

    for (const write of allWrites.values()) {
      try {
        const { error } = await client.from("user_data").upsert(
          {
            user_id: userId,
            key: write.key,
            value: write.value,
            updated_at: write.timestamp,
          },
          { onConflict: "user_id,key" },
        );

        if (error) {
          console.warn(`[storage] Failed to upsert key "${write.key}":`, error);
          failedWrites.push(write);
        }
      } catch (err) {
        console.warn(`[storage] Network exception syncing key "${write.key}":`, err);
        failedWrites.push(write);
      }
    }

    pendingWrites.clear();
    saveOfflineQueue(failedWrites);

    if (failedWrites.length > 0) {
      updateSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "saving",
      );
    } else {
      updateSyncStatus("synced");
    }
  },

  /**
   * Pulls all rows for this user on sign-in / app startup,
   * performs timestamp and date-based conflict-free merging with local data,
   * and notifies the UI.
   */
  async handleSignIn(userId: string): Promise<void> {
    if (typeof window === "undefined") return;

    const client = getSupabaseClient();
    if (!client) return;

    // Check if this phone has existing local data before pulling
    const hasLocalRecords = SYNCED_KEYS.some((k) => {
      const raw = localStorage.getItem(PREFIX + k);
      return raw !== null && raw !== "[]" && raw !== "{}" && raw !== "null";
    });

    try {
      const { data, error } = await client
        .from("user_data")
        .select("key, value, updated_at")
        .eq("user_id", userId);

      if (error) {
        console.warn("[storage] Error pulling user_data:", error);
        return;
      }

      const remoteRows = (data || []) as Array<{
        key: string;
        value: unknown;
        updated_at: string;
      }>;
      const remoteMap = new Map<string, { value: unknown; updated_at: string }>();
      remoteRows.forEach((r) => remoteMap.set(r.key, { value: r.value, updated_at: r.updated_at }));

      const localTimestamps = getLocalTimestamps();
      const keysToUploadBack: Array<{ key: string; value: unknown; timestamp: string }> = [];

      for (const key of SYNCED_KEYS) {
        const remote = remoteMap.get(key);
        const hasLocal = localStorage.getItem(PREFIX + key) !== null;
        const localVal = this.get<unknown>(key, null);
        const localTs = localTimestamps[key] || "1970-01-01T00:00:00.000Z";

        if (key === "logs") {
          // Special merge rule for logs: merge per date, newest entry wins
          const localLogs = (Array.isArray(localVal) ? localVal : []) as Array<{
            date: string;
            updatedAt?: string;
            [k: string]: unknown;
          }>;
          const remoteLogs = (remote && Array.isArray(remote.value) ? remote.value : []) as Array<{
            date: string;
            updatedAt?: string;
            [k: string]: unknown;
          }>;

          const mergedMap = new Map<string, { date: string; [k: string]: unknown }>();

          // Put remote logs
          remoteLogs.forEach((l) => {
            if (l && l.date) mergedMap.set(l.date, l);
          });

          // Merge local logs
          let hasLocalNewerOrUnique = false;
          localLogs.forEach((localEntry) => {
            if (!localEntry || !localEntry.date) return;
            const remoteEntry = mergedMap.get(localEntry.date);
            if (!remoteEntry) {
              mergedMap.set(localEntry.date, localEntry);
              hasLocalNewerOrUnique = true;
            } else {
              const localTime = (localEntry["updatedAt"] as string) || localTs;
              const remoteTime = (remoteEntry["updatedAt"] as string) || remote?.updated_at || "";
              if (localTime >= remoteTime) {
                mergedMap.set(localEntry.date, localEntry);
                hasLocalNewerOrUnique = true;
              }
            }
          });

          const mergedLogs = Array.from(mergedMap.values()).sort((a, b) =>
            b.date.localeCompare(a.date),
          );
          localStorage.setItem(PREFIX + "logs", JSON.stringify(mergedLogs));
          this.notifyChange("logs", mergedLogs);

          if (hasLocalNewerOrUnique) {
            keysToUploadBack.push({
              key: "logs",
              value: mergedLogs,
              timestamp: new Date().toISOString(),
            });
          }
          continue;
        }

        // For other keys: newer updated_at wins
        if (remote && !hasLocal) {
          // Remote exists, no local
          localStorage.setItem(PREFIX + key, JSON.stringify(remote.value));
          setLocalTimestamp(key, remote.updated_at);
          this.notifyChange(key, remote.value);
        } else if (!remote && hasLocal && localVal !== null) {
          // Local exists, no remote yet
          keysToUploadBack.push({
            key,
            value: localVal,
            timestamp: localTs || new Date().toISOString(),
          });
        } else if (remote && hasLocal) {
          // Both exist: compare timestamps
          const remoteTime = new Date(remote.updated_at).getTime();
          const localTime = new Date(localTs).getTime();

          if (remoteTime >= localTime) {
            localStorage.setItem(PREFIX + key, JSON.stringify(remote.value));
            setLocalTimestamp(key, remote.updated_at);
            this.notifyChange(key, remote.value);
          } else {
            keysToUploadBack.push({
              key,
              value: localVal,
              timestamp: localTs,
            });
          }
        }
      }

      // If user had local data before signing in and merged
      if (hasLocalRecords) {
        this.set("first_login_merged", true);
      }

      // If any local keys were newer or novel, upload them to Supabase
      if (keysToUploadBack.length > 0) {
        for (const item of keysToUploadBack) {
          pendingWrites.set(item.key, item);
        }
        await this.flushSyncQueue(userId);
      } else {
        updateSyncStatus("synced");
      }
    } catch (err) {
      console.warn("[storage] handleSignIn exception:", err);
      updateSyncStatus("offline");
    }
  },
};
