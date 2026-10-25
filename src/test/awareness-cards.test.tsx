import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import fs from "fs";
import path from "path";
import {
  AWARENESS_CARDS,
  AWARENESS_LAST_CARD_KEY,
  getOrderedAwarenessCards,
} from "@/data/awarenessCards";
import { storage } from "@/services/storage";
import { AskSakhiWidget } from "@/components/AskSakhiWidget";

// Mock i18n
import "../i18n";

describe("Health Awareness Cards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("1. Card order personalisation", () => {
    it("returns default card order when user has no pattern flags", () => {
      const { cards, priorityCardId } = getOrderedAwarenessCards([]);
      expect(cards).toHaveLength(8);
      expect(priorityCardId).toBeUndefined();
      expect(cards[0]?.id).toBe("pcos_what");
      expect(cards.map((c) => c.id)).toEqual([
        "pcos_what",
        "pcos_signs",
        "endo_what",
        "endo_signs",
        "cycle_normal",
        "when_doctor",
        "urgent_care",
        "anemia_basics",
      ]);
    });

    it("prioritizes PCOS signs card when irregularPlus flag is present", () => {
      const { cards, priorityCardId } = getOrderedAwarenessCards(["irregularPlus"]);
      expect(cards).toHaveLength(8);
      expect(priorityCardId).toBe("pcos_signs");
      expect(cards[0]?.id).toBe("pcos_signs");
      // All 8 cards still present without duplicates
      const ids = new Set(cards.map((c) => c.id));
      expect(ids.size).toBe(8);
    });

    it("prioritizes endometriosis signs card when painCycle flag is present", () => {
      const { cards, priorityCardId } = getOrderedAwarenessCards(["painCycle"]);
      expect(cards).toHaveLength(8);
      expect(priorityCardId).toBe("endo_signs");
      expect(cards[0]?.id).toBe("endo_signs");
      const ids = new Set(cards.map((c) => c.id));
      expect(ids.size).toBe(8);
    });

    it("prioritizes anaemia basics card when heavyRepeat flag is present", () => {
      const { cards, priorityCardId } = getOrderedAwarenessCards(["heavyRepeat"]);
      expect(cards).toHaveLength(8);
      expect(priorityCardId).toBe("anemia_basics");
      expect(cards[0]?.id).toBe("anemia_basics");
      const ids = new Set(cards.map((c) => c.id));
      expect(ids.size).toBe(8);
    });
  });

  describe("2. Non-diagnostic phrasing validation", () => {
    const localesDir = path.resolve(__dirname, "../i18n/locales");
    const enPath = path.join(localesDir, "en.json");
    const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));

    it("ensures no English card title or body contains diagnostic phrasing ('you have', 'you are diagnosed')", () => {
      const cardsObj = enData.awareness.cards;
      const cardEntries = Object.entries(cardsObj) as [string, { title: string; body: string }][];

      for (const [cardKey, cardContent] of cardEntries) {
        const fullText = `${cardContent.title} ${cardContent.body}`.toLowerCase();

        expect(fullText, `Card ${cardKey} should not say 'you have'`).not.toMatch(/\byou have\b/);

        expect(fullText, `Card ${cardKey} should not say 'you are diagnosed'`).not.toMatch(
          /\byou are diagnosed\b/,
        );

        expect(fullText, `Card ${cardKey} should not say 'you have been diagnosed'`).not.toMatch(
          /\byou have been diagnosed\b/,
        );

        expect(fullText, `Card ${cardKey} should not say 'we diagnose'`).not.toMatch(
          /\bwe diagnose\b/,
        );
      }
    });

    it("ensures card wording uses supportive, non-diagnostic terms ('may', 'can', 'worth discussing')", () => {
      const cardsObj = enData.awareness.cards;
      const combinedText = (Object.values(cardsObj) as { title: string; body: string }[])
        .map((c) => `${c.title} ${c.body}`)
        .join(" ")
        .toLowerCase();

      expect(combinedText).toContain("may");
      expect(combinedText).toContain("can");
      expect(combinedText).toContain("worth discussing");
    });
  });

  describe("3. Storage adapter & wipe on delete", () => {
    it("persists last viewed card via storage adapter and clears on clearAll()", async () => {
      // Set last viewed card
      storage.set(AWARENESS_LAST_CARD_KEY, "endo_signs");
      expect(storage.get(AWARENESS_LAST_CARD_KEY, null)).toBe("endo_signs");

      // Simulate 'Delete all my data'
      await storage.clearAll();

      expect(storage.get(AWARENESS_LAST_CARD_KEY, null)).toBeNull();
    });
  });

  describe("4. Floating widget triggers & tab switching", () => {
    it("renders the Learn floating pill button and switches between Ask and Learn tabs", async () => {
      render(<AskSakhiWidget />);

      // Verify Learn trigger button is present
      const learnPill = screen.getByRole("button", { name: /learn/i });
      expect(learnPill).toBeInTheDocument();

      // Click Learn pill to open widget
      fireEvent.click(learnPill);

      // Verify dialog is open
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Verify Learn tab is selected
      const learnTab = screen.getByRole("tab", { name: /learn/i });
      const askTab = screen.getByRole("tab", { name: /ask/i });

      expect(learnTab).toHaveAttribute("aria-selected", "true");
      expect(askTab).toHaveAttribute("aria-selected", "false");

      // Verify carousel is rendered inside dialog
      const carousel = screen.getByRole("region", { name: /learn/i });
      expect(carousel).toBeInTheDocument();

      // Switch to Ask tab
      fireEvent.click(askTab);

      await waitFor(() => {
        expect(askTab).toHaveAttribute("aria-selected", "true");
        expect(learnTab).toHaveAttribute("aria-selected", "false");
      });

      // Verify chat log area is visible
      expect(screen.getByRole("log")).toBeInTheDocument();

      // Switch back to Learn tab
      fireEvent.click(learnTab);

      await waitFor(() => {
        expect(learnTab).toHaveAttribute("aria-selected", "true");
        expect(askTab).toHaveAttribute("aria-selected", "false");
      });
      expect(screen.getByRole("region", { name: /learn/i })).toBeInTheDocument();
    });
  });
});
