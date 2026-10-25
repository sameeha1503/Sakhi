import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Route as UrgentRoute } from "@/routes/urgent";
import { Route as CareRoute } from "@/routes/care";
import * as placesService from "@/services/places";
import i18n from "@/i18n";

// Mock tanstack router navigation & Link
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRouterState: () => ({
      location: { pathname: "/care", search: { locate: "1" } },
    }),
    Link: ({
      children,
      to,
      search,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      search?: Record<string, string>;
    }) => {
      let href = to;
      if (search && Object.keys(search).length > 0) {
        const query = new URLSearchParams(search).toString();
        href = `${to}?${query}`;
      }
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

describe("Emergency Urgent Screen (/urgent)", () => {
  const UrgentComponent = UrgentRoute.options.component!;
  const CareComponent = CareRoute.options.component!;

  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    placesService.locationPrefs.setRememberEnabled(false);
    vi.clearAllMocks();
    i18n.changeLanguage("en");

    mockGetCurrentPosition = vi.fn();
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
      },
      configurable: true,
      writable: true,
    });
  });

  describe("1. 108 Ambulance Button & Immediate Access", () => {
    it("renders the 108 button immediately regardless of location state", () => {
      // Geolocation hangs
      mockGetCurrentPosition.mockImplementation(() => {});

      render(<UrgentComponent />);

      const ambulanceBtn = screen.getByRole("link", { name: /108/i });
      expect(ambulanceBtn).toBeInTheDocument();
      expect(ambulanceBtn).toHaveAttribute("href", "tel:108");

      const findHospitalsBtn = screen.getByRole("link", {
        name: /Find hospitals near me/i,
      });
      expect(findHospitalsBtn).toBeInTheDocument();
      expect(findHospitalsBtn).toHaveAttribute("href", "/care?locate=1");
    });

    it("displays a calm finding notice while locating without blocking buttons", () => {
      mockGetCurrentPosition.mockImplementation(() => {});

      render(<UrgentComponent />);

      expect(screen.getByText("Finding the nearest hospital...")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /108/i })).toBeInTheDocument();
    });
  });

  describe("2. Never Show Hardcoded or Sample Data on /urgent", () => {
    it("hides the hospital card completely when result is sample data", async () => {
      mockGetCurrentPosition.mockImplementation((success) =>
        success({ coords: { latitude: 17.42, longitude: 78.5 } }),
      );

      vi.spyOn(placesService, "getNearestEmergencyHospital").mockResolvedValue({
        place: {
          id: "sample_hosp_1",
          name: "Sample Community Hospital",
          type: "hospital",
          lat: 17.42,
          lng: 78.5,
          phone: "040-123456",
          address: "Sample Street, Hyderabad",
          town: "Hyderabad",
          district: "Hyderabad",
          state: "Telangana",
          operator: "Government",
          isGovernment: true,
          emergency: true,
          hasWomenHealth: true,
          hasGynaecology: true,
          opening_hours: null,
          km: 2.5,
        },
        isFallbackSample: true,
        source: "sample",
      });

      render(<UrgentComponent />);

      await waitFor(() => {
        expect(screen.queryByText("Finding the nearest hospital...")).not.toBeInTheDocument();
      });

      // Sample hospital name must NOT be rendered
      expect(screen.queryByText("Sample Community Hospital")).not.toBeInTheDocument();
      // Sample banner must NOT be rendered
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      // No live fallback line must be shown
      expect(
        screen.getByText("If you can, ask someone to take you to the nearest hospital now."),
      ).toBeInTheDocument();
      // Attribution must NOT be shown when no live place is present
      expect(screen.queryByText("© OpenStreetMap contributors")).not.toBeInTheDocument();
    });

    it("shows the nearest hospital card ONLY when place is from live data", async () => {
      mockGetCurrentPosition.mockImplementation((success) =>
        success({ coords: { latitude: 17.378, longitude: 78.474 } }),
      );

      vi.spyOn(placesService, "getNearestEmergencyHospital").mockResolvedValue({
        place: {
          id: "live_hosp_1",
          name: "Osmania General Hospital",
          type: "hospital",
          lat: 17.378,
          lng: 78.474,
          phone: "040-24600121",
          address: "Afzal Gunj, Hyderabad",
          town: "Hyderabad",
          district: "Hyderabad",
          state: "Telangana",
          operator: "Government",
          isGovernment: true,
          emergency: true,
          hasWomenHealth: true,
          hasGynaecology: true,
          opening_hours: "24/7",
          km: 1.8,
        },
        isFallbackSample: false,
        source: "geoapify",
      });

      render(<UrgentComponent />);

      await waitFor(() => {
        expect(screen.getByText("Osmania General Hospital")).toBeInTheDocument();
      });

      expect(screen.getByText("Nearest hospital")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^Call$/i })).toHaveAttribute(
        "href",
        "tel:040-24600121",
      );
      expect(screen.getByRole("link", { name: /Directions/i })).toHaveAttribute(
        "href",
        "https://www.google.com/maps/dir/?api=1&destination=17.378,78.474",
      );

      // "See all hospitals near you" link leads to /care?locate=1
      const seeAllLink = screen.getByRole("link", {
        name: "See all hospitals near you",
      });
      expect(seeAllLink).toBeInTheDocument();
      expect(seeAllLink).toHaveAttribute("href", "/care?locate=1");

      // OpenStreetMap attribution is shown when live place is displayed
      expect(screen.getByText("© OpenStreetMap contributors")).toBeInTheDocument();
    });

    it("shows no-live fallback when geolocation permission is denied", async () => {
      mockGetCurrentPosition.mockImplementation((_success, error) =>
        error({ code: 1, message: "User denied Geolocation" }),
      );

      render(<UrgentComponent />);

      await waitFor(() => {
        expect(
          screen.getByText("If you can, ask someone to take you to the nearest hospital now."),
        ).toBeInTheDocument();
      });

      expect(screen.queryByText("Finding the nearest hospital...")).not.toBeInTheDocument();
    });
  });

  describe("3. Directing to Care (/care?locate=1)", () => {
    it("/care?locate=1 automatically starts live location search on mount", async () => {
      delete (window as unknown as { location?: unknown }).location;
      (window as unknown as { location: unknown }).location = new URL(
        "http://localhost:8080/care?locate=1",
      );

      render(<CareComponent />);

      expect(mockGetCurrentPosition).toHaveBeenCalled();
    });
  });
});
