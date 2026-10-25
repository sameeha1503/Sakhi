import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { authService, maskPhoneNumber, type User } from "@/services/auth";
import { storage } from "@/services/storage";
import { AccountMenu } from "@/components/AccountMenu";
import { LogoutConfirmationDialog } from "@/components/LogoutConfirmationDialog";
import "../i18n";

// Mock tanstack router navigation
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: () => void;
  }) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        mockNavigate({ to });
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: vi.fn(),
  },
}));

describe("Top Bar Account Menu & Log Out Flow", () => {
  beforeEach(async () => {
    localStorage.clear();
    await storage.clearAll();
    vi.clearAllMocks();
  });

  describe("1. Masked Phone Number Format", () => {
    it("masks a 10-digit number to '98••••3210' format", () => {
      expect(maskPhoneNumber("9876543210")).toBe("98••••3210");
    });

    it("masks numbers with spaces, +91 and dashes correctly", () => {
      expect(maskPhoneNumber("+91 98765-43210")).toBe("98••••3210");
      expect(maskPhoneNumber("9123456789")).toBe("91••••6789");
    });

    it("returns raw string if fewer than 6 digits", () => {
      expect(maskPhoneNumber("123")).toBe("123");
    });
  });

  describe("2. Account Menu Component", () => {
    const mockUser: User = {
      id: "usr_priya_123",
      name: "Priya Sharma",
      phone: "9876543210",
      createdAt: "2026-10-25T10:00:00.000Z",
    };

    it("renders round button with user initial in teal circle", () => {
      render(<AccountMenu user={mockUser} syncStatus="synced" onRequestLogout={vi.fn()} />);

      const trigger = screen.getByRole("button", { name: /account menu/i });
      expect(trigger).toBeDefined();
      expect(trigger.textContent).toContain("P");
    });

    it("opens menu containing user details, masked phone, sync status, and links", async () => {
      const onRequestLogout = vi.fn();
      render(<AccountMenu user={mockUser} syncStatus="synced" onRequestLogout={onRequestLogout} />);

      const trigger = screen.getByRole("button", { name: /account menu/i });
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText("Priya Sharma")).toBeDefined();
        expect(screen.getByText("98••••3210")).toBeDefined();
        expect(screen.getByText(/synced/i)).toBeDefined();
        expect(screen.getByText(/my profile/i)).toBeDefined();
        expect(screen.getByText(/settings/i)).toBeDefined();
        expect(screen.getByText(/log out/i)).toBeDefined();
      });

      // Tapping Log out triggers onRequestLogout
      const logoutBtn = screen.getByRole("button", { name: /log out/i });
      fireEvent.click(logoutBtn);
      expect(onRequestLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Logout Confirmation Dialog", () => {
    it("renders confirmation title, safe-data message, and buttons without logging out immediately", () => {
      const onOpenChange = vi.fn();
      render(<LogoutConfirmationDialog open={true} onOpenChange={onOpenChange} />);

      expect(screen.getByText(/log out of sakhi\?/i)).toBeDefined();
      expect(screen.getByText(/your data is safe in your account/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /stay logged in/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /log out$/i })).toBeDefined();
    });

    it("closes dialog when 'Stay logged in' is clicked", () => {
      const onOpenChange = vi.fn();
      render(<LogoutConfirmationDialog open={true} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole("button", { name: /stay logged in/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("4. Logout Clears Synced Keys but Preserves Vault and Language", () => {
    it("clears health records and session while preserving vault PIN meta and language", async () => {
      // Setup authenticated user with records, vault, and language
      storage.set("user", {
        id: "u_test",
        name: "Devi",
        phone: "9876543210",
        createdAt: "2026-10-25",
      });
      storage.set("auth_mode", "account");
      storage.set("session", true);
      storage.set("medicines", [{ id: "m1", name: "Iron" }]);
      storage.set("logs", { "2026-10-25": { energy: 4 } });
      storage.set("lang", "hi");

      // Vault storage
      storage.set("vault_pin_meta", {
        salt: "vault_salt_test",
        hash: "vault_hash_test",
        iterations: 100000,
      });

      const res = await authService.performLogout({ force: true });
      expect(res.success).toBe(true);

      // Synced keys must be cleared
      expect(storage.get("medicines", null)).toBeNull();
      expect(storage.get("logs", null)).toBeNull();
      expect(storage.get("user", null)).toBeNull();
      expect(storage.get("session", false)).toBe(false);

      // Language and Vault MUST be preserved
      expect(storage.get("lang", null)).toBe("hi");
      expect(storage.get("vault_pin_meta", null)).toEqual({
        salt: "vault_salt_test",
        hash: "vault_hash_test",
        iterations: 100000,
      });
    });
  });

  describe("5. Unsynced Changes Warning on Logout", () => {
    it("warns about unsynced items when the retry queue is not empty", async () => {
      // Emulate offline with pending writes
      storage.set("user", {
        id: "u_offline",
        name: "Sunita",
        phone: "9876543210",
        createdAt: "2026-10-25",
      });
      storage.set("auth_mode", "account");
      storage.set("session", true);

      // Add pending write to queue
      storage.set("medicines", [{ id: "m2", name: "Folic Acid" }]);

      // Mock navigator.onLine as false so flush doesn't clear queue
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

      // performLogout without force returns hasUnsynced: true
      const res = await authService.performLogout({ force: false });
      expect(res.success).toBe(false);
      expect(res.hasUnsynced).toBe(true);

      // Session and data remain until user forces
      expect(storage.get("user", null)).not.toBeNull();

      // performLogout with force completes
      const forcedRes = await authService.performLogout({ force: true });
      expect(forcedRes.success).toBe(true);
      expect(storage.get("user", null)).toBeNull();
    });
  });

  describe("6. Redirect and Toast on Logged Out", () => {
    it("redirects to /signup and triggers toast on logout confirmation", async () => {
      const onOpenChange = vi.fn();
      render(<LogoutConfirmationDialog open={true} onOpenChange={onOpenChange} />);

      const logoutBtn = screen.getByRole("button", { name: /log out$/i });
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/signup" });
        expect(mockToastSuccess).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
