// Mock auth service. Replace internals with Supabase Auth later.
import { storage } from "./storage";

export type User = { id: string; name: string; phone: string; createdAt: string };

export const authService = {
  current(): User | null {
    return storage.get<User | null>("user", null);
  },
  signUp(name: string, phone: string): User {
    const user: User = {
      id: `u_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
    };
    storage.set("user", user);
    return user;
  },
  logIn(phone: string): User | null {
    const u = storage.get<User | null>("user", null);
    return u && u.phone === phone.trim() ? u : null;
  },
  logOut() {
    storage.set("session", false);
  },
};

export const prefs = {
  language: () => storage.get<string | null>("lang", null),
  setLanguage: (l: string) => storage.set("lang", l),
  consented: () => storage.get<boolean>("consent", false),
  setConsent: (v: boolean) => storage.set("consent", v),
  loggedIn: () => storage.get<boolean>("session", false) && !!authService.current(),
  setLoggedIn: (v: boolean) => storage.set("session", v),
};
