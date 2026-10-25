// Authentication service supporting Phone + 6-digit PIN via Supabase Auth
// with local-first offline fallback and guest mode.
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { storage } from "./storage";

export const SYNTHETIC_EMAIL_DOMAIN = "phone.sakhi.app";

export type User = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
};

export type AuthMode = "account" | "guest";

const WEAK_PINS = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "234567",
  "345678",
  "456789",
  "012345",
  "654321",
  "765432",
  "876543",
  "987654",
  "543210",
]);

/**
 * Normalise a phone number:
 * - Strip spaces, dashes, +91, and a leading 0
 * - Require exactly 10 digits starting with 6-9
 */
export function normalizePhoneNumber(raw: string): {
  valid: boolean;
  normalized: string;
  errorKey?: string;
} {
  if (!raw) return { valid: false, normalized: "", errorKey: "auth.invalidPhone" };

  // Remove spaces, hyphens, parentheses, and dots
  let cleaned = raw.replace(/[\s\-().]/g, "");

  // Remove +91 or 91 country code prefix if present before 10 digits
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }

  // Remove single leading zero if 11 digits
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  // Must be exactly 10 digits starting with 6-9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  return { valid: false, normalized: "", errorKey: "auth.invalidPhone" };
}

/**
 * Map 10-digit phone to a synthetic internal email. Never displayed in the UI.
 */
export function phoneToSyntheticEmail(digits10: string): string {
  return `${digits10}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Validate a 6-digit numeric PIN.
 */
export function validatePin(pin: string): { valid: boolean; errorKey?: string } {
  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, errorKey: "auth.pinLength" };
  }

  if (WEAK_PINS.has(pin)) {
    return { valid: false, errorKey: "auth.pinTooWeak" };
  }

  return { valid: true };
}

type AuthListener = (user: User | null) => void;
const authListeners: AuthListener[] = [];

function notifyAuthListeners(user: User | null) {
  authListeners.forEach((l) => {
    try {
      l(user);
    } catch {
      // ignore
    }
  });
}

export interface IAuthService {
  current(): User | null;
  getAuthMode(): AuthMode;
  onAuthChange(listener: AuthListener): () => void;
  continueWithoutAccount(name?: string): User;
  signUp(name: string, phone: string): User;
  signUp(
    name: string,
    phoneRaw: string,
    pin: string,
  ): Promise<{
    success: boolean;
    user?: User | undefined;
    errorKey?: string | undefined;
    alreadyRegistered?: boolean | undefined;
  }>;
  logIn(phone: string): User | null;
  logIn(
    phoneRaw: string,
    pin: string,
  ): Promise<{
    success: boolean;
    user?: User | undefined;
    errorKey?: string | undefined;
  }>;
  logOut(): Promise<void>;
  initSession(): Promise<void>;
}

export const authService: IAuthService = {
  current(): User | null {
    return storage.get<User | null>("user", null);
  },

  getAuthMode(): AuthMode {
    return storage.get<AuthMode>("auth_mode", "guest");
  },

  onAuthChange(listener: AuthListener) {
    authListeners.push(listener);
    return () => {
      const idx = authListeners.indexOf(listener);
      if (idx !== -1) authListeners.splice(idx, 1);
    };
  },

  /**
   * Continue without an account (data stays on this phone only, never syncs).
   */
  continueWithoutAccount(name = "Friend"): User {
    const guestUser: User = {
      id: `local_guest_${Date.now()}`,
      name: name.trim() || "Friend",
      phone: "",
      createdAt: new Date().toISOString(),
    };
    storage.set("user", guestUser);
    storage.set("auth_mode", "guest");
    storage.set("session", true);
    notifyAuthListeners(guestUser);
    return guestUser;
  },

  signUp(
    name: string,
    phoneRaw: string,
    pin?: string,
  ):
    | User
    | Promise<{
        success: boolean;
        user?: User | undefined;
        errorKey?: string | undefined;
        alreadyRegistered?: boolean | undefined;
      }> {
    if (pin === undefined) {
      const user: User = {
        id: `u_${Date.now()}`,
        name: name.trim() || "Friend",
        phone: phoneRaw.trim(),
        createdAt: new Date().toISOString(),
      };
      storage.set("user", user);
      notifyAuthListeners(user);
      return user;
    }

    return (async () => {
      const phoneRes = normalizePhoneNumber(phoneRaw);
      if (!phoneRes.valid) {
        return { success: false, errorKey: phoneRes.errorKey };
      }

      const pinRes = validatePin(pin);
      if (!pinRes.valid) {
        return { success: false, errorKey: pinRes.errorKey };
      }

      const client = getSupabaseClient();
      const phone = phoneRes.normalized;
      const cleanName = name.trim() || "Friend";

      // If Supabase is not configured, fallback to local registration
      if (!client) {
        const user: User = {
          id: `local_${Date.now()}`,
          name: cleanName,
          phone,
          createdAt: new Date().toISOString(),
        };
        storage.set("user", user);
        storage.set("auth_mode", "account");
        storage.set("session", true);
        notifyAuthListeners(user);
        return { success: true, user };
      }

      try {
        const email = phoneToSyntheticEmail(phone);
        const { data, error } = await client.auth.signUp({
          email,
          password: pin,
          options: {
            data: {
              name: cleanName,
              phone,
            },
          },
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (
            msg.includes("already registered") ||
            msg.includes("already exists") ||
            msg.includes("user already") ||
            error.status === 400 ||
            error.status === 422
          ) {
            return {
              success: false,
              alreadyRegistered: true,
              errorKey: "auth.alreadyRegistered",
            };
          }
          if (error.status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
            return { success: false, errorKey: "auth.rateLimit" };
          }
          return { success: false, errorKey: "auth.errorGeneric" };
        }

        if (!data.user) {
          return { success: false, errorKey: "auth.errorGeneric" };
        }

        const user: User = {
          id: data.user.id,
          name: cleanName,
          phone,
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        storage.set("user", user);
        storage.set("auth_mode", "account");
        storage.set("session", true);
        notifyAuthListeners(user);

        // Trigger initial storage sync and merge
        await storage.handleSignIn(user.id);

        return { success: true, user };
      } catch (err: unknown) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return { success: false, errorKey: "auth.offline" };
        }
        console.warn("[auth] signUp failed:", err);
        return { success: false, errorKey: "auth.errorGeneric" };
      }
    })();
  },

  logIn(
    phoneRaw: string,
    pin?: string,
  ):
    | (User | null)
    | Promise<{
        success: boolean;
        user?: User | undefined;
        errorKey?: string | undefined;
      }> {
    if (pin === undefined) {
      const u = storage.get<User | null>("user", null);
      return u && u.phone === phoneRaw.trim() ? u : null;
    }

    return (async () => {
      const phoneRes = normalizePhoneNumber(phoneRaw);
      if (!phoneRes.valid) {
        return { success: false, errorKey: phoneRes.errorKey };
      }

      if (!/^\d{6}$/.test(pin)) {
        return { success: false, errorKey: "auth.invalidCredentials" };
      }

      const client = getSupabaseClient();
      const phone = phoneRes.normalized;

      // Local fallback if Supabase not configured
      if (!client) {
        const u = storage.get<User | null>("user", null);
        if (u && u.phone === phone) {
          storage.set("auth_mode", "account");
          storage.set("session", true);
          notifyAuthListeners(u);
          return { success: true, user: u };
        }
        return { success: false, errorKey: "auth.invalidCredentials" };
      }

      try {
        const email = phoneToSyntheticEmail(phone);
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password: pin,
        });

        if (error) {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            return { success: false, errorKey: "auth.offline" };
          }
          const msg = error.message.toLowerCase();
          if (error.status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
            return { success: false, errorKey: "auth.rateLimit" };
          }
          return { success: false, errorKey: "auth.invalidCredentials" };
        }

        if (!data.user) {
          return { success: false, errorKey: "auth.invalidCredentials" };
        }

        const meta = (data.user.user_metadata || {}) as { name?: string; phone?: string };
        const user: User = {
          id: data.user.id,
          name: meta.name || "Friend",
          phone: meta.phone || phone,
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        storage.set("user", user);
        storage.set("auth_mode", "account");
        storage.set("session", true);
        notifyAuthListeners(user);

        // Pull & merge cloud rows into local storage
        await storage.handleSignIn(user.id);

        return { success: true, user };
      } catch (err: unknown) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return { success: false, errorKey: "auth.offline" };
        }
        console.warn("[auth] logIn error:", err);
        return { success: false, errorKey: "auth.invalidCredentials" };
      }
    })();
  },

  /**
   * Log out.
   * Clears the signed-in user's synced keys from this device (so the next person
   * on a shared phone sees nothing), but NEVER touches the vault.
   */
  async logOut(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn("[auth] Supabase signOut error:", e);
      }
    }

    // Clear synced keys from local storage for shared phone privacy
    storage.clearSyncedDataOnLogout();

    storage.set("session", false);
    storage.remove("user");
    storage.remove("auth_mode");
    notifyAuthListeners(null);
  },

  /**
   * Restores session on app startup.
   */
  async initSession(): Promise<void> {
    if (typeof window === "undefined") return;

    const client = getSupabaseClient();
    if (!client) {
      // Local session check
      return;
    }

    try {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (session?.user) {
        const meta = (session.user.user_metadata || {}) as { name?: string; phone?: string };
        const user: User = {
          id: session.user.id,
          name: meta.name || "Friend",
          phone: meta.phone || "",
          createdAt: session.user.created_at || new Date().toISOString(),
        };

        storage.set("user", user);
        storage.set("auth_mode", "account");
        storage.set("session", true);
        notifyAuthListeners(user);

        // Pull and merge any new changes made on other devices
        await storage.handleSignIn(user.id);
      }
    } catch (err) {
      console.warn("[auth] Failed to restore session:", err);
    }
  },
};

export const prefs = {
  language: () => storage.get<string | null>("lang", null),
  setLanguage: (l: string) => storage.set("lang", l),
  consented: () => storage.get<boolean>("consent", false),
  setConsent: (v: boolean) => storage.set("consent", v),
  loggedIn: () => {
    const hasSession = storage.get<boolean>("session", false);
    const hasUser = !!authService.current();
    return hasSession && hasUser;
  },
  setLoggedIn: (v: boolean) => storage.set("session", v),
};
