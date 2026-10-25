import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pill,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sun,
  SunMedium,
  Sunset,
  Moon,
  Trash2,
  Calendar,
  Sparkles,
  Camera,
  Activity,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NotificationOptInButton } from "@/components/DoseReminders";
import {
  medicineService,
  inferCategory,
  type ScheduledDose,
  type Medicine,
  type AdherenceSummary,
  type TimeOfDay,
} from "@/services/medicines";
import { todayISO } from "@/services/logs";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "Medicines & Reminders — Sakhi" },
      { name: "description", content: "Track daily doses, prescription schedule and refills." },
      { property: "og:title", content: "Medicines & Reminders — Sakhi" },
      {
        property: "og:description",
        content: "Track daily doses, prescription schedule and refills.",
      },
    ],
  }),
  component: MedicinesPage,
});

const timingIcons: Record<TimeOfDay, typeof Sun> = {
  morning: Sun,
  afternoon: SunMedium,
  evening: Sunset,
  night: Moon,
};

function getPurposeText(t: (k: string) => string, category: string): string {
  const map: Record<string, string> = {
    iron: t("medicines.purpose.iron"),
    calcium: t("medicines.purpose.calcium"),
    painRelief: t("medicines.purpose.painRelief"),
    hormonal: t("medicines.purpose.hormonal"),
    antacid: t("medicines.purpose.antacid"),
    antibiotic: t("medicines.purpose.antibiotic"),
    general: t("medicines.purpose.general"),
  };
  return map[category] ?? map["general"] ?? "";
}

function MedicinesPage() {
  const { t, i18n } = useTranslation();
  const [schedule, setSchedule] = useState<ScheduledDose[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [refillAlerts, setRefillAlerts] = useState<{ medicine: Medicine; remainingDays: number }[]>(
    [],
  );

  const loadData = () => {
    const today = todayISO();
    setSchedule(medicineService.getTodaySchedule(today));
    setMedicines(medicineService.all());
    setAdherence(medicineService.getAdherence(today, 7));
    setRefillAlerts(medicineService.getRefillAlerts(today));
  };

  useEffect(() => {
    loadData();
  }, []);

  const markDose = (dose: ScheduledDose, status: "taken" | "skipped") => {
    medicineService.recordDose(dose.medicineId, dose.date, dose.timeOfDay, status);
    loadData();
  };

  const undoDose = (dose: ScheduledDose) => {
    medicineService.undoDose(dose.medicineId, dose.date, dose.timeOfDay);
    loadData();
  };

  const removeMed = (id: string) => {
    medicineService.delete(id);
    loadData();
  };

  return (
    <AppShell title={t("medicines.title")}>
      <div className="flex flex-col gap-5 pt-1">
        {/* Refill Alerts Banner (Gentle Caution) */}
        {refillAlerts.length > 0 && (
          <section className="rounded-2xl border-2 border-warning/40 bg-warning-tint p-4 shadow-xs">
            <h2 className="flex items-center gap-2 text-lg font-bold text-warning">
              <AlertCircle className="size-6 shrink-0 text-warning" />
              {t("medicines.refillTitle")}
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {refillAlerts.map(({ medicine, remainingDays }) => (
                <li key={medicine.id} className="text-base font-semibold text-foreground">
                  • {t("medicines.refillAlert", { name: medicine.name, n: remainingDays })}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Quick Add Medicines Action */}
        <Link
          to="/scan"
          className="tap flex items-center justify-center gap-3 bg-primary p-4 text-xl font-bold text-primary-foreground shadow-md rounded-2xl"
        >
          <Plus className="size-7" />
          {t("medicines.scanPhoto")}
        </Link>

        {/* Today's Doses */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("medicines.todayDoses")}</h2>
            <span className="text-sm font-semibold text-muted-foreground">
              {new Date().toLocaleDateString((i18n.language || "en") + "-IN", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {schedule.length === 0 ? (
            <div className="card-soft flex flex-col items-center gap-3 p-8 text-center">
              <Pill className="size-12 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                {medicines.length === 0 ? t("medicines.empty") : t("medicines.noDosesToday")}
              </p>
              <Link
                to="/scan"
                className="tap mt-2 inline-flex items-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-base font-bold text-secondary-foreground"
              >
                <Plus className="size-5" /> {t("medicines.addPrescription")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedule.map((dose) => {
                const Icon = timingIcons[dose.timeOfDay] ?? Pill;
                const purposeKey = dose.category ?? inferCategory(dose.medicineName);

                return (
                  <article
                    key={dose.id}
                    className={`card-soft flex flex-col justify-between gap-3 border-2 p-5 transition-all ${
                      dose.status === "taken"
                        ? "border-success/40 bg-success/5"
                        : dose.status === "skipped"
                          ? "border-muted bg-muted/30 opacity-75"
                          : "border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="size-7" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold leading-tight truncate">
                            {dose.medicineName}
                          </h3>
                          <p className="text-sm font-semibold text-muted-foreground">
                            {dose.dose} · {t(`medicines.timing.${dose.timeOfDay}`)} ·{" "}
                            {t(`medicines.food.${dose.food}`)}
                          </p>
                        </div>
                      </div>

                      {dose.status === "taken" && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-sm font-bold text-success">
                          <CheckCircle2 className="size-4" /> {t("medicines.taken")}
                        </span>
                      )}
                      {dose.status === "skipped" && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-bold text-muted-foreground">
                          <XCircle className="size-4" /> {t("medicines.skipped")}
                        </span>
                      )}
                    </div>

                    {/* What it is for note */}
                    <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-sm font-medium text-foreground">
                      <Sparkles className="size-4 shrink-0 text-accent" />
                      <span className="truncate">{getPurposeText(t, purposeKey)}</span>
                    </div>

                    {/* Dose action buttons */}
                    {dose.status === "pending" ? (
                      <div className="mt-1 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => markDose(dose, "taken")}
                          className="tap flex items-center justify-center gap-2 rounded-2xl bg-success py-3 text-base sm:text-lg font-bold text-success-foreground"
                        >
                          <CheckCircle2 className="size-5" /> {t("medicines.taken")}
                        </button>
                        <button
                          onClick={() => markDose(dose, "skipped")}
                          className="tap flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card py-3 text-base sm:text-lg font-semibold text-muted-foreground"
                        >
                          <XCircle className="size-5" /> {t("medicines.skip")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => undoDose(dose)}
                          className="tap inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground underline"
                        >
                          <RotateCcw className="size-4" /> {t("medicines.undo")}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Adherence Summary */}
        {adherence && adherence.totalScheduled > 0 && (
          <section className="card-soft border border-border/80 flex flex-col gap-3 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Activity className="size-6 text-primary" /> {t("medicines.adherence")}
              </h2>
              <span className="text-2xl font-bold text-primary">{adherence.percentage}%</span>
            </div>

            <p className="text-base text-muted-foreground">
              {t("medicines.onTimeWeek", { pct: adherence.percentage })} (
              {t("medicines.dosesTaken", {
                taken: adherence.taken,
                total: adherence.totalScheduled,
              })}
              )
            </p>

            {/* 7-day visual dot strip */}
            <div className="grid grid-cols-7 gap-2 pt-1 text-center">
              {adherence.history.map((h) => {
                const dayLabel = new Date(h.date + "T00:00:00").toLocaleDateString(
                  (i18n.language || "en") + "-IN",
                  {
                    weekday: "short",
                  },
                );
                const color =
                  h.scheduled === 0
                    ? "bg-muted/40 text-muted-foreground"
                    : h.taken === h.scheduled
                      ? "bg-success text-success-foreground"
                      : h.taken > 0
                        ? "bg-secondary text-primary font-bold"
                        : "bg-muted text-muted-foreground border border-border/80";

                return (
                  <div key={h.date} className="flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">{dayLabel}</span>
                    <div
                      className={`grid size-10 place-items-center rounded-xl text-xs font-bold ${color}`}
                    >
                      {h.taken}/{h.scheduled}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Browser Notification Opt-in */}
        <NotificationOptInButton />

        {/* My Medicine List */}
        {medicines.length > 0 && (
          <section className="card-soft border border-border/80 flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{t("medicines.myMedicines")}</h2>
              <span className="text-sm font-semibold text-muted-foreground">
                {medicines.length} total
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((med) => {
                const purposeKey = med.category ?? inferCategory(med.name);
                return (
                  <div
                    key={med.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold text-foreground">{med.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {med.dose} · {med.timings.map((t) => t).join(", ")} · {med.durationDays}d
                        </p>
                        <p className="mt-1 text-xs font-semibold text-accent">
                          {getPurposeText(t, purposeKey)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeMed(med.id)}
                        aria-label={t("medicines.delete")}
                        className="tap p-2 text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
