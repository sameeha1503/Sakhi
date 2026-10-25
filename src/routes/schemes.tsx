import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Bookmark,
  Check,
  Gift,
  Building2,
  HeartHandshake,
  Heart,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  matchSchemes,
  schemeService,
  type SchemeAnswers,
  type MatchedScheme,
  type TieredSchemes,
  type TrackerStatus,
} from "@/services/schemes";
import {
  STATES_AND_UTS,
  STATE_MAP,
  type AgeGroup,
  type MaternalStatus,
  type HouseholdCategory,
  type StateInfo,
} from "@/data/schemes";
import { type Place } from "@/services/places";

export const Route = createFileRoute("/schemes")({
  head: () => ({
    meta: [
      { title: "Government Schemes — Sakhi" },
      {
        name: "description",
        content: "Find central and state health and welfare schemes you may qualify for.",
      },
      { property: "og:title", content: "Government Schemes — Sakhi" },
      {
        property: "og:description",
        content: "Find central and state health and welfare schemes you may qualify for.",
      },
    ],
  }),
  component: SchemesPage,
});

function SchemesPage() {
  const { t } = useTranslation();

  // State Selection
  const [selectedStateCode, setSelectedStateCode] = useState<string>("TS");
  const [isStateSelectorOpen, setIsStateSelectorOpen] = useState<boolean>(false);
  const [stateSearchQuery, setStateSearchQuery] = useState<string>("");

  // Questionnaire state
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [maternalStatus, setMaternalStatus] = useState<MaternalStatus | null>(null);
  const [household, setHousehold] = useState<HouseholdCategory | null>(null);
  const [useCheckinPatterns, setUseCheckinPatterns] = useState<boolean>(true);

  // Results & UI State
  const [hasCompletedQuestions, setHasCompletedQuestions] = useState<boolean>(false);
  const [tieredResults, setTieredResults] = useState<TieredSchemes | null>(null);
  const [tracker, setTracker] = useState<Record<string, TrackerStatus>>({});
  const [pmsmaReminder, setPmsmaReminder] = useState<boolean>(false);
  const [screeningReminder, setScreeningReminder] = useState<boolean>(false);
  const [nearestPrimaryCare, setNearestPrimaryCare] = useState<{
    place: Place;
    distanceKm: number | null;
  } | null>(null);

  // Collapsible tiers state
  const [isTier1Open, setIsTier1Open] = useState<boolean>(true);
  const [isTier2Open, setIsTier2Open] = useState<boolean>(true);
  const [isTier3Open, setIsTier3Open] = useState<boolean>(true);

  useEffect(() => {
    // Mark schemes as viewed so home badge updates
    schemeService.markSchemesViewed();

    // Load initial state
    const savedState = schemeService.getSavedStateCode();
    setSelectedStateCode(savedState);

    // Load saved answers
    const saved = schemeService.getSavedAnswers();
    if (saved) {
      setAgeGroup(saved.ageGroup);
      setMaternalStatus(saved.maternalStatus);
      setHousehold(saved.household);
      setSelectedStateCode(saved.stateCode);
      setUseCheckinPatterns(saved.useCheckinPatterns ?? true);
      setHasCompletedQuestions(true);
      setTieredResults(matchSchemes(saved));
    }

    setTracker(schemeService.getTracker());
    setPmsmaReminder(schemeService.isPmsmaReminderEnabled());
    setScreeningReminder(schemeService.isScreeningReminderEnabled());
    setNearestPrimaryCare(schemeService.getNearestPrimaryCare());
  }, []);

  const currentStateInfo: StateInfo = useMemo(() => {
    return STATE_MAP[selectedStateCode] || STATE_MAP["TS"]!;
  }, [selectedStateCode]);

  // Filtered states for state selector modal
  const filteredStates = useMemo(() => {
    const q = stateSearchQuery.trim().toLowerCase();
    if (!q) return STATES_AND_UTS;
    return STATES_AND_UTS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
  }, [stateSearchQuery]);

  const statesList = useMemo(
    () => filteredStates.filter((s) => s.type === "state"),
    [filteredStates],
  );
  const utsList = useMemo(() => filteredStates.filter((s) => s.type === "ut"), [filteredStates]);

  const handleSelectState = (code: string) => {
    setSelectedStateCode(code);
    schemeService.setSavedStateCode(code);
    setIsStateSelectorOpen(false);
    setStateSearchQuery("");

    // If answers were already completed, re-run matching with new state
    if (hasCompletedQuestions && ageGroup && maternalStatus && household) {
      const updatedAnswers: SchemeAnswers = {
        ageGroup,
        maternalStatus,
        household,
        stateCode: code,
        useCheckinPatterns,
      };
      schemeService.saveAnswers(updatedAnswers);
      setTieredResults(matchSchemes(updatedAnswers));
    }
  };

  const handleSeeSchemes = () => {
    if (!ageGroup || !maternalStatus || !household) return;

    const answers: SchemeAnswers = {
      ageGroup,
      maternalStatus,
      household,
      stateCode: selectedStateCode,
      useCheckinPatterns,
    };

    schemeService.saveAnswers(answers);
    const results = matchSchemes(answers);
    setTieredResults(results);
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

  const handleToggleScreeningReminder = () => {
    const next = !screeningReminder;
    setScreeningReminder(next);
    schemeService.setScreeningReminderEnabled(next);
  };

  const handleSetTracker = (schemeId: string, status: TrackerStatus) => {
    const current = tracker[schemeId];
    const newStatus = current === status ? null : status;
    schemeService.setTrackerStatus(schemeId, newStatus);
    setTracker(schemeService.getTracker());
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5 pb-12 pt-2">
        {/* Top Header */}
        <div>
          <h1 className="text-2xl font-bold leading-tight">{t("schemes.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("schemes.subtitle")}</p>
        </div>

        {/* State Banner & Selector Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("schemes.qState")}
              </span>
              <p className="font-bold text-sm text-foreground truncate">
                {currentStateInfo.name} ({currentStateInfo.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsStateSelectorOpen(true)}
            className="tap shrink-0 rounded-xl border border-primary/40 bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            {t("schemes.changeState")}
          </button>
        </div>

        {/* Questionnaire Form (if not completed or resetting) */}
        {!hasCompletedQuestions ? (
          <section className="card-soft flex flex-col gap-6 p-5 shadow-sm border border-border/70">
            <div>
              <h2 className="text-xl font-bold text-foreground">{t("schemes.questionsTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t("schemes.questionsSubtitle")}</p>
            </div>

            {/* Question 1: Age Group */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-foreground">{t("schemes.qAge")}</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: "under18" as AgeGroup, labelKey: "schemes.qAge_under18" },
                  { value: "18_29" as AgeGroup, labelKey: "schemes.qAge_18_29" },
                  { value: "30_59" as AgeGroup, labelKey: "schemes.qAge_30_59" },
                  { value: "60_plus" as AgeGroup, labelKey: "schemes.qAge_60_plus" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setAgeGroup(item.value)}
                    className={`tap flex items-center justify-center rounded-2xl border-2 py-3 px-3 text-sm font-bold transition-all ${
                      ageGroup === item.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2: Maternal Status */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-foreground">{t("schemes.qMaternal")}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "pregnant" as MaternalStatus, labelKey: "schemes.qMaternal_pregnant" },
                  {
                    value: "breastfeeding" as MaternalStatus,
                    labelKey: "schemes.qMaternal_breastfeeding",
                  },
                  { value: "neither" as MaternalStatus, labelKey: "schemes.qMaternal_neither" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMaternalStatus(item.value)}
                    className={`tap flex items-center justify-center rounded-2xl border-2 py-3 px-2 text-xs font-bold transition-all text-center ${
                      maternalStatus === item.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 3: Household Category */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-foreground">{t("schemes.qHousehold")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { value: "bpl_ration" as HouseholdCategory, labelKey: "schemes.qHousehold_bpl" },
                  { value: "other" as HouseholdCategory, labelKey: "schemes.qHousehold_other" },
                  {
                    value: "not_sure" as HouseholdCategory,
                    labelKey: "schemes.qHousehold_notSure",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setHousehold(item.value)}
                    className={`tap flex items-center justify-center rounded-2xl border-2 py-3 px-3 text-xs font-bold transition-all text-center ${
                      household === item.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-in Pattern Switch */}
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground block">
                    {t("schemes.useCheckinPatterns")}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {t("schemes.useCheckinPatternsDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useCheckinPatterns}
                  onClick={() => setUseCheckinPatterns(!useCheckinPatterns)}
                  className={`tap relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    useCheckinPatterns ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      useCheckinPatterns ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* See Schemes Button */}
            <button
              type="button"
              onClick={handleSeeSchemes}
              disabled={!ageGroup || !maternalStatus || !household}
              className="tap flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md disabled:opacity-40 transition-all hover:bg-primary/95"
            >
              <Sparkles className="size-5" /> {t("schemes.seeSchemes")}
            </button>
          </section>
        ) : (
          /* Results View */
          <div className="flex flex-col gap-6">
            {/* Top Bar with Recheck Button & Results Summary */}
            <div className="card-soft flex items-center justify-between p-4 border border-border/70 shadow-xs">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <CheckCircle2 className="size-4" /> {t("schemes.youMayQualify")}
                </span>
                <p className="mt-1 text-base font-bold text-foreground">
                  {t("schemes.matchingResults", { count: tieredResults?.totalCount || 0 })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetQuestions}
                className="tap flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="size-3.5" /> {t("schemes.recheck")}
              </button>
            </div>

            {/* Disclaimer Bar */}
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Info className="size-4 shrink-0 text-muted-foreground" />
              <span>{t("schemes.disclaimer")}</span>
            </div>

            {/* PMSMA 9th-of-month reminder for pregnant women */}
            {maternalStatus === "pregnant" && (
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
                      className={`tap mt-3 flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                        pmsmaReminder
                          ? "bg-primary text-primary-foreground shadow-xs"
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

            {/* Cancer Screening reminder for women 30+ */}
            {(ageGroup === "30_59" || ageGroup === "60_plus") && (
              <section className="rounded-3xl border border-module-teal/40 bg-module-teal/5 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-module-teal text-white">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-foreground leading-snug">
                      {t("schemes.screeningReminderTitle")}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {t("schemes.screeningReminderDesc")}
                    </p>

                    <button
                      type="button"
                      onClick={handleToggleScreeningReminder}
                      className={`tap mt-3 flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                        screeningReminder
                          ? "bg-module-teal text-white shadow-xs"
                          : "border border-module-teal/50 bg-card text-module-teal hover:bg-module-teal/10"
                      }`}
                    >
                      <Bell className="size-4" />
                      {screeningReminder
                        ? t("schemes.screeningReminderActive")
                        : t("schemes.remindMeScreening")}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Nearest Primary Care Center Card */}
            {nearestPrimaryCare && (
              <section className="card-soft border-2 border-primary/30 p-4 shadow-xs">
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

                    <div className="mt-3 flex items-center gap-2">
                      {nearestPrimaryCare.place.phone && (
                        <a
                          href={`tel:${nearestPrimaryCare.place.phone}`}
                          className="tap flex items-center gap-1.5 rounded-xl border border-primary/40 bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5"
                        >
                          <Phone className="size-3.5" /> {t("care.call", "Call")}
                        </a>
                      )}
                      <Link
                        to="/care"
                        className="tap flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        <Navigation className="size-3.5" /> {t("schemes.findCareNearMe")}
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ======================================================== */}
            {/* TIER 1: Made for Women (Top, Accent highlighted, Banner) */}
            {/* ======================================================== */}
            <section className="flex flex-col gap-3 rounded-3xl border-2 border-primary/60 bg-primary/5 p-4 sm:p-5 shadow-sm">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setIsTier1Open(!isTier1Open)}
                className="tap flex items-center justify-between gap-3 text-left w-full"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Heart className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      {t("schemes.tiers.madeForWomen")}
                    </h2>
                    <span className="text-xs font-semibold text-primary">
                      {t("schemes.tiers.countBadge", {
                        count: tieredResults?.madeForWomen.length || 0,
                      })}
                    </span>
                  </div>
                </div>
                <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                  {isTier1Open ? (
                    <ChevronUp className="size-5" />
                  ) : (
                    <ChevronDown className="size-5" />
                  )}
                </div>
              </button>

              {/* Made for Women Highlight Banner */}
              <div className="rounded-2xl bg-primary text-primary-foreground p-3.5 text-xs font-semibold leading-relaxed shadow-xs flex items-center gap-2.5">
                <Sparkles className="size-5 shrink-0" />
                <span>
                  {t("schemes.tiers.madeForWomenBanner", {
                    count: tieredResults?.madeForWomen.length || 0,
                  })}
                </span>
              </div>

              {/* Cards List */}
              {isTier1Open && (
                <div className="flex flex-col gap-4 mt-2">
                  {tieredResults?.madeForWomen.length === 0 ? (
                    <div className="card-soft p-5 text-center text-xs text-muted-foreground">
                      {t("schemes.noMatch")}
                    </div>
                  ) : (
                    tieredResults?.madeForWomen.map((item) => (
                      <SchemeCard
                        key={item.scheme.id}
                        matched={item}
                        stateName={currentStateInfo.name}
                        trackerStatus={tracker[item.scheme.id] || null}
                        onSetTracker={(status) => handleSetTracker(item.scheme.id, status)}
                      />
                    ))
                  )}
                </div>
              )}
            </section>

            {/* ======================================================== */}
            {/* TIER 2: Health schemes you may also qualify for          */}
            {/* ======================================================== */}
            <section className="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
              <button
                type="button"
                onClick={() => setIsTier2Open(!isTier2Open)}
                className="tap flex items-center justify-between gap-3 text-left w-full"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {t("schemes.tiers.alsoEligible")}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {t("schemes.tiers.countBadge", {
                        count: tieredResults?.alsoEligible.length || 0,
                      })}
                    </span>
                  </div>
                </div>
                <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                  {isTier2Open ? (
                    <ChevronUp className="size-5" />
                  ) : (
                    <ChevronDown className="size-5" />
                  )}
                </div>
              </button>

              {isTier2Open && (
                <div className="flex flex-col gap-4 mt-1">
                  {tieredResults?.alsoEligible.map((item) => (
                    <SchemeCard
                      key={item.scheme.id}
                      matched={item}
                      stateName={currentStateInfo.name}
                      trackerStatus={tracker[item.scheme.id] || null}
                      onSetTracker={(status) => handleSetTracker(item.scheme.id, status)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ======================================================== */}
            {/* TIER 3: Other Support (State Welfare & Cash-Transfers)   */}
            {/* ======================================================== */}
            <section className="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
              <button
                type="button"
                onClick={() => setIsTier3Open(!isTier3Open)}
                className="tap flex items-center justify-between gap-3 text-left w-full"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                    <HeartHandshake className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {t("schemes.tiers.otherSupport")}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {t("schemes.tiers.countBadge", {
                        count: tieredResults?.otherSupport.length || 0,
                      })}
                    </span>
                  </div>
                </div>
                <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                  {isTier3Open ? (
                    <ChevronUp className="size-5" />
                  ) : (
                    <ChevronDown className="size-5" />
                  )}
                </div>
              </button>

              {isTier3Open && (
                <div className="flex flex-col gap-4 mt-1">
                  {tieredResults?.otherSupport.map((item) => (
                    <SchemeCard
                      key={item.scheme.id}
                      matched={item}
                      stateName={currentStateInfo.name}
                      trackerStatus={tracker[item.scheme.id] || null}
                      onSetTracker={(status) => handleSetTracker(item.scheme.id, status)}
                    />
                  ))}

                  {/* Verified Official Fallback if State has no specific entries */}
                  {tieredResults?.hasStateFallback && (
                    <div className="rounded-2xl border border-dashed border-border p-4 bg-muted/20 flex flex-col gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <HelpCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            {t("schemes.fallbackTitle")}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {t("schemes.fallbackDesc", { state: currentStateInfo.name })}
                          </p>
                        </div>
                      </div>
                      <a
                        href={currentStateInfo.healthDeptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tap inline-flex items-center gap-1.5 self-start rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted"
                      >
                        <span>
                          {t("schemes.visitStateHealth", { state: currentStateInfo.name })}
                        </span>
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE SELECTOR MODAL / BOTTOM SHEET                      */}
        {/* ======================================================== */}
        {isStateSelectorOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="state-selector-title"
          >
            <div className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  <h2 id="state-selector-title" className="text-base font-bold text-foreground">
                    {t("schemes.stateSelectorTitle")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStateSelectorOpen(false)}
                  className="tap rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t("schemes.close")}
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Search Input */}
              <div className="p-4 border-b border-border/60 bg-muted/20">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={stateSearchQuery}
                    onChange={(e) => setStateSearchQuery(e.target.value)}
                    placeholder={t("schemes.searchStatePlaceholder")}
                    autoFocus
                    className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {stateSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStateSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* States & UTs List */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* States (28) */}
                {statesList.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      {t("schemes.allStates")}
                    </h3>
                    <div className="grid grid-cols-1 gap-1">
                      {statesList.map((st) => {
                        const isSelected = st.code === selectedStateCode;
                        return (
                          <button
                            key={st.code}
                            type="button"
                            onClick={() => handleSelectState(st.code)}
                            className={`tap flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span>
                              {st.name} ({st.code})
                            </span>
                            {isSelected && <Check className="size-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Union Territories (8) */}
                {utsList.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      {t("schemes.allUts")}
                    </h3>
                    <div className="grid grid-cols-1 gap-1">
                      {utsList.map((st) => {
                        const isSelected = st.code === selectedStateCode;
                        return (
                          <button
                            key={st.code}
                            type="button"
                            onClick={() => handleSelectState(st.code)}
                            className={`tap flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span>
                              {st.name} ({st.code})
                            </span>
                            {isSelected && <Check className="size-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// Individual Scheme Card Component
function SchemeCard({
  matched,
  stateName,
  trackerStatus,
  onSetTracker,
}: {
  matched: MatchedScheme;
  stateName: string;
  trackerStatus: TrackerStatus | null;
  onSetTracker: (status: TrackerStatus) => void;
}) {
  const { t } = useTranslation();
  const { scheme, matchReasons, stateWorksUrl } = matched;

  // Format benefit text with interpolation
  const benefitText = scheme.benefitTemplateParams
    ? t(scheme.benefitTemplate, scheme.benefitTemplateParams)
    : t(scheme.benefitTemplate);

  return (
    <article className="card-soft border border-border/80 flex flex-col gap-3.5 p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
              {t("schemes.youMayQualify")}
            </span>
            {scheme.audience === "womenSpecific" && (
              <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                Women
              </span>
            )}
            {scheme.coverAmountInr && (
              <span className="rounded-full bg-module-green/15 text-module-green px-2 py-0.5 text-[10px] font-bold">
                ₹{(scheme.coverAmountInr / 100000).toFixed(0)} Lakh
              </span>
            )}
            {scheme.cashAmountInr && (
              <span className="rounded-full bg-module-violet/15 text-module-violet px-2 py-0.5 text-[10px] font-bold">
                ₹{scheme.cashAmountInr.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-foreground mt-1.5 leading-snug">
            {scheme.officialName}
          </h3>
        </div>

        <ShieldCheck className="size-6 text-primary shrink-0" />
      </div>

      {/* Why you may qualify tags */}
      {matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {matchReasons.map((reasonKey) => (
            <span
              key={reasonKey}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary"
            >
              ✓ {t(reasonKey, { state: stateName })}
            </span>
          ))}
        </div>
      )}

      {/* What it offers */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed">
        <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("schemes.offers")}
        </p>
        <p className="mt-1 text-foreground font-medium">{benefitText}</p>
      </div>

      {/* Documents to carry */}
      <div className="rounded-2xl bg-muted/20 p-3 text-xs leading-relaxed">
        <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <FileCheck className="size-3.5" />
          {t("schemes.documents")}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {scheme.documents.map((docKey) => (
            <span
              key={docKey}
              className="rounded-lg bg-card border border-border/70 px-2 py-0.5 text-[11px] text-foreground font-medium"
            >
              {t(`schemes.docs.${docKey}`)}
            </span>
          ))}
        </div>
      </div>

      {/* Where to apply & Health Centre Link */}
      <div className="flex flex-col gap-1.5 text-xs">
        <div>
          <span className="font-bold text-muted-foreground">{t("schemes.whereToApply")}:</span>{" "}
          <span className="font-medium text-foreground">
            {t(`schemes.apply.${scheme.whereToApply}`)}
          </span>
        </div>

        {scheme.deliveredAtHealthCentre && (
          <Link
            to="/care"
            className="inline-flex items-center gap-1 text-xs font-bold text-module-teal hover:underline mt-0.5"
          >
            <MapPin className="size-3.5" />
            <span>{t("schemes.findCareNearMe")}</span>
          </Link>
        )}
      </div>

      {/* PM-JAY State Specific Link if present */}
      {stateWorksUrl && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs">
          <a
            href={stateWorksUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
          >
            <span>{t("schemes.checkStateWorks", { state: stateName })}</span>
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}

      {/* Bottom Meta & Links: Portal, Source, Verified On */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-3">
          <a
            href={scheme.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
          >
            <span>{t("schemes.officialPortal")}</span>
            <ExternalLink className="size-3" />
          </a>
          <a
            href={scheme.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:underline text-[11px]"
          >
            <span>{t("schemes.officialSource")}</span>
            <ExternalLink className="size-2.5" />
          </a>
        </div>

        <span className="text-[10px] text-muted-foreground">
          {t("schemes.verifiedOn", { date: scheme.verifiedOn })}
        </span>
      </div>

      {/* My List Tracker Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("schemes.tracker.title")}:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetTracker("saved")}
            className={`tap inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
              trackerStatus === "saved"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="size-3" />
            {trackerStatus === "saved"
              ? t("schemes.tracker.saved")
              : t("schemes.tracker.markSaved")}
          </button>

          <button
            type="button"
            onClick={() => onSetTracker("applied")}
            className={`tap inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
              trackerStatus === "applied"
                ? "bg-module-violet text-white shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Check className="size-3" />
            {trackerStatus === "applied"
              ? t("schemes.tracker.applied")
              : t("schemes.tracker.markApplied")}
          </button>

          <button
            type="button"
            onClick={() => onSetTracker("received")}
            className={`tap inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
              trackerStatus === "received"
                ? "bg-success text-white shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gift className="size-3" />
            {trackerStatus === "received"
              ? t("schemes.tracker.received")
              : t("schemes.tracker.markReceived")}
          </button>
        </div>
      </div>
    </article>
  );
}
