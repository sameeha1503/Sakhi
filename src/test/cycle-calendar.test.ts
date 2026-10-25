import { describe, it, expect, beforeEach } from "vitest";
import {
  getMonthGrid,
  canNavigatePrevMonth,
  canNavigateNextMonth,
  getPredictedPeriodDates,
  determinePostSaveRedirect,
} from "@/services/cycle";
import {
  logService,
  emptyLog,
  formatLocalDate,
  normalizeLog,
  type DailyLog,
} from "@/services/logs";

describe("Cycle Calendar & Logs Service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Month grid generation", () => {
    it("starts week on Monday and calculates leading blanks correctly", () => {
      // 2026-06-01 was a Monday -> 0 leading blanks
      const gridJune2026 = getMonthGrid(2026, 6, "2026-06-15");
      const blanksJune = gridJune2026.filter((c) => c.type === "blank");
      expect(blanksJune).toHaveLength(0);

      // 2026-10-01 was a Thursday -> Monday=0, Tue=1, Wed=2, Thu=3 -> 3 leading blanks
      const gridOct2026 = getMonthGrid(2026, 10, "2026-10-25");
      const blanksOct = gridOct2026.filter((c) => c.type === "blank");
      expect(blanksOct).toHaveLength(3);

      // 2026-11-01 is a Sunday -> Sunday is index 6 in Monday-start calendar -> 6 leading blanks
      const gridNov2026 = getMonthGrid(2026, 11, "2026-11-01");
      const blanksNov = gridNov2026.filter((c) => c.type === "blank");
      expect(blanksNov).toHaveLength(6);
    });

    it("generates correct days for 28, 29, 30, and 31 day months", () => {
      // February non-leap year (2025): 28 days
      const feb2025 = getMonthGrid(2025, 2, "2025-02-01");
      const daysFeb2025 = feb2025.filter((c) => c.type === "day");
      expect(daysFeb2025).toHaveLength(28);

      // February leap year (2024): 29 days
      const feb2024 = getMonthGrid(2024, 2, "2024-02-01");
      const daysFeb2024 = feb2024.filter((c) => c.type === "day");
      expect(daysFeb2024).toHaveLength(29);
      expect(daysFeb2024[28]).toMatchObject({
        type: "day",
        day: 29,
        date: "2024-02-29",
      });

      // April: 30 days
      const apr = getMonthGrid(2026, 4, "2026-04-10");
      const daysApr = apr.filter((c) => c.type === "day");
      expect(daysApr).toHaveLength(30);

      // October: 31 days
      const oct = getMonthGrid(2026, 10, "2026-10-25");
      const daysOct = oct.filter((c) => c.type === "day");
      expect(daysOct).toHaveLength(31);
    });

    it("flags today and future days accurately", () => {
      const today = "2026-10-15";
      const grid = getMonthGrid(2026, 10, today);
      const days = grid.filter((c) => c.type === "day");

      const day14 = days.find((c) => c.date === "2026-10-14");
      const day15 = days.find((c) => c.date === "2026-10-15");
      const day16 = days.find((c) => c.date === "2026-10-16");

      expect(day14).toMatchObject({ isToday: false, isFuture: false });
      expect(day15).toMatchObject({ isToday: true, isFuture: false });
      expect(day16).toMatchObject({ isToday: false, isFuture: true });
    });

    it("calculates predicted period dates properly", () => {
      const predicted = getPredictedPeriodDates("2026-11-05", 5);
      expect(predicted.has("2026-11-05")).toBe(true);
      expect(predicted.has("2026-11-06")).toBe(true);
      expect(predicted.has("2026-11-07")).toBe(true);
      expect(predicted.has("2026-11-08")).toBe(true);
      expect(predicted.has("2026-11-09")).toBe(true);
      expect(predicted.has("2026-11-10")).toBe(false);
    });
  });

  describe("Month navigation limits", () => {
    it("disallows navigating beyond 24 months back", () => {
      // Current: Oct 2026 (year 2026, month 10)
      // 23 months back: Nov 2024 -> can navigate further back
      expect(canNavigatePrevMonth(2024, 11, 2026, 10)).toBe(true);

      // 24 months back: Oct 2024 -> at limit, cannot navigate further back
      expect(canNavigatePrevMonth(2024, 10, 2026, 10)).toBe(false);

      // 25 months back: Sep 2024 -> past limit
      expect(canNavigatePrevMonth(2024, 9, 2026, 10)).toBe(false);
    });

    it("disallows navigating into future months beyond current month", () => {
      // Current: Oct 2026
      // Past month (Sep 2026) -> can navigate forward
      expect(canNavigateNextMonth(2026, 9, 2026, 10)).toBe(true);

      // Current month (Oct 2026) -> cannot navigate forward
      expect(canNavigateNextMonth(2026, 10, 2026, 10)).toBe(false);

      // Future month (Nov 2026) -> cannot navigate forward
      expect(canNavigateNextMonth(2026, 11, 2026, 10)).toBe(false);
    });
  });

  describe("Saving, loading, backfilling, editing, and deleting", () => {
    it("saves and loads entry for a specific date with notes", () => {
      const log: DailyLog = {
        ...emptyLog("2026-10-12"),
        flow: "heavy",
        painLevel: 3,
        painAreas: ["stomach", "back"],
        mood: 1,
        energy: 1,
        sleep: 2,
        symptoms: ["pelvicPain"],
        notes: "Heavy flow started in afternoon, drank ginger tea.",
      };

      const saveResult = logService.save(log);
      expect(saveResult.success).toBe(true);

      const loaded = logService.get("2026-10-12");
      expect(loaded).toBeDefined();
      expect(loaded?.flow).toBe("heavy");
      expect(loaded?.painLevel).toBe(3);
      expect(loaded?.notes).toBe("Heavy flow started in afternoon, drank ginger tea.");
    });

    it("backfills an entry for a past date", () => {
      const pastLog: DailyLog = {
        ...emptyLog("2026-08-04"),
        flow: "medium",
        painLevel: 2,
        painAreas: ["stomach"],
        mood: 2,
        energy: 2,
        sleep: 3,
        symptoms: [],
        notes: "Backfilled past cycle note.",
      };

      const res = logService.save(pastLog);
      expect(res.success).toBe(true);

      const retrieved = logService.get("2026-08-04");
      expect(retrieved?.date).toBe("2026-08-04");
      expect(retrieved?.notes).toBe("Backfilled past cycle note.");
    });

    it("edits an existing entry without duplicating dates", () => {
      const initial: DailyLog = {
        ...emptyLog("2026-09-01"),
        flow: "light",
        painLevel: 1,
      };
      logService.save(initial);
      expect(logService.all().filter((l) => l.date === "2026-09-01")).toHaveLength(1);

      // Edit
      const updated: DailyLog = {
        ...initial,
        flow: "medium",
        painLevel: 4,
        painAreas: ["head"],
        notes: "Migraine developed in the evening.",
      };
      logService.save(updated);

      const all = logService.all().filter((l) => l.date === "2026-09-01");
      expect(all).toHaveLength(1);
      expect(all[0]?.flow).toBe("medium");
      expect(all[0]?.painLevel).toBe(4);
      expect(all[0]?.notes).toBe("Migraine developed in the evening.");
    });

    it("deletes an entry cleanly", () => {
      logService.save({ ...emptyLog("2026-07-10"), flow: "light" });
      logService.save({ ...emptyLog("2026-07-11"), flow: "medium" });

      expect(logService.get("2026-07-10")).not.toBeNull();
      expect(logService.get("2026-07-11")).not.toBeNull();

      const deleted = logService.delete("2026-07-10");
      expect(deleted).toBe(true);

      expect(logService.get("2026-07-10")).toBeNull();
      expect(logService.get("2026-07-11")).not.toBeNull();
    });
  });

  describe("Urgent screen redirect logic", () => {
    it("redirects to /urgent ONLY when saving today's entry with red flag", () => {
      const severeLog: DailyLog = {
        ...emptyLog("2026-10-25"),
        flow: "veryHeavy",
        painLevel: 5,
        painAreas: ["pelvis"],
        symptoms: ["pelvicPain"],
      };

      // Today + severe -> /urgent
      const todayRedirect = determinePostSaveRedirect(severeLog, true);
      expect(todayRedirect).toEqual({ to: "/urgent" });

      // Past date + severe -> /cycle with target date
      const pastRedirect = determinePostSaveRedirect(severeLog, false);
      expect(pastRedirect).toEqual({
        to: "/cycle",
        targetDate: "2026-10-25",
      });
    });

    it("returns to /cycle when saving non-severe entry for today", () => {
      const normalLog: DailyLog = {
        ...emptyLog("2026-10-25"),
        flow: "light",
        painLevel: 2,
      };

      const redirect = determinePostSaveRedirect(normalLog, true);
      expect(redirect).toEqual({
        to: "/cycle",
        targetDate: "2026-10-25",
      });
    });
  });

  describe("Backup export and import round trip", () => {
    it("exports valid JSON and imports with complete parity", () => {
      const log1: DailyLog = {
        ...emptyLog("2026-05-15"),
        flow: "heavy",
        painLevel: 3,
        painAreas: ["pelvis", "back"],
        notes: "Day 1 of May cycle",
      };
      const log2: DailyLog = {
        ...emptyLog("2026-06-12"),
        flow: "medium",
        painLevel: 1,
        notes: "Mild symptoms",
      };

      logService.save(log1);
      logService.save(log2);

      const exportedJson = logService.exportBackup();
      expect(typeof exportedJson).toBe("string");

      const parsed = JSON.parse(exportedJson);
      expect(parsed.version).toBe(2);
      expect(parsed.logs).toHaveLength(2);

      // Clear storage to simulate new device or restore after reset
      localStorage.clear();
      expect(logService.all()).toHaveLength(0);

      // Import backup
      const importResult = logService.importBackup(exportedJson);
      expect(importResult.success).toBe(true);
      expect(importResult.count).toBe(2);

      const restored1 = logService.get("2026-05-15");
      expect(restored1?.flow).toBe("heavy");
      expect(restored1?.notes).toBe("Day 1 of May cycle");

      const restored2 = logService.get("2026-06-12");
      expect(restored2?.flow).toBe("medium");
      expect(restored2?.notes).toBe("Mild symptoms");
    });
  });

  describe("Corrupted and invalid data handling", () => {
    it("handles corrupted or invalid backup JSON safely", () => {
      const invalidJson = "{ not json at all }";
      const res1 = logService.importBackup(invalidJson);
      expect(res1.success).toBe(false);
      expect(res1.error).toBeDefined();

      const invalidStructure = JSON.stringify({ version: 2, logs: "not-an-array" });
      const res2 = logService.importBackup(invalidStructure);
      expect(res2.success).toBe(false);
    });

    it("normalizes and sanitizes malformed raw logs", () => {
      // Corrupted / missing fields
      const normalized = normalizeLog({
        date: "2026-10-10",
        flow: "invalid_flow_value",
        painLevel: 99, // Should clamp to 5
        mood: -5, // Should clamp to 1
        energy: 10, // Should clamp to 3
        notes: "A".repeat(500), // Should truncate to 300
      });

      expect(normalized).not.toBeNull();
      expect(normalized?.flow).toBe("none");
      expect(normalized?.painLevel).toBe(5);
      expect(normalized?.mood).toBe(1);
      expect(normalized?.energy).toBe(3);
      expect(normalized?.notes?.length).toBe(300);

      // Rejects totally invalid object or date
      expect(normalizeLog(null)).toBeNull();
      expect(normalizeLog("random string")).toBeNull();
      expect(normalizeLog({ date: "not-a-date" })).toBeNull();
    });

    it("formatLocalDate produces YYYY-MM-DD from local year, month, date", () => {
      const sample = new Date(2026, 9, 25, 1, 30, 0); // Oct 25, 2026 01:30 AM local
      const formatted = formatLocalDate(sample);
      expect(formatted).toBe("2026-10-25");
    });
  });
});
