import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Stethoscope,
  Pill,
  Trash2,
  Edit2,
  Clock,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { visitService, type Visit } from "@/services/visits";
import { medicineService } from "@/services/medicines";
import { todayISO } from "@/services/logs";

export const Route = createFileRoute("/care/visits")({
  head: () => ({
    meta: [
      { title: "Doctor Visits — Sakhi" },
      {
        name: "description",
        content: "Keep track of doctor consultations, notes, and follow-ups.",
      },
      { property: "og:title", content: "Doctor Visits — Sakhi" },
      {
        property: "og:description",
        content: "Keep track of doctor consultations, notes, and follow-ups.",
      },
    ],
  }),
  component: VisitsPage,
});

function VisitsPage() {
  const { t, i18n } = useTranslation();
  const [visits, setVisits] = useState<Visit[]>([]);

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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [date, setDate] = useState(todayISO());
  const [doctorOrClinic, setDoctorOrClinic] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [customMed, setCustomMed] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [availableMeds, setAvailableMeds] = useState<string[]>([]);

  const refresh = () => {
    setVisits(visitService.all());
    const userMeds = medicineService.all().map((m) => m.name);
    setAvailableMeds(Array.from(new Set(userMeds)));
  };

  useEffect(() => {
    refresh();
  }, []);

  const resetForm = () => {
    setDate(todayISO());
    setDoctorOrClinic("");
    setReason("");
    setNotes("");
    setSelectedMeds([]);
    setCustomMed("");
    setNextFollowUpDate("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (v: Visit) => {
    setEditingId(v.id);
    setDate(v.date);
    setDoctorOrClinic(v.doctorOrClinic);
    setReason(v.reason);
    setNotes(v.notes);
    setSelectedMeds(v.linkedMedicines || []);
    setNextFollowUpDate(v.nextFollowUpDate || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleMed = (medName: string) => {
    setSelectedMeds((prev) =>
      prev.includes(medName) ? prev.filter((m) => m !== medName) : [...prev, medName],
    );
  };

  const handleAddCustomMed = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customMed.trim();
    if (trimmed && !selectedMeds.includes(trimmed)) {
      setSelectedMeds((prev) => [...prev, trimmed]);
      setCustomMed("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorOrClinic.trim() || !reason.trim()) return;

    if (editingId) {
      const existing = visitService.get(editingId);
      if (existing) {
        visitService.update({
          ...existing,
          date,
          doctorOrClinic: doctorOrClinic.trim(),
          reason: reason.trim(),
          notes: notes.trim(),
          linkedMedicines: selectedMeds,
          nextFollowUpDate: nextFollowUpDate.trim() || undefined,
        });
      }
    } else {
      visitService.add({
        date,
        doctorOrClinic: doctorOrClinic.trim(),
        reason: reason.trim(),
        notes: notes.trim(),
        linkedMedicines: selectedMeds,
        nextFollowUpDate: nextFollowUpDate.trim() || undefined,
      });
    }

    resetForm();
    refresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("visits.deleteConfirm"))) {
      visitService.delete(id);
      refresh();
    }
  };

  const today = todayISO();
  const upcomingFollowUps = visitService.getUpcomingFollowUps(today, 3);

  return (
    <AppShell>
      <div className="flex flex-col gap-5 pb-8 pt-2">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/care"
              aria-label={t("common.back", "Back")}
              className="tap grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground"
            >
              <ArrowLeft className="size-6" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{t("visits.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("visits.subtitle")}</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="tap flex items-center gap-1.5 rounded-2xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-sm"
            >
              <Plus className="size-4" /> {t("visits.addVisit")}
            </button>
          )}
        </div>

        {/* Follow-up Alert Banner if any within 3 days */}
        {upcomingFollowUps.length > 0 && (
          <section className="rounded-3xl border-2 border-primary/40 bg-secondary p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Clock className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t("visits.upcomingBadge")}
                </p>
                {upcomingFollowUps.map((up) => (
                  <p key={up.visit.id} className="text-sm font-bold text-foreground">
                    {up.visit.doctorOrClinic}:{" "}
                    {up.daysRemaining === 0
                      ? t("visits.followUpToday")
                      : t("visits.followUpIn", { days: up.daysRemaining })}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Add / Edit Visit Form Modal/Card */}
        {showForm && (
          <section className="card-soft flex flex-col gap-4 border-2 border-primary p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold">
                {editingId ? t("visits.editVisit") : t("visits.addVisit")}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="tap p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {/* Date */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("visits.date")}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="tap mt-1 w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-base font-semibold outline-none focus:border-primary"
                />
              </div>

              {/* Doctor / Clinic */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("visits.doctor")}
                </label>
                <input
                  type="text"
                  value={doctorOrClinic}
                  onChange={(e) => setDoctorOrClinic(e.target.value)}
                  placeholder={t("visits.doctorPlaceholder")}
                  required
                  className="tap mt-1 w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-base outline-none focus:border-primary"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("visits.reason")}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("visits.reasonPlaceholder")}
                  required
                  className="tap mt-1 w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-base outline-none focus:border-primary"
                />
              </div>

              {/* Notes / Advice */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("visits.notes")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t("visits.notesPlaceholder")}
                  className="tap mt-1 w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-base outline-none focus:border-primary"
                />
              </div>

              {/* Linked Medicines */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("visits.linkedMedicines")}
                </label>
                <p className="text-xs text-muted-foreground">{t("visits.selectMeds")}</p>

                {availableMeds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableMeds.map((med) => {
                      const isSel = selectedMeds.includes(med);
                      return (
                        <button
                          key={med}
                          type="button"
                          onClick={() => handleToggleMed(med)}
                          className={`tap flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                            isSel
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {isSel && <Check className="size-3" />} {med}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Add free text medicine */}
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={customMed}
                    onChange={(e) => setCustomMed(e.target.value)}
                    placeholder="Other medicine name"
                    className="tap flex-1 rounded-2xl border-2 border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMed}
                    disabled={!customMed.trim()}
                    className="tap rounded-2xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground disabled:opacity-50"
                  >
                    + Add
                  </button>
                </div>

                {selectedMeds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedMeds.map((med) => (
                      <span
                        key={med}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                      >
                        <Pill className="size-3" /> {med}
                        <button
                          type="button"
                          onClick={() => handleToggleMed(med)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Next Follow-up Date */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("visits.nextFollowUp")}
                </label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  min={today}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="tap mt-1 w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-base font-semibold outline-none focus:border-primary"
                />
              </div>

              {/* Actions */}
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="tap flex-1 bg-primary py-3 text-base font-bold text-primary-foreground shadow-sm"
                >
                  {t("visits.save")}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="tap rounded-2xl border-2 border-border px-5 py-3 text-sm font-bold text-muted-foreground"
                >
                  {t("visits.cancel")}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Visits Timeline */}
        <section className="flex flex-col gap-3">
          {visits.length === 0 ? (
            <div className="card-soft flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid size-16 place-items-center rounded-3xl bg-secondary text-primary">
                <Calendar className="size-8" />
              </div>
              <p className="text-base font-bold">{t("visits.noVisits")}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{t("visits.noVisitsDesc")}</p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="tap mt-2 flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
                >
                  <Plus className="size-4" /> {t("visits.addVisit")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visits.map((v) => {
                const hasFollowUp = !!v.nextFollowUpDate;
                const daysToFollowUp = hasFollowUp
                  ? Math.round(
                      (new Date(v.nextFollowUpDate + "T00:00:00Z").getTime() -
                        new Date(today + "T00:00:00Z").getTime()) /
                        86400000,
                    )
                  : null;
                const isUpcomingSoon =
                  daysToFollowUp !== null && daysToFollowUp >= 0 && daysToFollowUp <= 3;

                return (
                  <div
                    key={v.id}
                    className="card-soft flex flex-col gap-3 border-2 border-border/70 p-4 transition-all"
                  >
                    {/* Header: Date + Actions */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <Calendar className="size-4 text-primary" />
                        <span>{formatDate(v.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(v)}
                          className="tap p-1.5 text-muted-foreground hover:text-foreground"
                          aria-label="Edit visit"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          className="tap p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label="Delete visit"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Doctor & Clinic */}
                    <div className="flex items-start gap-2.5">
                      <Stethoscope className="size-5 shrink-0 text-primary mt-0.5" />
                      <div>
                        <h3 className="text-base font-bold text-foreground leading-snug">
                          {v.doctorOrClinic}
                        </h3>
                        <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground mt-1">
                          {v.reason}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {v.notes && (
                      <p className="rounded-2xl bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                        {v.notes}
                      </p>
                    )}

                    {/* Linked medicines */}
                    {v.linkedMedicines && v.linkedMedicines.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs font-bold text-muted-foreground">
                          {t("visits.linkedMedicines")}:
                        </span>
                        {v.linkedMedicines.map((med) => (
                          <span
                            key={med}
                            className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent"
                          >
                            <Pill className="size-3" /> {med}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Follow-up date badge */}
                    {hasFollowUp && (
                      <div
                        className={`flex items-center gap-2 rounded-2xl p-2.5 text-xs font-bold ${
                          isUpcomingSoon
                            ? "border-2 border-primary bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <Clock className="size-4 shrink-0" />
                        <span>
                          {t("visits.nextFollowUp")}: {formatDate(v.nextFollowUpDate)}{" "}
                          {daysToFollowUp !== null && daysToFollowUp >= 0 && (
                            <span className="ml-1 font-bold">
                              (
                              {daysToFollowUp === 0
                                ? t("visits.followUpToday")
                                : t("visits.followUpIn", { days: daysToFollowUp })}
                              )
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
