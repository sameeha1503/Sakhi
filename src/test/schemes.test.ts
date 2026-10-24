import { describe, it, expect, beforeEach } from "vitest";
import { matchSchemes, schemeService } from "@/services/schemes";
import { storage } from "@/services/storage";

describe("Government Health Schemes eligibility matching", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it("matches maternal and BPL schemes for a pregnant woman with BPL/ration card", () => {
    const results = matchSchemes({
      ageGroup: "18_29",
      isPregnant: "yes",
      household: "bpl_ration",
      state: "Telangana",
    });

    const ids = results.map((r) => r.scheme.id);
    expect(ids).toContain("pmjay");
    expect(ids).toContain("jsy");
    expect(ids).toContain("pmmvy");
    expect(ids).toContain("pmsma");
    expect(ids).toContain("jssk");
    expect(ids).toContain("arogya_mandir");
  });

  it("excludes PMMVY for pregnant women under 18", () => {
    const results = matchSchemes({
      ageGroup: "under18",
      isPregnant: "yes",
      household: "bpl_ration",
      state: "Telangana",
    });

    const ids = results.map((r) => r.scheme.id);
    expect(ids).toContain("jsy");
    expect(ids).toContain("pmsma");
    expect(ids).toContain("jssk");
    expect(ids).not.toContain("pmmvy"); // minAge 18
  });

  it("excludes maternal schemes and PM-JAY for non-pregnant women with general household", () => {
    const results = matchSchemes({
      ageGroup: "30_49",
      isPregnant: "no",
      household: "general",
      state: "Andhra Pradesh",
    });

    const ids = results.map((r) => r.scheme.id);
    expect(ids).not.toContain("jsy");
    expect(ids).not.toContain("pmmvy");
    expect(ids).not.toContain("pmsma");
    expect(ids).not.toContain("jssk");
    expect(ids).not.toContain("pmjay"); // BPL only

    // Matches Arogya Mandir with screening age
    expect(ids).toContain("arogya_mandir");
    const arogya = results.find((r) => r.scheme.id === "arogya_mandir");
    expect(arogya?.matchReasons).toContain("schemes.reasons.screeningAge");
  });

  it("matches PM-JAY for non-pregnant women with BPL card", () => {
    const results = matchSchemes({
      ageGroup: "18_29",
      isPregnant: "no",
      household: "bpl_ration",
      state: "Telangana",
    });

    const ids = results.map((r) => r.scheme.id);
    expect(ids).toContain("pmjay");
    expect(ids).toContain("arogya_mandir");
    expect(ids).not.toContain("jsy");
  });

  it("manages PMSMA 9th-of-month reminder state", () => {
    expect(schemeService.isPmsmaReminderEnabled()).toBe(false);
    schemeService.setPmsmaReminderEnabled(true);
    expect(schemeService.isPmsmaReminderEnabled()).toBe(true);
    schemeService.setPmsmaReminderEnabled(false);
    expect(schemeService.isPmsmaReminderEnabled()).toBe(false);
  });

  it("finds the nearest primary care PHC/Arogya Mandir", () => {
    // Coordinates near Shamshabad, Hyderabad
    const res = schemeService.getNearestPrimaryCare({ lat: 17.25, lng: 78.43 });
    expect(res.place).toBeDefined();
    expect(res.place.type).toBe("phc");
    expect(res.distanceKm).toBeGreaterThan(0);
  });
});
