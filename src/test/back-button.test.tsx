import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  canGoBackInApp,
  goBack,
  initNavigationTracker,
  isBackButtonExcluded,
  resetNavigationHistory,
  getInAppHistory,
  type NavigationHistoryEvent,
} from "@/services/navigation";
import { BackButton } from "@/components/BackButton";
import { BackHandlerContext } from "@/components/BackHandlerContext";
import { prefs } from "@/services/auth";
import "@/i18n";

// Mock router navigation
const mockBack = vi.fn();
const mockNavigate = vi.fn();
let subscribers: ((event: NavigationHistoryEvent) => void)[] = [];

const mockRouter = {
  history: {
    length: 2,
    location: { pathname: "/care" },
    back: mockBack,
    subscribe: (fn: (event: NavigationHistoryEvent) => void) => {
      subscribers.push(fn);
      return () => {
        subscribers = subscribers.filter((s) => s !== fn);
      };
    },
  },
  navigate: mockNavigate,
};

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => mockRouter,
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: ((e: React.MouseEvent) => void) | undefined;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        mockNavigate({ to });
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

describe("BackButton & Navigation System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribers = [];
    resetNavigationHistory();
  });

  describe("1. In-App History Navigation vs Direct/Fallback Navigation", () => {
    it("uses history.back() when there is a previous in-app page", () => {
      // Simulate user navigating /home -> /care
      resetNavigationHistory(["/home", "/care"]);
      mockRouter.history.length = 2;

      expect(canGoBackInApp(mockRouter)).toBe(true);

      render(<BackButton />);
      const btn = screen.getByRole("button", { name: /Go back/i });
      fireEvent.click(btn);

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("falls back to /home when opened directly and user is logged in", () => {
      // Direct opening: only 1 entry in app history
      resetNavigationHistory(["/schemes"]);
      mockRouter.history.length = 1;

      vi.spyOn(prefs, "loggedIn").mockReturnValue(true);

      expect(canGoBackInApp(mockRouter)).toBe(false);

      render(<BackButton />);
      const btn = screen.getByRole("button", { name: /Go back/i });
      fireEvent.click(btn);

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/home" });
    });

    it("falls back to / when opened directly and user is logged out", () => {
      // Direct opening or after refresh: only 1 entry in app history
      resetNavigationHistory(["/care"]);
      mockRouter.history.length = 1;

      vi.spyOn(prefs, "loggedIn").mockReturnValue(false);

      expect(canGoBackInApp(mockRouter)).toBe(false);

      render(<BackButton />);
      const btn = screen.getByRole("button", { name: /Go back/i });
      fireEvent.click(btn);

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });

    it("respects custom fallback prop if provided", () => {
      resetNavigationHistory(["/vault"]);
      mockRouter.history.length = 1;

      render(<BackButton fallback="/settings" />);
      const btn = screen.getByRole("button", { name: /Go back/i });
      fireEvent.click(btn);

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/settings" });
    });
  });

  describe("2. Navigation Tracker Subscriber", () => {
    it("tracks PUSH, REPLACE, and BACK actions accurately", () => {
      initNavigationTracker(mockRouter);

      // Initial entry
      expect(getInAppHistory()).toEqual(["/care"]);

      // Push /visit
      act(() => {
        subscribers.forEach((s) =>
          s({ action: { type: "PUSH" }, location: { pathname: "/visit" } }),
        );
      });
      expect(getInAppHistory()).toEqual(["/care", "/visit"]);

      // Replace with /visit?tab=summary
      act(() => {
        subscribers.forEach((s) =>
          s({ action: { type: "REPLACE" }, location: { pathname: "/visit" } }),
        );
      });
      expect(getInAppHistory()).toEqual(["/care", "/visit"]);

      // Back to /care
      act(() => {
        subscribers.forEach((s) =>
          s({ action: { type: "BACK" }, location: { pathname: "/care" } }),
        );
      });
      expect(getInAppHistory()).toEqual(["/care"]);
    });
  });

  describe("3. Excluded Routes Rules", () => {
    it("excludes BackButton on root and entry routes", () => {
      expect(isBackButtonExcluded("/")).toBe(true);
      expect(isBackButtonExcluded("/home")).toBe(true);
      expect(isBackButtonExcluded("/consent")).toBe(true);
      expect(isBackButtonExcluded("/signup")).toBe(true);
      expect(isBackButtonExcluded("/urgent")).toBe(true);
      expect(isBackButtonExcluded("/share")).toBe(true);
      expect(isBackButtonExcluded("/share/doc-123")).toBe(true);
    });

    it("includes BackButton on inner screens and main tab roots", () => {
      expect(isBackButtonExcluded("/log")).toBe(false);
      expect(isBackButtonExcluded("/cycle")).toBe(false);
      expect(isBackButtonExcluded("/medicines")).toBe(false);
      expect(isBackButtonExcluded("/scan")).toBe(false);
      expect(isBackButtonExcluded("/vault")).toBe(false);
      expect(isBackButtonExcluded("/care")).toBe(false);
      expect(isBackButtonExcluded("/visit")).toBe(false);
      expect(isBackButtonExcluded("/schemes")).toBe(false);
      expect(isBackButtonExcluded("/profile")).toBe(false);
      expect(isBackButtonExcluded("/settings")).toBe(false);
    });
  });

  describe("4. BackHandler Context & Unsaved Changes Interception", () => {
    it("blocks back navigation when registered handler returns false", () => {
      resetNavigationHistory(["/home", "/log"]);
      mockRouter.history.length = 2;

      let promptShown = false;
      const mockHandler = vi.fn(() => {
        promptShown = true;
        return false; // prevent back
      });

      render(
        <BackHandlerContext.Provider
          value={{
            registeredHandler: mockHandler,
            registerBackHandler: () => () => {},
          }}
        >
          <BackButton />
        </BackHandlerContext.Provider>,
      );

      const btn = screen.getByRole("button", { name: /Go back/i });
      fireEvent.click(btn);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(promptShown).toBe(true);
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("proceeds with back navigation when registered handler returns true", () => {
      resetNavigationHistory(["/home", "/log"]);
      mockRouter.history.length = 2;

      const mockHandler = vi.fn(() => true);

      render(
        <BackHandlerContext.Provider
          value={{
            registeredHandler: mockHandler,
            registerBackHandler: () => () => {},
          }}
        >
          <BackButton />
        </BackHandlerContext.Provider>,
      );

      const btn = screen.getByRole("button", { name: /Go back/i });
      fireEvent.click(btn);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. Emergency / Urgent Route Back Link", () => {
    it("urgent back helper returns to previous in-app route if navigated from within app", () => {
      resetNavigationHistory(["/home", "/urgent"]);
      mockRouter.history.length = 2;

      goBack({ router: mockRouter, navigate: mockNavigate, fallback: "/home" });

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("urgent back helper falls back to /home if opened directly", () => {
      resetNavigationHistory(["/urgent"]);
      mockRouter.history.length = 1;

      goBack({ router: mockRouter, navigate: mockNavigate, fallback: "/home" });

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/home" });
    });
  });
});
