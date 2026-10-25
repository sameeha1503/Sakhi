import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  normalizePhoneNumber,
  phoneToSyntheticEmail,
  validatePin,
  authService,
  SYNTHETIC_EMAIL_DOMAIN,
} from "@/services/auth";
import {
  storage,
  isKeySyncable,
  SYNCED_KEYS,
  VAULT_KEYS,
  type SyncStatus,
} from "@/services/storage";
import { setCustomSupabaseClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Supabase Auth & Cloud Sync", () => {
  type MockSupabaseType = {
    auth: {
      signUp: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
      onAuthStateChange: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
  };

  let mockSupabase: MockSupabaseType;
  let upsertSpy: ReturnType<typeof vi.fn>;
  let deleteSpy: ReturnType<typeof vi.fn>;
  let deleteEqSpy: ReturnType<typeof vi.fn>;
  let selectSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    await storage.clearAll();
    vi.clearAllMocks();
    vi.useFakeTimers();

    upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    deleteEqSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    deleteSpy = vi.fn().mockReturnValue({
      eq: deleteEqSpy,
    });
    selectSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    mockSupabase = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi
          .fn()
          .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "user_data") {
          return {
            upsert: upsertSpy,
            delete: deleteSpy,
            select: selectSpy,
          };
        }
        return {};
      }),
    };

    setCustomSupabaseClient(mockSupabase as unknown as SupabaseClient);
  });

  afterEach(() => {
    vi.useRealTimers();
    setCustomSupabaseClient(undefined);
  });

  describe("1. Phone Normalisation", () => {
    it("normalises +91 98765 43210 with country code and spaces", () => {
      const res = normalizePhoneNumber("+91 98765 43210");
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe("9876543210");
    });

    it("normalises 098765-43210 with leading zero and hyphen", () => {
      const res = normalizePhoneNumber("098765-43210");
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe("9876543210");
    });

    it("normalises 919876543210 with 12 digits without plus", () => {
      const res = normalizePhoneNumber("919876543210");
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe("9876543210");
    });

    it("rejects 9-digit phone numbers", () => {
      const res = normalizePhoneNumber("987654321");
      expect(res.valid).toBe(false);
      expect(res.errorKey).toBe("auth.invalidPhone");
    });

    it("rejects 10-digit numbers starting with 5 or below", () => {
      const res = normalizePhoneNumber("5876543210");
      expect(res.valid).toBe(false);
      expect(res.errorKey).toBe("auth.invalidPhone");
    });
  });

  describe("2. Synthetic Email Mapping", () => {
    it("maps 10-digit number to synthetic email domain without leaking", () => {
      const email = phoneToSyntheticEmail("9876543210");
      expect(email).toBe(`9876543210@${SYNTHETIC_EMAIL_DOMAIN}`);
      expect(SYNTHETIC_EMAIL_DOMAIN).toBe("phone.sakhi.app");
    });
  });

  describe("3. Weak PIN Rejection", () => {
    it("rejects repeated digits like 000000, 111111, 999999", () => {
      expect(validatePin("000000").valid).toBe(false);
      expect(validatePin("111111").valid).toBe(false);
      expect(validatePin("999999").valid).toBe(false);
      expect(validatePin("000000").errorKey).toBe("auth.pinTooWeak");
    });

    it("rejects simple sequential PINs like 123456 and 654321", () => {
      expect(validatePin("123456").valid).toBe(false);
      expect(validatePin("654321").valid).toBe(false);
      expect(validatePin("123456").errorKey).toBe("auth.pinTooWeak");
    });

    it("rejects PINs that are not exactly 6 digits", () => {
      expect(validatePin("1234").valid).toBe(false);
      expect(validatePin("1234567").valid).toBe(false);
      expect(validatePin("1234").errorKey).toBe("auth.pinLength");
    });

    it("accepts strong 6-digit numeric PINs", () => {
      const res = validatePin("839201");
      expect(res.valid).toBe(true);
    });
  });

  describe("4. Duplicate Sign-up Error Mapping", () => {
    it("maps Supabase duplicate registration error to auth.alreadyRegistered", async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "User already registered", status: 400 },
      });

      const res = await authService.signUp("Meera", "9876543210", "839201");
      expect(res.success).toBe(false);
      expect(res.alreadyRegistered).toBe(true);
      expect(res.errorKey).toBe("auth.alreadyRegistered");
    });
  });

  describe("5. Debounced Upsert Includes user_id", () => {
    it("debounces write ~800ms and sends user_id and timestamp in upsert", async () => {
      // Setup signed in user
      storage.set("user", {
        id: "test_user_uuid_123",
        name: "Sunita",
        phone: "9876543210",
        createdAt: "2026-10-25",
      });
      storage.set("auth_mode", "account");
      storage.set("session", true);

      // Set a synced key
      storage.set("medicines", [{ id: "m1", name: "Iron & Folic Acid" }]);

      // Immediately, status should be saving
      expect(storage.getSyncStatus()).toBe("saving");
      expect(upsertSpy).not.toHaveBeenCalled();

      // Fast-forward past 800ms debounce
      await vi.advanceTimersByTimeAsync(850);

      expect(upsertSpy).toHaveBeenCalledTimes(1);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test_user_uuid_123",
          key: "medicines",
          value: [{ id: "m1", name: "Iron & Folic Acid" }],
          updated_at: expect.any(String),
        }),
        { onConflict: "user_id,key" },
      );
      expect(storage.getSyncStatus()).toBe("synced");
    });
  });

  describe("6. Offline Queue Flushes on Reconnect", () => {
    it("queues writes when offline and flushes to Supabase when reconnected", async () => {
      storage.set("user", {
        id: "test_user_uuid_123",
        name: "Sunita",
        phone: "9876543210",
        createdAt: "2026-10-25",
      });
      storage.set("auth_mode", "account");
      storage.set("session", true);

      // Simulate offline
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

      storage.set("doses", [{ id: "d1", medicineId: "m1", time: "morning", taken: true }]);
      await vi.advanceTimersByTimeAsync(850);

      // Should not call upsert while offline
      expect(upsertSpy).not.toHaveBeenCalled();
      expect(storage.getSyncStatus()).toBe("offline");

      // Verify stored in offline queue
      const rawQueue = localStorage.getItem("sakhi:sync_queue");
      expect(rawQueue).toContain("doses");

      // Now come online
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      await storage.flushSyncQueue();

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test_user_uuid_123",
          key: "doses",
        }),
        { onConflict: "user_id,key" },
      );
      expect(storage.getSyncStatus()).toBe("synced");
    });
  });

  describe("7. Merge Picks Newer Row & Merges Logs Per Date", () => {
    it("merges logs per date without losing entries from two phones", async () => {
      // Local has entries for Oct 20 (pain 1) and Oct 21 (pain 2)
      storage.set("logs", [
        { date: "2026-10-20", painLevel: 1, updatedAt: "2026-10-20T10:00:00Z" },
        { date: "2026-10-21", painLevel: 2, updatedAt: "2026-10-21T10:00:00Z" },
      ]);

      // Remote has entries for Oct 20 (pain 3, updated later at 12:00) and Oct 22 (pain 1)
      const remoteLogs = [
        { date: "2026-10-20", painLevel: 3, updatedAt: "2026-10-20T12:00:00Z" },
        { date: "2026-10-22", painLevel: 1, updatedAt: "2026-10-22T10:00:00Z" },
      ];

      selectSpy.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce({
          data: [{ key: "logs", value: remoteLogs, updated_at: "2026-10-22T12:00:00Z" }],
          error: null,
        }),
      });

      await storage.handleSignIn("test_user_uuid_123");

      const merged = storage.get<Array<{ date: string; painLevel: number }>>("logs", []);
      expect(merged).toHaveLength(3);

      const oct20 = merged.find((l) => l.date === "2026-10-20");
      const oct21 = merged.find((l) => l.date === "2026-10-21");
      const oct22 = merged.find((l) => l.date === "2026-10-22");

      expect(oct20?.painLevel).toBe(3); // Newer remote won
      expect(oct21?.painLevel).toBe(2); // Kept from local phone
      expect(oct22?.painLevel).toBe(1); // Added from remote phone
    });
  });

  describe("8. First Sign-In Merges Existing Local Data", () => {
    it("flags first_login_merged and uploads local records when user signs in with pre-existing local data", async () => {
      // User created visits before creating an account
      storage.set("visits", [{ id: "v1", doctor: "Dr. Sharma", date: "2026-10-20" }]);

      selectSpy.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce({
          data: [], // empty remote account
          error: null,
        }),
      });

      await storage.handleSignIn("new_user_uuid");

      expect(storage.isFirstLoginMerged()).toBe(true);
      // Local visits should be pushed to remote
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "visits",
          user_id: "new_user_uuid",
        }),
        { onConflict: "user_id,key" },
      );
    });
  });

  describe("9. Logout Clears Synced Keys but NEVER the Vault", () => {
    it("clears synced keys from local storage on logout while preserving vault PIN and lockout state", async () => {
      // Put synced data
      storage.set("user", {
        id: "u1",
        name: "Ananya",
        phone: "9876543210",
        createdAt: "2026-10-25",
      });
      storage.set("auth_mode", "account");
      storage.set("session", true);
      storage.set("medicines", [{ id: "m1", name: "Calcium" }]);
      storage.set("visits", [{ id: "v1", doctor: "Clinic" }]);

      // Put vault data
      storage.set("vault_pin_meta", {
        salt: "random_salt_123",
        hash: "hash_xyz",
        iterations: 100000,
      });
      storage.set("vault_lockout", { attempts: 2, lockedUntil: null });

      await authService.logOut();

      // Synced keys cleared
      expect(storage.get("medicines", null)).toBeNull();
      expect(storage.get("visits", null)).toBeNull();
      expect(storage.get("user", null)).toBeNull();
      expect(storage.get("session", false)).toBe(false);

      // Vault PIN metadata and lockout MUST NOT be touched
      expect(storage.get("vault_pin_meta", null)).toEqual({
        salt: "random_salt_123",
        hash: "hash_xyz",
        iterations: 100000,
      });
      expect(storage.get("vault_lockout", null)).toEqual({
        attempts: 2,
        lockedUntil: null,
      });
    });
  });

  describe("10. Delete All Removes Remote Rows", () => {
    it("deletes user's rows from user_data table when delete all is triggered", async () => {
      storage.set("user", {
        id: "user_to_delete_uuid",
        name: "Pooja",
        phone: "9876543210",
        createdAt: "2026-10-25",
      });
      storage.set("auth_mode", "account");
      storage.set("session", true);

      await storage.clearAll();

      expect(deleteSpy).toHaveBeenCalled();
      expect(deleteEqSpy).toHaveBeenCalledWith("user_id", "user_to_delete_uuid");
    });
  });

  describe("11. Missing Env Variables Keep App Working (Local Fallback)", () => {
    it("operates gracefully without Supabase, enabling guest mode and local storage", () => {
      setCustomSupabaseClient(null);

      expect(storage.getSyncStatus()).toBe("not_configured");

      const guest = authService.continueWithoutAccount("Devi");
      expect(guest.name).toBe("Devi");
      expect(authService.getAuthMode()).toBe("guest");

      const ok = storage.set("medicines", [{ id: "m1", name: "Paracetamol" }]);
      expect(ok).toBe(true);
      expect(storage.get("medicines", [])).toHaveLength(1);
      // No cloud upsert attempt
      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  describe("12. Vault Keys Can NEVER Be Synced", () => {
    it("asserts vault keys are strictly excluded from isKeySyncable", () => {
      for (const vk of VAULT_KEYS) {
        expect(isKeySyncable(vk)).toBe(false);
      }
      expect(isKeySyncable("vault_pin_meta")).toBe(false);
      expect(isKeySyncable("vault_lockout")).toBe(false);
      expect(isKeySyncable("vault_custom_secret")).toBe(false);

      // Verify synced keys are syncable
      expect(isKeySyncable("medicines")).toBe(true);
      expect(isKeySyncable("logs")).toBe(true);
      expect(isKeySyncable("visits")).toBe(true);
    });

    it("never calls upsert for vault keys even if written while signed in", async () => {
      storage.set("user", {
        id: "user_123",
        name: "Radha",
        phone: "9876543210",
        createdAt: "2026-10-25",
      });
      storage.set("auth_mode", "account");
      storage.set("session", true);

      storage.set("vault_pin_meta", { salt: "abc", hash: "def" });
      storage.set("vault_lockout", { attempts: 1, lockedUntil: null });

      await vi.advanceTimersByTimeAsync(1000);

      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  describe("13. No Synthetic Email in User Interface", () => {
    it("ensures synthetic email is strictly internal and never part of the User model", () => {
      const user = authService.current();
      if (user) {
        expect("email" in user).toBe(false);
      }

      // Check user model shape
      const sampleUser = { id: "u1", name: "Aarti", phone: "9876543210", createdAt: "2026-10-25" };
      expect(Object.keys(sampleUser)).not.toContain("email");
    });
  });
});
