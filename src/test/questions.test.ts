import { describe, it, expect, beforeEach } from "vitest";
import { generateSuggestedQuestions, questionService } from "@/services/questions";
import { medicineService } from "@/services/medicines";
import { storage } from "@/services/storage";
import type { DailyLog } from "@/services/logs";

describe("Question generation logic", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  const makeLog = (date: string, partial: Partial<DailyLog>): DailyLog => ({
    date,
    flow: "none",
    painAreas: [],
    painLevel: 0,
    mood: 2,
    energy: 2,
    sleep: 2,
    symptoms: [],
    ...partial,
  });

  it("generates generic wellness questions when no logs or patterns exist", () => {
    const questions = generateSuggestedQuestions([], "2026-03-25");
    const ids = questions.map((q) => q.id);

    expect(ids).toContain("q_general_tests");
    expect(ids).toContain("q_general_nutrition");
    expect(ids).toContain("q_general_redflags");
    expect(ids).toContain("q_general_followup");
    expect(questions.some((q) => q.category === "flag")).toBe(false);
  });

  it("suggests PCOS/hormone questions when irregularPlus flag is triggered", () => {
    // 3 bleeding runs with irregular gap > 35 days, plus acne across 3+ weeks
    const logs: DailyLog[] = [
      makeLog("2026-01-01", { flow: "medium", symptoms: ["acne"] }),
      makeLog("2026-01-15", { flow: "none", symptoms: ["acne"] }),
      makeLog("2026-02-15", { flow: "medium", symptoms: ["acne"] }), // 45 day cycle
      makeLog("2026-03-25", { flow: "medium", symptoms: [] }),
    ];

    const questions = generateSuggestedQuestions(logs, "2026-03-25");
    const flagQ = questions.find((q) => q.id === "q_flag_irregular_plus");
    expect(flagQ).toBeDefined();
    expect(flagQ?.category).toBe("flag");
  });

  it("suggests pain management questions when painCycle flag is triggered", () => {
    const logs: DailyLog[] = [
      makeLog("2026-01-01", { flow: "medium", painLevel: 4 }),
      makeLog("2026-01-29", { flow: "medium", painLevel: 4 }),
    ];

    const questions = generateSuggestedQuestions(logs, "2026-03-10");
    const painQ = questions.find((q) => q.id === "q_flag_pain_cycle");
    expect(painQ).toBeDefined();
    expect(painQ?.category).toBe("flag");
  });

  it("suggests anaemia/iron questions when heavyRepeat flag is triggered", () => {
    const logs: DailyLog[] = [
      makeLog("2026-03-01", { flow: "heavy" }),
      makeLog("2026-03-02", { flow: "heavy" }),
      makeLog("2026-03-03", { flow: "veryHeavy" }),
      makeLog("2026-03-04", { flow: "heavy" }),
    ];

    const questions = generateSuggestedQuestions(logs, "2026-03-10");
    const heavyQ = questions.find((q) => q.id === "q_flag_heavy_repeat");
    expect(heavyQ).toBeDefined();
    expect(heavyQ?.category).toBe("flag");
  });

  it("suggests symptom-specific questions when symptoms are logged without full flag threshold", () => {
    const logs: DailyLog[] = [
      makeLog("2026-03-01", { symptoms: ["irregular"] }),
      makeLog("2026-03-05", { symptoms: ["pelvicPain"], painAreas: ["pelvis"] }),
    ];

    const questions = generateSuggestedQuestions(logs, "2026-03-10");
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("q_symptom_irregular");
    expect(ids).toContain("q_symptom_pelvic_pain");
  });

  it("suggests medication review when user has active medicines", () => {
    medicineService.add({
      name: "Iron Supplement",
      dose: "100mg",
      frequency: 1,
      timings: ["morning"],
      food: "after",
      startDate: "2026-03-01",
      durationDays: 30,
    });

    const questions = generateSuggestedQuestions([], "2026-03-10");
    const medQ = questions.find((q) => q.id === "q_medicine_review");
    expect(medQ).toBeDefined();
    expect(medQ?.category).toBe("medicine");
  });

  it("supports adding, ticking, unticking and deleting custom questions", () => {
    const custom = questionService.addCustomQuestion("Can I take this medicine during fasting?");
    expect(custom.id).toBeDefined();
    expect(questionService.getCustomQuestions().length).toBe(1);
    expect(questionService.getTickedIds()).toContain(custom.id);

    // Toggle ticked
    questionService.setTicked(custom.id, false);
    expect(questionService.getTickedIds()).not.toContain(custom.id);

    // Get selected questions
    const selected = questionService.getSelectedQuestions([], "2026-03-10");
    expect(selected.map((s) => s.id)).not.toContain(custom.id);

    // Tick it again
    questionService.setTicked(custom.id, true);
    const selectedAgain = questionService.getSelectedQuestions([], "2026-03-10");
    expect(selectedAgain.map((s) => s.id)).toContain(custom.id);

    // Delete custom question
    questionService.deleteCustomQuestion(custom.id);
    expect(questionService.getCustomQuestions().length).toBe(0);
    expect(questionService.getTickedIds()).not.toContain(custom.id);
  });
});
