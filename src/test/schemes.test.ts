import { describe, it, expect, beforeEach } from "vitest";
import { matchSchemes, schemeService, hasHeavyBleedingPattern } from "@/services/schemes";
import {
  ALL_SCHEMES,
  NATIONAL_SCHEMES,
  STATE_SCHEMES,
  STATES_AND_UTS,
  STATE_MAP,
} from "@/data/schemes";
import { storage } from "@/services/storage";
import { logService, emptyLog } from "@/services/logs";

describe("Government Health & Welfare Schemes System", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  // 1. All 28 states and 8 union territories are present
  it("includes all 28 states and 8 union territories (36 total)", () => {
    expect(STATES_AND_UTS.length).toBe(36);
    const states = STATES_AND_UTS.filter((s) => s.type === "state");
    const uts = STATES_AND_UTS.filter((s) => s.type === "ut");
    expect(states.length).toBe(28);
    expect(uts.length).toBe(8);

    // Verify key states
    expect(STATE_MAP["UP"]).toBeDefined(); // Uttar Pradesh
    expect(STATE_MAP["MH"]).toBeDefined(); // Maharashtra
    expect(STATE_MAP["GA"]).toBeDefined(); // Goa
    expect(STATE_MAP["TS"]).toBeDefined(); // Telangana
    expect(STATE_MAP["AS"]).toBeDefined(); // Assam (Northeast)
    expect(STATE_MAP["DL"]).toBeDefined(); // Delhi
  });

  // 2. Data model integrity: every entry has required fields and valid state code
  it("enforces that every scheme has audience, tier, focus, officialUrl, sourceUrl, and verifiedOn with valid stateCode", () => {
    const validStateCodes = new Set(["national", ...STATES_AND_UTS.map((s) => s.code)]);
    const validAudiences = new Set(["womenSpecific", "general"]);
    const validTiers = new Set(["madeForWomen", "alsoEligible", "otherSupport"]);
    const validFocuses = new Set([
      "pregnancy",
      "screening",
      "periodsAndAdolescents",
      "nutritionAndAnaemia",
      "mentalWellbeing",
      "hospitalCover",
      "welfare",
      "other",
    ]);

    for (const scheme of ALL_SCHEMES) {
      expect(scheme.id, `Scheme ${scheme.id} must have an id`).toBeTruthy();
      expect(scheme.officialName, `Scheme ${scheme.id} must have an officialName`).toBeTruthy();

      expect(
        validStateCodes.has(scheme.stateCode),
        `Scheme ${scheme.id} has unknown stateCode: ${scheme.stateCode}`,
      ).toBe(true);

      expect(
        validAudiences.has(scheme.audience),
        `Scheme ${scheme.id} has invalid audience: ${scheme.audience}`,
      ).toBe(true);

      expect(
        validTiers.has(scheme.tier),
        `Scheme ${scheme.id} has invalid tier: ${scheme.tier}`,
      ).toBe(true);

      expect(
        validFocuses.has(scheme.focus),
        `Scheme ${scheme.id} has invalid focus: ${scheme.focus}`,
      ).toBe(true);

      expect(
        scheme.officialUrl,
        `Scheme ${scheme.id} must have officialUrl starting with http`,
      ).toMatch(/^https?:\/\//);

      expect(
        scheme.sourceUrl,
        `Scheme ${scheme.id} must have sourceUrl starting with http`,
      ).toMatch(/^https?:\/\//);

      expect(
        scheme.verifiedOn,
        `Scheme ${scheme.id} must have verifiedOn date in YYYY-MM-DD format`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // 3. National schemes verification
  it("includes all 11 required national schemes", () => {
    const nationalIds = NATIONAL_SCHEMES.map((s) => s.id);
    expect(nationalIds).toContain("pmjay");
    expect(nationalIds).toContain("arogya_mandir");
    expect(nationalIds).toContain("jsy");
    expect(nationalIds).toContain("pmmvy");
    expect(nationalIds).toContain("pmsma");
    expect(nationalIds).toContain("jssk");
    expect(nationalIds).toContain("suman");
    expect(nationalIds).toContain("mhs");
    expect(nationalIds).toContain("amb");
    expect(nationalIds).toContain("rksk");
    expect(nationalIds).toContain("poshan2");
    expect(NATIONAL_SCHEMES.length).toBe(11);
  });

  // 4. Every state shows the national schemes
  it("shows national schemes for every state and UT in India", () => {
    for (const st of STATES_AND_UTS) {
      const res = matchSchemes({
        ageGroup: "18_29",
        maternalStatus: "pregnant",
        household: "bpl_ration",
        stateCode: st.code,
      });

      const allIds = [
        ...res.madeForWomen.map((m) => m.scheme.id),
        ...res.alsoEligible.map((m) => m.scheme.id),
        ...res.otherSupport.map((m) => m.scheme.id),
      ];

      expect(allIds, `State ${st.code} should contain Arogya Mandir`).toContain("arogya_mandir");
      expect(allIds, `State ${st.code} should contain JSY`).toContain("jsy");
      expect(allIds, `State ${st.code} should contain PMMVY`).toContain("pmmvy");
      expect(allIds, `State ${st.code} should contain PMSMA`).toContain("pmsma");
      expect(allIds, `State ${st.code} should contain JSSK`).toContain("jssk");
      expect(allIds, `State ${st.code} should contain SUMAN`).toContain("suman");
      expect(allIds, `State ${st.code} should contain Anemia Mukt Bharat`).toContain("amb");
    }
  });

  // 5. Fallback behavior for states without verified state entries
  it("sets hasStateFallback true for states without verified entries and false for verified states", () => {
    // Verified state: Maharashtra (MH) has Ladki Bahin & MJPJAY
    const mhRes = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "neither",
      household: "bpl_ration",
      stateCode: "MH",
    });
    expect(mhRes.hasStateFallback).toBe(false);

    // Unverified state: Arunachal Pradesh (AR) shows national schemes + official fallback
    const arRes = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "neither",
      household: "bpl_ration",
      stateCode: "AR",
    });
    expect(arRes.hasStateFallback).toBe(true);
    expect(arRes.stateInfo.healthDeptUrl).toContain("arunachal");
  });

  // 6. Tier assignment and women-specific prioritization
  it("correctly partitions schemes into three tiers with madeForWomen first", () => {
    const res = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "pregnant",
      household: "bpl_ration",
      stateCode: "UP",
    });

    expect(res.madeForWomen.length).toBeGreaterThan(0);
    expect(res.alsoEligible.length).toBeGreaterThan(0);

    for (const m of res.madeForWomen) {
      expect(m.scheme.tier).toBe("madeForWomen");
    }
    for (const m of res.alsoEligible) {
      expect(m.scheme.tier).toBe("alsoEligible");
    }
    for (const m of res.otherSupport) {
      expect(m.scheme.tier).toBe("otherSupport");
    }
  });

  // 7. Personalization: Pregnant women
  it("matches maternal cash and care schemes for pregnant women, and excludes them for non-pregnant women", () => {
    const pregnantRes = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "pregnant",
      household: "bpl_ration",
      stateCode: "TS",
    });

    const pregnantIds = pregnantRes.madeForWomen.map((m) => m.scheme.id);
    expect(pregnantIds).toContain("jsy");
    expect(pregnantIds).toContain("pmmvy");
    expect(pregnantIds).toContain("pmsma");
    expect(pregnantIds).toContain("jssk");
    expect(pregnantIds).toContain("suman");
    expect(pregnantIds).toContain("ts_kcr_kit");

    // Non-pregnant women should not see JSY or PMSMA
    const nonPregnantRes = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "neither",
      household: "bpl_ration",
      stateCode: "TS",
    });

    const nonPregnantIds = nonPregnantRes.madeForWomen.map((m) => m.scheme.id);
    expect(nonPregnantIds).not.toContain("jsy");
    expect(nonPregnantIds).not.toContain("pmsma");
    expect(nonPregnantIds).not.toContain("ts_kcr_kit");
  });

  // 8. Personalization: Age 30+ screening
  it("highlights cancer screening for women aged 30+", () => {
    const res30 = matchSchemes({
      ageGroup: "30_59",
      maternalStatus: "neither",
      household: "other",
      stateCode: "TS",
    });

    const arogya = res30.alsoEligible.find((m) => m.scheme.id === "arogya_mandir");
    expect(arogya).toBeDefined();
    expect(arogya?.matchReasons).toContain("schemes.reasons.screeningAge");

    // Under 18 should not have screeningAge reason
    const resU18 = matchSchemes({
      ageGroup: "under18",
      maternalStatus: "neither",
      household: "other",
      stateCode: "TS",
    });
    const arogyaU18 = resU18.alsoEligible.find((m) => m.scheme.id === "arogya_mandir");
    expect(arogyaU18?.matchReasons).not.toContain("schemes.reasons.screeningAge");
  });

  // 9. Personalization: Adolescents (under 18)
  it("matches adolescent health and menstrual hygiene schemes for under 18, and excludes PMMVY", () => {
    const res = matchSchemes({
      ageGroup: "under18",
      maternalStatus: "neither",
      household: "other",
      stateCode: "TS",
    });

    const ids = res.madeForWomen.map((m) => m.scheme.id);
    expect(ids).toContain("rksk");
    expect(ids).toContain("mhs");
    expect(ids).not.toContain("pmmvy"); // minAge 18
  });

  // 10. Personalization: Heavy bleeding check-in pattern
  it("highlights Anemia Mukt Bharat when check-in logs show heavy bleeding and pattern toggle is on", () => {
    // Save log with heavy bleeding
    const log = emptyLog("2026-10-25");
    log.flow = "heavy";
    log.symptoms = ["heavyBleeding"];
    logService.save(log);

    expect(hasHeavyBleedingPattern()).toBe(true);

    const resWithPatterns = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "neither",
      household: "other",
      stateCode: "TS",
      useCheckinPatterns: true,
    });

    const ambScheme = resWithPatterns.madeForWomen.find((m) => m.scheme.id === "amb");
    expect(ambScheme).toBeDefined();
    expect(ambScheme?.matchReasons).toContain("schemes.reasons.heavyBleedingPattern");

    // When patterns disabled, should not have heavyBleedingPattern reason
    const resNoPatterns = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "neither",
      household: "other",
      stateCode: "TS",
      useCheckinPatterns: false,
    });
    const ambNoPattern = resNoPatterns.madeForWomen.find((m) => m.scheme.id === "amb");
    expect(ambNoPattern?.matchReasons).not.toContain("schemes.reasons.heavyBleedingPattern");
  });

  // 11. Tracker persistence and clear
  it("persists saved, applied, and received status in tracker and clears on data delete", () => {
    expect(schemeService.getTrackerStatus("pmjay")).toBeNull();

    // Mark saved
    schemeService.setTrackerStatus("pmjay", "saved");
    expect(schemeService.getTrackerStatus("pmjay")).toBe("saved");

    // Mark applied
    schemeService.setTrackerStatus("pmjay", "applied");
    expect(schemeService.getTrackerStatus("pmjay")).toBe("applied");

    // Mark received
    schemeService.setTrackerStatus("pmjay", "received");
    expect(schemeService.getTrackerStatus("pmjay")).toBe("received");

    // Mark another scheme
    schemeService.setTrackerStatus("jsy", "saved");
    const tracker = schemeService.getTracker();
    expect(tracker["pmjay"]).toBe("received");
    expect(tracker["jsy"]).toBe("saved");

    // Clear tracker
    schemeService.clearTracker();
    expect(schemeService.getTrackerStatus("pmjay")).toBeNull();
    expect(schemeService.getTrackerStatus("jsy")).toBeNull();
  });

  // 12. Reminders management
  it("manages PMSMA monthly reminder and cancer screening reminder", () => {
    expect(schemeService.isPmsmaReminderEnabled()).toBe(false);
    schemeService.setPmsmaReminderEnabled(true);
    expect(schemeService.isPmsmaReminderEnabled()).toBe(true);
    schemeService.setPmsmaReminderEnabled(false);
    expect(schemeService.isPmsmaReminderEnabled()).toBe(false);

    expect(schemeService.isScreeningReminderEnabled()).toBe(false);
    schemeService.setScreeningReminderEnabled(true);
    expect(schemeService.isScreeningReminderEnabled()).toBe(true);
    schemeService.setScreeningReminderEnabled(false);
    expect(schemeService.isScreeningReminderEnabled()).toBe(false);
  });

  // 13. PM-JAY state-specific implementation link
  it("links to state-specific implementation portal for PM-JAY when available", () => {
    const tsRes = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "neither",
      household: "bpl_ration",
      stateCode: "TS",
    });
    const pmjayTs = tsRes.alsoEligible.find((m) => m.scheme.id === "pmjay");
    expect(pmjayTs?.stateWorksUrl).toBe("https://aarogyasri.telangana.gov.in");

    const mhRes = matchSchemes({
      ageGroup: "18_29",
      maternalStatus: "neither",
      household: "bpl_ration",
      stateCode: "MH",
    });
    const pmjayMh = mhRes.alsoEligible.find((m) => m.scheme.id === "pmjay");
    expect(pmjayMh?.stateWorksUrl).toBe("https://jeevandayee.gov.in");
  });

  // 14. Nearest primary care center
  it("finds nearest primary care center / Arogya Mandir", () => {
    const res = schemeService.getNearestPrimaryCare({ lat: 17.25, lng: 78.43 });
    expect(res.place).toBeDefined();
    expect(res.place.type).toBe("phc");
    expect(res.distanceKm).toBeGreaterThan(0);
  });
});
