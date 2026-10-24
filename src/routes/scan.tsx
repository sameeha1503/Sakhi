import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Camera,
  Upload,
  AlertTriangle,
  Check,
  Trash2,
  Plus,
  Loader2,
  FileText,
  Clock,
  Utensils,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { scanPrescription, type ScannedMedicine } from "@/services/scanner";
import {
  medicineService,
  inferCategory,
  TIMES_OF_DAY,
  type TimeOfDay,
  type FoodTiming,
  type MedicineCategory,
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

function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<"upload" | "scanning" | "confirm">("upload");
  const [medicines, setMedicines] = useState<EditableMedicine[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Show preview
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
    } catch {
      setStep("upload");
    }
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
        frequency: m.timings.length,
        timings: m.timings,
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
      <div className="mb-4 flex items-center justify-between">
        <Link to="/medicines" className="tap inline-flex items-center gap-2 text-lg text-primary">
          <ArrowLeft className="size-6" /> {t("settings.back")}
        </Link>
        <span className="text-sm font-semibold text-muted-foreground">{t("scan.title")}</span>
      </div>

      {step === "upload" && (
        <div className="flex flex-col gap-6 py-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{t("scan.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("scan.subtitle")}</p>
          </div>

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

          {/* Prominent warning in all languages */}
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border-2 border-destructive bg-destructive/10 p-4"
          >
            <AlertTriangle className="size-7 shrink-0 text-destructive" />
            <p className="text-base font-bold text-destructive leading-snug">
              {t("scan.doctorWarning")}
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

                  {/* Plain-language purpose from static dictionary */}
                  <div className="rounded-xl bg-secondary/50 p-2.5 text-sm">
                    <span className="font-semibold text-primary">
                      💡 {getPurposeText(t, purposeKey)}
                    </span>
                  </div>

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
                        className="tap mt-1 w-full rounded-xl border px-3 text-base outline-none focus:border-primary"
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
                        value={med.durationDays}
                        onChange={(e) =>
                          updateMed(med.tempId, { durationDays: parseInt(e.target.value, 10) || 1 })
                        }
                        className="tap mt-1 w-full rounded-xl border px-3 text-base outline-none focus:border-primary"
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
