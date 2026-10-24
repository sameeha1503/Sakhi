import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Languages, Lock, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LanguageSelect } from "@/components/LanguageSelect";
import { storage } from "@/services/storage";
import { vaultService } from "@/services/vault";
import { demoService } from "@/services/demo";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Sakhi" },
      { name: "description", content: "Change language, set a PIN or delete your data." },
      { property: "og:title", content: "Settings — Sakhi" },
      { property: "og:description", content: "Change language, set a PIN or delete your data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [demoMsg, setDemoMsg] = useState<string | null>(null);

  useEffect(() => {
    setDemoLoaded(demoService.isDemoLoaded());
  }, []);

  const handleLoadDemo = async () => {
    await demoService.loadDemoProfile();
    setDemoLoaded(true);
    setDemoMsg(t("settings.demoLoadedMsg"));
    setTimeout(() => setDemoMsg(null), 4000);
  };

  const handleClearDemo = async () => {
    await demoService.clearDemoData();
    setDemoLoaded(false);
    setDemoMsg(t("settings.demoClearedMsg"));
    setTimeout(() => setDemoMsg(null), 4000);
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link
          to="/profile"
          className="tap inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-primary hover:opacity-85"
        >
          <ArrowLeft className="size-5" /> {t("settings.back")}
        </Link>
      </div>

      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {t("settings.title")}
      </h1>

      {/* Two-column layout on desktop: section list on left, settings on right */}
      <div className="mt-6 md:grid md:grid-cols-12 md:gap-8 items-start">
        {/* Left Column: Section list / navigation */}
        <aside className="md:col-span-4 lg:col-span-4 sticky top-24">
          <nav className="card-soft border border-border/80 p-3 sm:p-4 flex flex-col gap-1.5 shadow-xs">
            <a
              href="#demo-section"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Sparkles className="size-5 text-accent shrink-0" />
              <span>{t("settings.demoTitle")}</span>
            </a>
            <a
              href="#lang-section"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Languages className="size-5 text-primary shrink-0" />
              <span>{t("settings.language")}</span>
            </a>
            <Link
              to="/vault"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Lock className="size-5 text-accent shrink-0" />
              <span>{t("settings.vault")}</span>
            </Link>
            <a
              href="#danger-section"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base font-semibold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-5 shrink-0" />
              <span>{t("settings.delete")}</span>
            </a>
          </nav>
        </aside>

        {/* Right Column: Setting Sections */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col gap-6 mt-6 md:mt-0">
          {/* Demo Profile Section */}
          <section id="demo-section" className="card-soft border border-border/80 p-6 scroll-mt-24">
            <h2 className="flex items-center gap-3 text-xl font-bold text-foreground">
              <Sparkles className="size-6 text-accent" />
              <span>{t("settings.demoTitle")}</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              {t("settings.demoDesc")}
            </p>

            {demoMsg && (
              <div className="mt-3 rounded-xl bg-primary/10 p-3 text-sm font-semibold text-primary">
                {demoMsg}
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleLoadDemo}
                className="tap flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary p-4 text-base sm:text-lg font-bold text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.98]"
              >
                <Sparkles className="size-5" />
                <span>{t("settings.loadDemo")}</span>
              </button>

              <button
                onClick={handleClearDemo}
                className="tap flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-border p-4 text-base sm:text-lg font-semibold hover:border-primary/40 active:scale-[0.98]"
              >
                <RefreshCw className="size-5 text-muted-foreground" />
                <span>{t("settings.clearDemo")}</span>
              </button>
            </div>
          </section>

          {/* Language Selection Section */}
          <section id="lang-section" className="card-soft border border-border/80 p-6 scroll-mt-24">
            <h2 className="flex items-center gap-3 text-xl font-bold text-foreground">
              <Languages className="size-6 text-primary" />
              <span>{t("settings.language")}</span>
            </h2>
            <div className="mt-4">
              <LanguageSelect variant="settings" />
            </div>
          </section>

          {/* Vault Link Section */}
          <Link
            to="/vault"
            className="card-soft tap border border-border/80 flex min-h-[48px] items-center justify-between p-6 text-xl font-bold text-foreground transition-all hover:border-primary/50"
          >
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Lock className="size-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xl font-bold">{t("settings.vault")}</span>
                <p className="text-xs font-normal text-muted-foreground">Manage your 4-digit PIN</p>
              </div>
            </div>
            <ArrowLeft className="size-5 rotate-180 text-muted-foreground" />
          </Link>

          {/* Delete My Data Section */}
          <section
            id="danger-section"
            className="card-soft border border-border/80 p-6 scroll-mt-24"
          >
            {!confirm ? (
              <button
                onClick={() => setConfirm(true)}
                className="tap flex min-h-[48px] w-full items-center justify-center gap-3 rounded-2xl bg-destructive p-4 text-lg font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90"
              >
                <Trash2 className="size-6" />
                <span>{t("settings.delete")}</span>
              </button>
            ) : (
              <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-5">
                <p className="text-base sm:text-lg font-bold text-foreground">
                  {t("settings.deleteConfirm")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirm(false)}
                    className="tap min-h-[48px] rounded-2xl border-2 border-border bg-card text-base sm:text-lg font-semibold"
                  >
                    {t("settings.no")}
                  </button>
                  <button
                    onClick={async () => {
                      await vaultService.clearAll();
                      await storage.clearAll();
                      i18n.changeLanguage("en");
                      navigate({ to: "/" });
                    }}
                    className="tap min-h-[48px] rounded-2xl bg-destructive text-base sm:text-lg font-bold text-destructive-foreground"
                  >
                    {t("settings.yes")}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
