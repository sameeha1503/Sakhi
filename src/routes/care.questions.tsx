import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  FileText,
  HelpCircle,
  AlertTriangle,
  Activity,
  Pill,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { logService, todayISO } from "@/services/logs";
import {
  questionService,
  generateSuggestedQuestions,
  type SuggestedQuestion,
  type CustomQuestion,
  type QuestionCategory,
} from "@/services/questions";

export const Route = createFileRoute("/care/questions")({
  head: () => ({
    meta: [
      { title: "Doctor Question Prep — Sakhi" },
      {
        name: "description",
        content: "Questions to ask your doctor based on your health patterns.",
      },
      { property: "og:title", content: "Doctor Question Prep — Sakhi" },
      {
        property: "og:description",
        content: "Questions to ask your doctor based on your health patterns.",
      },
    ],
  }),
  component: QuestionPrepPage,
});

function getCategoryIcon(cat: QuestionCategory) {
  switch (cat) {
    case "flag":
      return <AlertTriangle className="size-4 shrink-0 text-amber-600" />;
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

function QuestionPrepPage() {
  const { t } = useTranslation();
  const [suggested, setSuggested] = useState<SuggestedQuestion[]>([]);
  const [customList, setCustomList] = useState<CustomQuestion[]>([]);
  const [tickedIds, setTickedIds] = useState<Set<string>>(new Set());
  const [newQuestionText, setNewQuestionText] = useState("");

  const refreshData = () => {
    const logs = logService.all();
    const today = todayISO();
    const sugg = generateSuggestedQuestions(logs, today);
    setSuggested(sugg);
    setCustomList(questionService.getCustomQuestions());

    const savedTicked = questionService.getTickedIds();
    // If first time visiting and no questions ever ticked, default tick pattern flags & first general question
    if (savedTicked.length === 0) {
      const initialTicks: string[] = [];
      for (const q of sugg) {
        if (q.category === "flag" || q.id === "q_general_tests") {
          initialTicks.push(q.id);
          questionService.setTicked(q.id, true);
        }
      }
      setTickedIds(new Set(initialTicks));
    } else {
      setTickedIds(new Set(savedTicked));
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggle = (id: string) => {
    const nextState = questionService.toggleTicked(id);
    setTickedIds((prev) => {
      const updated = new Set(prev);
      if (nextState) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    questionService.addCustomQuestion(newQuestionText.trim());
    setNewQuestionText("");
    refreshData();
  };

  const handleDeleteCustom = (id: string) => {
    if (window.confirm(t("questions.deleteConfirm"))) {
      questionService.deleteCustomQuestion(id);
      refreshData();
    }
  };

  const tickedCount = tickedIds.size;

  return (
    <AppShell>
      <div className="flex flex-col gap-5 pb-8 pt-2">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/care"
            aria-label={t("common.back", "Back")}
            className="tap grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight">{t("questions.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("questions.subtitle")}</p>
          </div>
        </div>

        {/* Bring with you status card */}
        <section className="card-soft flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {t("questions.bringWithYou")}
              </p>
              <p className="text-lg font-bold">
                {t("questions.tickedCount", { count: tickedCount })}
              </p>
            </div>
            <Link
              to="/care/summary"
              className="tap flex items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              <FileText className="size-4" />
              {t("questions.goToSummary")}
            </Link>
          </div>
          {tickedCount === 0 && (
            <p className="text-xs text-muted-foreground">{t("questions.noneTicked")}</p>
          )}
        </section>

        {/* Add custom question */}
        <section className="card-soft flex flex-col gap-3 p-4">
          <h2 className="text-base font-bold">{t("questions.addCustomTitle")}</h2>
          <form onSubmit={handleAddCustom} className="flex flex-col gap-2.5">
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder={t("questions.addCustomPlaceholder")}
              className="tap w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-base outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!newQuestionText.trim()}
              className="tap flex items-center justify-center gap-2 bg-secondary py-3 text-sm font-bold text-secondary-foreground disabled:opacity-50"
            >
              <Plus className="size-4" /> {t("questions.addCustomBtn")}
            </button>
          </form>
        </section>

        {/* Custom questions if any */}
        {customList.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-base font-bold">{t("questions.customQuestionsTitle")}</h2>
            <div className="flex flex-col gap-2">
              {customList.map((cq) => {
                const isTicked = tickedIds.has(cq.id);
                return (
                  <div
                    key={cq.id}
                    className={`card-soft flex items-start gap-3 p-4 transition-colors ${
                      isTicked
                        ? "border-2 border-primary/60 bg-primary/5"
                        : "border-2 border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(cq.id)}
                      className="tap mt-0.5 shrink-0 text-primary"
                      aria-label="Toggle question"
                    >
                      {isTicked ? (
                        <CheckCircle2 className="size-6 text-primary" />
                      ) : (
                        <Circle className="size-6 text-muted-foreground" />
                      )}
                    </button>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleToggle(cq.id)}
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        {getCategoryIcon("custom")} {t("questions.categories.custom")}
                      </span>
                      <p className="mt-1 text-base font-medium leading-snug">{cq.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(cq.id)}
                      className="tap p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Delete question"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Suggested questions list */}
        <section className="flex flex-col gap-2.5">
          <div>
            <h2 className="text-base font-bold">{t("questions.suggestedTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("questions.suggestedIntro")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggested.map((q) => {
              const isTicked = tickedIds.has(q.id);
              const text = q.i18nKey ? t(q.i18nKey, q.defaultText) : q.defaultText;
              const categoryLabel = t(`questions.categories.${q.category}`, q.category);

              return (
                <div
                  key={q.id}
                  onClick={() => handleToggle(q.id)}
                  className={`card-soft flex cursor-pointer items-start gap-3 p-4 transition-colors ${
                    isTicked
                      ? "border-2 border-primary bg-primary/5 shadow-sm"
                      : "border-2 border-border/80"
                  }`}
                >
                  <button
                    type="button"
                    className="tap mt-0.5 shrink-0 text-primary"
                    aria-label="Toggle question"
                  >
                    {isTicked ? (
                      <CheckCircle2 className="size-6 text-primary" />
                    ) : (
                      <Circle className="size-6 text-muted-foreground" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        q.category === "flag"
                          ? "bg-amber-100 text-amber-800"
                          : q.category === "symptom"
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {getCategoryIcon(q.category)} {categoryLabel}
                    </span>
                    <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                      {text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA to Doctor Summary */}
        <div className="mt-2">
          <Link
            to="/care/summary"
            className="tap flex items-center justify-center gap-2 bg-primary py-4 text-base font-bold text-primary-foreground shadow-md"
          >
            <FileText className="size-5" />
            {t("questions.goToSummary")}
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
