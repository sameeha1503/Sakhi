import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PenLine,
  Pill,
  HeartPulse,
  CalendarHeart,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FlagCards } from "@/components/FlagCards";
import { authService } from "@/services/auth";
import { logService, todayISO } from "@/services/logs";
import { cycleSummary, patternFlags, type FlagId } from "@/services/cycle";
import { visitService, type Visit } from "@/services/visits";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Sakhi" },
      { name: "description", content: "Your Sakhi health dashboard." },
      { property: "og:title", content: "Home — Sakhi" },
      { property: "og:description", content: "Your Sakhi health dashboard." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [cycleDay, setCycleDay] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [flags, setFlags] = useState<FlagId[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<
    { visit: Visit; daysRemaining: number }[]
  >([]);

  useEffect(() => {
    setName(authService.current()?.name ?? "");
    const logs = logService.all(),
      today = todayISO();
    setCycleDay(cycleSummary(logs, today).cycleDay);
    setDone(!!logService.get(today));
    setFlags(patternFlags(logs, today));
    setUpcomingFollowUps(visitService.getUpcomingFollowUps(today, 3));
  }, []);

  return (
    <AppShell>
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t("home.hello", { name })}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">{t("home.today")}</p>
        </div>
        {cycleDay && (
          <div className="inline-flex items-center gap-3 rounded-2xl bg-secondary px-4 py-2 border border-border/60">
            <CalendarHeart className="size-5 text-primary shrink-0" />
            <span className="text-sm font-semibold text-muted-foreground">{t("cycle.day")}:</span>
            <span className="text-xl font-bold text-primary">{cycleDay}</span>
          </div>
        )}
      </div>

      {/* Upcoming Visit Banner */}
      {upcomingFollowUps[0] && (
        <Link
          to="/care/visits"
          className="tap card-soft mt-5 flex items-center gap-4 border-2 border-primary/40 bg-secondary/80 p-4 transition-transform hover:scale-[1.01]"
        >
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
            <Clock className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("visits.upcomingBadge")}
            </p>
            <p className="font-bold text-foreground truncate text-base sm:text-lg">
              {upcomingFollowUps[0].daysRemaining === 0
                ? t("visits.homeBannerToday", { doctor: upcomingFollowUps[0].visit.doctorOrClinic })
                : t("visits.homeBanner", {
                    doctor: upcomingFollowUps[0].visit.doctorOrClinic,
                    days: upcomingFollowUps[0].daysRemaining,
                  })}
            </p>
          </div>
        </Link>
      )}

      {/* Responsive Grid of Cards (2-3 columns on desktop) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Daily Check-in Card */}
        <Link
          to="/log"
          className={`tap card-soft flex flex-col justify-between p-6 border-2 transition-all hover:-translate-y-0.5 ${
            done
              ? "border-primary/40 bg-card hover:border-primary"
              : "border-primary bg-primary text-primary-foreground shadow-md hover:bg-primary/95"
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`grid size-14 place-items-center rounded-2xl ${
                done ? "bg-primary/10 text-primary" : "bg-white/20 text-white"
              }`}
            >
              {done ? <CheckCircle2 className="size-8" /> : <PenLine className="size-8" />}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                done ? "bg-success/15 text-success" : "bg-white/25 text-white"
              }`}
            >
              {done ? "Completed" : "Daily"}
            </span>
          </div>

          <div className="mt-6">
            <h2
              className={`text-2xl font-bold ${
                done ? "text-foreground" : "text-primary-foreground"
              }`}
            >
              {t("home.checkin")}
            </h2>
            <p
              className={`mt-1 text-sm ${
                done ? "text-muted-foreground" : "text-primary-foreground/90"
              }`}
            >
              {done ? t("log.already") : "Log symptoms, bleeding and mood in 30 seconds."}
            </p>
          </div>
        </Link>

        {/* Cycle Overview Card */}
        <Link
          to="/cycle"
          className="tap card-soft flex flex-col justify-between p-6 border border-border/80 transition-all hover:-translate-y-0.5 hover:border-primary/50"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CalendarHeart className="size-8" />
            </div>
            {cycleDay && (
              <span className="rounded-2xl bg-secondary px-3.5 py-1 text-lg font-bold text-foreground border border-border/50">
                Day {cycleDay}
              </span>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("cycle.see")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("cycle.title")}</p>
          </div>
        </Link>

        {/* Medicines & Reminders Card */}
        <Link
          to="/medicines"
          className="tap card-soft flex flex-col justify-between p-6 border border-border/80 transition-all hover:-translate-y-0.5 hover:border-primary/50"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Pill className="size-8" />
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
              Doses
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("nav.medicines")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("medicines.todayDoses")}</p>
          </div>
        </Link>

        {/* Find Care Card */}
        <Link
          to="/care"
          className="tap card-soft flex flex-col justify-between p-6 border border-border/80 transition-all hover:-translate-y-0.5 hover:border-primary/50"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <HeartPulse className="size-8" />
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Nearby
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("nav.care")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("care.hubTitle")}</p>
          </div>
        </Link>

        {/* Learn Card */}
        <Link
          to="/learn"
          className="tap card-soft flex flex-col justify-between p-6 border border-border/80 transition-all hover:-translate-y-0.5 hover:border-primary/50"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent">
              <BookOpen className="size-8" />
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
              Guides
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("learn.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">PCOS & endometriosis explainers</p>
          </div>
        </Link>

        {/* Private Vault Card */}
        <Link
          to="/vault"
          className="tap card-soft flex flex-col justify-between p-6 border border-border/80 transition-all hover:-translate-y-0.5 hover:border-primary/50"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-8" />
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Private
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("vault.lockedTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pin-protected medical documents</p>
          </div>
        </Link>
      </div>

      {/* Pattern Flags */}
      {flags.length > 0 && (
        <div className="mt-6">
          <FlagCards flags={flags} />
        </div>
      )}
    </AppShell>
  );
}
