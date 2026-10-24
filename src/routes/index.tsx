import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Flower2,
  CalendarHeart,
  HeartPulse,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import i18n from "@/i18n";
import { LanguageSelect } from "@/components/LanguageSelect";
import { prefs } from "@/services/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sakhi — Women's health companion" },
      {
        name: "description",
        content: "Track symptoms, medicines and care in English, Hindi or Telugu.",
      },
      { property: "og:title", content: "Sakhi — Women's health companion" },
      {
        property: "og:description",
        content: "Track symptoms, medicines and care in your language.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sel, setSel] = useState("en");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const l = prefs.language();
    if (l && prefs.consented() && prefs.loggedIn()) {
      navigate({ to: "/home" });
      return;
    }
    if (l) {
      setSel(l);
      i18n.changeLanguage(l);
    }
    setIsReady(true);
  }, [navigate]);

  const handleGetStarted = () => {
    prefs.setLanguage(sel);
    i18n.changeLanguage(sel);
    navigate({
      to: prefs.consented() ? (prefs.loggedIn() ? "/home" : "/signup") : "/consent",
    });
  };

  if (!isReady && typeof window !== "undefined" && prefs.language() && prefs.loggedIn()) {
    return <div className="min-h-screen bg-background" />;
  }

  const features = [
    {
      icon: CalendarHeart,
      title: t("landing.trackTitle"),
      desc: t("landing.trackDesc"),
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: HeartPulse,
      title: t("landing.careTitle"),
      desc: t("landing.careDesc"),
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      icon: MapPin,
      title: t("landing.helpTitle"),
      desc: t("landing.helpDesc"),
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
              <Flower2 className="size-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">{t("app.name")}</span>
          </div>

          {/* Language Selector Dropdown in Header */}
          <LanguageSelect variant="header" onLanguageChange={setSel} />
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Hero Section */}
        <section className="card-soft relative overflow-hidden border border-border/80 p-6 sm:p-10 md:p-12 text-center lg:text-left flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex-1 flex flex-col items-center lg:items-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary mb-4">
              <Sparkles className="size-4" />
              <span>{t("app.tagline")}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              {t("app.name")}
            </h1>

            <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
              {t("landing.heroSubtitle")}
            </p>

            {/* Language Selector Box */}
            <div className="mt-8 w-full max-w-md">
              <label className="block text-sm font-bold text-muted-foreground mb-3 text-left">
                {t("lang.title")}
              </label>
              <LanguageSelect variant="landing" onLanguageChange={setSel} />
            </div>

            {/* Primary Call to Action */}
            <div className="mt-6 w-full max-w-md">
              <button
                onClick={handleGetStarted}
                className="tap flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-primary px-8 text-xl font-bold text-primary-foreground shadow-md hover:bg-primary/95 active:scale-[0.98] transition-all"
              >
                <span>{t("landing.getStarted")}</span>
                <ArrowRight className="size-6" />
              </button>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="w-full max-w-md shrink-0 lg:max-w-md">
            <div className="rounded-3xl border-2 border-primary/20 bg-secondary/50 p-6 sm:p-8 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                  <Flower2 className="size-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{t("app.name")}</h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("landing.privacyHighlight")}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-sm text-foreground/90">
                <div className="flex items-start gap-2.5">
                  <Check className="size-5 shrink-0 text-primary mt-0.5" />
                  <span>{t("landing.trackTitle")}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="size-5 shrink-0 text-primary mt-0.5" />
                  <span>{t("landing.careTitle")}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="size-5 shrink-0 text-primary mt-0.5" />
                  <span>{t("landing.helpTitle")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Column How Sakhi Helps Section */}
        <section className="mt-12 sm:mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">{t("landing.howHelpsTitle")}</h2>
            <p className="mt-2 text-base text-muted-foreground max-w-2xl mx-auto">
              {t("landing.howHelpsSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="card-soft flex flex-col gap-4 p-6 border border-border/60 transition-transform hover:-translate-y-1"
                >
                  <div className={`grid size-14 place-items-center rounded-2xl ${f.bg} ${f.color}`}>
                    <Icon className="size-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Privacy Note Highlight Banner */}
        <section className="mt-12 card-soft border border-border/80 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 bg-card/60">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
            <ShieldCheck className="size-8" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-bold text-foreground">{t("landing.privacyHighlight")}</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {t("landing.privacyHighlightDesc")}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/80 py-6 mt-12">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Flower2 className="size-4 text-primary" />
            <span className="font-semibold text-foreground">{t("footer.allRights")}</span>
          </div>
          <p className="text-center sm:text-right text-xs md:text-sm">
            {t("footer.privacyNotice")}
          </p>
        </div>
      </footer>
    </div>
  );
}
