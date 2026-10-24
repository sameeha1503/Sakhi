import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeText,
  matchKnowledgeBase,
  askSakhi,
  chatStorage,
  type ChatMessage,
} from "../services/chat";
import { storage } from "../services/storage";
import { loadLanguageResources } from "../i18n";

describe("Ask Sakhi Chat Service", () => {
  beforeEach(async () => {
    localStorage.clear();
    await storage.clearAll();
    await loadLanguageResources("hi");
    vi.restoreAllMocks();
  });

  describe("Text Normalisation (normalizeText)", () => {
    it("converts to lowercase and collapses whitespace", () => {
      expect(normalizeText("  What   IS  PCOS?  ")).toBe("what is pcos");
    });

    it("removes zero-width characters (ZWJ, ZWNJ, BOM, soft hyphen)", () => {
      // \u200C (ZWNJ), \u200D (ZWJ), \uFEFF (BOM)
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

  describe("Mode 1 Knowledge Base Intent Matching", () => {
    it("matches 'What is PCOS?' and returns doctor visit action", () => {
      const res = matchKnowledgeBase("What is PCOS?", "en");
      expect(res.source).toBe("kb");
      expect(res.text.toLowerCase()).toContain("polycystic");
      expect(res.actions?.[0]?.to).toBe("/visit");
    });

    it("matches 'signs of PCOS'", () => {
      const res = matchKnowledgeBase("What are the signs of PCOS?", "en");
      expect(res.source).toBe("kb");
      expect(res.text.toLowerCase()).toContain("weight");
      expect(res.actions?.[0]?.to).toBe("/log");
    });

    it("matches 'What is endometriosis?' and signs", () => {
      const whatRes = matchKnowledgeBase("what is endometriosis", "en");
      expect(whatRes.text.toLowerCase()).toContain("uterus");
      expect(whatRes.actions?.[0]?.to).toBe("/visit");

      const signsRes = matchKnowledgeBase("signs of endometriosis", "en");
      expect(signsRes.text.toLowerCase()).toContain("cramps");
      expect(signsRes.actions?.[0]?.to).toBe("/log");
    });

    it("matches 'Is my cycle normal?'", () => {
      const res = matchKnowledgeBase("is my cycle normal", "en");
      expect(res.text).toContain("21 and 35");
      expect(res.actions?.[0]?.to).toBe("/log");
    });

    it("matches 'irregular periods'", () => {
      const res = matchKnowledgeBase("I have irregular periods and missed my period", "en");
      expect(res.text.toLowerCase()).toContain("irregular");
      expect(res.actions?.[0]?.to).toBe("/visit");
    });

    it("matches 'period pain'", () => {
      const res = matchKnowledgeBase("severe period pain and bad cramps", "en");
      expect(res.text.toLowerCase()).toContain("cramps");
      expect(res.actions?.[0]?.to).toBe("/visit");
    });

    it("matches 'heavy bleeding'", () => {
      const res = matchKnowledgeBase("heavy bleeding and passing blood clots", "en");
      expect(res.text.toLowerCase()).toContain("pads");
      expect(res.actions?.[0]?.to).toBe("/visit");
    });

    it("matches 'When should I see a doctor?'", () => {
      const res = matchKnowledgeBase("when should i see a doctor", "en");
      expect(res.text.toLowerCase()).toContain("doctor");
      expect(res.actions?.[0]?.to).toBe("/care");
    });

    it("matches 'How do I log my symptoms?'", () => {
      const res = matchKnowledgeBase("how do i log my symptoms", "en");
      expect(res.text.toLowerCase()).toContain("flow level");
      expect(res.actions?.[0]?.to).toBe("/log");
    });

    it("matches 'How reminders work'", () => {
      const res = matchKnowledgeBase("how reminders work for medicine", "en");
      expect(res.text.toLowerCase()).toContain("medicines");
      expect(res.actions?.[0]?.to).toBe("/medicines");
    });

    it("matches 'Find a hospital near me'", () => {
      const res = matchKnowledgeBase("find a hospital near me", "en");
      expect(res.text.toLowerCase()).toContain("care");
      expect(res.actions?.[0]?.to).toBe("/care");
    });

    it("matches 'What government schemes can I get?'", () => {
      const res = matchKnowledgeBase("what government schemes can i get", "en");
      expect(res.text).toContain("PM-JAY");
      expect(res.actions?.[0]?.to).toBe("/schemes");
    });

    it("matches 'How do I share my records with my doctor?'", () => {
      const res = matchKnowledgeBase("how do i share my records with my doctor", "en");
      expect(res.text.toLowerCase()).toContain("doctor summary");
      expect(res.actions?.[0]?.to).toBe("/visit");
    });

    it("matches 'Is my data private?' (privacy and vault)", () => {
      const res = matchKnowledgeBase("is my data private", "en");
      expect(res.text.toLowerCase()).toContain("device");
      expect(res.actions?.[0]?.to).toBe("/vault");
    });

    it("matches 'missed medicine dose'", () => {
      const res = matchKnowledgeBase("i missed my medicine dose what should i do", "en");
      expect(res.text.toLowerCase()).toContain("dose");
      expect(res.actions?.[0]?.to).toBe("/medicines");
    });
  });

  describe("Multilingual / Indic Script Matching", () => {
    it("matches Hindi PCOS query", () => {
      const res = matchKnowledgeBase("पीसीओएस क्या है?", "hi");
      expect(res.source).toBe("kb");
      expect(res.text).toContain("PCOS");
      expect(res.actions?.[0]?.to).toBe("/visit");
    });

    it("matches Hindi hospital finding query", () => {
      const res = matchKnowledgeBase("पास का अस्पताल कहाँ है?", "hi");
      expect(res.source).toBe("kb");
      expect(res.actions?.[0]?.to).toBe("/care");
    });

    it("matches Hindi government schemes query", () => {
      const res = matchKnowledgeBase("सरकारी योजनाएं कौन सी हैं?", "hi");
      expect(res.source).toBe("kb");
      expect(res.actions?.[0]?.to).toBe("/schemes");
    });
  });

  describe("Emergency Detection", () => {
    it("detects 108 or emergency keywords and directs to /urgent", () => {
      const res = matchKnowledgeBase("call 108 emergency right now", "en");
      expect(res.text.toLowerCase()).toContain("hospital");
      expect(res.actions?.[0]?.to).toBe("/urgent");
    });

    it("detects severe chest pain or unconsciousness", () => {
      const res = matchKnowledgeBase("severe chest pain and unconscious", "en");
      expect(res.actions?.[0]?.to).toBe("/urgent");
    });
  });

  describe("Fallback Behavior", () => {
    it("returns friendly non-diagnostic fallback for unknown queries", () => {
      const res = matchKnowledgeBase("tell me a recipe for chocolate cake", "en");
      expect(res.source).toBe("kb");
      expect(res.text.toLowerCase()).toContain("consult a doctor");
      expect(res.actions?.some((a) => a.to === "/care")).toBe(true);
    });
  });

  describe("Chat Storage & Data Deletion", () => {
    it("saves and retrieves chat messages", () => {
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
          timestamp: new Date().toISOString(),
        },
      ];

      chatStorage.saveHistory(mockMsgs);
      const loaded = chatStorage.getHistory();
      expect(loaded).toHaveLength(2);
      expect(loaded[0]?.text).toBe("What is PCOS?");
    });

    it("clears chat history with clearHistory()", () => {
      chatStorage.saveHistory([
        {
          id: "msg_1",
          sender: "user",
          text: "Hello",
          timestamp: new Date().toISOString(),
        },
      ]);
      expect(chatStorage.getHistory()).toHaveLength(1);

      chatStorage.clearHistory();
      expect(chatStorage.getHistory()).toEqual([]);
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

      // Trigger full app wipe
      await storage.clearAll();
      expect(chatStorage.getHistory()).toEqual([]);
    });
  });

  describe("askSakhi Service Flow", () => {
    it("falls back to Knowledge Base when /api/chat is not available", async () => {
      // Mock fetch failure
      global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const response = await askSakhi([{ sender: "user", text: "what is pcos" }], "en");

      expect(response.source).toBe("kb");
      expect(response.text.toLowerCase()).toContain("polycystic");
    });

    it("returns LLM response when /api/chat succeeds", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "AI response from Ask Sakhi assistant.",
          source: "llm",
        }),
      });

      const response = await askSakhi([{ sender: "user", text: "how are you" }], "en");

      expect(response.source).toBe("llm");
      expect(response.text).toBe("AI response from Ask Sakhi assistant.");
    });
  });
});
