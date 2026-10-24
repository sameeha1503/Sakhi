import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Lock,
  Unlock,
  ShieldAlert,
  Plus,
  Trash2,
  Eye,
  Download,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  RotateCcw,
  X,
  FileCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { vaultService, type VaultDocument } from "@/services/vault";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Private Vault — Sakhi" },
      {
        name: "description",
        content: "Private documents lock for your medical records.",
      },
      { property: "og:title", content: "Private Vault — Sakhi" },
      {
        property: "og:description",
        content: "Private documents lock for your medical records.",
      },
    ],
  }),
  component: VaultPage,
});

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function VaultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [hasPin, setHasPin] = useState<boolean>(false);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Setup PIN state
  const [setupStep, setSetupStep] = useState<"enter" | "confirm">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupError, setSetupError] = useState("");

  // Unlock PIN state
  const [pinInput, setPinInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Lockout countdown
  const [lockedOutSeconds, setLockedOutSeconds] = useState(0);

  // Forgot PIN modal
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Document preview modal
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);

  // Inactivity timer ref
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lockVault = useCallback(() => {
    vaultService.lock();
    setUnlocked(false);
    setDocuments([]);
    setPinInput("");
    setUnlockError("");
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (unlocked) {
      inactivityTimerRef.current = setTimeout(() => {
        lockVault();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [unlocked, lockVault]);

  // Check state on mount
  useEffect(() => {
    const pinExists = vaultService.hasPin();
    setHasPin(pinExists);

    const lockout = vaultService.checkLockout();
    if (lockout.isLocked) {
      setLockedOutSeconds(lockout.remainingSeconds);
    }

    if (vaultService.isUnlocked()) {
      setUnlocked(true);
      vaultService.getDocuments().then(setDocuments);
    }

    setLoading(false);

    // Auto-lock when leaving the vault component/route
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      vaultService.lock();
    };
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockedOutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockedOutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedOutSeconds]);

  // Inactivity event listeners when unlocked
  useEffect(() => {
    if (!unlocked) return;
    resetInactivityTimer();

    const handleActivity = () => resetInactivityTimer();
    window.addEventListener("pointerdown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [unlocked, resetInactivityTimer]);

  // ---------------- Handlers ----------------

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
          setHasPin(true);
          setUnlocked(true);
          const docs = await vaultService.getDocuments();
          setDocuments(docs);
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
    if (lockedOutSeconds > 0) return;
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setUnlockError("");

      if (next.length === 4) {
        const res = await vaultService.unlock(next);
        if (res.success) {
          setUnlocked(true);
          setPinInput("");
          setFailedAttempts(0);
          const docs = await vaultService.getDocuments();
          setDocuments(docs);
        } else {
          setPinInput("");
          if (res.error === "locked") {
            setLockedOutSeconds(res.remainingSeconds || 300);
            setUnlockError(t("vault.lockedOut", { seconds: res.remainingSeconds || 300 }));
          } else {
            const attempts = res.failedAttempts || 1;
            setFailedAttempts(attempts);
            setUnlockError(t("vault.wrongPin", { attempts }));
          }
        }
      }
    }
  };

  const handleResetVault = async () => {
    await vaultService.resetVault();
    setShowForgotModal(false);
    setHasPin(false);
    setUnlocked(false);
    setDocuments([]);
    setFirstPin("");
    setConfirmPin("");
    setSetupStep("enter");
    setPinInput("");
    setUnlockError("");
    setLockedOutSeconds(0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please select a file under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      let category: VaultDocument["category"] = "other";
      if (file.name.toLowerCase().includes("prescrip")) category = "prescription";
      else if (file.name.toLowerCase().includes("report")) category = "report";

      await vaultService.addDocument(file.name, file.type, file.size, dataUrl, category);
      const updated = await vaultService.getDocuments();
      setDocuments(updated);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDoc = async (id: string) => {
    if (window.confirm(t("vault.deleteDocConfirm"))) {
      await vaultService.deleteDocument(id);
      const updated = await vaultService.getDocuments();
      setDocuments(updated);
      if (selectedDoc?.id === id) setSelectedDoc(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return null;
  }

  // ---------------- Render Case 1: Setup PIN ----------------
  if (!hasPin) {
    return (
      <AppShell>
        <div className="flex flex-col gap-5 pb-8 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              to="/settings"
              aria-label={t("common.back", "Back")}
              className="tap grid size-12 place-items-center rounded-2xl bg-secondary text-foreground"
            >
              <ArrowLeft className="size-6" />
            </Link>
            <button
              onClick={() => navigate({ to: "/settings" })}
              className="tap text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              {t("vault.skipSetup")}
            </button>
          </div>

          <div className="text-center pt-2">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary mb-3">
              <Lock className="size-8" />
            </div>
            <h1 className="text-2xl font-bold">{t("vault.setupTitle")}</h1>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
              {t("vault.setupDesc")}
            </p>
          </div>

          {/* Setup PIN Dots Display */}
          <div className="card-soft flex flex-col items-center gap-4 p-6">
            <p className="text-sm font-bold text-foreground">
              {setupStep === "enter" ? t("vault.enterPin") : t("vault.confirmPin")}
            </p>

            <div className="flex items-center gap-4 py-2">
              {[0, 1, 2, 3].map((i) => {
                const filled = setupStep === "enter" ? i < firstPin.length : i < confirmPin.length;
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

            {setupError && <p className="text-xs font-semibold text-destructive">{setupError}</p>}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((val, idx) => {
                if (val === "") return <div key={idx} />;
                if (val === "del") {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (setupStep === "enter") setFirstPin((p) => p.slice(0, -1));
                        else setConfirmPin((p) => p.slice(0, -1));
                      }}
                      className="tap flex items-center justify-center rounded-2xl border-2 border-border bg-card py-4 text-sm font-bold text-muted-foreground"
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
                      if (setupStep === "enter") handleSetupFirstPin(val);
                      else handleSetupConfirmPin(val);
                    }}
                    className="tap flex items-center justify-center rounded-2xl border-2 border-border bg-card py-4 text-2xl font-bold text-foreground shadow-sm active:bg-secondary"
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Honest Security Disclaimer */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground leading-relaxed">
            <p className="flex items-start gap-2">
              <ShieldAlert className="size-4 shrink-0 text-warning mt-0.5" />
              <span>{t("vault.disclaimer")}</span>
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------- Render Case 2: Locked Screen (PIN Entry) ----------------
  // When locked, show NO file names, counts, or previews anywhere! Just "My documents".
  if (!unlocked) {
    return (
      <AppShell>
        <div className="flex flex-col gap-5 pb-8 pt-2">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link
              to="/settings"
              aria-label={t("common.back", "Back")}
              className="tap grid size-12 place-items-center rounded-2xl bg-secondary text-foreground"
            >
              <ArrowLeft className="size-6" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{t("vault.lockedTitle")}</h1>
            </div>
          </div>

          <div className="card-soft flex flex-col items-center gap-4 p-6 mt-2">
            <div className="grid size-16 place-items-center rounded-3xl bg-secondary text-primary">
              <Lock className="size-8" />
            </div>

            <p className="text-sm font-bold text-foreground">{t("vault.enterPin")}</p>

            {/* PIN Dots */}
            <div className="flex items-center gap-4 py-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`size-4 rounded-full border-2 transition-all ${
                    i < pinInput.length
                      ? "border-primary bg-primary scale-110"
                      : "border-muted-foreground/40 bg-transparent"
                  }`}
                />
              ))}
            </div>

            {/* Lockout or Error Banner */}
            {lockedOutSeconds > 0 ? (
              <div className="w-full rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3 text-center text-xs font-bold text-destructive">
                {t("vault.lockedOut", { seconds: lockedOutSeconds })}
              </div>
            ) : unlockError ? (
              <p className="text-xs font-semibold text-destructive">{unlockError}</p>
            ) : null}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((val, idx) => {
                if (val === "") return <div key={idx} />;
                if (val === "del") {
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={lockedOutSeconds > 0}
                      onClick={() => setPinInput((p) => p.slice(0, -1))}
                      className="tap flex items-center justify-center rounded-2xl border-2 border-border bg-card py-4 text-sm font-bold text-muted-foreground disabled:opacity-40"
                    >
                      ←
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={lockedOutSeconds > 0}
                    onClick={() => handleUnlockPin(val)}
                    className="tap flex items-center justify-center rounded-2xl border-2 border-border bg-card py-4 text-2xl font-bold text-foreground shadow-sm active:bg-secondary disabled:opacity-40"
                  >
                    {val}
                  </button>
                );
              })}
            </div>

            {/* Forgot PIN Action */}
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="tap mt-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              {t("vault.forgotPin")}
            </button>
          </div>

          {/* Honest Security Disclaimer */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground leading-relaxed">
            <p className="flex items-start gap-2">
              <ShieldAlert className="size-4 shrink-0 text-warning mt-0.5" />
              <span>{t("vault.disclaimer")}</span>
            </p>
          </div>

          {/* Forgot PIN Confirmation Modal */}
          {showForgotModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="card-soft flex max-w-sm flex-col gap-4 border-2 border-destructive bg-card p-5 shadow-2xl">
                <div className="flex items-center gap-2 text-destructive font-bold text-base">
                  <AlertTriangle className="size-5 shrink-0" />
                  <span>{t("vault.forgotPin")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("vault.resetWarning")}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetVault}
                    className="tap bg-destructive py-3 text-xs font-bold text-destructive-foreground shadow-sm"
                  >
                    {t("vault.resetConfirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="tap rounded-2xl border-2 border-border py-2.5 text-xs font-bold text-foreground"
                  >
                    {t("vault.cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // ---------------- Render Case 3: Unlocked Vault ----------------
  return (
    <AppShell>
      <div className="flex flex-col gap-5 pb-8 pt-2">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/settings"
              onClick={lockVault}
              aria-label={t("common.back", "Back")}
              className="tap grid size-12 place-items-center rounded-2xl bg-secondary text-foreground"
            >
              <ArrowLeft className="size-6" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{t("vault.unlockedTitle")}</h1>
              <p className="text-xs text-muted-foreground">{t("vault.autoLockNotice")}</p>
            </div>
          </div>
          <button
            onClick={lockVault}
            className="tap flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm"
          >
            <Lock className="size-4 text-primary" /> {t("vault.lockNow")}
          </button>
        </div>

        {/* Add Document Section */}
        <section className="card-soft flex items-center justify-between p-4">
          <div>
            <h2 className="text-base font-bold">{t("vault.addDocument")}</h2>
            <p className="text-xs text-muted-foreground">{t("vault.fileTypes")}</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="vault-file-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="tap flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
            >
              <Plus className="size-4" /> {t("vault.addDocument")}
            </button>
          </div>
        </section>

        {/* Documents List */}
        <section className="flex flex-col gap-3">
          {documents.length === 0 ? (
            <div className="card-soft flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid size-16 place-items-center rounded-3xl bg-secondary text-primary">
                <FileCheck className="size-8" />
              </div>
              <p className="text-base font-bold">{t("vault.noDocuments")}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{t("vault.noDocumentsDesc")}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="tap mt-2 flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                <Plus className="size-4" /> {t("vault.addDocument")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => {
                const isImage = doc.type.startsWith("image/");
                const isPdf = doc.type === "application/pdf";

                return (
                  <article
                    key={doc.id}
                    className="card-soft flex items-center gap-3 p-4 border-2 border-border/80"
                  >
                    {/* Thumbnail / Icon */}
                    <div
                      onClick={() => setSelectedDoc(doc)}
                      className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary cursor-pointer overflow-hidden border border-border"
                    >
                      {isImage ? (
                        <img src={doc.dataUrl} alt={doc.name} className="size-full object-cover" />
                      ) : isPdf ? (
                        <FileText className="size-7 text-primary" />
                      ) : (
                        <ImageIcon className="size-7 text-accent" />
                      )}
                    </div>

                    {/* Meta */}
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <h3 className="text-sm font-bold text-foreground truncate">{doc.name}</h3>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(doc.size)}</span>
                        <span>•</span>
                        <span>{doc.createdAt.slice(0, 10)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(doc)}
                        className="tap p-2 text-muted-foreground hover:text-foreground"
                        aria-label={t("vault.viewDoc")}
                      >
                        <Eye className="size-4" />
                      </button>
                      <a
                        href={doc.dataUrl}
                        download={doc.name}
                        className="tap p-2 text-muted-foreground hover:text-primary"
                        aria-label={t("vault.downloadDoc")}
                      >
                        <Download className="size-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="tap p-2 text-muted-foreground hover:text-destructive"
                        aria-label={t("vault.deleteDoc")}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Honest Security Disclaimer */}
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground leading-relaxed mt-2">
          <p className="flex items-start gap-2">
            <ShieldAlert className="size-4 shrink-0 text-warning mt-0.5" />
            <span>{t("vault.disclaimer")}</span>
          </p>
        </div>

        {/* Document Lightbox / Viewer Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
            <div className="flex items-center justify-between pb-3 text-white">
              <p className="text-sm font-bold truncate max-w-[80%]">{selectedDoc.name}</p>
              <div className="flex items-center gap-2">
                <a
                  href={selectedDoc.dataUrl}
                  download={selectedDoc.name}
                  className="tap p-2 text-white/80 hover:text-white"
                >
                  <Download className="size-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="tap p-2 text-white/80 hover:text-white"
                >
                  <X className="size-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-2">
              {selectedDoc.type.startsWith("image/") ? (
                <img
                  src={selectedDoc.dataUrl}
                  alt={selectedDoc.name}
                  className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
                />
              ) : selectedDoc.type === "application/pdf" ? (
                <iframe
                  src={selectedDoc.dataUrl}
                  title={selectedDoc.name}
                  className="size-full rounded-2xl bg-white shadow-2xl"
                />
              ) : (
                <div className="text-white text-center">
                  <FileText className="size-16 mx-auto mb-2 opacity-60" />
                  <p>{selectedDoc.name}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
