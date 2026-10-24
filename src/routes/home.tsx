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
        {/* Daily Check-in Card (Teal) */}
        <Link
          to="/log"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-module-teal/30 bg-card transition-all hover:-translate-y-0.5 hover:border-module-teal"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-module-teal/15 text-module-teal">
              {done ? <CheckCircle2 className="size-8" /> : <PenLine className="size-8" />}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                done ? "bg-success/15 text-success" : "bg-module-teal/15 text-module-teal"
              }`}
            >
              {done ? "Completed" : "Daily"}
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("home.checkin")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {done ? t("log.already") : "Log symptoms, bleeding and mood in 30 seconds."}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-module-teal mt-4 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>
        </Link>

        {/* Cycle Overview Card (Berry) */}
        <Link
          to="/cycle"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-module-berry/30 bg-card transition-all hover:-translate-y-0.5 hover:border-module-berry"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-module-berry/15 text-module-berry">
              <CalendarHeart className="size-8" />
            </div>
            {cycleDay && (
              <span className="rounded-2xl bg-accent/15 px-3.5 py-1 text-lg font-bold text-accent border border-accent/30">
                Day {cycleDay}
              </span>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("cycle.see")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("cycle.title")}</p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-module-berry mt-4 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>
        </Link>

        {/* Medicines & Reminders Card (Violet) */}
        <Link
          to="/medicines"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-module-violet/30 bg-card transition-all hover:-translate-y-0.5 hover:border-module-violet"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-module-violet/15 text-module-violet">
              <Pill className="size-8" />
            </div>
            <span className="rounded-full bg-module-violet/15 px-3 py-1 text-xs font-bold text-module-violet">
              Doses
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("nav.medicines")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("medicines.todayDoses")}</p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-module-violet mt-4 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>
        </Link>

        {/* Find Care Card (Green) */}
        <Link
          to="/care"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-module-green/30 bg-card transition-all hover:-translate-y-0.5 hover:border-module-green"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-module-green/15 text-module-green">
              <HeartPulse className="size-8" />
            </div>
            <span className="rounded-full bg-module-green/15 px-3 py-1 text-xs font-bold text-module-green">
              Nearby
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("nav.care")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("care.hubTitle")}</p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-module-green mt-4 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>
        </Link>

        {/* Learn Card (Amber) */}
        <Link
          to="/learn"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-module-amber/30 bg-card transition-all hover:-translate-y-0.5 hover:border-module-amber"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-module-amber/15 text-module-amber">
              <BookOpen className="size-8" />
            </div>
            <span className="rounded-full bg-module-amber/15 px-3 py-1 text-xs font-bold text-module-amber">
              Guides
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("learn.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">PCOS & endometriosis explainers</p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-module-amber mt-4 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>
        </Link>

        {/* Private Vault Card (Coral) */}
        <Link
          to="/vault"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-module-coral/30 bg-card transition-all hover:-translate-y-0.5 hover:border-module-coral"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-module-coral/15 text-module-coral">
              <Lock className="size-8" />
            </div>
            <span className="rounded-full bg-module-coral/15 px-3 py-1 text-xs font-bold text-module-coral">
              Private
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-foreground">{t("vault.lockedTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pin-protected medical documents</p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-module-coral mt-4 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
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
