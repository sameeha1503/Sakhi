import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useId } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  FileQuestion,
  FileText,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Check,
  CheckCircle2,
  Circle,
  HelpCircle,
  AlertTriangle,
  Activity,
  Pill,
  X,
  Stethoscope,
  ShieldAlert,
  Info,
  QrCode,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
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
import {
  questionService,
  generateSuggestedQuestions,
  type SuggestedQuestion,
  type CustomQuestion,
  type QuestionCategory,
} from "@/services/questions";

const visitSearchSchema = z.object({
  tab: z.enum(["questions", "visits", "summary"]).catch("questions").default("questions"),
});

export type VisitSearch = z.infer<typeof visitSearchSchema>;

export const Route = createFileRoute("/visit")({
  validateSearch: (search: Record<string, unknown>): VisitSearch => visitSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Doctor Visit — Sakhi" },
      {
        name: "description",
        content: "Prepare questions, log clinic visits, and print your doctor summary.",
      },
      { property: "og:title", content: "Doctor Visit — Sakhi" },
      {
        property: "og:description",
        content: "Prepare questions, log clinic visits, and print your doctor summary.",
      },
    ],
  }),
  component: VisitPage,
});

function getCategoryIcon(cat: QuestionCategory) {
  switch (cat) {
    case "flag":
      return <AlertTriangle className="size-4 shrink-0 text-warning" />;
    case "symptom":
      return <Activity className="size-4 shrink-0 text-primary" />;
    case "medicine":
      return <Pill className="size-4 shrink-0 text-accent" />;
    case "custom":
      return <HelpCircle className="size-4 shrink-0 text-primary" />;
    default:
      return <HelpCircle className="size-4 shrink-0 text-muted-foreground" />;
  }
}

function VisitPage() {
  const { t, i18n } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const currentTab = search.tab || "questions";

  // Data states
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [logs90, setLogs90] = useState<DailyLog[]>([]);
  const [flags, setFlags] = useState<FlagId[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // Questions tab states
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [tickedIds, setTickedIds] = useState<Set<string>>(new Set());
  const [newQuestionText, setNewQuestionText] = useState("");

  // Visits tab states
  const [visits, setVisits] = useState<Visit[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<
    { visit: Visit; daysRemaining: number }[]
  >([]);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  // Visit Form inputs
  const [visitDate, setVisitDate] = useState(todayISO());
  const [doctorOrClinic, setDoctorOrClinic] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [customMed, setCustomMed] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [availableMeds, setAvailableMeds] = useState<string[]>([]);

  const today = todayISO();
  const inputId = useId();

  const formatDate = (iso?: string) => {
    if (!iso) return "";
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
    const curUser = authService.current();
    setUser(curUser);

    const allLogs = logService.all();
    setLogs(allLogs);

    const recent = allLogs.filter((l) => {
      const diff = Math.round(
        (new Date(today + "T00:00:00Z").getTime() - new Date(l.date + "T00:00:00Z").getTime()) /
          86400000,
      );
      return diff >= 0 && diff <= 90;
    });
    setLogs90(recent);

    const activeFlags = patternFlags(allLogs, today);
    setFlags(activeFlags);

    const allMeds = medicineService.all();
    setMedicines(allMeds);
    setAvailableMeds(allMeds.map((m) => m.name));

    // Questions
    const sugg = generateSuggestedQuestions(allLogs, today);
    setSuggestedQuestions(sugg);
    setCustomQuestions(questionService.getCustomQuestions());

    const savedTicks = questionService.getTickedIds();
    if (savedTicks.length === 0) {
      const initialTicks: string[] = [];
      for (const q of sugg) {
        if (q.category === "flag" || q.id === "q_general_tests") {
          initialTicks.push(q.id);
          questionService.setTicked(q.id, true);
        }
      }
      setTickedIds(new Set(initialTicks));
    } else {
      setTickedIds(new Set(savedTicks));
    }

    // Visits
    const allVisits = visitService.all();
    setVisits(allVisits);
    setUpcomingFollowUps(visitService.getUpcomingFollowUps(today, 3));
  }, [today]);

  const setTab = (tab: "questions" | "visits" | "summary") => {
    navigate({ to: "/visit", search: { tab }, replace: true });
  };

  // Question toggling
  const handleToggleQuestion = (id: string) => {
    const nextState = questionService.toggleTicked(id);
    setTickedIds((prev) => {
      const next = new Set(prev);
      if (nextState) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    try {
      const created = questionService.addCustomQuestion(newQuestionText);
      setCustomQuestions(questionService.getCustomQuestions());
      setTickedIds((prev) => new Set([...prev, created.id]));
      setNewQuestionText("");
    } catch {
      // ignore empty error
    }
  };

  const handleDeleteCustomQuestion = (id: string) => {
    questionService.deleteCustomQuestion(id);
    setCustomQuestions(questionService.getCustomQuestions());
    setTickedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Visit Management
  const openNewVisitForm = () => {
    setEditingVisitId(null);
    setVisitDate(todayISO());
    setDoctorOrClinic("");
    setReason("");
    setNotes("");
    setSelectedMeds([]);
    setCustomMed("");
    setNextFollowUpDate("");
    setShowVisitForm(true);
  };

  const openEditVisitForm = (visit: Visit) => {
    setEditingVisitId(visit.id);
    setVisitDate(visit.date);
    setDoctorOrClinic(visit.doctorOrClinic);
    setReason(visit.reason);
    setNotes(visit.notes || "");
    setSelectedMeds(visit.linkedMedicines || []);
    setCustomMed("");
    setNextFollowUpDate(visit.nextFollowUpDate || "");
    setShowVisitForm(true);
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorOrClinic.trim() || !reason.trim()) return;

    if (editingVisitId) {
      visitService.update({
        id: editingVisitId,
        date: visitDate,
        doctorOrClinic,
        reason,
        notes,
        linkedMedicines: selectedMeds,
        nextFollowUpDate: nextFollowUpDate || undefined,
        createdAt: new Date().toISOString(),
      });
    } else {
      visitService.add({
        date: visitDate,
        doctorOrClinic,
        reason,
        notes,
        linkedMedicines: selectedMeds,
        nextFollowUpDate: nextFollowUpDate || undefined,
      });
    }

    setShowVisitForm(false);
    setVisits(visitService.all());
    setUpcomingFollowUps(visitService.getUpcomingFollowUps(today, 3));
  };

  const handleDeleteVisit = (id: string) => {
    if (confirm(t("visits.deleteConfirm"))) {
      visitService.delete(id);
      setVisits(visitService.all());
      setUpcomingFollowUps(visitService.getUpcomingFollowUps(today, 3));
    }
  };

  const toggleMed = (med: string) => {
    setSelectedMeds((prev) =>
      prev.includes(med) ? prev.filter((m) => m !== med) : [...prev, med],
    );
  };

  const addCustomMed = () => {
    const trimmed = customMed.trim();
    if (trimmed && !selectedMeds.includes(trimmed)) {
      setSelectedMeds((prev) => [...prev, trimmed]);
      if (!availableMeds.includes(trimmed)) {
        setAvailableMeds((prev) => [...prev, trimmed]);
      }
      setCustomMed("");
    }
  };

  // Summary statistics
  const summary = cycleSummary(logs, today);
  const lengths = cycleLengths(logs);
  const starts = periodStarts(logs90);
  const bleedingDays = logs90.filter((l) => l.flow !== "none");
  const heavyBleedingDays = logs90.filter(
    (l) => l.flow === "heavy" || l.flow === "veryHeavy" || l.symptoms.includes("heavyBleeding"),
  );
  const severePainDays = logs90.filter((l) => (l.painLevel ?? 0) >= 4);
  const painAreasReported = Array.from(new Set(logs90.flatMap((l) => l.painAreas).filter(Boolean)));
  const symptomsReported = Array.from(new Set(logs90.flatMap((l) => l.symptoms).filter(Boolean)));
  const selectedQuestions = questionService.getSelectedQuestions(logs, today, (key, fallback) =>
    t(key, fallback),
  );

  return (
    <AppShell>
      {/* Print stylesheet to fit exactly one A4 page when printing summary */}
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
          .no-print, header, nav, .bottom-bar, [data-sidebar], footer {
            display: none !important;
          }
          .printable-summary {
            display: block !important;
            padding: 0 !important;
            max-width: 100% !important;
            max-height: 275mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            background: #ffffff !important;
          }
          .print-card {
            border: 1px solid #d1d5db !important;
            padding: 6px 8px !important;
            margin-bottom: 6px !important;
            page-break-inside: avoid !important;
            border-radius: 6px !important;
            background: #ffffff !important;
          }
          h1 {
            font-size: 16px !important;
            margin: 0 !important;
            color: #111827 !important;
          }
          h2 {
            font-size: 12px !important;
            margin: 0 0 4px 0 !important;
            color: #111827 !important;
          }
          p, span, li {
            font-size: 10.5px !important;
            color: #1f2937 !important;
          }
          .text-xs {
            font-size: 9.5px !important;
          }
        }
      `}</style>

      <div className="flex flex-col gap-5 pb-8 pt-2">
        {/* Top Header */}
        <div className="no-print flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{t("visit.title", "Doctor visit")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("visit.subtitle", "Prepare questions, log visits, and doctor summary.")}
            </p>
          </div>

          {currentTab === "summary" && (
            <button
              type="button"
              onClick={() => window.print()}
              className="tap flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Printer className="size-4" />
              <span>{t("summary.downloadPdf", "Download / Print PDF")}</span>
            </button>
          )}
        </div>

        {/* Pill-Style Tab Bar */}
        <nav
          aria-label="Doctor visit sections"
          className="no-print flex items-center gap-2 rounded-2xl bg-muted/60 p-1.5 border border-border/60 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setTab("questions")}
            className={`tap flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all ${
              currentTab === "questions"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <FileQuestion className="size-4" />
            <span>{t("visit.tabs.questions", "Prepare questions")}</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("visits")}
            className={`tap flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all ${
              currentTab === "visits"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <CalendarDays className="size-4" />
            <span>{t("visit.tabs.visits", "Log a visit")}</span>
            {upcomingFollowUps.length > 0 && (
              <span className="size-2 rounded-full bg-warning animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("summary")}
            className={`tap flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all ${
              currentTab === "summary"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <FileText className="size-4" />
            <span>{t("visit.tabs.summary", "Doctor summary")}</span>
          </button>
        </nav>

        {/* Non-Diagnostic Safety Notice */}
        <div className="no-print flex items-center gap-2 rounded-2xl border border-border/80 bg-muted/30 px-3.5 py-2 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 text-primary" />
          <p className="leading-snug">
            {t(
              "visit.nonDiagnosticNotice",
              "Sakhi shares patterns and questions only. It does not diagnose.",
            )}
          </p>
        </div>

        {/* TAB 1: QUESTIONS */}
        {currentTab === "questions" && (
          <div className="flex flex-col gap-5">
            {/* Ticked Summary Card */}
            <div className="card-soft flex items-center justify-between p-4 border border-border/80">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {t("questions.bringWithYou")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("questions.tickedCount", { count: tickedIds.size })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab("summary")}
                className="tap flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <span>{t("questions.goToSummary", "View Doctor Summary")}</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* Suggested Questions based on Logs and Flags */}
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {t("questions.suggestedTitle", "Suggested questions")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    "questions.suggestedIntro",
                    "These are based on your logged cycles, symptoms and medicines.",
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {suggestedQuestions.map((q) => {
                  const isTicked = tickedIds.has(q.id);
                  const text = q.i18nKey
                    ? t(q.i18nKey, { defaultValue: q.defaultText })
                    : q.defaultText;
                  const whyText = q.whyI18nKey
                    ? t(q.whyI18nKey, { defaultValue: q.whyDefaultText ?? "" })
                    : q.whyDefaultText;

                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuestion(q.id)}
                      className={`tap card-soft border-2 p-4 transition-all flex flex-col gap-2 cursor-pointer ${
                        isTicked
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/80 bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          aria-label={isTicked ? "Untick question" : "Tick question"}
                          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 border-primary transition-all bg-card"
                        >
                          {isTicked && <Check className="size-4 text-primary font-bold" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(q.category)}
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              {t(`questions.categories.${q.category}`, q.category)}
                            </span>
                          </div>
                          <p className="font-semibold text-sm text-foreground leading-snug">
                            {text}
                          </p>
                          {whyText && (
                            <p className="mt-1 text-xs text-muted-foreground/90 italic">
                              <span className="font-semibold text-primary/90">
                                {t("questions.whyLabel", "Why this question:")}{" "}
                              </span>
                              {whyText}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Custom Questions Section */}
            <section className="flex flex-col gap-3 pt-3 border-t border-border/60">
              <h2 className="text-lg font-bold text-foreground">
                {t("questions.customQuestionsTitle", "Your custom questions")}
              </h2>

              {/* Add Custom Question Form */}
              <form onSubmit={handleAddCustomQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder={t(
                    "questions.addCustomPlaceholder",
                    "e.g. Can I take this medicine while fasting?",
                  )}
                  className="flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newQuestionText.trim()}
                  className="tap flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  <span>{t("questions.addCustomBtn", "Add question")}</span>
                </button>
              </form>

              {customQuestions.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {customQuestions.map((c) => {
                    const isTicked = tickedIds.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`card-soft border-2 p-3.5 transition-all flex items-center justify-between gap-3 ${
                          isTicked ? "border-primary bg-primary/5" : "border-border/80 bg-card"
                        }`}
                      >
                        <div
                          onClick={() => handleToggleQuestion(c.id)}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <div className="grid size-6 shrink-0 place-items-center rounded-lg border-2 border-primary bg-card">
                            {isTicked && <Check className="size-4 text-primary font-bold" />}
                          </div>
                          <p className="font-semibold text-sm text-foreground">{c.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomQuestion(c.id)}
                          aria-label={t("questions.deleteConfirm", "Remove question")}
                          className="tap grid size-8 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: VISITS TIMELINE */}
        {currentTab === "visits" && (
          <div className="flex flex-col gap-5">
            {/* Upcoming Follow-Up Alert Banner (if within 3 days) */}
            {upcomingFollowUps[0] && (
              <section className="rounded-3xl border-2 border-primary/50 bg-secondary/80 p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                    <Clock className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {t("visits.upcomingBadge", "Follow-up due soon")}
                    </span>
                    <p className="mt-1 font-bold text-foreground text-base">
                      {upcomingFollowUps[0].daysRemaining === 0
                        ? t("visits.homeBannerToday", {
                            doctor: upcomingFollowUps[0].visit.doctorOrClinic,
                          })
                        : t("visits.homeBanner", {
                            doctor: upcomingFollowUps[0].visit.doctorOrClinic,
                            days: upcomingFollowUps[0].daysRemaining,
                          })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("visits.reason")}: {upcomingFollowUps[0].visit.reason}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Top Bar with Add Visit Action */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {t("visits.title", "Doctor visits")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    "visits.subtitle",
                    "Keep track of doctor consultations, notes, and follow-ups.",
                  )}
                </p>
              </div>
              {!showVisitForm && (
                <button
                  type="button"
                  onClick={openNewVisitForm}
                  className="tap flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Plus className="size-4" />
                  <span>{t("visits.addVisit", "Log a visit")}</span>
                </button>
              )}
            </div>

            {/* Visit Form Modal / Panel */}
            {showVisitForm && (
              <form
                onSubmit={handleSaveVisit}
                className="card-soft border-2 border-primary/40 p-5 flex flex-col gap-4 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="font-bold text-base text-foreground">
                    {editingVisitId
                      ? t("visits.editVisit", "Edit visit")
                      : t("visits.addVisit", "Log a visit")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowVisitForm(false)}
                    className="tap grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Visit Date */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${inputId}-date`} className="text-xs font-bold text-foreground">
                    {t("visits.date")}
                  </label>
                  <input
                    id={`${inputId}-date`}
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Doctor or Clinic Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${inputId}-doc`} className="text-xs font-bold text-foreground">
                    {t("visits.doctor")}
                  </label>
                  <input
                    id={`${inputId}-doc`}
                    type="text"
                    required
                    placeholder={t("visits.doctorPlaceholder", "e.g. Dr. Lakshmi, CHC Shamshabad")}
                    value={doctorOrClinic}
                    onChange={(e) => setDoctorOrClinic(e.target.value)}
                    className="rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Reason for Visit */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${inputId}-reason`}
                    className="text-xs font-bold text-foreground"
                  >
                    {t("visits.reason")}
                  </label>
                  <input
                    id={`${inputId}-reason`}
                    type="text"
                    required
                    placeholder={t(
                      "visits.reasonPlaceholder",
                      "e.g. Routine checkup, irregular periods",
                    )}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Notes or Doctor's Advice */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${inputId}-notes`} className="text-xs font-bold text-foreground">
                    {t("visits.notes")}
                  </label>
                  <textarea
                    id={`${inputId}-notes`}
                    rows={3}
                    placeholder={t(
                      "visits.notesPlaceholder",
                      "e.g. Advised ultrasound and blood test; drink more water",
                    )}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Linked Medicines */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">
                    {t("visits.linkedMedicines")}
                  </label>
                  {availableMeds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {availableMeds.map((med) => {
                        const isSelected = selectedMeds.includes(med);
                        return (
                          <button
                            key={med}
                            type="button"
                            onClick={() => toggleMed(med)}
                            className={`tap rounded-full px-3 py-1 text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground hover:bg-muted/80"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {med}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Add Custom Medicine chip */}
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Or type medicine name..."
                      value={customMed}
                      onChange={(e) => setCustomMed(e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCustomMed}
                      disabled={!customMed.trim()}
                      className="tap rounded-xl bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/80 disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Next Follow-up Date */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${inputId}-followup`}
                    className="text-xs font-bold text-foreground"
                  >
                    {t("visits.nextFollowUp")}
                  </label>
                  <input
                    id={`${inputId}-followup`}
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowVisitForm(false)}
                    className="tap rounded-2xl border-2 border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    {t("visits.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="tap rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    {t("visits.save", "Save visit")}
                  </button>
                </div>
              </form>
            )}

            {/* Visit Timeline List */}
            {visits.length === 0 && !showVisitForm ? (
              <div className="card-soft flex flex-col items-center justify-center p-8 text-center border border-border/80">
                <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
                  <CalendarDays className="size-8" />
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  {t("visits.noVisits", "No visits logged yet.")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  {t(
                    "visits.noVisitsDesc",
                    "Keep a record of your clinic visits, notes, medicines, and follow-up dates.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={openNewVisitForm}
                  className="tap mt-4 flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Plus className="size-4" />
                  <span>{t("visits.addVisit", "Log your first visit")}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {visits.map((v) => (
                  <article
                    key={v.id}
                    className="card-soft border border-border/80 p-4.5 flex flex-col gap-2.5 shadow-xs transition-all hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
                          {formatDate(v.date)}
                        </span>
                        <h3 className="mt-1.5 font-bold text-base text-foreground leading-snug">
                          {v.doctorOrClinic}
                        </h3>
                        <p className="text-xs font-semibold text-primary mt-0.5">{v.reason}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditVisitForm(v)}
                          aria-label={t("visits.editVisit", "Edit visit")}
                          className="tap grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVisit(v.id)}
                          aria-label={t("visits.delete", "Delete visit")}
                          className="tap grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {v.notes && (
                      <p className="rounded-2xl bg-muted/30 p-2.5 text-xs text-foreground/90 leading-relaxed">
                        {v.notes}
                      </p>
                    )}

                    {v.linkedMedicines && v.linkedMedicines.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                          Medicines:
                        </span>
                        {v.linkedMedicines.map((m) => (
                          <span
                            key={m}
                            className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {v.nextFollowUpDate && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 text-xs text-muted-foreground font-medium">
                        <Clock className="size-3.5 text-primary" />
                        <span>
                          {t("visits.nextFollowUp")}:{" "}
                          <strong className="text-foreground">
                            {formatDate(v.nextFollowUpDate)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCTOR SUMMARY (PRINTABLE ONE-PAGE) */}
        {currentTab === "summary" && (
          <div className="flex flex-col gap-4">
            {/* Action Bar for Summary */}
            <div className="no-print card-soft flex flex-wrap items-center justify-between gap-3 p-4 border border-border/80">
              <div>
                <p className="font-bold text-foreground text-sm">
                  {t("summary.title", "Doctor summary")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready to print, save as PDF, or share via private QR code.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/share"
                  className="tap flex items-center gap-1.5 rounded-2xl border-2 border-primary bg-secondary px-3.5 py-2 text-xs font-bold text-primary shadow-xs hover:bg-secondary/80"
                >
                  <QrCode className="size-4" />
                  <span>{t("share.shareWithDoctor", "Share with QR")}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="tap flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Printer className="size-4" />
                  <span>{t("summary.downloadPdf", "Download / Print PDF")}</span>
                </button>
              </div>
            </div>

            {/* Printable Container (One-Page A4) */}
            <div className="printable-summary card-soft border border-border/80 p-5 md:p-6 bg-card">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border pb-3 mb-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <span>🌸 Sakhi — {t("summary.title", "Doctor Summary")}</span>
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("summary.subtitle")}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">
                      {t("summary.patientName")}:
                    </span>{" "}
                    {user?.name || "Patient"}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      {t("summary.dateGenerated")}:
                    </span>{" "}
                    {formatDate(today)}
                  </p>
                </div>
              </div>

              {/* 90-Day Cycle & Symptom Summary */}
              <section className="print-card mb-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
                <h2 className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                  <Calendar className="size-3.5 text-primary print:text-black" />
                  {t("summary.timelineTitle", "90-Day cycle & symptom summary")}
                </h2>

                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl border border-border/60 bg-card p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      {t("summary.cycleOverview")}
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {lengths.length > 0
                        ? `${Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)} days avg`
                        : "Tracking..."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      {t("summary.flowHighlights")}
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {bleedingDays.length} bleed days ({heavyBleedingDays.length} heavy)
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      {t("summary.painHighlights")}
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {severePainDays.length} severe pain days
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">{t("cycle.lastPeriod")}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {starts[0] ? formatDate(starts[0]) : "None recorded"}
                    </p>
                  </div>
                </div>

                {painAreasReported.length > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Pain areas logged:</strong>{" "}
                    {painAreasReported.join(", ")}
                  </p>
                )}
              </section>

              {/* Pattern Flags ("Worth discussing with a doctor") */}
              <section className="print-card mb-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
                <h2 className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                  <AlertTriangle className="size-3.5 text-warning print:text-black" />
                  {t("summary.flagsTitle", "Patterns worth discussing with a doctor")}
                </h2>

                {flags.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                    {flags.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span className="font-bold text-warning print:text-black">•</span>
                        <span className="font-semibold text-foreground">{t(`flags.${f}`)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t("summary.noFlags")}</p>
                )}
              </section>

              {/* Current Medicines & Recent Visits Grid */}
              <div className="print-card mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Medicines */}
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
                  <h2 className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Pill className="size-3.5 text-accent print:text-black" />
                    {t("summary.medicinesTitle", "Current medicines")}
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
                    {t("summary.recentVisitsTitle", "Recent doctor visits")}
                  </h2>
                  {visits.length > 0 ? (
                    <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                      {visits.slice(0, 3).map((v) => (
                        <li key={v.id} className="border-b border-border/40 pb-1 last:border-0">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{formatDate(v.date)}</span>
                            <span className="font-semibold">{v.reason}</span>
                          </div>
                          <p className="font-bold text-xs">{v.doctorOrClinic}</p>
                          {v.notes && (
                            <p className="text-[10px] text-muted-foreground">{v.notes}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{t("summary.noVisits")}</p>
                  )}
                </div>
              </div>

              {/* Ticked Questions to Discuss */}
              <section className="print-card mb-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
                <h2 className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                  <HelpCircle className="size-3.5 text-primary print:text-black" />
                  {t("summary.tickedQuestionsTitle", "Questions to discuss with doctor")}
                </h2>

                {selectedQuestions.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                    {selectedQuestions.map((q) => (
                      <li key={q.id} className="flex items-start gap-2">
                        <span className="mt-0.5 inline-block size-3 rounded border border-foreground print:border-black shrink-0" />
                        <span className="font-medium text-foreground">{q.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t("summary.noQuestions")}</p>
                    <button
                      type="button"
                      onClick={() => setTab("questions")}
                      className="no-print text-xs font-bold text-primary hover:underline"
                    >
                      + {t("questions.title", "Prepare questions")}
                    </button>
                  </div>
                )}
              </section>

              {/* Non-Diagnostic Disclaimer Footer */}
              <footer className="border-t border-border pt-2 text-center text-[10px] text-muted-foreground leading-snug">
                <p>
                  {t(
                    "summary.disclaimer",
                    "Sakhi shares patterns and questions only. It does not diagnose.",
                  )}
                </p>
              </footer>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
