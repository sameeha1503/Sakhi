import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Stethoscope, Trash2, ShieldCheck } from "lucide-react";
import { prefs } from "@/services/auth";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Privacy — Sakhi" },
      { name: "description", content: "How Sakhi keeps your health notes private." },
      { property: "og:title", content: "Privacy — Sakhi" },
      { property: "og:description", content: "How Sakhi keeps your health notes private." },
    ],
  }),
  component: Consent,
});

function Consent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!prefs.language()) navigate({ to: "/" });
    else if (prefs.consented()) navigate({ to: prefs.loggedIn() ? "/home" : "/signup" });
  }, [navigate]);

  const items = [
    { icon: Lock, text: t("consent.p1") },
    { icon: Stethoscope, text: t("consent.p2") },
    { icon: Trash2, text: t("consent.p3") },
  ];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="card-soft w-full max-w-lg border border-border/80 p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-accent/15 text-accent">
            <ShieldCheck className="size-11" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">{t("consent.title")}</h1>
        </div>

        <div className="mt-6 flex flex-col gap-3.5">
          {items.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-start gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-4 transition-colors"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="text-base text-foreground/90 leading-relaxed pt-1">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={() => {
              prefs.setConsent(true);
              navigate({ to: "/signup" });
            }}
            className="tap flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-primary py-4 text-xl font-bold text-primary-foreground shadow-md hover:bg-primary/95 active:scale-[0.98] transition-all"
          >
            {t("consent.agree")}
          </button>
        </div>
      </div>
    </div>
  );
}
