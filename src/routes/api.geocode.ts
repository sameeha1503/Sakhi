import { createFileRoute } from "@tanstack/react-router";
import { getGeoapifyApiKey, isGeoapifyConfigured } from "@/lib/server-env";
import type { GeocodingResult } from "@/services/places";

// In-memory sliding window rate limiter: ~10 requests per minute per client IP
const rateLimitMap = new Map<string, number[]>();

export function isGeocodeRateLimited(
  clientIp: string,
  maxRequests = 10,
  windowMs = 60000,
): boolean {
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

// In-memory response cache: 10 minutes TTL, keyed by normalized query string
interface CacheEntry {
  data: unknown;
  timestamp: number;
}
const geocodeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearGeocodeCache(): void {
  geocodeCache.clear();
  rateLimitMap.clear();
}

interface GeoapifyGeocodeFeature {
  properties: {
    lat: number;
    lon: number;
    formatted?: string;
    name?: string;
    city?: string;
    address_line1?: string;
    suburb?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    [key: string]: unknown;
  };
}

export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const configured = isGeoapifyConfigured();
        const url = new URL(request.url);
        const query = (url.searchParams.get("text") || url.searchParams.get("q") || "").trim();

        // If no query passed, return API health & configuration status
        if (!query) {
          return Response.json({
            status: "ok",
            service: "Geocoding API",
            configured,
            results: [],
          });
        }

        // If key is not configured, inform client safely without leaking any secrets
        if (!configured) {
          return Response.json({
            status: "ok",
            configured: false,
            message: "Live search is not configured",
            results: [],
          });
        }

        // Rate limiting check per client IP
        const forwarded = request.headers.get("x-forwarded-for");
        const clientIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "127.0.0.1") : "127.0.0.1";
        if (isGeocodeRateLimited(clientIp, 10, 60000)) {
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

        // Input validation: query length limit
        if (query.length > 200) {
          return Response.json(
            {
              error: "query_too_long",
              message: "Search text must not exceed 200 characters.",
              results: [],
            },
            { status: 400 },
          );
        }

        // Check 10-minute cache
        const cacheKey = query.toLowerCase();
        const cached = geocodeCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return Response.json(cached.data);
        }

        const apiKey = getGeoapifyApiKey();
        if (!apiKey) {
          return Response.json({
            status: "ok",
            configured: false,
            message: "Live search is not configured",
            results: [],
          });
        }

        try {
          // Restricted to India via filter=countrycode:in
          const geoapifyUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
            query,
          )}&filter=countrycode:in&limit=5&apiKey=${encodeURIComponent(apiKey)}`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);

          const res = await fetch(geoapifyUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            console.warn(`[geocode-api] Geoapify responded with status ${res.status}`);
            if (res.status === 401) {
              return Response.json(
                {
                  status: "error",
                  code: "invalid_key",
                  error: "Invalid Geoapify API key",
                  fallback: true,
                  results: [],
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
                  results: [],
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
                results: [],
              },
              { status: res.status >= 500 ? 502 : res.status },
            );
          }

          const data = (await res.json()) as { features?: GeoapifyGeocodeFeature[] };
          const features = Array.isArray(data?.features) ? data.features : [];

          const results: GeocodingResult[] = features.map((f) => ({
            lat: f.properties.lat,
            lng: f.properties.lon,
            displayName: f.properties.formatted || query,
            name:
              f.properties.name ||
              f.properties.city ||
              f.properties.address_line1 ||
              f.properties.formatted?.split(",")[0] ||
              query,
          }));

          const responsePayload = {
            status: "ok",
            configured: true,
            results,
          };

          // Store in cache for 10 minutes
          geocodeCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });

          return Response.json(responsePayload);
        } catch (err: unknown) {
          const isTimeout =
            err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
          console.warn("[geocode-api] Request failed:", isTimeout ? "Timeout" : err);
          return Response.json(
            {
              status: "error",
              code: "service_unreachable",
              configured: true,
              error: isTimeout ? "timeout" : "network_error",
              fallback: true,
              results: [],
            },
            { status: isTimeout ? 504 : 502 },
          );
        }
      },
    },
  },
  component: () => null,
});
