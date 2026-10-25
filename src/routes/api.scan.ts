import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getScanConfig } from "@/lib/server-env";
import { callUpstreamChat } from "@/lib/server-ai";

// In-memory sliding window rate limiter: 6 req/min, 30 req/day per client IP
const minRateLimitMap = new Map<string, number[]>();
const dayRateLimitMap = new Map<string, number[]>();

export function isScanRateLimited(clientIp: string): boolean {
  const now = Date.now();

  // Minute window (6 req / 60s)
  const minHistory = (minRateLimitMap.get(clientIp) || []).filter((t) => now - t < 60000);
  if (minHistory.length >= 6) {
    minRateLimitMap.set(clientIp, minHistory);
    return true;
  }

  // Day window (30 req / 24h)
  const dayHistory = (dayRateLimitMap.get(clientIp) || []).filter((t) => now - t < 86400000);
  if (dayHistory.length >= 30) {
    dayRateLimitMap.set(clientIp, dayHistory);
    return true;
  }

  minHistory.push(now);
  dayHistory.push(now);
  minRateLimitMap.set(clientIp, minHistory);
  dayRateLimitMap.set(clientIp, dayHistory);
  return false;
}

export function clearScanRateLimitsForTests(): void {
  minRateLimitMap.clear();
  dayRateLimitMap.clear();
}

// In-memory daily model call counters reset at midnight America/Los_Angeles
export function getPacificDateString(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

let lastResetPacificDate = getPacificDateString();
let primaryCallCount = 0;
let fallbackCallCount = 0;

export function checkAndResetDailyBudget(): void {
  const todayPacific = getPacificDateString();
  if (todayPacific !== lastResetPacificDate) {
    lastResetPacificDate = todayPacific;
    primaryCallCount = 0;
    fallbackCallCount = 0;
  }
}

export function getScanDailyBudgetStatus() {
  checkAndResetDailyBudget();
  const config = getScanConfig();
  const primaryLimit = config.dailyLimit;
  const fallbackLimit = 400;

  return {
    primaryUsed: primaryCallCount,
    primaryLimit,
    primaryExceeded: primaryCallCount >= primaryLimit,
    fallbackUsed: fallbackCallCount,
    fallbackLimit,
    fallbackExceeded: fallbackCallCount >= fallbackLimit,
  };
}

export function incrementScanBudget(isFallback = false): void {
  checkAndResetDailyBudget();
  if (isFallback) {
    fallbackCallCount++;
  } else {
    primaryCallCount++;
  }
}

export function resetScanBudgetForTests(
  primary = 0,
  fallback = 0,
  date = getPacificDateString(),
): void {
  primaryCallCount = primary;
  fallbackCallCount = fallback;
  lastResetPacificDate = date;
}

export const SCAN_SYSTEM_PROMPT =
  "You read photos of Indian medical prescriptions, often handwritten. Extract ONLY the medicines that are actually written. Never guess or invent a medicine, dose or duration. If something is unreadable or missing, use null and set needsCheck to true for that medicine. Keep medicine names exactly as printed or written, in Latin script where they appear. Interpret common abbreviations: OD or 1-0-0 = once daily morning; BD or BID or 1-0-1 = morning and night; TDS or TID or 1-1-1 = morning, afternoon, night; QID = four times; HS = night; SOS or PRN = only when needed (set asNeeded true); AC = before food; PC = after food. Convert durations like '5 days', '1 week', '1 month' or 'x 10d' to a number of days. Return ONLY valid JSON with no markdown and no commentary. If the image is not a prescription or is too unreadable, return {\"isPrescription\": false, \"medicines\": []}. This is only for organising information; do not give medical advice.";

const RawMedicineItemSchema = z.object({
  name: z.unknown(),
  dose: z.unknown().optional(),
  timings: z.unknown().optional(),
  food: z.unknown().optional(),
  durationDays: z.unknown().optional(),
  asNeeded: z.unknown().optional(),
  category: z.unknown().optional(),
  needsCheck: z.unknown().optional(),
  note: z.unknown().optional(),
});

const RawPrescriptionResponseSchema = z.object({
  isPrescription: z.boolean().optional(),
  medicines: z.array(RawMedicineItemSchema).optional(),
});

export type ExtractedMedicine = {
  name: string;
  dose: string | null;
  frequency: number;
  timings: ("morning" | "afternoon" | "evening" | "night")[];
  food: "before" | "after" | "with" | "any";
  durationDays: number | null;
  asNeeded: boolean;
  category?:
    | "iron"
    | "calcium"
    | "painRelief"
    | "hormonal"
    | "antacid"
    | "antibiotic"
    | "general"
    | undefined;
  needsCheck: boolean;
  note: string | null;
};

const VALID_TIMINGS = new Set(["morning", "afternoon", "evening", "night"] as const);
const VALID_FOOD = new Set(["before", "after", "with", "any"] as const);
const VALID_CATEGORIES = new Set([
  "iron",
  "calcium",
  "painRelief",
  "hormonal",
  "antacid",
  "antibiotic",
  "general",
] as const);

export function parseAndSanitizeResponse(rawText: string): {
  isPrescription: boolean;
  medicines: ExtractedMedicine[];
} {
  // Strip markdown code fences
  let clean = rawText.trim();
  if (clean.startsWith("```")) {
    clean = clean
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(clean);
  } catch {
    throw new Error("unreadable_json");
  }

  const parsed = RawPrescriptionResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("invalid_schema");
  }

  const isPrescription = parsed.data.isPrescription !== false;
  if (!isPrescription) {
    return { isPrescription: false, medicines: [] };
  }

  const rawList = Array.isArray(parsed.data.medicines) ? parsed.data.medicines : [];
  const medicines: ExtractedMedicine[] = [];

  for (const item of rawList) {
    if (medicines.length >= 20) break; // Cap at 20 medicines

    // Validate and clean name
    const rawName = typeof item.name === "string" ? item.name.trim() : "";
    if (!rawName) continue; // Drop entries without a name
    const name = rawName.slice(0, 100);

    // Dose
    let dose: string | null = null;
    if (typeof item.dose === "string" && item.dose.trim()) {
      dose = item.dose.trim().slice(0, 50);
    }

    // asNeeded
    const asNeeded = Boolean(item.asNeeded);

    // Timings
    const timings: ("morning" | "afternoon" | "evening" | "night")[] = [];
    if (Array.isArray(item.timings)) {
      for (const t of item.timings) {
        if (
          typeof t === "string" &&
          VALID_TIMINGS.has(t as "morning" | "afternoon" | "evening" | "night")
        ) {
          const validT = t as "morning" | "afternoon" | "evening" | "night";
          if (!timings.includes(validT)) {
            timings.push(validT);
          }
        }
      }
    }
    // If not asNeeded and no timings, default to ["morning"]
    if (timings.length === 0 && !asNeeded) {
      timings.push("morning");
    }

    // Food
    let food: "before" | "after" | "with" | "any" = "any";
    if (
      typeof item.food === "string" &&
      VALID_FOOD.has(item.food as "before" | "after" | "with" | "any")
    ) {
      food = item.food as "before" | "after" | "with" | "any";
    }

    // Duration days clamped to 1-365
    let durationDays: number | null = null;
    if (typeof item.durationDays === "number" && Number.isFinite(item.durationDays)) {
      durationDays = Math.max(1, Math.min(365, Math.round(item.durationDays)));
    } else if (typeof item.durationDays === "string") {
      const parsedNum = parseInt(item.durationDays, 10);
      if (Number.isFinite(parsedNum) && parsedNum > 0) {
        durationDays = Math.max(1, Math.min(365, parsedNum));
      }
    }

    // Needs check
    const needsCheck = Boolean(item.needsCheck) || !dose || durationDays == null;

    // Category: only set if valid, otherwise undefined so client falls back to inferCategory(name)
    let category: ExtractedMedicine["category"] | undefined = undefined;
    if (
      typeof item.category === "string" &&
      VALID_CATEGORIES.has(item.category as NonNullable<ExtractedMedicine["category"]>)
    ) {
      category = item.category as NonNullable<ExtractedMedicine["category"]>;
    }

    // Note
    let note: string | null = null;
    if (typeof item.note === "string" && item.note.trim()) {
      note = item.note.trim().slice(0, 200);
    }

    medicines.push({
      name,
      dose,
      frequency: Math.max(1, timings.length),
      timings,
      food,
      durationDays,
      asNeeded,
      category,
      needsCheck,
      note,
    });
  }

  return { isPrescription: true, medicines };
}

async function callUpstreamVision(
  provider: "openai" | "anthropic",
  apiUrl: string,
  apiKey: string,
  model: string,
  image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  timeoutMs = 30000,
): Promise<{ text: string; status: number; errorBody?: string }> {
  return callUpstreamChat({
    provider,
    apiUrl,
    apiKey,
    model,
    systemPrompt: SCAN_SYSTEM_PROMPT,
    userPrompt: "Extract all medicines from this prescription photo.",
    image: {
      data: image,
      mediaType,
    },
    timeoutMs,
  });
}

export const Route = createFileRoute("/api/scan")({
  server: {
    handlers: {
      GET: async () => {
        const config = getScanConfig();
        const enabled = Boolean(config.apiKey && config.apiUrl && config.model);
        return Response.json({
          status: "ok",
          enabled,
        });
      },

      POST: async ({ request }) => {
        // Extract client IP for rate limiting
        const forwarded = request.headers.get("x-forwarded-for");
        const clientIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "127.0.0.1") : "127.0.0.1";

        // Rate limit check
        if (isScanRateLimited(clientIp)) {
          console.warn(`[scan-api] Rate limit reached for client: ${clientIp}`);
          return Response.json({ error: "rate_limited" }, { status: 429 });
        }

        // Check environment configuration
        const config = getScanConfig();
        if (!config.apiKey || !config.apiUrl || !config.model) {
          console.warn("[scan-api] Scan service unavailable: missing environment variables");
          return Response.json({ error: "scan_unavailable" }, { status: 503 });
        }

        // Check daily budget
        const budget = getScanDailyBudgetStatus();
        let targetModel = config.model;
        let isFallback = false;

        if (budget.primaryExceeded) {
          if (config.modelFallback && !budget.fallbackExceeded) {
            targetModel = config.modelFallback;
            isFallback = true;
          } else {
            console.warn("[scan-api] Daily scan budget exceeded for all models");
            return Response.json({ error: "scan_unavailable" }, { status: 503 });
          }
        }

        // Parse request JSON
        let body: { image?: unknown; mediaType?: unknown; lang?: unknown } | null = null;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "bad_image" }, { status: 400 });
        }

        const image = typeof body?.image === "string" ? body.image.trim() : "";
        const mediaType = typeof body?.mediaType === "string" ? body.mediaType.trim() : "";

        // Validate mediaType
        if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") {
          return Response.json({ error: "bad_image" }, { status: 400 });
        }

        // Validate base64 payload exists
        if (!image) {
          return Response.json({ error: "bad_image" }, { status: 400 });
        }

        // Validate decoded size <= 4 MB (in base64, size is ~ (len * 3) / 4)
        const approxSizeBytes = Math.floor((image.length * 3) / 4);
        if (approxSizeBytes > 4 * 1024 * 1024) {
          return Response.json({ error: "too_large" }, { status: 413 });
        }

        // Call upstream model with retry chain
        let upstreamResult: { text: string; status: number; errorBody?: string } | null = null;
        let answeredModel = targetModel;

        try {
          upstreamResult = await callUpstreamVision(
            config.provider,
            config.apiUrl,
            config.apiKey,
            targetModel,
            image,
            mediaType,
            30000,
          );
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            console.warn(`[scan-api] Upstream call timed out for model: ${targetModel}`);
            return Response.json({ error: "timeout" }, { status: 504 });
          }
          console.warn(`[scan-api] Upstream network error for model: ${targetModel}`);
        }

        // Check if retry on fallback is needed
        const isQuotaOrNotFound =
          upstreamResult &&
          (upstreamResult.status === 429 ||
            upstreamResult.status === 404 ||
            (upstreamResult.errorBody &&
              /quota|RESOURCE_EXHAUSTED|model_not_found|NotFound/i.test(upstreamResult.errorBody)));

        if ((!upstreamResult || isQuotaOrNotFound || upstreamResult.status >= 500) && !isFallback) {
          if (
            config.modelFallback &&
            config.modelFallback !== config.model &&
            !budget.fallbackExceeded
          ) {
            console.info(`[scan-api] Retrying once with fallback model: ${config.modelFallback}`);
            isFallback = true;
            answeredModel = config.modelFallback;
            try {
              upstreamResult = await callUpstreamVision(
                config.provider,
                config.apiUrl,
                config.apiKey,
                config.modelFallback,
                image,
                mediaType,
                30000,
              );
            } catch (err: unknown) {
              if (err instanceof Error && err.name === "AbortError") {
                return Response.json({ error: "timeout" }, { status: 504 });
              }
            }
          }
        }

        if (!upstreamResult || upstreamResult.status !== 200 || !upstreamResult.text) {
          const status = upstreamResult?.status ?? 502;
          console.warn(`[scan-api] Upstream error: status ${status}, model ${answeredModel}`);
          if (status === 429) {
            return Response.json({ error: "rate_limited" }, { status: 429 });
          }
          return Response.json({ error: "upstream_error" }, { status: 502 });
        }

        // Increment daily call counter
        incrementScanBudget(isFallback);

        // Defensive parsing
        try {
          const { isPrescription, medicines } = parseAndSanitizeResponse(upstreamResult.text);
          console.info(
            `[scan-api] Scan completed successfully with model: ${answeredModel}, found: ${medicines.length}`,
          );
          return Response.json({
            isPrescription,
            medicines,
            model: answeredModel,
          });
        } catch {
          console.warn(`[scan-api] Failed to parse model output as JSON (model: ${answeredModel})`);
          return Response.json({ error: "unreadable" }, { status: 422 });
        }
      },
    },
  },
});
