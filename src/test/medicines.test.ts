import { describe, it, expect, beforeEach } from "vitest";
import {
  medicineService,
  generateDoseSchedule,
  calculateAdherence,
  inferCategory,
  getRemainingDays,
  needsRefill,
  type Medicine,
  type DoseRecord,
} from "@/services/medicines";
import { scanPrescription } from "@/services/scanner";
import { storage } from "@/services/storage";

describe("Medicines & Dose Reminders (Phase 3)", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  const sampleMeds: Medicine[] = [
    {
      id: "med_1",
      name: "Ferrous Ascorbate",
      dose: "100 mg",
      frequency: 1,
      timings: ["night"],
      food: "after",
      startDate: "2026-10-20",
      durationDays: 30,
      category: "iron",
    },
    {
      id: "med_2",
      name: "Mefenamic Acid",
      dose: "250 mg",
      frequency: 2,
      timings: ["morning", "night"],
      food: "after",
      startDate: "2026-10-24",
      durationDays: 5,
      category: "painRelief",
    },
    {
      id: "med_3",
      name: "Expired Medicine",
      dose: "10 mg",
      frequency: 1,
      timings: ["morning"],
      food: "before",
      startDate: "2026-10-01",
      durationDays: 10, // ended on 2026-10-11
      category: "general",
    },
  ];

  it("generates dose schedule correctly for today", () => {
    const today = "2026-10-24";
    const schedule = generateDoseSchedule(sampleMeds, today);

    // med_1 has 1 dose at night
    // med_2 has 2 doses (morning, night)
    // med_3 is expired (elapsed 23 days > 10 durationDays)
    expect(schedule).toHaveLength(3);

    const morning = schedule.filter((s) => s.timeOfDay === "morning");
    const night = schedule.filter((s) => s.timeOfDay === "night");

    expect(morning).toHaveLength(1);
    expect(morning[0]?.medicineName).toBe("Mefenamic Acid");

    expect(night).toHaveLength(2);
    expect(night.map((s) => s.medicineName)).toEqual(["Ferrous Ascorbate", "Mefenamic Acid"]);
  });

  it("updates scheduled dose status based on dose records", () => {
    const today = "2026-10-24";
    const records: DoseRecord[] = [
      {
        id: "med_2_2026-10-24_morning",
        medicineId: "med_2",
        date: today,
        timeOfDay: "morning",
        status: "taken",
        timestamp: "2026-10-24T08:30:00Z",
      },
      {
        id: "med_1_2026-10-24_night",
        medicineId: "med_1",
        date: today,
        timeOfDay: "night",
        status: "skipped",
        timestamp: "2026-10-24T21:00:00Z",
      },
    ];

    const schedule = generateDoseSchedule(sampleMeds, today, records);

    const morningDose = schedule.find((s) => s.medicineId === "med_2" && s.timeOfDay === "morning");
    expect(morningDose?.status).toBe("taken");

    const nightIron = schedule.find((s) => s.medicineId === "med_1" && s.timeOfDay === "night");
    expect(nightIron?.status).toBe("skipped");

    const nightPain = schedule.find((s) => s.medicineId === "med_2" && s.timeOfDay === "night");
    expect(nightPain?.status).toBe("pending");
  });

  it("calculates adherence rate and history accurately", () => {
    const today = "2026-10-24";
    const activeMeds: Medicine[] = [
      {
        id: "med_iron",
        name: "Iron Tab",
        dose: "1 tab",
        frequency: 1,
        timings: ["morning"],
        food: "after",
        startDate: "2026-10-18",
        durationDays: 30,
      },
    ];

    // Out of 7 days (Oct 18 - Oct 24), 7 doses scheduled.
    // Let's record 5 taken, 1 skipped, 1 pending today.
    const records: DoseRecord[] = [
      {
        id: "med_iron_2026-10-18_morning",
        medicineId: "med_iron",
        date: "2026-10-18",
        timeOfDay: "morning",
        status: "taken",
        timestamp: "2026-10-18T09:00:00Z",
      },
      {
        id: "med_iron_2026-10-19_morning",
        medicineId: "med_iron",
        date: "2026-10-19",
        timeOfDay: "morning",
        status: "taken",
        timestamp: "2026-10-19T09:00:00Z",
      },
      {
        id: "med_iron_2026-10-20_morning",
        medicineId: "med_iron",
        date: "2026-10-20",
        timeOfDay: "morning",
        status: "taken",
        timestamp: "2026-10-20T09:00:00Z",
      },
      {
        id: "med_iron_2026-10-21_morning",
        medicineId: "med_iron",
        date: "2026-10-21",
        timeOfDay: "morning",
        status: "taken",
        timestamp: "2026-10-21T09:00:00Z",
      },
      {
        id: "med_iron_2026-10-22_morning",
        medicineId: "med_iron",
        date: "2026-10-22",
        timeOfDay: "morning",
        status: "taken",
        timestamp: "2026-10-22T09:00:00Z",
      },
      {
        id: "med_iron_2026-10-23_morning",
        medicineId: "med_iron",
        date: "2026-10-23",
        timeOfDay: "morning",
        status: "skipped",
        timestamp: "2026-10-23T09:00:00Z",
      },
    ];

    const adherence = calculateAdherence(activeMeds, records, today, 7);

    expect(adherence.totalScheduled).toBe(7);
    expect(adherence.taken).toBe(5);
    expect(adherence.skipped).toBe(1);
    // 5 / 7 = 71.4% -> 71%
    expect(adherence.percentage).toBe(71);
    expect(adherence.history).toHaveLength(7);
  });

  it("calculates remaining days and triggers refill alert when <= 3 days left", () => {
    const today = "2026-10-24";

    const freshMed: Medicine = {
      id: "m1",
      name: "Fresh",
      dose: "1",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      startDate: "2026-10-20",
      durationDays: 30, // 26 days left
    };
    expect(getRemainingDays(freshMed, today)).toBe(26);
    expect(needsRefill(freshMed, today)).toBe(false);

    const lowMed: Medicine = {
      id: "m2",
      name: "Low Supply",
      dose: "1",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      startDate: "2026-10-20",
      durationDays: 6, // 6 - 4 = 2 days left
    };
    expect(getRemainingDays(lowMed, today)).toBe(2);
    expect(needsRefill(lowMed, today)).toBe(true);

    const lastDayMed: Medicine = {
      id: "m3",
      name: "Last Day",
      dose: "1",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      startDate: "2026-10-20",
      durationDays: 4, // 4 - 4 = 0 days left
    };
    expect(getRemainingDays(lastDayMed, today)).toBe(0);
    expect(needsRefill(lastDayMed, today)).toBe(true);
  });

  it("infers plain-language purpose category from medicine name with safe fallback", () => {
    expect(inferCategory("Ferrous Ascorbate + Folic Acid")).toBe("iron");
    expect(inferCategory("Shelcal 500 Calcium")).toBe("calcium");
    expect(inferCategory("Mefenamic Acid & Paracetamol")).toBe("painRelief");
    expect(inferCategory("Medroxyprogesterone acetate")).toBe("hormonal");
    expect(inferCategory("Pantoprazole 40mg")).toBe("antacid");
    expect(inferCategory("Amoxicillin 500mg")).toBe("antibiotic");
    expect(inferCategory("Unknown Brand XYZ")).toBe("general");
  });

  it("manages medicine CRUD and dose logging via service", () => {
    const med = medicineService.add({
      name: "Iron Supplement",
      dose: "1 tab",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      startDate: "2026-10-24",
      durationDays: 14,
    });

    expect(med.id).toBeDefined();
    expect(medicineService.all()).toHaveLength(1);
    expect(medicineService.get(med.id)?.name).toBe("Iron Supplement");

    // Record dose
    medicineService.recordDose(med.id, "2026-10-24", "morning", "taken");
    expect(medicineService.getDoseRecords()).toHaveLength(1);
    expect(medicineService.getDoseRecords()[0]?.status).toBe("taken");

    // Undo dose
    medicineService.undoDose(med.id, "2026-10-24", "morning");
    expect(medicineService.getDoseRecords()).toHaveLength(0);

    // Delete medicine wipes doses too
    medicineService.delete(med.id);
    expect(medicineService.all()).toHaveLength(0);
  });

  it("scans prescription with realistic extraction", async () => {
    const dummyBlob = new Blob(["dummy prescription"], { type: "image/jpeg" });
    const result = await scanPrescription(dummyBlob);

    expect(result).toHaveLength(5);
    expect(result[0]?.name).toContain("Ferrous Ascorbate");
    expect(result[0]?.category).toBe("iron");
    expect(result[1]?.category).toBe("calcium");
    expect(result[2]?.category).toBe("painRelief");
  });
});
