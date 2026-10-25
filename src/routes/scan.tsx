import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  Trash2,
  Plus,
  Clock,
  Utensils,
  Lock,
  ShieldCheck,
  FileImage,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  medicineService,
  inferCategory,
  TIMES_OF_DAY,
  type TimeOfDay,
  type FoodTiming,
  type ScannedMedicine,
} from "@/services/medicines";
import { vaultService } from "@/services/vault";
import { todayISO } from "@/services/logs";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Add your medicines — Sakhi" },
      { name: "description", content: "Add and track your medicines and dose reminders." },
      { property: "og:title", content: "Add your medicines — Sakhi" },
      { property: "og:description", content: "Add and track your medicines and dose reminders." },
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

  // Initial state: starts straight away with one empty medicine card
  const [medicines, setMedicines] = useState<EditableMedicine[]>([
    {
      tempId: "temp_init_1",
      name: "",
      dose: "1 tablet",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      durationDays: 7,
      category: "general",
    },
  ]);

  // Private vault photo upload state
  const vaultFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingVaultFile, setPendingVaultFile] = useState<File | null>(null);
  const [showVaultModal, setShowVaultModal] = useState<"setup" | "unlock" | null>(null);
  const [setupStep, setSetupStep] = useState<"enter" | "confirm">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupError, setSetupError] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [vaultSavedSuccess, setVaultSavedSuccess] = useState(false);

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

  // ---------------- Vault Photo Saving Flow ----------------
  const saveFileToVaultDirectly = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        await vaultService.addDocument(
          file.name || "Prescription photo",
          file.type || "image/jpeg",
          file.size,
          dataUrl,
          "prescription",
        );
        toast.success(t("scan.photoSavedToVault"));
        setVaultSavedSuccess(true);
      } catch (err) {
        console.error("Failed to add document to vault", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVaultFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please select an image under 10MB.");
      return;
    }

    setPendingVaultFile(file);
    setVaultSavedSuccess(false);

    if (!vaultService.hasPin()) {
      setSetupStep("enter");
      setFirstPin("");
      setConfirmPin("");
      setSetupError("");
      setShowVaultModal("setup");
    } else if (!vaultService.isUnlocked()) {
      setPinInput("");
      setUnlockError("");
      setShowVaultModal("unlock");
    } else {
      saveFileToVaultDirectly(file);
      setPendingVaultFile(null);
    }

    if (vaultFileInputRef.current) {
      vaultFileInputRef.current.value = "";
    }
  };

  const handleSetupFirstPin = (digit: string) => {
    if (firstPin.length < 4) {
      const next = firstPin + digit;
      setFirstPin(next);
      if (next.length === 4) {
        setSetupStep("confirm");
      }
    }
  };

  const handleSetupConfirmPin = async (digit: string) => {
    if (confirmPin.length < 4) {
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === firstPin) {
          await vaultService.setupPin(next);
          setShowVaultModal(null);
          if (pendingVaultFile) {
            await saveFileToVaultDirectly(pendingVaultFile);
            setPendingVaultFile(null);
          }
        } else {
          setSetupError(t("vault.pinMismatch"));
          setFirstPin("");
          setConfirmPin("");
          setSetupStep("enter");
        }
      }
    }
  };

  const handleUnlockPin = async (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setUnlockError("");

      if (next.length === 4) {
        const res = await vaultService.unlock(next);
        if (res.success) {
          setShowVaultModal(null);
          setPinInput("");
          if (pendingVaultFile) {
            await saveFileToVaultDirectly(pendingVaultFile);
            setPendingVaultFile(null);
          }
        } else {
          setPinInput("");
          if (res.error === "locked") {
            setUnlockError(t("vault.lockedOut", { seconds: res.remainingSeconds || 300 }));
          } else {
            const attempts = res.failedAttempts || 1;
            setUnlockError(t("vault.wrongPin", { attempts }));
          }
        }
      }
    }
  };

  const closeVaultModal = () => {
    setShowVaultModal(null);
    setPendingVaultFile(null);
    setPinInput("");
    setFirstPin("");
    setConfirmPin("");
    setSetupError("");
    setUnlockError("");
  };

  return (
    <AppShell>
      {/* Top back & title navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Link to="/medicines" className="tap inline-flex items-center gap-2 text-lg text-primary">
          <ArrowLeft className="size-6" /> {t("settings.back")}
        </Link>
        <span className="text-sm font-semibold text-muted-foreground">{t("scan.title")}</span>
      </div>

      <div className="flex flex-col gap-5 pb-8">
        <div>
          <h1 className="text-3xl font-bold font-serif">{t("scan.title")}</h1>
        </div>

        {/* Doctor caution notice */}
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border-2 border-warning/40 bg-warning-tint p-4 shadow-xs"
        >
          <AlertTriangle className="size-7 shrink-0 text-warning" />
          <p className="text-base font-bold text-warning leading-snug">{t("scan.doctorWarning")}</p>
        </div>

        {/* Secondary Action: Save photo to private vault without reading */}
        <div className="card-soft flex flex-col items-center gap-2.5 border-2 border-dashed border-primary/30 p-4 text-center">
          <input
            ref={vaultFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleVaultFileSelected}
          />
          <button
            type="button"
            onClick={() => vaultFileInputRef.current?.click()}
            className="tap flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-primary/40 bg-secondary/60 px-4 py-3 text-base font-bold text-primary hover:bg-secondary"
          >
            <FileImage className="size-5 shrink-0" />
            <span>{t("scan.savePhotoToVault")}</span>
          </button>
          <p className="text-xs text-muted-foreground leading-normal">
            {t("scan.photoAutoReadComingSoon")}
          </p>
          {vaultSavedSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-success mt-0.5">
              <ShieldCheck className="size-4 shrink-0" />
              <span>{t("scan.photoSavedToVault")}</span>
            </div>
          )}
        </div>

        {/* Medicine manual cards list - 2 columns on desktop */}
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
                    className="tap flex-1 rounded-xl border px-3 py-2 text-lg font-bold outline-none focus:border-primary"
                  />
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMed(med.tempId)}
                      aria-label={t("scan.deleteMed")}
                      className="tap p-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  )}
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
                      className="tap mt-1 w-full rounded-xl border px-3 py-2 text-base outline-none focus:border-primary"
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
                      className="tap mt-1 w-full rounded-xl border px-3 py-2 text-base outline-none focus:border-primary"
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
                          className={`tap rounded-xl border py-2.5 text-xs font-bold transition-colors ${
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
                        className={`tap rounded-xl border py-2.5 text-sm font-semibold ${
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

        {/* Add another medicine button */}
        <button
          type="button"
          onClick={addManualMed}
          className="tap card-soft flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 p-4 text-base font-bold text-primary"
        >
          <Plus className="size-5" /> {t("scan.addAnother")}
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={saveAll}
          className="tap mt-2 w-full rounded-2xl bg-primary py-4 text-xl font-bold text-primary-foreground shadow-lg"
        >
          <Check className="mr-2 inline size-6" /> {t("scan.save")}
        </button>
      </div>

      {/* Vault PIN Setup / Unlock Modal Dialog */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="card-soft relative flex w-full max-w-sm flex-col items-center gap-4 border bg-background p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeVaultModal}
              className="absolute right-4 top-4 tap p-1 text-muted-foreground hover:text-foreground"
              aria-label={t("vault.cancel")}
            >
              <X className="size-5" />
            </button>

            <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
              <Lock className="size-7" />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold font-serif">
                {showVaultModal === "setup" ? t("vault.setupTitle") : t("vault.enterPin")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {showVaultModal === "setup"
                  ? setupStep === "enter"
                    ? t("vault.enterPin")
                    : t("vault.confirmPin")
                  : t("vault.setupDesc")}
              </p>
            </div>

            {/* PIN Dots */}
            <div className="flex items-center gap-4 py-1">
              {[0, 1, 2, 3].map((i) => {
                const filled =
                  showVaultModal === "setup"
                    ? setupStep === "enter"
                      ? i < firstPin.length
                      : i < confirmPin.length
                    : i < pinInput.length;
                return (
                  <div
                    key={i}
                    className={`size-4 rounded-full border-2 transition-all ${
                      filled
                        ? "border-primary bg-primary scale-110"
                        : "border-muted-foreground/40 bg-transparent"
                    }`}
                  />
                );
              })}
            </div>

            {/* Errors */}
            {setupError && <p className="text-xs font-semibold text-destructive">{setupError}</p>}
            {unlockError && <p className="text-xs font-semibold text-destructive">{unlockError}</p>}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((val, idx) => {
                if (val === "") return <div key={idx} />;
                if (val === "del") {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (showVaultModal === "setup") {
                          if (setupStep === "enter") setFirstPin((p) => p.slice(0, -1));
                          else setConfirmPin((p) => p.slice(0, -1));
                        } else {
                          setPinInput((p) => p.slice(0, -1));
                        }
                      }}
                      className="tap flex items-center justify-center rounded-2xl border-2 border-border bg-card py-3.5 text-sm font-bold text-muted-foreground"
                    >
                      ←
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (showVaultModal === "setup") {
                        if (setupStep === "enter") handleSetupFirstPin(val);
                        else handleSetupConfirmPin(val);
                      } else {
                        handleUnlockPin(val);
                      }
                    }}
                    className="tap flex items-center justify-center rounded-2xl border-2 border-border bg-card py-3.5 text-2xl font-bold text-foreground shadow-xs active:bg-secondary"
                  >
                    {val}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={closeVaultModal}
              className="tap mt-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {t("vault.cancel")}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
