import { describe, it, expect } from "vitest";
import { periodStarts, cycleLengths, isIrregular, patternFlags, isRedFlag } from "@/services/cycle";
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
});
