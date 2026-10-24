import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  FileCheck,
  MapPin,
  Phone,
  Navigation,
  Bell,
  CheckCircle2,
  CalendarHeart,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  matchSchemes,
  schemeService,
  type SchemeAnswers,
  type MatchedScheme,
} from "@/services/schemes";
import { type AgeGroup, type HouseholdCategory } from "@/data/schemes";
import { type Place } from "@/services/places";

export const Route = createFileRoute("/schemes")({
  head: () => ({
    meta: [
      { title: "Government Health Schemes — Sakhi" },
      {
        name: "description",
        content: "Find central and state government health schemes you may qualify for.",
      },
      { property: "og:title", content: "Government Health Schemes — Sakhi" },
      {
        property: "og:description",
        content: "Find central and state government health schemes you may qualify for.",
      },
    ],
  }),
  component: SchemesPage,
});

function SchemesPage() {
  const { t } = useTranslation();

  // Questionnaire state
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [isPregnant, setIsPregnant] = useState<"yes" | "no" | null>(null);
  const [household, setHousehold] = useState<HouseholdCategory | null>(null);
  const [state, setState] = useState<string>("Telangana");

  const [hasCompletedQuestions, setHasCompletedQuestions] = useState<boolean>(false);
  const [matched, setMatched] = useState<MatchedScheme[]>([]);
  const [pmsmaReminder, setPmsmaReminder] = useState<boolean>(false);
  const [nearestPrimaryCare, setNearestPrimaryCare] = useState<{
    place: Place;
    distanceKm: number | null;
  } | null>(null);

  useEffect(() => {
    // Load previously saved answers if any
    const saved = schemeService.getSavedAnswers();
    if (saved) {
      setAgeGroup(saved.ageGroup);
      setIsPregnant(saved.isPregnant);
      setHousehold(saved.household);
      setState(saved.state);
      setHasCompletedQuestions(true);
      setMatched(matchSchemes(saved));
    }

    setPmsmaReminder(schemeService.isPmsmaReminderEnabled());
    setNearestPrimaryCare(schemeService.getNearestPrimaryCare());
  }, []);

  const handleSeeSchemes = () => {
    if (!ageGroup || !isPregnant || !household) return;

    const answers: SchemeAnswers = {
      ageGroup,
      isPregnant,
      household,
      state,
    };

    schemeService.saveAnswers(answers);
    const results = matchSchemes(answers);
    setMatched(results);
    setHasCompletedQuestions(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleResetQuestions = () => {
    setHasCompletedQuestions(false);
  };

  const handleTogglePmsmaReminder = () => {
    const next = !pmsmaReminder;
    setPmsmaReminder(next);
    schemeService.setPmsmaReminderEnabled(next);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5 pb-8 pt-2">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            aria-label={t("common.back", "Back")}
            className="tap grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight">{t("schemes.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("schemes.subtitle")}</p>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <section className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground">ℹ️ {t("schemes.disclaimer")}</p>
        </section>

        {/* Questionnaire Form (if not completed or resetting) */}
        {!hasCompletedQuestions ? (
          <section className="card-soft flex flex-col gap-6 p-5">
            <div>
              <h2 className="text-xl font-bold">{t("schemes.questionsTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Answer 3 quick questions to discover benefits for you and your family.
              </p>
            </div>

            {/* Question 1: Age */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-foreground">{t("schemes.qAge")}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "under18" as AgeGroup, labelKey: "schemes.qAge_under18" },
                  { value: "18_29" as AgeGroup, labelKey: "schemes.qAge_18_29" },
                  { value: "30_49" as AgeGroup, labelKey: "schemes.qAge_30_49" },
                  { value: "50_plus" as AgeGroup, labelKey: "schemes.qAge_50_plus" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setAgeGroup(item.value)}
                    className={`tap flex items-center justify-center rounded-2xl border-2 py-3 px-3 text-sm font-bold transition-all ${
                      ageGroup === item.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2: Pregnancy */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-foreground">{t("schemes.qPregnant")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPregnant("yes")}
                  className={`tap flex items-center justify-center rounded-2xl border-2 py-3 px-3 text-sm font-bold transition-all ${
                    isPregnant === "yes"
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {t("schemes.qPregnant_yes")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPregnant("no")}
                  className={`tap flex items-center justify-center rounded-2xl border-2 py-3 px-3 text-sm font-bold transition-all ${
                    isPregnant === "no"
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {t("schemes.qPregnant_no")}
                </button>
              </div>
            </div>

            {/* Question 3: Household Category */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-foreground">{t("schemes.qHousehold")}</label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setHousehold("bpl_ration")}
                  className={`tap flex items-center justify-start rounded-2xl border-2 py-3 px-4 text-sm font-bold transition-all text-left ${
                    household === "bpl_ration"
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {t("schemes.qHousehold_bpl")}
                </button>
                <button
                  type="button"
                  onClick={() => setHousehold("general")}
                  className={`tap flex items-center justify-start rounded-2xl border-2 py-3 px-4 text-sm font-bold transition-all text-left ${
                    household === "general"
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {t("schemes.qHousehold_general")}
                </button>
              </div>
            </div>

            {/* Question 4: State */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-foreground">{t("schemes.qState")}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "Telangana", labelKey: "schemes.state_ts" },
                  { value: "Andhra Pradesh", labelKey: "schemes.state_ap" },
                  { value: "Other", labelKey: "schemes.state_other" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setState(item.value)}
                    className={`tap flex items-center justify-center rounded-2xl border-2 py-2.5 px-2 text-xs font-bold transition-all ${
                      state === item.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSeeSchemes}
              disabled={!ageGroup || !isPregnant || !household}
              className="tap mt-2 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md disabled:opacity-50"
            >
              <Sparkles className="size-5" /> {t("schemes.seeSchemes")}
            </button>
          </section>
        ) : (
          /* Results View */
          <div className="flex flex-col gap-5">
            {/* Top Bar with Recheck Button */}
            <div className="card-soft flex items-center justify-between p-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <CheckCircle2 className="size-4" /> {t("schemes.youMayQualify")}
                </span>
                <p className="mt-1 text-base font-bold">
                  {t("schemes.matchingResults", { count: matched.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetQuestions}
                className="tap flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> {t("schemes.recheck")}
              </button>
            </div>

            {/* PMSMA 9th-of-month monthly reminder for pregnant women */}
            {isPregnant === "yes" && (
              <section className="rounded-3xl border-2 border-primary/50 bg-secondary p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <CalendarHeart className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-foreground leading-snug">
                      {t("schemes.pmsmaReminderTitle")}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {t("schemes.pmsmaReminderDesc")}
                    </p>

                    <button
                      type="button"
                      onClick={handleTogglePmsmaReminder}
                      className={`tap mt-3 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                        pmsmaReminder
                          ? "bg-primary text-primary-foreground"
                          : "border border-primary/40 bg-card text-primary hover:bg-primary/5"
                      }`}
                    >
                      <Bell className="size-4" />
                      {pmsmaReminder ? t("schemes.reminderActive") : t("schemes.remindMe9th")}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Nearest Primary Care Center card */}
            {nearestPrimaryCare && (
              <section className="card-soft border-2 border-primary/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <MapPin className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                      {t("schemes.nearestCenterTitle")}
                    </span>
                    <h3 className="mt-1 font-bold text-base text-foreground">
                      {nearestPrimaryCare.place.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {nearestPrimaryCare.place.address}
                      {nearestPrimaryCare.distanceKm !== null && (
                        <span> • {nearestPrimaryCare.distanceKm} km away</span>
                      )}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("schemes.nearestCenterDesc")}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      {nearestPrimaryCare.place.phone && (
                        <a
                          href={`tel:${nearestPrimaryCare.place.phone}`}
                          className="tap flex items-center gap-1.5 rounded-xl border border-primary/40 bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5"
                        >
                          <Phone className="size-3.5" /> {t("care.call")}
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${nearestPrimaryCare.place.lat},${nearestPrimaryCare.place.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="tap flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        <Navigation className="size-3.5" /> {t("care.directions")}
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Matching Schemes List */}
            {matched.length === 0 ? (
              <div className="card-soft p-6 text-center text-sm text-muted-foreground">
                <HelpCircle className="mx-auto size-8 text-muted-foreground mb-2" />
                <p>{t("schemes.noMatch")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {matched.map(({ scheme, matchReasons }) => (
                  <article
                    key={scheme.id}
                    className="card-soft border border-border/80 flex flex-col gap-3 p-5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
                          {t("schemes.youMayQualify")}
                        </span>
                        <h2 className="text-lg font-bold text-foreground mt-1.5">
                          {t(scheme.nameKey)}
                        </h2>
                      </div>
                      <ShieldCheck className="size-6 text-primary shrink-0" />
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(scheme.shortDescKey)}
                    </p>

                    {/* Eligibility reasons tags */}
                    {matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {matchReasons.map((reasonKey) => (
                          <span
                            key={reasonKey}
                            className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                          >
                            ✓ {t(reasonKey)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* What it offers */}
                    <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed">
                      <p className="font-bold text-foreground uppercase tracking-wide text-[10px] text-muted-foreground">
                        {t("schemes.offers")}
                      </p>
                      <p className="mt-1 text-foreground font-medium">{t(scheme.benefitsKey)}</p>
                    </div>

                    {/* Documents to carry */}
                    <div className="rounded-2xl bg-muted/30 p-3 text-xs leading-relaxed">
                      <p className="font-bold text-foreground uppercase tracking-wide text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileCheck className="size-3.5" />
                        {t("schemes.documents")}
                      </p>
                      <p className="mt-1 text-foreground font-medium">{t(scheme.documentsKey)}</p>
                    </div>

                    {/* Where to apply & Portal link */}
                    <div className="flex flex-col gap-2 pt-1 border-t border-border/50 text-xs">
                      <div>
                        <span className="font-bold text-muted-foreground">
                          {t("schemes.whereToApply")}:
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {t(scheme.whereToApplyKey)}
                        </span>
                      </div>

                      {scheme.portalUrl && (
                        <div className="mt-1">
                          <a
                            href={scheme.portalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                          >
                            <span>{t("schemes.officialPortal")}</span>
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
