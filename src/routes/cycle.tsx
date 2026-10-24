import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarHeart, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FlagCards } from "@/components/FlagCards";
import { logService, todayISO, type DailyLog } from "@/services/logs";
import { cycleSummary, patternFlags } from "@/services/cycle";

export const Route = createFileRoute("/cycle")({
  head: () => ({
    meta: [
      { title: "My cycle — Sakhi" },
      {
        name: "description",
        content: "See your cycle day, next period and patterns worth a doctor visit.",
      },
      { property: "og:title", content: "My cycle — Sakhi" },
      {
        property: "og:description",
        content: "See your cycle day, next period and patterns worth a doctor visit.",
      },
    ],
  }),
  component: CyclePage,
});

const flowColor: Record<string, string> = {
  none: "bg-muted/40",
  light: "bg-accent/25 text-foreground",
  medium: "bg-accent/60 text-accent-foreground",
  heavy: "bg-accent text-accent-foreground",
  veryHeavy: "bg-destructive text-destructive-foreground",
};

function CyclePage() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<DailyLog[] | null>(null);
  useEffect(() => setLogs(logService.all()), []);
  if (!logs)
    return (
      <AppShell>
        <div />
      </AppShell>
    );

  const today = todayISO();
  const s = cycleSummary(logs, today);
  const flags = patternFlags(logs, today);
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(i18n.language + "-IN", {
      day: "numeric",
      month: "short",
    });
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const strip = Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 34 + i);
    return todayISO(d);
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link
          to="/home"
          className="tap inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-primary hover:opacity-85"
        >
          <ArrowLeft className="size-5" /> {t("settings.back")}
        </Link>
      </div>

      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {t("cycle.title")}
      </h1>

      {/* Two columns on desktop (summary on left, 35-day strip & flags on right) */}
      <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column (lg:col-span-5): Cycle Day & Summary */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {s.cycleDay ? (
            <div className="card-soft border border-border/80 p-6 flex flex-col items-center sm:items-start gap-5">
              <div className="flex items-center gap-5 w-full">
                <div className="grid size-24 shrink-0 place-items-center rounded-3xl bg-accent text-accent-foreground shadow-md">
                  <span className="text-4xl font-extrabold">{s.cycleDay}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t("cycle.day")}
                  </p>
                  {s.nextPeriod && (
                    <p className="text-lg font-semibold text-foreground mt-1">
                      {t("cycle.next")}{" "}
                      <span className="font-bold text-primary">{fmt(s.nextPeriod)}</span>
                    </p>
                  )}
                  {s.avgLength && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t("cycle.avg")}:{" "}
                      <span className="font-semibold text-foreground">
                        {t("cycle.days", { n: s.avgLength })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {s.avgLength && (
                <div
                  className={`w-full rounded-2xl p-3 text-center text-sm sm:text-base font-bold ${
                    s.irregular
                      ? "bg-secondary text-secondary-foreground border border-border/60"
                      : "bg-success/15 text-success border border-success/30"
                  }`}
                >
                  {t(s.irregular ? "cycle.irregular" : "cycle.regular")}
                </div>
              )}
            </div>
          ) : (
            <div className="card-soft border border-border/80 flex items-center gap-4 p-6">
              <CalendarHeart className="size-12 shrink-0 text-primary" />
              <p className="text-base font-semibold text-muted-foreground">{t("cycle.noData")}</p>
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-7): Wider 5-row 35-day Calendar Grid & Flags */}
        <div className="lg:col-span-7 flex flex-col gap-6 mt-6 lg:mt-0">
          <section className="card-soft border border-border/80 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">{t("cycle.last35")}</h2>
              <span className="text-xs font-semibold text-muted-foreground">5 rows × 7 days</span>
            </div>

            {/* 5-row wider calendar grid (7 columns) */}
            <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
              {strip.map((d) => {
                const l = byDate.get(d);
                const dayNum = parseInt(d.slice(8), 10);
                const isToday = d === today;
                return (
                  <div
                    key={d}
                    title={d}
                    className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center transition-transform hover:scale-105 ${
                      l ? flowColor[l.flow] : "bg-muted/40"
                    } ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        l && l.flow === "veryHeavy"
                          ? "text-destructive-foreground"
                          : l && (l.flow === "heavy" || l.flow === "medium")
                            ? "text-accent-foreground"
                            : "text-foreground/85"
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Flow Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-muted/60 border border-border" />
                <span>{t("log.flow.none")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-accent/25 border border-accent/40" />
                <span>{t("log.flow.light")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-accent/60" />
                <span>{t("log.flow.medium")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-accent" />
                <span>{t("log.flow.heavy")}</span>
              </div>
            </div>
          </section>

          {/* Pattern Flags */}
          {flags.length > 0 && (
            <div>
              <FlagCards flags={flags} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
