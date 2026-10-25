// Local safety layer for Ask Sakhi assistant.
// Implements:
// - Universal emergency detection (108, ambulance, severe conditions)
// - Emotional distress & crisis intervention (Tele-MANAS 14416, emergency 112)
// - Refused medical topics (specific dosages, diagnostic judgements, home abortion/contraception instructions)
// - Output guard replacing medicine dosing patterns
// - Multi-lingual coverage across all 11 Indic languages (native and romanised)
// - Unicode NFC normalisation and space-padded whole-phrase matching (avoiding \\b/\\w)

import i18n from "i18next";

export const EMERGENCY_NUMBERS = {
  AMBULANCE_108: "108",
  TELE_MANAS: "14416",
  EMERGENCY_112: "112",
} as const;

export type SafetyAction = {
  label: string;
  to: string;
};

export type SafetyResult = {
  text: string;
  source: "safety";
  actions: SafetyAction[];
};

/**
 * Normalise text with Unicode NFC, lowercase, remove zero-width characters,
 * collapse punctuation and normalize spacing. Safe for Indian scripts.
 */
export function normalizeSafetyText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>।॥[\]\\|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 1. Emergency phrases across English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia
export const EMERGENCY_PHRASES: string[] = [
  // Numbers & universal
  "108",
  "ambulance",
  "emergency",
  "severe chest pain",
  "chest pain",
  "unconscious",
  "fainted",
  "bleeding heavily",
  "heavy blood loss",
  "bleeding nonstop",
  "cannot breathe",
  "difficulty breathing",
  "poison",
  // Hindi & Romanised
  "108 bulao",
  "behoshi",
  "behosh",
  "saans nahi aa rahi",
  "saans lene me takleef",
  "bahut jyada khoon",
  "khoon beh raha hai",
  "zehar",
  "chhati me tez dard",
  "आपातकाल",
  "एम्बुलेंस",
  "बेहोश",
  "बेहोशी",
  "सांस नहीं आ रही",
  "बहुत ज्यादा खून",
  "छाती में दर्द",
  "ज़हर",
  // Telugu & Romanised
  "aapathkaalam",
  "spriha lekapovadam",
  "oopiri aadatledu",
  "ekkuva rakthasravam",
  "gunde noppi",
  "ఆపత్కాలం",
  "అంబులెన్స్",
  "స్పృహ తప్పడం",
  "ఊపిరి ఆడట్లేదు",
  "రక్తస్రావం",
  "గుండె నొప్పి",
  "విషం",
  // Tamil & Romanised
  "avacharam",
  "marbhu vali",
  "moochu thinaral",
  "athika rathapokku",
  "மயக்கம்",
  "மாரடைப்பு",
  "மூச்சுத் திணறல்",
  "அதிக ரத்தப்போக்கு",
  "அவசரம்",
  // Kannada
  "ತುರ್ತು",
  "ಉಸಿರಾಟದ ತೊಂದರೆ",
  "ಎದೆ ನೋವು",
  "ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ",
  "ವಿಷ",
  // Malayalam
  "അടിയന്തരം",
  "ശ്വാസതടസ്സം",
  "നെഞ്ചുവേദന",
  "ബോധക്ഷയം",
  // Marathi
  "आपत्कालीन",
  "श्वास घेण्यास त्रास",
  "छातीत तीव्र वेदना",
  "रक्तस्त्राव",
  "विष",
  // Bengali
  "জরুরি",
  "শ্বাসকষ্ট",
  "বুকে ব্যথা",
  "অজ্ঞান",
  "অতিরিক্ত রক্তক্ষরণ",
  "বিষ",
  // Gujarati
  "કટોકટી",
  "શ્વાસ લેવામાં તકલીફ",
  "છાતીમાં દુખાવો",
  "બેભાન",
  "ઝેર",
  // Punjabi
  "ਐਮਰਜੈਂਸੀ",
  "ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼",
  "ਛਾਤੀ ਵਿੱਚ ਦਰਦ",
  "ਬੇਹੋਸ਼",
  "ਜ਼ਹਿਰ",
  // Odia
  "ଜରୁରୀକାଳୀନ",
  "ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ",
  "ଛାତିରେ ଯନ୍ତ୍ରଣା",
  "ଅଚେତ",
  "ବିଷ",
];

// 2. Distress & crisis phrases (Tele-MANAS 14416 and emergency 112)
export const DISTRESS_PHRASES: string[] = [
  // English
  "suicide",
  "kill myself",
  "want to die",
  "end my life",
  "harm myself",
  "self harm",
  "feel like dying",
  "don't want to live",
  "no reason to live",
  // Hindi & Romanised
  "aatmahatya",
  "mar jana chahti hoon",
  "mar jana chahta hoon",
  "jaan dena chahti hoon",
  "khudkhushi",
  "jina nahi chahti",
  "आत्महत्या",
  "मर जाना चाहती हूँ",
  "खुदकुशी",
  "जीना नहीं चाहती",
  // Telugu & Romanised
  "chachi povalani undi",
  "aathmahathya",
  "pranam theesukovalani undi",
  "ఆత్మహత్య",
  "చచ్చిపోవాలని ఉంది",
  "ప్రాణం తీసుకోవాలని ఉంది",
  // Tamil
  "தற்கொலை",
  "சாக வேண்டும் போல ఉంది",
  // Kannada
  "ಆತ್ಮಹತ್ಯೆ",
  "ಸಾಯಬೇಕು ಅನಿಸುತ್ತಿದೆ",
  // Malayalam
  "ആത്മഹത്യ",
  "മരിക്കണം എന്ന് തോന്നുന്നു",
  // Marathi
  "आत्महत्या",
  "मरावेसे वाटते",
  // Bengali
  "আত্মহত্যা",
  "মরতে ইচ্ছে করছে",
  // Gujarati
  "આત્મહત્યા",
  "મરી જવું છે",
  // Punjabi
  "ਆਤਮ ਹੱਤਿਆ",
  "ਮਰਨਾ ਚਾਹੁੰਦੀ ਹਾਂ",
  // Odia
  "ଆତ୍ମହତ୍ୟା",
  "ମରିବାକୁ ଇଚ୍ଛା ହେଉଛି",
];

// 3. Refused medical topics (specific dosages, home abortion, medical diagnosis)
export const REFUSED_TOPICS_PHRASES: string[] = [
  // Medicine dosing requests
  "how much paracetamol",
  "how many tablets should i take",
  "how many pills to take",
  "what dose of",
  "what dosage of",
  "how many mg of",
  "how many ml of",
  "kitni goli khaye",
  "kitni goli khani chahiye",
  "kitna dose lena chahiye",
  "enna dose edukalam",
  "enni tablets vesukovali",
  "dosage instructions",
  "दवा की खुराक कितनी",
  "कितनी गोली खानी चाहिए",
  "ఎన్ని మాత్రలు వేసుకోవాలి",
  "எத்தனை மாத்திரை சாப்பிட வேண்டும்",
  // Diagnosis requests
  "diagnose me",
  "do i have cancer",
  "tell me if i have cancer",
  "kya mujhe cancer hai",
  "diagnose my disease",
  "what disease do i have",
  "diagnose my condition",
  "क्या मुझे कैंसर है",
  "నాకు క్యాన్సర్ ఉందా",
  // Abortion / pregnancy termination instructions
  "how to abort at home",
  "abortion at home",
  "how to do abortion",
  "home abortion remedies",
  "abortion pills instructions",
  "garbhavat kaise kare",
  "garbhpata kaise kare",
  "how to terminate pregnancy at home",
  "pill for abortion without doctor",
  "घर पर गर्भपात कैसे करें",
  "गर्भपात की गोली कैसे लें",
  "గర్భస్రావం ఇంట్లోనే ఎలా చేసుకోవాలి",
  "வீட்டில் கருக்கலைப்பு செய்வது எப்படி",
  // Contraception prescribing / unguided instructions
  "which contraceptive pill should i take without doctor",
  "emergency contraceptive pill dose instructions",
  "how to take morning after pill without doctor",
];

export const SAFETY_PHRASE_LISTS = {
  emergency: EMERGENCY_PHRASES,
  distress: DISTRESS_PHRASES,
  refused: REFUSED_TOPICS_PHRASES,
};

/**
 * Checks if the user query contains phrases from a list using space-padded,
 * Unicode-normalised substring matching (safe for Indian languages and English).
 */
function matchesPhrases(normQuery: string, phrases: string[]): boolean {
  const paddedQuery = ` ${normQuery} `;
  for (const phrase of phrases) {
    const normPhrase = normalizeSafetyText(phrase);
    if (!normPhrase) continue;
    const paddedPhrase = ` ${normPhrase} `;
    if (paddedQuery.includes(paddedPhrase) || normQuery.includes(normPhrase)) {
      return true;
    }
  }
  return false;
}

/**
 * Executes the local safety layer.
 * Returns a SafetyResult if matched (blocking any AI call), or null if safe to proceed to AI.
 */
export function checkSafetyLayer(query: string, lang: string): SafetyResult | null {
  const normQuery = normalizeSafetyText(query);
  if (!normQuery) return null;

  // 1. Emergency Safety Check
  if (matchesPhrases(normQuery, EMERGENCY_PHRASES)) {
    return {
      text: i18n.t("chat.emergencyNotice", {
        lng: lang,
        defaultValue:
          "If you have severe pain, heavy bleeding, or difficulty breathing, please go to the nearest hospital or call 108 immediately.",
      }),
      source: "safety",
      actions: [
        {
          label: i18n.t("chat.actions.call108", { lng: lang, defaultValue: "Call 108" }),
          to: "tel:108",
        },
        {
          label: i18n.t("urgent.btnHospital", { lng: lang, defaultValue: "Go to a hospital now" }),
          to: "/urgent",
        },
      ],
    };
  }

  // 2. Emotional Distress Check
  if (matchesPhrases(normQuery, DISTRESS_PHRASES)) {
    return {
      text: i18n.t("chat.distressNotice", {
        lng: lang,
        defaultValue:
          "You are not alone. Please reach out to caring counselors at Tele-MANAS (14416) or emergency services (112) for free, confidential emotional support anytime.",
      }),
      source: "safety",
      actions: [
        {
          label: i18n.t("chat.actions.telemanas", {
            lng: lang,
            defaultValue: "Call Tele-MANAS 14416",
          }),
          to: "tel:14416",
        },
        {
          label: i18n.t("chat.actions.emergency112", {
            lng: lang,
            defaultValue: "Call 112",
          }),
          to: "tel:112",
        },
      ],
    };
  }

  // 3. Refused Topics Check (dosage, diagnosis, abortion)
  if (matchesPhrases(normQuery, REFUSED_TOPICS_PHRASES)) {
    return {
      text: i18n.t("chat.refusedMedicalNotice", {
        lng: lang,
        defaultValue:
          "Sakhi cannot provide medicine dosages, medical diagnoses, or instructions for abortion or contraception. Please consult a doctor or licensed pharmacist for your safety.",
      }),
      source: "safety",
      actions: [
        {
          label: i18n.t("chat.actions.doctorVisit", {
            lng: lang,
            defaultValue: "Doctor visit",
          }),
          to: "/visit",
        },
        {
          label: i18n.t("chat.actions.findCare", {
            lng: lang,
            defaultValue: "Find care near me",
          }),
          to: "/care",
        },
      ],
    };
  }

  return null;
}

/**
 * Output guard: replaces medicine dosing patterns in model outputs
 * (numbers followed by mg, ml, tablets, capsules, etc.) with a safe clinical disclaimer.
 */
export function applyDosageGuard(
  text: string,
  replacement = "Please ask your doctor or pharmacist about medicines and doses.",
): string {
  if (!text) return text;
  // Match numbers (e.g. 500, 10.5) followed by dosage units: mg, ml, mcg, tablets, capsules, pills, drops, goli, goliyan
  const dosageRegex =
    /\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|tablets?|capsules?|drops?|pills?|goli(?:yan)?|chammach)\b/gi;
  return text.replace(dosageRegex, replacement);
}
