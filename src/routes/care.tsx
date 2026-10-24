import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, ComponentType, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Phone,
  Navigation,
  Stethoscope,
  Building2,
  HeartPulse,
  FileQuestion,
  CalendarDays,
  FileText,
  ShieldAlert,
  Sparkles,
  Check,
  Search,
  RefreshCw,
  AlertTriangle,
  Locate,
  Clock,
  Car,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  findNearby,
  searchLocationNominatim,
  locationPrefs,
  type Place,
  type FindNearbyResult,
  type GeocodingResult,
} from "@/services/places";
import type { HospitalMapProps } from "@/components/HospitalMap";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "Find Care & Hospitals — Sakhi" },
      {
        name: "description",
        content: "Nearest live government hospitals, maternity centers and PHCs via OpenStreetMap.",
      },
      { property: "og:title", content: "Find Care & Hospitals — Sakhi" },
      {
        property: "og:description",
        content: "Nearest live government hospitals, maternity centers and PHCs via OpenStreetMap.",
      },
    ],
  }),
  component: CarePage,
});

type FilterCategory = "all" | "hospital" | "centre" | "government" | "womenHealth";

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
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Live Overpass API results state
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [nearbyResult, setNearbyResult] = useState<FindNearbyResult | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Manual Geocoding Search state (Nominatim)
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  // Load facilities for coordinates
  const fetchPlacesForLocation = async (lat: number, lng: number) => {
    setLoadingPlaces(true);
    try {
      const result = await findNearby(lat, lng, 50);
      setNearbyResult(result);
    } catch (err) {
      console.error("[care] Failed to fetch nearby places:", err);
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Initialize saved location preference or attempt geolocation
  useEffect(() => {
    const isRemember = locationPrefs.isRememberEnabled();
    setRememberLoc(isRemember);

    if (isRemember) {
      const saved = locationPrefs.getSaved();
      if (saved) {
        setUserLoc(saved);
        fetchPlacesForLocation(saved.lat, saved.lng);
        return;
      }
    }

    // Default: try geolocation on load
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geolocation request handler
  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(t("care.geoError"));
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Current location",
        };
        setUserLoc(coords);
        setLocating(false);
        if (rememberLoc) {
          locationPrefs.setSaved(coords);
        }
        fetchPlacesForLocation(coords.lat, coords.lng);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          // Permission denied
          setGeoError(t("care.geoDenied"));
        } else {
          setGeoError(t("care.geoError"));
        }
        setShowSearchBox(true);

        // Fallback to default coordinates if no location has been selected yet
        if (!userLoc) {
          const defaultLoc = { lat: 17.385, lng: 78.486, label: "Telangana" };
          setUserLoc(defaultLoc);
          fetchPlacesForLocation(defaultLoc.lat, defaultLoc.lng);
        }
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Manual Nominatim search handler
  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchMessage(null);
    setSearchResults([]);

    try {
      const results = await searchLocationNominatim(query);
      if (results.length === 0) {
        setSearchMessage(t("care.noSearchResults"));
      } else {
        setSearchResults(results);
      }
    } catch {
      setSearchMessage(t("care.noSearchResults"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: GeocodingResult) => {
    const newLoc = { lat: item.lat, lng: item.lng, label: item.name };
    setUserLoc(newLoc);
    setSearchResults([]);
    setShowSearchBox(false);
    setSearchQuery(item.name);
    setGeoError(null);

    if (rememberLoc) {
      locationPrefs.setSaved(newLoc);
    }

    fetchPlacesForLocation(item.lat, item.lng);
  };

  const handleToggleRemember = (enabled: boolean) => {
    setRememberLoc(enabled);
    locationPrefs.setRememberEnabled(enabled);
    if (enabled && userLoc) {
      locationPrefs.setSaved(userLoc);
    }
  };

  // Filter facilities based on category
  const filteredFacilities = useMemo(() => {
    if (!nearbyResult?.places) return [];

    return nearbyResult.places.filter((p) => {
      if (activeFilter === "hospital") return p.type === "hospital";
      if (activeFilter === "centre") return p.type === "phc" || p.type === "chc";
      if (activeFilter === "government") return p.isGovernment;
      if (activeFilter === "womenHealth") return p.hasWomenHealth || p.hasGynaecology;
      return true;
    });
  }, [nearbyResult, activeFilter]);

  const nearestPlace = filteredFacilities.length > 0 ? filteredFacilities[0] : null;

  return (
    <AppShell title={t("care.title")}>
      <div className="flex flex-col gap-6 pt-1">
        {/* Offline / Sample / Cache Banners */}
        {nearbyResult?.isFallbackSample && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border-2 border-warning/40 bg-warning-tint p-4 text-sm font-semibold text-warning shadow-xs"
          >
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <p className="flex-1">{t("care.sampleDataBanner")}</p>
          </div>
        )}

        {nearbyResult?.isCached && !nearbyResult.isFallbackSample && (
          <div
            role="status"
            className="flex items-center gap-2.5 rounded-2xl border border-muted bg-muted/40 p-3 text-xs font-semibold text-muted-foreground"
          >
            <Clock className="size-4 shrink-0 text-primary" />
            <p>{t("care.cachedDataBanner", { time: nearbyResult.lastUpdated || "earlier" })}</p>
          </div>
        )}

        {geoError && (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <p className="font-semibold">{geoError}</p>
            <button
              onClick={() => setShowSearchBox(true)}
              className="tap inline-flex shrink-0 items-center justify-center rounded-xl bg-destructive px-3.5 py-1.5 text-xs font-bold text-destructive-foreground shadow-xs"
            >
              {t("care.searchButton")}
            </button>
          </div>
        )}

        {/* Location Action Header */}
        <section className="card-soft border border-border/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <MapPin className="size-5 shrink-0" />
                <span className="truncate">
                  {userLoc?.label === "Current location"
                    ? t("care.locationActive")
                    : userLoc?.label || "Location detected"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {t("care.geoReason")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={requestLocation}
                disabled={locating}
                className="tap flex min-h-[44px] items-center gap-2 rounded-2xl border-2 border-primary/40 bg-card px-4 py-2 text-sm font-bold text-primary shadow-xs hover:bg-primary/5 active:scale-95 transition-all"
              >
                <Locate className="size-4" />
                <span>{locating ? t("care.findingCare") : t("care.useLocation")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSearchBox(!showSearchBox)}
                className="tap flex min-h-[44px] items-center gap-2 rounded-2xl border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-xs hover:border-primary/40 active:scale-95 transition-all"
              >
                <Search className="size-4 text-muted-foreground" />
                <span>{t("care.changeLocation")}</span>
              </button>
            </div>
          </div>

          {/* Manual Nominatim Search Box */}
          {showSearchBox && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("care.searchPlaceholder")}
                    className="tap w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-base outline-none focus:border-primary shadow-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="tap flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xs hover:bg-primary/95 disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>{t("care.searching")}</span>
                    </>
                  ) : (
                    <span>{t("care.searchButton")}</span>
                  )}
                </button>
              </form>

              {searchMessage && (
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{searchMessage}</p>
              )}

              {searchResults.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
                  {searchResults.map((item, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="tap flex w-full min-h-[44px] items-start gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-primary/10 active:bg-primary/20 transition-colors"
                      >
                        <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground line-clamp-2">{item.displayName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Remember Location Toggle */}
          <label className="mt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground cursor-pointer pt-3 border-t border-border/40">
            <span>{t("care.rememberLoc")}</span>
            <input
              type="checkbox"
              checked={rememberLoc}
              onChange={(e) => handleToggleRemember(e.target.checked)}
              className="size-4 accent-primary cursor-pointer"
            />
          </label>
        </section>

        {/* Nearest Facility Banner (if available) */}
        {nearestPlace && (
          <section className="card-soft relative overflow-hidden border-2 border-primary bg-primary/5 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-bold text-primary">
                    {t("care.nearestTitle")}
                  </span>
                  {nearestPlace.isGovernment && (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                      {t("care.govtBadge")}
                    </span>
                  )}
                  {(nearestPlace.hasWomenHealth || nearestPlace.hasGynaecology) && (
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent">
                      {t("care.womenDoctorBadge")}
                    </span>
                  )}
                </div>

                <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-foreground truncate">
                  {nearestPlace.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground font-medium">
                  {nearestPlace.address || `${nearestPlace.town}, ${nearestPlace.district}`}
                  {nearestPlace.km != null && (
                    <span className="ml-2 font-bold text-primary">
                      · {nearestPlace.km} km{" "}
                      {nearestPlace.isApproxDistance ? t("care.approx") : `(${t("care.drive")})`}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-row sm:flex-col gap-2.5 shrink-0">
                {nearestPlace.phone ? (
                  <a
                    href={`tel:${nearestPlace.phone}`}
                    className="tap flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xs hover:bg-primary/95"
                  >
                    <Phone className="size-4" /> {t("care.call")}
                  </a>
                ) : (
                  <span className="flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-bold text-muted-foreground bg-muted/40 rounded-2xl">
                    {t("care.phoneNotListed")}
                  </span>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${nearestPlace.lat},${nearestPlace.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tap flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/5"
                >
                  <Navigation className="size-4" /> {t("care.directions")}
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Client-Side Leaflet Map */}
        <section>
          {MapComp ? (
            <MapComp
              places={filteredFacilities}
              userLocation={userLoc}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(p) => setSelectedPlaceId(p.id)}
              labels={{
                call: t("care.call"),
                directions: t("care.directions"),
                gynAvailable: t("care.womenDoctorBadge"),
                phoneNotListed: t("care.phoneNotListed"),
              }}
            />
          ) : (
            <div className="card-soft flex h-72 items-center justify-center text-muted-foreground">
              <MapPin className="mr-2 size-6 animate-pulse text-primary" /> Loading map...
            </div>
          )}
        </section>

        {/* Filter Chips & Radius Count Header */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-foreground">{t("care.allFacilities")}</h2>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                {t("care.radiusSummary", {
                  count: filteredFacilities.length,
                  radius: nearbyResult?.radiusUsedKm ?? 25,
                })}
              </p>
            </div>

            {loadingPlaces && (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-primary animate-pulse">
                <RefreshCw className="size-3.5 animate-spin" /> {t("care.findingCare")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`tap flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                activeFilter === "all"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {t("care.filterAll")}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("hospital")}
              className={`tap flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                activeFilter === "hospital"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              <Building2 className="size-4" />
              {t("care.filterHospitals")}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("centre")}
              className={`tap flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                activeFilter === "centre"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              <HeartPulse className="size-4" />
              {t("care.filterCentres")}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("government")}
              className={`tap flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                activeFilter === "government"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {t("care.filterGovt")}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("womenHealth")}
              className={`tap flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                activeFilter === "womenHealth"
                  ? "border-accent bg-accent text-accent-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:border-accent/40"
              }`}
            >
              <Stethoscope className="size-4" />
              {t("care.filterGyn")}
            </button>
          </div>
        </section>

        {/* Facilities List */}
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFacilities.length === 0 ? (
              <div className="card-soft col-span-full flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Building2 className="size-10 text-muted-foreground/60" />
                <p className="text-base font-semibold">{t("care.noFacilities")}</p>
              </div>
            ) : (
              filteredFacilities.map((place) => (
                <article
                  key={place.id}
                  className="card-soft flex flex-col justify-between gap-3.5 border-2 border-border/80 p-5 transition-all hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                          {t(`care.type.${place.type}`, place.type.toUpperCase())}
                        </span>
                        {place.isGovernment && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {t("care.govtBadge")}
                          </span>
                        )}
                        {(place.hasWomenHealth || place.hasGynaecology) && (
                          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                            {t("care.womenDoctorBadge")}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1.5 text-lg font-bold leading-snug text-foreground">
                        {place.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {place.address || `${place.town}, ${place.district}`}
                      </p>
                    </div>

                    {place.km != null && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary shrink-0">
                        {place.km} km {place.isApproxDistance ? t("care.approx") : t("care.drive")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                    {place.phone ? (
                      <a
                        href={`tel:${place.phone}`}
                        className="tap flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 active:scale-95 transition-all"
                      >
                        <Phone className="size-4" /> {t("care.call")}
                      </a>
                    ) : (
                      <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-muted/40 py-2.5 text-xs font-semibold text-muted-foreground">
                        {t("care.phoneNotListed")}
                      </span>
                    )}

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tap flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 active:scale-95 transition-all"
                    >
                      <Navigation className="size-4" /> {t("care.directions")}
                    </a>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Call Notice & OSM Attribution */}
          <div className="mt-3 flex flex-col gap-1 text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
            <p className="font-medium">ℹ️ {t("care.callNotice")}</p>
            <p className="text-[11px] text-muted-foreground/80">{t("care.osmAttribution")}</p>
          </div>
        </section>

        {/* Doctor Visit & Schemes Links */}
        <section className="mt-4 flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{t("care.hubTitle", "Health services & visits")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/visit"
              search={{ tab: "questions" }}
              className="card-soft tap border border-border/80 flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Stethoscope className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg text-foreground">
                  {t("care.hub.doctorVisitTitle", "Doctor visit")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    "care.hub.doctorVisitDesc",
                    "Prepare questions, log clinic visits, and print summary",
                  )}
                </p>
              </div>
            </Link>

            <Link
              to="/schemes"
              className="card-soft tap border border-border/80 flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5 hover:border-accent/50"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
                <ShieldAlert className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg text-foreground">
                  {t("care.hub.schemesTitle", "Government schemes")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("care.hub.schemesDesc", "Free hospital cover, screening & maternity benefits")}
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
