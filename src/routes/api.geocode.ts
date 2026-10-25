import { createFileRoute } from "@tanstack/react-router";
import { getGeoapifyApiKey, isGeoapifyConfigured } from "@/lib/server-env";
import type { GeocodingResult } from "@/services/places";

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
            return Response.json(
              {
                status: "error",
                configured: true,
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

          return Response.json({
            status: "ok",
            configured: true,
            results,
          });
        } catch (err: unknown) {
          const isTimeout =
            err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
          console.warn("[geocode-api] Request failed:", isTimeout ? "Timeout" : err);
          return Response.json(
            {
              status: "error",
              configured: true,
              error: isTimeout ? "timeout" : "network_error",
              fallback: true,
              results: [],
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
            results: [],
          });
        }

        try {
          const body = (await request.json()) as { text?: string; q?: string };
          const query = (body?.text || body?.q || "").trim();

          if (!query) {
            return Response.json({
              status: "ok",
              configured: true,
              results: [],
            });
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
            return Response.json(
              {
                status: "error",
                configured: true,
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

          return Response.json({
            status: "ok",
            configured: true,
            results,
          });
        } catch {
          return Response.json(
            {
              status: "error",
              configured: true,
              error: "network_error",
              fallback: true,
              results: [],
            },
            { status: 500 },
          );
        }
      },
    },
  },
  component: () => null,
});
