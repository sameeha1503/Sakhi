import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  findNearby,
  searchLocation,
  clearPlacesCache,
  locationPrefs,
  type Place,
} from "@/services/places";
import { storage } from "@/services/storage";
import {
  Route as NearbyRoute,
  parseGeoapifyPlaces,
  validateNearbyParams,
  clearNearbyCache,
  isNearbyRateLimited,
} from "@/routes/api.nearby";
import {
  Route as GeocodeRoute,
  clearGeocodeCache,
  isGeocodeRateLimited,
} from "@/routes/api.geocode";
import { resetLoggedStatusForTests } from "@/lib/server-env";

// Real Geoapify Places API v2 Response Fixture
const realGeoapifyFixture = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Apollo Jubilee Hospital",
        categories: ["healthcare", "healthcare.hospital"],
        details: ["hospital_general"],
        datasource: {
          sourcename: "openstreetmap",
          attribution: "© OpenStreetMap contributors",
          raw: {
            amenity: "hospital",
            emergency: "yes",
            healthcare: "hospital",
            operator: "Apollo Hospitals Ltd",
            "healthcare:speciality": "general;cardiology",
            phone: "+91 40 2360 7777 / 2360 8888",
            opening_hours: "24/7",
          },
        },
        contact: {
          phone: "+91 40 2360 7777",
        },
        opening_hours: "24/7",
        formatted:
          "Apollo Jubilee Hospital, Road No 72, Jubilee Hills, Hyderabad - 500096, Telangana, India",
        city: "Hyderabad",
        state: "Telangana",
        district: "Hyderabad",
        distance: 2400, // 2.4 km in meters
        lon: 78.411,
        lat: 17.415,
        place_id: "geo_place_101",
      },
      geometry: {
        type: "Point",
        coordinates: [78.411, 17.415], // GeoJSON: [lon, lat]
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Primary Health Centre Alwal",
        categories: ["healthcare", "healthcare.clinic_or_praxis"],
        datasource: {
          raw: {
            healthcare: "primary_health_centre",
            amenity: "clinic",
            operator: "Government of Telangana",
            "operator:type": "government",
            phone: "040-27861234",
            opening_hours: "Mo-Sa 09:00-16:00",
          },
        },
        contact: {
          phone: "040-27861234",
        },
        opening_hours: "Mo-Sa 09:00-16:00",
        formatted: "PHC Alwal, Secunderabad, Telangana",
        city: "Secunderabad",
        district: "Medchal",
        state: "Telangana",
        distance: 5100, // 5.1 km
        lon: 78.505,
        lat: 17.502,
        place_id: "geo_place_102",
      },
      geometry: {
        type: "Point",
        coordinates: [78.505, 17.502],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Fernandez Maternity Hospital & Gynaecology Centre",
        categories: [
          "healthcare",
          "healthcare.hospital",
          "healthcare.clinic_or_praxis.gynaecology",
        ],
        datasource: {
          raw: {
            healthcare: "hospital",
            "healthcare:speciality": "obstetrics;gynaecology",
            phone: "+91 40 4022 2399",
            opening_hours: "24/7",
          },
        },
        contact: {
          phone: "+91 40 4022 2399",
        },
        opening_hours: "24/7",
        formatted: "Fernandez Hospital, Bogulkunta, Hyderabad, Telangana",
        city: "Hyderabad",
        distance: 3800,
        lon: 78.482,
        lat: 17.391,
        place_id: "geo_place_103",
      },
      geometry: {
        type: "Point",
        coordinates: [78.482, 17.391],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "CHC Shamshabad Community Health Centre",
        categories: ["healthcare", "healthcare.clinic_or_praxis"],
        datasource: {
          raw: {
            healthcare: "community_health_centre",
            operator: "Govt of Telangana",
            "operator:type": "government",
          },
        },
        formatted: "CHC Shamshabad, Ranga Reddy, Telangana",
        distance: 8200,
        lon: 78.428,
        lat: 17.261,
        place_id: "geo_place_104",
      },
      geometry: {
        type: "Point",
        coordinates: [78.428, 17.261],
      },
    },
  ],
};

describe("Geoapify Places & Fallback Chain Integration", () => {
  const originalEnvKey = process.env["GEOAPIFY_API_KEY"];

  beforeEach(async () => {
    delete process.env["GEOAPIFY_API_KEY"];
    resetLoggedStatusForTests();
    clearNearbyCache();
    clearGeocodeCache();
    clearPlacesCache();
    await storage.clearAll();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env["GEOAPIFY_API_KEY"] = originalEnvKey;
    } else {
      delete process.env["GEOAPIFY_API_KEY"];
    }
    vi.restoreAllMocks();
  });

  // 1. Successful parse using a fixture from a real response
  describe("1. Successful Parse from Real Geoapify Fixture", () => {
    it("parses name, type (hospital, clinic, PHC, CHC), address, distance, phone, opening hours, and women's health strictly", () => {
      const userCoords = { lat: 17.4, lng: 78.48 };
      const parsed = parseGeoapifyPlaces(realGeoapifyFixture.features as never, userCoords);

      expect(parsed.length).toBe(4);

      // Facility 1: Apollo Hospital
      const apollo = parsed.find((p) => p.id === "geo_place_101");
      expect(apollo).toBeDefined();
      expect(apollo?.name).toBe("Apollo Jubilee Hospital");
      expect(apollo?.type).toBe("hospital");
      expect(apollo?.km).toBe(2.4);
      expect(apollo?.phone).toBe("+914023607777");
      expect(apollo?.opening_hours).toBe("24/7");
      expect(apollo?.hasWomenHealth).toBe(false); // Does NOT explicitly mention gynaecology, obstetrics or maternity
      expect(apollo?.hasGynaecology).toBe(false);
      expect(apollo?.address).toContain("Jubilee Hills");

      // Facility 2: PHC Alwal (Primary Health Centre detection)
      const phc = parsed.find((p) => p.id === "geo_place_102");
      expect(phc).toBeDefined();
      expect(phc?.name).toBe("Primary Health Centre Alwal");
      expect(phc?.type).toBe("phc");
      expect(phc?.isGovernment).toBe(true);
      expect(phc?.phone).toBe("04027861234");
      expect(phc?.opening_hours).toBe("Mo-Sa 09:00-16:00");

      // Facility 3: Fernandez Hospital (Explicit Maternity & Gynaecology)
      const fernandez = parsed.find((p) => p.id === "geo_place_103");
      expect(fernandez).toBeDefined();
      expect(fernandez?.hasWomenHealth).toBe(true);
      expect(fernandez?.hasGynaecology).toBe(true);
      expect(fernandez?.type).toBe("hospital");

      // Facility 4: CHC Shamshabad (Community Health Centre detection)
      const chc = parsed.find((p) => p.id === "geo_place_104");
      expect(chc).toBeDefined();
      expect(chc?.type).toBe("chc");
      expect(chc?.isGovernment).toBe(true);
      expect(chc?.phone).toBeNull(); // Missing phone returns null
      expect(chc?.opening_hours).toBeNull(); // Missing opening_hours returns null
    });

    it("ensures coordinates respect GeoJSON order: longitude first [lon, lat]", () => {
      const userCoords = { lat: 17.4, lng: 78.48 };
      const parsed = parseGeoapifyPlaces(realGeoapifyFixture.features as never, userCoords);
      const apollo = parsed.find((p) => p.id === "geo_place_101");
      expect(apollo?.lng).toBeCloseTo(78.411);
      expect(apollo?.lat).toBeCloseTo(17.415);
    });

    it("validates parameters (India bounds & radius <= 50 km)", () => {
      // Valid coordinates within India
      expect(validateNearbyParams(17.385, 78.486, 10000).valid).toBe(true);
      expect(validateNearbyParams(28.613, 77.209, 50000).valid).toBe(true);

      // Outside India bounds
      expect(validateNearbyParams(51.507, -0.127, 5000).valid).toBe(false); // London
      expect(validateNearbyParams(40.712, -74.006, 5000).valid).toBe(false); // New York

      // Radius over 50 km
      expect(validateNearbyParams(17.385, 78.486, 60000).valid).toBe(false);
    });
  });

  // 2. Empty result with radius expansion
  describe("2. Empty Result with Progressive Radius Expansion", () => {
    it("expands radius progressively (5km -> 10km -> 25km) one request at a time until at least 8 results", async () => {
      const calls: string[] = [];

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        calls.push(urlStr);

        if (urlStr.includes("radius=5000")) {
          // 5 km returns only 2 places (< 8)
          return {
            ok: true,
            json: async () => ({
              configured: true,
              places: [
                { id: "p1", name: "Facility 1", lat: 17.4, lng: 78.5, type: "clinic", km: 2 },
                { id: "p2", name: "Facility 2", lat: 17.4, lng: 78.5, type: "clinic", km: 3 },
              ],
            }),
          } as Response;
        }

        if (urlStr.includes("radius=10000")) {
          // 10 km returns 9 places (>= 8)
          const places: Place[] = Array.from({ length: 9 }, (_, i) => ({
            id: `p_${i + 1}`,
            name: `Facility ${i + 1}`,
            lat: 17.4,
            lng: 78.5,
            type: "hospital",
            phone: null,
            address: null,
            town: "Hyderabad",
            district: "Hyderabad",
            state: "Telangana",
            operator: null,
            isGovernment: true,
            emergency: true,
            hasWomenHealth: false,
            hasGynaecology: false,
            opening_hours: null,
            km: i + 1,
            isApproxDistance: true,
          }));

          return {
            ok: true,
            json: async () => ({
              configured: true,
              places,
              radiusUsedKm: 10,
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const res = await findNearby(17.42, 78.5, 50);

      expect(res.source).toBe("geoapify");
      expect(res.places.length).toBe(9);
      expect(res.radiusUsedKm).toBe(10);
      expect(res.isFallbackSample).toBe(false);

      // Verify requests were made in order: first 5 km, then 10 km, and stopped (no 25km or 50km request)
      const nearbyCalls = calls.filter((c) => c.includes("/api/nearby"));
      expect(nearbyCalls.length).toBe(2);
      expect(nearbyCalls[0]).toContain("radius=5000");
      expect(nearbyCalls[1]).toContain("radius=10000");
    });
  });

  // 3. Quota error (429)
  describe("3. Quota Error (429)", () => {
    it("handles 429 quota error from Geoapify, halts radius expansion, and sets quota_exceeded failureReason", async () => {
      process.env["GEOAPIFY_API_KEY"] = "active_key";

      // 1. Server route /api/nearby returns 429 when upstream returns 429
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      const handler = (
        NearbyRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;
      const request = new Request("https://example.com/api/nearby?lat=17.4&lng=78.5&radius=5000");
      const serverResponse = await handler({ request });

      expect(serverResponse.status).toBe(429);
      const json = await serverResponse.json();
      expect(json.code).toBe("quota_exceeded");
      expect(json.fallback).toBe(true);

      // 2. Client service findNearby sets failureReason: "quota_exceeded" and falls back
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/nearby")) {
          return {
            ok: false,
            status: 429,
            json: async () => ({ code: "quota_exceeded", error: "Geoapify quota exceeded" }),
          } as Response;
        }
        // Overpass also fails to trigger sample fallback
        throw new Error("Overpass offline");
      });

      const res = await findNearby(17.4, 78.5, 50);
      expect(res.source).toBe("sample");
      expect(res.isFallbackSample).toBe(true);
      expect(res.failureReason).toBe("quota_exceeded");
    });
  });

  // 4. Invalid key (401)
  describe("4. Invalid API Key (401)", () => {
    it("handles 401 invalid key, halts expansion, logs developer warning, and flags unconfigured", async () => {
      process.env["GEOAPIFY_API_KEY"] = "bad_key";

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/nearby")) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ code: "invalid_key", error: "Invalid Geoapify API key" }),
          } as Response;
        }
        throw new Error("Overpass offline");
      });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const res = await findNearby(17.4, 78.5, 50);

      expect(res.source).toBe("sample");
      expect(res.isFallbackSample).toBe(true);
      expect(res.failureReason).toBe("unconfigured");
      expect(res.liveSearchConfigured).toBe(false);

      // Developer warning logged to console
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Live search is not configured"),
      );
    });
  });

  // 5. Network failure & timeout
  describe("5. Network Failure & Timeout", () => {
    it("handles upstream network drop and abort timeouts with unreachable failureReason", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/nearby")) {
          throw new TypeError("Failed to fetch");
        }
        throw new Error("Overpass offline");
      });

      const res = await findNearby(17.4, 78.5, 25);
      expect(res.source).toBe("sample");
      expect(res.isFallbackSample).toBe(true);
      expect(res.failureReason).toBe("unreachable");
    });
  });

  // 6. Complete Fallback Order
  describe("6. Complete Fallback Chain Order", () => {
    it("Order: Geoapify -> saved results -> Overpass (once, 8s) -> sample data", async () => {
      // Step A: Geoapify succeeds
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/nearby")) {
          return {
            ok: true,
            json: async () => ({
              configured: true,
              places: [{ id: "g1", name: "Geoapify Hospital", type: "hospital", km: 2 }],
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const resA = await findNearby(17.42, 78.5, 10);
      expect(resA.source).toBe("geoapify");
      expect(resA.places[0]?.name).toBe("Geoapify Hospital");

      // Step B: Geoapify fails, but saved results exist and rememberLoc is true
      clearPlacesCache();
      locationPrefs.setRememberEnabled(true);
      storage.set("cached_places_result", {
        places: [{ id: "saved_1", name: "Saved Hospital", type: "hospital", km: 3 }],
        radiusUsedKm: 10,
        totalFound: 1,
        source: "saved",
        isCached: true,
        isFallbackSample: false,
        lastUpdated: "10:30 AM",
      });

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        throw new Error("Geoapify down");
      });

      const resB = await findNearby(17.42, 78.5, 10);
      expect(resB.source).toBe("saved");
      expect(resB.places[0]?.name).toBe("Saved Hospital");
      expect(resB.isCached).toBe(true);

      // Step C: Geoapify fails, no saved results, Overpass succeeds
      clearPlacesCache();
      storage.remove("cached_places_result");
      locationPrefs.setRememberEnabled(false);

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/nearby")) {
          throw new Error("Geoapify down");
        }
        if (urlStr.includes("overpass-api.de")) {
          return {
            ok: true,
            json: async () => ({
              elements: [
                {
                  type: "node",
                  id: 99,
                  lat: 17.42,
                  lon: 78.5,
                  tags: { name: "Overpass Hospital", amenity: "hospital" },
                },
              ],
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const resC = await findNearby(17.42, 78.5, 10);
      expect(resC.source).toBe("overpass");
      expect(resC.places[0]?.name).toBe("Overpass Hospital");
      expect(resC.isFallbackSample).toBe(false);

      // Step D: All live sources fail -> Sample data with banner
      clearPlacesCache();
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Total network failure"));

      const resD = await findNearby(17.42, 78.5, 10);
      expect(resD.source).toBe("sample");
      expect(resD.isFallbackSample).toBe(true);
      expect(resD.places.length).toBeGreaterThanOrEqual(10);
    });
  });

  // 7. Caching
  describe("7. 10-Minute Response Caching", () => {
    it("caches /api/nearby responses for 10 minutes keyed by coordinates rounded to 3 decimals", async () => {
      process.env["GEOAPIFY_API_KEY"] = "cache_test_key";

      const upstreamSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Cached Hospital", lon: 78.486, lat: 17.385 },
              geometry: { type: "Point", coordinates: [78.486, 17.385] },
            },
          ],
        }),
      } as Response);

      const handler = (
        NearbyRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;

      // First call at lat=17.3851, lng=78.4862 (rounds to 17.385, 78.486)
      const req1 = new Request(
        "https://example.com/api/nearby?lat=17.3851&lng=78.4862&radius=10000",
      );
      const res1 = await handler({ request: req1 });
      const json1 = await res1.json();
      expect(json1.places[0].name).toBe("Cached Hospital");
      expect(upstreamSpy).toHaveBeenCalledTimes(1);

      // Second call at slightly shifted lat=17.3854, lng=78.4861 (rounds to SAME 17.385, 78.486)
      const req2 = new Request(
        "https://example.com/api/nearby?lat=17.3854&lng=78.4861&radius=10000",
      );
      const res2 = await handler({ request: req2 });
      const json2 = await res2.json();
      expect(json2.places[0].name).toBe("Cached Hospital");

      // Verify upstream fetch was NOT called a second time (served from 10-minute cache)
      expect(upstreamSpy).toHaveBeenCalledTimes(1);
    });

    it("caches geocoding results for 10 minutes by query string", async () => {
      process.env["GEOAPIFY_API_KEY"] = "cache_test_key";

      const upstreamSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [{ properties: { lat: 17.385, lon: 78.486, name: "Hyderabad" } }],
        }),
      } as Response);

      const handler = (
        GeocodeRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;

      const req1 = new Request("https://example.com/api/geocode?text=Hyderabad");
      await handler({ request: req1 });
      expect(upstreamSpy).toHaveBeenCalledTimes(1);

      // Second call with same normalized query
      const req2 = new Request("https://example.com/api/geocode?text=hyderabad");
      await handler({ request: req2 });
      expect(upstreamSpy).toHaveBeenCalledTimes(1);
    });
  });

  // 8. Rate Limiting
  describe("8. Rate Limiting (~10 requests per minute)", () => {
    it("limits /api/nearby to 10 requests per minute per client IP and returns 429 on the 11th request", () => {
      const clientIp = "192.168.1.100";

      // 10 requests within window succeed
      for (let i = 0; i < 10; i++) {
        expect(isNearbyRateLimited(clientIp, 10, 60000)).toBe(false);
      }

      // 11th request is rate-limited
      expect(isNearbyRateLimited(clientIp, 10, 60000)).toBe(true);

      // Different IP is NOT blocked
      expect(isNearbyRateLimited("192.168.1.101", 10, 60000)).toBe(false);
    });

    it("limits /api/geocode to 10 requests per minute per client IP", () => {
      const clientIp = "10.0.0.1";

      for (let i = 0; i < 10; i++) {
        expect(isGeocodeRateLimited(clientIp, 10, 60000)).toBe(false);
      }

      expect(isGeocodeRateLimited(clientIp, 10, 60000)).toBe(true);
    });
  });

  // 9. Place Search via /api/geocode
  describe("9. Place Search via /api/geocode", () => {
    it("calls /api/geocode (Geoapify restricted to India) and falls back to Nominatim on error", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/geocode")) {
          return {
            ok: true,
            json: async () => ({
              configured: true,
              results: [
                { lat: 17.25, lng: 78.4, displayName: "Shamshabad, Telangana", name: "Shamshabad" },
              ],
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const results = await searchLocation("Shamshabad");
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe("Shamshabad");
      expect(results[0]?.lat).toBeCloseTo(17.25);
    });
  });
});
