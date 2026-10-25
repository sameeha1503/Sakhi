import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PenLine,
  Pill,
  HeartPulse,
  CalendarHeart,
  CheckCircle2,
  Clock,
  Lock,
  Stethoscope,
  FileQuestion,
  CalendarDays,
  FileText,
  ShieldAlert,
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

      {/* Responsive Grid of Cards (2 columns from 768px, 1 on phones) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Doctor Visit Wide Module Card (tag: RECORDS) */}
        <div className="card-soft border-2 border-primary/30 bg-card p-6 transition-all hover:border-primary/60 shadow-xs flex flex-col justify-between md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link
              to="/visit"
              search={{ tab: "questions" }}
              className="flex items-center gap-4 group flex-1"
            >
              <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
                <Stethoscope className="size-6 sm:size-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground group-hover:text-primary transition-colors">
                    {t("home.doctorVisitTitle", "Doctor visit")}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    {t("home.tagRecords", "RECORDS")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "home.doctorVisitDesc",
                    "Prepare questions, log clinic visits, and print your doctor summary.",
                  )}
                </p>
              </div>
            </Link>

            {/* Follow-up due badge if within 3 days */}
            {upcomingFollowUps[0] && (
              <Link
                to="/visit"
                search={{ tab: "visits" }}
                className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning border border-warning/30 hover:bg-warning/20 transition-all self-start sm:self-auto shrink-0"
              >
                <Clock className="size-3.5" />
                <span>
                  {upcomingFollowUps[0].daysRemaining === 0
                    ? t("visits.followUpToday", "Follow-up is today!")
                    : upcomingFollowUps[0].daysRemaining === 1
                      ? t("home.followupDueTomorrow", "Follow-up in 1 day")
                      : t("home.followupDueIn", { days: upcomingFollowUps[0].daysRemaining })}
                </span>
              </Link>
            )}
          </div>

          {/* Three Short Steps as Buttons with Icons */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/visit"
              search={{ tab: "questions" }}
              className="tap flex items-center justify-between sm:justify-center gap-2.5 rounded-2xl border-2 border-border bg-card p-3.5 text-xs sm:text-sm font-bold text-foreground hover:border-primary/50 hover:bg-secondary/40 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileQuestion className="size-4 text-primary shrink-0" />
                <span>{t("home.stepQuestions", "1 Prepare questions")}</span>
              </div>
              <span className="text-muted-foreground sm:hidden">&rarr;</span>
            </Link>

            <Link
              to="/visit"
              search={{ tab: "visits" }}
              className="tap flex items-center justify-between sm:justify-center gap-2.5 rounded-2xl border-2 border-border bg-card p-3.5 text-xs sm:text-sm font-bold text-foreground hover:border-primary/50 hover:bg-secondary/40 transition-all"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary shrink-0" />
                <span>{t("home.stepVisits", "2 Log a visit")}</span>
              </div>
              <span className="text-muted-foreground sm:hidden">&rarr;</span>
            </Link>

            <Link
              to="/visit"
              search={{ tab: "summary" }}
              className="tap flex items-center justify-between sm:justify-center gap-2.5 rounded-2xl border-2 border-border bg-card p-3.5 text-xs sm:text-sm font-bold text-foreground hover:border-primary/50 hover:bg-secondary/40 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary shrink-0" />
                <span>{t("home.stepSummary", "3 Doctor summary")}</span>
              </div>
              <span className="text-muted-foreground sm:hidden">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Daily Check-in Card (Teal) */}
        <Link
          to="/log"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-module-teal/30 bg-card transition-all hover:-translate-y-0.5 hover:border-module-teal"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-module-teal/15 text-module-teal">
              {done ? (
                <CheckCircle2 className="size-6 sm:size-7" />
              ) : (
                <PenLine className="size-6 sm:size-7" />
              )}
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                done ? "bg-success/15 text-success" : "bg-module-teal/15 text-module-teal"
              }`}
            >
              {done ? "Completed" : "Daily"}
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {t("home.checkin")}
            </h2>
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
            <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-module-berry/15 text-module-berry">
              <CalendarHeart className="size-6 sm:size-7" />
            </div>
            {cycleDay ? (
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent border border-accent/30">
                Day {cycleDay}
              </span>
            ) : (
              <span className="rounded-full bg-module-berry/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-module-berry">
                Cycle
              </span>
            )}
          </div>

          <div className="mt-5">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {t("cycle.see")}
            </h2>
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
            <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-module-violet/15 text-module-violet">
              <Pill className="size-6 sm:size-7" />
            </div>
            <span className="rounded-full bg-module-violet/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-module-violet">
              Doses
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {t("nav.medicines")}
            </h2>
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
            <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-module-green/15 text-module-green">
              <HeartPulse className="size-6 sm:size-7" />
            </div>
            <span className="rounded-full bg-module-green/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-module-green">
              Nearby
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {t("nav.care")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("care.title", "Find hospitals & PHCs")}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-module-green mt-4 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>
        </Link>

        {/* Government Schemes Card */}
        <Link
          to="/schemes"
          className="group tap card-soft flex flex-col justify-between p-6 border-2 border-accent/30 bg-card transition-all hover:-translate-y-0.5 hover:border-accent"
        >
          <div className="flex items-center justify-between">
            <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-accent/15 text-accent">
              <ShieldAlert className="size-6 sm:size-7" />
            </div>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
              {t("home.tagSchemes", "BENEFITS")}
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {t("home.schemesCardTitle", "Government schemes")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "home.schemesCardDesc",
                "Free hospital cover, screening & maternal cash benefits.",
              )}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-accent mt-4 group-hover:translate-x-1 transition-transform">
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
            <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-module-coral/15 text-module-coral">
              <Lock className="size-6 sm:size-7" />
            </div>
            <span className="rounded-full bg-module-coral/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-module-coral">
              Private
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {t("vault.lockedTitle")}
            </h2>
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
