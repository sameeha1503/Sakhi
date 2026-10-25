import { createFileRoute } from "@tanstack/react-router";
import { getGeoapifyApiKey, isGeoapifyConfigured } from "@/lib/server-env";
import type { Place, FacilityType } from "@/services/places";

// In-memory sliding window rate limiter: ~10 requests per minute per client IP
const rateLimitMap = new Map<string, number[]>();

export function isNearbyRateLimited(clientIp: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const history = rateLimitMap.get(clientIp) || [];
  const recent = history.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= maxRequests) {
    rateLimitMap.set(clientIp, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(clientIp, recent);
  return false;
}

// In-memory response cache: 10 minutes TTL, keyed by coordinates rounded to 3 decimals
interface CacheEntry {
  data: unknown;
  timestamp: number;
}
const nearbyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearNearbyCache(): void {
  nearbyCache.clear();
  rateLimitMap.clear();
}

/**
 * Validates whether coordinates fall within India-sized geographic bounds
 * and radius does not exceed 50 km.
 */
export function validateNearbyParams(
  lat: number,
  lng: number,
  radiusMeters: number,
): { valid: boolean; error?: string } {
  if (isNaN(lat) || isNaN(lng) || isNaN(radiusMeters)) {
    return { valid: false, error: "Latitude, longitude and radius must be valid numbers." };
  }
  // India bounds roughly: Latitude 6.0° to 38.5° N, Longitude 68.0° to 98.5° E
  if (lat < 6.0 || lat > 38.5 || lng < 68.0 || lng > 98.5) {
    return {
      valid: false,
      error: "Coordinates must be within India geographic bounds (lat: 6.0-38.5, lng: 68.0-98.5).",
    };
  }
  if (radiusMeters < 50 || radiusMeters > 50000) {
    return { valid: false, error: "Radius must be between 50 meters and 50,000 meters (50 km)." };
  }
  return { valid: true };
}

/**
 * Calculates straight-line distance in kilometres using the Haversine formula.
 */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
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
function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const first = rawPhone.split(/[,;/]/)[0]?.trim();
  if (!first) return null;
  const cleaned = first.replace(/[\s\-().]/g, "");
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length < 6) return null;
  return cleaned;
}

export interface GeoapifyFeature {
  type: string;
  properties: {
    place_id?: string;
    name?: string;
    categories?: string[];
    details?: string[];
    datasource?: {
      raw?: Record<string, string>;
    };
    contact?: {
      phone?: string;
    };
    formatted?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    suburb?: string;
    district?: string;
    operator?: string;
    opening_hours?: string;
    distance?: number;
    lat?: number;
    lon?: number;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat] (GeoJSON: longitude first, then latitude)
  };
}

export function parseGeoapifyPlaces(
  features: GeoapifyFeature[],
  userCoords: { lat: number; lng: number },
): Place[] {
  const places: Place[] = [];
  const seen = new Set<string>();

  for (const feature of features) {
    const props = feature.properties || {};
    const coords = feature.geometry?.coordinates;
    const lng = coords?.[0] ?? props.lon;
    const lat = coords?.[1] ?? props.lat;

    if (lat == null || lng == null) continue;

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = props.name || "Health facility";
    const categories = Array.isArray(props.categories) ? props.categories : [];
    const raw = props.datasource?.raw || {};

    // Classify facility type (hospital, clinic, PHC, or CHC when name matches)
    let type: FacilityType = "clinic";
    if (
      /CHC|Community Health/i.test(name) ||
      raw["healthcare"] === "community_health_centre" ||
      raw["amenity"] === "community_health_centre"
    ) {
      type = "chc";
    } else if (
      /PHC|Primary Health|Sub[- ]Centre|Urban Health|Arogya Mandir|Aravind|Basti Dawakhana/i.test(
        name,
      ) ||
      raw["healthcare"] === "primary_health_centre" ||
      raw["amenity"] === "primary_health_centre"
    ) {
      type = "phc";
    } else if (
      categories.includes("healthcare.hospital") ||
      raw["amenity"] === "hospital" ||
      raw["healthcare"] === "hospital" ||
      /Hospital/i.test(name)
    ) {
      type = "hospital";
    }

    // Government facility detection
    const operator = props.operator || raw["operator"] || "";
    const isGovt =
      raw["operator:type"] === "government" ||
      raw["operator:type"] === "public" ||
      /govt|government|district|civil|area hospital|general hospital|community health|primary health|phc|chc|arogya mandir|state|ministry|public|zila|zilla/i.test(
        `${operator} ${name}`,
      );

    // Women's health / gynaecology detection (ONLY when explicitly mentions gynaecology, obstetrics or maternity)
    const combinedSpeciality =
      `${props.categories?.join(" ") || ""} ${props.details?.join(" ") || ""} ${raw["healthcare:speciality"] || ""} ${raw["description"] || ""} ${name}`.toLowerCase();
    const hasWomen =
      combinedSpeciality.includes("gynaecology") ||
      combinedSpeciality.includes("gynecology") ||
      combinedSpeciality.includes("obstetrics") ||
      combinedSpeciality.includes("maternity");

    const rawPhone =
      props.contact?.phone || raw["phone"] || raw["contact:phone"] || raw["mobile"] || null;
    const phone = normalizePhone(rawPhone);
    const address = props.formatted || props.address_line2 || props.address_line1 || null;
    const town =
      props.city || props.suburb || raw["addr:city"] || raw["addr:town"] || address || "";
    const district = props.district || props.county || raw["addr:district"] || "";
    const state = props.state || raw["addr:state"] || "";
    const emergency = type === "hospital" || raw["emergency"] === "yes";
    const opening_hours = props.opening_hours || raw["opening_hours"] || null;

    // Use Geoapify distance if present, otherwise calculate straight-line distance
    const distMeters = typeof props.distance === "number" ? props.distance : null;
    const km =
      distMeters != null
        ? Number((distMeters / 1000).toFixed(1))
        : Number(distanceKm(userCoords, { lat, lng }).toFixed(1));

    places.push({
      id: props.place_id || `geoapify/${lat.toFixed(4)},${lng.toFixed(4)}`,
      name,
      type,
      lat,
      lng,
      phone,
      address,
      town,
      district,
      state,
      operator: operator || (isGovt ? "Government" : null),
      isGovernment: isGovt,
      emergency,
      hasWomenHealth: hasWomen,
      hasGynaecology: hasWomen,
      opening_hours,
      km,
      isApproxDistance: true,
    });
  }

  return places.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
}

export const Route = createFileRoute("/api/nearby")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const configured = isGeoapifyConfigured();
        const url = new URL(request.url);
        const latParam = url.searchParams.get("lat");
        const lngParam = url.searchParams.get("lng");
        const radiusParam = url.searchParams.get("radius");

        // Service status check when no coordinates are passed
        if (!latParam || !lngParam) {
          return Response.json({
            status: "ok",
            service: "Nearby Facilities API",
            configured,
          });
        }

        // If key is not configured, inform client safely without leaking any secrets
        if (!configured) {
          return Response.json({
            status: "ok",
            configured: false,
            message: "Live search is not configured",
            places: [],
          });
        }

        // Rate limiting check per client IP
        const forwarded = request.headers.get("x-forwarded-for");
        const clientIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "127.0.0.1") : "127.0.0.1";
        if (isNearbyRateLimited(clientIp, 10, 60000)) {
          return Response.json(
            {
              error: "rate_limited",
              code: "rate_limited",
              fallback: true,
              message: "Too many requests. Please wait a minute.",
            },
            { status: 429 },
          );
        }

        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        let radiusMeters = radiusParam ? parseFloat(radiusParam) : 50000;
        // Normalize radius if passed in kilometers
        if (radiusMeters > 0 && radiusMeters <= 50) {
          radiusMeters = radiusMeters * 1000;
        }

        // Validate coordinates and radius
        const validation = validateNearbyParams(lat, lng, radiusMeters);
        if (!validation.valid) {
          return Response.json(
            {
              error: "invalid_parameters",
              message: validation.error,
              configured: true,
              places: [],
            },
            { status: 400 },
          );
        }

        // Check 10-minute cache (keyed by coordinates rounded to 3 decimals)
        const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMeters}`;
        const cached = nearbyCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return Response.json(cached.data);
        }

        const apiKey = getGeoapifyApiKey();
        if (!apiKey) {
          return Response.json({
            status: "ok",
            configured: false,
            message: "Live search is not configured",
            places: [],
          });
        }

        try {
          // Geoapify healthcare categories: hospitals, clinics, doctor practices
          // Note: Geoapify filters use LONGITUDE first, then LATITUDE (lon,lat)
          const categories = "healthcare.hospital,healthcare.clinic_or_praxis";
          const geoapifyUrl = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lng},${lat},${radiusMeters}&bias=proximity:${lng},${lat}&limit=40&apiKey=${encodeURIComponent(
            apiKey,
          )}`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(geoapifyUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            console.warn(`[nearby-api] Geoapify responded with status ${res.status}`);
            if (res.status === 401) {
              return Response.json(
                {
                  status: "error",
                  code: "invalid_key",
                  error: "Invalid Geoapify API key",
                  fallback: true,
                  places: [],
                },
                { status: 401 },
              );
            }
            if (res.status === 429) {
              return Response.json(
                {
                  status: "error",
                  code: "quota_exceeded",
                  error: "Geoapify quota exceeded",
                  fallback: true,
                  places: [],
                },
                { status: 429 },
              );
            }
            return Response.json(
              {
                status: "error",
                code: "service_unreachable",
                error: "upstream_error",
                fallback: true,
                places: [],
              },
              { status: res.status >= 500 ? 502 : res.status },
            );
          }

          const data = (await res.json()) as { features?: GeoapifyFeature[] };
          const features = Array.isArray(data?.features) ? data.features : [];
          const places = parseGeoapifyPlaces(features, { lat, lng });

          const responsePayload = {
            status: "ok",
            configured: true,
            places,
            totalFound: places.length,
            radiusUsedKm: Math.round(radiusMeters / 1000),
          };

          // Store in cache for 10 minutes
          nearbyCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });

          return Response.json(responsePayload);
        } catch (err: unknown) {
          const isTimeout =
            err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
          console.warn("[nearby-api] Request failed:", isTimeout ? "Timeout" : err);
          return Response.json(
            {
              status: "error",
              code: "service_unreachable",
              configured: true,
              error: isTimeout ? "timeout" : "network_error",
              fallback: true,
              places: [],
            },
            { status: isTimeout ? 504 : 502 },
          );
        }
      },
    },
  },
  component: () => null,
});
