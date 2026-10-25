import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  parseAndSanitizeResponse,
  Route as ScanApiRoute,
  resetScanBudgetForTests,
  clearScanRateLimitsForTests,
  isScanRateLimited,
} from "@/routes/api.scan";
import {
  scanPrescription,
  ScanError,
  clearScanCacheForTests,
  computeImageHash,
} from "@/services/scanner";

describe("Prescription Scanner - Server & Client Integration", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearScanRateLimitsForTests();
    clearScanCacheForTests();
    resetScanBudgetForTests(0, 0);

    process.env["SCAN_PROVIDER"] = "openai";
    process.env["SCAN_API_KEY"] = "mock-scan-key";
    process.env["SCAN_API_URL"] = "https://mock.api/v1/chat/completions";
    process.env["SCAN_MODEL"] = "gemini-2.5-flash";
    process.env["SCAN_MODEL_FALLBACK"] = "gemini-2.0-flash";
    process.env["SCAN_DAILY_LIMIT"] = "15";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  describe("1. Defensive Response Parsing", () => {
    it("successfully parses valid JSON prescription output", () => {
      const raw = JSON.stringify({
        isPrescription: true,
        medicines: [
          {
            name: "Ferrous Ascorbate",
            dose: "100 mg",
            timings: ["morning", "night"],
            food: "after",
            durationDays: 30,
            asNeeded: false,
            category: "iron",
            needsCheck: false,
            note: "Take with water",
          },
        ],
      });

      const result = parseAndSanitizeResponse(raw);
      expect(result.isPrescription).toBe(true);
      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0]?.name).toBe("Ferrous Ascorbate");
      expect(result.medicines[0]?.dose).toBe("100 mg");
      expect(result.medicines[0]?.frequency).toBe(2);
      expect(result.medicines[0]?.timings).toEqual(["morning", "night"]);
      expect(result.medicines[0]?.food).toBe("after");
      expect(result.medicines[0]?.durationDays).toBe(30);
      expect(result.medicines[0]?.category).toBe("iron");
      expect(result.medicines[0]?.needsCheck).toBe(false);
      expect(result.medicines[0]?.note).toBe("Take with water");
    });

    it("strips markdown code fences (```json ... ```)", () => {
      const raw =
        "```json\n" +
        JSON.stringify({
          isPrescription: true,
          medicines: [{ name: "Paracetamol 500", dose: "500 mg", timings: ["night"] }],
        }) +
        "\n```";

      const result = parseAndSanitizeResponse(raw);
      expect(result.isPrescription).toBe(true);
      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0]?.name).toBe("Paracetamol 500");
    });

    it("throws unreadable error on malformed JSON", () => {
      const malformed = "{ this is not valid json }";
      expect(() => parseAndSanitizeResponse(malformed)).toThrow("unreadable_json");
    });

    it("handles isPrescription: false and returns empty medicines list", () => {
      const raw = JSON.stringify({
        isPrescription: false,
        medicines: [],
      });

      const result = parseAndSanitizeResponse(raw);
      expect(result.isPrescription).toBe(false);
      expect(result.medicines).toEqual([]);
    });

    it("clamps durationDays to 1-365 range", () => {
      const raw = JSON.stringify({
        isPrescription: true,
        medicines: [
          { name: "Med A", durationDays: -5 },
          { name: "Med B", durationDays: 9999 },
          { name: "Med C", durationDays: "14 days" },
        ],
      });

      const result = parseAndSanitizeResponse(raw);
      expect(result.medicines[0]?.durationDays).toBe(1);
      expect(result.medicines[1]?.durationDays).toBe(365);
      expect(result.medicines[2]?.durationDays).toBe(14);
    });

    it("leaves unknown category as undefined so client uses inferCategory", () => {
      const raw = JSON.stringify({
        isPrescription: true,
        medicines: [{ name: "Unknown Herb Pill", category: "ayurvedic_herbs" }],
      });

      const result = parseAndSanitizeResponse(raw);
      expect(result.medicines[0]?.category).toBeUndefined();
    });

    it("drops medicines with missing or empty names and caps at 20", () => {
      const items = [
        { name: "" },
        { name: "   " },
        ...Array.from({ length: 30 }, (_, i) => ({ name: `Medicine ${i + 1}` })),
      ];

      const raw = JSON.stringify({ isPrescription: true, medicines: items });
      const result = parseAndSanitizeResponse(raw);

      expect(result.medicines).toHaveLength(20);
      expect(result.medicines[0]?.name).toBe("Medicine 1");
    });
  });

  describe("2. Server API Route (/api/scan)", () => {
    type RouteWithHandlers = {
      options: {
        server: {
          handlers: {
            GET: () => Promise<Response>;
            POST: (ctx: { request: Request }) => Promise<Response>;
          };
        };
      };
    };
    const routeObj = ScanApiRoute as unknown as RouteWithHandlers;
    const getHandler = routeObj.options.server.handlers.GET;
    const postHandler = routeObj.options.server.handlers.POST;

    it("GET /api/scan returns enabled: true and never leaks the API key or its length", async () => {
      const res = await getHandler();
      const data = await res.json();

      expect(data).toEqual({ status: "ok", enabled: true });
      expect(data).not.toHaveProperty("key");
      expect(data).not.toHaveProperty("apiKey");
      expect(data).not.toHaveProperty("keyLength");
    });

    it("GET /api/scan returns enabled: false when required env vars are missing", async () => {
      delete process.env["SCAN_API_KEY"];
      const res = await getHandler();
      const data = await res.json();

      expect(data).toEqual({ status: "ok", enabled: false });
    });

    it("POST returns 503 scan_unavailable when env vars are missing", async () => {
      delete process.env["SCAN_API_KEY"];
      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "dGVzdA==",
          mediaType: "image/jpeg",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data).toEqual({ error: "scan_unavailable" });
    });

    it("POST returns 400 bad_image for invalid media types", async () => {
      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "dGVzdA==",
          mediaType: "application/pdf",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "bad_image" });
    });

    it("POST returns 413 too_large when image exceeds 4 MB", async () => {
      // 4 MB decoded is ~ 5.6MB base64
      const oversizedBase64 = "A".repeat(6 * 1024 * 1024);
      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: oversizedBase64,
          mediaType: "image/jpeg",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data).toEqual({ error: "too_large" });
    });

    it("POST rate limits clients exceeding 6 req/min or 30 req/day", async () => {
      const clientIp = "192.168.1.100";
      // Fill 6 requests
      for (let i = 0; i < 6; i++) {
        expect(isScanRateLimited(clientIp)).toBe(false);
      }
      // 7th request should be rate limited
      expect(isScanRateLimited(clientIp)).toBe(true);

      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": clientIp,
        },
        body: JSON.stringify({
          image: "dGVzdA==",
          mediaType: "image/jpeg",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data).toEqual({ error: "rate_limited" });
    });

    it("retries once with fallback model when primary returns 429 quota error", async () => {
      const fetchMock = vi
        .fn()
        // 1st call (primary) -> 429 quota
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () =>
            JSON.stringify({ error: { message: "RESOURCE_EXHAUSTED quota exceeded" } }),
        })
        // 2nd call (fallback) -> 200 OK
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    isPrescription: true,
                    medicines: [{ name: "Pantoprazole 40mg", dose: "40 mg" }],
                  }),
                },
              },
            ],
          }),
        });

      globalThis.fetch = fetchMock;

      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "dGVzdA==",
          mediaType: "image/jpeg",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isPrescription).toBe(true);
      expect(data.model).toBe("gemini-2.0-flash");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("routes directly to fallback when primary daily limit is reached", async () => {
      // Simulate primary cap reached (15/15)
      resetScanBudgetForTests(15, 0);

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  isPrescription: true,
                  medicines: [{ name: "Mefenamic Acid", dose: "500 mg" }],
                }),
              },
            },
          ],
        }),
      });
      globalThis.fetch = fetchMock;

      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "dGVzdA==",
          mediaType: "image/jpeg",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.model).toBe("gemini-2.0-flash");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns 503 scan_unavailable without calling upstream when both primary and fallback reach daily caps", async () => {
      // Both primary (15) and fallback (400) capped
      resetScanBudgetForTests(15, 400);

      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock;

      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "dGVzdA==",
          mediaType: "image/jpeg",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data).toEqual({ error: "scan_unavailable" });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("3. Client Service (scanPrescription)", () => {
    it("throws ScanError('offline') when navigator.onLine is false", async () => {
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

      try {
        const blob = new Blob(["photo"], { type: "image/jpeg" });
        await expect(scanPrescription(blob)).rejects.toMatchObject({
          code: "offline",
        });
      } finally {
        Object.defineProperty(navigator, "onLine", { value: originalOnLine, configurable: true });
      }
    });

    it("throws ScanError('not_prescription') when isPrescription is false", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isPrescription: false, medicines: [] }),
      } as unknown as Response);

      const blob = new Blob(["scenery"], { type: "image/jpeg" });
      await expect(scanPrescription(blob)).rejects.toMatchObject({
        code: "not_prescription",
      });
    });

    it("serves cached result on scanning the same photo twice (only 1 fetch call)", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isPrescription: true,
          medicines: [
            {
              name: "Amoxicillin 500mg",
              dose: "500 mg",
              timings: ["morning", "night"],
              food: "after",
              durationDays: 7,
              category: "antibiotic",
            },
          ],
          model: "gemini-2.5-flash",
        }),
      } as unknown as Response);
      globalThis.fetch = fetchMock;

      const blob = new Blob(["identical image content 12345"], { type: "image/jpeg" });

      // Call 1: makes API call
      const res1 = await scanPrescription(blob);
      expect(res1).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Call 2: cache hit, makes NO network call
      const res2 = await scanPrescription(blob);
      expect(res2).toEqual(res1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("falls back to inferCategory for unknown categories", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isPrescription: true,
          medicines: [
            {
              name: "Shelcal 500 Calcium",
              dose: "500 mg",
              timings: ["morning"],
              durationDays: 30,
              category: undefined,
            },
          ],
          model: "gemini-2.5-flash",
        }),
      } as unknown as Response);

      const blob = new Blob(["unique photo 999"], { type: "image/jpeg" });
      const result = await scanPrescription(blob);

      expect(result[0]?.name).toBe("Shelcal 500 Calcium");
      expect(result[0]?.category).toBe("calcium");
    });

    it("never returns hardcoded sample medicines under any circumstances", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as unknown as Response);

      const blob = new Blob(["sample check"], { type: "image/jpeg" });
      await expect(scanPrescription(blob)).rejects.toBeInstanceOf(ScanError);
    });
  });
});
