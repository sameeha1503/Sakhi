import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, ComponentType } from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Phone,
  Navigation,
  Stethoscope,
  Building2,
  HeartPulse,
  Filter,
  FileQuestion,
  CalendarDays,
  FileText,
  ShieldAlert,
  Sparkles,
  Check,
  ChevronRight,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  nearest,
  getUniqueTowns,
  locationPrefs,
  type Place,
  type FacilityType,
} from "@/services/places";
import type { HospitalMapProps } from "@/components/HospitalMap";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "Find Care & Hospitals — Sakhi" },
      { name: "description", content: "Nearest government hospitals, maternity centers and PHCs." },
      { property: "og:title", content: "Find Care & Hospitals — Sakhi" },
      {
        property: "og:description",
        content: "Nearest government hospitals, maternity centers and PHCs.",
      },
    ],
  }),
  component: CarePage,
});

function CarePage() {
  const { t } = useTranslation();

  // Client-side only Leaflet Map component loader
  const [MapComp, setMapComp] = useState<ComponentType<HospitalMapProps> | null>(null);

  useEffect(() => {
    import("@/components/HospitalMap").then((mod) => {
      setMapComp(() => mod.HospitalMap);
    });
  }, []);

  // Location state
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [rememberLoc, setRememberLoc] = useState(false);
  const [selectedTown, setSelectedTown] = useState<string>("");
  const [locating, setLocating] = useState(false);

  // Filters
  const [onlyGyn, setOnlyGyn] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FacilityType | "all">("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Initialize saved location preference
  useEffect(() => {
    const isRemember = locationPrefs.isRememberEnabled();
    setRememberLoc(isRemember);
    if (isRemember) {
      const saved = locationPrefs.getSaved();
      if (saved) {
        setUserLoc(saved);
        if (saved.label) setSelectedTown(saved.label);
      }
    }
  }, []);

  // Towns list for manual fallback
  const towns = useMemo(() => getUniqueTowns(), []);

  // Facilities list filtered and sorted by distance
  const facilities = useMemo(() => {
    return nearest(userLoc, {
      onlyHospitals: false,
      onlyGynaecology: onlyGyn,
      type: typeFilter,
    });
  }, [userLoc, onlyGyn, typeFilter]);

  // Nearest facility is the first one in the sorted list
  const nearestPlace = facilities.length > 0 ? facilities[0] : null;

  // Geolocation request handler
  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Current location",
        };
        setUserLoc(coords);
        setSelectedTown("");
        setLocating(false);
        if (rememberLoc) {
          locationPrefs.setSaved(coords);
        }
      },
      () => {
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleTownSelect = (townName: string) => {
    setSelectedTown(townName);
    if (!townName) {
      setUserLoc(null);
      return;
    }
    const found = towns.find((t) => t.town === townName);
    if (found) {
      const loc = { lat: found.lat, lng: found.lng, label: found.town };
      setUserLoc(loc);
      if (rememberLoc) {
        locationPrefs.setSaved(loc);
      }
    }
  };

  const handleToggleRemember = (enabled: boolean) => {
    setRememberLoc(enabled);
    locationPrefs.setRememberEnabled(enabled);
    if (enabled && userLoc) {
      locationPrefs.setSaved(userLoc);
    }
  };

  return (
    <AppShell title={t("care.title")}>
      <div className="flex flex-col gap-6 pt-1">
        {/* Nearest Facility & Location Selector in 2 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nearestPlace && (
            <section className="card-soft relative overflow-hidden border-2 border-primary bg-primary/5 p-5 shadow-sm flex flex-col justify-between">
              <div>
                {nearestPlace.km != null && nearestPlace.km <= 10 && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent">
                    <Sparkles className="size-4" />
                    {t("care.nudgeNear", { km: nearestPlace.km })}
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("care.nearestTitle")}
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-foreground truncate mt-1">
                      {nearestPlace.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {nearestPlace.town}, {nearestPlace.district}
                      {nearestPlace.km != null && ` · ${nearestPlace.km} km`}
                    </p>
                  </div>
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    {nearestPlace.type === "hospital" ? (
                      <Building2 className="size-7" />
                    ) : (
                      <HeartPulse className="size-7" />
                    )}
                  </div>
                </div>

                {nearestPlace.hasGynaecology && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <Stethoscope className="size-4" /> {t("care.gynBadge")}
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <a
                  href={`tel:${nearestPlace.phone}`}
                  className="tap flex items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-xs hover:bg-primary/95"
                >
                  <Phone className="size-5" /> {t("care.call")}
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${nearestPlace.lat},${nearestPlace.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tap flex items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-base font-bold text-primary hover:bg-primary/5"
                >
                  <Navigation className="size-5" /> {t("care.directions")}
                </a>
              </div>
            </section>
          )}

          {/* Location Selector & Privacy Info */}
          <section className="card-soft border border-border/80 flex flex-col justify-between gap-3 p-5 shadow-xs">
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                📍 {t("care.geoReason")}
              </p>

              <div className="grid grid-cols-1 gap-2.5 mt-3">
                <button
                  onClick={requestLocation}
                  disabled={locating}
                  className={`tap flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-base font-bold transition-colors ${
                    userLoc?.label === "Current location"
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-primary/40 bg-card text-primary hover:bg-primary/5"
                  }`}
                >
                  <MapPin className="size-5" />
                  {locating
                    ? "Locating..."
                    : userLoc?.label === "Current location"
                      ? t("care.locationActive")
                      : t("care.locateMe")}
                </button>

                {/* Manual Town Fallback */}
                <div className="relative">
                  <select
                    value={selectedTown}
                    onChange={(e) => handleTownSelect(e.target.value)}
                    className="tap w-full appearance-none rounded-2xl border-2 border-border bg-card px-4 pr-10 text-base font-semibold outline-none focus:border-primary"
                  >
                    <option value="">{t("care.selectTown")}</option>
                    {towns.map((tItem) => (
                      <option key={tItem.town} value={tItem.town}>
                        {tItem.town} ({tItem.district})
                      </option>
                    ))}
                  </select>
                  <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Remember Location Toggle */}
            <label className="mt-2 flex items-center justify-between text-sm font-semibold text-muted-foreground cursor-pointer pt-2 border-t border-border/40">
              <span>{t("care.rememberLoc")}</span>
              <input
                type="checkbox"
                checked={rememberLoc}
                onChange={(e) => handleToggleRemember(e.target.checked)}
                className="size-5 accent-primary cursor-pointer"
              />
            </label>
          </section>
        </div>

        {/* Client-Side Leaflet Map */}
        <section>
          {MapComp ? (
            <MapComp
              places={facilities}
              userLocation={userLoc}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(p) => setSelectedPlaceId(p.id)}
              labels={{
                call: t("care.call"),
                directions: t("care.directions"),
                gynAvailable: t("care.gynBadge"),
              }}
            />
          ) : (
            <div className="card-soft flex h-72 items-center justify-center text-muted-foreground">
              <MapPin className="mr-2 size-6 animate-pulse text-primary" /> Loading map...
            </div>
          )}
        </section>

        {/* Filter Chips */}
        <section className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOnlyGyn(!onlyGyn)}
            className={`tap flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
              onlyGyn
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            <Stethoscope className="size-4" />
            {t("care.filterGyn")}
            {onlyGyn && <Check className="size-3.5" />}
          </button>

          <button
            onClick={() => setTypeFilter(typeFilter === "hospital" ? "all" : "hospital")}
            className={`tap flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
              typeFilter === "hospital"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            <Building2 className="size-4" />
            {t("care.hospitalsOnly")}
          </button>
        </section>

        {/* Facilities List (sorted by distance) - 2 columns on desktop */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("care.allFacilities")}</h2>
            <span className="text-sm font-semibold text-muted-foreground">
              {facilities.length} centers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.length === 0 ? (
              <div className="card-soft col-span-full flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Building2 className="size-10 text-muted-foreground/60" />
                <p className="text-base font-semibold">{t("care.noFacilities")}</p>
              </div>
            ) : (
              facilities.map((place) => (
                <article
                  key={place.id}
                  className="card-soft flex flex-col justify-between gap-3 border p-5 transition-all hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                          {t(`care.type.${place.type}`)}
                        </span>
                        {place.hasGynaecology && (
                          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                            {t("care.gynBadge")}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-lg font-bold leading-tight">{place.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {place.town}, {place.district} ({place.state})
                      </p>
                    </div>
                    {place.km != null && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary shrink-0">
                        {place.km} km
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                    <a
                      href={`tel:${place.phone}`}
                      className="tap flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
                    >
                      <Phone className="size-4" /> {t("care.call")}
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tap flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary hover:bg-primary/5"
                    >
                      <Navigation className="size-4" /> {t("care.directions")}
                    </a>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Doctor Visit Tools Hub - 4 columns on desktop */}
        <section className="mt-4 flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{t("care.hubTitle")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/care/questions"
              className="card-soft tap border border-border/80 flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
                <FileQuestion className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg text-foreground">{t("care.hub.questionsTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("care.hub.questionsDesc")}</p>
              </div>
            </Link>

            <Link
              to="/care/visits"
              className="card-soft tap border border-border/80 flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
                <CalendarDays className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg text-foreground">{t("care.hub.visitsTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("care.hub.visitsDesc")}</p>
              </div>
            </Link>

            <Link
              to="/care/summary"
              className="card-soft tap border border-border/80 flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
                <FileText className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg text-foreground">{t("care.hub.summaryTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("care.hub.summaryDesc")}</p>
              </div>
            </Link>

            <Link
              to="/care/schemes"
              className="card-soft tap border border-border/80 flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent mb-3">
                <ShieldAlert className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg text-foreground">{t("care.hub.schemesTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("care.hub.schemesDesc")}</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
