import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  LogOut,
  UserRound,
  Lock,
  ShieldCheck,
  Languages,
  ArrowRight,
  Cloud,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LogoutConfirmationDialog } from "@/components/LogoutConfirmationDialog";
import { authService, type User } from "@/services/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Sakhi" },
      { name: "description", content: "Your Sakhi profile." },
      { property: "og:title", content: "Profile — Sakhi" },
      { property: "og:description", content: "Your Sakhi profile." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState(authService.getAuthMode());
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    setUser(authService.current());
    setAuthMode(authService.getAuthMode());
  }, []);

  return (
    <AppShell title={t("nav.profile")}>
      <div className="md:grid md:grid-cols-12 md:gap-8 items-start mt-2">
        {/* Left Column: User Card & Primary Actions */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4">
          <div className="card-soft border border-border/80 p-6 flex items-center gap-4 shadow-xs">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
              <UserRound className="size-9" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-2xl font-bold text-foreground">
                {user?.name || t("profile.guest")}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.phone ? user.phone : t("profile.guestPhoneNote")}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {authMode === "account" ? (
                  <>
                    <Cloud className="size-3" />
                    <span>{t("profile.accountBadge")}</span>
                  </>
                ) : (
                  <span>{t("profile.guestBadge")}</span>
                )}
              </span>
            </div>
          </div>

          <Link
            to="/settings"
            className="tap card-soft border border-border/80 flex items-center justify-between p-5 text-xl font-bold text-foreground transition-all hover:border-primary/50"
          >
            <div className="flex items-center gap-3.5">
              <Settings className="size-7 text-accent" />
              <span>{t("profile.settings")}</span>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" />
          </Link>

          {authMode === "account" && (
            <button
              type="button"
              onClick={() => setShowLogoutDialog(true)}
              className="tap card-soft border border-border/80 flex w-full items-center justify-between p-5 text-lg font-bold text-muted-foreground hover:text-primary transition-colors hover:border-primary/50 min-h-[44px] rounded-3xl"
            >
              <div className="flex items-center gap-3.5">
                <LogOut className="size-6 text-primary" />
                <span>{t("auth.logOut", "Log out")}</span>
              </div>
              <ArrowRight className="size-5 text-muted-foreground" />
            </button>
          )}

          <LogoutConfirmationDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} />
        </div>

        {/* Right Column: Account & Security Features */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-4 mt-6 md:mt-0">
          <Link
            to="/vault"
            className="card-soft border border-border/80 p-6 flex items-start gap-4 transition-all hover:border-primary/50"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary mt-1">
              <Lock className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground">{t("vault.lockedTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t("profile.vaultDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/settings"
            className="card-soft border border-border/80 p-6 flex items-start gap-4 transition-all hover:border-primary/50"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent mt-1">
              <Languages className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground">{t("settings.language")}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t("profile.langDesc")}
              </p>
            </div>
          </Link>

          <div className="card-soft border border-border/80 p-6 flex items-start gap-4 bg-card/60">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-success/15 text-success mt-1">
              <ShieldCheck className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground">{t("landing.privacyTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t("footer.notice")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
