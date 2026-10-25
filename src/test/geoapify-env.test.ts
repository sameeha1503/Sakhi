import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseAndApplyEnv,
  isGeoapifyConfigured,
  getGeoapifyApiKey,
  logGeoapifyStartup,
  resetLoggedStatusForTests,
} from "../lib/server-env";
import { Route as NearbyRoute } from "../routes/api.nearby";
import { Route as GeocodeRoute } from "../routes/api.geocode";

describe("Geoapify Environment Configuration & Server Routes", () => {
  const originalEnv = process.env["GEOAPIFY_API_KEY"];

  beforeEach(() => {
    delete process.env["GEOAPIFY_API_KEY"];
    resetLoggedStatusForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["GEOAPIFY_API_KEY"] = originalEnv;
    } else {
      delete process.env["GEOAPIFY_API_KEY"];
    }
  });

  describe("Startup Logging & Presence Check", () => {
    it("logs 'GEOAPIFY_API_KEY: missing' when key is empty or unset", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      logGeoapifyStartup();

      expect(consoleSpy).toHaveBeenCalledWith("GEOAPIFY_API_KEY: missing");
      expect(isGeoapifyConfigured()).toBe(false);
      expect(getGeoapifyApiKey()).toBe(null);
    });

    it("logs 'GEOAPIFY_API_KEY: set' and NEVER logs the key value when present", () => {
      process.env["GEOAPIFY_API_KEY"] = "secret_geoapify_key_xyz_123";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      logGeoapifyStartup();

      expect(consoleSpy).toHaveBeenCalledWith("GEOAPIFY_API_KEY: set");
      // Security: verify secret key value was NEVER output to console
      for (const call of consoleSpy.mock.calls) {
        for (const arg of call) {
          expect(String(arg)).not.toContain("secret_geoapify_key_xyz_123");
        }
      }
      expect(isGeoapifyConfigured()).toBe(true);
      expect(getGeoapifyApiKey()).toBe("secret_geoapify_key_xyz_123");
    });

    it("treats whitespace-only key as missing", () => {
      process.env["GEOAPIFY_API_KEY"] = "   ";
      expect(isGeoapifyConfigured()).toBe(false);
      expect(getGeoapifyApiKey()).toBe(null);
    });

    it("logs at most once across multiple calls", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      logGeoapifyStartup();
      logGeoapifyStartup();
      logGeoapifyStartup();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("parseAndApplyEnv helper", () => {
    it("parses KEY=value pairs from string without overriding existing process.env", () => {
      process.env["TEST_EXISTING_KEY"] = "original";
      const rawEnv = `
# Comment
GEOAPIFY_API_KEY=test_parsed_key
TEST_EXISTING_KEY=override_attempt
QUOTED_KEY="quoted_value"
      `;

      parseAndApplyEnv(rawEnv);
      expect(process.env["GEOAPIFY_API_KEY"]).toBe("test_parsed_key");
      expect(process.env["TEST_EXISTING_KEY"]).toBe("original");
      expect(process.env["QUOTED_KEY"]).toBe("quoted_value");

      delete process.env["TEST_EXISTING_KEY"];
      delete process.env["QUOTED_KEY"];
    });
  });

  describe("Server Route: /api/nearby", () => {
    it("returns configured: false and never leaks key when GEOAPIFY_API_KEY is missing", async () => {
      delete process.env["GEOAPIFY_API_KEY"];

      const handler = (
        NearbyRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;
      const request = new Request("https://example.com/api/nearby?lat=17.4&lng=78.5");
      const response = await handler({ request });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.configured).toBe(false);
      expect(json.places).toEqual([]);
      expect(JSON.stringify(json)).not.toContain("API_KEY");
      expect(JSON.stringify(json)).not.toContain("secret");
    });

    it("returns status ok and service info on status check query", async () => {
      const handler = (
        NearbyRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;
      const request = new Request("https://example.com/api/nearby");
      const response = await handler({ request });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.status).toBe("ok");
      expect(json.configured).toBe(false);
      expect(json.service).toBe("Nearby Facilities API");
    });

    it("queries Geoapify and transforms features when key is configured", async () => {
      process.env["GEOAPIFY_API_KEY"] = "valid_key_123";

      const mockGeoapify = {
        features: [
          {
            type: "Feature",
            properties: {
              place_id: "geo_1",
              name: "City Government Hospital",
              categories: ["healthcare.hospital"],
              city: "Hyderabad",
              district: "Hyderabad",
              state: "Telangana",
              operator: "Government",
              lat: 17.41,
              lon: 78.49,
            },
            geometry: {
              type: "Point",
              coordinates: [78.49, 17.41],
            },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeoapify,
      } as Response);

      const handler = (
        NearbyRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;
      const request = new Request("https://example.com/api/nearby?lat=17.4&lng=78.5&radius=25000");
      const response = await handler({ request });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.configured).toBe(true);
      expect(json.places.length).toBe(1);
      expect(json.places[0].name).toBe("City Government Hospital");
      expect(json.places[0].isGovernment).toBe(true);
      expect(json.places[0].type).toBe("hospital");

      // Critical Security Rule: Never send API key in response payload
      expect(JSON.stringify(json)).not.toContain("valid_key_123");
    });
  });

  describe("Server Route: /api/geocode", () => {
    it("returns configured: false when GEOAPIFY_API_KEY is missing", async () => {
      delete process.env["GEOAPIFY_API_KEY"];

      const handler = (
        GeocodeRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;
      const request = new Request("https://example.com/api/geocode?q=Hyderabad");
      const response = await handler({ request });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.configured).toBe(false);
      expect(json.results).toEqual([]);
      expect(JSON.stringify(json)).not.toContain("apiKey");
    });

    it("returns geocoding results without leaking key when key is configured", async () => {
      process.env["GEOAPIFY_API_KEY"] = "valid_key_123";

      const mockGeoapify = {
        features: [
          {
            properties: {
              lat: 17.385,
              lon: 78.4867,
              formatted: "Hyderabad, Telangana, India",
              name: "Hyderabad",
              city: "Hyderabad",
            },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeoapify,
      } as Response);

      const handler = (
        GeocodeRoute.options.server as unknown as {
          handlers: { GET: (args: { request: Request }) => Promise<Response> };
        }
      ).handlers.GET;
      const request = new Request("https://example.com/api/geocode?q=Hyderabad");
      const response = await handler({ request });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.configured).toBe(true);
      expect(json.results.length).toBe(1);
      expect(json.results[0].name).toBe("Hyderabad");
      expect(json.results[0].lat).toBeCloseTo(17.385);
      expect(json.results[0].lng).toBeCloseTo(78.4867);

      // Security: ensure key is NEVER in response
      expect(JSON.stringify(json)).not.toContain("valid_key_123");
    });
  });
});
