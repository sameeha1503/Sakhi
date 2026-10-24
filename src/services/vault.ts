// Private vault service with PBKDF2 Web Crypto PIN hashing, lockout protection,
// and IndexedDB document storage. Local/client-side privacy protection for shared phones.

import { storage } from "./storage";

export type VaultPinMeta = {
  salt: string; // hex-encoded random salt
  hash: string; // hex-encoded PBKDF2 hash
};

export type LockoutState = {
  failedAttempts: number;
  lockoutUntil: number; // timestamp in ms
  durationMs: number; // current lockout duration (starts at 5 mins, increases on repeat failures)
};

export type VaultDocument = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: string;
  category?: "prescription" | "report" | "identity" | "other";
};

const BASE_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

// In-memory unlock state
let isSessionUnlocked = false;

// In-memory fallback store when IndexedDB is unavailable (SSR or Node unit tests)
const memoryStore = new Map<string, VaultDocument>();

function getSubtle(): SubtleCrypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API (subtle) is unavailable in this environment");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

/**
 * Hash a 4-digit PIN using PBKDF2 with SHA-256 and 100,000 iterations.
 * Never stores the raw PIN.
 */
export async function hashPin(
  pin: string,
  saltHex?: string,
): Promise<{ salt: string; hash: string }> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  const subtle = getSubtle();
  const saltBytes = saltHex ? fromHex(saltHex) : new Uint8Array(16);
  if (!saltHex) {
    globalThis.crypto.getRandomValues(saltBytes);
  }

  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey("raw", enc.encode(pin), { name: "PBKDF2" }, false, [
    "deriveBits",
  ]);

  const derived = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return {
    salt: toHex(saltBytes),
    hash: toHex(new Uint8Array(derived)),
  };
}

/**
 * Verify an entered PIN against the stored salt and hash.
 */
export async function verifyPin(pin: string, stored: VaultPinMeta): Promise<boolean> {
  if (!stored?.salt || !stored?.hash) return false;
  try {
    const derived = await hashPin(pin, stored.salt);
    return derived.hash === stored.hash;
  } catch {
    return false;
  }
}

// ----------------- IndexedDB Helpers -----------------

const DB_NAME = "sakhi_vault_db";
const STORE_NAME = "documents";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(): Promise<VaultDocument[]> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Array.from(memoryStore.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result as VaultDocument[]) || [];
      resolve(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(doc: VaultDocument): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    memoryStore.set(doc.id, doc);
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    memoryStore.delete(id);
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(): Promise<void> {
  memoryStore.clear();
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // If DB cannot be opened, ignore
  }
}

// ----------------- Vault Service -----------------

export const vaultService = {
  hasPin(): boolean {
    const meta = storage.get<VaultPinMeta | null>("vault_pin_meta", null);
    return !!(meta && meta.salt && meta.hash);
  },

  async setupPin(pin: string): Promise<void> {
    const meta = await hashPin(pin);
    storage.set("vault_pin_meta", meta);
    this.resetLockout();
    isSessionUnlocked = true;
  },

  isUnlocked(): boolean {
    return isSessionUnlocked;
  },

  lock(): void {
    isSessionUnlocked = false;
  },

  getLockoutState(): LockoutState {
    return storage.get<LockoutState>("vault_lockout", {
      failedAttempts: 0,
      lockoutUntil: 0,
      durationMs: BASE_LOCKOUT_MS,
    });
  },

  checkLockout(): { isLocked: boolean; remainingSeconds: number } {
    const state = this.getLockoutState();
    const now = Date.now();
    if (state.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((state.lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }
    return { isLocked: false, remainingSeconds: 0 };
  },

  recordFailedAttempt(): {
    isLocked: boolean;
    remainingSeconds: number;
    failedAttempts: number;
  } {
    const state = this.getLockoutState();
    const attempts = state.failedAttempts + 1;
    let lockoutUntil = state.lockoutUntil;
    let duration = state.durationMs;

    if (attempts >= MAX_ATTEMPTS) {
      lockoutUntil = Date.now() + duration;
      // Increase lockout duration for repeated lockouts (e.g. 5m -> 10m -> 15m)
      duration = duration + BASE_LOCKOUT_MS;
    }

    const updated: LockoutState = {
      failedAttempts: attempts,
      lockoutUntil,
      durationMs: duration,
    };
    storage.set("vault_lockout", updated);

    const now = Date.now();
    const isLocked = lockoutUntil > now;
    const remainingSeconds = isLocked ? Math.ceil((lockoutUntil - now) / 1000) : 0;

    return { isLocked, remainingSeconds, failedAttempts: attempts };
  },

  resetLockout(): void {
    storage.remove("vault_lockout");
  },

  async unlock(pin: string): Promise<{
    success: boolean;
    error?: "locked" | "invalid_pin" | "no_pin";
    remainingSeconds?: number;
    failedAttempts?: number;
  }> {
    const lockout = this.checkLockout();
    if (lockout.isLocked) {
      return {
        success: false,
        error: "locked",
        remainingSeconds: lockout.remainingSeconds,
      };
    }

    const meta = storage.get<VaultPinMeta | null>("vault_pin_meta", null);
    if (!meta) {
      return { success: false, error: "no_pin" };
    }

    const isValid = await verifyPin(pin, meta);
    if (isValid) {
      this.resetLockout();
      isSessionUnlocked = true;
      return { success: true };
    }

    const fail = this.recordFailedAttempt();
    return {
      success: false,
      error: fail.isLocked ? "locked" : "invalid_pin",
      remainingSeconds: fail.remainingSeconds,
      failedAttempts: fail.failedAttempts,
    };
  },

  /**
   * Reset the vault completely (Forgot PIN workflow or delete my data).
   * Deletes PIN metadata, lockout state, and clears all stored IndexedDB files.
   */
  async resetVault(): Promise<void> {
    storage.remove("vault_pin_meta");
    storage.remove("vault_lockout");
    isSessionUnlocked = false;
    await idbClear();
  },

  async clearAll(): Promise<void> {
    await this.resetVault();
  },

  async getDocuments(): Promise<VaultDocument[]> {
    if (!isSessionUnlocked) {
      throw new Error("Vault is locked. Cannot access documents.");
    }
    return idbGetAll();
  },

  async addDocument(
    name: string,
    type: string,
    size: number,
    dataUrl: string,
    category: VaultDocument["category"] = "other",
  ): Promise<VaultDocument> {
    if (!isSessionUnlocked) {
      throw new Error("Vault is locked. Cannot add documents.");
    }
    const doc: VaultDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      type,
      size,
      dataUrl,
      category,
      createdAt: new Date().toISOString(),
    };
    await idbPut(doc);
    return doc;
  },

  async deleteDocument(id: string): Promise<void> {
    if (!isSessionUnlocked) {
      throw new Error("Vault is locked. Cannot delete documents.");
    }
    await idbDelete(id);
  },
};

// Register automatic cleanup with storage adapter so "delete my data" wipes the vault
storage.onClear(() => vaultService.clearAll());
