import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
import { AskSakhiWidget } from "@/components/AskSakhiWidget";

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
  const routerState = useRouterState();
  const [ok, setOk] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const pathname = routerState.location.pathname;
  const isWidgetHidden =
    pathname === "/" ||
    pathname === "/consent" ||
    pathname === "/signup" ||
    pathname === "/urgent" ||
    pathname.startsWith("/share");

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

      {/* Slim Top Bar with App Name on all screen sizes */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo / Name */}
          <Link
            to="/home"
            className="group flex items-center gap-2.5 transition-transform hover:opacity-95"
          >
            <div className="grid size-9 sm:size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-105">
              <Flower2 className="size-5 sm:size-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-primary leading-tight font-serif">
                {t("app.name")}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground hidden sm:block leading-none">
                {t("app.tagline")}
              </span>
            </div>
          </Link>

          {/* Right: Language Selector Dropdown */}
          <div className="flex items-center gap-2">
            <LanguageSelect variant="header" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8 pt-4 pb-28 md:pt-6 md:pb-28">
        {title && <h1 className="mb-4 text-3xl font-bold md:text-4xl">{title}</h1>}
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 py-6 pb-24 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Flower2 className="size-3.5 text-primary" />
            <span className="font-semibold text-foreground">{t("footer.allRights")}</span>
          </div>
          <p>{t("footer.privacyNotice")}</p>
        </div>
      </footer>

      {/* Floating Pill Bottom Navigation (Home, Log, Medicines, Care, Profile) on all screen sizes */}
      <nav
        aria-label="Navigation"
        className="fixed bottom-3 sm:bottom-4 inset-x-0 z-30 flex justify-center px-3 sm:px-4 pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center justify-around sm:justify-center gap-1 sm:gap-2 rounded-full bg-card/95 border border-border shadow-lg backdrop-blur-md px-2.5 sm:px-4 py-1.5 max-w-md w-full">
          {tabs.map(({ to, icon: Icon, key }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-full px-2.5 sm:px-3 py-1 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
              activeProps={{
                className: "bg-primary/10 text-primary font-bold shadow-2xs hover:bg-primary/15",
              }}
            >
              <Icon className="size-5" />
              <span className="leading-tight text-[11px] sm:text-xs truncate max-w-[58px] sm:max-w-none">
                {t(`nav.${key}`)}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Floating Ask Sakhi Widget */}
      {!isWidgetHidden && <AskSakhiWidget />}
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
