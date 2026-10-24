import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Printer,
  Calendar,
  AlertTriangle,
  Pill,
  HelpCircle,
  FileText,
  Activity,
  Heart,
  User as UserIcon,
} from "lucide-react";
import { authService, type User } from "@/services/auth";
import { logService, todayISO, type DailyLog } from "@/services/logs";
import {
  cycleSummary,
  cycleLengths,
  periodStarts,
  patternFlags,
  type FlagId,
} from "@/services/cycle";
import { medicineService, type Medicine } from "@/services/medicines";
import { visitService, type Visit } from "@/services/visits";
import { questionService } from "@/services/questions";

export const Route = createFileRoute("/care/summary")({
  head: () => ({
    meta: [
      { title: "Doctor Summary — Sakhi" },
      {
        name: "description",
        content: "One-page medical record summary for your doctor visit.",
      },
      { property: "og:title", content: "Doctor Summary — Sakhi" },
      {
        property: "og:description",
        content: "One-page medical record summary for your doctor visit.",
      },
    ],
  }),
  component: DoctorSummaryPage,
});

function DoctorSummaryPage() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [logs90, setLogs90] = useState<DailyLog[]>([]);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [flags, setFlags] = useState<FlagId[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [tickedQuestions, setTickedQuestions] = useState<
    { id: string; text: string; category: string }[]
  >([]);

  const today = todayISO();

  const formatDate = (iso: string) => {
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString((i18n.language || "en") + "-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    setUser(authService.current());
    const logs = logService.all();
    setAllLogs(logs);

    // Filter last 90 days
    const recent = logs.filter((l) => {
      const diff = Math.round(
        (new Date(today + "T00:00:00Z").getTime() - new Date(l.date + "T00:00:00Z").getTime()) /
          86400000,
      );
      return diff >= 0 && diff <= 90;
    });
    setLogs90(recent);

    setFlags(patternFlags(logs, today));
    setMedicines(medicineService.all());
    setRecentVisits(visitService.all().slice(0, 3));
    setTickedQuestions(
      questionService.getSelectedQuestions(logs, today, (key, fallback) => t(key, fallback)),
    );
  }, [t, today]);

  const handlePrint = () => {
    window.print();
  };

  // Cycle statistics
  const summary = cycleSummary(allLogs, today);
  const lengths = cycleLengths(allLogs);
  const starts = periodStarts(logs90);

  // Flow and pain counts in last 90 days
  const bleedingDays = logs90.filter((l) => l.flow !== "none");
  const heavyBleedingDays = logs90.filter(
    (l) => l.flow === "heavy" || l.flow === "veryHeavy" || l.symptoms.includes("heavyBleeding"),
  );
  const severePainDays = logs90.filter((l) => l.painLevel >= 4);

  const painAreasReported = Array.from(new Set(logs90.flatMap((l) => l.painAreas).filter(Boolean)));
  const symptomsReported = Array.from(new Set(logs90.flatMap((l) => l.symptoms).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Print stylesheet to fit exactly one A4 page */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #111827 !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-container {
            padding: 0 !important;
            max-width: 100% !important;
            max-height: 275mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-card {
            border: 1px solid #d1d5db !important;
            padding: 6px 8px !important;
            margin-bottom: 6px !important;
            page-break-inside: avoid !important;
            border-radius: 6px !important;
            background: #ffffff !important;
          }
          .print-grid {
            display: grid !important;
          }
          h1 {
            font-size: 16px !important;
            margin: 0 !important;
          }
          h2 {
            font-size: 12px !important;
            margin: 0 0 4px 0 !important;
          }
          p, span, li {
            font-size: 10.5px !important;
          }
          .text-xs {
            font-size: 9.5px !important;
          }
        }
      `}</style>

      {/* Screen action bar */}
      <div className="no-print border-b border-border bg-card p-4 sticky top-0 z-20 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link
            to="/care"
            aria-label={t("summary.back")}
            className="tap grid size-10 place-items-center rounded-2xl bg-secondary text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/care/questions"
              className="tap rounded-2xl border-2 border-border px-3 py-2 text-xs font-bold text-foreground"
            >
              {t("questions.title")}
            </Link>
            <button
              onClick={handlePrint}
              className="tap flex items-center gap-2 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm"
            >
              <Printer className="size-4" />
              {t("summary.downloadPdf")}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <main className="page-container mx-auto max-w-2xl p-4 sm:p-6">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm print-card print:border-none print:p-0">
          {/* Header */}
          <header className="border-b border-border pb-3 mb-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Heart className="size-5 text-primary print:text-black" />
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Sakhi Health Summary
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t("summary.subtitle")}</p>
            </div>

            <div className="text-right text-xs">
              <div className="flex items-center justify-end gap-1 font-bold text-foreground">
                <UserIcon className="size-3.5" />
                <span>{user?.name || "Patient"}</span>
              </div>
              <p className="text-muted-foreground mt-0.5">
                {t("summary.dateGenerated")}: {formatDate(today)}
              </p>
            </div>
          </header>

          {/* 90-Day Cycle & Symptom Summary */}
          <section className="print-card mb-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Calendar className="size-4 text-primary print:text-black" />
              {t("summary.timelineTitle")}
            </h2>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {/* Cycle Overview */}
              <div className="rounded-xl bg-card p-2.5 border border-border/60">
                <p className="font-bold text-foreground uppercase tracking-wide text-[10px] text-muted-foreground">
                  {t("summary.cycleOverview")}
                </p>
                {summary.avgLength ? (
                  <div className="mt-1">
                    <p className="font-bold text-sm">
                      {t("summary.avgCycle", { days: summary.avgLength })}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {lengths.length > 1
                        ? `Recent cycle lengths: ${lengths.slice(-3).join(", ")} days`
                        : `${starts.length} period starts recorded in 90 days`}
                    </p>
                    {summary.irregular && (
                      <p className="font-semibold text-amber-700 mt-0.5">
                        ⚠️ {t("summary.irregularCycleNotice")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1">{t("summary.noCycleData")}</p>
                )}
                {summary.lastStart && (
                  <p className="mt-1 text-muted-foreground">
                    {t("summary.lastPeriod", { date: formatDate(summary.lastStart) })}
                  </p>
                )}
              </div>

              {/* Flow & Pain Highlights */}
              <div className="rounded-xl bg-card p-2.5 border border-border/60">
                <p className="font-bold text-foreground uppercase tracking-wide text-[10px] text-muted-foreground">
                  {t("summary.flowHighlights")} & {t("summary.painHighlights")}
                </p>
                <div className="mt-1 flex flex-col gap-0.5">
                  <p>
                    • {t("summary.totalBleedDays", { count: bleedingDays.length })}
                    {heavyBleedingDays.length > 0 && (
                      <span className="font-semibold text-primary ml-1">
                        ({t("summary.heavyDays", { count: heavyBleedingDays.length })})
                      </span>
                    )}
                  </p>
                  <p>
                    • {t("summary.severePainDays", { count: severePainDays.length })}
                    {painAreasReported.length > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({painAreasReported.slice(0, 3).join(", ")})
                      </span>
                    )}
                  </p>
                  {symptomsReported.length > 0 && (
                    <p className="text-muted-foreground mt-0.5">
                      Symptoms: {symptomsReported.slice(0, 4).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Pattern Flags: Worded as "Worth discussing with a doctor" */}
          <section className="print-card mb-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <AlertTriangle className="size-4 text-amber-600 print:text-black" />
              {t("summary.flagsTitle")}
            </h2>

            {flags.length > 0 ? (
              <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                {flags.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-700 print:text-black">•</span>
                    <span className="font-semibold">{t(`flags.${f}`)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{t("summary.noFlags")}</p>
            )}
          </section>

          {/* Current Medicines & Recent Visits Grid */}
          <div className="print-card mb-3 grid grid-cols-2 gap-3">
            {/* Current Medicines */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
              <h2 className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Pill className="size-3.5 text-accent print:text-black" />
                {t("summary.medicinesTitle")}
              </h2>
              {medicines.length > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                  {medicines.map((m) => (
                    <li key={m.id} className="border-b border-border/40 pb-1 last:border-0">
                      <span className="font-bold">{m.name}</span> ({m.dose}) —{" "}
                      <span className="text-muted-foreground">{m.timings.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{t("summary.noMedicines")}</p>
              )}
            </div>

            {/* Recent Visits */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
              <h2 className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Activity className="size-3.5 text-primary print:text-black" />
                {t("summary.recentVisitsTitle")}
              </h2>
              {recentVisits.length > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                  {recentVisits.map((v) => (
                    <li key={v.id} className="border-b border-border/40 pb-1 last:border-0">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{formatDate(v.date)}</span>
                        <span className="font-semibold">{v.reason}</span>
                      </div>
                      <p className="font-bold">{v.doctorOrClinic}</p>
                      {v.notes && <p className="text-[10px] text-muted-foreground">{v.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{t("summary.noVisits")}</p>
              )}
            </div>
          </div>

          {/* Ticked Questions to Bring */}
          <section className="print-card mb-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <HelpCircle className="size-4 text-primary print:text-black" />
              {t("summary.tickedQuestionsTitle")}
            </h2>

            {tickedQuestions.length > 0 ? (
              <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                {tickedQuestions.map((q) => (
                  <li key={q.id} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-block size-3 rounded border border-foreground print:border-black" />
                    <span className="font-medium text-foreground">{q.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("summary.noQuestions")}</p>
                <Link
                  to="/care/questions"
                  className="no-print text-xs font-bold text-primary hover:underline"
                >
                  + {t("questions.title")}
                </Link>
              </div>
            )}
          </section>

          {/* Disclaimer Footer */}
          <footer className="border-t border-border pt-2.5 text-center text-[10px] text-muted-foreground leading-snug">
            <p>{t("summary.disclaimer")}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
