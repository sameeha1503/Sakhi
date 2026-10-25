import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useId } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  Pill,
  HelpCircle,
  Clock,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Info,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  buildShareSnapshot,
  encodeShareUrl,
  decodeShareSnapshot,
  generateQrCodeDataUrl,
  DEFAULT_SHARE_TOGGLES,
  type ShareToggles,
  type AdvisoryExpiryOption,
  type DoctorShareSnapshot,
  type ShareDecodeResult,
} from "@/services/share";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Share with Doctor — Sakhi" },
      {
        name: "description",
        content: "Private, on-device QR medical summary for doctor consultations.",
      },
      { property: "og:title", content: "Share with Doctor — Sakhi" },
      {
        property: "og:description",
        content: "Private, on-device QR medical summary for doctor consultations.",
      },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { t, i18n } = useTranslation();
  const inputId = useId();

  // SSR-safe hash detection: determines if doctor is viewing via fragment
  const [hash, setHash] = useState<string>("");
  const [decodeResult, setDecodeResult] = useState<ShareDecodeResult | null>(null);

  // Generator / Creator state
  const [toggles, setToggles] = useState<ShareToggles>(DEFAULT_SHARE_TOGGLES);
  const [expiryOption, setExpiryOption] = useState<AdvisoryExpiryOption>("24h");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [charCount, setCharCount] = useState<number>(0);
  const [wasTruncated, setWasTruncated] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Read hash on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentHash = window.location.hash;
    setHash(currentHash);

    if (currentHash && currentHash.length > 2) {
      const decoded = decodeShareSnapshot(currentHash);
      setDecodeResult(decoded);
    }

    const handleHashChange = () => {
      const nextHash = window.location.hash;
      setHash(nextHash);
      if (nextHash && nextHash.length > 2) {
        setDecodeResult(decodeShareSnapshot(nextHash));
      } else {
        setDecodeResult(null);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update generated QR code when toggles or expiry change (in creator mode)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hash && hash.length > 2) return; // Doctor view, don't generate

    const origin = window.location.origin;
    const snapshot = buildShareSnapshot(toggles, expiryOption);
    const encoded = encodeShareUrl(snapshot, origin);

    setShareUrl(encoded.url);
    setCharCount(encoded.charCount);
    setWasTruncated(encoded.wasTruncated);

    generateQrCodeDataUrl(encoded.url)
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code generation error:", err));
  }, [toggles, expiryOption, hash]);

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString((i18n.language || "en") + "-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // =========================================================================
  // VIEW 1: DOCTOR READ-ONLY VIEW (when opened via #d=...)
  // =========================================================================
  if (hash && hash.length > 2) {
    if (!decodeResult || !decodeResult.success) {
      return (
        <div className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center">
          <div className="card-soft max-w-md w-full border-2 border-destructive/40 p-6 text-center flex flex-col items-center gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-8" />
            </div>
            <h1 className="text-xl font-bold font-serif text-foreground">
              {t("share.errorTitle", "Unable to open medical record")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {decodeResult?.error === "corrupted"
                ? t(
                    "share.errorCorrupted",
                    "This consultation record is corrupted or incomplete. Please ask the patient to regenerate the QR code.",
                  )
                : t("share.errorInvalid", "No valid patient record found in this link.")}
            </p>
            <Link
              to="/visit"
              search={{ tab: "summary" }}
              className="tap mt-2 rounded-2xl bg-secondary px-5 py-2.5 text-sm font-bold text-secondary-foreground"
            >
              {t("common.back", "Return to Sakhi")}
            </Link>
          </div>
        </div>
      );
    }

    const { data, isExpired, daysRemaining } = decodeResult;

    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-10 font-sans">
        <div className="mx-auto max-w-3xl flex flex-col gap-5">
          {/* Top Bar for Doctor */}
          <div className="no-print flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2 text-primary font-bold text-lg font-serif">
              <span>🌸 Sakhi</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5 rounded-full font-sans">
                {t("share.doctorViewBadge", "Doctor Consultation Record")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="tap flex items-center gap-2 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Printer className="size-4" />
              <span>{t("summary.downloadPdf", "Print / Save PDF")}</span>
            </button>
          </div>

          {/* Advisory Expiry Banner */}
          <div
            className={`rounded-2xl border p-4 text-xs ${
              isExpired
                ? "border-warning/50 bg-warning-tint text-warning font-semibold"
                : "border-primary/30 bg-secondary/50 text-foreground"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isExpired ? (
                <ShieldAlert className="size-5 shrink-0 text-warning mt-0.5" />
              ) : (
                <ShieldCheck className="size-5 shrink-0 text-primary mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {isExpired
                    ? t(
                        "share.expiredNoticeTitle",
                        "This record has passed its advisory expiration date",
                      )
                    : t("share.activeNoticeTitle", "Confidential Consultation Record")}
                </p>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">
                  {isExpired
                    ? t("share.expiredNoticeBody", {
                        date: formatDate(data.expiresAt),
                        defaultValue: `The patient set an advisory expiry of ${formatDate(data.expiresAt)}. Please confirm current symptoms with the patient.`,
                      })
                    : t("share.activeNoticeBody", {
                        days: daysRemaining,
                        defaultValue: `This snapshot was decrypted directly from the patient's phone QR code. Valid for ~${daysRemaining} more days. No patient data is sent to or stored on external servers.`,
                      })}
                </p>
              </div>
            </div>
          </div>

          {/* Patient Overview Card */}
          <div className="card-soft border border-border/80 p-5 bg-card flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold font-serif text-foreground">
                {data.name || t("share.anonymousPatient", "Patient Consultation Summary")}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {t("share.generatedOn", "Generated on")}: {formatDate(data.createdAt)}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              {t("share.onDeviceVerified", "On-device snapshot")}
            </span>
          </div>

          {/* Section 1: Cycle Summary (if included) */}
          {data.cycle && (
            <section className="card-soft border border-border/80 p-5 bg-card">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-3">
                <Calendar className="size-4" />
                <span>{t("summary.timelineTitle", "90-Day Cycle Overview")}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-muted-foreground text-[11px]">
                    {t("summary.cycleOverview", "Average Cycle")}
                  </p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {data.cycle.avgCycleDays} days
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-muted-foreground text-[11px]">
                    {t("summary.flowHighlights", "Bleed Days")}
                  </p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {data.cycle.bleedingDaysCount} days ({data.cycle.heavyBleedingDaysCount} heavy)
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-muted-foreground text-[11px]">
                    {t("summary.painHighlights", "Severe Pain (4+)")}
                  </p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {data.cycle.severePainDaysCount} days
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-muted-foreground text-[11px]">
                    {t("cycle.lastPeriod", "Last Period Start")}
                  </p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {data.cycle.lastPeriodStart ? formatDate(data.cycle.lastPeriodStart) : "None"}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Section 2: Pattern Flags (if included) */}
          {data.flags && data.flags.length > 0 && (
            <section className="card-soft border-2 border-warning/40 bg-warning-tint p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-warning mb-2">
                <AlertTriangle className="size-4" />
                <span>{t("summary.flagsTitle", "Patterns Worth Discussing with Doctor")}</span>
              </h2>
              <ul className="flex flex-col gap-1.5 text-xs">
                {data.flags.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="font-bold text-warning">•</span>
                    <span className="font-semibold text-foreground">{t(`flags.${f}`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Section 3: Current Medicines (if included) */}
          {data.medicines && data.medicines.length > 0 && (
            <section className="card-soft border border-border/80 p-5 bg-card">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-3">
                <Pill className="size-4" />
                <span>{t("summary.medicinesTitle", "Current Medicines")}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.medicines.map((m, idx) => (
                  <div key={idx} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="font-bold text-foreground text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.dose} • {m.timings.map((tId) => t(`medicines.timing.${tId}`)).join(", ")}
                      {" • "}
                      {t(`medicines.food.${m.food}`)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Recent Visits (if included) */}
          {data.visits && data.visits.length > 0 && (
            <section className="card-soft border border-border/80 p-5 bg-card">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-3">
                <Stethoscope className="size-4" />
                <span>{t("summary.visitsTitle", "Recent Consultations")}</span>
              </h2>
              <div className="flex flex-col gap-2.5">
                {data.visits.map((v, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">{v.clinic}</span>
                      <span className="text-muted-foreground">{formatDate(v.date)}</span>
                    </div>
                    <p className="mt-1 font-semibold text-foreground/90">{v.reason}</p>
                    {v.notes && <p className="mt-1 text-muted-foreground">{v.notes}</p>}
                    {v.nextFollowUp && (
                      <p className="mt-1 text-primary font-bold">
                        {t("visits.nextFollowUp")}: {formatDate(v.nextFollowUp)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Patient's Questions (if included) */}
          {data.questions && data.questions.length > 0 && (
            <section className="card-soft border border-border/80 p-5 bg-card">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-3">
                <HelpCircle className="size-4" />
                <span>{t("summary.questionsTitle", "Patient's Questions for Doctor")}</span>
              </h2>
              <ul className="flex flex-col gap-2 text-xs">
                {data.questions.map((q, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/10 p-2.5"
                  >
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-foreground font-medium pt-0.5">{q}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Non-Diagnostic Disclaimer */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
            <Info className="size-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed">
              {t(
                "summary.disclaimer",
                "Sakhi provides descriptive symptom summaries and suggested clinical questions recorded by the user. It does not provide medical diagnoses or prescriptions.",
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: SHARE CREATOR / BUILDER (Patient generates QR code)
  // =========================================================================
  return (
    <AppShell>
      {/* Top back button */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/visit"
          search={{ tab: "summary" }}
          className="tap inline-flex items-center gap-2 text-lg text-primary"
        >
          <ArrowLeft className="size-6" /> {t("settings.back")}
        </Link>
        <span className="text-sm font-semibold text-muted-foreground">
          {t("share.pageTitle", "Share with Doctor")}
        </span>
      </div>

      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">
            {t("share.title", "Share with my doctor")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {t(
              "share.subtitle",
              "Generate a private QR code for your consultation. Your doctor scans it with their phone camera to view your summary — no app installation needed.",
            )}
          </p>
        </div>

        {/* Advisory Privacy Notice */}
        <div className="card-soft border-2 border-primary/20 bg-secondary/40 p-4 text-xs text-foreground flex items-start gap-3">
          <ShieldCheck className="size-5 shrink-0 text-primary mt-0.5" />
          <p className="leading-relaxed">
            <strong>{t("share.zeroCloudTitle", "Zero Cloud Storage")}:</strong>{" "}
            {t(
              "share.zeroCloudBody",
              "All chosen data is compressed directly into the QR code and URL fragment. Nothing is sent to or stored on any server. Anyone who scans this QR code can read the included details.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Toggles & Expiry Options */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Toggles Card */}
            <div className="card-soft border border-border/80 p-5 flex flex-col gap-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{t("share.chooseWhatToInclude", "Choose what to include")}</span>
              </h2>

              <div className="flex flex-col divide-y divide-border/60 text-sm">
                {/* 1. Patient Name */}
                <label className="flex items-center justify-between py-3 cursor-pointer tap">
                  <div>
                    <p className="font-bold text-foreground">
                      {t("share.toggleName", "Include my name")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "share.toggleNameDesc",
                        "Turn off to share anonymously as 'Patient Consultation Summary'",
                      )}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.includeName}
                    onChange={(e) => setToggles({ ...toggles, includeName: e.target.checked })}
                    className="size-5 rounded text-primary focus:ring-primary tap ml-3"
                  />
                </label>

                {/* 2. 90-Day Cycle Overview */}
                <label className="flex items-center justify-between py-3 cursor-pointer tap">
                  <div>
                    <p className="font-bold text-foreground">
                      {t("share.toggleCycle", "90-day cycle summary")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("share.toggleCycleDesc", "Average cycle length, bleeding days, and pain")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.includeCycle}
                    onChange={(e) => setToggles({ ...toggles, includeCycle: e.target.checked })}
                    className="size-5 rounded text-primary focus:ring-primary tap ml-3"
                  />
                </label>

                {/* 3. Pattern Flags */}
                <label className="flex items-center justify-between py-3 cursor-pointer tap">
                  <div>
                    <p className="font-bold text-foreground">
                      {t("share.toggleFlags", "Pattern flags")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "share.toggleFlagsDesc",
                        "Identified patterns worth discussing with a doctor",
                      )}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.includeFlags}
                    onChange={(e) => setToggles({ ...toggles, includeFlags: e.target.checked })}
                    className="size-5 rounded text-primary focus:ring-primary tap ml-3"
                  />
                </label>

                {/* 4. Active Medicines */}
                <label className="flex items-center justify-between py-3 cursor-pointer tap">
                  <div>
                    <p className="font-bold text-foreground">
                      {t("share.toggleMeds", "Active medicines")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("share.toggleMedsDesc", "Current tablets, doses and timings")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.includeMedicines}
                    onChange={(e) => setToggles({ ...toggles, includeMedicines: e.target.checked })}
                    className="size-5 rounded text-primary focus:ring-primary tap ml-3"
                  />
                </label>

                {/* 5. Recent Visits */}
                <label className="flex items-center justify-between py-3 cursor-pointer tap">
                  <div>
                    <p className="font-bold text-foreground">
                      {t("share.toggleVisits", "Recent clinic visits")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("share.toggleVisitsDesc", "Dates, reasons and follow-up advice")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.includeVisits}
                    onChange={(e) => setToggles({ ...toggles, includeVisits: e.target.checked })}
                    className="size-5 rounded text-primary focus:ring-primary tap ml-3"
                  />
                </label>

                {/* 6. Questions */}
                <label className="flex items-center justify-between py-3 cursor-pointer tap">
                  <div>
                    <p className="font-bold text-foreground">
                      {t("share.toggleQuestions", "My questions for the doctor")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "share.toggleQuestionsDesc",
                        "Questions you prepared or ticked for this visit",
                      )}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.includeQuestions}
                    onChange={(e) => setToggles({ ...toggles, includeQuestions: e.target.checked })}
                    className="size-5 rounded text-primary focus:ring-primary tap ml-3"
                  />
                </label>
              </div>
            </div>

            {/* Advisory Expiry Selection */}
            <div className="card-soft border border-border/80 p-5 flex flex-col gap-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>{t("share.advisoryExpiry", "Advisory Expiry Date")}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExpiryOption("24h")}
                  className={`tap rounded-xl border py-3 text-sm font-bold transition-all ${
                    expiryOption === "24h"
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {t("share.expiry24h", "24 hours")}
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryOption("7d")}
                  className={`tap rounded-xl border py-3 text-sm font-bold transition-all ${
                    expiryOption === "7d"
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {t("share.expiry7d", "7 days")}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "share.advisoryExpiryNote",
                  "Note: Advisory expiry warns the doctor when reviewing older links. Real server-side instant revocation requires an optional backend.",
                )}
              </p>
            </div>
          </div>

          {/* Right Column: QR Code & Link Card */}
          <div className="lg:col-span-5 flex flex-col gap-5 sticky top-20">
            <div className="card-soft border-2 border-primary/30 p-6 flex flex-col items-center gap-4 text-center bg-card shadow-sm">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <QrCode className="size-5" />
                <span>{t("share.qrTitle", "Scan for Consultation")}</span>
              </div>

              {/* QR Image */}
              <div className="rounded-2xl border-2 border-primary/20 bg-white p-3 shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Doctor QR Code"
                    className="size-60 object-contain mx-auto"
                  />
                ) : (
                  <div className="size-60 grid place-items-center text-xs text-muted-foreground">
                    {t("share.generatingQr", "Generating QR code...")}
                  </div>
                )}
              </div>

              {/* Character Count & Truncation notice */}
              <div className="w-full text-xs text-muted-foreground flex items-center justify-between border-t border-border/40 pt-2">
                <span>{t("share.payloadSize", "QR payload")}:</span>
                <span
                  className={`font-semibold ${
                    charCount > 1150 ? "text-warning" : "text-foreground"
                  }`}
                >
                  {charCount} / 1200 chars
                </span>
              </div>

              {wasTruncated && (
                <div className="w-full rounded-xl bg-warning-tint border border-warning/40 p-2 text-xs text-warning text-left flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    {t(
                      "share.truncatedNotice",
                      "Older visit notes were trimmed to ensure the QR code scans easily on all cameras.",
                    )}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="tap flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      <span>{t("share.linkCopied", "Link copied!")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>{t("share.copyLink", "Copy consultation link")}</span>
                    </>
                  )}
                </button>

                {shareUrl && (
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="tap flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-secondary/80 py-2.5 text-xs font-bold text-secondary-foreground hover:bg-secondary transition-all"
                  >
                    <ExternalLink className="size-3.5 text-primary" />
                    <span>{t("share.previewDoctorView", "Preview doctor view")}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
