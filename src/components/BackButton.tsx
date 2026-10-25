import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useContext } from "react";
import { goBack } from "@/services/navigation";
import { BackHandlerContext } from "@/components/BackHandlerContext";
import { cn } from "@/lib/utils";

export interface BackButtonProps {
  className?: string | undefined;
  fallback?: string | undefined;
  onClick?: (() => void) | undefined;
  onBeforeBack?: (() => boolean | void) | undefined;
  ariaLabel?: string | undefined;
  label?: string | undefined;
}

export function BackButton({
  className,
  fallback,
  onClick,
  onBeforeBack,
  ariaLabel,
  label,
}: BackButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const backHandlerCtx = useContext(BackHandlerContext);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Check custom onBeforeBack prop
    if (onBeforeBack) {
      const allowed = onBeforeBack();
      if (allowed === false) return;
    }

    // Check registered handler from context (e.g., unsaved changes in /log)
    if (backHandlerCtx?.registeredHandler) {
      const allowed = backHandlerCtx.registeredHandler();
      if (allowed === false) return;
    }

    goBack({ router, navigate, fallback });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel || t("common.goBack", "Go back")}
      className={cn(
        "tap inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-2xs hover:bg-muted/70 hover:border-border active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
    >
      <ArrowLeft className="size-4 shrink-0 text-primary rtl:rotate-180" />
      <span>{label || t("common.back", "Back")}</span>
    </button>
  );
}
