import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Siren, Phone, Navigation, Ambulance, MapPin } from "lucide-react";
import { getNearestEmergencyHospital, locationPrefs, type Place } from "@/services/places";
import { goBack } from "@/services/navigation";

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

// Casting Link to accept search params for /care?locate=1 without router type friction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CareLink = Link as any;

function UrgentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const [place, setPlace] = useState<Place | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let didFindLive = false;

    // Timeout after 8 seconds and stop locating
    const timeoutTimer = setTimeout(() => {
      if (!isMounted) return;
      setIsLocating(false);
    }, 8000);

    const checkLiveHospital = async (coords?: { lat: number; lng: number }) => {
      try {
        const res = await getNearestEmergencyHospital(coords);
        if (!isMounted) return;
        const isLive =
          (res.source === "geoapify" || res.source === "saved") && !res.isFallbackSample;
        if (isLive && res.place) {
          didFindLive = true;
          setPlace(res.place);
          setIsLocating(false);
          clearTimeout(timeoutTimer);
        }
      } catch {
        // Ignore error - do not show sample data
      }
    };

    // 1. Try saved location first if available
    const saved = locationPrefs.getSaved();
    if (saved) {
      checkLiveHospital(saved);
    }

    // 2. Try geolocation with 8-second timeout
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (p) => {
          if (!isMounted) return;
          const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
          await checkLiveHospital(coords);
          if (!isMounted) return;
          setIsLocating(false);
          if (didFindLive && locationPrefs.isRememberEnabled()) {
            locationPrefs.setSaved(coords);
          }
        },
        () => {
          if (!isMounted) return;
          setIsLocating(false);
        },
        { timeout: 8000, enableHighAccuracy: true },
      );
    } else {
      if (!saved) {
        setIsLocating(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
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

        {/* 1. 108 Ambulance Call Button - ALWAYS SHOWN FIRST & PROMINENT */}
        <a
          href="tel:108"
          className="tap flex min-h-[64px] items-center justify-center gap-4 rounded-3xl bg-white text-destructive py-5 px-6 text-2xl sm:text-3xl font-extrabold shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.98]"
        >
          <Ambulance className="size-10" />
          <span>{t("urgent.ambulance")}</span>
        </a>

        {/* 2. Direct to Care: Find hospitals near me button */}
        <CareLink
          to="/care"
          search={{ locate: "1" }}
          className="tap flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/40 py-3.5 px-6 text-xl sm:text-2xl font-bold text-white shadow-md transition-all active:scale-[0.98]"
        >
          <MapPin className="size-7 shrink-0" />
          <span>{t("urgent.findHospitals")}</span>
        </CareLink>

        {/* Locating Notice - small calm line, never blocking buttons */}
        {isLocating && !place && (
          <p className="text-center text-sm font-medium text-white/80 animate-pulse">
            {t("urgent.finding")}
          </p>
        )}

        {/* Fallback Line when no live hospital is found */}
        {!isLocating && !place && (
          <div className="rounded-2xl bg-black/20 p-4 text-center">
            <p className="text-base sm:text-lg font-medium text-white/95 leading-relaxed">
              {t("urgent.noLive")}
            </p>
          </div>
        )}

        {/* 3. Nearest Live Emergency Facility Card (ONLY SHOWN FOR LIVE DATA) */}
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

            {/* Link to Care with search param */}
            <div className="mt-4 pt-3 border-t border-border/40 text-center">
              <CareLink
                to="/care"
                search={{ locate: "1" }}
                className="tap min-h-[44px] inline-flex items-center text-sm font-semibold text-primary underline hover:opacity-80 transition-opacity"
              >
                {t("urgent.seeAll")}
              </CareLink>
            </div>
          </div>
        )}

        {/* Back Link & Attribution (attribution only when live place is shown) */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => goBack({ router, navigate, fallback: "/home" })}
            className="tap inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white/20 px-6 py-2.5 text-base font-bold text-white hover:bg-white/30 cursor-pointer"
          >
            {t("urgent.ok")}
          </button>
          {place && <p className="text-xs text-white/70">{t("urgent.osmAttribution")}</p>}
        </div>
      </div>
    </div>
  );
}
