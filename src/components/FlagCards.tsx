import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Stethoscope, Info } from "lucide-react";
import type { FlagId } from "@/services/cycle";

export function FlagCards({ flags }: { flags: FlagId[] }) {
  const { t } = useTranslation();
  if (!flags.length) return null;
  return (
    <section className="rounded-3xl border-2 border-warning/40 bg-warning-tint p-5 text-foreground shadow-xs">
      <h2 className="flex items-center gap-3 text-xl font-bold text-foreground">
        <Stethoscope className="size-8 shrink-0 text-warning" /> {t("flags.title")}
      </h2>
      <p className="mt-2 font-semibold text-foreground/90">{t("flags.intro")}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {flags.map((f) => (
          <li
            key={f}
            className="rounded-2xl bg-card border border-warning/30 p-3 text-foreground font-medium"
          >
            • {t(`flags.${f}`)}
          </li>
        ))}
      </ul>
      <Link
        to="/care/questions"
        className="tap mt-3.5 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-xs transition-transform hover:scale-[1.01] active:scale-[0.98]"
      >
        <Stethoscope className="size-4" />
        {t("flags.prep")}
      </Link>
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0 translate-y-0.5" /> {t("flags.disclaimer")}
      </p>
    </section>
  );
}
