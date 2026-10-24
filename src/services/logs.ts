// Daily check-in logs. localStorage now; swap for Supabase later.
import { storage } from "./storage";

export type Flow = "none" | "light" | "medium" | "heavy" | "veryHeavy";
export const FLOWS: Flow[] = ["none", "light", "medium", "heavy", "veryHeavy"];
export const PAIN_AREAS = ["head", "breast", "stomach", "pelvis", "back", "legs"] as const;
export const SYMPTOMS = [
  "irregular",
  "acne",
  "hairLoss",
  "weight",
  "heavyBleeding",
  "pelvicPain",
] as const;

export type DailyLog = {
  date: string; // YYYY-MM-DD
  flow: Flow;
  painAreas: string[];
  painLevel: number; // 0-5
  mood: number; // 1-3
  energy: number; // 1-3
  sleep: number; // 1-3
  symptoms: string[];
};

export const todayISO = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export const emptyLog = (date = todayISO()): DailyLog => ({
  date,
  flow: "none",
  painAreas: [],
  painLevel: 0,
  mood: 2,
  energy: 2,
  sleep: 2,
  symptoms: [],
});

export const logService = {
  all(): DailyLog[] {
    return storage.get<DailyLog[]>("logs", []).sort((a, b) => a.date.localeCompare(b.date));
  },
  get(date: string) {
    return this.all().find((l) => l.date === date) ?? null;
  },
  save(log: DailyLog) {
    const rest = this.all().filter((l) => l.date !== log.date);
    storage.set("logs", [...rest, log]);
  },
  replaceAll(logs: DailyLog[]) {
    storage.set("logs", logs);
  },
};
