import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronDown, HelpCircle, ListChecks, Stethoscope, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import pcosImg from "@/assets/learn-pcos.jpg";
import endoImg from "@/assets/learn-endo.jpg";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn about PCOS and endometriosis — Sakhi" },
      {
        name: "description",
        content:
          "Simple explainers on PCOS/PCOD and endometriosis: signs and when to see a doctor.",
      },
      { property: "og:title", content: "Learn about PCOS and endometriosis — Sakhi" },
      { property: "og:description", content: "Simple explainers: signs and when to see a doctor." },
    ],
  }),
  component: Learn,
});

const cards = [
  { id: "pcos", img: pcosImg },
  { id: "endo", img: endoImg },
] as const;

function Learn() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Record<string, boolean>>({ pcos: true, endo: true });

  const toggle = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const parts = [
    { k: "what", icon: HelpCircle },
    { k: "signs", icon: ListChecks },
    { k: "when", icon: Stethoscope },
  ];

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link
          to="/cycle"
          className="tap inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-primary hover:opacity-85"
        >
          <ArrowLeft className="size-5" /> {t("settings.back")}
        </Link>
      </div>

      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
        {t("learn.title")}
      </h1>

      {/* Side-by-side on desktop (grid-cols-1 md:grid-cols-2) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {cards.map(({ id, img }) => {
          const isOpen = !!open[id];
          return (
            <article
              key={id}
              className="card-soft overflow-hidden border border-border/80 shadow-xs transition-shadow hover:shadow-md"
            >
              <button
                onClick={() => toggle(id)}
                className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-expanded={isOpen}
              >
                <div className="relative overflow-hidden bg-muted">
                  <img
                    src={img}
                    alt=""
                    width={992}
                    height={672}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover transition-transform duration-300 hover:scale-102"
                  />
                </div>
                <div className="flex items-center justify-between p-5 bg-card">
                  <h2 className="text-2xl font-bold text-foreground">{t(`learn.${id}.name`)}</h2>
                  <ChevronDown
                    className={`size-6 text-primary transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-4 px-5 pb-6 pt-1 border-t border-border/40 bg-card">
                  {parts.map(({ k, icon: Icon }) => (
                    <div key={k} className="flex items-start gap-3.5">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent mt-0.5">
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                          {t(`learn.${k}`)}
                        </p>
                        <p className="mt-1 text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {t(`learn.${id}.${k}`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-6 flex items-center gap-2 rounded-2xl bg-muted/40 p-4 text-xs sm:text-sm text-muted-foreground border border-border/60">
        <Info className="size-5 shrink-0 text-primary" />
        <span>{t("learn.note")}</span>
      </p>
    </AppShell>
  );
}
