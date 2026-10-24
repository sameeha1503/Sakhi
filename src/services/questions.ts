// Question preparation service for doctor visits.
// Analyzes logged symptoms, cycle patterns, and flags to suggest relevant questions.
// All user customizations and ticked states persist via the storage adapter.

import { storage } from "./storage";
import { type DailyLog } from "./logs";
import { patternFlags, isIrregular, type FlagId } from "./cycle";
import { medicineService } from "./medicines";

export type QuestionCategory = "flag" | "symptom" | "medicine" | "general" | "custom";

export type SuggestedQuestion = {
  id: string;
  category: QuestionCategory;
  i18nKey?: string;
  defaultText: string;
  isCustom?: boolean;
};

export type CustomQuestion = {
  id: string;
  text: string;
  createdAt: string;
};

export const DEFAULT_GENERAL_QUESTIONS: SuggestedQuestion[] = [
  {
    id: "q_general_tests",
    category: "general",
    i18nKey: "questions.suggested.generalTests",
    defaultText: "Are there any routine blood tests, vitamin checks, or scans recommended for me?",
  },
  {
    id: "q_general_nutrition",
    category: "general",
    i18nKey: "questions.suggested.nutrition",
    defaultText: "What dietary changes or daily habits can help support my health and energy?",
  },
  {
    id: "q_general_redflags",
    category: "general",
    i18nKey: "questions.suggested.redFlags",
    defaultText:
      "What warning signs should prompt me to come back or go to the hospital right away?",
  },
  {
    id: "q_general_followup",
    category: "general",
    i18nKey: "questions.suggested.followUp",
    defaultText: "When should I come in for my next check-up or follow-up visit?",
  },
];

/**
 * Generate suggested questions dynamically based on logged data and pattern flags.
 */
export function generateSuggestedQuestions(logs: DailyLog[], today: string): SuggestedQuestion[] {
  const questions: SuggestedQuestion[] = [];
  const flags: FlagId[] = patternFlags(logs, today);

  const recent90 = logs.filter((l) => {
    const diff = Math.round(
      (new Date(today + "T00:00:00Z").getTime() - new Date(l.date + "T00:00:00Z").getTime()) /
        86400000,
    );
    return diff >= 0 && diff <= 90;
  });

  // 1. Pattern flags questions
  if (flags.includes("irregularPlus")) {
    questions.push({
      id: "q_flag_irregular_plus",
      category: "flag",
      i18nKey: "questions.suggested.irregularPlus",
      defaultText:
        "Could my irregular periods alongside pimples, hair fall or weight changes be related to PCOS or thyroid?",
    });
  }

  if (flags.includes("painCycle")) {
    questions.push({
      id: "q_flag_pain_cycle",
      category: "flag",
      i18nKey: "questions.suggested.painCycle",
      defaultText:
        "I have had severe period pain across multiple cycles. What could be causing it and what safe pain relief do you recommend?",
    });
  }

  if (flags.includes("heavyRepeat")) {
    questions.push({
      id: "q_flag_heavy_repeat",
      category: "flag",
      i18nKey: "questions.suggested.heavyRepeat",
      defaultText:
        "I have had frequent heavy bleeding. Could this be making me anaemic or low on iron, and do I need an ultrasound?",
    });
  }

  // 2. Specific logged symptoms not already covered by flags
  const hasIrregular =
    !flags.includes("irregularPlus") &&
    (isIrregular(logs) || recent90.some((l) => l.symptoms.includes("irregular")));
  if (hasIrregular) {
    questions.push({
      id: "q_symptom_irregular",
      category: "symptom",
      i18nKey: "questions.suggested.irregularCycles",
      defaultText:
        "Could my irregular periods have an underlying cause that needs medical testing?",
    });
  }

  const hasPelvicPain =
    !flags.includes("painCycle") &&
    recent90.some((l) => l.symptoms.includes("pelvicPain") || l.painAreas.includes("pelvis"));
  if (hasPelvicPain) {
    questions.push({
      id: "q_symptom_pelvic_pain",
      category: "symptom",
      i18nKey: "questions.suggested.pelvicPain",
      defaultText:
        "I have noticed persistent pelvic pain. Are there specific scans or checks we should do?",
    });
  }

  const hasHeavyFlowWithoutFlag =
    !flags.includes("heavyRepeat") &&
    recent90.some((l) => l.flow === "heavy" || l.symptoms.includes("heavyBleeding"));
  if (hasHeavyFlowWithoutFlag) {
    questions.push({
      id: "q_symptom_heavy_flow",
      category: "symptom",
      i18nKey: "questions.suggested.heavyBleeding",
      defaultText:
        "My bleeding has been heavy at times. Should we check my haemoglobin level for anaemia?",
    });
  }

  // 3. Medicine question if medicines are recorded
  const medicines = medicineService.all();
  if (medicines.length > 0) {
    questions.push({
      id: "q_medicine_review",
      category: "medicine",
      i18nKey: "questions.suggested.medicineReview",
      defaultText:
        "Are all my current medications still needed, and are there any side effects or adjustments required?",
    });
  }

  // 4. Always add generic wellness questions
  questions.push(...DEFAULT_GENERAL_QUESTIONS);

  return questions;
}

export const questionService = {
  getCustomQuestions(): CustomQuestion[] {
    return storage.get<CustomQuestion[]>("prep_custom_questions", []);
  },

  addCustomQuestion(text: string): CustomQuestion {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Question text cannot be empty");
    const custom: CustomQuestion = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    const all = this.getCustomQuestions();
    storage.set("prep_custom_questions", [...all, custom]);
    // Auto-tick new custom question
    this.setTicked(custom.id, true);
    return custom;
  },

  deleteCustomQuestion(id: string): void {
    const all = this.getCustomQuestions().filter((q) => q.id !== id);
    storage.set("prep_custom_questions", all);
    this.setTicked(id, false);
  },

  getTickedIds(): string[] {
    return storage.get<string[]>("prep_ticked_ids", []);
  },

  setTicked(id: string, isTicked: boolean): void {
    const current = new Set(this.getTickedIds());
    if (isTicked) {
      current.add(id);
    } else {
      current.delete(id);
    }
    storage.set("prep_ticked_ids", Array.from(current));
  },

  toggleTicked(id: string): boolean {
    const current = new Set(this.getTickedIds());
    const nextState = !current.has(id);
    if (nextState) {
      current.add(id);
    } else {
      current.delete(id);
    }
    storage.set("prep_ticked_ids", Array.from(current));
    return nextState;
  },

  /**
   * Get all questions currently selected/ticked by the user (both suggested and custom),
   * resolved with their translated texts if translation function is supplied.
   */
  getSelectedQuestions(
    logs: DailyLog[],
    today: string,
    translateFn?: (key: string, fallback: string) => string,
  ): { id: string; text: string; category: QuestionCategory }[] {
    const suggested = generateSuggestedQuestions(logs, today);
    const custom = this.getCustomQuestions();
    const tickedSet = new Set(this.getTickedIds());

    const result: { id: string; text: string; category: QuestionCategory }[] = [];

    // Add ticked suggested questions
    for (const q of suggested) {
      if (tickedSet.has(q.id)) {
        const text =
          translateFn && q.i18nKey ? translateFn(q.i18nKey, q.defaultText) : q.defaultText;
        result.push({ id: q.id, text, category: q.category });
      }
    }

    // Add ticked custom questions
    for (const c of custom) {
      if (tickedSet.has(c.id)) {
        result.push({ id: c.id, text: c.text, category: "custom" });
      }
    }

    return result;
  },
};
