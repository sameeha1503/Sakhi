import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Route as ExplainApiRoute,
  parseAndSanitizeExplainResponse,
  containsUnsafePhrase,
  isExplainRateLimited,
  clearExplainRateLimitsForTests,
  resetExplainDailyBudgetForTests,
  getExplainDailyBudgetStatus,
} from "@/routes/api.explain";
import {
  getMedicineInfo,
  clearMedicineInfoCacheForTests,
  getFallbackExplanation,
  CACHE_TTL_MS,
} from "@/services/medicineInfo";
import { storage } from "@/services/storage";
import { MedicineExplanationCard } from "@/components/MedicineExplanationCard";
import "../i18n";

describe("Medicine Explanation Service & AI Architecture", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearExplainRateLimitsForTests();
    clearMedicineInfoCacheForTests();
    resetExplainDailyBudgetForTests(0);

    process.env["SCAN_PROVIDER"] = "openai";
    process.env["SCAN_API_KEY"] = "mock-scan-key";
    process.env["SCAN_API_URL"] = "https://mock.api/v1/chat/completions";
    process.env["SCAN_MODEL"] = "gemini-2.5-flash";
    process.env["SCAN_MODEL_FALLBACK"] = "gemini-2.0-flash";
    process.env["EXPLAIN_MODEL"] = "gemini-2.0-flash";
    process.env["EXPLAIN_DAILY_LIMIT"] = "300";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  // -------------------------------------------------------------
  // 1. Server Route Tests (/api/explain)
  // -------------------------------------------------------------
  describe("1. Server Route (/api/explain)", () => {
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

    const routeObj = ExplainApiRoute as unknown as RouteWithHandlers;
    const getHandler = routeObj.options.server.handlers.GET;
    const postHandler = routeObj.options.server.handlers.POST;

    it("GET /api/explain returns enabled: true and never leaks the API key or its length", async () => {
      const res = await getHandler();
      const data = await res.json();

      expect(data).toEqual({ status: "ok", enabled: true });
      expect(data).not.toHaveProperty("key");
      expect(data).not.toHaveProperty("apiKey");
      expect(data).not.toHaveProperty("keyLength");
    });

    it("GET /api/explain returns enabled: false when required env vars are missing", async () => {
      delete process.env["SCAN_API_KEY"];
      const res = await getHandler();
      const data = await res.json();

      expect(data).toEqual({ status: "ok", enabled: false });
    });

    it("POST returns 503 explain_unavailable when env vars are missing", async () => {
      delete process.env["SCAN_API_KEY"];
      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: [{ name: "Paracetamol" }],
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data).toEqual({ error: "explain_unavailable" });
    });

    it("POST validates input with Zod and rejects invalid lang", async () => {
      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: [{ name: "Paracetamol" }],
          lang: "fr", // Unsupported language
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "bad_request" });
    });

    it("POST rejects requests with more than 10 medicines", async () => {
      const tooMany = Array.from({ length: 11 }, (_, i) => ({ name: `Medicine ${i}` }));
      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: tooMany,
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "bad_request" });
    });

    it("POST rate limits clients exceeding 10 req/min or 60 req/day", async () => {
      const clientIp = "192.168.1.150";
      // Fill 10 requests
      for (let i = 0; i < 10; i++) {
        expect(isExplainRateLimited(clientIp)).toBe(false);
      }
      // 11th request should be rate limited
      expect(isExplainRateLimited(clientIp)).toBe(true);

      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": clientIp,
        },
        body: JSON.stringify({
          medicines: [{ name: "Paracetamol" }],
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data).toEqual({ error: "rate_limited" });
    });

    it("POST returns 503 explain_unavailable without calling upstream when daily budget cap is reached", async () => {
      resetExplainDailyBudgetForTests(300);
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: [{ name: "Paracetamol" }],
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data).toEqual({ error: "explain_unavailable" });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("POST successfully processes valid batch in one upstream call", async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [
                  {
                    name: "Paracetamol",
                    usedFor: "Commonly used for reducing fever and mild to moderate pain.",
                    howUsuallyTaken: "Usually taken with water after food.",
                    commonSideEffects: ["Nausea", "Stomach upset"],
                    askDoctorIf: ["Pain lasts more than 3 days"],
                    confidence: "high",
                  },
                  {
                    name: "Shelcal 500",
                    usedFor: "Commonly used for calcium supplementation to maintain strong bones.",
                    howUsuallyTaken: "Usually taken once daily after meals.",
                    commonSideEffects: ["Constipation"],
                    askDoctorIf: ["You experience kidney stones"],
                    confidence: "high",
                  },
                ],
              }),
            },
          },
        ],
      };

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });
      globalThis.fetch = fetchSpy;

      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: [
            { name: "Paracetamol", dose: "500 mg" },
            { name: "Shelcal 500", dose: "500 mg" },
          ],
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(data.items).toHaveLength(2);
      expect(data.items[0]?.name).toBe("Paracetamol");
      expect(data.items[0]?.confidence).toBe("high");
      expect(data.items[0]?.usedFor).toContain("reducing fever");
      expect(data.items[1]?.name).toBe("Shelcal 500");
    });

    it("POST handles markdown code fences in model output", async () => {
      const fencedOutput =
        "```json\n" +
        JSON.stringify({
          items: [
            {
              name: "Amoxicillin",
              usedFor: "Commonly used for treating bacterial infections.",
              howUsuallyTaken: "Usually taken with plenty of water.",
              commonSideEffects: ["Diarrhea", "Nausea"],
              askDoctorIf: ["You develop a skin rash"],
              confidence: "high",
            },
          ],
        }) +
        "\n```";

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: fencedOutput } }],
        }),
      });

      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: [{ name: "Amoxicillin" }],
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items[0]?.usedFor).toContain("bacterial infections");
    });

    it("POST returns upstream_error on malformed JSON from model", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "{ invalid json string" } }],
        }),
      });

      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: [{ name: "Paracetamol" }],
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data).toEqual({ error: "upstream_error" });
    });

    it("unknown medicine sets confidence to low and usedFor to null", () => {
      const raw = JSON.stringify({
        items: [
          {
            name: "Zorvex 55",
            usedFor: null,
            howUsuallyTaken: null,
            commonSideEffects: [],
            askDoctorIf: [],
            confidence: "low",
          },
        ],
      });

      const items = parseAndSanitizeExplainResponse(raw, [{ name: "Zorvex 55" }]);
      expect(items[0]?.confidence).toBe("low");
      expect(items[0]?.usedFor).toBeNull();
    });

    it("filters unsafe phrases and drops fields with dosage advice or diagnoses", () => {
      expect(containsUnsafePhrase("You should stop taking this immediately")).toBe(true);
      expect(containsUnsafePhrase("Do not take with milk")).toBe(true);
      expect(containsUnsafePhrase("Please increase the dose tomorrow")).toBe(true);
      expect(containsUnsafePhrase("Take double the amount if missed")).toBe(true);
      expect(containsUnsafePhrase("Because you have diabetes")).toBe(true);
      expect(containsUnsafePhrase("You are diagnosed with hypertension")).toBe(true);
      expect(containsUnsafePhrase("Take 500 mg daily")).toBe(true);

      const raw = JSON.stringify({
        items: [
          {
            name: "TestMed",
            usedFor: "Commonly used for headaches, but stop taking if dizzy.",
            howUsuallyTaken: "Take 250 mg with water.",
            commonSideEffects: ["Nausea", "You have rash", "Mild headache"],
            askDoctorIf: ["Swelling occurs", "Do not take another pill"],
            confidence: "high",
          },
        ],
      });

      const items = parseAndSanitizeExplainResponse(raw, [{ name: "TestMed" }]);
      // Unsafe phrase in usedFor causes usedFor to be dropped and confidence to become low
      expect(items[0]?.usedFor).toBeNull();
      expect(items[0]?.confidence).toBe("low");
      // Unsafe dosage in howUsuallyTaken is dropped
      expect(items[0]?.howUsuallyTaken).toBeNull();
      // Unsafe phrases in arrays are filtered out
      expect(items[0]?.commonSideEffects).toEqual(["Nausea", "Mild headache"]);
      expect(items[0]?.askDoctorIf).toEqual(["Swelling occurs"]);
    });

    it("retries once on 429 and succeeds if second attempt returns 200", async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [
                  {
                    name: "Paracetamol",
                    usedFor: "Commonly used for pain and fever.",
                    howUsuallyTaken: "Take with water.",
                    commonSideEffects: [],
                    askDoctorIf: [],
                    confidence: "high",
                  },
                ],
              }),
            },
          },
        ],
      };

      const fetchSpy = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "Rate limit exceeded",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockApiResponse,
        });

      globalThis.fetch = fetchSpy;

      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines: [{ name: "Paracetamol" }],
          lang: "en",
        }),
      });

      const res = await postHandler({ request: req });
      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const data = await res.json();
      expect(data.items[0]?.usedFor).toContain("pain and fever");
    });
  });

  // -------------------------------------------------------------
  // 2. Client Service Tests (src/services/medicineInfo.ts)
  // -------------------------------------------------------------
  describe("2. Client Service (medicineInfo.ts)", () => {
    it("returns cached result without making any network request", async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      // Seed cache directly via storage
      storage.set("med_info_cache", {
        "paracetamol::en": {
          explanation: {
            name: "Paracetamol",
            usedFor: "Cached explanation for pain.",
            howUsuallyTaken: "With water.",
            commonSideEffects: ["Nausea"],
            askDoctorIf: [],
            confidence: "high",
          },
          savedAt: Date.now(),
        },
      });

      const result = await getMedicineInfo(["Paracetamol"], "en");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result["Paracetamol"]?.source).toBe("cache");
      expect(result["Paracetamol"]?.usedFor).toBe("Cached explanation for pain.");
    });

    it("sends only uncached names in one batch request", async () => {
      // Seed Paracetamol in cache
      storage.set("med_info_cache", {
        "paracetamol::en": {
          explanation: {
            name: "Paracetamol",
            usedFor: "Pain relief.",
            howUsuallyTaken: null,
            commonSideEffects: [],
            askDoctorIf: [],
            confidence: "high",
          },
          savedAt: Date.now(),
        },
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              name: "Amoxicillin",
              usedFor: "Antibiotic for bacterial infections.",
              howUsuallyTaken: "Take after food.",
              commonSideEffects: [],
              askDoctorIf: [],
              confidence: "high",
            },
          ],
        }),
      });
      globalThis.fetch = fetchSpy;

      const result = await getMedicineInfo(["Paracetamol", "Amoxicillin"], "en");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(fetchSpy.mock.calls[0]![1].body);
      expect(requestBody.medicines).toEqual([{ name: "Amoxicillin" }]);

      expect(result["Paracetamol"]?.source).toBe("cache");
      expect(result["Amoxicillin"]?.source).toBe("ai");
      expect(result["Amoxicillin"]?.usedFor).toContain("Antibiotic");
    });

    it("never caches low-confidence or failed results", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              name: "Zorvex 55",
              usedFor: null,
              howUsuallyTaken: null,
              commonSideEffects: [],
              askDoctorIf: [],
              confidence: "low",
            },
          ],
        }),
      });

      const result = await getMedicineInfo(["Zorvex 55"], "en");
      expect(result["Zorvex 55"]?.confidence).toBe("low");

      // Verify not stored in cache
      const cache = storage.get<Record<string, unknown>>("med_info_cache", {});
      expect(cache["zorvex 55::en"]).toBeUndefined();
    });

    it("evicts cache entries older than 90 days and refetches", async () => {
      const ninetyOneDaysAgo = Date.now() - (CACHE_TTL_MS + 24 * 60 * 60 * 1000);

      storage.set("med_info_cache", {
        "paracetamol::en": {
          explanation: {
            name: "Paracetamol",
            usedFor: "Old explanation.",
            howUsuallyTaken: null,
            commonSideEffects: [],
            askDoctorIf: [],
            confidence: "high",
          },
          savedAt: ninetyOneDaysAgo,
        },
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              name: "Paracetamol",
              usedFor: "Fresh explanation.",
              howUsuallyTaken: null,
              commonSideEffects: [],
              askDoctorIf: [],
              confidence: "high",
            },
          ],
        }),
      });
      globalThis.fetch = fetchSpy;

      const result = await getMedicineInfo(["Paracetamol"], "en");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result["Paracetamol"]?.source).toBe("ai");
      expect(result["Paracetamol"]?.usedFor).toBe("Fresh explanation.");
    });

    it("falls back gracefully when offline or upstream fails", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const result = await getMedicineInfo(["Ibuprofen 400"], "en");
      expect(result["Ibuprofen 400"]?.source).toBe("fallback");
      expect(result["Ibuprofen 400"]?.confidence).toBe("high");
      expect(result["Ibuprofen 400"]?.usedFor).toBeTruthy();
    });

    it("deduplicates parallel in-flight requests for the same medicine", async () => {
      let resolveFetch!: (val: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      const fetchSpy = vi.fn().mockImplementation(() => fetchPromise);
      globalThis.fetch = fetchSpy;

      // Trigger two parallel requests for the same medicine
      const call1 = getMedicineInfo(["Cetirizine"], "en");
      const call2 = getMedicineInfo(["Cetirizine"], "en");

      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Resolve the fetch
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              name: "Cetirizine",
              usedFor: "Commonly used for allergies.",
              howUsuallyTaken: "Take once daily.",
              commonSideEffects: ["Drowsiness"],
              askDoctorIf: [],
              confidence: "high",
            },
          ],
        }),
      });

      const [res1, res2] = await Promise.all([call1, call2]);
      expect(res1["Cetirizine"]?.usedFor).toBe("Commonly used for allergies.");
      expect(res2["Cetirizine"]?.usedFor).toBe("Commonly used for allergies.");
    });

    it("clears cached explanations when storage.clearAll() is called", async () => {
      storage.set("med_info_cache", {
        "paracetamol::en": {
          explanation: {
            name: "Paracetamol",
            usedFor: "Pain relief.",
            howUsuallyTaken: null,
            commonSideEffects: [],
            askDoctorIf: [],
            confidence: "high",
          },
          savedAt: Date.now(),
        },
      });

      await storage.clearAll();

      const cacheAfter = storage.get<Record<string, unknown>>("med_info_cache", {});
      expect(Object.keys(cacheAfter)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------
  // 3. UI Component Tests (MedicineExplanationCard.tsx)
  // -------------------------------------------------------------
  describe("3. UI Component (MedicineExplanationCard)", () => {
    it("renders AI explained line with source badge and expands details", () => {
      const exp = {
        name: "Paracetamol",
        usedFor: "Commonly used for headache and fever.",
        howUsuallyTaken: "Take with a glass of water.",
        commonSideEffects: ["Mild nausea"],
        askDoctorIf: ["Fever lasts over 3 days"],
        confidence: "high" as const,
        source: "ai" as const,
      };

      render(<MedicineExplanationCard name="Paracetamol" info={exp} />);

      expect(screen.getByTestId("medicine-used-for").textContent).toContain(
        "Commonly used for headache and fever.",
      );
      expect(screen.getByTestId("medicine-info-source").textContent).toContain("Explained by AI");

      // Collapsible details toggle
      const toggleBtn = screen.getByTestId("toggle-more-info");
      expect(screen.queryByTestId("medicine-more-details")).toBeNull();

      fireEvent.click(toggleBtn);
      expect(screen.getByTestId("medicine-more-details")).toBeTruthy();
      expect(screen.getByText("Take with a glass of water.")).toBeTruthy();
      expect(screen.getByText("Mild nausea")).toBeTruthy();
      expect(screen.getByText("Fever lasts over 3 days")).toBeTruthy();
    });

    it("renders fallback line with General information only label", () => {
      const fallback = getFallbackExplanation("Paracetamol", "en");
      render(<MedicineExplanationCard name="Paracetamol" info={fallback} />);

      expect(screen.getByTestId("medicine-info-source").textContent).toContain(
        "General information only",
      );
    });

    it("renders low confidence warning without usedFor", () => {
      const lowConf = {
        name: "Zorvex 55",
        usedFor: null,
        howUsuallyTaken: null,
        commonSideEffects: [],
        askDoctorIf: [],
        confidence: "low" as const,
        source: "ai" as const,
      };

      render(<MedicineExplanationCard name="Zorvex 55" info={lowConf} />);

      expect(screen.getByTestId("medicine-info-low-confidence")).toBeTruthy();
      expect(
        screen.getByText("We are not sure about this medicine. Please ask your pharmacist."),
      ).toBeTruthy();
      expect(screen.queryByTestId("medicine-used-for")).toBeNull();
    });

    it("renders skeleton while loading", () => {
      render(<MedicineExplanationCard name="Paracetamol" loading={true} />);
      expect(screen.getByTestId("medicine-info-skeleton")).toBeTruthy();
    });
  });
});
