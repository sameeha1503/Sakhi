// Curated directory of Government Health Schemes for women and families in India.
// Eligibility rules are evaluated locally to suggest schemes she may qualify for.

export type AgeGroup = "under18" | "18_29" | "30_49" | "50_plus";
export type HouseholdCategory = "bpl_ration" | "general" | "senior";

export type SchemeRule = {
  minAge?: number;
  maxAge?: number;
  pregnantOnly?: boolean;
  bplOnly?: boolean;
  targetGender?: "female" | "all";
};

export type Scheme = {
  id: string;
  nameKey: string;
  shortDescKey: string;
  benefitsKey: string;
  documentsKey: string;
  whereToApplyKey: string;
  portalUrl?: string;
  rule: SchemeRule;
  highlightCategory?: "maternal" | "insurance" | "screening" | "primaryCare";
};

export const SCHEMES: Scheme[] = [
  {
    id: "pmjay",
    nameKey: "schemes.pmjay.name",
    shortDescKey: "schemes.pmjay.shortDesc",
    benefitsKey: "schemes.pmjay.benefits",
    documentsKey: "schemes.pmjay.documents",
    whereToApplyKey: "schemes.pmjay.whereToApply",
    portalUrl: "https://pmjay.gov.in",
    rule: {
      bplOnly: true,
      targetGender: "all",
    },
    highlightCategory: "insurance",
  },
  {
    id: "arogya_mandir",
    nameKey: "schemes.arogyaMandir.name",
    shortDescKey: "schemes.arogyaMandir.shortDesc",
    benefitsKey: "schemes.arogyaMandir.benefits",
    documentsKey: "schemes.arogyaMandir.documents",
    whereToApplyKey: "schemes.arogyaMandir.whereToApply",
    portalUrl: "https://ab-hwc.nhp.gov.in",
    rule: {
      targetGender: "all",
    },
    highlightCategory: "screening",
  },
  {
    id: "jsy",
    nameKey: "schemes.jsy.name",
    shortDescKey: "schemes.jsy.shortDesc",
    benefitsKey: "schemes.jsy.benefits",
    documentsKey: "schemes.jsy.documents",
    whereToApplyKey: "schemes.jsy.whereToApply",
    portalUrl: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309",
    rule: {
      pregnantOnly: true,
      targetGender: "female",
    },
    highlightCategory: "maternal",
  },
  {
    id: "pmmvy",
    nameKey: "schemes.pmmvy.name",
    shortDescKey: "schemes.pmmvy.shortDesc",
    benefitsKey: "schemes.pmmvy.benefits",
    documentsKey: "schemes.pmmvy.documents",
    whereToApplyKey: "schemes.pmmvy.whereToApply",
    portalUrl: "https://pmmvy.wcd.gov.in",
    rule: {
      pregnantOnly: true,
      minAge: 18,
      targetGender: "female",
    },
    highlightCategory: "maternal",
  },
  {
    id: "pmsma",
    nameKey: "schemes.pmsma.name",
    shortDescKey: "schemes.pmsma.shortDesc",
    benefitsKey: "schemes.pmsma.benefits",
    documentsKey: "schemes.pmsma.documents",
    whereToApplyKey: "schemes.pmsma.whereToApply",
    portalUrl: "https://pmsma.mohfw.gov.in",
    rule: {
      pregnantOnly: true,
      targetGender: "female",
    },
    highlightCategory: "maternal",
  },
  {
    id: "jssk",
    nameKey: "schemes.jssk.name",
    shortDescKey: "schemes.jssk.shortDesc",
    benefitsKey: "schemes.jssk.benefits",
    documentsKey: "schemes.jssk.documents",
    whereToApplyKey: "schemes.jssk.whereToApply",
    portalUrl: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=842&lid=310",
    rule: {
      pregnantOnly: true,
      targetGender: "female",
    },
    highlightCategory: "maternal",
  },
];
