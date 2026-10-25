import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { Route } from "@/routes/index";
import { prefs } from "@/services/auth";
import { storage } from "@/services/storage";
import i18n from "@/i18n";

// Mock tanstack router navigation
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe("Landing Page (/)", () => {
  const LandingComponent = Route.options.component!;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    i18n.changeLanguage("en");
  });

  describe("1. Repetition Fix & Hero Wording", () => {
    it("renders the benefit as the main h1 headline without repeating the app name", () => {
      render(<LandingComponent />);

      // The h1 should be the benefit headline
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toBe("Understand your body. Get care sooner.");
      expect(heading.textContent).not.toBe("Sakhi");

      // App name appears in the header brand
      expect(screen.getByText("Sakhi")).toBeInTheDocument();
      expect(screen.getByText("Your health friend")).toBeInTheDocument();
    });

    it("renders the hero badge and subtitle correctly", () => {
      render(<LandingComponent />);

      expect(screen.getByText("Free • Private • In your language")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Track your periods and symptoms in 30 seconds a day\. Know when to see a doctor/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Takes 1 minute. No email needed.")).toBeInTheDocument();
    });

    it("renders the illustrative UI preview card with Example tag and mock data", () => {
      render(<LandingComponent />);

      expect(screen.getByText("Example")).toBeInTheDocument();
      expect(screen.getByText("Today's check-in")).toBeInTheDocument();
      expect(screen.getByText("Medium flow")).toBeInTheDocument();
      expect(screen.getByText("Calm")).toBeInTheDocument();
      expect(screen.getByText("Mild cramps")).toBeInTheDocument();
      expect(screen.getByText("Next period in about 4 days")).toBeInTheDocument();
      expect(screen.getByText("Nearest health centre: 2.1 km")).toBeInTheDocument();
    });
  });

  describe("2. Language Chips", () => {
    it("renders all 11 Indian language chips and switches language immediately on click", async () => {
      render(<LandingComponent />);

      const chips = [
        "English",
        "हिन्दी",
        "తెలుగు",
        "தமிழ்",
        "ಕನ್ನಡ",
        "മലയാളം",
        "मराठी",
        "বাংলা",
        "ગુજરાતી",
        "ਪੰਜਾਬੀ",
        "ଓଡ଼ିଆ",
      ];

      for (const chip of chips) {
        expect(screen.getByRole("button", { name: chip })).toBeInTheDocument();
      }

      // Tap Hindi chip
      fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
      await waitFor(() => {
        expect(prefs.language()).toBe("hi");
        expect(i18n.language).toBe("hi");
      });

      // Tap Telugu chip
      fireEvent.click(screen.getByRole("button", { name: "తెలుగు" }));
      await waitFor(() => {
        expect(prefs.language()).toBe("te");
        expect(i18n.language).toBe("te");
      });
    });
  });

  describe("3. Navigation Routing", () => {
    it("primary 'Get started' button routes unconsented users to /consent", () => {
      render(<LandingComponent />);

      const getStartedBtn = screen.getByRole("button", { name: /Get started/i });
      fireEvent.click(getStartedBtn);

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/consent" });
    });

    it("redirects logged-in users directly to /home on mount", () => {
      prefs.setLanguage("en");
      prefs.setConsent(true);
      storage.set("user", {
        id: "u_test",
        name: "Rani",
        phone: "9876543210",
        createdAt: new Date().toISOString(),
      });
      storage.set("auth_mode", "account");
      prefs.setLoggedIn(true);

      render(<LandingComponent />);

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/home" });
    });

    it("'I already have an account' sets consent and routes to /signup in login mode", () => {
      render(<LandingComponent />);

      const haveAccountBtn = screen.getByRole("button", {
        name: "I already have an account",
      });
      fireEvent.click(haveAccountBtn);

      expect(prefs.consented()).toBe(true);
      expect(sessionStorage.getItem("sakhi:auth_mode")).toBe("login");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/signup" });
    });
  });

  describe("4. How Sakhi Helps & Fifth Strip", () => {
    it("renders the 4 outcome-focused cards and the Ask Sakhi assistant strip", () => {
      render(<LandingComponent />);

      expect(screen.getByText("Notice patterns early")).toBeInTheDocument();
      expect(screen.getByText("Be ready for the doctor")).toBeInTheDocument();
      expect(screen.getByText("Find care near you")).toBeInTheDocument();
      expect(screen.getByText("Never miss a scheme")).toBeInTheDocument();

      expect(
        screen.getByText(
          /Ask Sakhi: a friendly assistant that answers women's health questions in your language\. It never diagnoses or suggests medicines\./i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("5. Honest Privacy Section", () => {
    it("renders 'Your health, your control' with 5 honest points", () => {
      render(<LandingComponent />);

      expect(screen.getByText("Your health, your control")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Only you can see your records. Log in with your number and a 6-digit PIN.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Use it without an account if you prefer; then everything stays on this phone.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Prescription photos stay on your phone, locked with your PIN."),
      ).toBeInTheDocument();
      expect(screen.getByText("Delete everything in one tap, any time.")).toBeInTheDocument();
      expect(
        screen.getByText("Sakhi gives information, not diagnosis. It never replaces a doctor."),
      ).toBeInTheDocument();
    });

    it("verifies NO old claims ('never leaves this device' or 'encrypted') exist in any of the 11 locale files", () => {
      const localesDir = path.resolve(__dirname, "../i18n/locales");
      const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"));

      expect(files.length).toBe(11);

      for (const file of files) {
        const content = fs.readFileSync(path.join(localesDir, file), "utf-8").toLowerCase();
        expect(
          content.includes("never leaves this device"),
          `File ${file} contains obsolete claim "never leaves this device"`,
        ).toBe(false);
        expect(
          content.includes("end-to-end encrypted"),
          `File ${file} contains obsolete claim "end-to-end encrypted"`,
        ).toBe(false);
        expect(
          content.includes("end to end encrypted"),
          `File ${file} contains obsolete claim "end to end encrypted"`,
        ).toBe(false);
      }
    });
  });

  describe("6. Emergency Strip & Footer", () => {
    it("renders the always-visible emergency strip with tel:108 link", () => {
      render(<LandingComponent />);

      expect(screen.getByText("In an emergency call 108")).toBeInTheDocument();
      const call108Link = screen.getByRole("link", { name: /108/i });
      expect(call108Link).toHaveAttribute("href", "tel:108");
    });

    it("renders honest footer notice and privacy link", () => {
      render(<LandingComponent />);

      expect(
        screen.getByText(
          "Made for women across India. Sakhi shares information, not medical advice.",
        ),
      ).toBeInTheDocument();
      const consentLink = screen.getByRole("link", { name: "Privacy & Consent" });
      expect(consentLink).toHaveAttribute("href", "/consent");
    });
  });

  describe("7. Meta Head Tags", () => {
    it("exports proper title and description meta head tags", () => {
      const headResult = (
        Route.options.head as () => {
          meta: Array<{ title?: string; name?: string; content?: string }>;
        }
      )();
      const meta = headResult.meta;

      const titleEntry = meta.find((m) => m.title !== undefined);
      expect(titleEntry?.title).toBe("Sakhi: Your women's health friend");

      const descEntry = meta.find((m) => m.name === "description");
      expect(descEntry?.content).toBe(
        "Track periods and symptoms, find care near you, discover government schemes and ask health questions in 11 Indian languages.",
      );
    });
  });
});
