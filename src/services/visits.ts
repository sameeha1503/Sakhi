// Visits service for doctor/clinic visit timeline and follow-up reminders.
// Stored via the storage adapter. Cleared automatically with "delete my data".

import { storage } from "./storage";
import { todayISO } from "./logs";

export type Visit = {
  id: string;
  date: string; // YYYY-MM-DD
  doctorOrClinic: string;
  reason: string;
  notes: string;
  linkedMedicines: string[]; // names or IDs of medicines prescribed / discussed
  nextFollowUpDate?: string | undefined; // YYYY-MM-DD
  createdAt: string;
};

const DAY_MS = 86400000;
const toMs = (iso: string) => new Date(iso + "T00:00:00Z").getTime();
export const diffDays = (fromIso: string, toIso: string) =>
  Math.round((toMs(toIso) - toMs(fromIso)) / DAY_MS);

export const visitService = {
  all(): Visit[] {
    return storage.get<Visit[]>("visits", []).sort((a, b) => b.date.localeCompare(a.date)); // Latest first
  },

  get(id: string): Visit | null {
    return this.all().find((v) => v.id === id) ?? null;
  },

  add(data: Omit<Visit, "id" | "createdAt"> | Visit): Visit {
    const all = this.all();
    const id =
      "id" in data && data.id
        ? data.id
        : `visit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt =
      "createdAt" in data && data.createdAt ? data.createdAt : new Date().toISOString();

    const newVisit: Visit = {
      ...data,
      id,
      createdAt,
      doctorOrClinic: data.doctorOrClinic.trim(),
      reason: data.reason.trim(),
      notes: (data.notes || "").trim(),
      linkedMedicines: data.linkedMedicines || [],
      nextFollowUpDate: data.nextFollowUpDate?.trim() || undefined,
    };

    storage.set("visits", [newVisit, ...all.filter((v) => v.id !== id)]);
    return newVisit;
  },

  update(visit: Visit): void {
    const all = this.all().filter((v) => v.id !== visit.id);
    storage.set("visits", [visit, ...all]);
  },

  delete(id: string): void {
    const all = this.all().filter((v) => v.id !== id);
    storage.set("visits", all);
  },

  /**
   * Returns visits with follow-up dates within the next `withinDays` (inclusive, e.g. 0 to 3 days).
   */
  getUpcomingFollowUps(
    today = todayISO(),
    withinDays = 3,
  ): { visit: Visit; daysRemaining: number }[] {
    const visits = this.all();
    const upcoming: { visit: Visit; daysRemaining: number }[] = [];

    for (const v of visits) {
      if (!v.nextFollowUpDate) continue;
      const days = diffDays(today, v.nextFollowUpDate);
      if (days >= 0 && days <= withinDays) {
        upcoming.push({ visit: v, daysRemaining: days });
      }
    }

    return upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
  },
};
