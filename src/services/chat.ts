// Chat service for Ask Sakhi assistant.
// Implements:
// - Mode 1 (Knowledge Base): Offline, privacy-first intent matching covering women's health topics.
// - Mode 2 (Optional AI): Calls /api/chat if LLM is configured on the server, falling back to Mode 1 on any error.
// - Multilingual normalisation and robust substring matching (avoiding \b/\w which break on Indian scripts).
// - Chat history persistence via the storage service (cleared on "Delete all my data").

import i18n from "i18next";
import { loadLanguageResources } from "@/i18n";
import { storage } from "./storage";
import { KNOWLEDGE_INTENTS, type KnowledgeIntent } from "@/data/knowledge";

export type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  source?: "kb" | "llm" | undefined;
  actions?: Array<{ label: string; to: string }> | undefined;
};

export type AskSakhiResponse = {
  text: string;
  source: "kb" | "llm";
  actions?: Array<{ label: string; to: string }> | undefined;
};

const CHAT_STORAGE_KEY = "chat_history";

export const chatStorage = {
  getHistory(): ChatMessage[] {
    return storage.get<ChatMessage[]>(CHAT_STORAGE_KEY, []);
  },

  saveHistory(messages: ChatMessage[]): void {
    storage.set(CHAT_STORAGE_KEY, messages);
  },

  clearHistory(): void {
    storage.remove(CHAT_STORAGE_KEY);
  },
};

/**
 * Normalise all input and keywords with Unicode NFC, lowercase,
 * remove zero-width joiners/non-joiners, and collapse spaces and punctuation.
 * Critical: Does NOT use \w or \b which break on Indian scripts.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return (
    text
      .normalize("NFC")
      .toLowerCase()
      // Remove zero-width non-joiner (\u200C), zero-width joiner (\u200D), zero-width space (\u200B), BOM (\uFEFF), soft hyphen (\u00AD)
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
      // Remove punctuation including Indian dandas (। and ॥)
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>।॥[\]\\|]/g, " ")
      // Collapse multiple whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

const EMERGENCY_KEYWORDS = [
  "108",
  "emergency",
  "ambulance",
  "chest pain",
  "unconscious",
  "heavy blood loss",
  "fainted",
  "poison",
  "behoshi",
  "saans nahi",
  "bahut jyada khoon",
  "bleeding heavily",
];

/**
 * Match user query against the offline curated Knowledge Base.
 */
export function matchKnowledgeBase(query: string, lang: string): AskSakhiResponse {
  const normQuery = normalizeText(query);

  if (!normQuery) {
    return {
      text: i18n.t("chat.greeting", {
        lng: lang,
        defaultValue:
          "Hello! I am Sakhi, your health companion. Tap a question below or type your own question.",
      }),
      source: "kb",
    };
  }

  const paddedQuery = ` ${normQuery} `;

  // Emergency safety check (using padded matching to avoid sub-word false positives)
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => {
    const normKw = normalizeText(kw);
    return paddedQuery.includes(` ${normKw} `) || normQuery.includes(normKw);
  });

  if (isEmergency) {
    return {
      text: i18n.t("chat.emergencyNotice", {
        lng: lang,
        defaultValue:
          "If you have severe pain, heavy bleeding, or difficulty breathing, please go to the nearest hospital or call 108 immediately.",
      }),
      source: "kb",
      actions: [
        {
          label: i18n.t("urgent.btnHospital", {
            lng: lang,
            defaultValue: "Go to a hospital now",
          }),
          to: "/urgent",
        },
      ],
    };
  }

  let bestMatch: { intent: KnowledgeIntent; score: number } | null = null;

  // Search through all intents and pick the one with highest specificity score
  for (const intent of KNOWLEDGE_INTENTS) {
    // Gather keywords from current language bundle + defaults
    const rawLocaleKeywords = i18n.t(intent.keywordsKey, {
      lng: lang,
      defaultValue: "",
    });

    const candidateKeywords = [
      ...rawLocaleKeywords.split(",").map((k) => k.trim()),
      ...intent.defaultKeywords,
    ].filter(Boolean);

    let intentMaxScore = 0;

    for (const kw of candidateKeywords) {
      const normKw = normalizeText(kw);
      if (!normKw) continue;

      const paddedKw = ` ${normKw} `;

      // Check whole-word / phrase match
      if (paddedQuery.includes(paddedKw)) {
        // Boosted score by phrase length
        const score = normKw.length * 2;
        if (score > intentMaxScore) intentMaxScore = score;
      } else if (normQuery.includes(normKw)) {
        // Substring match
        const score = normKw.length;
        if (score > intentMaxScore) intentMaxScore = score;
      } else if (normQuery.length >= 4 && normKw.includes(normQuery)) {
        // User typed a substring of a keyword
        const score = normQuery.length;
        if (score > intentMaxScore) intentMaxScore = score;
      }
    }

    if (intentMaxScore > 0 && (!bestMatch || intentMaxScore > bestMatch.score)) {
      bestMatch = { intent, score: intentMaxScore };
    }
  }

  if (bestMatch) {
    const { intent } = bestMatch;
    const answer = i18n.t(intent.answerKey, {
      lng: lang,
      defaultValue: intent.defaultAnswer,
    });

    const actions = intent.action
      ? [
          {
            label: i18n.t(intent.action.labelKey, {
              lng: lang,
              defaultValue: intent.action.defaultLabel,
            }),
            to: intent.action.to,
          },
        ]
      : undefined;

    return {
      text: answer,
      source: "kb",
      actions,
    };
  }

  // Fallback response when no intent matches
  return {
    text: i18n.t("chat.fallback", {
      lng: lang,
      defaultValue:
        "I don't have information on that yet. For medical symptoms or questions, please consult a doctor or healthcare worker at your nearest clinic.",
    }),
    source: "kb",
    actions: [
      {
        label: i18n.t("chat.actions.findCare", {
          lng: lang,
          defaultValue: "Find care near me",
        }),
        to: "/care",
      },
      {
        label: i18n.t("chat.actions.doctorVisit", {
          lng: lang,
          defaultValue: "Doctor visit",
        }),
        to: "/visit",
      },
    ],
  };
}

/**
 * Main export: askSakhi(messages, lang) returning { text, source: "kb" | "llm", actions?: [...] }
 * Preserves signature so providers can be swapped.
 */
export async function askSakhi(
  messages: Array<{ sender: "user" | "assistant"; text: string }>,
  lang: string,
): Promise<AskSakhiResponse> {
  // Ensure locale resources for the chosen language are loaded
  if (lang && lang !== "en") {
    await loadLanguageResources(lang);
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.sender === "user")?.text || "";

  // Attempt Mode 2 (Server LLM API) if in browser
  if (typeof window !== "undefined") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.slice(-6),
          lang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as {
          text?: string;
          source?: "kb" | "llm";
          fallback?: boolean;
          actions?: Array<{ label: string; to: string }>;
        };

        if (data.text && !data.fallback) {
          return {
            text: data.text,
            source: data.source || "llm",
            actions: data.actions,
          };
        }
      }
    } catch {
      // Network failure, timeout, or rate-limited: silently fall back to Mode 1
    }
  }

  // Mode 1: Knowledge Base fallback
  return matchKnowledgeBase(lastUserMessage, lang);
}
