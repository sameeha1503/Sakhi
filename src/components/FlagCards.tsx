import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Stethoscope, Info } from "lucide-react";
import type { FlagId } from "@/services/cycle";

export function FlagCards({ flags }: { flags: FlagId[] }) {
  const { t } = useTranslation();
  if (!flags.length) return null;
  return (
    <section className="rounded-3xl border-2 border-primary bg-secondary p-5">
      <h2 className="flex items-center gap-3 text-xl font-bold">
        <Stethoscope className="size-8 shrink-0 text-primary" /> {t("flags.title")}
      </h2>
      <p className="mt-2 font-semibold">{t("flags.intro")}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {flags.map((f) => (
          <li key={f} className="rounded-2xl bg-card p-3">
            • {t(`flags.${f}`)}
          </li>
        ))}
      </ul>
      <Link
        to="/care/questions"
        className="tap mt-3.5 flex items-center justify-center gap-2 bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm"
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
