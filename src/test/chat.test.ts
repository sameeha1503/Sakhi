import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeText,
  matchKnowledgeBase,
  askSakhi,
  askSakhiStream,
  chatStorage,
  type ChatMessage,
} from "../services/chat";
import {
  checkSafetyLayer,
  applyDosageGuard,
  EMERGENCY_NUMBERS,
  SAFETY_PHRASE_LISTS,
} from "../services/safety";
import {
  buildSystemPrompt,
  getDailyBudgetStatus,
  incrementDailyBudget,
  resetDailyBudgetForTests,
  setCachedReply,
  getCachedReply,
  clearSuggestionCacheForTests,
  isRateLimited,
  isReasoningModel,
} from "../routes/api.chat";
import { storage } from "../services/storage";
import { loadLanguageResources } from "../i18n";

describe("Ask Sakhi Chat Service & AI Architecture", () => {
  beforeEach(async () => {
    localStorage.clear();
    await storage.clearAll();
    await loadLanguageResources("hi");
    await loadLanguageResources("te");
    clearSuggestionCacheForTests();
    resetDailyBudgetForTests(0);
    vi.restoreAllMocks();
  });

  describe("Safety Phrase Lists Integrity", () => {
    it("ensures emergency, distress, and refused phrase lists are strictly non-empty", () => {
      expect(SAFETY_PHRASE_LISTS.emergency.length).toBeGreaterThan(15);
      expect(SAFETY_PHRASE_LISTS.distress.length).toBeGreaterThan(10);
      expect(SAFETY_PHRASE_LISTS.refused.length).toBeGreaterThan(10);
    });

    it("verifies emergency numbers constants", () => {
      expect(EMERGENCY_NUMBERS.AMBULANCE_108).toBe("108");
      expect(EMERGENCY_NUMBERS.TELE_MANAS).toBe("14416");
      expect(EMERGENCY_NUMBERS.EMERGENCY_112).toBe("112");
    });
  });

  describe("Reasoning vs Fast Non-Reasoning Models Detection", () => {
    it("correctly identifies reasoning models", () => {
      expect(isReasoningModel("openai/gpt-oss-120b")).toBe(true);
      expect(isReasoningModel("openai/gpt-oss-20b")).toBe(true);
      expect(isReasoningModel("deepseek-r1-distill-llama-70b")).toBe(true);
      expect(isReasoningModel("o1-mini")).toBe(true);
      expect(isReasoningModel("o3-mini")).toBe(true);
    });

    it("correctly identifies fast non-reasoning chat models", () => {
      expect(isReasoningModel("llama-3.3-70b-versatile")).toBe(false);
      expect(isReasoningModel("llama-3.1-8b-instant")).toBe(false);
      expect(isReasoningModel("mixtral-8x7b-32768")).toBe(false);
      expect(isReasoningModel("gpt-4o-mini")).toBe(false);
    });
  });

  describe("Text Normalisation (normalizeText)", () => {
    it("converts to lowercase and collapses whitespace", () => {
      expect(normalizeText("  What   IS  PCOS?  ")).toBe("what is pcos");
    });

    it("removes zero-width characters (ZWJ, ZWNJ, BOM, soft hyphen)", () => {
      const input = "పీ\u200Cసి\u200Dఒ\uFEFFఎస్";
      const normalized = normalizeText(input);
      expect(normalized).not.toContain("\u200C");
      expect(normalized).not.toContain("\u200D");
      expect(normalized).not.toContain("\uFEFF");
    });

    it("removes standard punctuation and Indian dandas (। and ॥)", () => {
      expect(normalizeText("माहवारी में तेज दर्द। क्या यह सामान्य है?")).toBe(
        "माहवारी में तेज दर्द क्या यह सामान्य है",
      );
      expect(normalizeText("PCOS: cysts, acne, & irregular flow!")).toBe(
        "pcos cysts acne irregular flow",
      );
    });
  });

  describe("Local Safety Layer (Executes BEFORE Any AI Call)", () => {
    it("intercepts emergency query in English without calling AI", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const res = checkSafetyLayer("I have severe chest pain and cannot breathe", "en");
      expect(res).not.toBeNull();
      expect(res?.source).toBe("safety");
      expect(res?.actions.some((a) => a.to === "tel:108")).toBe(true);
      expect(res?.actions.some((a) => a.to === "/urgent")).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("intercepts emergency query in Hindi & Telugu (native & romanised)", () => {
      const hiRes = checkSafetyLayer("108 bulao bahut jyada khoon beh raha hai", "hi");
      expect(hiRes?.source).toBe("safety");

      const teRes = checkSafetyLayer("గుండె నొప్పి మరియు ఊపిరి ఆడట్లేదు", "te");
      expect(teRes?.source).toBe("safety");
      expect(teRes?.actions.some((a) => a.to === "tel:108")).toBe(true);
    });

    it("intercepts suicidal distress and provides Tele-MANAS 14416 & 112", () => {
      const enRes = checkSafetyLayer("I feel like dying, I want to end my life", "en");
      expect(enRes?.source).toBe("safety");
      expect(enRes?.actions.some((a) => a.to === "tel:14416")).toBe(true);
      expect(enRes?.actions.some((a) => a.to === "tel:112")).toBe(true);

      const hiRes = checkSafetyLayer("mujhe aatmahatya karne ka man kar raha hai", "hi");
      expect(hiRes?.source).toBe("safety");
      expect(hiRes?.actions.some((a) => a.to === "tel:14416")).toBe(true);
    });

    it("refuses specific medicine dosage requests and guides to doctor/pharmacist", () => {
      const res = checkSafetyLayer("How much paracetamol should I take for fever?", "en");
      expect(res?.source).toBe("safety");
      expect(res?.text.toLowerCase()).toContain("cannot provide medicine dosages");
      expect(res?.actions.some((a) => a.to === "/visit")).toBe(true);

      const hiRes = checkSafetyLayer("kitni goli khani chahiye", "hi");
      expect(hiRes?.source).toBe("safety");
    });

    it("refuses home abortion requests and diagnosis requests", () => {
      const abortRes = checkSafetyLayer("how to abort at home with pills", "en");
      expect(abortRes?.source).toBe("safety");

      const diagRes = checkSafetyLayer("tell me if I have cancer, diagnose me", "en");
      expect(diagRes?.source).toBe("safety");
    });

    it("confirms askSakhiStream skips fetch entirely on safety interception", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      let calledSource = "";
      await askSakhiStream([{ sender: "user", text: "call 108 emergency right now" }], "en", {
        onDone: (_text, source) => {
          calledSource = source;
        },
      });

      expect(calledSource).toBe("safety");
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Output Guard (applyDosageGuard)", () => {
    it("replaces medicine dosing text (mg, ml, tablets) with clinical disclaimer", () => {
      const input = "You should take 500mg of paracetamol or 10 ml of syrup.";
      const guarded = applyDosageGuard(input);
      expect(guarded).not.toContain("500mg");
      expect(guarded).not.toContain("10 ml");
      expect(guarded).toContain("Please ask your doctor or pharmacist about medicines and doses.");
    });

    it("replaces tablet and capsule counts with disclaimer", () => {
      const input = "Take 2 tablets after dinner and 1 capsule in the morning.";
      const guarded = applyDosageGuard(input);
      expect(guarded).not.toContain("2 tablets");
      expect(guarded).not.toContain("1 capsule");
      expect(guarded).toContain("Please ask your doctor or pharmacist about medicines and doses.");
    });

    it("leaves regular non-dosage numbers untouched", () => {
      const input = "A typical cycle lasts between 21 and 35 days with 2 to 7 days of flow.";
      const guarded = applyDosageGuard(input);
      expect(guarded).toBe(input);
    });
  });

  describe("System Prompt Generation", () => {
    it("generates system prompt containing language name and key clinical constraints", () => {
      const promptHi = buildSystemPrompt("hi");
      expect(promptHi).toContain("Hindi (हिन्दी)");
      expect(promptHi.toLowerCase()).toContain("never diagnose");
      expect(promptHi.toLowerCase()).toContain("never recommend or change medicine names or doses");
      expect(promptHi).toContain("108");
      expect(promptHi).toContain("120 words");

      const promptTe = buildSystemPrompt("te");
      expect(promptTe).toContain("Telugu (తెలుగు)");
    });
  });

  describe("Streaming AI Response via askSakhiStream", () => {
    it("streams tokens one-by-one from server SSE response", async () => {
      const chunks = [
        'data: {"token": "PCOS "}\n\n',
        'data: {"token": "is a common "}\n\n',
        'data: {"token": "hormonal condition."}\n\n',
        "data: [DONE]\n\n",
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/event-stream; charset=utf-8" }),
        body: stream,
      });

      const tokensReceived: string[] = [];
      let finalOutput = "";
      let finalSource = "";

      await askSakhiStream([{ sender: "user", text: "What causes irregular periods?" }], "en", {
        onToken: (tok) => tokensReceived.push(tok),
        onDone: (text, source) => {
          finalOutput = text;
          finalSource = source;
        },
      });

      expect(tokensReceived).toEqual(["PCOS ", "is a common ", "hormonal condition."]);
      expect(finalOutput).toBe("PCOS is a common hormonal condition.");
      expect(finalSource).toBe("llm");
    });

    it("verifies that NO personal health logs, medicines or location are sent to /api/chat", async () => {
      let sentPayload: unknown = null;
      global.fetch = vi.fn().mockImplementation((_url, init) => {
        sentPayload = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "text/event-stream" }),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              controller.close();
            },
          }),
        });
      });

      await askSakhiStream([{ sender: "user", text: "Tell me about diet for health" }], "en", {});

      const parsed = sentPayload as {
        messages: Array<{ sender: string; text: string }>;
        lang: string;
      };
      expect(parsed).toHaveProperty("messages");
      expect(parsed).toHaveProperty("lang");
      expect(parsed).not.toHaveProperty("location");
      expect(parsed).not.toHaveProperty("medicines");
      expect(parsed).not.toHaveProperty("logs");
      expect(parsed).not.toHaveProperty("userId");
    });
  });

  describe("Fallback Behavior on Upstream Failures", () => {
    it("falls back to Knowledge Base on 401 Unauthorized without crashing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ error: "auth_failed", fallback: true }),
      });

      let returnedSource = "";
      let returnedText = "";

      await askSakhiStream([{ sender: "user", text: "What is PCOS?" }], "en", {
        onDone: (text, source) => {
          returnedText = text;
          returnedSource = source;
        },
      });

      expect(returnedSource).toBe("kb");
      expect(returnedText.toLowerCase()).toContain("polycystic");
    });

    it("falls back on 429 Rate Limit / Busy with isBusy indicator", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ error: "busy", fallback: true }),
      });

      let returnedIsBusy = false;
      let returnedSource = "";

      await askSakhiStream([{ sender: "user", text: "What is PCOS?" }], "en", {
        onDone: (_text, source, isBusy) => {
          returnedSource = source;
          returnedIsBusy = Boolean(isBusy);
        },
      });

      expect(returnedSource).toBe("kb");
      expect(returnedIsBusy).toBe(true);
    });

    it("falls back on network timeout / failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      let returnedSource = "";
      await askSakhiStream([{ sender: "user", text: "What is PCOS?" }], "en", {
        onDone: (_text, source) => {
          returnedSource = source;
        },
      });

      expect(returnedSource).toBe("kb");
    });

    it("triggers fallback when first visible token exceeds 8 seconds", async () => {
      // Stream that never emits content tokens
      const neverEndingStream = new ReadableStream({
        start() {
          // Do nothing, never emit tokens
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: neverEndingStream,
      });

      vi.useFakeTimers();

      let returnedSource = "";
      const streamPromise = askSakhiStream([{ sender: "user", text: "What is PCOS?" }], "en", {
        onDone: (_text, source) => {
          returnedSource = source;
        },
      });

      // Advance clock past 8s first-token timeout
      await vi.advanceTimersByTimeAsync(8100);
      await streamPromise;

      expect(returnedSource).toBe("kb");
      vi.useRealTimers();
    });

    it("ignores reasoning-only chunks and falls back if no visible content arrives", async () => {
      const encoder = new TextEncoder();
      const reasoningStream = new ReadableStream({
        start(controller) {
          // Send reasoning-only chunk without delta.content
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { reasoning: "Thinking deeply about medicine..." } }] })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: reasoningStream,
      });

      const tokensReceived: string[] = [];
      let finalSource = "";

      await askSakhiStream([{ sender: "user", text: "What is PCOS?" }], "en", {
        onToken: (tok) => tokensReceived.push(tok),
        onDone: (_text, source) => {
          finalSource = source;
        },
      });

      // Reasoning must NOT be emitted to the client
      expect(tokensReceived.some((t) => t.includes("Thinking"))).toBe(false);
      // Empty content stream triggers fallback to offline KB
      expect(finalSource).toBe("kb");
    });

    it("falls back to offline knowledge base when stream is empty", async () => {
      const encoder = new TextEncoder();
      const emptyStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: emptyStream,
      });

      let finalSource = "";
      await askSakhiStream([{ sender: "user", text: "What is PCOS?" }], "en", {
        onDone: (_text, source) => {
          finalSource = source;
        },
      });

      expect(finalSource).toBe("kb");
    });

    it("cancels streaming immediately when user clicks Stop", async () => {
      const abortController = new AbortController();
      const encoder = new TextEncoder();

      const infiniteStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token: "First token " })}\n\n`),
          );
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: infiniteStream,
      });

      const tokensReceived: string[] = [];
      let doneCalled = false;

      const promise = askSakhiStream(
        [{ sender: "user", text: "What is PCOS?" }],
        "en",
        {
          onToken: (tok) => {
            tokensReceived.push(tok);
            abortController.abort(); // User clicks Stop
          },
          onDone: () => {
            doneCalled = true;
          },
        },
        { signal: abortController.signal },
      );

      await promise;
      expect(tokensReceived).toEqual(["First token "]);
      expect(doneCalled).toBe(false); // Canceled by user, no onDone
    });
  });

  describe("Daily Budget & Rate Limiting", () => {
    it("increments daily count and detects when limit is reached", () => {
      resetDailyBudgetForTests(399);
      expect(getDailyBudgetStatus(400).isExceeded).toBe(false);

      incrementDailyBudget();
      expect(getDailyBudgetStatus(400).isExceeded).toBe(true);
      expect(getDailyBudgetStatus(400).used).toBe(400);
    });

    it("enforces sliding window rate limiter", () => {
      const ip = "192.168.1.100";
      // Send 10 rapid calls
      for (let i = 0; i < 10; i++) {
        expect(isRateLimited(ip, 10, 60000)).toBe(false);
      }
      // 11th call within the minute window is rate-limited
      expect(isRateLimited(ip, 10, 60000)).toBe(true);
    });
  });

  describe("Suggestion Chip 30-Minute Cache", () => {
    it("stores and retrieves cached suggestion chip reply within 30 minutes", () => {
      const key = "en:what is pcos";
      setCachedReply(key, "Cached PCOS explanation.");

      expect(getCachedReply(key)).toBe("Cached PCOS explanation.");
    });
  });

  describe("Chat Storage & Data Wipe", () => {
    it("saves and retrieves chat history", () => {
      const mockMsgs: ChatMessage[] = [
        {
          id: "msg_1",
          sender: "user",
          text: "What is PCOS?",
          timestamp: new Date().toISOString(),
        },
        {
          id: "msg_2",
          sender: "assistant",
          text: "PCOS is a hormonal condition...",
          source: "llm",
          timestamp: new Date().toISOString(),
        },
      ];

      chatStorage.saveHistory(mockMsgs);
      const loaded = chatStorage.getHistory();
      expect(loaded).toHaveLength(2);
      expect(loaded[0]?.text).toBe("What is PCOS?");
      expect(loaded[1]?.source).toBe("llm");
    });

    it("wipes chat history when user triggers 'delete my data' (storage.clearAll)", async () => {
      chatStorage.saveHistory([
        {
          id: "msg_1",
          sender: "user",
          text: "Sensitive question about health",
          timestamp: new Date().toISOString(),
        },
      ]);
      expect(chatStorage.getHistory()).toHaveLength(1);

      await storage.clearAll();
      expect(chatStorage.getHistory()).toEqual([]);
    });
  });
});
