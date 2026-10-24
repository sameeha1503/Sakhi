// Mock prescription scanner service. Replace mock extraction with Vision AI later.
export type ScannedMedicine = {
  name: string;
  dose: string;
  frequency: number;
  timings: ("morning" | "afternoon" | "evening" | "night")[];
  food: "before" | "after" | "with" | "any";
  durationDays: number;
  category: "iron" | "calcium" | "painRelief" | "hormonal" | "antacid" | "antibiotic" | "general";
};

const SAMPLE_EXTRACTION: ScannedMedicine[] = [
  {
    name: "Ferrous Ascorbate + Folic Acid",
    dose: "100 mg (1 tablet)",
    frequency: 1,
    timings: ["night"],
    food: "after",
    durationDays: 30,
    category: "iron",
  },
  {
    name: "Calcium 500mg + Vitamin D3",
    dose: "500 mg (1 tablet)",
    frequency: 1,
    timings: ["morning"],
    food: "after",
    durationDays: 30,
    category: "calcium",
  },
  {
    name: "Mefenamic Acid",
    dose: "250 mg (1 tablet)",
    frequency: 2,
    timings: ["morning", "night"],
    food: "after",
    durationDays: 5,
    category: "painRelief",
  },
  {
    name: "Medroxyprogesterone",
    dose: "10 mg (1 tablet)",
    frequency: 1,
    timings: ["night"],
    food: "after",
    durationDays: 10,
    category: "hormonal",
  },
  {
    name: "Pantoprazole",
    dose: "40 mg (1 tablet)",
    frequency: 1,
    timings: ["morning"],
    food: "before",
    durationDays: 15,
    category: "antacid",
  },
];

/**
 * Scans a prescription document or photo.
 * Currently simulates a ~1.5s cloud OCR/vision processing latency
 * and returns realistic extracted medicines.
 *
 * @param _file The image File or Blob selected or photographed by the user.
 * @returns Promise resolving to an array of extracted medicines.
 */
export async function scanPrescription(_file: File | Blob): Promise<ScannedMedicine[]> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // Return deep clone of sample extraction so callers can freely mutate
  return JSON.parse(JSON.stringify(SAMPLE_EXTRACTION));
}
