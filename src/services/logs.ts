// Daily check-in logs service.
// Local-first storage adapter with safe schema versioning, migration, and backup/restore.

import { z } from "zod";
import { storage } from "./storage";

export type Flow = "none" | "light" | "medium" | "heavy" | "veryHeavy";
export const FLOWS: Flow[] = ["none", "light", "medium", "heavy", "veryHeavy"];
export const PAIN_AREAS = ["head", "breast", "stomach", "pelvis", "back", "legs"] as const;
export const SYMPTOMS = [
  "irregular",
  "acne",
  "hairLoss",
  "weight",
  "heavyBleeding",
  "pelvicPain",
] as const;

export type DailyLog = {
  date: string; // Local YYYY-MM-DD
  flow: Flow;
  painAreas: string[];
  painLevel: number; // 0-5
  mood: number; // 1-3
  energy: number; // 1-3
  sleep: number; // 1-3
  symptoms: string[];
  notes?: string | undefined; // Optional personal note, max 300 characters
};

export const LOGS_SCHEMA_VERSION = 2;

/**
 * Builds a local YYYY-MM-DD date string using local year, month, and day.
 * Never uses toISOString() so dates cannot shift by a day in India's +05:30 timezone.
 */
export function formatLocalDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = (d = new Date()): string => formatLocalDate(d);

export const emptyLog = (date = todayISO()): DailyLog => ({
  date,
  flow: "none",
  painAreas: [],
  painLevel: 0,
  mood: 2,
  energy: 2,
  sleep: 2,
  symptoms: [],
  notes: "",
});

// Zod validation schemas for reliability and safe import
export const dailyLogZodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)"),
  flow: z.enum(["none", "light", "medium", "heavy", "veryHeavy"]).catch("none").default("none"),
  painAreas: z.array(z.string()).catch([]).default([]),
  painLevel: z.number().catch(0).default(0),
  mood: z.number().catch(2).default(2),
  energy: z.number().catch(2).default(2),
  sleep: z.number().catch(2).default(2),
  symptoms: z.array(z.string()).catch([]).default([]),
  notes: z.string().optional().catch(undefined),
});

export const backupPayloadSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  logs: z.array(dailyLogZodSchema),
});

/**
 * Normalizes and sanitizes a raw log entry safely. Returns null if corrupted or invalid date.
 */
export function normalizeLog(raw: unknown): DailyLog | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = dailyLogZodSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;
  return {
    date: data.date,
    flow: data.flow as Flow,
    painAreas: Array.isArray(data.painAreas) ? data.painAreas : [],
    painLevel: Math.max(0, Math.min(5, Number(data.painLevel) || 0)),
    mood: Math.max(1, Math.min(3, Number(data.mood) || 2)),
    energy: Math.max(1, Math.min(3, Number(data.energy) || 2)),
    sleep: Math.max(1, Math.min(3, Number(data.sleep) || 2)),
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
    notes: typeof data.notes === "string" ? data.notes.slice(0, 300) : undefined,
  };
}

export const logService = {
  all(): DailyLog[] {
    const raw = storage.get<unknown[]>("logs", []);
    if (!Array.isArray(raw)) return [];

    const validLogs: DailyLog[] = [];
    for (const item of raw) {
      const norm = normalizeLog(item);
      if (norm) validLogs.push(norm);
    }

    return validLogs.sort((a, b) => a.date.localeCompare(b.date));
  },

  get(date: string): DailyLog | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return this.all().find((l) => l.date === date) ?? null;
  },

  save(log: DailyLog): { success: boolean; error?: string } {
    try {
      const norm = normalizeLog(log);
      if (!norm) {
        return { success: false, error: "Invalid log entry format" };
      }

      const existing = this.all();
      const rest = existing.filter((l) => l.date !== norm.date);
      const updated = [...rest, norm].sort((a, b) => a.date.localeCompare(b.date));

      const ok = storage.set("logs", updated);
      if (!ok) {
        return {
          success: false,
          error: "Phone storage is full or blocked. Unable to save entry.",
        };
      }

      storage.set("logs_schema_version", LOGS_SCHEMA_VERSION);
      return { success: true };
    } catch (e) {
      console.error("[logService] Failed to save log:", e);
      return {
        success: false,
        error: "Phone storage is full or blocked. Unable to save entry.",
      };
    }
  },

  delete(date: string): boolean {
    try {
      const existing = this.all();
      const updated = existing.filter((l) => l.date !== date);
      return storage.set("logs", updated);
    } catch {
      return false;
    }
  },

  replaceAll(logs: DailyLog[]): void {
    const sanitized = logs
      .map(normalizeLog)
      .filter((l): l is DailyLog => l !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    storage.set("logs", sanitized);
    storage.set("logs_schema_version", LOGS_SCHEMA_VERSION);
  },

  /**
   * Export all user logs as formatted JSON for backup
   */
  exportBackup(): string {
    const currentLogs = this.all();
    const payload = {
      version: LOGS_SCHEMA_VERSION,
      exportedAt: formatLocalDate(),
      count: currentLogs.length,
      logs: currentLogs,
    };
    return JSON.stringify(payload, null, 2);
  },

  /**
   * Restore/merge logs from a JSON backup file after zod validation
   */
  importBackup(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsedRaw = JSON.parse(jsonString);
      const validated = backupPayloadSchema.safeParse(parsedRaw);

      if (!validated.success) {
        return {
          success: false,
          count: 0,
          error: "Invalid backup file structure or corrupted data.",
        };
      }

      const imported = validated.data.logs;
      if (imported.length === 0) {
        return { success: true, count: 0 };
      }

      // Merge with existing logs: incoming logs update existing dates
      const existing = this.all();
      const map = new Map<string, DailyLog>();
      for (const item of existing) map.set(item.date, item);
      for (const item of imported) {
        const norm = normalizeLog(item);
        if (norm) map.set(norm.date, norm);
      }

      const merged = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
      const ok = storage.set("logs", merged);

      if (!ok) {
        return {
          success: false,
          count: 0,
          error: "Phone storage is full. Could not restore backup.",
        };
      }

      storage.set("logs_schema_version", LOGS_SCHEMA_VERSION);
      return { success: true, count: imported.length };
    } catch {
      return {
        success: false,
        count: 0,
        error: "Failed to parse backup JSON file.",
      };
    }
  },
};
