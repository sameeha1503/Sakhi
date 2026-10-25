import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Flower2,
  CalendarHeart,
  FileText,
  MapPin,
  Award,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Droplets,
  Smile,
  Activity,
  CalendarDays,
  Building2,
  MessageCircleQuestion,
} from "lucide-react";
import i18n, { LANGUAGES, setAppLanguage } from "@/i18n";
import { LanguageSelect } from "@/components/LanguageSelect";
import { prefs } from "@/services/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sakhi: Your women's health friend" },
      {
        name: "description",
        content:
          "Track periods and symptoms, find care near you, discover government schemes and ask health questions in 11 Indian languages.",
      },
      { property: "og:title", content: "Sakhi: Your women's health friend" },
      {
        property: "og:description",
        content:
          "Track periods and symptoms, find care near you, discover government schemes and ask health questions in 11 Indian languages.",
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

  const handleSelectLanguage = (code: string) => {
    setSel(code);
    void setAppLanguage(code);
  };

  const handleGetStarted = () => {
    prefs.setLanguage(sel);
    i18n.changeLanguage(sel);
    navigate({
      to: prefs.consented() ? (prefs.loggedIn() ? "/home" : "/signup") : "/consent",
    });
  };

  const handleAlreadyHaveAccount = () => {
    prefs.setLanguage(sel);
    i18n.changeLanguage(sel);
    if (!prefs.consented()) {
      prefs.setConsent(true);
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sakhi:auth_mode", "login");
    }
    navigate({ to: "/signup" });
  };

  if (!isReady && typeof window !== "undefined" && prefs.language() && prefs.loggedIn()) {
    return <div className="min-h-screen bg-background" />;
  }

  const helpCards = [
    {
      icon: CalendarHeart,
      title: t("landing.patternTitle"),
      desc: t("landing.patternDesc"),
      badgeBorder: "border-accent-teal/40",
      badgeBg: "bg-accent-teal/10",
      badgeColor: "text-accent-teal",
    },
    {
      icon: FileText,
      title: t("landing.doctorTitle"),
      desc: t("landing.doctorDesc"),
      badgeBorder: "border-accent-berry/40",
      badgeBg: "bg-accent-berry/10",
      badgeColor: "text-accent-berry",
    },
    {
      icon: MapPin,
      title: t("landing.careTitle"),
      desc: t("landing.careDesc"),
      badgeBorder: "border-accent-violet/40",
      badgeBg: "bg-accent-violet/10",
      badgeColor: "text-accent-violet",
    },
    {
      icon: Award,
      title: t("landing.schemesTitle"),
      desc: t("landing.schemesDesc"),
      badgeBorder: "border-accent-green/40",
      badgeBg: "bg-accent-green/10",
      badgeColor: "text-accent-green",
    },
  ];

  const privacyPoints = [
    t("landing.privacyPoint1"),
    t("landing.privacyPoint2"),
    t("landing.privacyPoint3"),
    t("landing.privacyPoint4"),
    t("landing.privacyPoint5"),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-card/85 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
              <Flower2 className="size-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-primary leading-none">
                {t("app.name")}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">{t("app.tagline")}</span>
            </div>
          </div>

          {/* Language Selector Dropdown in Header */}
          <LanguageSelect variant="header" onLanguageChange={handleSelectLanguage} />
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Hero Section */}
        <section className="card-soft relative overflow-hidden border border-border/80 p-6 sm:p-10 md:p-12 text-center lg:text-left flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex-1 flex flex-col items-center lg:items-start">
            {/* Benefit Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-primary mb-4">
              <Sparkles className="size-4 shrink-0" />
              <span>{t("landing.heroBadge")}</span>
            </div>

            {/* Benefit Headline (Serif font, no duplicate app name) */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
              {t("landing.heroTitle")}
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t("landing.heroSubtitle")}
            </p>

            {/* Call to Action Buttons */}
            <div className="mt-6 w-full max-w-md flex flex-col items-center lg:items-start gap-2">
              <button
                onClick={handleGetStarted}
                className="tap flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-primary px-8 text-lg sm:text-xl font-bold text-primary-foreground shadow-md hover:bg-primary/95 active:scale-[0.98] transition-all"
              >
                <span>{t("landing.getStarted")}</span>
                <ArrowRight className="size-5 sm:size-6" />
              </button>
              <p className="text-xs text-muted-foreground text-center lg:text-left w-full pl-1">
                {t("landing.getStartedSub")}
              </p>

              <button
                type="button"
                onClick={handleAlreadyHaveAccount}
                className="tap min-h-[44px] flex items-center justify-center text-sm sm:text-base font-semibold text-primary underline hover:opacity-80 transition-opacity mt-2"
              >
                {t("auth.haveAccount")}
              </button>
            </div>

            {/* 11 Indian Languages Chips */}
            <div className="mt-8 w-full max-w-xl text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {t("landing.languagesAvailable")}
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => {
                  const isCurrent = sel === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`tap min-h-[38px] min-w-[44px] px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                        isCurrent
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs ring-2 ring-primary/30"
                          : "bg-card border border-border/80 text-foreground hover:bg-secondary/70"
                      }`}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hero Visual Preview Card (Mock UI Showcase) */}
          <div className="w-full max-w-md shrink-0 lg:max-w-md">
            <div className="rounded-3xl border-2 border-primary/20 bg-secondary/40 p-5 sm:p-6 flex flex-col gap-4 text-left shadow-xs">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {t("landing.exampleLabel")}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("app.name")} preview
                </span>
              </div>

              {/* Mock Today Card */}
              <div className="rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {t("landing.mockToday")}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">9:30 AM</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-accent-berry/10 text-accent-berry border border-accent-berry/20">
                    <Droplets className="size-4" />
                    <span className="font-semibold text-[11px]">{t("landing.mockFlow")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Smile className="size-4" />
                    <span className="font-semibold text-[11px]">{t("landing.mockMood")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                    <Activity className="size-4" />
                    <span className="font-semibold text-[11px]">{t("landing.mockPain")}</span>
                  </div>
                </div>
              </div>

              {/* Mock Mini Month Strip & Next Period */}
              <div className="rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                  <span>S</span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="size-5 grid place-items-center rounded-full bg-accent-berry/20 text-accent-berry text-[10px] font-bold">
                    12
                  </span>
                  <span className="size-5 grid place-items-center rounded-full bg-accent-berry text-primary-foreground text-[10px] font-bold">
                    13
                  </span>
                  <span className="size-5 grid place-items-center rounded-full bg-accent-berry/20 text-accent-berry text-[10px] font-bold">
                    14
                  </span>
                  <span className="size-5 grid place-items-center rounded-full text-foreground/70 text-[10px]">
                    15
                  </span>
                  <span className="size-5 grid place-items-center rounded-full text-foreground/70 text-[10px]">
                    16
                  </span>
                  <span className="size-5 grid place-items-center rounded-full ring-1 ring-primary text-primary font-bold text-[10px]">
                    17
                  </span>
                  <span className="size-5 grid place-items-center rounded-full text-muted-foreground text-[10px]">
                    18
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-xs font-semibold text-primary">
                  <CalendarDays className="size-4 shrink-0" />
                  <span>{t("landing.mockNextPeriod")}</span>
                </div>
              </div>

              {/* Mock Nearest Health Centre */}
              <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-teal/15 text-accent-teal">
                    <Building2 className="size-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground truncate">
                    {t("landing.mockHealthCentre")}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-primary shrink-0">Open</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Cards: How Sakhi Helps Section */}
        <section className="mt-14 sm:mt-20">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              {t("landing.howHelpsTitle")}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              {t("landing.howHelpsSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className={`card-soft flex flex-col gap-4 p-6 border ${card.badgeBorder} bg-card/80 transition-transform hover:-translate-y-1 shadow-xs`}
                >
                  <div
                    className={`grid size-12 place-items-center rounded-2xl ${card.badgeBg} ${card.badgeColor}`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-foreground">{card.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fifth Strip: Ask Sakhi Assistant */}
          <div className="mt-6 rounded-2xl border border-accent-teal/40 bg-accent-teal/10 p-4 sm:p-5 flex items-center gap-4 text-left">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
              <MessageCircleQuestion className="size-6" />
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
              {t("landing.askSakhiStrip")}
            </p>
          </div>
        </section>

        {/* Honest Privacy Section */}
        <section className="mt-14 sm:mt-20 card-soft border border-border/80 p-6 sm:p-10 bg-card/70">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-success/15 text-success">
              <ShieldCheck className="size-7" />
            </div>
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                {t("landing.privacyTitle")}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {privacyPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success mt-0.5">
                  <Check className="size-3.5" />
                </div>
                <span className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Emergency Strip (Always Visible Above Footer) */}
        <section className="mt-10 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <PhoneCall className="size-5" />
            </div>
            <span className="text-sm sm:text-base font-bold text-foreground">
              {t("landing.emergencyText")}
            </span>
          </div>

          <a
            href="tel:108"
            className="tap min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-bold text-destructive-foreground shadow-xs hover:bg-destructive/90 active:scale-95 transition-all"
          >
            <PhoneCall className="size-4" />
            <span>{t("landing.call108")}</span>
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/85 py-6 mt-10">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 text-xs sm:text-sm text-muted-foreground sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Flower2 className="size-4 text-primary shrink-0" />
            <p className="font-medium text-foreground/90">{t("footer.notice")}</p>
          </div>
          <Link
            to="/consent"
            className="tap min-h-[44px] inline-flex items-center font-semibold text-primary underline hover:opacity-80 transition-opacity"
          >
            {t("footer.privacyLink")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
