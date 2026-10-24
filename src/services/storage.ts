// Local storage adapter. Wraps all writes in try/catch with friendly error reporting
// for quota limits or disabled storage. Swap for Supabase later without touching UI.

const PREFIX = "sakhi:";

type ClearCallback = () => void | Promise<void>;
type ErrorListener = (message: string) => void;

const clearCallbacks: ClearCallback[] = [];
const errorListeners: ErrorListener[] = [];

export const storage = {
  onError(listener: ErrorListener) {
    errorListeners.push(listener);
    return () => {
      const idx = errorListeners.indexOf(listener);
      if (idx !== -1) errorListeners.splice(idx, 1);
    };
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
    } catch (e) {
      console.warn(`[storage] Failed to remove key "${key}":`, e);
    }
  },

  onClear(cb: ClearCallback) {
    clearCallbacks.push(cb);
  },

  async clearAll() {
    if (typeof window !== "undefined") {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(PREFIX))
          .forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn("[storage] Error clearing local storage:", e);
      }
    }
    for (const cb of clearCallbacks) {
      try {
        await cb();
      } catch {
        // Continue cleaning remaining resources
      }
    }
  },
};
