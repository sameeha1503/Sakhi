import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  Smile,
  Meh,
  Frown,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  MoonStar,
  Moon,
  Sun,
  Droplet,
  Droplets,
  Ban,
  Brain,
  HeartHandshake,
  Soup,
  CircleDot,
  PersonStanding,
  Footprints,
  CalendarX,
  Sparkles,
  Scissors,
  Scale,
  Zap,
  CheckCircle2,
  FileText,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FlagCards } from "@/components/FlagCards";
import { logService, todayISO, formatLocalDate, type DailyLog } from "@/services/logs";
import {
  cycleSummary,
  patternFlags,
  getMonthGrid,
  canNavigatePrevMonth,
  canNavigateNextMonth,
  getPredictedPeriodDates,
} from "@/services/cycle";

const cycleSearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  saved: z.string().optional(),
});

export const Route = createFileRoute("/cycle")({
  validateSearch: (search: Record<string, unknown>) => cycleSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "My cycle & Calendar — Sakhi" },
      {
        name: "description",
        content: "Monthly cycle calendar, symptoms log, and pattern detection.",
      },
      { property: "og:title", content: "My cycle & Calendar — Sakhi" },
      {
        property: "og:description",
        content: "Monthly cycle calendar, symptoms log, and pattern detection.",
      },
    ],
  }),
  component: CyclePage,
});

const areaIcons = {
  head: Brain,
  breast: HeartHandshake,
  stomach: Soup,
  pelvis: CircleDot,
  back: PersonStanding,
  legs: Footprints,
};

const symptomIcons = {
  irregular: CalendarX,
  acne: Sparkles,
  hairLoss: Scissors,
  weight: Scale,
  heavyBleeding: Droplets,
  pelvicPain: Zap,
};

function CyclePage() {
  const { t, i18n } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const today = todayISO();
  const [todayYear, todayMonth] = useMemo(() => {
    const parts = today.split("-").map(Number);
    return [parts[0]!, parts[1]!];
  }, [today]);

  // Initial month view and selected date from search params or today
  const initialDate = search.date && search.date <= today ? search.date : today;
  const initialParts = initialDate.split("-").map(Number);

  const [viewYear, setViewYear] = useState<number>(initialParts[0]!);
  const [viewMonth, setViewMonth] = useState<number>(initialParts[1]!); // 1-12
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [isDayPanelOpen, setIsDayPanelOpen] = useState<boolean>(true);
  const [showSavedNotice, setShowSavedNotice] = useState<boolean>(search.saved === "true");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  const [logs, setLogs] = useState<DailyLog[]>([]);

  useEffect(() => {
    setLogs(logService.all());
  }, []);

  const logsByDate = useMemo(() => {
    return new Map<string, DailyLog>(logs.map((l) => [l.date, l]));
  }, [logs]);

  const summary = useMemo(() => cycleSummary(logs, today), [logs, today]);
  const flags = useMemo(() => patternFlags(logs, today), [logs, today]);

  // Predicted next period dates
  const predictedDates = useMemo(() => {
    return getPredictedPeriodDates(summary.nextPeriod, 5);
  }, [summary.nextPeriod]);

  // Month navigation boundary checks (max 24 months back, no future months)
  const canGoPrev = canNavigatePrevMonth(viewYear, viewMonth, todayYear, todayMonth);
  const canGoNext = canNavigateNextMonth(viewYear, viewMonth, todayYear, todayMonth);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Jump to month options (24 months back up to current month)
  const jumpOptions = useMemo(() => {
    const opts: { year: number; month: number; label: string }[] = [];
    for (let i = 0; i <= 24; i++) {
      const d = new Date(todayYear, todayMonth - 1 - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const label = new Intl.DateTimeFormat(i18n.language + "-IN", {
        month: "short",
        year: "numeric",
        numberingSystem: "latn",
      }).format(d);
      opts.push({ year: yr, month: mo, label });
    }
    return opts;
  }, [todayYear, todayMonth, i18n.language]);

  // 7-column calendar month grid (starting on Monday)
  const monthGrid = useMemo(() => {
    return getMonthGrid(viewYear, viewMonth, today);
  }, [viewYear, viewMonth, today]);

  // Weekday headers (Monday to Sunday)
  const weekdayNames = useMemo(() => {
    const list: string[] = [];
    // Start on Monday (2026-10-19 was a Monday)
    const baseMonday = new Date(2026, 9, 19);
    for (let i = 0; i < 7; i++) {
      const d = new Date(2026, 9, 19 + i);
      const name = new Intl.DateTimeFormat(i18n.language + "-IN", {
        weekday: "short",
      }).format(d);
      list.push(name);
    }
    return list;
  }, [i18n.language]);

  // Month header name formatted in active language with Latin digits
  const monthHeaderLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    return new Intl.DateTimeFormat(i18n.language + "-IN", {
      month: "long",
      year: "numeric",
      numberingSystem: "latn",
    }).format(d);
  }, [viewYear, viewMonth, i18n.language]);

  // Month summary line stats
  const monthStats = useMemo(() => {
    const mPrefix = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
    const monthLogs = logs.filter((l) => l.date.startsWith(mPrefix));
    const loggedCount = monthLogs.length;
    const periodCount = monthLogs.filter((l) => l.flow !== "none").length;
    let maxPain = 0;
    for (const l of monthLogs) {
      if (l.painLevel > maxPain) maxPain = l.painLevel;
    }
    return { loggedCount, periodCount, maxPain };
  }, [logs, viewYear, viewMonth]);

  // Selected Day Details
  const selectedLog = logsByDate.get(selectedDate);
  const selectedCycleSummary = useMemo(() => {
    return cycleSummary(logs, selectedDate);
  }, [logs, selectedDate]);

  const selectedDateFormatted = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y!, m! - 1, d!);
    return new Intl.DateTimeFormat(i18n.language + "-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      numberingSystem: "latn",
    }).format(dateObj);
  }, [selectedDate, i18n.language]);

  const handleDeleteEntry = () => {
    logService.delete(selectedDate);
    setLogs(logService.all());
    setDeleteConfirmOpen(false);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setIsDayPanelOpen(true);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5 pb-12 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t("cycle.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("cycle.subtitle", "Track bleeding, pain, symptoms and cycle patterns.")}
            </p>
          </div>

          {/* Quick cycle badge */}
          {summary.cycleDay && (
            <div className="inline-flex items-center gap-3 rounded-2xl bg-secondary px-4 py-2 border border-border/60 self-start sm:self-auto">
              <CalendarHeart className="size-5 text-primary shrink-0" />
              <span className="text-sm font-semibold text-muted-foreground">{t("cycle.day")}:</span>
              <span className="text-xl font-bold text-primary">{summary.cycleDay}</span>
            </div>
          )}
        </div>

        {/* Saved confirmation toast notice */}
        {showSavedNotice && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-success/15 border border-success/40 p-3.5 text-sm font-bold text-success animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>{t("cycle.savedNotice")}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSavedNotice(false)}
              className="tap rounded-full p-1 text-success hover:bg-success/20"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* MAIN LAYOUT: Calendar View + Day Detail Panel            */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (lg:col-span-7 or 8): Monthly Calendar Grid */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            {/* Month Summary Bar */}
            <div className="card-soft border border-border/80 p-4 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold text-foreground">
              <span className="inline-flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="size-4" />
                {t("cycle.summaryDaysLogged", { count: monthStats.loggedCount })}
              </span>
              <span className="inline-flex items-center gap-1.5 text-accent">
                <Droplet className="size-4" />
                {t("cycle.summaryPeriodDays", { count: monthStats.periodCount })}
              </span>
              <span className="inline-flex items-center gap-1.5 text-warning">
                <AlertTriangle className="size-4" />
                {t("cycle.summaryMaxPain", { level: monthStats.maxPain })}
              </span>
            </div>

            {/* Calendar Card */}
            <section className="card-soft border border-border/80 p-4 sm:p-6 shadow-xs flex flex-col gap-4">
              {/* Calendar Month Header & Controls */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={!canGoPrev}
                  aria-label={t("cycle.prevMonth")}
                  className="tap grid size-11 place-items-center rounded-2xl border-2 border-border bg-card text-foreground hover:border-primary/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="size-6" />
                </button>

                {/* Month Name & Year Jump Dropdown */}
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-foreground font-serif capitalize truncate">
                    {monthHeaderLabel}
                  </h2>
                  <select
                    value={`${viewYear}-${viewMonth}`}
                    onChange={(e) => {
                      const [y, m] = e.target.value.split("-").map(Number);
                      setViewYear(y!);
                      setViewMonth(m!);
                    }}
                    aria-label={t("cycle.jumpToMonth")}
                    className="tap rounded-xl border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {jumpOptions.map((opt) => (
                      <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={!canGoNext}
                  aria-label={t("cycle.nextMonth")}
                  className="tap grid size-11 place-items-center rounded-2xl border-2 border-border bg-card text-foreground hover:border-primary/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="size-6" />
                </button>
              </div>

              {/* Weekday Header Row (Starts on Monday) */}
              <div role="grid" aria-label={monthHeaderLabel} className="w-full">
                <div role="row" className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                  {weekdayNames.map((name, i) => (
                    <div
                      key={i}
                      role="columnheader"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-1"
                    >
                      {name}
                    </div>
                  ))}
                </div>

                {/* 7-Column Days Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {monthGrid.map((cell) => {
                    if (cell.type === "blank") {
                      return <div key={cell.id} role="gridcell" className="aspect-square" />;
                    }

                    const { date, day, isToday, isFuture } = cell;
                    const log = logsByDate.get(date);
                    const isSelected = date === selectedDate;
                    const isPredicted = predictedDates.has(date);

                    // Flow color dot styling
                    let flowDotColor = "";
                    if (log) {
                      if (log.flow === "light") flowDotColor = "bg-accent/40";
                      else if (log.flow === "medium") flowDotColor = "bg-accent/75";
                      else if (log.flow === "heavy") flowDotColor = "bg-accent";
                      else if (log.flow === "veryHeavy") flowDotColor = "bg-destructive";
                    }

                    // Descriptive aria label for accessibility
                    const ariaParts = [`${day} ${monthHeaderLabel}`];
                    if (log) {
                      if (log.flow !== "none") ariaParts.push(`${log.flow} flow`);
                      if (log.painLevel > 0) ariaParts.push(`pain level ${log.painLevel}`);
                      if (log.symptoms.length > 0)
                        ariaParts.push(`${log.symptoms.length} symptoms`);
                    } else if (isPredicted) {
                      ariaParts.push("predicted period");
                    }
                    if (isToday) ariaParts.push("today");

                    return (
                      <div key={date} role="gridcell" className="aspect-square w-full">
                        <button
                          type="button"
                          onClick={() => handleSelectDate(date)}
                          aria-label={ariaParts.join(", ")}
                          aria-selected={isSelected}
                          disabled={isFuture}
                          className={`tap relative size-full min-h-[44px] rounded-2xl flex flex-col items-center justify-center p-1 font-bold text-sm transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : isToday
                                ? "border-2 border-primary bg-primary/10 text-primary"
                                : log
                                  ? "bg-secondary text-foreground hover:border-primary/50 border border-border/80"
                                  : "bg-muted/30 text-foreground hover:bg-muted/70 border border-transparent"
                          } ${isPredicted && !log ? "border-2 border-dashed border-accent" : ""} ${
                            isFuture ? "opacity-35 pointer-events-none text-muted-foreground" : ""
                          }`}
                        >
                          {/* Day Number */}
                          <span className="text-xs sm:text-sm font-bold leading-none">{day}</span>

                          {/* Markers Row */}
                          <div className="flex items-center gap-1 mt-1">
                            {/* Flow dot */}
                            {flowDotColor && (
                              <span
                                className={`size-2 rounded-full ${flowDotColor} shrink-0 ${
                                  isSelected ? "ring-1 ring-white" : ""
                                }`}
                              />
                            )}

                            {/* Pain level indicator (3+) */}
                            {log && log.painLevel >= 3 && (
                              <span
                                className={`size-2 rounded-full bg-warning shrink-0 ${
                                  isSelected ? "ring-1 ring-white" : ""
                                }`}
                                title={`Pain ${log.painLevel}`}
                              />
                            )}

                            {/* Symptoms dot */}
                            {log && log.symptoms.length > 0 && (
                              <span
                                className={`size-1.5 rounded-full bg-module-violet shrink-0 ${
                                  isSelected ? "ring-1 ring-white" : ""
                                }`}
                                title={`${log.symptoms.length} symptoms`}
                              />
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Legend */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-border/50 pt-3 text-xs text-muted-foreground font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-accent" />
                  <span>{t("cycle.legendFlow")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-warning" />
                  <span>{t("cycle.legendPain")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-module-violet" />
                  <span>{t("cycle.legendSymptoms")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-md border-2 border-dashed border-accent" />
                  <span>{t("cycle.legendPredicted")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-md border-2 border-primary bg-primary/10" />
                  <span>{t("cycle.legendToday")}</span>
                </div>
              </div>
            </section>

            {/* Pattern Flags (if any detected) */}
            {flags.length > 0 && (
              <div>
                <FlagCards flags={flags} />
              </div>
            )}
          </div>

          {/* Right Column (lg:col-span-5 or 4): Day Detail Panel */}
          <aside className="lg:col-span-5 xl:col-span-4 sticky top-20">
            <div className="card-soft border border-border/80 p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
              {/* Header with Date and Cycle Day */}
              <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("cycle.dayPanelTitle")}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                    {selectedDateFormatted}
                  </h3>
                  {selectedCycleSummary.cycleDay && (
                    <span className="inline-flex mt-1 rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-bold">
                      {t("cycle.cycleDay", { day: selectedCycleSummary.cycleDay })}
                    </span>
                  )}
                </div>

                {selectedDate === today && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                    {t("cycle.legendToday")}
                  </span>
                )}
              </div>

              {/* Logged Entry Details */}
              {selectedLog ? (
                <div className="flex flex-col gap-4 text-sm">
                  {/* Flow */}
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                    <span className="text-muted-foreground font-semibold">
                      {t("logSummary.flow")}:
                    </span>
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      {selectedLog.flow !== "none" ? (
                        <Droplets
                          className={`size-4 ${
                            selectedLog.flow === "veryHeavy" ? "text-destructive" : "text-accent"
                          }`}
                        />
                      ) : (
                        <Ban className="size-4 text-muted-foreground" />
                      )}
                      {t(`log.flow.${selectedLog.flow}`)}
                    </span>
                  </div>

                  {/* Pain */}
                  <div className="flex flex-col gap-1.5 rounded-xl bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">
                        {t("logSummary.pain")}:
                      </span>
                      <span className="font-bold text-foreground">
                        {selectedLog.painLevel > 0
                          ? `${t("log.painLevel")}: ${selectedLog.painLevel}/5`
                          : t("log.noPain")}
                      </span>
                    </div>

                    {selectedLog.painAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedLog.painAreas.map((area) => {
                          const Icon = areaIcons[area as keyof typeof areaIcons] || CircleDot;
                          return (
                            <span
                              key={area}
                              className="inline-flex items-center gap-1 rounded-lg bg-card border border-border/70 px-2 py-0.5 text-xs font-semibold text-foreground"
                            >
                              <Icon className="size-3 text-primary" />
                              {t(`log.area.${area}`)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Mood, Energy, Sleep */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        {t("log.mood")}
                      </span>
                      <span className="font-bold text-xs text-foreground mt-0.5 block">
                        {t(`log.${["low", "ok", "good"][selectedLog.mood - 1]}`)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        {t("log.energy")}
                      </span>
                      <span className="font-bold text-xs text-foreground mt-0.5 block">
                        {t(`log.${["low", "ok", "good"][selectedLog.energy - 1]}`)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        {t("log.sleep")}
                      </span>
                      <span className="font-bold text-xs text-foreground mt-0.5 block">
                        {t(`log.${["low", "ok", "good"][selectedLog.sleep - 1]}`)}
                      </span>
                    </div>
                  </div>

                  {/* Symptoms */}
                  {selectedLog.symptoms.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("log.symQ")}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedLog.symptoms.map((s) => {
                          const Icon = symptomIcons[s as keyof typeof symptomIcons] || Sparkles;
                          return (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary"
                            >
                              <Icon className="size-3.5" />
                              {t(`log.sym.${s}`)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Personal Note */}
                  {selectedLog.notes && (
                    <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 p-3">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-primary" />
                        {t("cycle.notes")}
                      </span>
                      <p className="text-xs text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
                        "{selectedLog.notes}"
                      </p>
                    </div>
                  )}

                  {/* Actions: Edit & Delete */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/50">
                    <Link
                      to="/log"
                      search={{ date: selectedDate }}
                      className="tap flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Edit3 className="size-3.5" />
                      {t("cycle.editEntry")}
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="tap flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-card py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      {t("cycle.deleteEntry")}
                    </button>
                  </div>
                </div>
              ) : (
                /* No entry logged for this day */
                <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{t("cycle.noEntry")}</p>

                  {selectedDate <= today ? (
                    <Link
                      to="/log"
                      search={{ date: selectedDate }}
                      className="tap inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/95 transition-all"
                    >
                      <Plus className="size-4" />
                      {t("cycle.addEntry")}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      {t("cycle.futureDateNotice")}
                    </span>
                  )}
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {deleteConfirmOpen && (
                <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4 animate-in fade-in">
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    {t("cycle.deleteConfirm")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="tap rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground"
                    >
                      {t("settings.no")}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteEntry}
                      className="tap rounded-xl bg-destructive py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("settings.yes")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
