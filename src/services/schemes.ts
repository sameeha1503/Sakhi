// Schemes matching and reminder service.
// Evaluates eligibility rules locally without transmitting personal data.

import { storage } from "./storage";
import { SCHEMES, type Scheme, type AgeGroup, type HouseholdCategory } from "@/data/schemes";
import { PLACES, distanceKm, locationPrefs, type Place } from "./places";

export type SchemeAnswers = {
  ageGroup: AgeGroup;
  isPregnant: "yes" | "no";
  household: HouseholdCategory;
  state: string;
};

export type MatchedScheme = {
  scheme: Scheme;
  matchScore: number;
  matchReasons: string[];
};

export function matchSchemes(answers: SchemeAnswers): MatchedScheme[] {
  const results: MatchedScheme[] = [];

  for (const s of SCHEMES) {
    let eligible = true;
    let score = 0;
    const reasons: string[] = [];

    // 1. Pregnancy rule
    if (s.rule.pregnantOnly) {
      if (answers.isPregnant === "yes") {
        score += 50;
        reasons.push("schemes.reasons.pregnant");
      } else {
        eligible = false;
      }
    }

    // 2. Age rule (e.g. PMMVY requires minAge 18)
    if (s.rule.minAge && s.rule.minAge >= 18 && answers.ageGroup === "under18") {
      eligible = false;
    }

    // 3. BPL / Ration card rule
    if (s.rule.bplOnly) {
      if (answers.household === "bpl_ration") {
        score += 40;
        reasons.push("schemes.reasons.bpl");
      } else {
        eligible = false;
      }
    }

    // 4. Arogya Mandir screening bonus for women 30+
    if (s.id === "arogya_mandir") {
      if (answers.ageGroup === "30_49" || answers.ageGroup === "50_plus") {
        score += 35;
        reasons.push("schemes.reasons.screeningAge");
      } else {
        score += 20;
        reasons.push("schemes.reasons.primaryCare");
      }
    }

    // 5. Maternal schemes bonuses
    if (s.highlightCategory === "maternal" && answers.isPregnant === "yes") {
      score += 20;
    }

    if (eligible) {
      results.push({
        scheme: s,
        matchScore: score,
        matchReasons: reasons,
      });
    }
  }

  // Sort higher score first
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

export const schemeService = {
  getSavedAnswers(): SchemeAnswers | null {
    return storage.get<SchemeAnswers | null>("scheme_answers", null);
  },

  saveAnswers(answers: SchemeAnswers): void {
    storage.set("scheme_answers", answers);
  },

  isPmsmaReminderEnabled(): boolean {
    return storage.get<boolean>("pmsma_monthly_reminder", false);
  },

  setPmsmaReminderEnabled(enabled: boolean): void {
    storage.set("pmsma_monthly_reminder", enabled);
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
      // Default fallback to first PHC
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
