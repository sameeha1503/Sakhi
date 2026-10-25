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

export type FlagId = "irregularPlus" | "painCycle" | "heavyRepeat" | "lateCycle" | "ongoingPain";

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

  // lateCycle: 45+ days since last period start
  const lastStart = starts.at(-1);
  if (lastStart && diffDays(lastStart, today) >= 45) {
    flags.push("lateCycle");
  }

  // ongoingPain: pain 3+ on 5 of the last 7 days (including today)
  const r7 = recent(7);
  const painDaysCount = r7.filter((l) => l.painLevel >= 3).length;
  if (painDaysCount >= 5) {
    flags.push("ongoingPain");
  }

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

export type SafetyTier = "urgent" | "soon" | "none";

/**
 * Evaluates same-day safety tier:
 * - urgent: red flag symptoms (veryHeavy flow, pain 5, or pelvic pain with pain 4+)
 * - soon: see a doctor in the next day or two (pain 3-4 for 3 consecutive days, or flow heavy twice in 3 days)
 * - none: normal variations
 */
export function evaluateSafetyTier(
  todayLog: DailyLog,
  allLogs: DailyLog[] = [],
): { tier: SafetyTier; reason?: string } {
  if (isRedFlag(todayLog)) {
    return { tier: "urgent", reason: "redFlag" };
  }

  const targetDate = todayLog.date;
  const logMap = new Map<string, DailyLog>();
  for (const l of allLogs) {
    logMap.set(l.date, l);
  }
  logMap.set(targetDate, todayLog); // Ensure today's unsaved log is present

  const d0 = targetDate;
  const d1 = new Date(toMs(targetDate) - DAY).toISOString().slice(0, 10);
  const d2 = new Date(toMs(targetDate) - 2 * DAY).toISOString().slice(0, 10);

  const l0 = logMap.get(d0);
  const l1 = logMap.get(d1);
  const l2 = logMap.get(d2);

  // Rule 1: Pain 3-4 for 3 days in a row (today and previous 2 consecutive days)
  const pain3DaysInRow =
    (l0?.painLevel ?? 0) >= 3 && (l1?.painLevel ?? 0) >= 3 && (l2?.painLevel ?? 0) >= 3;

  // Rule 2: Flow heavy or veryHeavy on 2 or more days in the last 3 days
  const isHeavy = (l?: DailyLog) => l?.flow === "heavy" || l?.flow === "veryHeavy";
  const heavyCount = [l0, l1, l2].filter(isHeavy).length;
  const heavyTwiceIn3Days = heavyCount >= 2;

  if (pain3DaysInRow || heavyTwiceIn3Days) {
    return {
      tier: "soon",
      reason: pain3DaysInRow ? "consecutivePain" : "repeatedHeavyFlow",
    };
  }

  return { tier: "none" };
}

/**
 * Determines redirect destination after saving an entry:
 * - Urgent screen redirect ONLY applies when saving today's entry.
 * - Soon card search param ONLY applies when saving today's entry with tier === "soon".
 * - When backfilling or editing an older day, always returns to calendar with no alarm tier.
 */
export function determinePostSaveRedirect(
  log: DailyLog,
  isToday: boolean,
  allLogs: DailyLog[] = [],
): { to: "/urgent" } | { to: "/cycle"; targetDate: string; tier?: SafetyTier } {
  if (isToday) {
    const safety = evaluateSafetyTier(log, allLogs);
    if (safety.tier === "urgent") {
      return { to: "/urgent" };
    }
    if (safety.tier === "soon") {
      return { to: "/cycle", targetDate: log.date, tier: "soon" };
    }
  }
  return { to: "/cycle", targetDate: log.date };
}

export type CalendarCell =
  | { type: "blank"; id: string }
  | { type: "day"; day: number; date: string; isToday: boolean; isFuture: boolean };

/**
 * Generates a 7-column calendar month grid where weeks start on Monday (0).
 * Accurately handles leap years (e.g. Feb 29).
 */
export function getMonthGrid(
  year: number,
  month: number, // 1-indexed (1-12)
  todayStr: string,
): CalendarCell[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1);
  const leadingBlanks = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6

  const cells: CalendarCell[] = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ type: "blank", id: `blank-${year}-${month}-${i}` });
  }

  const mStr = String(month).padStart(2, "0");
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = String(day).padStart(2, "0");
    const date = `${year}-${mStr}-${dStr}`;
    cells.push({
      type: "day",
      day,
      date,
      isToday: date === todayStr,
      isFuture: date > todayStr,
    });
  }

  return cells;
}

export function canNavigatePrevMonth(
  year: number,
  month: number,
  currentYear: number,
  currentMonth: number,
): boolean {
  const nowMonths = currentYear * 12 + currentMonth;
  const targetMonths = year * 12 + month;
  return nowMonths - targetMonths < 24;
}

export function canNavigateNextMonth(
  year: number,
  month: number,
  currentYear: number,
  currentMonth: number,
): boolean {
  const nowMonths = currentYear * 12 + currentMonth;
  const targetMonths = year * 12 + month;
  return targetMonths < nowMonths;
}

export function getPredictedPeriodDates(nextPeriodDate: string | null, days = 5): Set<string> {
  const set = new Set<string>();
  if (!nextPeriodDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextPeriodDate)) return set;

  const [y, m, d] = nextPeriodDate.split("-").map(Number);
  const base = new Date(y!, m! - 1, d!);

  for (let i = 0; i < days; i++) {
    const cur = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const yr = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, "0");
    const da = String(cur.getDate()).padStart(2, "0");
    set.add(`${yr}-${mo}-${da}`);
  }

  return set;
}
