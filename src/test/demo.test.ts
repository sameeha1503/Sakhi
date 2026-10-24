import { describe, it, expect, beforeEach } from "vitest";
import { demoService } from "../services/demo";
import { logService, todayISO } from "../services/logs";
import { patternFlags, isIrregular } from "../services/cycle";
import { medicineService } from "../services/medicines";
import { visitService } from "../services/visits";
import { vaultService } from "../services/vault";

describe("demoService", () => {
  beforeEach(async () => {
    localStorage.clear();
  });

  it("loads 3 months of logs that trigger irregularPlus and painCycle", async () => {
    await demoService.loadDemoProfile();

    const today = todayISO();
    const logs = logService.all();
    expect(logs.length).toBeGreaterThan(10);

    expect(isIrregular(logs)).toBe(true);

    const flags = patternFlags(logs, today);
    expect(flags).toContain("irregularPlus");
    expect(flags).toContain("painCycle");

    // Medicines and dose history
    const meds = medicineService.all();
    expect(meds.length).toBe(3);
    const history = medicineService.getDoseRecords();
    expect(history.length).toBeGreaterThan(0);

    // Past visits and follow-up in ~5 days
    const visits = visitService.all();
    expect(visits.length).toBe(2);
    const followUp = visits.find((v) => v.nextFollowUpDate);
    expect(followUp).toBeDefined();

    // Vault-free state
    const hasPin = vaultService.hasPin();
    expect(hasPin).toBe(false);

    expect(demoService.isDemoLoaded()).toBe(true);
  });

  it("clears demo data cleanly", async () => {
    await demoService.loadDemoProfile();
    expect(demoService.isDemoLoaded()).toBe(true);

    await demoService.clearDemoData();
    expect(demoService.isDemoLoaded()).toBe(false);
    expect(logService.all().length).toBe(0);
    expect(medicineService.all().length).toBe(0);
    expect(visitService.all().length).toBe(0);
  });
});
