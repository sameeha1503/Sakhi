import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, ChevronDown } from "lucide-react";
import type { MedicineExplanation } from "@/services/medicineInfo";
import { getFallbackExplanation } from "@/services/medicineInfo";

export type MedicineExplanationCardProps = {
  name: string;
  info?: MedicineExplanation | null | undefined;
  loading?: boolean | undefined;
  className?: string | undefined;
};

export function MedicineExplanationCard({
  name,
  info,
  loading = false,
  className = "",
}: MedicineExplanationCardProps) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // If loading and no cached info yet, show skeleton placeholder
  if (loading && !info) {
    return (
      <div
        data-testid="medicine-info-skeleton"
        className={`rounded-xl bg-secondary/40 p-2.5 text-sm animate-pulse space-y-1.5 ${className}`}
      >
        <div className="h-4 w-3/4 rounded bg-muted/80"></div>
        <div className="h-3 w-1/3 rounded bg-muted/60"></div>
      </div>
    );
  }

  // Use provided explanation or offline fallback
  const explanation = info ?? (name ? getFallbackExplanation(name, i18n.language) : null);

  if (!explanation) {
    return null;
  }

  // Low confidence: display pharmacist warning without usedFor
  if (explanation.confidence === "low") {
    return (
      <div
        data-testid="medicine-info-low-confidence"
        className={`rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-sm ${className}`}
      >
        <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="font-semibold">{t("medicines.info.notSure")}</p>
        </div>
      </div>
    );
  }

  const hasDetails =
    Boolean(explanation.howUsuallyTaken) ||
    (explanation.commonSideEffects && explanation.commonSideEffects.length > 0) ||
    (explanation.askDoctorIf && explanation.askDoctorIf.length > 0);

  const isFallback = explanation.source === "fallback";

  return (
    <div
      data-testid="medicine-info-card"
      className={`rounded-xl bg-secondary/50 p-2.5 text-sm space-y-1.5 ${className}`}
    >
      <div className="font-semibold text-primary flex items-start gap-1.5">
        <span className="shrink-0" aria-hidden="true">
          💡
        </span>
        <span data-testid="medicine-used-for">{explanation.usedFor}</span>
      </div>

      <p
        data-testid="medicine-info-source"
        className="text-xs text-muted-foreground pl-5 font-medium"
      >
        {isFallback ? t("medicines.info.generalInfoFallback") : t("medicines.info.explainedByAi")}
      </p>

      {hasDetails && (
        <div className="pt-0.5 pl-5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            data-testid="toggle-more-info"
            className="tap inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline py-1"
          >
            <span>{t("medicines.info.moreAbout")}</span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {isExpanded && (
            <div
              data-testid="medicine-more-details"
              className="mt-2 space-y-2 border-t border-border/40 pt-2 text-xs text-foreground"
            >
              {explanation.howUsuallyTaken && (
                <div>
                  <span className="font-bold text-muted-foreground block">
                    {t("medicines.info.howTaken")}:
                  </span>
                  <p className="mt-0.5 text-sm font-medium">{explanation.howUsuallyTaken}</p>
                </div>
              )}
              {explanation.commonSideEffects && explanation.commonSideEffects.length > 0 && (
                <div>
                  <span className="font-bold text-muted-foreground block">
                    {t("medicines.info.sideEffects")}:
                  </span>
                  <ul className="mt-0.5 list-disc list-inside space-y-0.5 text-sm font-medium">
                    {explanation.commonSideEffects.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.askDoctorIf && explanation.askDoctorIf.length > 0 && (
                <div>
                  <span className="font-bold text-muted-foreground block">
                    {t("medicines.info.askDoctor")}:
                  </span>
                  <ul className="mt-0.5 list-disc list-inside space-y-0.5 text-sm font-medium">
                    {explanation.askDoctorIf.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
