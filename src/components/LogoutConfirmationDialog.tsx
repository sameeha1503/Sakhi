import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogOut, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authService } from "@/services/auth";

export interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoggedOut?: () => void;
}

export function LogoutConfirmationDialog({
  open,
  onOpenChange,
  onLoggedOut,
}: LogoutConfirmationDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsyncedWarning, setShowUnsyncedWarning] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setShowUnsyncedWarning(false);
    onOpenChange(false);
  };

  const handleConfirmLogout = async (force = false) => {
    setIsSubmitting(true);
    try {
      const res = await authService.performLogout({ force });
      if (!res.success && res.hasUnsynced) {
        setShowUnsyncedWarning(true);
        setIsSubmitting(false);
        return;
      }

      handleClose();
      navigate({ to: "/signup" });
      toast.success(t("auth.loggedOutToast", "You have been logged out"));
      onLoggedOut?.();
    } catch (err) {
      console.warn("[logout] Logout error:", err);
      // Fallback cleanup
      await authService.logOut();
      handleClose();
      navigate({ to: "/signup" });
      toast.success(t("auth.loggedOutToast", "You have been logged out"));
      onLoggedOut?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`grid size-11 place-items-center rounded-2xl ${
                showUnsyncedWarning ? "bg-warning/20 text-warning" : "bg-primary/10 text-primary"
              }`}
            >
              {showUnsyncedWarning ? (
                <AlertTriangle className="size-6" />
              ) : (
                <ShieldCheck className="size-6" />
              )}
            </div>
            <DialogTitle className="text-xl font-bold font-serif text-foreground">
              {showUnsyncedWarning
                ? t("auth.unsyncedWarningTitle", "Unsynced changes")
                : t("auth.logoutConfirmTitle", "Log out of Sakhi?")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
            {showUnsyncedWarning
              ? t("auth.unsyncedWarning", "You have changes that have not synced. Log out anyway?")
              : t(
                  "auth.logoutConfirmBody",
                  "Your data is safe in your account. Log in with your number and PIN to see it again on any phone.",
                )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="tap min-h-[44px] flex-1 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
          >
            {t("auth.stayLoggedIn", "Stay logged in")}
          </button>

          <button
            type="button"
            onClick={() => handleConfirmLogout(showUnsyncedWarning)}
            disabled={isSubmitting}
            className={`tap min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${
              showUnsyncedWarning
                ? "bg-warning text-warning-foreground hover:bg-warning/90"
                : "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            <span>
              {showUnsyncedWarning
                ? t("auth.logoutAnyway", "Log out anyway")
                : t("auth.logOut", "Log out")}
            </span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
