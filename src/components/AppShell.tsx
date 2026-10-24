import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  PenLine,
  Pill,
  HeartPulse,
  User,
  WifiOff,
  AlertTriangle,
  X,
  Flower2,
} from "lucide-react";
import { prefs } from "@/services/auth";
import { storage } from "@/services/storage";
import { LanguageSelect } from "@/components/LanguageSelect";

const tabs = [
  { to: "/home", icon: Home, key: "home" },
  { to: "/log", icon: PenLine, key: "log" },
  { to: "/medicines", icon: Pill, key: "medicines" },
  { to: "/care", icon: HeartPulse, key: "care" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefs.language()) navigate({ to: "/" });
    else if (!prefs.consented()) navigate({ to: "/consent" });
    else if (!prefs.loggedIn()) navigate({ to: "/signup" });
    else setOk(true);

    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const unbindStorage = storage.onError((msg) => {
      setStorageError(msg);
    });

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unbindStorage();
    };
  }, [navigate]);

  if (!ok) return <div className="min-h-screen" />;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      {/* Offline banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning px-4 py-2.5 text-center text-sm font-semibold text-warning-foreground shadow-md transition-all"
        >
          <WifiOff className="size-4 shrink-0" />
          <span>{t("offline.banner")}</span>
        </div>
      )}

      {/* Storage quota or error banner */}
      {storageError && (
        <div
          role="alert"
          aria-live="assertive"
          className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-md transition-all"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{storageError}</span>
          </div>
          <button
            onClick={() => setStorageError(null)}
            className="tap rounded-md p-1 hover:bg-black/10 active:scale-95"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Desktop Sticky Header (768px and above) */}
      <header className="sticky top-0 z-40 hidden border-b border-border/80 bg-card/95 backdrop-blur-md md:block">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo / Name */}
          <Link
            to="/home"
            className="group flex items-center gap-3 transition-transform hover:opacity-95"
          >
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-105">
              <Flower2 className="size-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-primary leading-tight">
                {t("app.name")}
              </span>
              <span className="text-xs font-semibold text-muted-foreground hidden lg:block leading-none">
                {t("app.tagline")}
              </span>
            </div>
          </Link>

          {/* Navigation Links in Center / Right */}
          <nav className="flex items-center gap-1 lg:gap-2">
            {tabs.map(({ to, icon: Icon, key }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-base font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                activeProps={{
                  className: "bg-primary/10 text-primary font-bold shadow-2xs hover:bg-primary/15",
                }}
              >
                <Icon className="size-5 shrink-0" />
                <span className="whitespace-nowrap">{t(`nav.${key}`)}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Language Selector Dropdown & Profile Quick Link */}
          <div className="flex items-center gap-3">
            <LanguageSelect variant="header" />

            <Link
              to="/profile"
              className="grid size-10 place-items-center rounded-2xl border-2 border-border text-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
              activeProps={{ className: "border-primary bg-primary/10 text-primary" }}
              aria-label={t("nav.profile")}
            >
              <User className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container - max-w-6xl on desktop, full padding */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:pt-6 md:pb-12">
        {title && <h1 className="mb-4 text-3xl font-bold md:text-4xl">{title}</h1>}
        {children}
      </main>

      {/* Desktop Footer (768px and above) */}
      <footer className="mt-auto hidden border-t border-border/60 bg-card/60 py-6 md:block">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Flower2 className="size-4 text-primary" />
            <span className="font-semibold text-foreground">{t("footer.allRights")}</span>
          </div>
          <p className="text-center sm:text-right text-xs md:text-sm">
            {t("footer.privacyNotice")}
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (Below 768px only) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card md:hidden shadow-lg">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map(({ to, icon: Icon, key }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary font-bold" }}
            >
              <Icon className="size-6" />
              <span className="leading-tight truncate px-0.5">{t(`nav.${key}`)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function ComingSoon({ icon: Icon }: { icon: typeof Home }) {
  const { t } = useTranslation();
  return (
    <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
      <Icon className="size-16 text-primary" />
      <p className="text-muted-foreground">{t("soon")}</p>
    </div>
  );
}
