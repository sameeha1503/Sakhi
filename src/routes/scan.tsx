import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera,
  Upload,
  AlertTriangle,
  Check,
  Trash2,
  Plus,
  Loader2,
  Clock,
  Utensils,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MedicineExplanationCard } from "@/components/MedicineExplanationCard";
import { getMedicineInfo, type MedicineExplanation } from "@/services/medicineInfo";
import {
  scanPrescription,
  ScanError,
  type ScannedMedicine,
  type ScanErrorCode,
} from "@/services/scanner";
import {
  medicineService,
  inferCategory,
  TIMES_OF_DAY,
  type TimeOfDay,
  type FoodTiming,
} from "@/services/medicines";
import { todayISO } from "@/services/logs";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan prescription — Sakhi" },
      { name: "description", content: "Scan and digitize your prescription." },
      { property: "og:title", content: "Scan prescription — Sakhi" },
      { property: "og:description", content: "Scan and digitize your prescription." },
    ],
  }),
  component: ScanPage,
});

type EditableMedicine = ScannedMedicine & {
  tempId: string;
};

function ScanPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<"upload" | "scanning" | "confirm">("upload");
  const [error, setError] = useState<ScanErrorCode | null>(null);
  const [medicines, setMedicines] = useState<EditableMedicine[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, MedicineExplanation>>({});
  const [loadingNames, setLoadingNames] = useState<Record<string, boolean>>({});

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const getErrorMessage = (code: ScanErrorCode): string => {
    switch (code) {
      case "unreadable":
        return t("scan.errorUnreadable");
      case "not_prescription":
        return t("scan.errorNotPrescription");
      case "offline":
        return t("scan.errorOffline");
      case "too_large":
        return t("scan.errorTooLarge");
      case "rate_limited":
      case "scan_unavailable":
      default:
        return t("scan.errorUnavailable");
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    // Show preview in memory (never written to localStorage)
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setStep("scanning");

    try {
      const extracted = await scanPrescription(file);
      const withIds: EditableMedicine[] = extracted.map((m, i) => ({
        ...m,
        tempId: `temp_${Date.now()}_${i}`,
      }));
      setMedicines(withIds);
      setStep("confirm");

      // Fetch AI explanations once after names are read
      const validMeds = withIds.filter((m) => m.name.trim());
      if (validMeds.length > 0) {
        const flags: Record<string, boolean> = {};
        validMeds.forEach((m) => {
          flags[m.name] = true;
        });
        setLoadingNames((prev) => ({ ...prev, ...flags }));
        getMedicineInfo(validMeds, i18n.language)
          .then((infoMap) => {
            setExplanations((prev) => ({ ...prev, ...infoMap }));
          })
          .finally(() => {
            setLoadingNames((prev) => {
              const next = { ...prev };
              validMeds.forEach((m) => {
                delete next[m.name];
              });
              return next;
            });
          });
      }
    } catch (err: unknown) {
      const code: ScanErrorCode = err instanceof ScanError ? err.code : "upstream_error";
      setError(code);
      setStep("upload");
    }
  };

  const handleNameBlur = (med: EditableMedicine) => {
    const trimmed = med.name.trim();
    if (!trimmed) return;
    if (explanations[trimmed]) return;

    setLoadingNames((prev) => ({ ...prev, [trimmed]: true }));
    getMedicineInfo([{ name: trimmed, dose: med.dose }], i18n.language)
      .then((infoMap) => {
        setExplanations((prev) => ({ ...prev, ...infoMap }));
      })
      .finally(() => {
        setLoadingNames((prev) => {
          const next = { ...prev };
          delete next[trimmed];
          return next;
        });
      });
  };

  const updateMed = (tempId: string, patch: Partial<EditableMedicine>) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.tempId !== tempId) return m;
        const updated = { ...m, ...patch };
        if (patch.name && !patch.category) {
          updated.category = inferCategory(patch.name);
        }
        return updated;
      }),
    );
  };

  const toggleTiming = (tempId: string, timing: TimeOfDay) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.tempId !== tempId) return m;
        const exists = m.timings.includes(timing);
        const next = exists ? m.timings.filter((t) => t !== timing) : [...m.timings, timing];
        return {
          ...m,
          timings: next.length > 0 ? next : ["morning"],
          frequency: Math.max(1, next.length),
        };
      }),
    );
  };

  const removeMed = (tempId: string) => {
    setMedicines((prev) => prev.filter((m) => m.tempId !== tempId));
  };

  const addManualMed = () => {
    const newMed: EditableMedicine = {
      tempId: `temp_${Date.now()}`,
      name: "",
      dose: "1 tablet",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      durationDays: 7,
      category: "general",
      needsCheck: false,
      asNeeded: false,
      note: null,
    };
    setMedicines((prev) => [...prev, newMed]);
  };

  const saveAll = () => {
    const today = todayISO();
    const toSave = medicines
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        name: m.name.trim(),
        dose: m.dose.trim() || "1 tablet",
        frequency: m.asNeeded ? 0 : m.timings.length,
        timings: m.asNeeded ? [] : m.timings,
        food: m.food,
        startDate: today,
        durationDays: Math.max(1, m.durationDays),
        category: m.category ?? inferCategory(m.name),
      }));

    if (toSave.length > 0) {
      medicineService.addAll(toSave);
    }
    navigate({ to: "/medicines" });
  };

  return (
    <AppShell>
      {step === "upload" && (
        <div className="flex flex-col gap-6 py-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{t("scan.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("scan.subtitle")}</p>
          </div>

          {/* Error Banner with Try Again & Add Manually */}
          {error && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border-2 border-warning/50 bg-warning-tint p-4 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-6 shrink-0 text-warning" />
                <p className="text-sm font-bold text-warning leading-snug">
                  {getErrorMessage(error)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("upload");
                  }}
                  className="tap inline-flex min-h-[40px] items-center justify-center rounded-xl bg-card px-4 py-2 text-xs font-bold text-foreground border border-border shadow-xs hover:bg-muted"
                >
                  {t("scan.tryAgain")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMedicines([]);
                    addManualMed();
                    setStep("confirm");
                  }}
                  className="tap inline-flex min-h-[40px] items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  <Plus className="mr-1.5 size-4" />
                  {t("scan.addManual")}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="tap card-soft flex flex-col items-center justify-center gap-3 border-2 border-primary bg-primary/5 p-8 text-center"
            >
              <div className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
                <Camera className="size-8" />
              </div>
              <span className="text-2xl font-bold text-primary">{t("scan.takePhoto")}</span>
            </button>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="tap card-soft flex items-center justify-center gap-3 p-5 text-lg font-semibold"
            >
              <Upload className="size-6 text-accent" />
              {t("scan.chooseGallery")}
            </button>
          </div>

          {/* Consent note (zero persistence) */}
          <div className="rounded-2xl border border-primary/20 bg-secondary/40 p-3.5 text-xs text-muted-foreground flex items-center gap-2.5">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <span>{t("scan.consentNote")}</span>
          </div>

          <div className="rounded-2xl border-2 border-primary/20 bg-secondary/50 p-4 text-sm text-foreground">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5 text-primary" /> {t("scan.readingNote")}
            </p>
          </div>
        </div>
      )}

      {step === "scanning" && (
        <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
          {photoPreview && (
            <div className="relative overflow-hidden rounded-2xl border shadow-md">
              <img src={photoPreview} alt="Prescription" className="h-44 w-44 object-cover" />
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <h2 className="text-2xl font-bold">{t("scan.reading")}</h2>
          </div>
          <p className="text-muted-foreground">{t("scan.readingNote")}</p>
        </div>
      )}

      {step === "confirm" && (
        <div className="flex flex-col gap-5 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t("scan.confirmTitle")}</h1>
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
              {t("scan.foundCount", { n: medicines.length })}
            </span>
          </div>

          {/* Prominent verification notice */}
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border-2 border-warning/60 bg-warning-tint p-4 shadow-xs"
          >
            <AlertTriangle className="size-6 shrink-0 text-warning" />
            <p className="text-base font-extrabold text-warning leading-snug">
              {t("scan.verificationNotice")}
            </p>
          </div>

          {/* Extracted medicines list - 2 columns on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medicines.map((med, idx) => {
              const purposeKey = med.category ?? "general";
              return (
                <div key={med.tempId} className="card-soft flex flex-col gap-4 border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => updateMed(med.tempId, { name: e.target.value })}
                      onBlur={() => handleNameBlur(med)}
                      placeholder={t("scan.medName")}
                      className="tap flex-1 rounded-xl border px-3 text-lg font-bold outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => removeMed(med.tempId)}
                      aria-label={t("scan.deleteMed")}
                      className="tap p-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>

                  {/* Badges: Needs Check & As Needed */}
                  <div className="flex flex-wrap items-center gap-2">
                    {med.needsCheck && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                        {t("scan.needsCheck")}
                      </span>
                    )}
                    {med.asNeeded && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {t("scan.asNeeded")}
                      </span>
                    )}
                  </div>

                  {/* Plain-language explanation (AI with offline fallback) */}
                  <MedicineExplanationCard
                    name={med.name}
                    info={explanations[med.name]}
                    loading={loadingNames[med.name]}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        {t("scan.dose")}
                      </label>
                      <input
                        type="text"
                        value={med.dose}
                        onChange={(e) => updateMed(med.tempId, { dose: e.target.value })}
                        placeholder="e.g. 500 mg"
                        className={`tap mt-1 w-full rounded-xl border px-3 text-base outline-none focus:border-primary ${
                          !med.dose.trim()
                            ? "border-2 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20"
                            : ""
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        {t("scan.duration")}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={med.durationDays || ""}
                        onChange={(e) =>
                          updateMed(med.tempId, { durationDays: parseInt(e.target.value, 10) || 0 })
                        }
                        placeholder="Days"
                        className={`tap mt-1 w-full rounded-xl border px-3 text-base outline-none focus:border-primary ${
                          !med.durationDays || med.durationDays <= 0
                            ? "border-2 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20"
                            : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Timings selector */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                      <Clock className="size-3.5" /> {t("scan.timings")}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TIMES_OF_DAY.map((time) => {
                        const active = med.timings.includes(time);
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => toggleTiming(med.tempId, time)}
                            className={`tap rounded-xl border py-2 text-xs font-bold transition-colors ${
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground"
                            }`}
                          >
                            {t(`medicines.timing.${time}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Food timing */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                      <Utensils className="size-3.5" /> {t("scan.foodWhen")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["before", "after"] as FoodTiming[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => updateMed(med.tempId, { food: f })}
                          className={`tap rounded-xl border py-2 text-sm font-semibold ${
                            med.food === f
                              ? "border-primary bg-secondary text-primary"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {t(`medicines.food.${f}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note under the card if provided */}
                  {med.note && (
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">Note: </span>
                      {med.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={addManualMed}
            className="tap card-soft flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 p-4 text-base font-bold text-primary"
          >
            <Plus className="size-5" /> {t("medicines.addPrescription")}
          </button>

          <button
            onClick={saveAll}
            className="tap mt-2 w-full bg-primary py-4 text-xl font-bold text-primary-foreground shadow-lg"
          >
            <Check className="mr-2 inline size-6" /> {t("scan.save")}
          </button>
        </div>
      )}
    </AppShell>
  );
}
