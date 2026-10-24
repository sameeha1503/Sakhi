// Rule-based cycle and pattern logic. Informs only; never diagnoses.
import type { DailyLog } from "./logs";

const DAY = 86400000;
const toMs = (iso: string) => new Date(iso + "T00:00:00Z").getTime();
const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY);
const bleeding = (l: DailyLog) => l.flow !== "none";

/** First day of each bleeding run (gap of 1 non-bleeding day still counts as same period). */
export function periodStarts(logs: DailyLog[]): string[] {
  const days = logs
    .filter(bleeding)
    .map((l) => l.date)
    .sort();
  const starts: string[] = [];
  let prev: string | null = null;
  for (const d of days) {
    if (!prev || diffDays(prev, d) > 2) starts.push(d);
    prev = d;
  }
  return starts;
}

export function cycleLengths(logs: DailyLog[]): number[] {
  const s = periodStarts(logs);
  return s.slice(1).map((d, i) => diffDays(s[i]!, d));
}

export function isIrregular(logs: DailyLog[]): boolean {
  const len = cycleLengths(logs);
  if (len.length < 2) return false;
  return len.some((n) => n < 21 || n > 35) || Math.max(...len) - Math.min(...len) > 7;
}

export function cycleSummary(logs: DailyLog[], today: string) {
  const starts = periodStarts(logs);
  const len = cycleLengths(logs);
  const avg = len.length ? Math.round(len.reduce((a, b) => a + b, 0) / len.length) : 28;
  const last = starts.at(-1) ?? null;
  const day = last ? diffDays(last, today) + 1 : null;
  const next = last ? new Date(toMs(last) + avg * DAY).toISOString().slice(0, 10) : null;
  return {
    lastStart: last,
    cycleDay: day,
    avgLength: len.length ? avg : null,
    nextPeriod: next,
    irregular: isIrregular(logs),
  };
}

export type FlagId = "irregularPlus" | "painCycle" | "heavyRepeat";

export function patternFlags(logs: DailyLog[], today: string): FlagId[] {
  const recent = (days: number) =>
    logs.filter((l) => {
      const d = diffDays(l.date, today);
      return d >= 0 && d < days;
    });
  const flags: FlagId[] = [];

  // Irregular cycles (measured or reported) + other symptoms spread over 3+ weeks.
  const r90 = recent(90);
  const other = r90.filter((l) =>
    l.symptoms.some((s) => ["acne", "hairLoss", "weight"].includes(s)),
  );
  const reportedIrregular = r90.filter((l) => l.symptoms.includes("irregular")).length >= 2;
  const span = other.length ? diffDays(other[0]!.date, other.at(-1)!.date) : 0;
  if ((isIrregular(logs) || reportedIrregular) && other.length >= 3 && span >= 21)
    flags.push("irregularPlus");

  // Severe pain (4+) on bleeding days, in at least 2 different periods.
  const starts = periodStarts(logs);
  const painfulPeriods = new Set(
    r90
      .filter((l) => l.painLevel >= 4 && bleeding(l))
      .map((l) => starts.filter((s) => s <= l.date).at(-1)),
  );
  if (painfulPeriods.size >= 2) flags.push("painCycle");

  // Heavy bleeding on 4+ days in 90 days.
  if (
    r90.filter(
      (l) => l.flow === "heavy" || l.flow === "veryHeavy" || l.symptoms.includes("heavyBleeding"),
    ).length >= 4
  )
    flags.push("heavyRepeat");

  return flags;
}

/** Severe entry that should send her to a hospital now. */
export function isRedFlag(l: DailyLog): boolean {
  return (
    l.flow === "veryHeavy" ||
    l.painLevel >= 5 ||
    (l.symptoms.includes("pelvicPain") && l.painLevel >= 4)
  );
}
