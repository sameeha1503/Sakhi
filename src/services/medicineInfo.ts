// Medicine Information Service: AI explanations with 90-day local cache & offline fallback
// Adheres to storage adapter boundary (UI never touches localStorage)

import i18n from "@/i18n";
import en from "@/i18n/locales/en.json";
import { inferCategory } from "./medicines";
import { storage } from "./storage";

export type MedicineInfoSource = "ai" | "cache" | "fallback";

export type MedicineExplanation = {
  name: string;
  usedFor: string | null;
  howUsuallyTaken: string | null;
  commonSideEffects: string[];
  askDoctorIf: string[];
  confidence: "high" | "low";
  source: MedicineInfoSource;
};

export type MedicineInput = {
  name: string;
  dose?: string | null | undefined;
};

type CacheEntry = {
  explanation: Omit<MedicineExplanation, "source">;
  savedAt: number;
};

const STORAGE_KEY = "med_info_cache";
export const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// In-flight deduplication map: cacheKey -> Promise<MedicineExplanation>
const inFlightMap = new Map<string, Promise<MedicineExplanation>>();

export function normalizeMedicineName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function getCacheKey(name: string, lang: string): string {
  return `${normalizeMedicineName(name)}::${lang.toLowerCase().trim()}`;
}

export function getFallbackExplanation(name: string, lang: string): MedicineExplanation {
  const category = inferCategory(name);
  const purposeKey = `medicines.purpose.${category}`;

  const defaultText =
    (en.medicines.purpose as Record<string, string>)[category] || en.medicines.purpose.general;

  const usedFor = i18n.t(purposeKey, {
    lng: lang,
    defaultValue: defaultText,
  });

  return {
    name,
    usedFor,
    howUsuallyTaken: null,
    commonSideEffects: [],
    askDoctorIf: [],
    confidence: "high",
    source: "fallback",
  };
}

function loadCache(): Record<string, CacheEntry> {
  const raw = storage.get<Record<string, CacheEntry>>(STORAGE_KEY, {});
  const now = Date.now();
  let modified = false;
  const valid: Record<string, CacheEntry> = {};

  if (raw && typeof raw === "object") {
    for (const [key, entry] of Object.entries(raw)) {
      if (
        entry &&
        typeof entry.savedAt === "number" &&
        now - entry.savedAt <= CACHE_TTL_MS &&
        entry.explanation?.confidence === "high"
      ) {
        valid[key] = entry;
      } else {
        modified = true;
      }
    }
  }

  if (modified) {
    storage.set(STORAGE_KEY, valid);
  }
  return valid;
}

function saveToCache(explanations: MedicineExplanation[], lang: string): void {
  const cache = loadCache();
  let modified = false;

  for (const exp of explanations) {
    // Never cache low-confidence, fallback or empty results
    if (exp.confidence !== "high" || exp.source === "fallback" || !exp.usedFor) {
      continue;
    }

    const key = getCacheKey(exp.name, lang);
    cache[key] = {
      explanation: {
        name: exp.name,
        usedFor: exp.usedFor,
        howUsuallyTaken: exp.howUsuallyTaken,
        commonSideEffects: exp.commonSideEffects,
        askDoctorIf: exp.askDoctorIf,
        confidence: exp.confidence,
      },
      savedAt: Date.now(),
    };
    modified = true;
  }

  if (modified) {
    storage.set(STORAGE_KEY, cache);
  }
}

// Clear cache on "Delete all my data" wipe
storage.onClear(() => {
  storage.remove(STORAGE_KEY);
  inFlightMap.clear();
});

export function clearMedicineInfoCacheForTests(): void {
  storage.remove(STORAGE_KEY);
  inFlightMap.clear();
}

/**
 * Fetches AI-generated medicine explanations with local cache and offline fallback.
 * Requests uncached items in a single batch, deduplicating in-flight requests.
 */
export async function getMedicineInfo(
  medicines: Array<string | MedicineInput>,
  lang = "en",
): Promise<Record<string, MedicineExplanation>> {
  if (!medicines || medicines.length === 0) {
    return {};
  }

  // Normalize inputs into { name, dose }
  const normalizedInputs: MedicineInput[] = medicines
    .map((m) => {
      if (typeof m === "string") {
        return { name: m.trim() };
      }
      return { name: m.name.trim(), dose: m.dose?.trim() };
    })
    .filter((m) => Boolean(m.name));

  const result: Record<string, MedicineExplanation> = {};
  const cache = loadCache();
  const toFetch: MedicineInput[] = [];
  const awaitingInFlight: Array<{ name: string; promise: Promise<MedicineExplanation> }> = [];

  for (const item of normalizedInputs) {
    const key = getCacheKey(item.name, lang);
    const cached = cache[key];

    if (cached) {
      result[item.name] = {
        ...cached.explanation,
        name: item.name,
        source: "cache",
      };
      continue;
    }

    // Check if there is already an in-flight request for this medicine
    const inFlight = inFlightMap.get(key);
    if (inFlight) {
      awaitingInFlight.push({ name: item.name, promise: inFlight });
      continue;
    }

    toFetch.push(item);
  }

  // Await any existing in-flight requests
  if (awaitingInFlight.length > 0) {
    const resolvedInFlight = await Promise.all(
      awaitingInFlight.map(async ({ name, promise }) => {
        const exp = await promise;
        return { name, exp };
      }),
    );
    for (const { name, exp } of resolvedInFlight) {
      result[name] = exp;
    }
  }

  if (toFetch.length === 0) {
    return result;
  }

  // Set up deferred resolvers for toFetch items so concurrent callers can await them
  type Deferred = {
    promise: Promise<MedicineExplanation>;
    resolve: (val: MedicineExplanation) => void;
  };
  const deferredMap = new Map<string, Deferred>();

  for (const item of toFetch) {
    const key = getCacheKey(item.name, lang);
    let resolveFn!: (val: MedicineExplanation) => void;
    const promise = new Promise<MedicineExplanation>((resolve) => {
      resolveFn = resolve;
    });
    deferredMap.set(key, { promise, resolve: resolveFn });
    inFlightMap.set(key, promise);
  }

  // Call /api/explain in one batch
  try {
    const response = await fetch("/api/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        medicines: toFetch.map((m) => ({
          name: m.name.slice(0, 80),
          ...(m.dose ? { dose: m.dose.slice(0, 40) } : {}),
        })),
        lang,
      }),
    });

    if (!response.ok) {
      throw new Error(`explain_error_${response.status}`);
    }

    const data = (await response.json()) as {
      items?: Array<{
        name: string;
        usedFor: string | null;
        howUsuallyTaken: string | null;
        commonSideEffects?: string[];
        askDoctorIf?: string[];
        confidence?: "high" | "low";
      }>;
    };

    const returnedItems = Array.isArray(data?.items) ? data.items : [];
    const highConfidenceToCache: MedicineExplanation[] = [];

    for (let i = 0; i < toFetch.length; i++) {
      const inputItem = toFetch[i]!;
      const returned = returnedItems[i];
      const key = getCacheKey(inputItem.name, lang);
      const deferred = deferredMap.get(key);

      let explanation: MedicineExplanation;

      if (returned) {
        const confidence = returned.confidence === "high" ? "high" : "low";
        explanation = {
          name: inputItem.name,
          usedFor: confidence === "high" ? (returned.usedFor ?? null) : null,
          howUsuallyTaken: returned.howUsuallyTaken ?? null,
          commonSideEffects: Array.isArray(returned.commonSideEffects)
            ? returned.commonSideEffects
            : [],
          askDoctorIf: Array.isArray(returned.askDoctorIf) ? returned.askDoctorIf : [],
          confidence,
          source: "ai",
        };

        if (confidence === "high" && explanation.usedFor) {
          highConfidenceToCache.push(explanation);
        }
      } else {
        explanation = getFallbackExplanation(inputItem.name, lang);
      }

      result[inputItem.name] = explanation;
      deferred?.resolve(explanation);
    }

    saveToCache(highConfidenceToCache, lang);
  } catch (err) {
    console.warn("[medicineInfo] Upstream explain call failed, using fallback:", err);
    for (const item of toFetch) {
      const fallback = getFallbackExplanation(item.name, lang);
      result[item.name] = fallback;
      const key = getCacheKey(item.name, lang);
      deferredMap.get(key)?.resolve(fallback);
    }
  } finally {
    // Remove completed items from in-flight map
    for (const item of toFetch) {
      const key = getCacheKey(item.name, lang);
      inFlightMap.delete(key);
    }
  }

  return result;
}
