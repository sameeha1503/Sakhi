// Medicines and dose tracking service. All user data lives in storage adapter.
import { storage } from "./storage";
import { todayISO } from "./logs";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export const TIMES_OF_DAY: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

export type FoodTiming = "before" | "after" | "with" | "any";

export type MedicineCategory =
  "iron" | "calcium" | "painRelief" | "hormonal" | "antacid" | "antibiotic" | "general";

export type Medicine = {
  id: string;
  name: string;
  dose: string;
  frequency: number;
  timings: TimeOfDay[];
  food: FoodTiming;
  startDate: string; // YYYY-MM-DD
  durationDays: number;
  category?: MedicineCategory | undefined;
};

export type DoseStatus = "pending" | "taken" | "skipped";

export type DoseRecord = {
  id: string; // `${medicineId}_${date}_${timeOfDay}`
  medicineId: string;
  date: string; // YYYY-MM-DD
  timeOfDay: TimeOfDay;
  status: "taken" | "skipped";
  timestamp: string; // ISO string
};

export type ScheduledDose = {
  id: string;
  medicineId: string;
  medicineName: string;
  dose: string;
  timeOfDay: TimeOfDay;
  food: FoodTiming;
  category: MedicineCategory;
  date: string;
  status: DoseStatus;
  timestamp?: string | undefined;
  remainingDays: number;
};

export type DailyAdherence = {
  date: string;
  scheduled: number;
  taken: number;
  skipped: number;
};

export type AdherenceSummary = {
  totalScheduled: number;
  taken: number;
  skipped: number;
  percentage: number;
  history: DailyAdherence[];
};

const DAY_MS = 86400000;
const toMs = (iso: string) => new Date(iso + "T00:00:00Z").getTime();
export const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);
export const addDays = (iso: string, days: number) =>
  new Date(toMs(iso) + days * DAY_MS).toISOString().slice(0, 10);

/**
 * Infer purpose category from medicine name if not explicitly set.
 */
export function inferCategory(name: string): MedicineCategory {
  const n = name.toLowerCase();
  if (n.includes("iron") || n.includes("ferrous") || n.includes("folic") || n.includes("haem"))
    return "iron";
  if (n.includes("calcium") || n.includes("shelcal") || n.includes("vitamin d")) return "calcium";
  if (
    n.includes("mefenamic") ||
    n.includes("paracetamol") ||
    n.includes("ibuprofen") ||
    n.includes("combiflam") ||
    n.includes("pain")
  )
    return "painRelief";
  if (
    n.includes("progest") ||
    n.includes("contraceptive") ||
    n.includes("estrogen") ||
    n.includes("ovral") ||
    n.includes("primolut") ||
    n.includes("hormone")
  )
    return "hormonal";
  if (
    n.includes("panto") ||
    n.includes("omepra") ||
    n.includes("rabi") ||
    n.includes("antacid") ||
    n.includes("gelusil") ||
    n.includes("gas")
  )
    return "antacid";
  if (
    n.includes("amox") ||
    n.includes("azithro") ||
    n.includes("cipro") ||
    n.includes("biotic") ||
    n.includes("cefix")
  )
    return "antibiotic";
  return "general";
}

/**
 * Calculate remaining days for a medicine based on start date and duration.
 */
export function getRemainingDays(med: Medicine, today = todayISO()): number {
  const elapsed = diffDays(med.startDate, today);
  const remaining = med.durationDays - elapsed;
  return Math.max(0, remaining);
}

/**
 * Returns true if medicine has 3 or fewer days remaining.
 */
export function needsRefill(med: Medicine, today = todayISO()): boolean {
  const remaining = getRemainingDays(med, today);
  return remaining <= 3;
}

/**
 * Generate dose schedule for a given date from active medicines.
 */
export function generateDoseSchedule(
  medicines: Medicine[],
  date: string,
  records: DoseRecord[] = [],
): ScheduledDose[] {
  const recordMap = new Map(records.map((r) => [r.id, r]));
  const schedule: ScheduledDose[] = [];

  for (const med of medicines) {
    const elapsed = diffDays(med.startDate, date);
    // Include medicine if date is within its duration window
    if (elapsed >= 0 && elapsed < med.durationDays) {
      const remaining = getRemainingDays(med, date);
      const category = med.category ?? inferCategory(med.name);

      for (const timing of med.timings) {
        const id = `${med.id}_${date}_${timing}`;
        const rec = recordMap.get(id);

        schedule.push({
          id,
          medicineId: med.id,
          medicineName: med.name,
          dose: med.dose,
          timeOfDay: timing,
          food: med.food,
          category,
          date,
          status: rec?.status ?? "pending",
          timestamp: rec?.timestamp,
          remainingDays: remaining,
        });
      }
    }
  }

  // Sort by time of day order: morning, afternoon, evening, night
  const order: Record<TimeOfDay, number> = {
    morning: 1,
    afternoon: 2,
    evening: 3,
    night: 4,
  };
  return schedule.sort((a, b) => order[a.timeOfDay] - order[b.timeOfDay]);
}

/**
 * Calculate adherence summary across a time window (default 7 days up to today).
 */
export function calculateAdherence(
  medicines: Medicine[],
  records: DoseRecord[],
  today = todayISO(),
  days = 7,
): AdherenceSummary {
  const history: DailyAdherence[] = [];
  let totalScheduled = 0;
  let taken = 0;
  let skipped = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const daySchedule = generateDoseSchedule(medicines, d, records);
    const dayTaken = daySchedule.filter((s) => s.status === "taken").length;
    const daySkipped = daySchedule.filter((s) => s.status === "skipped").length;

    totalScheduled += daySchedule.length;
    taken += dayTaken;
    skipped += daySkipped;

    history.push({
      date: d,
      scheduled: daySchedule.length,
      taken: dayTaken,
      skipped: daySkipped,
    });
  }

  const denominator = totalScheduled;
  const percentage = denominator > 0 ? Math.round((taken / denominator) * 100) : 0;

  return {
    totalScheduled,
    taken,
    skipped,
    percentage,
    history,
  };
}

/**
 * Determine which timing bucket the current hour falls into.
 */
export function getCurrentTimeOfDay(date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export const medicineService = {
  all(): Medicine[] {
    return storage.get<Medicine[]>("medicines", []);
  },

  get(id: string): Medicine | null {
    return this.all().find((m) => m.id === id) ?? null;
  },

  add(med: Omit<Medicine, "id"> | Medicine): Medicine {
    const all = this.all();
    const id =
      "id" in med && med.id
        ? med.id
        : `med_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const category = med.category ?? inferCategory(med.name);
    const newMed: Medicine = {
      ...med,
      id,
      category,
    };
    storage.set("medicines", [...all, newMed]);
    return newMed;
  },

  addAll(meds: (Omit<Medicine, "id"> | Medicine)[]): Medicine[] {
    const existing = this.all();
    const created: Medicine[] = meds.map((m, idx) => {
      const id =
        "id" in m && m.id
          ? m.id
          : `med_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...m,
        id,
        category: m.category ?? inferCategory(m.name),
      };
    });
    storage.set("medicines", [...existing, ...created]);
    return created;
  },

  update(med: Medicine): void {
    const all = this.all().filter((m) => m.id !== med.id);
    storage.set("medicines", [...all, med]);
  },

  delete(id: string): void {
    const all = this.all().filter((m) => m.id !== id);
    storage.set("medicines", all);
    // Also remove doses for this medicine
    const doses = this.getDoseRecords().filter((d) => d.medicineId !== id);
    storage.set("doses", doses);
  },

  getDoseRecords(): DoseRecord[] {
    return storage.get<DoseRecord[]>("doses", []);
  },

  recordDose(
    medicineId: string,
    date: string,
    timeOfDay: TimeOfDay,
    status: "taken" | "skipped",
  ): DoseRecord {
    const id = `${medicineId}_${date}_${timeOfDay}`;
    const all = this.getDoseRecords().filter((r) => r.id !== id);
    const record: DoseRecord = {
      id,
      medicineId,
      date,
      timeOfDay,
      status,
      timestamp: new Date().toISOString(),
    };
    storage.set("doses", [...all, record]);
    return record;
  },

  undoDose(medicineId: string, date: string, timeOfDay: TimeOfDay): void {
    const id = `${medicineId}_${date}_${timeOfDay}`;
    const all = this.getDoseRecords().filter((r) => r.id !== id);
    storage.set("doses", all);
  },

  getTodaySchedule(today = todayISO()): ScheduledDose[] {
    return generateDoseSchedule(this.all(), today, this.getDoseRecords());
  },

  getAdherence(today = todayISO(), days = 7): AdherenceSummary {
    return calculateAdherence(this.all(), this.getDoseRecords(), today, days);
  },

  getRefillAlerts(today = todayISO()): { medicine: Medicine; remainingDays: number }[] {
    return this.all()
      .filter((m) => needsRefill(m, today))
      .map((m) => ({ medicine: m, remainingDays: getRemainingDays(m, today) }));
  },
};
