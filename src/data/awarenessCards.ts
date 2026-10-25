// Health Awareness Cards dataset and personalization logic.
// Offline-first, lightweight, rule-based educational cards for women's healthcare.

export type AwarenessCardAction =
  { type: "link"; to: string; labelKey: string } | { type: "ask"; query: string; labelKey: string };

export type AwarenessCardIcon =
  | "pcos_what"
  | "pcos_signs"
  | "endo_what"
  | "endo_signs"
  | "cycle_normal"
  | "when_doctor"
  | "urgent_care"
  | "anemia_basics";

export type AwarenessCard = {
  id: string;
  iconName: AwarenessCardIcon;
  titleKey: string;
  bodyKey: string;
  action?: AwarenessCardAction;
  matchedFlag?: "irregularPlus" | "painCycle" | "heavyRepeat";
};

export const AWARENESS_LAST_CARD_KEY = "awareness_last_card";

export const AWARENESS_CARDS: AwarenessCard[] = [
  // 1. What is PCOS/PCOD?
  {
    id: "pcos_what",
    iconName: "pcos_what",
    titleKey: "awareness.cards.pcosWhat.title",
    bodyKey: "awareness.cards.pcosWhat.body",
    action: {
      type: "ask",
      query: "What is PCOS?",
      labelKey: "awareness.actions.askSakhi",
    },
  },

  // 2. Signs that may point to PCOS
  {
    id: "pcos_signs",
    iconName: "pcos_signs",
    titleKey: "awareness.cards.pcosSigns.title",
    bodyKey: "awareness.cards.pcosSigns.body",
    matchedFlag: "irregularPlus",
    action: {
      type: "link",
      to: "/log",
      labelKey: "awareness.actions.logSymptoms",
    },
  },

  // 3. What is endometriosis?
  {
    id: "endo_what",
    iconName: "endo_what",
    titleKey: "awareness.cards.endoWhat.title",
    bodyKey: "awareness.cards.endoWhat.body",
    action: {
      type: "ask",
      query: "What is endometriosis?",
      labelKey: "awareness.actions.askSakhi",
    },
  },

  // 4. Signs that may point to endometriosis
  {
    id: "endo_signs",
    iconName: "endo_signs",
    titleKey: "awareness.cards.endoSigns.title",
    bodyKey: "awareness.cards.endoSigns.body",
    matchedFlag: "painCycle",
    action: {
      type: "link",
      to: "/visit",
      labelKey: "awareness.actions.doctorVisit",
    },
  },

  // 5. What is a normal cycle?
  {
    id: "cycle_normal",
    iconName: "cycle_normal",
    titleKey: "awareness.cards.cycleNormal.title",
    bodyKey: "awareness.cards.cycleNormal.body",
    action: {
      type: "link",
      to: "/log",
      labelKey: "awareness.actions.logSymptoms",
    },
  },

  // 6. When should I see a doctor?
  {
    id: "when_doctor",
    iconName: "when_doctor",
    titleKey: "awareness.cards.whenDoctor.title",
    bodyKey: "awareness.cards.whenDoctor.body",
    action: {
      type: "link",
      to: "/care",
      labelKey: "awareness.actions.findCare",
    },
  },

  // 7. Red flags that need urgent care
  {
    id: "urgent_care",
    iconName: "urgent_care",
    titleKey: "awareness.cards.urgentCare.title",
    bodyKey: "awareness.cards.urgentCare.body",
    action: {
      type: "link",
      to: "/urgent",
      labelKey: "awareness.actions.urgentCare",
    },
  },

  // 8. Eating and anaemia basics
  {
    id: "anemia_basics",
    iconName: "anemia_basics",
    titleKey: "awareness.cards.anemiaBasics.title",
    bodyKey: "awareness.cards.anemiaBasics.body",
    matchedFlag: "heavyRepeat",
    action: {
      type: "link",
      to: "/schemes",
      labelKey: "awareness.actions.schemes",
    },
  },
];

/**
 * Lightly personalizes card order based on the user's logged pattern flags.
 * If irregularPlus -> pcos_signs first.
 * If painCycle -> endo_signs first.
 * If heavyRepeat -> anemia_basics first.
 * Rule-based only: never claims a medical diagnosis.
 */
export function getOrderedAwarenessCards(userFlags: string[] = []): {
  cards: AwarenessCard[];
  priorityCardId?: string;
} {
  let targetId: string | undefined;

  if (userFlags.includes("irregularPlus")) {
    targetId = "pcos_signs";
  } else if (userFlags.includes("painCycle")) {
    targetId = "endo_signs";
  } else if (userFlags.includes("heavyRepeat")) {
    targetId = "anemia_basics";
  }

  if (!targetId) {
    return { cards: [...AWARENESS_CARDS] };
  }

  const prioritized = AWARENESS_CARDS.find((c) => c.id === targetId);
  if (!prioritized) {
    return { cards: [...AWARENESS_CARDS] };
  }

  const remaining = AWARENESS_CARDS.filter((c) => c.id !== targetId);
  return {
    cards: [prioritized, ...remaining],
    priorityCardId: targetId,
  };
}
