import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Siren, Phone, Navigation, Ambulance } from "lucide-react";
import { nearest, locationPrefs } from "@/services/places";

export const Route = createFileRoute("/urgent")({
  head: () => ({
    meta: [
      { title: "Go to a hospital now — Sakhi" },
      { name: "description", content: "Nearest hospital and emergency call buttons." },
      { property: "og:title", content: "Go to a hospital now — Sakhi" },
      { property: "og:description", content: "Nearest hospital and emergency call buttons." },
    ],
  }),
  component: Urgent,
});

function Urgent() {
  const { t } = useTranslation();
  const [place, setPlace] = useState(() => {
    const saved = locationPrefs.getSaved();
    return nearest(saved, true)[0]!;
  });

  useEffect(() => {
    // If we have saved location, initialize with it
    const saved = locationPrefs.getSaved();
    if (saved) {
      setPlace(nearest(saved, true)[0]!);
    }

    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPlace(nearest(coords, true)[0]!);
        if (locationPrefs.isRememberEnabled()) {
          locationPrefs.setSaved(coords);
        }
      },
      () => {},
      { timeout: 8000 },
    );
  }, []);

  return (
    <div className="min-h-screen bg-destructive px-4 py-8 sm:px-6 sm:py-12 text-destructive-foreground flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="text-center flex flex-col items-center">
          <div className="grid size-24 place-items-center rounded-3xl bg-white/20 text-white shadow-inner">
            <Siren className="size-14 animate-pulse" />
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("urgent.title")}
          </h1>
          <p className="mt-2 text-lg sm:text-xl text-white/90 max-w-lg leading-relaxed">
            {t("urgent.body")}
          </p>
        </div>

        {/* 108 Ambulance Call Button */}
        <a
          href="tel:108"
          className="tap flex min-h-[64px] items-center justify-center gap-4 rounded-3xl bg-card py-5 text-2xl sm:text-3xl font-extrabold text-destructive shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.98]"
        >
          <Ambulance className="size-10" />
          <span>{t("urgent.ambulance")}</span>
        </a>

        {/* Nearest Facility Card */}
        <div className="rounded-3xl bg-card p-6 sm:p-8 text-card-foreground shadow-lg border border-white/20">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("urgent.nearest")}
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold">{place.name}</p>
          <p className="text-base text-muted-foreground">
            {place.town}
            {place.km != null && ` · ${t("urgent.km", { n: place.km.toFixed(1) })}`}
          </p>
          {place.km != null && place.km <= 10 && (
            <p className="mt-2 text-sm font-bold text-accent">
              {t("care.nudgeNear", { km: place.km })}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <a
              href={`tel:${place.phone}`}
              className="tap flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm hover:bg-primary/95"
            >
              <Phone className="size-5" /> {t("urgent.call")}
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noreferrer"
              className="tap flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-bold text-primary hover:bg-primary/5"
            >
              <Navigation className="size-5" /> {t("urgent.directions")}
            </a>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/cycle"
            className="tap inline-flex items-center justify-center text-lg font-semibold text-white/90 underline hover:text-white"
          >
            {t("urgent.ok")}
          </Link>
        </div>
      </div>
    </div>
  );
}
