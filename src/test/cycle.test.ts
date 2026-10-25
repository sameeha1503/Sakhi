import { describe, it, expect } from "vitest";
import {
  periodStarts,
  cycleLengths,
  isIrregular,
  patternFlags,
  isRedFlag,
  evaluateSafetyTier,
  determinePostSaveRedirect,
} from "@/services/cycle";
import { emptyLog, type DailyLog } from "@/services/logs";

const add = (iso: string, n: number) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
const period = (start: string, days = 4, extra: Partial<DailyLog> = {}) =>
  Array.from({ length: days }, (_, i) => ({
    ...emptyLog(add(start, i)),
    flow: "medium" as const,
    ...extra,
  }));

describe("cycle rules", () => {
  it("finds period starts and cycle lengths", () => {
    const logs = [...period("2026-01-01"), ...period("2026-01-29"), ...period("2026-02-26")];
    expect(periodStarts(logs)).toEqual(["2026-01-01", "2026-01-29", "2026-02-26"]);
    expect(cycleLengths(logs)).toEqual([28, 28]);
    expect(isIrregular(logs)).toBe(false);
  });
  it("flags cycles longer than 35 days as irregular", () => {
    const logs = [...period("2026-01-01"), ...period("2026-02-15"), ...period("2026-03-15")];
    expect(isIrregular(logs)).toBe(true);
  });
  it("flags irregular cycles plus acne over 3+ weeks", () => {
    const logs = [
      ...period("2026-01-01"),
      ...period("2026-02-15"),
      ...period("2026-03-15"),
      ...["2026-02-20", "2026-03-01", "2026-03-20"].map((d) => ({
        ...emptyLog(d),
        symptoms: ["acne"],
      })),
    ];
    expect(patternFlags(logs, "2026-03-25")).toContain("irregularPlus");
  });
  it("flags severe pain in two different periods", () => {
    const logs = [
      ...period("2026-02-01", 3, { painLevel: 4 }),
      ...period("2026-03-01", 3, { painLevel: 4 }),
    ];
    expect(patternFlags(logs, "2026-03-10")).toContain("painCycle");
  });
  it("red flag for very heavy bleeding or pain level 5", () => {
    expect(isRedFlag({ ...emptyLog(), flow: "veryHeavy" })).toBe(true);
    expect(isRedFlag({ ...emptyLog(), painLevel: 5 })).toBe(true);
    expect(isRedFlag({ ...emptyLog(), painLevel: 3 })).toBe(false);
  });

  describe("lateCycle boundary rules (45+ days since last period start)", () => {
    it("does not flag if 44 days have passed", () => {
      const logs = [...period("2026-01-01")];
      // 2026-01-01 + 44 days = 2026-02-14
      const today = add("2026-01-01", 44);
      expect(patternFlags(logs, today)).not.toContain("lateCycle");
    });

    it("flags lateCycle if exactly 45 days have passed", () => {
      const logs = [...period("2026-01-01")];
      const today = add("2026-01-01", 45);
      expect(patternFlags(logs, today)).toContain("lateCycle");
    });

    it("flags lateCycle if more than 45 days (e.g. 60 days) have passed", () => {
      const logs = [...period("2026-01-01")];
      const today = add("2026-01-01", 60);
      expect(patternFlags(logs, today)).toContain("lateCycle");
    });
  });

  describe("ongoingPain boundary rules (pain 3+ on 5 of the last 7 days)", () => {
    const today = "2026-10-25";

    it("does not flag if pain 3+ on only 4 of the last 7 days", () => {
      const logs: DailyLog[] = [
        { ...emptyLog("2026-10-25"), painLevel: 3 },
        { ...emptyLog("2026-10-24"), painLevel: 3 },
        { ...emptyLog("2026-10-23"), painLevel: 3 },
        { ...emptyLog("2026-10-22"), painLevel: 3 },
        { ...emptyLog("2026-10-21"), painLevel: 1 },
        { ...emptyLog("2026-10-20"), painLevel: 0 },
        { ...emptyLog("2026-10-19"), painLevel: 2 },
      ];
      expect(patternFlags(logs, today)).not.toContain("ongoingPain");
    });

    it("flags ongoingPain if pain 3+ on 5 of the last 7 days", () => {
      const logs: DailyLog[] = [
        { ...emptyLog("2026-10-25"), painLevel: 3 },
        { ...emptyLog("2026-10-24"), painLevel: 4 },
        { ...emptyLog("2026-10-23"), painLevel: 3 },
        { ...emptyLog("2026-10-22"), painLevel: 3 },
        { ...emptyLog("2026-10-21"), painLevel: 3 },
        { ...emptyLog("2026-10-20"), painLevel: 0 },
        { ...emptyLog("2026-10-19"), painLevel: 1 },
      ];
      expect(patternFlags(logs, today)).toContain("ongoingPain");
    });

    it("does not count pain older than 7 days towards ongoingPain", () => {
      const logs: DailyLog[] = [
        { ...emptyLog("2026-10-25"), painLevel: 3 },
        { ...emptyLog("2026-10-24"), painLevel: 3 },
        { ...emptyLog("2026-10-23"), painLevel: 3 },
        { ...emptyLog("2026-10-22"), painLevel: 3 },
        // The 5th pain day is 8 days ago (2026-10-17)
        { ...emptyLog("2026-10-17"), painLevel: 4 },
      ];
      expect(patternFlags(logs, today)).not.toContain("ongoingPain");
    });
  });

  describe("Safety tiers: evaluateSafetyTier & determinePostSaveRedirect", () => {
    const today = "2026-10-25";

    it("returns urgent tier for red flag symptoms", () => {
      const todayLog: DailyLog = { ...emptyLog(today), flow: "veryHeavy" };
      expect(evaluateSafetyTier(todayLog, [])).toEqual({
        tier: "urgent",
        reason: "redFlag",
      });

      const redirect = determinePostSaveRedirect(todayLog, true, []);
      expect(redirect).toEqual({ to: "/urgent" });
    });

    it("returns soon tier for pain 3-4 on 3 consecutive days", () => {
      const allLogs: DailyLog[] = [
        { ...emptyLog("2026-10-23"), painLevel: 3 },
        { ...emptyLog("2026-10-24"), painLevel: 4 },
      ];
      const todayLog: DailyLog = { ...emptyLog("2026-10-25"), painLevel: 3 };

      const res = evaluateSafetyTier(todayLog, allLogs);
      expect(res.tier).toBe("soon");
      expect(res.reason).toBe("consecutivePain");

      const redirect = determinePostSaveRedirect(todayLog, true, allLogs);
      expect(redirect).toEqual({
        to: "/cycle",
        targetDate: "2026-10-25",
        tier: "soon",
      });
    });

    it("returns soon tier for heavy flow twice in 3 days", () => {
      const allLogs: DailyLog[] = [
        { ...emptyLog("2026-10-23"), flow: "heavy" },
        { ...emptyLog("2026-10-24"), flow: "light" },
      ];
      const todayLog: DailyLog = { ...emptyLog("2026-10-25"), flow: "heavy" };

      const res = evaluateSafetyTier(todayLog, allLogs);
      expect(res.tier).toBe("soon");
      expect(res.reason).toBe("repeatedHeavyFlow");

      const redirect = determinePostSaveRedirect(todayLog, true, allLogs);
      expect(redirect).toEqual({
        to: "/cycle",
        targetDate: "2026-10-25",
        tier: "soon",
      });
    });

    it("returns none tier when conditions for urgent and soon are not met", () => {
      const allLogs: DailyLog[] = [
        { ...emptyLog("2026-10-23"), painLevel: 1, flow: "medium" },
        { ...emptyLog("2026-10-24"), painLevel: 2, flow: "light" },
      ];
      const todayLog: DailyLog = { ...emptyLog("2026-10-25"), painLevel: 2, flow: "medium" };

      const res = evaluateSafetyTier(todayLog, allLogs);
      expect(res.tier).toBe("none");

      const redirect = determinePostSaveRedirect(todayLog, true, allLogs);
      expect(redirect).toEqual({
        to: "/cycle",
        targetDate: "2026-10-25",
      });
    });

    it("never redirects to urgent or attaches soon tier when backfilling older entries", () => {
      const olderLog: DailyLog = { ...emptyLog("2026-10-10"), flow: "veryHeavy", painLevel: 5 };
      const redirect = determinePostSaveRedirect(olderLog, false, []);
      expect(redirect).toEqual({
        to: "/cycle",
        targetDate: "2026-10-10",
      });
    });
  });
});
