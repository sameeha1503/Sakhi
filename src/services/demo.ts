// Demo profile loader for evaluation and demonstrations.
// Generates 3 months of realistic logs (triggering irregular-cycle & pain pattern flags),
// sample medicines with dose history, two past visits with follow-up in 5 days, and clean vault.

import { storage } from "./storage";
import { logService, todayISO, type DailyLog } from "./logs";
import { medicineService } from "./medicines";
import { visitService } from "./visits";
import { vaultService } from "./vault";
import { authService, prefs } from "./auth";

const DAY_MS = 86400000;
const shiftDate = (baseIso: string, offsetDays: number): string => {
  const d = new Date(new Date(baseIso + "T00:00:00Z").getTime() + offsetDays * DAY_MS);
  return d.toISOString().slice(0, 10);
};

export const demoService = {
  isDemoLoaded(): boolean {
    return storage.get<boolean>("demo_loaded", false);
  },

  async loadDemoProfile(): Promise<void> {
    const today = todayISO();

    // 1. Set user profile
    authService.signUp("Lakshmi", "9876543210");
    prefs.setLoggedIn(true);
    prefs.setConsent(true);

    // 2. Clear existing logs, meds, visits
    logService.replaceAll([]);
    storage.set("medicines", []);
    storage.set("doses", []);
    storage.set("visits", []);
    await vaultService.resetVault(); // Vault-free state

    // 3. Generate 3 months of realistic symptom & cycle logs
    // Period 1: ~72 days ago (Cycle start 1)
    const logs: DailyLog[] = [
      {
        date: shiftDate(today, -72),
        flow: "medium",
        painAreas: ["pelvis", "stomach"],
        painLevel: 4, // triggers severe pain
        mood: 1,
        energy: 1,
        sleep: 2,
        symptoms: ["pelvicPain"],
      },
      {
        date: shiftDate(today, -71),
        flow: "heavy",
        painAreas: ["pelvis"],
        painLevel: 4,
        mood: 1,
        energy: 1,
        sleep: 1,
        symptoms: ["pelvicPain", "acne"],
      },
      {
        date: shiftDate(today, -70),
        flow: "medium",
        painAreas: ["back"],
        painLevel: 2,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: [],
      },
      {
        date: shiftDate(today, -69),
        flow: "light",
        painAreas: [],
        painLevel: 1,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: [],
      },
      // Non-bleeding days with other symptoms
      {
        date: shiftDate(today, -58),
        flow: "none",
        painAreas: [],
        painLevel: 0,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: ["acne"],
      },
      {
        date: shiftDate(today, -45),
        flow: "none",
        painAreas: [],
        painLevel: 0,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: ["hairLoss", "weight"],
      },

      // Period 2: ~34 days ago (38 days after Period 1 -> irregular cycle > 35 days!)
      {
        date: shiftDate(today, -34),
        flow: "medium",
        painAreas: ["pelvis"],
        painLevel: 4, // second period with severe pain 4+
        mood: 1,
        energy: 1,
        sleep: 1,
        symptoms: ["pelvicPain"],
      },
      {
        date: shiftDate(today, -33),
        flow: "heavy",
        painAreas: ["pelvis", "back"],
        painLevel: 4,
        mood: 1,
        energy: 1,
        sleep: 1,
        symptoms: ["heavyBleeding", "acne"],
      },
      {
        date: shiftDate(today, -32),
        flow: "medium",
        painAreas: ["back"],
        painLevel: 2,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: [],
      },
      {
        date: shiftDate(today, -31),
        flow: "light",
        painAreas: [],
        painLevel: 0,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: [],
      },
      // Non-bleeding days with symptoms across weeks
      {
        date: shiftDate(today, -20),
        flow: "none",
        painAreas: [],
        painLevel: 0,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: ["acne"],
      },
      {
        date: shiftDate(today, -10),
        flow: "none",
        painAreas: [],
        painLevel: 0,
        mood: 2,
        energy: 1,
        sleep: 2,
        symptoms: ["hairLoss", "weight"],
      },

      // Period 3: ~5 days ago (29 days cycle gap)
      {
        date: shiftDate(today, -5),
        flow: "light",
        painAreas: ["pelvis"],
        painLevel: 2,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: [],
      },
      {
        date: shiftDate(today, -4),
        flow: "medium",
        painAreas: ["pelvis"],
        painLevel: 3,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: [],
      },
      {
        date: shiftDate(today, -3),
        flow: "light",
        painAreas: [],
        painLevel: 1,
        mood: 2,
        energy: 2,
        sleep: 2,
        symptoms: [],
      },
    ];

    logService.replaceAll(logs);

    // 4. Sample prescription with medicines & dose history
    const iron = medicineService.add({
      name: "Ferrous Ascorbate (Iron)",
      dose: "100mg",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      startDate: shiftDate(today, -25),
      durationDays: 30,
      category: "iron",
    });

    const calcium = medicineService.add({
      name: "Calcium & Vitamin D3",
      dose: "500mg",
      frequency: 1,
      timings: ["night"],
      food: "after",
      startDate: shiftDate(today, -25),
      durationDays: 30,
      category: "calcium",
    });

    const mefenamic = medicineService.add({
      name: "Mefenamic Acid",
      dose: "500mg",
      frequency: 2,
      timings: ["morning", "night"],
      food: "after",
      startDate: shiftDate(today, -5),
      durationDays: 5,
      category: "painRelief",
    });

    // Dose history over the past 4 days (85% adherence)
    for (let i = 4; i >= 1; i--) {
      const d = shiftDate(today, -i);
      medicineService.recordDose(iron.id, d, "morning", "taken");
      medicineService.recordDose(calcium.id, d, "night", i === 2 ? "skipped" : "taken");
      if (i <= 3) {
        medicineService.recordDose(mefenamic.id, d, "morning", "taken");
        medicineService.recordDose(mefenamic.id, d, "night", "taken");
      }
    }

    // 5. Two past visits with follow-up in ~5 days
    visitService.add({
      date: shiftDate(today, -45),
      doctorOrClinic: "Dr. Sunitha, CHC Shamshabad",
      reason: "Irregular periods and pelvic pain",
      notes: "Advised ultrasound scan and CBC blood test. Prescribed iron & calcium supplements.",
      linkedMedicines: ["Ferrous Ascorbate (Iron)", "Calcium & Vitamin D3"],
    });

    visitService.add({
      date: shiftDate(today, -15),
      doctorOrClinic: "Dr. Lakshmi, Govt Maternity Hospital Koti",
      reason: "Follow-up & severe period cramps",
      notes:
        "Reviewed ultrasound (normal pelvic scan). Advised pain management, iron compliance, and returning for follow-up.",
      linkedMedicines: ["Mefenamic Acid"],
      nextFollowUpDate: shiftDate(today, 5), // follow-up in 5 days
    });

    storage.set("demo_loaded", true);
  },

  async clearDemoData(): Promise<void> {
    await storage.clearAll();
    storage.remove("demo_loaded");
  },
};
