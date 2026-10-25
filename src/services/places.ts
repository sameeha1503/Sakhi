// Live OpenStreetMap Overpass & Location Services for Healthcare Facilities.
// Provides live Overpass queries, progressive radius expansion, OSRM road distance,
// Nominatim manual geocoding, session caching, and graceful offline fallback.

import { storage } from "./storage";
import { SAMPLE_FACILITIES, type SampleFacility, type FacilityType } from "@/data/sampleFacilities";

export type { FacilityType };

export interface Place {
  id: string;
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
  phone: string | null;
  address: string | null;
  town: string;
  district: string;
  state: string;
  operator: string | null;
  isGovernment: boolean;
  emergency: boolean;
  hasWomenHealth: boolean;
  hasGynaecology: boolean; // Backwards-compatible alias
  opening_hours: string | null;
  km: number | null; // Distance in km (straight-line or road)
  roadDistanceKm?: number | null;
  driveTimeMinutes?: number | null;
  isApproxDistance?: boolean; // true if straight-line, false if road distance
}

export type PlaceDataSource = "geoapify" | "saved" | "overpass" | "sample";

export type PlaceFailureReason =
  "unconfigured" | "quota_exceeded" | "unreachable" | "bad_response" | "denied";

export interface FindNearbyResult {
  places: Place[];
  radiusUsedKm: number;
  totalFound: number;
  source: PlaceDataSource;
  isCached: boolean;
  isFallbackSample: boolean;
  liveSearchConfigured?: boolean;
  failureReason?: PlaceFailureReason | null;
  lastUpdated?: string | null;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  name: string;
}

export interface PlaceFilters {
  onlyHospitals?: boolean;
  onlyGynaecology?: boolean;
  type?: FacilityType | "all";
  governmentOnly?: boolean;
}

// Re-export static sample facilities as Place objects for backwards compatibility
export const PLACES: Place[] = SAMPLE_FACILITIES.map((s) => ({
  id: s.id,
  name: s.name,
  type: s.type,
  lat: s.lat,
  lng: s.lng,
  phone: s.phone,
  address: `${s.town}, ${s.district}, ${s.state}`,
  town: s.town,
  district: s.district,
  state: s.state,
  operator: s.isGovernment ? "Government" : null,
  isGovernment: !!s.isGovernment,
  emergency: s.type === "hospital",
  hasWomenHealth: s.hasGynaecology,
  hasGynaecology: s.hasGynaecology,
  opening_hours: null,
  km: null,
  isApproxDistance: true,
}));

// In-memory session cache for Overpass results
const sessionCache = new Map<
  string,
  {
    result: FindNearbyResult;
    timestamp: number;
  }
>();

export function clearPlacesCache(): void {
  sessionCache.clear();
}

// Nominatim Rate Limiter (strictly $\le 1$ request per second as per OSM policy)
let lastNominatimCallTime = 0;

/**
 * Calculates straight-line distance in kilometres using the Haversine formula.
 */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Cleans and normalizes phone numbers into a standard callable representation.
 */
export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  // Pick the first phone if multiple are separated by commas, semicolons, or slashes
  const first = rawPhone.split(/[,;/]/)[0]?.trim();
  if (!first) return null;

  // Strip spaces, dashes, dots, and parentheses
  const cleaned = first.replace(/[\s\-().]/g, "");
  // Must have at least 6 digits to be a credible contact number
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length < 6) return null;

  return cleaned;
}

/**
 * Classifies the healthcare facility type based on OSM tags and name heuristics.
 */
export function classifyFacilityType(tags: Record<string, string>): FacilityType {
  const amenity = tags["amenity"] || "";
  const healthcare = tags["healthcare"] || "";
  const name = tags["name"] || "";

  if (amenity === "hospital" || healthcare === "hospital") {
    return "hospital";
  }

  // Common Indian public health center keywords
  if (
    /CHC|Community Health/i.test(name) ||
    /community_health_centre/i.test(healthcare) ||
    /community_health_centre/i.test(amenity)
  ) {
    return "chc";
  }

  if (
    /Primary Health|PHC|Sub[- ]Centre|Urban Health|Arogya Mandir|Aravind|Basti Dawakhana/i.test(
      name,
    ) ||
    /primary_health_centre/i.test(healthcare) ||
    /primary_health_centre/i.test(amenity)
  ) {
    return "phc";
  }

  return "clinic";
}

/**
 * Determines whether the facility is government/public operated.
 */
export function isGovernmentFacility(tags: Record<string, string>): boolean {
  const operatorType = tags["operator:type"] || "";
  const operator = tags["operator"] || "";
  const name = tags["name"] || "";

  if (operatorType.toLowerCase() === "government" || operatorType.toLowerCase() === "public") {
    return true;
  }

  const govtPattern =
    /govt|government|district|civil|area hospital|general hospital|community health|primary health|phc|chc|arogya mandir|state|ministry|public|zila|zilla/i;

  return govtPattern.test(operator) || govtPattern.test(name);
}

/**
 * Identifies if the facility provides women's health (gynaecology, obstetrics, maternity).
 */
export function hasWomenHealthService(tags: Record<string, string>): boolean {
  const speciality = tags["healthcare:speciality"] || "";
  const description = tags["description"] || "";
  const name = tags["name"] || "";
  const combined = `${speciality} ${description} ${name}`.toLowerCase();

  return (
    combined.includes("gynaecology") ||
    combined.includes("gynecology") ||
    combined.includes("obstetrics") ||
    combined.includes("maternity") ||
    combined.includes("women") ||
    combined.includes("stree") ||
    combined.includes("mahila")
  );
}

/**
 * Formats address pieces from addr:* tags into a human-readable string.
 */
export function formatAddress(tags: Record<string, string>): string | null {
  const parts: string[] = [];

  const street = tags["addr:street"];
  const sub = tags["addr:suburb"] || tags["addr:village"] || tags["addr:locality"];
  const city = tags["addr:city"] || tags["addr:town"];
  const district = tags["addr:district"];
  const postcode = tags["addr:postcode"];

  if (street) parts.push(street);
  if (sub && sub !== street) parts.push(sub);
  if (city && city !== sub) parts.push(city);
  if (district && district !== city) parts.push(district);
  if (postcode) parts.push(postcode);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return tags["operator"] || null;
}

/**
 * Parses raw Overpass JSON elements into structured Place models.
 */
export function parseOverpassElements(
  elements: Array<{
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>,
  userCoords: { lat: number; lng: number },
): Place[] {
  const places: Place[] = [];
  const seenCoordinates = new Set<string>();

  for (const el of elements) {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;

    if (lat == null || lng == null) continue;

    // Deduplicate items mapped as both a node and way at identical coordinates
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seenCoordinates.has(coordKey)) continue;
    seenCoordinates.add(coordKey);

    const name = tags["name"] || tags["name:en"] || tags["name:hi"] || "Health facility";
    const type = classifyFacilityType(tags);
    const isGovt = isGovernmentFacility(tags);
    const hasWomen = hasWomenHealthService(tags);
    const phone = normalizePhone(
      tags["phone"] || tags["contact:phone"] || tags["contact:mobile"] || tags["mobile"],
    );
    const address = formatAddress(tags);
    const town = tags["addr:city"] || tags["addr:town"] || tags["addr:suburb"] || address || "";
    const district = tags["addr:district"] || "";
    const state = tags["addr:state"] || "";
    const emergency = tags["emergency"] === "yes";
    const opening_hours = tags["opening_hours"] || null;

    const straightDist = Number(distanceKm(userCoords, { lat, lng }).toFixed(1));

    places.push({
      id: `${el.type}/${el.id}`,
      name,
      type,
      lat,
      lng,
      phone,
      address,
      town,
      district,
      state,
      operator: tags["operator"] || null,
      isGovernment: isGovt,
      emergency,
      hasWomenHealth: hasWomen,
      hasGynaecology: hasWomen,
      opening_hours,
      km: straightDist,
      isApproxDistance: true,
    });
  }

  return places.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
}

/**
 * Builds the Overpass QL query string for a given coordinate and radius.
 */
function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  return `[out:json][timeout:10];
(
  nwr["amenity"~"hospital|clinic|doctors"](around:${radiusMeters},${lat},${lng});
  nwr["healthcare"~"hospital|clinic|centre|doctor"](around:${radiusMeters},${lat},${lng});
);
out center tags;`;
}

/**
 * Fetches Overpass JSON with a timeout using AbortController.
 */
async function fetchOverpassEndpoint(
  url: string,
  query: string,
  timeoutMs = 10000,
): Promise<{ elements: unknown[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Overpass HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries fetching from primary Overpass endpoint and falls back to mirror if needed.
 */
async function queryOverpass(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<
  Array<{
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>
> {
  const query = buildOverpassQuery(lat, lng, radiusMeters);

  // 1. Primary: overpass-api.de
  try {
    const data = await fetchOverpassEndpoint(
      "https://overpass-api.de/api/interpreter",
      query,
      10000,
    );
    if (Array.isArray(data?.elements)) {
      return data.elements as never;
    }
  } catch (primaryErr) {
    console.warn("[places] Primary Overpass failed or timed out:", primaryErr);
  }

  throw new Error("Primary Overpass endpoint failed or timed out");
}

/**
 * Enriches the top 10 nearest facilities with road distance and drive duration from OSRM.
 * Non-blocking: fails gracefully without interrupting straight-line distance presentation.
 */
async function enrichWithOsrmRoadDistance(
  userCoords: { lat: number; lng: number },
  places: Place[],
): Promise<void> {
  const top10 = places.slice(0, 10);
  if (top10.length === 0) return;

  const coordPairs = [
    `${userCoords.lng},${userCoords.lat}`,
    ...top10.map((p) => `${p.lng},${p.lat}`),
  ].join(";");

  const url = `https://router.project-osrm.org/table/v1/driving/${coordPairs}?sources=0&annotations=distance,duration`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // Fast 4-second timeout

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return;

    const data = await res.json();
    if (
      data?.code === "Ok" &&
      Array.isArray(data.distances?.[0]) &&
      Array.isArray(data.durations?.[0])
    ) {
      const distancesRow: number[] = data.distances[0];
      const durationsRow: number[] = data.durations[0];

      top10.forEach((p, idx) => {
        const distMeters = distancesRow[idx + 1];
        const durSeconds = durationsRow[idx + 1];

        if (distMeters != null && distMeters > 0) {
          p.roadDistanceKm = Number((distMeters / 1000).toFixed(1));
          p.km = p.roadDistanceKm;
          p.isApproxDistance = false;
        }
        if (durSeconds != null && durSeconds > 0) {
          p.driveTimeMinutes = Math.round(durSeconds / 60);
        }
      });
    }
  } catch {
    // Non-blocking: keep straight-line distance with isApproxDistance = true
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches for healthcare facilities near the user coordinates with progressive radius expansion.
 * Attempts 5 km, 10 km, 25 km, and 50 km until at least 8 results are returned.
 * Fallback order:
 * 1. Geoapify (via /api/nearby with progressive radius expansion)
 * 2. Saved results (if user enabled "remember my location")
 * 3. Overpass via overpass-api.de with a short 8-second timeout, tried once
 * 4. Sample data with visible banner
 */
export async function findNearby(
  lat: number,
  lng: number,
  maxRadiusLimitKm = 50,
): Promise<FindNearbyResult> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

  // Check in-memory session cache
  const cached = sessionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 10) {
    return cached.result;
  }

  // 1. Try server-side live healthcare search (/api/nearby powered by Geoapify)
  // Search radii 5, 10, 25, and 50 km and merge everything found (capped at 50 km, true count)
  const radiiKm = [5, 10, 25, 50].filter((r) => r <= Math.min(maxRadiusLimitKm, 50));
  if (radiiKm.length === 0) radiiKm.push(Math.min(maxRadiusLimitKm, 50));

  let geoapifyFailureReason: PlaceFailureReason | null = null;
  const placesMap = new Map<string, Place>();
  let maxRadiusQueried = radiiKm[0]!;

  for (const radiusKm of radiiKm) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const apiUrl = `/api/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm * 1000}`;
      const res = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        if (res.status === 401) {
          geoapifyFailureReason = "unconfigured";
          console.warn(
            "[places] Live search is not configured: GEOAPIFY_API_KEY is invalid or missing.",
          );
        } else if (res.status === 429) {
          geoapifyFailureReason = "quota_exceeded";
          console.warn("[places] Geoapify quota exceeded (429).");
        } else if (res.status === 400) {
          geoapifyFailureReason = "bad_response";
        } else {
          geoapifyFailureReason = "unreachable";
        }
        break; // Stop progressive expansion on error
      }

      const data = (await res.json()) as {
        configured?: boolean;
        places?: Place[];
        radiusUsedKm?: number;
      };

      if (data?.configured === false) {
        geoapifyFailureReason = "unconfigured";
        console.warn(
          "[places] Live search is not configured: GEOAPIFY_API_KEY is missing. " +
            "See README.md to configure your key.",
        );
        break; // Stop progressive expansion
      }

      const found = Array.isArray(data?.places) ? data.places : [];
      for (const p of found) {
        const key = p.id || `${p.name}-${p.lat}-${p.lng}`;
        if (!placesMap.has(key)) {
          placesMap.set(key, p);
        }
      }
      maxRadiusQueried = radiusKm;
      // Do NOT stop at 8! We search through all radii up to 50 km and merge all found facilities.
    } catch {
      geoapifyFailureReason = "unreachable";
      break;
    }
  }

  const geoapifyPlaces = Array.from(placesMap.values()).sort(
    (a, b) => (a.km ?? Infinity) - (b.km ?? Infinity),
  );

  // If Geoapify succeeded and found facilities
  if (geoapifyPlaces.length > 0) {
    await enrichWithOsrmRoadDistance({ lat, lng }, geoapifyPlaces);

    const result: FindNearbyResult = {
      places: geoapifyPlaces,
      radiusUsedKm: maxRadiusQueried,
      totalFound: geoapifyPlaces.length,
      source: "geoapify",
      isCached: false,
      isFallbackSample: false,
      liveSearchConfigured: true,
      failureReason: null,
      lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    sessionCache.set(cacheKey, { result, timestamp: Date.now() });

    if (locationPrefs.isRememberEnabled()) {
      storage.set("cached_places_result", { ...result, isCached: true, source: "saved" });
    }

    return result;
  }

  // 2. Fallback: Saved results (if user enabled "remember my location")
  if (locationPrefs.isRememberEnabled()) {
    const savedCache = storage.get<FindNearbyResult | null>("cached_places_result", null);
    if (savedCache && Array.isArray(savedCache.places) && savedCache.places.length > 0) {
      return {
        ...savedCache,
        source: "saved",
        isCached: true,
        isFallbackSample: false,
        failureReason: geoapifyFailureReason || null,
      };
    }
  }

  // 3. Fallback: Overpass via overpass-api.de with a short 8-second timeout, tried once
  try {
    const overpassQuery = buildOverpassQuery(lat, lng, maxRadiusLimitKm * 1000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { elements?: unknown[] };
      if (Array.isArray(data?.elements) && data.elements.length > 0) {
        const parsed = parseOverpassElements(data.elements as never, { lat, lng });
        if (parsed.length > 0) {
          await enrichWithOsrmRoadDistance({ lat, lng }, parsed);
          const result: FindNearbyResult = {
            places: parsed,
            radiusUsedKm: maxRadiusLimitKm,
            totalFound: parsed.length,
            source: "overpass",
            isCached: false,
            isFallbackSample: false,
            liveSearchConfigured: true,
            failureReason: null,
            lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          sessionCache.set(cacheKey, { result, timestamp: Date.now() });
          return result;
        }
      }
    }
  } catch (overpassErr) {
    console.warn("[places] Overpass single attempt failed or timed out:", overpassErr);
  }

  // 4. Ultimate fallback: sample facilities with visible fallback banner
  const sampleFallbackPlaces: Place[] = SAMPLE_FACILITIES.map((s) => {
    const dist = Number(distanceKm({ lat, lng }, s).toFixed(1));
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      lat: s.lat,
      lng: s.lng,
      phone: s.phone,
      address: `${s.town}, ${s.district}, ${s.state}`,
      town: s.town,
      district: s.district,
      state: s.state,
      operator: s.isGovernment ? "Government" : null,
      isGovernment: !!s.isGovernment,
      emergency: s.type === "hospital",
      hasWomenHealth: s.hasGynaecology,
      hasGynaecology: s.hasGynaecology,
      opening_hours: null,
      km: dist,
      isApproxDistance: true,
    };
  }).sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  return {
    places: sampleFallbackPlaces,
    radiusUsedKm: 50,
    totalFound: sampleFallbackPlaces.length,
    source: "sample",
    isCached: false,
    isFallbackSample: true,
    liveSearchConfigured: geoapifyFailureReason !== "unconfigured",
    failureReason: geoapifyFailureReason || "unreachable",
    lastUpdated: null,
  };
}

/**
 * Searches for a location by query string (village, town, or PIN code) using OpenStreetMap Nominatim.
 * Strictly respects Nominatim usage policy: $\le 1$ request per second.
 */
/**
 * Searches for a location by query string using the server /api/geocode endpoint (Geoapify),
 * with graceful fallback to Nominatim.
 */
export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { configured?: boolean; results?: GeocodingResult[] };
      if (data?.configured === true && Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch {
    // Continue to Nominatim fallback
  }

  return searchLocationNominatim(trimmed);
}

/**
 * Searches for a location by query string (village, town, or PIN code) using OpenStreetMap Nominatim.
 * Strictly respects Nominatim usage policy: $\le 1$ request per second.
 */
export async function searchLocationNominatim(query: string): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Enforce Nominatim 1-second rate limit
  const now = Date.now();
  const timeSinceLast = now - lastNominatimCallTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastNominatimCallTime = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=5&q=${encodeURIComponent(
    trimmed,
  )}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Nominatim HTTP ${res.status}`);
    }

    const data: Array<{ lat: string; lon: string; display_name: string; name?: string }> =
      await res.json();

    return data.map((item) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      name: item.name || item.display_name.split(",")[0] || trimmed,
    }));
  } catch (err) {
    console.warn("[places] Nominatim search failed:", err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Finds the nearest emergency hospital for urgent care, preferring emergency=yes and hospitals.
 */
export async function getNearestEmergencyHospital(coords?: {
  lat: number;
  lng: number;
}): Promise<{ place: Place; isFallbackSample: boolean }> {
  const userLoc = coords || locationPrefs.getSaved() || { lat: 17.4239, lng: 78.5026 };

  try {
    const result = await findNearby(userLoc.lat, userLoc.lng, 25);
    // Prefer emergency=true hospitals first, then any hospital, then nearest
    const emergencyHospital =
      result.places.find((p) => p.emergency && p.type === "hospital") ||
      result.places.find((p) => p.type === "hospital") ||
      result.places[0];

    if (emergencyHospital) {
      return { place: emergencyHospital, isFallbackSample: result.isFallbackSample };
    }
  } catch {
    // continue to sample fallback
  }

  // Sample fallback
  const fallback = nearest(userLoc, true)[0]!;
  return {
    place: {
      ...fallback,
      address: `${fallback.town}, ${fallback.district}`,
      operator: "Government",
      isGovernment: true,
      emergency: true,
      hasWomenHealth: fallback.hasGynaecology,
      opening_hours: null,
      isApproxDistance: true,
    },
    isFallbackSample: true,
  };
}

/**
 * Synchronous nearest facility sorter matching the existing signature for backwards compatibility.
 */
export function nearest(
  from?: { lat: number; lng: number } | null,
  onlyHospitalsOrFilter?: boolean | PlaceFilters,
): (Place & { km: number | null })[] {
  let onlyHospitals = false;
  let onlyGyn = false;
  let govtOnly = false;
  let selectedType: FacilityType | "all" = "all";

  if (typeof onlyHospitalsOrFilter === "boolean") {
    onlyHospitals = onlyHospitalsOrFilter;
  } else if (onlyHospitalsOrFilter) {
    onlyHospitals = !!onlyHospitalsOrFilter.onlyHospitals;
    onlyGyn = !!onlyHospitalsOrFilter.onlyGynaecology;
    govtOnly = !!onlyHospitalsOrFilter.governmentOnly;
    selectedType = onlyHospitalsOrFilter.type ?? "all";
  }

  const list: Place[] = SAMPLE_FACILITIES.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    town: p.town,
    district: p.district,
    state: p.state,
    lat: p.lat,
    lng: p.lng,
    phone: p.phone,
    address: `${p.town}, ${p.district}`,
    operator: p.isGovernment ? "Government" : null,
    isGovernment: !!p.isGovernment,
    emergency: p.type === "hospital",
    hasWomenHealth: p.hasGynaecology,
    hasGynaecology: p.hasGynaecology,
    opening_hours: null,
    km: from ? Number(distanceKm(from, p).toFixed(1)) : null,
    isApproxDistance: true,
  })).filter((p) => {
    if (onlyHospitals && p.type !== "hospital") return false;
    if (selectedType !== "all" && p.type !== selectedType) return false;
    if (onlyGyn && !p.hasWomenHealth) return false;
    if (govtOnly && !p.isGovernment) return false;
    return true;
  });

  if (!from) {
    return list;
  }

  return list.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
}

/**
 * Returns a list of unique towns/cities available in the directory for manual selection.
 */
export function getUniqueTowns(): {
  town: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
}[] {
  const map = new Map<
    string,
    { town: string; district: string; state: string; lat: number; lng: number }
  >();
  for (const p of SAMPLE_FACILITIES) {
    if (!map.has(p.town)) {
      map.set(p.town, {
        town: p.town,
        district: p.district,
        state: p.state,
        lat: p.lat,
        lng: p.lng,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.town.localeCompare(b.town));
}

/**
 * Safe local storage manager for user location preference.
 * Only remembers location if user explicitly toggled "remember my location".
 */
export const locationPrefs = {
  getSaved(): { lat: number; lng: number; label?: string } | null {
    if (!this.isRememberEnabled()) return null;
    return storage.get<{ lat: number; lng: number; label?: string } | null>("saved_location", null);
  },

  setSaved(loc: { lat: number; lng: number; label?: string } | null) {
    if (this.isRememberEnabled() && loc) {
      storage.set("saved_location", loc);
    }
  },

  isRememberEnabled(): boolean {
    return storage.get<boolean>("remember_location", false);
  },

  setRememberEnabled(enabled: boolean) {
    storage.set("remember_location", enabled);
    if (!enabled) {
      storage.remove("saved_location");
      storage.remove("cached_places_result");
    }
  },
};
