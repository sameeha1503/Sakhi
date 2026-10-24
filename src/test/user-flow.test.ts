import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "@/services/storage";
import { authService, prefs } from "@/services/auth";
import { logService, emptyLog } from "@/services/logs";
import { cycleSummary, patternFlags, isRedFlag } from "@/services/cycle";
import { nearest } from "@/services/places";
import en from "@/i18n/locales/en.json";
import hi from "@/i18n/locales/hi.json";
import te from "@/i18n/locales/te.json";

describe("Sakhi End-to-End Flow Verification", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it("verifies i18n key symmetry across English, Hindi, and Telugu", () => {
    function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      return Object.keys(obj).flatMap((k) => {
        const next = prefix ? `${prefix}.${k}` : k;
        const val = obj[k];
        return typeof val === "object" && val !== null
          ? getKeys(val as Record<string, unknown>, next)
          : [next];
      });
    }

    const enKeys = new Set(getKeys(en));
    const hiKeys = new Set(getKeys(hi));
    const teKeys = new Set(getKeys(te));

    expect(hiKeys).toEqual(enKeys);
    expect(teKeys).toEqual(enKeys);
  });

  it("walks through English user flow: language -> consent -> signup -> log -> cycle -> delete", () => {
    // 1. Language Picker
    expect(prefs.language()).toBeNull();
    prefs.setLanguage("en");
    expect(prefs.language()).toBe("en");
    expect(prefs.consented()).toBe(false);

    // 2. Consent
    prefs.setConsent(true);
    expect(prefs.consented()).toBe(true);
    expect(prefs.loggedIn()).toBe(false);

    // 3. Signup
    const user = authService.signUp("Ananya", "9876543210");
    expect(user.name).toBe("Ananya");
    expect(user.phone).toBe("9876543210");
    prefs.setLoggedIn(true);
    expect(prefs.loggedIn()).toBe(true);
    expect(authService.current()?.name).toBe("Ananya");

    // 4. Daily check-in
    const checkin = {
      ...emptyLog("2026-10-24"),
      flow: "medium" as const,
      painAreas: ["pelvis"],
      painLevel: 2,
      mood: 2,
      energy: 2,
      sleep: 2,
      symptoms: ["acne"],
    };
    logService.save(checkin);
    expect(logService.get("2026-10-24")).toEqual(checkin);
    expect(isRedFlag(checkin)).toBe(false);

    // 5. Cycle summary
    const summary = cycleSummary(logService.all(), "2026-10-24");
    expect(summary.cycleDay).toBe(1);

    // 6. Delete all data
    storage.clearAll();
    expect(prefs.language()).toBeNull();
    expect(prefs.consented()).toBe(false);
    expect(prefs.loggedIn()).toBe(false);
    expect(authService.current()).toBeNull();
    expect(logService.all()).toEqual([]);
  });

  it("walks through Hindi user flow: language -> consent -> signup -> log -> urgent red-flag -> delete", () => {
    // 1. Language Picker (Hindi)
    prefs.setLanguage("hi");
    expect(prefs.language()).toBe("hi");

    // 2. Consent
    prefs.setConsent(true);
    expect(prefs.consented()).toBe(true);

    // 3. Signup
    const user = authService.signUp("सुनीता", "9876543211");
    expect(user.name).toBe("सुनीता");
    prefs.setLoggedIn(true);
    expect(prefs.loggedIn()).toBe(true);

    // 4. Daily check-in with severe symptoms (Red Flag)
    const severeLog = {
      ...emptyLog("2026-10-24"),
      flow: "veryHeavy" as const,
      painAreas: ["pelvis"],
      painLevel: 5,
      mood: 1,
      energy: 1,
      sleep: 1,
      symptoms: ["heavyBleeding", "pelvicPain"],
    };
    logService.save(severeLog);
    expect(isRedFlag(severeLog)).toBe(true);

    // 5. Nearest facilities for urgent page
    const hospitals = nearest(null, true);
    expect(hospitals.length).toBeGreaterThan(0);
    expect(hospitals[0]?.name).toBe("Gandhi Hospital");

    // 6. Delete data
    storage.clearAll();
    expect(prefs.language()).toBeNull();
    expect(authService.current()).toBeNull();
  });

  it("walks through Telugu user flow: language -> consent -> signup -> log -> delete", () => {
    // 1. Language Picker (Telugu)
    prefs.setLanguage("te");
    expect(prefs.language()).toBe("te");

    // 2. Consent
    prefs.setConsent(true);
    expect(prefs.consented()).toBe(true);

    // 3. Signup
    authService.signUp("లక్ష్మి", "9876543212");
    prefs.setLoggedIn(true);
    expect(authService.current()?.name).toBe("లక్ష్మి");

    // 4. Daily log
    logService.save({
      ...emptyLog("2026-10-24"),
      flow: "light" as const,
      painAreas: [],
      painLevel: 0,
      mood: 3,
      energy: 3,
      sleep: 3,
      symptoms: [],
    });
    expect(logService.all().length).toBe(1);

    // 5. Delete data
    storage.clearAll();
    expect(prefs.language()).toBeNull();
    expect(authService.current()).toBeNull();
    expect(logService.all().length).toBe(0);
  });

  it("walks full Phase 3-5 journey: demo profile -> medicines -> vault -> schemes -> questions -> delete my data", async () => {
    const { demoService } = await import("@/services/demo");
    const { medicineService } = await import("@/services/medicines");
    const { visitService } = await import("@/services/visits");
    const { vaultService } = await import("@/services/vault");
    const { schemesService } = await import("@/services/schemes");
    const { questionService } = await import("@/services/questions");

    // 1. Load demo profile in Telugu
    prefs.setLanguage("te");
    await demoService.loadDemoProfile();

    expect(demoService.isDemoLoaded()).toBe(true);
    expect(authService.current()?.name).toBe("Lakshmi");
    expect(medicineService.all().length).toBe(3);
    expect(visitService.all().length).toBe(2);

    // 2. Pattern flags verified
    const flags = patternFlags(logService.all(), "2026-10-24");
    expect(flags).toContain("irregularPlus");
    expect(flags).toContain("painCycle");

    // 3. Question prep derived from flags
    const { generateSuggestedQuestions } = await import("@/services/questions");
    const suggested = generateSuggestedQuestions(logService.all(), "2026-10-24");
    expect(suggested.length).toBeGreaterThan(0);
    questionService.toggleTicked(suggested[0]!.id);
    expect(questionService.getTickedIds()).toContain(suggested[0]!.id);

    // 4. Schemes finder
    const { matchSchemes } = await import("@/services/schemes");
    const matching = matchSchemes({
      ageGroup: "30_49",
      isPregnant: "no",
      household: "bpl_ration",
      state: "Telangana",
    });
    expect(matching.length).toBeGreaterThan(0);

    // 5. Setup Private Vault with PIN and store a document
    await vaultService.setupPin("5678");
    expect(vaultService.hasPin()).toBe(true);
    expect(vaultService.isUnlocked()).toBe(true);

    const doc = await vaultService.addDocument(
      "blood_report.pdf",
      "application/pdf",
      2048,
      "data:application/pdf;base64,SAMPLE_DATA",
    );
    expect(doc.name).toBe("blood_report.pdf");
    expect((await vaultService.getDocuments()).length).toBe(1);

    // 6. Execute "Delete all my data" (as done in Settings)
    await vaultService.clearAll();
    await storage.clearAll();

    // Verify EVERYTHING is wiped
    expect(demoService.isDemoLoaded()).toBe(false);
    expect(authService.current()).toBeNull();
    expect(logService.all().length).toBe(0);
    expect(medicineService.all().length).toBe(0);
    expect(visitService.all().length).toBe(0);
    expect(vaultService.hasPin()).toBe(false);
    expect(vaultService.isUnlocked()).toBe(false);
    expect(questionService.getTickedIds().length).toBe(0);
    expect(storage.get("demo_loaded", false)).toBe(false);
  });
});
