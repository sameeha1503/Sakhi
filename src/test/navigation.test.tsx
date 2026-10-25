import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { storage } from "@/services/storage";
import { AppShell, GlobalBackButton } from "@/components/AppShell";
import { inAppHistoryStack } from "@/lib/navigation";
import "../i18n";

let mockCurrentPath = "/home";
const mockNavigate = vi.fn();
const mockBack = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    useRouterState: () => ({
      location: {
        pathname: mockCurrentPath,
        search: {},
      },
    }),
    useNavigate: () => mockNavigate,
    useRouter: () => ({
      history: {
        back: mockBack,
        length: window.history.length,
      },
    }),
    Link: ({
      to,
      children,
      className,
      activeProps: _activeProps,
      ...props
    }: {
      to: string;
      children?: React.ReactNode;
      className?: string;
      activeProps?: unknown;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={to} className={className} data-testid={`link-${to}`} {...props}>
        {children}
      </a>
    ),
  };
});

describe("Navigation & Global Back Control", () => {
  beforeEach(() => {
    localStorage.clear();
    storage.set("lang", "en");
    storage.set("consent", true);
    storage.set("session", true);
    storage.set("user", {
      id: "u_test",
      name: "Test User",
      phone: "9999999999",
      createdAt: new Date().toISOString(),
    });
    mockNavigate.mockClear();
    mockBack.mockClear();
    inAppHistoryStack.length = 0;
  });

  describe("1. Back control visibility across routes", () => {
    it("does NOT render the back control on /home", () => {
      mockCurrentPath = "/home";
      render(
        <AppShell>
          <div>Home Content</div>
        </AppShell>,
      );

      const main = screen.getByRole("main");
      // No back button in the main content area
      expect(within(main).queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
      // No link to home serving as the back control inside main
      expect(within(main).queryByRole("link", { name: /home/i })).not.toBeInTheDocument();
    });

    it("renders the small ← Home link on /log", () => {
      mockCurrentPath = "/log";
      render(
        <AppShell>
          <div>Log Content</div>
        </AppShell>,
      );

      // /log specifically gets a small "← Home" link at top of main
      const main = screen.getByRole("main");
      const homeLink = within(main).getByRole("link", { name: /home/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute("href", "/home");
    });

    const featureRoutes = [
      "/medicines",
      "/care",
      "/visit",
      "/schemes",
      "/vault",
      "/scan",
      "/profile",
      "/cycle",
    ];

    featureRoutes.forEach((route) => {
      it(`renders the Back button on ${route}`, () => {
        mockCurrentPath = route;
        render(
          <AppShell>
            <div>{route} Content</div>
          </AppShell>,
        );

        const main = screen.getByRole("main");
        const backButton = within(main).getByRole("button", { name: /^back$/i });
        expect(backButton).toBeInTheDocument();
        expect(backButton).toHaveAttribute("aria-label", "Back");
      });
    });
  });

  describe("2. Back button navigation behavior", () => {
    it("navigates to /home when clicked with no in-app history", () => {
      inAppHistoryStack.length = 0; // No prior in-app history
      render(<GlobalBackButton pathname="/medicines" />);

      const backBtn = screen.getByRole("button", { name: /^back$/i });
      fireEvent.click(backBtn);

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/home" });
      expect(mockNavigate).not.toHaveBeenCalledWith({ to: "/" });
      expect(mockBack).not.toHaveBeenCalled();
    });

    it("calls router.history.back() when there is in-app history", () => {
      // Simulate navigating from /home to /medicines
      inAppHistoryStack.push("/home");
      inAppHistoryStack.push("/medicines");
      Object.defineProperty(window.history, "length", { value: 3, configurable: true });

      render(<GlobalBackButton pathname="/medicines" />);

      const backBtn = screen.getByRole("button", { name: /^back$/i });
      fireEvent.click(backBtn);

      expect(mockBack).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("never navigates to / (language picker) from the back button even if history entry is /", () => {
      inAppHistoryStack.push("/");
      inAppHistoryStack.push("/care");

      render(<GlobalBackButton pathname="/care" />);

      const backBtn = screen.getByRole("button", { name: /^back$/i });
      fireEvent.click(backBtn);

      // Should fallback to /home, never /
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/home" });
      expect(mockNavigate).not.toHaveBeenCalledWith({ to: "/" });
    });
  });

  describe("3. Home tab link exists and points to /home on every AppShell route", () => {
    const allRoutes = [
      "/home",
      "/log",
      "/medicines",
      "/care",
      "/visit",
      "/schemes",
      "/vault",
      "/scan",
      "/profile",
      "/cycle",
    ];

    allRoutes.forEach((route) => {
      it(`renders Home link pointing to /home when on ${route}`, () => {
        mockCurrentPath = route;
        render(
          <AppShell>
            <div>Page for {route}</div>
          </AppShell>,
        );

        // Header logo, desktop header home link, and mobile bottom nav home tab all point to /home
        const homeLinks = screen.getAllByRole("link", { name: /home/i });
        expect(homeLinks.length).toBeGreaterThanOrEqual(1);
        homeLinks.forEach((link) => {
          expect(link).toHaveAttribute("href", "/home");
        });
      });
    });
  });
});
