import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Bell, X, Pill, CalendarHeart } from "lucide-react";
import { toast } from "sonner";
import { medicineService, getCurrentTimeOfDay, type ScheduledDose } from "@/services/medicines";
import { storage } from "@/services/storage";
import { prefs } from "@/services/auth";

const SNOOZE_MS = 20 * 60 * 1000; // 20 minutes

export function DoseReminders() {
  const { t } = useTranslation();
  const [dueDoses, setDueDoses] = useState<ScheduledDose[]>([]);
  const [pmsmaDue, setPmsmaDue] = useState<boolean>(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const [lastNotified, setLastNotified] = useState<number>(0);

  const checkDue = useCallback(() => {
    // Only check if user is logged in
    if (!prefs.loggedIn()) {
      setDueDoses([]);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const schedule = medicineService.getTodaySchedule(today);
    const currentTiming = getCurrentTimeOfDay();

    // Doses are due if they are pending and scheduled for current or earlier timing today
    const order = { morning: 1, afternoon: 2, evening: 3, night: 4 };
    const currentOrder = order[currentTiming];

    const pending = schedule.filter(
      (d) => d.status === "pending" && order[d.timeOfDay] <= currentOrder,
    );

    setDueDoses(pending);

    const isPmsmaEnabled = storage.get<boolean>("pmsma_monthly_reminder", false);
    const isPmsmaDay = isPmsmaEnabled && new Date().getDate() === 9;
    setPmsmaDue(isPmsmaDay);

    const now = Date.now();
    if (pending.length > 0 && now - lastNotified > SNOOZE_MS) {
      setLastNotified(now);

      // Discreet wording only: never name a medicine or condition
      const discreetMsg = t("reminders.discreetTitle");
      const discreetBody = t("reminders.discreetBody");

      // Show toast
      toast(discreetMsg, {
        description: discreetBody,
        icon: <Pill className="size-5 text-primary" />,
      });

      // Show browser notification if user opted in and permission is granted
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        storage.get<boolean>("notify_optin", false)
      ) {
        try {
          new Notification(t("app.name"), {
            body: discreetMsg,
            icon: "/favicon.ico",
          });
        } catch {
          // Ignore notification display failures on unsupported browsers
        }
      }
    }
  }, [t, lastNotified]);

  useEffect(() => {
    // Initial check on mount
    checkDue();

    // Check every minute while app is open
    const interval = setInterval(checkDue, 60000);
    return () => clearInterval(interval);
  }, [checkDue]);

  // If user temporarily dismissed banner
  if (Date.now() < dismissedUntil) {
    return null;
  }

  // If no due doses and no PMSMA reminder
  if (dueDoses.length === 0 && !pmsmaDue) {
    return null;
  }

  // If only PMSMA is due
  if (dueDoses.length === 0 && pmsmaDue) {
    return (
      <aside
        aria-label="PMSMA reminder"
        className="fixed inset-x-0 top-3 z-50 mx-auto w-[92%] max-w-md rounded-2xl border-2 border-primary bg-card p-4 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarHeart className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-foreground">
              {t("schemes.pmsmaReminderTitle")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("schemes.pmsmaReminderDesc")}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/schemes"
              onClick={() => setDismissedUntil(Date.now() + SNOOZE_MS)}
              className="tap rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              {t("schemes.seeSchemes")}
            </Link>
            <button
              onClick={() => setDismissedUntil(Date.now() + SNOOZE_MS)}
              aria-label={t("reminders.dismiss")}
              className="tap p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Dose reminder"
      className="fixed inset-x-0 top-3 z-50 mx-auto w-[92%] max-w-md rounded-2xl border-2 border-primary bg-card p-4 shadow-xl"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Bell className="size-6 animate-bounce" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">{t("reminders.discreetTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("reminders.discreetBody")}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/medicines"
            onClick={() => setDismissedUntil(Date.now() + SNOOZE_MS)}
            className="tap rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
          >
            {t("reminders.bannerAction")}
          </Link>
          <button
            onClick={() => setDismissedUntil(Date.now() + SNOOZE_MS)}
            aria-label={t("reminders.dismiss")}
            className="tap p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * Opt-in button for browser notification API.
 */
export function NotificationOptInButton() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"granted" | "denied" | "default">("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setStatus(Notification.permission);
    }
  }, []);

  const request = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission);
      if (permission === "granted") {
        storage.set("notify_optin", true);
        toast.success(t("reminders.notificationsOn"));
      }
    } catch {
      // Ignore
    }
  };

  if (status === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-success">
        <Bell className="size-4" /> {t("reminders.notificationsOn")}
      </div>
    );
  }

  return (
    <button
      onClick={request}
      className="tap card-soft flex items-center justify-center gap-2 border-2 border-primary/30 p-3 text-base font-semibold text-primary"
    >
      <Bell className="size-5" /> {t("reminders.enableNotifications")}
    </button>
  );
}
