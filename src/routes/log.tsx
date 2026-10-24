import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Droplet,
  Droplets,
  Ban,
  Brain,
  HeartHandshake,
  Soup,
  CircleDot,
  PersonStanding,
  Footprints,
  Frown,
  Meh,
  Smile,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  MoonStar,
  Moon,
  Sun,
  CalendarX,
  Sparkles,
  Scissors,
  Scale,
  Zap,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  emptyLog,
  logService,
  todayISO,
  FLOWS,
  PAIN_AREAS,
  SYMPTOMS,
  type DailyLog,
} from "@/services/logs";
import { isRedFlag } from "@/services/cycle";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Daily check-in — Sakhi" },
      { name: "description", content: "Log bleeding, pain, mood and symptoms with a few taps." },
      { property: "og:title", content: "Daily check-in — Sakhi" },
      {
        property: "og:description",
        content: "Log bleeding, pain, mood and symptoms with a few taps.",
      },
    ],
  }),
  component: LogPage,
});

const flowIcon = {
  none: Ban,
  light: Droplet,
  medium: Droplet,
  heavy: Droplets,
  veryHeavy: Droplets,
};
const flowSize = {
  none: "size-8",
  light: "size-6",
  medium: "size-8",
  heavy: "size-9",
  veryHeavy: "size-11",
};
const areaIcon = {
  head: Brain,
  breast: HeartHandshake,
  stomach: Soup,
  pelvis: CircleDot,
  back: PersonStanding,
  legs: Footprints,
};
const symIcon = {
  irregular: CalendarX,
  acne: Sparkles,
  hairLoss: Scissors,
  weight: Scale,
  heavyBleeding: Droplets,
  pelvicPain: Zap,
};

function Tile({
  on,
  onClick,
  children,
  danger,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`tap card-soft relative flex flex-col items-center justify-center gap-2 border-2 p-4 sm:p-5 text-base sm:text-lg font-semibold transition-all hover:scale-[1.01] ${
        on
          ? danger
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-primary bg-secondary text-secondary-foreground shadow-xs"
          : "border-border/70 bg-card hover:border-primary/40 text-foreground"
      }`}
    >
      {on && (
        <Check
          className={`absolute right-2.5 top-2.5 size-5 ${
            danger ? "text-destructive" : "text-primary"
          }`}
        />
      )}
      {children}
    </button>
  );
}

function LogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [log, setLog] = useState<DailyLog>(emptyLog());
  const [step, setStep] = useState(0);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    const prev = logService.get(todayISO());
    if (prev) {
      setLog(prev);
      setExisting(true);
    }
  }, []);

  const set = (p: Partial<DailyLog>) => setLog((l) => ({ ...l, ...p }));
  const toggle = (k: "painAreas" | "symptoms", v: string) =>
    setLog((l) => ({ ...l, [k]: l[k].includes(v) ? l[k].filter((x) => x !== v) : [...l[k], v] }));

  const total = 4;
  const save = () => {
    const final = { ...log, painLevel: log.painAreas.length ? Math.max(1, log.painLevel) : 0 };
    logService.save(final);
    navigate({ to: isRedFlag(final) ? "/urgent" : "/cycle" });
  };

  const faces = (key: "mood" | "energy" | "sleep", icons: (typeof Frown)[]) => (
    <div>
      <p className="mb-2 text-lg font-semibold text-foreground">{t(`log.${key}`)}</p>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {icons.map((Icon, i) => (
          <Tile key={i} on={log[key] === i + 1} onClick={() => set({ [key]: i + 1 })}>
            <Icon className="size-9 text-primary" />
            <span className="text-sm sm:text-base">{t(`log.${["low", "ok", "good"][i]}`)}</span>
          </Tile>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Wizard Main Card (wider card max-w-3xl) */}
        <div className="lg:col-span-8">
          <div className="card-soft max-w-3xl border border-border/80 p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold">{t("log.title")}</h1>
              <span className="text-sm font-semibold text-muted-foreground">
                {t("log.step", { n: step + 1, total })}
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className={`h-2.5 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {existing && step === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">{t("log.already")}</p>
            )}

            <section className="mt-6">
              {/* Step 0: Flow (Bleeding) - larger tiles in 3-4 columns */}
              {step === 0 && (
                <>
                  <h2 className="mb-4 text-xl sm:text-2xl font-bold">{t("log.flowQ")}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                    {FLOWS.map((f) => {
                      const Icon = flowIcon[f];
                      return (
                        <Tile
                          key={f}
                          on={log.flow === f}
                          onClick={() => set({ flow: f })}
                          danger={f === "veryHeavy"}
                        >
                          <Icon
                            className={`${flowSize[f]} ${
                              f === "none"
                                ? "text-muted-foreground"
                                : f === "veryHeavy"
                                  ? "text-destructive"
                                  : "text-accent"
                            }`}
                          />
                          <span className="text-center">{t(`log.flow.${f}`)}</span>
                        </Tile>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Step 1: Pain - larger tiles in 3 columns */}
              {step === 1 && (
                <>
                  <h2 className="mb-4 text-xl sm:text-2xl font-bold">{t("log.painQ")}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3.5 sm:gap-4">
                    {PAIN_AREAS.map((a) => {
                      const Icon = areaIcon[a];
                      return (
                        <Tile
                          key={a}
                          on={log.painAreas.includes(a)}
                          onClick={() => toggle("painAreas", a)}
                        >
                          <Icon className="size-8 text-primary" />
                          <span className="text-center">{t(`log.area.${a}`)}</span>
                        </Tile>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => set({ painAreas: [], painLevel: 0 })}
                    className={`tap mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 text-base sm:text-lg font-semibold transition-colors ${
                      log.painAreas.length === 0
                        ? "border-primary bg-secondary text-secondary-foreground font-bold shadow-xs"
                        : "border-border hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {t("log.noPain")}
                  </button>

                  {log.painAreas.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="mb-3 text-base sm:text-lg font-bold">{t("log.painLevel")}</p>
                      <div className="grid grid-cols-5 gap-2.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => set({ painLevel: n })}
                            className={`tap flex min-h-[50px] items-center justify-center rounded-2xl text-2xl font-bold transition-transform active:scale-95 ${
                              log.painLevel === n
                                ? n >= 4
                                  ? "bg-destructive text-destructive-foreground shadow-sm"
                                  : "bg-primary text-primary-foreground shadow-sm"
                                : "card-soft border border-border/80 hover:border-primary/40"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Step 2: Feel (Mood, Energy, Sleep) */}
              {step === 2 && (
                <div className="flex flex-col gap-6">
                  <h2 className="text-xl sm:text-2xl font-bold">{t("log.feelQ")}</h2>
                  {faces("mood", [Frown, Meh, Smile])}
                  {faces("energy", [BatteryLow, BatteryMedium, BatteryFull])}
                  {faces("sleep", [MoonStar, Moon, Sun])}
                </div>
              )}

              {/* Step 3: Symptoms - larger tiles in 3 columns */}
              {step === 3 && (
                <>
                  <h2 className="mb-4 text-xl sm:text-2xl font-bold">{t("log.symQ")}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3.5 sm:gap-4">
                    {SYMPTOMS.map((s) => {
                      const Icon = symIcon[s];
                      return (
                        <Tile
                          key={s}
                          on={log.symptoms.includes(s)}
                          onClick={() => toggle("symptoms", s)}
                        >
                          <Icon className="size-8 text-accent" />
                          <span className="text-center text-sm sm:text-base leading-tight">
                            {t(`log.sym.${s}`)}
                          </span>
                        </Tile>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* Navigation buttons */}
            <div className="mt-8 grid grid-cols-[auto_1fr] gap-3">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="tap min-h-[50px] rounded-2xl border-2 border-border px-6 text-lg font-bold hover:border-primary/40"
                >
                  {t("log.back")}
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => (step < total - 1 ? setStep(step + 1) : save())}
                className="tap flex min-h-[50px] items-center justify-center rounded-2xl bg-primary px-8 text-xl font-bold text-primary-foreground shadow-md hover:bg-primary/95 active:scale-[0.98] transition-all"
              >
                {step < total - 1 ? t("log.next") : t("log.save")}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Side Panel: Progress Summary of Today's Answers */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24">
          <div className="card-soft border border-border/80 p-6 flex flex-col gap-4 shadow-xs">
            <h2 className="text-xl font-bold text-foreground border-b border-border/50 pb-3 flex items-center gap-2">
              <Check className="size-5 text-primary" />
              <span>{t("logSummary.title")}</span>
            </h2>

            {/* Bleeding Flow */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("logSummary.flow")}
              </span>
              <p className="text-base font-semibold text-foreground">
                {log.flow ? t(`log.flow.${log.flow}`) : t("logSummary.notSelected")}
              </p>
            </div>

            {/* Pain Areas & Level */}
            <div className="flex flex-col gap-1 border-t border-border/40 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("logSummary.pain")}
              </span>
              <p className="text-base font-semibold text-foreground">
                {log.painAreas.length > 0
                  ? `${log.painAreas.map((a) => t(`log.area.${a}`)).join(", ")} (${t("log.painLevel")}: ${log.painLevel})`
                  : t("log.noPain")}
              </p>
            </div>

            {/* Mood & Energy */}
            <div className="flex flex-col gap-1 border-t border-border/40 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("logSummary.moodEnergy")}
              </span>
              <div className="text-sm font-semibold text-foreground space-y-0.5">
                <p>
                  {t("log.mood")}: {t(`log.${["low", "ok", "good"][log.mood - 1]}`)}
                </p>
                <p>
                  {t("log.energy")}: {t(`log.${["low", "ok", "good"][log.energy - 1]}`)}
                </p>
                <p>
                  {t("log.sleep")}: {t(`log.${["low", "ok", "good"][log.sleep - 1]}`)}
                </p>
              </div>
            </div>

            {/* Symptoms */}
            <div className="flex flex-col gap-1 border-t border-border/40 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("logSummary.symptoms")}
              </span>
              <p className="text-base font-semibold text-foreground">
                {log.symptoms.length > 0
                  ? log.symptoms.map((s) => t(`log.sym.${s}`)).join(", ")
                  : t("logSummary.notSelected")}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
