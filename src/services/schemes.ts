// Schemes matching and tracker service.
// Evaluates eligibility rules locally without transmitting personal data.

import { storage } from "./storage";
import { logService } from "./logs";
import {
  ALL_SCHEMES,
  STATE_MAP,
  type Scheme,
  type AgeGroup,
  type MaternalStatus,
  type HouseholdCategory,
  type StateInfo,
} from "@/data/schemes";
import { PLACES, distanceKm, locationPrefs, type Place } from "./places";

export type SchemeAnswers = {
  ageGroup: AgeGroup;
  maternalStatus: MaternalStatus;
  household: HouseholdCategory;
  stateCode: string;
  useCheckinPatterns?: boolean;
};

export type MatchedScheme = {
  scheme: Scheme;
  matchScore: number;
  matchReasons: string[];
  stateWorksUrl?: string | undefined;
};

export type TieredSchemes = {
  madeForWomen: MatchedScheme[];
  alsoEligible: MatchedScheme[];
  otherSupport: MatchedScheme[];
  totalCount: number;
  hasStateFallback: boolean;
  stateInfo: StateInfo;
};

export type TrackerStatus = "saved" | "applied" | "received";

/**
 * Checks whether user's local symptom logs indicate heavy menstrual bleeding or fatigue
 */
export function hasHeavyBleedingPattern(): boolean {
  try {
    const logs = logService.all();
    if (!logs || logs.length === 0) return false;
    return logs.some(
      (l) =>
        l.flow === "heavy" ||
        l.flow === "veryHeavy" ||
        (Array.isArray(l.symptoms) && l.symptoms.includes("heavyBleeding")),
    );
  } catch {
    return false;
  }
}

export function matchSchemes(answers: SchemeAnswers): TieredSchemes {
  const stateCode = answers.stateCode || "TS";
  const stateInfo = STATE_MAP[stateCode] || STATE_MAP["TS"]!;
  const usePatterns = answers.useCheckinPatterns ?? true;
  const heavyBleeding = usePatterns ? hasHeavyBleedingPattern() : false;

  const relevantSchemes = ALL_SCHEMES.filter(
    (s) => s.stateCode === "national" || s.stateCode === stateCode,
  );

  const matchedList: MatchedScheme[] = [];

  for (const s of relevantSchemes) {
    let eligible = true;
    let score = 0;
    const reasons: string[] = [];

    // 1. Age rule checks
    if (s.eligibility.minAge !== undefined) {
      if (answers.ageGroup === "under18" && s.eligibility.minAge >= 18) {
        eligible = false;
      } else if (answers.ageGroup === "18_29" && s.eligibility.minAge >= 30) {
        eligible = false;
      }
    }

    if (s.eligibility.maxAge !== undefined) {
      if (s.eligibility.maxAge <= 19 && answers.ageGroup !== "under18") {
        eligible = false;
      } else if (
        s.eligibility.maxAge <= 25 &&
        (answers.ageGroup === "30_59" || answers.ageGroup === "60_plus")
      ) {
        eligible = false;
      } else if (s.eligibility.maxAge <= 50 && answers.ageGroup === "60_plus") {
        eligible = false;
      }
    }

    // 2. Maternal status rule checks
    if (s.eligibility.maternalStatus && s.eligibility.maternalStatus.length > 0) {
      if (!s.eligibility.maternalStatus.includes(answers.maternalStatus)) {
        eligible = false;
      }
    }

    // 3. Household rule checks
    if (s.eligibility.household && s.eligibility.household.length > 0) {
      if (answers.household === "other" && !s.eligibility.household.includes("other")) {
        eligible = false;
      }
    }

    if (!eligible) continue;

    // Reason & Score building
    if (answers.maternalStatus === "pregnant") {
      if (s.focus === "pregnancy") {
        score += 50;
        reasons.push("schemes.reasons.pregnant");
      }
    } else if (answers.maternalStatus === "breastfeeding") {
      if (s.focus === "pregnancy" || s.focus === "nutritionAndAnaemia") {
        score += 40;
        reasons.push("schemes.reasons.breastfeeding");
      }
    }

    if (answers.ageGroup === "under18") {
      if (s.focus === "periodsAndAdolescents") {
        score += 45;
        reasons.push("schemes.reasons.adolescent");
      }
    } else if (answers.ageGroup === "30_59" || answers.ageGroup === "60_plus") {
      if (s.focus === "screening" || s.id === "arogya_mandir") {
        score += 45;
        reasons.push("schemes.reasons.screeningAge");
      }
      if (answers.ageGroup === "60_plus") {
        score += 20;
        reasons.push("schemes.reasons.senior");
      }
    }

    if (answers.household === "bpl_ration") {
      score += 30;
      reasons.push("schemes.reasons.bpl");
    }

    // Check-in pattern matching
    if (heavyBleeding && (s.id === "amb" || s.focus === "nutritionAndAnaemia")) {
      score += 40;
      reasons.push("schemes.reasons.heavyBleedingPattern");
    }

    // State-specific scheme reason
    if (s.stateCode === stateCode) {
      score += 25;
      reasons.push("schemes.reasons.stateSpecific");
    }

    if (reasons.length === 0) {
      reasons.push("schemes.reasons.universal");
    }

    // PM-JAY state-specific implementation link
    let stateWorksUrl: string | undefined = undefined;
    if (s.id === "pmjay" && stateInfo.pmjayPortalUrl) {
      stateWorksUrl = stateInfo.pmjayPortalUrl;
    }

    matchedList.push({
      scheme: s,
      matchScore: score,
      matchReasons: reasons,
      stateWorksUrl,
    });
  }

  // Split into 3 tiers
  const madeForWomen = matchedList
    .filter((m) => m.scheme.tier === "madeForWomen")
    .sort((a, b) => b.matchScore - a.matchScore);

  const alsoEligible = matchedList
    .filter((m) => m.scheme.tier === "alsoEligible")
    .sort((a, b) => b.matchScore - a.matchScore);

  const otherSupport = matchedList
    .filter((m) => m.scheme.tier === "otherSupport")
    .sort((a, b) => b.matchScore - a.matchScore);

  // Does this state have any custom entries in either alsoEligible or otherSupport?
  const hasCustomEntries = ALL_SCHEMES.some((s) => s.stateCode === stateCode);

  return {
    madeForWomen,
    alsoEligible,
    otherSupport,
    totalCount: matchedList.length,
    hasStateFallback: !hasCustomEntries,
    stateInfo,
  };
}

export const schemeService = {
  getSavedAnswers(): SchemeAnswers | null {
    return storage.get<SchemeAnswers | null>("scheme_answers", null);
  },

  saveAnswers(answers: SchemeAnswers): void {
    storage.set("scheme_answers", answers);
    storage.set("user_state_code", answers.stateCode);
  },

  getSavedStateCode(): string {
    const fromAnswers = storage.get<SchemeAnswers | null>("scheme_answers", null)?.stateCode;
    if (fromAnswers) return fromAnswers;
    const fromDirect = storage.get<string | null>("user_state_code", null);
    if (fromDirect) return fromDirect;
    return "TS"; // Default
  },

  setSavedStateCode(stateCode: string): void {
    storage.set("user_state_code", stateCode);
    const answers = this.getSavedAnswers();
    if (answers) {
      answers.stateCode = stateCode;
      this.saveAnswers(answers);
    }
  },

  // Tracker: Saved / Applied / Received
  getTracker(): Record<string, TrackerStatus> {
    return storage.get<Record<string, TrackerStatus>>("schemes_tracker", {});
  },

  getTrackerStatus(id: string): TrackerStatus | null {
    const tracker = this.getTracker();
    return tracker[id] || null;
  },

  setTrackerStatus(id: string, status: TrackerStatus | null): void {
    const tracker = { ...this.getTracker() };
    if (!status) {
      delete tracker[id];
    } else {
      tracker[id] = status;
    }
    storage.set("schemes_tracker", tracker);
  },

  clearTracker(): void {
    storage.remove("schemes_tracker");
  },

  // Reminders
  isPmsmaReminderEnabled(): boolean {
    return storage.get<boolean>("pmsma_monthly_reminder", false);
  },

  setPmsmaReminderEnabled(enabled: boolean): void {
    storage.set("pmsma_monthly_reminder", enabled);
  },

  isScreeningReminderEnabled(): boolean {
    return storage.get<boolean>("screening_reminder", false);
  },

  setScreeningReminderEnabled(enabled: boolean): void {
    storage.set("screening_reminder", enabled);
  },

  // Viewed state for Home dashboard badge
  hasViewedSchemes(): boolean {
    return storage.get<boolean>("schemes_viewed", false);
  },

  markSchemesViewed(): void {
    storage.set("schemes_viewed", true);
  },

  getWomenSchemesCount(answers?: SchemeAnswers): number {
    const ans = answers ||
      this.getSavedAnswers() || {
        ageGroup: "18_29",
        maternalStatus: "pregnant",
        household: "bpl_ration",
        stateCode: this.getSavedStateCode(),
      };
    const res = matchSchemes(ans);
    return res.madeForWomen.length;
  },

  /**
   * Returns the nearest PHC / Ayushman Arogya Mandir for applying,
   * using the user's saved location coordinates if available.
   */
  getNearestPrimaryCare(userCoords?: { lat: number; lng: number }): {
    place: Place;
    distanceKm: number | null;
  } {
    const coords = userCoords || locationPrefs.getSaved();

    // Look for PHCs first, then CHCs
    const primaryPlaces = PLACES.filter((p) => p.type === "phc" || p.type === "chc");

    if (!coords) {
      const defaultPlace = primaryPlaces[0] || PLACES[0]!;
      return { place: defaultPlace, distanceKm: null };
    }

    let nearest = primaryPlaces[0] || PLACES[0]!;
    let minD = Number(distanceKm(coords, nearest).toFixed(1));

    for (const p of primaryPlaces) {
      const d = Number(distanceKm(coords, p).toFixed(1));
      if (d < minD) {
        minD = d;
        nearest = p;
      }
    }

    return { place: nearest, distanceKm: minD };
  },
};

export const schemesService = schemeService;
