import { createFileRoute } from "@tanstack/react-router";
import { getGeoapifyApiKey, isGeoapifyConfigured } from "@/lib/server-env";
import type { Place, FacilityType } from "@/services/places";

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

interface GeoapifyFeature {
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
    lat?: number;
    lon?: number;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

function parseGeoapifyPlaces(
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

    // Classify facility type
    let type: FacilityType = "clinic";
    if (
      categories.includes("healthcare.hospital") ||
      raw["amenity"] === "hospital" ||
      raw["healthcare"] === "hospital"
    ) {
      type = "hospital";
    } else if (
      /CHC|Community Health/i.test(name) ||
      raw["healthcare"] === "community_health_centre"
    ) {
      type = "chc";
    } else if (
      /PHC|Primary Health|Sub[- ]Centre|Arogya Mandir/i.test(name) ||
      raw["healthcare"] === "primary_health_centre"
    ) {
      type = "phc";
    }

    // Government detection
    const operator = props.operator || raw["operator"] || "";
    const isGovt =
      raw["operator:type"] === "government" ||
      raw["operator:type"] === "public" ||
      /govt|government|district|civil|area hospital|general hospital|community health|primary health|phc|chc|arogya mandir|public/i.test(
        operator + " " + name,
      );

    // Women's health / gynaecology detection
    const combinedText =
      `${name} ${props.details?.join(" ") || ""} ${raw["healthcare:speciality"] || ""} ${raw["description"] || ""}`.toLowerCase();
    const hasWomen =
      combinedText.includes("gynaecology") ||
      combinedText.includes("gynecology") ||
      combinedText.includes("obstetrics") ||
      combinedText.includes("maternity") ||
      combinedText.includes("women") ||
      combinedText.includes("stree") ||
      combinedText.includes("mahila");

    const phone = props.contact?.phone || raw["phone"] || raw["contact:phone"] || null;
    const address = props.formatted || props.address_line2 || null;
    const town = props.city || props.suburb || raw["addr:city"] || "";
    const district = props.district || props.county || raw["addr:district"] || "";
    const state = props.state || raw["addr:state"] || "";
    const emergency = type === "hospital" || raw["emergency"] === "yes";
    const opening_hours = props.opening_hours || raw["opening_hours"] || null;
    const km = Number(distanceKm(userCoords, { lat, lng }).toFixed(1));

    places.push({
      id: props.place_id || `geoapify/${lat},${lng}`,
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

        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        const radiusMeters = radiusParam ? parseInt(radiusParam, 10) : 50000;

        if (isNaN(lat) || isNaN(lng)) {
          return Response.json(
            { error: "invalid_coordinates", configured: true, places: [] },
            { status: 400 },
          );
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
          const categories = "healthcare.hospital,healthcare.clinic";
          const geoapifyUrl = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lng},${lat},${radiusMeters}&bias=proximity:${lng},${lat}&limit=30&apiKey=${encodeURIComponent(
            apiKey,
          )}`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(geoapifyUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            console.warn(`[nearby-api] Geoapify responded with status ${res.status}`);
            return Response.json(
              {
                status: "error",
                configured: true,
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

          return Response.json({
            status: "ok",
            configured: true,
            places,
            totalFound: places.length,
            radiusUsedKm: Math.round(radiusMeters / 1000),
          });
        } catch (err: unknown) {
          const isTimeout =
            err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
          console.warn("[nearby-api] Request failed:", isTimeout ? "Timeout" : err);
          return Response.json(
            {
              status: "error",
              configured: true,
              error: isTimeout ? "timeout" : "network_error",
              fallback: true,
              places: [],
            },
            { status: 504 },
          );
        }
      },

      POST: async ({ request }) => {
        const configured = isGeoapifyConfigured();
        if (!configured) {
          return Response.json({
            status: "ok",
            configured: false,
            message: "Live search is not configured",
            places: [],
          });
        }

        try {
          const body = (await request.json()) as {
            lat?: number;
            lng?: number;
            radius?: number;
          };

          if (typeof body?.lat !== "number" || typeof body?.lng !== "number") {
            return Response.json(
              { error: "invalid_coordinates", configured: true, places: [] },
              { status: 400 },
            );
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

          const radiusMeters = typeof body.radius === "number" ? body.radius : 50000;
          const categories = "healthcare.hospital,healthcare.clinic";
          const geoapifyUrl = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${body.lng},${body.lat},${radiusMeters}&bias=proximity:${body.lng},${body.lat}&limit=30&apiKey=${encodeURIComponent(
            apiKey,
          )}`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(geoapifyUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            return Response.json(
              {
                status: "error",
                configured: true,
                error: "upstream_error",
                fallback: true,
                places: [],
              },
              { status: res.status >= 500 ? 502 : res.status },
            );
          }

          const data = (await res.json()) as { features?: GeoapifyFeature[] };
          const features = Array.isArray(data?.features) ? data.features : [];
          const places = parseGeoapifyPlaces(features, { lat: body.lat, lng: body.lng });

          return Response.json({
            status: "ok",
            configured: true,
            places,
            totalFound: places.length,
            radiusUsedKm: Math.round(radiusMeters / 1000),
          });
        } catch {
          return Response.json(
            {
              status: "error",
              configured: true,
              error: "network_error",
              fallback: true,
              places: [],
            },
            { status: 500 },
          );
        }
      },
    },
  },
  component: () => null,
});
