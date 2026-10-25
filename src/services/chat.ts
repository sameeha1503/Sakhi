// Chat service for Ask Sakhi assistant.
// Implements:
// - Step 1: Local Safety Layer (emergencies, distress, refused topics) with ZERO AI call.
// - Step 2: Live AI Streaming via /api/chat with token-by-token updates and Stop control.
// - Step 3: Offline Knowledge Base fallback on 401, 429, timeout (20s), daily budget, or network failure.
// - Output Guard: replaces medicine dosing patterns in generated text.
// - Chat history persistence via the storage service (wiped on "Delete all my data").

import i18n from "i18next";
import { loadLanguageResources } from "@/i18n";
import { storage } from "./storage";
import { KNOWLEDGE_INTENTS, type KnowledgeIntent } from "@/data/knowledge";
import { checkSafetyLayer, applyDosageGuard, normalizeSafetyText } from "./safety";

export type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  source?: "kb" | "llm" | "safety" | undefined;
  isBusy?: boolean | undefined;
  actions?: Array<{ label: string; to: string }> | undefined;
};

export type AskSakhiResponse = {
  text: string;
  source: "kb" | "llm" | "safety";
  isBusy?: boolean | undefined;
  actions?: Array<{ label: string; to: string }> | undefined;
};

export type StreamCallbacks = {
  onStart?: () => void;
  onToken?: (token: string, accumulated: string) => void;
  onDone?: (fullText: string, source: "llm" | "kb" | "safety", isBusy?: boolean) => void;
  onError?: (error: Error) => void;
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
  return normalizeSafetyText(text);
}

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

  // Safety layer check inside KB fallback as well
  const safety = checkSafetyLayer(query, lang);
  if (safety) {
    return {
      text: safety.text,
      source: "safety",
      actions: safety.actions,
    };
  }

  const paddedQuery = ` ${normQuery} `;

  let bestMatch: { intent: KnowledgeIntent; score: number } | null = null;

  // Search through all intents and pick the one with highest specificity score
  for (const intent of KNOWLEDGE_INTENTS) {
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

      if (paddedQuery.includes(paddedKw)) {
        const score = normKw.length * 2;
        if (score > intentMaxScore) intentMaxScore = score;
      } else if (normQuery.includes(normKw)) {
        const score = normKw.length;
        if (score > intentMaxScore) intentMaxScore = score;
      } else if (normQuery.length >= 4 && normKw.includes(normQuery)) {
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
 * Streams Ask Sakhi replies token-by-token.
 * Order of execution:
 * 1. Local Safety Layer checks (emergencies, distress, refused topics) -> instant response, NO AI call.
 * 2. Real AI Assistant streaming via /api/chat.
 * 3. Fallback to offline Knowledge Base on 401, 429, timeout (20s), daily budget, or network drop.
 */
export async function askSakhiStream(
  messages: Array<{ sender: "user" | "assistant"; text: string }>,
  lang: string,
  callbacks: StreamCallbacks,
  options?: { signal?: AbortSignal; isSuggestionChip?: boolean },
): Promise<void> {
  if (lang && lang !== "en") {
    await loadLanguageResources(lang);
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.sender === "user")?.text || "";

  // 1. ORDER OF HANDLING: Local safety layer FIRST with NO AI call
  const safetyMatch = checkSafetyLayer(lastUserMessage, lang);
  if (safetyMatch) {
    callbacks.onStart?.();
    callbacks.onToken?.(safetyMatch.text, safetyMatch.text);
    callbacks.onDone?.(safetyMatch.text, "safety");
    return;
  }

  // 2. Call server /api/chat with streaming
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text.slice(0, 500),
          })),
          lang,
          isSuggestionChip: Boolean(options?.isSuggestionChip),
        }),
        ...(options?.signal ? { signal: options.signal } : {}),
      });

      const contentType = res.headers.get("content-type") ?? "";

      // If streaming response (text/event-stream)
      if (res.ok && contentType.includes("text/event-stream") && res.body) {
        callbacks.onStart?.();
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;

            if (trimmed === "data: [DONE]") {
              const guarded = applyDosageGuard(accumulated);
              callbacks.onDone?.(guarded, "llm");
              return;
            }

            if (trimmed.startsWith("data:")) {
              try {
                const parsed = JSON.parse(trimmed.slice(5).trim()) as { token?: string };
                if (parsed.token) {
                  accumulated += parsed.token;
                  callbacks.onToken?.(parsed.token, accumulated);
                }
              } catch {
                // Ignore malformed SSE lines
              }
            }
          }
        }

        const guarded = applyDosageGuard(accumulated);
        callbacks.onDone?.(guarded, "llm");
        return;
      }

      // If non-streaming response (e.g. rate-limited 429, daily budget reached, 401 auth, or error JSON)
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        fallback?: boolean;
        message?: string;
      } | null;

      const isBusy = res.status === 429 || data?.error === "busy";
      const fallbackResp = matchKnowledgeBase(lastUserMessage, lang);

      callbacks.onStart?.();
      callbacks.onToken?.(fallbackResp.text, fallbackResp.text);
      callbacks.onDone?.(fallbackResp.text, "kb", isBusy);
      return;
    } catch (err: unknown) {
      if (options?.signal?.aborted) {
        // User deliberately clicked Stop
        return;
      }
      // On network failure or timeout, fall back to offline Knowledge Base
      console.warn("[chat-service] AI assistant failed, falling back to offline KB:", err);
    }
  }

  // 3. Fallback to offline Knowledge Base
  const fallbackResp = matchKnowledgeBase(lastUserMessage, lang);
  callbacks.onStart?.();
  callbacks.onToken?.(fallbackResp.text, fallbackResp.text);
  callbacks.onDone?.(fallbackResp.text, "kb", false);
}

/**
 * Promise-based askSakhi function (useful for synchronous workflows & backwards compatibility).
 */
export async function askSakhi(
  messages: Array<{ sender: "user" | "assistant"; text: string }>,
  lang: string,
): Promise<AskSakhiResponse> {
  return new Promise((resolve) => {
    let finalSource: "llm" | "kb" | "safety" = "kb";
    let finalText = "";
    let isBusyResult = false;

    askSakhiStream(messages, lang, {
      onToken: (_token, accumulated) => {
        finalText = accumulated;
      },
      onDone: (text, source, isBusy) => {
        finalText = text;
        finalSource = source;
        isBusyResult = Boolean(isBusy);

        const actions =
          source === "safety"
            ? checkSafetyLayer(
                [...messages].reverse().find((m) => m.sender === "user")?.text || "",
                lang,
              )?.actions
            : source === "kb"
              ? matchKnowledgeBase(
                  [...messages].reverse().find((m) => m.sender === "user")?.text || "",
                  lang,
                ).actions
              : undefined;

        resolve({
          text: finalText,
          source: finalSource,
          isBusy: isBusyResult,
          actions,
        });
      },
      onError: () => {
        const fallback = matchKnowledgeBase(
          [...messages].reverse().find((m) => m.sender === "user")?.text || "",
          lang,
        );
        resolve(fallback);
      },
    });
  });
}
