// Curated knowledge base for Ask Sakhi offline/fallback assistant.
// Contains 16 intents covering key women's health topics in India.
// All UI strings, keyword lists, and answers are localized across all 11 Indic languages.

export type KnowledgeAction = {
  labelKey: string;
  defaultLabel: string;
  to: string;
};

export type KnowledgeIntent = {
  id: string;
  keywordsKey: string;
  answerKey: string;
  defaultKeywords: string[];
  defaultAnswer: string;
  action?: KnowledgeAction;
};

export const KNOWLEDGE_INTENTS: KnowledgeIntent[] = [
  // 1. PCOS Signs (specific before general pcos_what)
  {
    id: "pcos_signs",
    keywordsKey: "chat.kb.pcosSigns.keywords",
    answerKey: "chat.kb.pcosSigns.answer",
    defaultKeywords: [
      "pcos signs",
      "pcod signs",
      "signs of pcos",
      "signs of pcod",
      "symptoms of pcos",
      "symptoms of pcod",
      "facial hair",
      "hirsutism",
      "cystic acne",
      "dark neck patches",
      "pcos ke lakshan",
      "pcod ke lakshan",
      "पीसीओएस लक्षण",
      "पीसीओएस के लक्षण",
    ],
    defaultAnswer:
      "Signs of PCOS include periods that are late, irregular, or skipped; unexpected weight gain or difficulty losing weight; acne on face, chest, or back; excess facial or body hair; thinning scalp hair; and dark skin patches around neck folds. Tracking symptoms helps your doctor evaluate you.",
    action: {
      labelKey: "chat.actions.logSymptoms",
      defaultLabel: "Open my symptom log",
      to: "/log",
    },
  },

  // 2. What is PCOS
  {
    id: "pcos_what",
    keywordsKey: "chat.kb.pcosWhat.keywords",
    answerKey: "chat.kb.pcosWhat.answer",
    defaultKeywords: [
      "what is pcos",
      "what is pcod",
      "tell me about pcos",
      "tell me about pcod",
      "pcos",
      "pcod",
      "polycystic",
      "ovarian cysts",
      "पीसीओएस क्या है",
      "पीसीओडी क्या है",
      "पीसीओएस",
      "पीसीओडी",
    ],
    defaultAnswer:
      "PCOS (Polycystic Ovary Syndrome) is a common hormonal condition where the ovaries produce slightly higher amounts of male hormones. This can cause irregular periods, acne, excess facial or body hair, and weight changes. It can be managed well with healthy food, exercise, and medical guidance.",
    action: {
      labelKey: "chat.actions.doctorVisit",
      defaultLabel: "Doctor visit",
      to: "/visit",
    },
  },

  // 3. Endometriosis Signs (specific before general endo_what)
  {
    id: "endo_signs",
    keywordsKey: "chat.kb.endoSigns.keywords",
    answerKey: "chat.kb.endoSigns.answer",
    defaultKeywords: [
      "endometriosis signs",
      "signs of endometriosis",
      "signs of endo",
      "endo symptoms",
      "symptoms of endometriosis",
      "pelvic pain between periods",
      "pain during sex",
      "severe period cramps",
      "painful bowel movements",
      "endometriosis ke lakshan",
      "एंडोमेट्रिओसिस लक्षण",
      "एंडोमेट्रिओसिस के लक्षण",
    ],
    defaultAnswer:
      "Key signs of endometriosis include severe period cramps that do not improve with common rest, sharp pelvic pain between periods, pain during or after intimacy, deep lower back pain, painful urination or bowel movements during periods, and unusually heavy bleeding.",
    action: {
      labelKey: "chat.actions.logSymptoms",
      defaultLabel: "Open my symptom log",
      to: "/log",
    },
  },

  // 4. What is Endometriosis
  {
    id: "endo_what",
    keywordsKey: "chat.kb.endoWhat.keywords",
    answerKey: "chat.kb.endoWhat.answer",
    defaultKeywords: [
      "what is endometriosis",
      "what is endo",
      "endometriosis",
      "endo",
      "uterine lining",
      "pelvic disease",
      "एंडोमेट्रिओसिस क्या है",
      "एंडोमेट्रिओसिस",
    ],
    defaultAnswer:
      "Endometriosis is a condition where tissue similar to the lining inside the uterus grows outside the uterus, such as on the ovaries or pelvis. During periods, this tissue also bleeds and causes inflammation, swelling, and severe pain. A doctor can diagnose and suggest treatment options.",
    action: {
      labelKey: "chat.actions.doctorVisit",
      defaultLabel: "Doctor visit",
      to: "/visit",
    },
  },

  // 5. Irregular Periods (specific before cycle_normal)
  {
    id: "cycle_irregular",
    keywordsKey: "chat.kb.cycleIrregular.keywords",
    answerKey: "chat.kb.cycleIrregular.answer",
    defaultKeywords: [
      "irregular periods",
      "irregular period",
      "irregular cycle",
      "missed period",
      "late period",
      "period delays",
      "skipped period",
      "uneven cycle",
      "delay period",
      "अनियमित माहवारी",
      "पीरियड देर से आना",
    ],
    defaultAnswer:
      "Your cycle may be irregular if it comes sooner than 21 days, later than 35 days, or varies unpredictably by more than 7 days each month. Common causes include stress, hormonal changes (like PCOS or thyroid), weight changes, or lack of sleep. Discuss persistent changes with a doctor.",
    action: {
      labelKey: "chat.actions.doctorVisit",
      defaultLabel: "Doctor visit",
      to: "/visit",
    },
  },

  // 6. Normal Cycle
  {
    id: "cycle_normal",
    keywordsKey: "chat.kb.cycleNormal.keywords",
    answerKey: "chat.kb.cycleNormal.answer",
    defaultKeywords: [
      "is my cycle normal",
      "normal cycle",
      "normal period",
      "cycle length",
      "how many days period",
      "how long is cycle",
      "cycle duration",
      "28 days",
      "सामान्य माहवारी",
      "मासिक चक्र सामान्य",
    ],
    defaultAnswer:
      "A normal menstrual cycle typically lasts between 21 and 35 days, counted from the first day of one period to the first day of the next. Bleeding usually lasts 2 to 7 days. Mild variations of a few days from month to month are normal.",
    action: {
      labelKey: "chat.actions.logSymptoms",
      defaultLabel: "Open my symptom log",
      to: "/log",
    },
  },

  // 7. Period Pain
  {
    id: "period_pain",
    keywordsKey: "chat.kb.periodPain.keywords",
    answerKey: "chat.kb.periodPain.answer",
    defaultKeywords: [
      "period pain",
      "dysmenorrhea",
      "bad cramps",
      "menstrual pain",
      "stomach pain period",
      "abdominal cramps",
      "severe cramps",
      "माहवारी का दर्द",
      "पेट में ऐंठन",
    ],
    defaultAnswer:
      "Mild cramping is common, but severe pain that stops you from working, going to school, or sleeping is not normal. Severe cramps can be caused by endometriosis, fibroids, or infections. Warm water compresses can soothe mild pain, but please consult a doctor for severe pain.",
    action: {
      labelKey: "chat.actions.doctorVisit",
      defaultLabel: "Doctor visit",
      to: "/visit",
    },
  },

  // 8. Heavy Bleeding
  {
    id: "heavy_bleeding",
    keywordsKey: "chat.kb.heavyBleeding.keywords",
    answerKey: "chat.kb.heavyBleeding.answer",
    defaultKeywords: [
      "heavy bleeding",
      "menorrhagia",
      "soaking pads",
      "blood clots",
      "flooding",
      "excessive bleeding",
      "bleeding for weeks",
      "continuous bleeding",
      "भारी रक्तस्राव",
      "खून के थक्के",
    ],
    defaultAnswer:
      "Bleeding is considered heavy if you soak through one or more pads every 1 to 2 hours, pass blood clots larger than a coin, bleed for more than 7 days, or feel dizzy, faint, and exhausted. Please see a doctor to check your iron levels and cause.",
    action: {
      labelKey: "chat.actions.doctorVisit",
      defaultLabel: "Doctor visit",
      to: "/visit",
    },
  },

  // 9. When to see a Doctor
  {
    id: "when_doctor",
    keywordsKey: "chat.kb.whenDoctor.keywords",
    answerKey: "chat.kb.whenDoctor.answer",
    defaultKeywords: [
      "when should i see a doctor",
      "when to see doctor",
      "doctor visit",
      "consult doctor",
      "red flags",
      "warning signs",
      "see a gynecologist",
      "clinic visit",
      "डॉक्टर को कब दिखाएं",
    ],
    defaultAnswer:
      "You should see a doctor if: you miss 3 or more periods in a row; periods come more often than 21 days; bleeding is very heavy or lasts over 7 days; you have severe pelvic pain; you bleed after menopause; or you notice unusual foul-smelling discharge or fever.",
    action: {
      labelKey: "chat.actions.findCare",
      defaultLabel: "Find care near me",
      to: "/care",
    },
  },

  // 10. How to log symptoms
  {
    id: "how_to_log",
    keywordsKey: "chat.kb.howToLog.keywords",
    answerKey: "chat.kb.howToLog.answer",
    defaultKeywords: [
      "how do i log my symptoms",
      "how to log",
      "symptom log",
      "tracking symptoms",
      "daily check in",
      "log period",
      "log pain",
      "logging",
      "लक्षण कैसे दर्ज करें",
    ],
    defaultAnswer:
      "To log your symptoms, tap 'Log' in the bottom menu. Select your flow level (spotting, light, medium, heavy), pain score, any physical symptoms like cramps or headache, mood, sleep hours, and medicines taken. Tap 'Save check-in' to record your day.",
    action: {
      labelKey: "chat.actions.logSymptoms",
      defaultLabel: "Open my symptom log",
      to: "/log",
    },
  },

  // 11. How reminders work
  {
    id: "how_reminders",
    keywordsKey: "chat.kb.howReminders.keywords",
    answerKey: "chat.kb.howReminders.answer",
    defaultKeywords: [
      "how reminders work",
      "medicine reminders",
      "pill reminder",
      "dose alert",
      "reminder",
      "set reminder",
      "reminder notifications",
      "दवा रिमाइंडर",
    ],
    defaultAnswer:
      "You can set daily medicine reminders in the 'Medicines' tab. Add your medicine name, dose, and choose morning, afternoon, evening, or night. Sakhi displays timely reminder banners on your dashboard and tracks doses you take.",
    action: {
      labelKey: "chat.actions.medicines",
      defaultLabel: "Medicines",
      to: "/medicines",
    },
  },

  // 12. Find hospitals
  {
    id: "find_hospitals",
    keywordsKey: "chat.kb.findHospitals.keywords",
    answerKey: "chat.kb.findHospitals.answer",
    defaultKeywords: [
      "find a hospital near me",
      "find hospital",
      "clinic near me",
      "nearest doctor",
      "health facility",
      "phc",
      "chc",
      "government hospital",
      "medical care",
      "पास का अस्पताल",
      "अस्पताल कहाँ है",
    ],
    defaultAnswer:
      "Tap 'Care' in the bottom menu to view verified government hospitals, community health centres (CHCs), primary health centres (PHCs), and clinics near you. You can enable GPS to sort by distance, view phone numbers, and get directions.",
    action: {
      labelKey: "chat.actions.findCare",
      defaultLabel: "Find care near me",
      to: "/care",
    },
  },

  // 13. Government schemes
  {
    id: "govt_schemes",
    keywordsKey: "chat.kb.govtSchemes.keywords",
    answerKey: "chat.kb.govtSchemes.answer",
    defaultKeywords: [
      "what government schemes can i get",
      "government schemes",
      "pmjay",
      "ayushman bharat",
      "arogya mandir",
      "jsy",
      "pmmvy",
      "maternity benefits",
      "free hospital",
      "cash support",
      "सरकारी योजनाएं",
      "सरकारी योजना",
    ],
    defaultAnswer:
      "Government health schemes offer financial support and free care: PM-JAY provides up to ₹5 lakh free hospital care for eligible families; Ayushman Arogya Mandirs offer free check-ups and cancer screenings; and JSY / PMMVY provide cash assistance for pregnancy and delivery.",
    action: {
      labelKey: "chat.actions.schemes",
      defaultLabel: "Government schemes",
      to: "/schemes",
    },
  },

  // 14. Share records with doctor
  {
    id: "share_records",
    keywordsKey: "chat.kb.shareRecords.keywords",
    answerKey: "chat.kb.shareRecords.answer",
    defaultKeywords: [
      "how do i share my records with my doctor",
      "share records",
      "doctor summary",
      "print summary",
      "show doctor",
      "share with doctor",
      "medical report",
      "records for doctor",
      "डॉक्टर को दिखाना",
      "डॉक्टर सारांश",
    ],
    defaultAnswer:
      "You can create a clear, one-page printable Doctor Summary by visiting 'Doctor visit' and selecting the 'Doctor summary' tab. It organizes your last 90 days of symptoms, cycle history, and logged questions into a format doctors can review in 2 minutes.",
    action: {
      labelKey: "chat.actions.doctorVisit",
      defaultLabel: "Doctor visit",
      to: "/visit",
    },
  },

  // 15. Privacy and Vault
  {
    id: "privacy_vault",
    keywordsKey: "chat.kb.privacyVault.keywords",
    answerKey: "chat.kb.privacyVault.answer",
    defaultKeywords: [
      "is my data private",
      "privacy",
      "vault",
      "pin",
      "confidential",
      "data safety",
      "secure",
      "who sees my data",
      "गोपनीयता",
      "डेटा सुरक्षा",
    ],
    defaultAnswer:
      "All your personal health logs, cycle dates, and notes are saved strictly on your own device and are never sent to external servers without your permission. You can also lock your sensitive notes with a private 4-digit PIN in the Vault under Settings.",
    action: {
      labelKey: "chat.actions.vault",
      defaultLabel: "Open private vault",
      to: "/vault",
    },
  },

  // 16. Missed Dose
  {
    id: "missed_dose",
    keywordsKey: "chat.kb.missedDose.keywords",
    answerKey: "chat.kb.missedDose.answer",
    defaultKeywords: [
      "missed medicine",
      "missed dose",
      "missed my medicine",
      "missed my dose",
      "forgot medicine",
      "forgot my medicine",
      "forgot dose",
      "skipped pill",
      "miss medicine",
      "what if i forget tablet",
      "missed tablet",
      "दवा भूल गए",
      "गोली छूट गई",
    ],
    defaultAnswer:
      "If you forget a dose of your regular medicine, take it as soon as you remember, unless it is almost time for your next scheduled dose. Never take a double dose to make up for a missed one. If you are unsure, consult your doctor or pharmacist.",
    action: {
      labelKey: "chat.actions.medicines",
      defaultLabel: "Medicines",
      to: "/medicines",
    },
  },
];
