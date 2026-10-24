import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Siren, Phone, Navigation, Ambulance, AlertTriangle } from "lucide-react";
import { getNearestEmergencyHospital, locationPrefs, type Place } from "@/services/places";

export const Route = createFileRoute("/urgent")({
  head: () => ({
    meta: [
      { title: "Go to a hospital now — Sakhi" },
      { name: "description", content: "Nearest emergency hospital and ambulance call buttons." },
      { property: "og:title", content: "Go to a hospital now — Sakhi" },
      {
        property: "og:description",
        content: "Nearest emergency hospital and ambulance call buttons.",
      },
    ],
  }),
  component: UrgentPage,
});

function UrgentPage() {
  const { t } = useTranslation();
  const [place, setPlace] = useState<Place | null>(null);
  const [isFallbackSample, setIsFallbackSample] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const saved = locationPrefs.getSaved();

    // Fast initial load using saved location or default
    getNearestEmergencyHospital(saved || undefined)
      .then((res) => {
        if (!isMounted) return;
        setPlace(res.place);
        setIsFallbackSample(res.isFallbackSample);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    // Try geolocation with quick 6-second timeout
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
          getNearestEmergencyHospital(coords).then((res) => {
            if (!isMounted) return;
            setPlace(res.place);
            setIsFallbackSample(res.isFallbackSample);
            if (locationPrefs.isRememberEnabled()) {
              locationPrefs.setSaved(coords);
            }
          });
        },
        () => {
          // Keep current/saved place on error
        },
        { timeout: 6000, enableHighAccuracy: true },
      );
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-destructive px-4 py-8 sm:px-6 sm:py-12 text-destructive-foreground flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Urgent Warning Header */}
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

        {/* 1. 108 Ambulance Call Button - ALWAYS SHOWN FIRST */}
        <a
          href="tel:108"
          className="tap flex min-h-[64px] items-center justify-center gap-4 rounded-3xl bg-card py-5 text-2xl sm:text-3xl font-extrabold text-destructive shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.98]"
        >
          <Ambulance className="size-10" />
          <span>{t("urgent.ambulance")}</span>
        </a>

        {/* Fallback Sample Data Warning */}
        {isFallbackSample && (
          <div
            role="status"
            className="flex items-center gap-2.5 rounded-2xl bg-black/25 px-4 py-2.5 text-xs font-semibold text-white/95"
          >
            <AlertTriangle className="size-4 shrink-0 text-warning-tint" />
            <span>{t("urgent.sampleDataNotice")}</span>
          </div>
        )}

        {/* 2. Nearest Emergency Facility Card */}
        {place && (
          <div className="rounded-3xl bg-card p-6 sm:p-8 text-card-foreground shadow-lg border border-white/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("urgent.nearest")}
              </p>
              {place.isGovernment && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                  {t("care.govtBadge")}
                </span>
              )}
            </div>

            <p className="mt-1 text-2xl sm:text-3xl font-bold">{place.name}</p>
            <p className="text-base text-muted-foreground mt-0.5">
              {place.address || `${place.town}, ${place.district}`}
              {place.km != null && (
                <span className="ml-2 font-bold text-primary">
                  · {t("urgent.km", { n: place.km.toFixed(1) })}
                </span>
              )}
            </p>

            {place.km != null && place.km <= 10 && (
              <p className="mt-2 text-sm font-bold text-accent">
                {t("care.nudgeNear", { km: place.km })}
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {place.phone ? (
                <a
                  href={`tel:${place.phone}`}
                  className="tap flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm hover:bg-primary/95"
                >
                  <Phone className="size-5" /> {t("urgent.call")}
                </a>
              ) : (
                <span className="flex min-h-[50px] items-center justify-center rounded-2xl bg-muted/40 text-sm font-semibold text-muted-foreground">
                  {t("care.phoneNotListed")}
                </span>
              )}

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
        )}

        {/* Back Link & OpenStreetMap Attribution */}
        <div className="flex flex-col items-center gap-3">
          <Link
            to="/home"
            className="tap inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white/20 px-6 py-2.5 text-base font-bold text-white hover:bg-white/30"
          >
            {t("urgent.ok")}
          </Link>
          <p className="text-xs text-white/70">{t("urgent.osmAttribution")}</p>
        </div>
      </div>
    </div>
  );
}
