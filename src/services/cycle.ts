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

/**
 * Determines redirect destination after saving an entry:
 * Urgent screen redirect ONLY applies when saving today's entry.
 * When backfilling or editing an older day, always returns to calendar.
 */
export function determinePostSaveRedirect(
  log: DailyLog,
  isToday: boolean,
): { to: "/urgent" } | { to: "/cycle"; targetDate: string } {
  if (isRedFlag(log) && isToday) {
    return { to: "/urgent" };
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
