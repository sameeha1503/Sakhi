import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getExplainConfig } from "@/lib/server-env";
import { callUpstreamChat, getPacificDateString } from "@/lib/server-ai";

// In-memory sliding window rate limiter: 10 req/min, 60 req/day per client IP
const minRateLimitMap = new Map<string, number[]>();
const dayRateLimitMap = new Map<string, number[]>();

export function isExplainRateLimited(clientIp: string): boolean {
  const now = Date.now();

  // Minute window (10 req / 60s)
  const minHistory = (minRateLimitMap.get(clientIp) || []).filter((t) => now - t < 60000);
  if (minHistory.length >= 10) {
    minRateLimitMap.set(clientIp, minHistory);
    return true;
  }

  // Day window (60 req / 24h)
  const dayHistory = (dayRateLimitMap.get(clientIp) || []).filter((t) => now - t < 86400000);
  if (dayHistory.length >= 60) {
    dayRateLimitMap.set(clientIp, dayHistory);
    return true;
  }

  minHistory.push(now);
  dayHistory.push(now);
  minRateLimitMap.set(clientIp, minHistory);
  dayRateLimitMap.set(clientIp, dayHistory);
  return false;
}

export function clearExplainRateLimitsForTests(): void {
  minRateLimitMap.clear();
  dayRateLimitMap.clear();
}

// Global daily counter resets at midnight America/Los_Angeles
let lastResetPacificDate = getPacificDateString();
let dailyCallCount = 0;

export function checkAndResetDailyBudget(): void {
  const todayPacific = getPacificDateString();
  if (todayPacific !== lastResetPacificDate) {
    lastResetPacificDate = todayPacific;
    dailyCallCount = 0;
  }
}

export function getExplainDailyBudgetStatus() {
  checkAndResetDailyBudget();
  const config = getExplainConfig();
  const limit = config.dailyLimit;
  return {
    used: dailyCallCount,
    limit,
    exceeded: dailyCallCount >= limit,
  };
}

export function incrementExplainBudget(): void {
  checkAndResetDailyBudget();
  dailyCallCount++;
}

export function resetExplainDailyBudgetForTests(count = 0, date = getPacificDateString()): void {
  dailyCallCount = count;
  lastResetPacificDate = date;
}

export const SUPPORTED_LANGUAGES = [
  "en",
  "hi",
  "te",
  "ta",
  "kn",
  "ml",
  "mr",
  "bn",
  "gu",
  "pa",
  "or",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// eslint-disable-next-line no-control-regex
const stripControl = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, "").trim();

const ExplainMedicineInputSchema = z.object({
  name: z.string().transform(stripControl).pipe(z.string().min(1).max(80)),
  dose: z.string().transform(stripControl).pipe(z.string().max(40)).optional().nullable(),
});

const ExplainRequestSchema = z.object({
  medicines: z.array(ExplainMedicineInputSchema).min(1).max(10),
  lang: z.enum(SUPPORTED_LANGUAGES),
});

export type MedicineExplanationItem = {
  name: string;
  usedFor: string | null;
  howUsuallyTaken: string | null;
  commonSideEffects: string[];
  askDoctorIf: string[];
  confidence: "high" | "low";
};

export const UNSAFE_PATTERNS = [
  /stop\s+taking/i,
  /do\s+not\s+take/i,
  /increase\s+the\s+dose/i,
  /\bdouble\b/i,
  /\byou\s+have\b/i,
  /\byou\s+are\s+diagnosed\b/i,
  /\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|gm|g|tablets?|capsules?|drops?|pills?|teaspoons?|puffs?)\b/i,
];

export function containsUnsafePhrase(text: string): boolean {
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(text));
}

const RawExplanationItemSchema = z.object({
  name: z.unknown().optional(),
  usedFor: z.unknown().optional().nullable(),
  howUsuallyTaken: z.unknown().optional().nullable(),
  commonSideEffects: z.unknown().optional(),
  askDoctorIf: z.unknown().optional(),
  confidence: z.unknown().optional(),
});

const RawExplanationResponseSchema = z.object({
  items: z.array(RawExplanationItemSchema),
});

export function buildExplainSystemPrompt(lang: string): string {
  return `You explain medicines to women in India in very simple language at about a 6th-grade reading level, in the language with code ${lang}. Keep medicine names exactly as given, in their original script. For each medicine give: usedFor (1-2 short sentences starting with words like 'Commonly used for'), howUsuallyTaken (1 short general sentence), commonSideEffects (up to 3 short items), askDoctorIf (up to 2 short items), and confidence ('high' or 'low'). Many medicines have several uses, so make clear the doctor chose it for the person's own situation. NEVER give dose amounts, never change a prescribed dose, never tell anyone to stop or skip a medicine, never mention drug interactions, never diagnose, never say 'you have'. If you do not recognise the name or are not sure, set confidence 'low' and usedFor to null instead of guessing. Return ONLY valid JSON: { items: [{ name, usedFor, howUsuallyTaken, commonSideEffects, askDoctorIf, confidence }] } in the same order as the input.`;
}

export function parseAndSanitizeExplainResponse(
  rawText: string,
  inputMedicines: Array<{ name: string; dose?: string | null | undefined }>,
): MedicineExplanationItem[] {
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

  const parsed = RawExplanationResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("invalid_schema");
  }

  const rawItems = parsed.data.items;
  const items: MedicineExplanationItem[] = [];

  for (let i = 0; i < inputMedicines.length; i++) {
    const inputMed = inputMedicines[i]!;
    const raw = rawItems[i] || {};

    let confidence: "high" | "low" =
      raw.confidence === "high" || raw.confidence === "low"
        ? (raw.confidence as "high" | "low")
        : "low";

    let usedFor: string | null = null;
    if (typeof raw.usedFor === "string" && raw.usedFor.trim()) {
      const trimmed = raw.usedFor.trim().slice(0, 300);
      if (containsUnsafePhrase(trimmed)) {
        usedFor = null;
        confidence = "low";
      } else {
        usedFor = trimmed;
      }
    }

    // If confidence is low, usedFor must be null
    if (confidence === "low") {
      usedFor = null;
    }

    let howUsuallyTaken: string | null = null;
    if (typeof raw.howUsuallyTaken === "string" && raw.howUsuallyTaken.trim()) {
      const trimmed = raw.howUsuallyTaken.trim().slice(0, 200);
      if (!containsUnsafePhrase(trimmed)) {
        howUsuallyTaken = trimmed;
      }
    }

    const commonSideEffects: string[] = [];
    if (Array.isArray(raw.commonSideEffects)) {
      for (const item of raw.commonSideEffects) {
        if (commonSideEffects.length >= 3) break;
        if (typeof item === "string" && item.trim()) {
          const trimmed = item.trim().slice(0, 100);
          if (!containsUnsafePhrase(trimmed)) {
            commonSideEffects.push(trimmed);
          }
        }
      }
    }

    const askDoctorIf: string[] = [];
    if (Array.isArray(raw.askDoctorIf)) {
      for (const item of raw.askDoctorIf) {
        if (askDoctorIf.length >= 2) break;
        if (typeof item === "string" && item.trim()) {
          const trimmed = item.trim().slice(0, 100);
          if (!containsUnsafePhrase(trimmed)) {
            askDoctorIf.push(trimmed);
          }
        }
      }
    }

    items.push({
      name: inputMed.name,
      usedFor,
      howUsuallyTaken,
      commonSideEffects,
      askDoctorIf,
      confidence,
    });
  }

  return items;
}

export const Route = createFileRoute("/api/explain")({
  server: {
    handlers: {
      GET: async () => {
        const config = getExplainConfig();
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

        // Rate limit check: 10/min, 60/day
        if (isExplainRateLimited(clientIp)) {
          console.warn(`[explain-api] Rate limit reached for client: ${clientIp}`);
          return Response.json({ error: "rate_limited" }, { status: 429 });
        }

        // Check environment configuration
        const config = getExplainConfig();
        if (!config.apiKey || !config.apiUrl || !config.model) {
          console.warn("[explain-api] Service unavailable: missing environment variables");
          return Response.json({ error: "explain_unavailable" }, { status: 503 });
        }

        // Check global daily budget
        const budget = getExplainDailyBudgetStatus();
        if (budget.exceeded) {
          console.warn("[explain-api] Daily explain budget exceeded");
          return Response.json({ error: "explain_unavailable" }, { status: 503 });
        }

        // Parse request JSON
        let body: unknown = null;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "bad_request" }, { status: 400 });
        }

        // Validate payload with Zod
        const parsedInput = ExplainRequestSchema.safeParse(body);
        if (!parsedInput.success) {
          return Response.json({ error: "bad_request" }, { status: 400 });
        }

        const { medicines, lang } = parsedInput.data;
        const systemPrompt = buildExplainSystemPrompt(lang);

        // Privacy: send only names, doses, and lang. No user profile, location, or logs.
        const userPrompt = JSON.stringify({
          medicines: medicines.map((m) => ({
            name: m.name,
            ...(m.dose ? { dose: m.dose } : {}),
          })),
          lang,
        });

        // Upstream call with 20s timeout and 1 retry on 429
        let upstreamResult: { text: string; status: number; errorBody?: string } | null = null;

        try {
          upstreamResult = await callUpstreamChat({
            provider: config.provider,
            apiUrl: config.apiUrl,
            apiKey: config.apiKey,
            model: config.model,
            systemPrompt,
            userPrompt,
            timeoutMs: 20000,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            console.warn("[explain-api] Upstream call timed out");
            return Response.json({ error: "timeout" }, { status: 504 });
          }
          console.warn("[explain-api] Upstream network error");
        }

        // Retry once on 429
        if (upstreamResult && upstreamResult.status === 429) {
          console.info("[explain-api] Upstream returned 429, retrying once...");
          try {
            upstreamResult = await callUpstreamChat({
              provider: config.provider,
              apiUrl: config.apiUrl,
              apiKey: config.apiKey,
              model: config.model,
              systemPrompt,
              userPrompt,
              timeoutMs: 20000,
            });
          } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") {
              return Response.json({ error: "timeout" }, { status: 504 });
            }
          }
        }

        if (!upstreamResult || upstreamResult.status !== 200 || !upstreamResult.text) {
          const status = upstreamResult?.status ?? 502;
          console.warn(`[explain-api] Upstream error: status ${status}`);
          if (status === 429) {
            return Response.json({ error: "rate_limited" }, { status: 429 });
          }
          return Response.json({ error: "upstream_error" }, { status: 502 });
        }

        // Increment daily call counter
        incrementExplainBudget();

        // Defensive parsing & safety filtering
        try {
          const items = parseAndSanitizeExplainResponse(upstreamResult.text, medicines);
          console.info(`[explain-api] Explanations generated for ${items.length} items`);
          return Response.json({
            items,
            model: config.model,
          });
        } catch {
          console.warn("[explain-api] Failed to parse model output as JSON");
          return Response.json({ error: "upstream_error" }, { status: 502 });
        }
      },
    },
  },
});
